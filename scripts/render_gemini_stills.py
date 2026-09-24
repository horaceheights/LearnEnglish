"""Operator-only Gemini renderer for a user-approved still pack.

Gemini is the approved image tool since 2026-09-23 (the OpenAI image account ran
out of credit). This keeps the guarantees of `render_course_stills.py`:
dry-run is the default; each asset gets exactly one paid attempt, recorded in a
receipt before the request is sent, with no automatic retry; the batch ceiling
counts every earlier receipt; an edit starts only from a pack image that passed
hash-bound visual inspection, or from an inspected course image. The pack must
carry the user's approval before anything is sent. It never changes lessons.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts.render_course_stills import digest, pack_output_directory, reviewed_reference_path, validate_budget  # noqa: E402

MODEL = "gemini-3-pro-image"
SETTINGS = {"provider": "google-gemini", "model": MODEL, "aspect_ratio": "3:2", "image_size": "2K",
            "runtime_size": "1536x1024", "runtime_format": "webp", "n": 1}
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
PRICE_SOURCE = "https://ai.google.dev/gemini-api/docs/pricing"
# Checked 2026-09-24: $0.134 per 1K/2K output image (1,120 image tokens), $2.00 per
# million input tokens, $12.00 per million output text and thinking tokens.
IMAGE_TOKENS_PER_IMAGE = 1120
IMAGE_PRICE = Decimal("0.134")
INPUT_PER_TOKEN = Decimal("2.00") / 1_000_000
TEXT_OUT_PER_TOKEN = Decimal("12.00") / 1_000_000


def cost_from_usage(usage: dict | None) -> dict:
    """Estimate the charge from reported usage at list prices; never guess missing counts."""
    if not isinstance(usage, dict) or type(usage.get("promptTokenCount")) is not int:
        return {"usd": None, "reason": "Provider usage missing; reconcile before continuing."}
    details = {row.get("modality"): row.get("tokenCount") for row in usage.get("candidatesTokensDetails") or []}
    image_tokens = details.get("IMAGE")
    if type(image_tokens) is not int:
        return {"usd": None, "reason": "Image token count missing; cost is unknown."}
    text_tokens = int(details.get("TEXT") or 0) + int(usage.get("thoughtsTokenCount") or 0)
    usd = (IMAGE_PRICE * Decimal(image_tokens) / IMAGE_TOKENS_PER_IMAGE
           + INPUT_PER_TOKEN * usage["promptTokenCount"] + TEXT_OUT_PER_TOKEN * text_tokens)
    return {"usd": str(usd.quantize(Decimal("0.000001"))), "price_source": PRICE_SOURCE,
            "basis": "Reported usage at list prices checked 2026-09-24; before tax, not an invoice.",
            "input_tokens": usage["promptTokenCount"], "image_output_tokens": image_tokens,
            "text_and_thinking_output_tokens": text_tokens}


def load_pack(path: Path) -> dict:
    pack = json.loads(path.read_text(encoding="utf-8"))
    if pack.get("image_settings") != SETTINGS:
        raise ValueError("Only the approved Gemini model, 3:2 2K size and one-image configuration are allowed.")
    ids = [item["id"] for item in pack["assets"]]
    if len(set(ids)) != len(ids) or any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item) for item in ids):
        raise ValueError("Asset IDs must be unique safe filenames.")
    seen = set()
    for item in pack["assets"]:
        if item.get("reference") and item.get("reference_file"):
            raise ValueError("Use one unambiguous reference source.")
        if item.get("reference") and item["reference"] not in seen:
            raise ValueError("Every reference must name an earlier asset in this pack.")
        unknown = set(item.get("shared", [])) - set(pack.get("shared_prompts", {}))
        if unknown:
            raise ValueError(f"Unknown shared prompt {sorted(unknown)}.")
        seen.add(item["id"])
    pack_output_directory(pack)
    return pack


def full_prompt(pack: dict, asset: dict) -> str:
    return "\n\n".join([*(pack["shared_prompts"][name] for name in asset.get("shared", [])), asset["prompt"]])


def reference_image(pack: dict, asset: dict, output_dir: Path, root: Path = ROOT) -> Path | None:
    if asset.get("reference_file"):
        return reviewed_reference_path(asset["reference_file"], root)
    if not asset.get("reference"):
        return None
    reference = output_dir / (asset["reference"] + ".png")
    reviews_path = output_dir / "agent-reviews.json"
    reviews = json.loads(reviews_path.read_text(encoding="utf-8")) if reviews_path.exists() else {}
    review = reviews.get(asset["reference"], {})
    if not reference.is_file() or review.get("disposition") != "usable" or review.get("sha256") != digest(reference):
        raise ValueError("An edit needs its base image's current hash-bound visual inspection first.")
    return reference


def urllib_transport(body: bytes, key: str):
    request = urllib.request.Request(ENDPOINT, data=body, method="POST",
                                     headers={"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(request, timeout=360) as response:
            return response.status, dict(response.headers), json.loads(response.read())
    except urllib.error.HTTPError as error:
        try:
            payload = json.loads(error.read())
        except ValueError:
            payload = {}
        return error.code, dict(error.headers or {}), payload


def render(pack_path: Path, asset_id: str, *, execute: bool, ceiling: Decimal | None,
           reserve: Decimal = Decimal("0.20"), key: str | None = None, transport=urllib_transport,
           root: Path = ROOT) -> dict:
    pack = load_pack(pack_path)
    asset = next((item for item in pack["assets"] if item["id"] == asset_id), None)
    if asset is None:
        raise ValueError("Unknown asset ID.")
    output_dir = pack_output_directory(pack) if root == ROOT else root / "output/imagegen" / pack["output_namespace"]
    output = output_dir / f"{asset_id}.png"
    receipt = output.with_suffix(".receipt.json")
    if output.exists() or receipt.exists():
        raise ValueError("Asset already attempted; do not overwrite or retry it.")
    prompt = full_prompt(pack, asset)
    plan = {"asset_id": asset_id, "model": MODEL, "prompt": prompt,
            "reference": asset.get("reference") or (asset.get("reference_file") or {}).get("path")}
    if not execute:
        return {"dry_run": True, **plan}
    if str(pack.get("authorization", "")).upper().startswith("PENDING"):
        raise ValueError("The pack has no recorded user approval; nothing may be generated.")
    declared = Decimal(pack["production"]["requested_ceiling_usd"])
    if ceiling is None or ceiling <= 0 or ceiling > declared:
        raise ValueError("Execution requires a positive ceiling no larger than the approved pack budget.")
    output_dir.mkdir(parents=True, exist_ok=True)
    validate_budget(output_dir, ceiling, reserve)
    reference = reference_image(pack, asset, output_dir, root)
    key = key or os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise ValueError("GEMINI_API_KEY is not configured.")
    parts = []
    if reference is not None:
        # Gemini accepts the base picture inline; convert WebP to PNG so the edit sees exact pixels.
        from PIL import Image
        buffer = io.BytesIO()
        Image.open(reference).convert("RGB").save(buffer, format="PNG")
        parts.append({"inlineData": {"mimeType": "image/png", "data": base64.b64encode(buffer.getvalue()).decode()}})
    parts.append({"text": prompt})
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"],
                                 "imageConfig": {"aspectRatio": "3:2", "imageSize": "2K"}}}
    record = {"status": "prepared", "generation_requests_sent": 0, "automatic_retries": 0,
              "client_request_id": str(uuid4()), "asset_id": asset_id, "pack_sha256": digest(pack_path),
              "started_at": datetime.now(timezone.utc).isoformat(), "endpoint": ENDPOINT,
              "request": {"model": MODEL, "prompt": prompt, "image_config": body["generationConfig"]["imageConfig"]},
              "reference": None if reference is None else {"path": reference.relative_to(root).as_posix()
                                                           if reference.is_relative_to(root) else str(reference),
                                                           "sha256": digest(reference)},
              "human_approval": "pending"}
    with receipt.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(record, stream, indent=2)

    def save():
        receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    started = time.monotonic()
    try:
        # Mark before sending: a timeout must never authorize a second charge.
        record.update(status="in_flight", generation_requests_sent=1)
        save()
        status, headers, payload = transport(json.dumps(body).encode(), key)
        record["provider_response_id"] = payload.get("responseId")
        if status >= 300:
            error = payload.get("error") or {}
            # Never persist a provider message that could echo credentials.
            record["provider_error"] = {"http_status": status, "status": error.get("status"), "code": error.get("code")}
            raise RuntimeError("Image provider rejected the request; inspect the sanitized receipt.")
        record.update(status="response_received", usage=payload.get("usageMetadata"),
                      cost=cost_from_usage(payload.get("usageMetadata")),
                      elapsed_seconds=round(time.monotonic() - started, 2))
        save()
        candidate = (payload.get("candidates") or [{}])[0]
        images = [part["inlineData"] for part in (candidate.get("content") or {}).get("parts") or []
                  if part.get("inlineData") and not part.get("thought")]
        if len(images) != 1:
            record["finish_reason"] = candidate.get("finishReason")
            raise RuntimeError("No single final image returned; no automatic retry.")
        from PIL import Image
        picture = Image.open(io.BytesIO(base64.b64decode(images[0]["data"])))
        picture.save(output, format="PNG")
        record.update(status="image_saved", output=output.relative_to(root).as_posix(), sha256=digest(output),
                      byte_count=output.stat().st_size, pixel_size=list(picture.size),
                      returned_mime_type=images[0].get("mimeType"))
        save()
        return record
    except Exception as exc:
        if record["status"] != "image_saved":
            record.update(status="failed_no_retry" if record["status"] != "response_received" else "response_unusable",
                          exception_type=type(exc).__name__, elapsed_seconds=round(time.monotonic() - started, 2))
            save()
        raise RuntimeError(f"Image request stopped ({type(exc).__name__}); do not retry this asset automatically.") from None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=Path, required=True)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--max-cost-usd", type=Decimal)
    parser.add_argument("--env-file", type=Path, help="Read GEMINI_API_KEY from this .env file.")
    args = parser.parse_args()
    key = None
    if args.env_file:
        found = re.search(r"^GEMINI_API_KEY=(.*)$", args.env_file.read_text(encoding="utf-8"), re.M)
        key = found.group(1).strip() if found else None
    result = render(args.pack, args.asset_id, execute=args.execute, ceiling=args.max_cost_usd, key=key)
    if result.get("dry_run"):
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({"output": result["output"], "sha256": result["sha256"], "cost": result["cost"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
