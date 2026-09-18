"""Operator-only extension of the user-approved image CLI receipt wrapper.

The installed imagegen CLI still validates requests and saves image bytes. This
adapter records provider usage without an SDK retry, fallback, or second charge
on an uncertain job. Dry-run is the default. It never changes active lessons.
"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import importlib.util
import json
import mimetypes
import os
from pathlib import Path
import re
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
MODEL = "gpt-image-2.5-sunburst-2026-09-08"
PRICE_SOURCE = "https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst"
FX = Decimal("16.9707")


def cost_from_usage(usage: dict | None) -> dict:
    if not isinstance(usage, dict):
        return {"usd": None, "reason": "Provider usage missing; reconcile before continuing."}
    details = usage.get("input_tokens_details") or {}
    output_details = usage.get("output_tokens_details") or {}
    counts = (details.get("text_tokens"), details.get("image_tokens"),
              output_details.get("image_tokens", usage.get("output_tokens")))
    if any(type(n) is not int or n < 0 for n in counts):
        return {"usd": None, "reason": "Incomplete token details; cost is unknown."}
    text, images, output = counts
    uncached = (Decimal(text) * 5 + Decimal(images) * 8 + Decimal(output) * 30) / 1_000_000
    # Image API cache schemas may vary. Keep the complete raw usage in the
    # receipt; never guess text/image allocation from a combined cache count.
    return {"usd": str(uncached), "mxn": str(uncached * FX),
            "basis": "Reported usage at uncached list rates; before tax or discounts, not an invoice.",
            "fx_mxn_per_usd": str(FX), "fx_date": "2026-09-11",
            "rates_checked_on": "2026-09-13", "price_source": PRICE_SOURCE,
            "text_input_tokens": text, "image_input_tokens": images,
            "image_output_tokens": output}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_pack(path: Path) -> dict:
    pack = json.loads(path.read_text(encoding="utf-8"))
    if pack.get("image_settings") != {"model": MODEL, "size": "1536x1024", "quality": "high", "output_format": "png", "n": 1}:
        raise ValueError("Only the approved model, quality, size and one-image configuration are allowed.")
    ids = [item["id"] for item in pack["assets"]]
    if len(set(ids)) != len(ids) or any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item) for item in ids):
        raise ValueError("Asset IDs must be unique safe filenames.")
    seen = set()
    for item in pack["assets"]:
        if item.get('reference') and item.get('reference_file'):
            raise ValueError('Use one unambiguous reference source.')
        if item.get('reference_file'):
            reviewed_reference_path(item['reference_file'])
        if item.get("reference") and item["reference"] not in seen:
            raise ValueError("Every reference must name an earlier asset in this pack.")
        seen.add(item["id"])
    return pack


def reviewed_reference_path(record: dict, root: Path = ROOT) -> Path:
    """Only an explicitly inspected, immutable course image may be uploaded."""
    relative=Path(record.get('path',''))
    path=(root/relative).resolve()
    allowed=(root/'Lessons/Lesson1/images').resolve()
    if relative.is_absolute() or not path.is_relative_to(allowed) or path.suffix.lower() not in {'.png','.webp','.jpg'}:
        raise ValueError('Reference must be a course image inside the source asset directory.')
    if not path.is_file() or record.get('sha256')!=digest(path) or len(record.get('observed_description',''))<35:
        raise ValueError('Reference requires actual current pixel inspection evidence.')
    return path


def pack_output_directory(pack: dict) -> Path:
    name = pack.get("output_namespace") or f"unit-{pack['lesson_number'].split('.')[0]}-mission-v{pack['revision']}"
    if not re.fullmatch(r"(?:unit-[1-7]-(?:mission|review|lesson)|course-photo-sweep)-v[1-9][0-9]*", name):
        raise ValueError("Unsafe output namespace.")
    return ROOT / "output/imagegen" / name


def validate_change_control(pack: dict, asset: dict) -> None:
    # New paid attempts need an explicit intent; legacy receipts are untouched.
    from scripts.audit_course_media_preservation import BASELINE, PLANS, audit, validate_plan, lessons
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
    errors = audit(ROOT, baseline, plans)
    if errors:
        raise ValueError("Media preservation failed: " + errors[0])
    control = asset.get("change_control", {})
    if control.get('kind') == 'inspected-mission-photo-edit':
        lesson = lessons(ROOT).get(control.get('lesson_id'))
        card = next((c for c in (lesson or {}).get('cards', []) if c['slide_id'] == control.get('slide_id')), None)
        reference = asset.get('reference_file', {})
        old = control.get('old_filename', '')
        if (not lesson or not lesson['sub_lesson_id'].endswith('.10') or card != control.get('original_card')
                or not card.get('mission_game') or reference.get('sha256') != control.get('old_sha256')
                or Path(reference.get('path', '')).name != old or len(control.get('old_observation', '')) < 35):
            raise ValueError('Mission photo edit requires exact unchanged card and inspected reference evidence.')
        new = asset.get('runtime_filename', '')
        if Path(new).name != new or not new.endswith('.webp') or new == old:
            raise ValueError('Mission edit requires a new versioned filename.')
        from scripts.audit_course_media_preservation import IMAGE_ROOTS, images
        if old not in images(card):
            raise ValueError('Mission image is not bound to the specified card.')
        for folder in IMAGE_ROOTS:
            if digest(ROOT / folder / old) != control['old_sha256'] or (ROOT / folder / new).exists():
                raise ValueError('Mission image changed or replacement already exists.')
        return
    if control.get('kind') == 'inspected-legacy-photo-group':
        if not control.get('replacements'):
            raise ValueError('No exact old-image records in the generation group.')
        for replacement in control['replacements']:
            validate_legacy_photo_scene(asset, replacement)
        return
    if control.get('kind') == 'inspected-legacy-photo-scene':
        validate_legacy_photo_scene(asset, control)
        return
    if control.get("kind") == "approved-parity-scene":
        validate_parity_scene(pack, control)
        return
    if control.get("kind") == "new-review-scene" and control.get("reason") and not control.get("replaces"):
        if not pack["lesson_number"].endswith(".9"):
            raise ValueError("New review scenes must belong to Lesson 9.")
        return
    if control.get("kind") != "scoped-replacement" or not control.get("replaces"):
        raise ValueError("Explicit new-scene intent or scoped replacement evidence is required before spending.")
    current = lessons(ROOT)
    for old in control["replaces"]:
        matching = [plan for plan in plans if plan["lesson_id"] == pack["lesson_id"] and plan["old_filename"] == old
                    and plan["new_filename"] == asset["runtime_filename"]]
        if len(matching) != 1:
            raise ValueError("Missing exact lesson/image replacement exception.")
        validate_plan(matching[0], baseline, current, ROOT)


def validate_parity_scene(pack: dict, control: dict) -> None:
    """A new scene the approved parity contract requires: never a replacement.

    Missions of Units 2-7 may commission their own mission-only stills. A
    foundation lesson may commission only the introduction the contract names
    for exactly that lesson, so this cannot become a general repaint path.
    """
    if control.get("replaces") or len(control.get("reason", "").strip()) < 35:
        raise ValueError("A parity scene needs a concrete reason and must not replace existing media.")
    contracts = json.loads((ROOT / "docs/product/a1-unit-parity-contracts.json").read_text(encoding="utf-8"))
    unit, lesson = pack["lesson_number"].split(".")
    contract = contracts["units"].get(unit)
    if contract is None:
        raise ValueError("Only units with an approved parity contract may commission parity scenes.")
    if lesson == "10":
        return
    function = next((item for item in contract["functions"] if item["id"] == control.get("introduces")), None)
    if (function is None or not function.get("requires_introduction")
            or function["taught_in"] != pack["lesson_number"]):
        raise ValueError("A foundation scene must introduce a contract function assigned to this exact lesson.")


def validate_legacy_photo_scene(asset: dict, control: dict) -> None:
        from scripts.audit_course_media_preservation import lessons
        # A paid scene is authorized by exact old pixels and bounded card fields,
        # not by assuming its provider or trusting a filename's apparent meaning.
        from scripts.install_course_photo_reuse import pointer_parent
        if len(control.get('old_observation','')) < 35 or not control.get('scopes'):
            raise ValueError('A concrete pixel issue and lesson fields are required.')
        old = control.get('old_filename','')
        new = asset.get('runtime_filename','')
        if Path(old).name != old or Path(new).name != new or not new.endswith('.webp') or old == new:
            raise ValueError('Unsafe replacement image name.')
        for folder in ('Lessons/Lesson1/images','mobile/assets/lesson-assets','frontend/public/lesson-assets'):
            if digest(ROOT / folder / old) != control.get('old_sha256'):
                raise ValueError('Inspected source image changed before generation.')
            if (ROOT / folder / new).exists():
                raise ValueError('Replacement already exists; do not regenerate it.')
        current = lessons(ROOT)
        expected_binding=old
        if control.get('replaces_staged_candidate'):
            revision=control['replaces_staged_candidate']
            from scripts.install_preference_photo_batch import digest_json
            proof=json.loads((ROOT/'docs/qa/course-photo-reuse-v1.json').read_text(encoding='utf-8'))
            matches=[r for r in proof['assets'] if r['old_filename']==old and r['candidate_filename']==revision.get('filename')]
            if (len(matches)!=1 or digest_json(matches[0])!=revision.get('record_sha256')
                    or matches[0]['scopes']!=control['scopes'] or len(revision.get('issue',''))<35):
                raise ValueError('Staged candidate revision lacks exact unchanged inspection evidence.')
            expected_binding=revision['filename']
            for folder in ('Lessons/Lesson1/images','mobile/assets/lesson-assets','frontend/public/lesson-assets'):
                if digest(ROOT/folder/expected_binding)!=matches[0]['new_sha256']:
                    raise ValueError('Staged candidate pixels changed before correction.')
        for scope in control['scopes']:
            lesson = current[scope['lesson_id']]
            if int(lesson['sub_lesson_id'].split('.')[1]) == 10:
                raise ValueError('This still batch cannot change mission hotspot scenes.')
            parent,key = pointer_parent(lesson,scope['pointer'])
            if Path(parent[key].split('?',1)[0]).name != expected_binding:
                raise ValueError('Card binding changed before generation.')


def validate_budget(output_dir: Path, ceiling: Decimal, reserve: Decimal) -> Decimal:
    if not ceiling.is_finite() or not reserve.is_finite() or ceiling <= 0 or reserve <= 0:
        raise ValueError("Budget and per-request reservation must be positive finite amounts.")
    spent = Decimal(0)
    for path in output_dir.glob("*.receipt.json"):
        receipt = json.loads(path.read_text(encoding="utf-8"))
        amount = receipt.get("cost", {}).get("usd")
        if receipt.get("generation_requests_sent") and (receipt.get("status") != "image_saved" or amount is None):
            raise ValueError(f"Uncertain or failed paid attempt {path.name}; reconcile before any further generation.")
        if amount is not None:
            value = Decimal(amount)
            if not value.is_finite() or value < 0:
                raise ValueError("Invalid stored cost; cannot establish available budget.")
            spent += value
    if spent + reserve > ceiling:
        raise ValueError(f"Next request reservation exceeds batch ceiling: {spent} + {reserve} > {ceiling} USD.")
    return spent


def multipart(payload: dict) -> tuple[bytes, str, list[dict]]:
    boundary = "codex-image-" + uuid4().hex
    chunks = []
    references = []
    for key, value in payload.items():
        if key == "image":
            files = value if isinstance(value, list) else [value]
            for stream in files:
                data = stream.read()
                name = Path(stream.name).name
                references.append({"filename": name, "sha256": hashlib.sha256(data).hexdigest(), "byte_count": len(data)})
                mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
                chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + data + b"\r\n")
        else:
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), "multipart/form-data; boundary=" + boundary, references


class RecordedImageClient:
    def __init__(self, output: Path, receipt: Path, pack_hash: str, asset_id: str):
        self.images = self
        self.output, self.receipt = output, receipt
        self.pack_hash, self.asset_id = pack_hash, asset_id
        self.sent = False

    def generate(self, **payload):
        return self._send("generate", payload)

    def edit(self, **payload):
        return self._send("edit", payload)

    def _send(self, mode: str, payload: dict):
        if self.sent or self.output.exists() or self.receipt.exists():
            raise ValueError("This asset was already attempted. No overwrite or automatic paid retry.")
        if (payload.get("model"), payload.get("n"), payload.get("size"), payload.get("quality"), payload.get("output_format")) != (MODEL, 1, "1536x1024", "high", "png"):
            raise ValueError("Image request differs from the approved configuration.")
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            raise ValueError("OPENAI_API_KEY is not configured in the process environment.")
        if mode == "edit":
            body, content_type, refs = multipart(payload)
        else:
            body, content_type, refs = json.dumps(payload).encode(), "application/json", []
        endpoint = "/v1/images/edits" if mode == "edit" else "/v1/images/generations"
        self.output.parent.mkdir(parents=True, exist_ok=True)
        record = {"status": "prepared", "generation_requests_sent": 0,
                  "automatic_retries": 0, "client_request_id": str(uuid4()),
                  "asset_id": self.asset_id, "pack_sha256": self.pack_hash,
                  "started_at": datetime.now(timezone.utc).isoformat(),
                  "request": {k: v for k, v in payload.items() if k != "image"},
                  "references": refs, "endpoint": "https://api.openai.com" + endpoint,
                  "human_approval": "pending"}
        with self.receipt.open("x", encoding="utf-8") as stream:
            json.dump(record, stream, indent=2)
        def save():
            self.receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        started = time.monotonic()
        connection = http.client.HTTPSConnection("api.openai.com", timeout=360)
        try:
            # Mark before sending: a timeout must not authorize another charge.
            self.sent = True
            record.update(status="in_flight", generation_requests_sent=1)
            save()
            connection.request("POST", endpoint, body, headers={
                "Authorization": "Bearer " + key, "Content-Type": content_type,
                "X-Client-Request-Id": record["client_request_id"]})
            response = connection.getresponse()
            record["provider_request_id"] = response.getheader("x-request-id")
            result = json.loads(response.read())
            if response.status >= 300:
                error = result.get("error") or {}
                # Do not persist an error message which could echo credentials.
                record["provider_error"] = {"http_status": response.status, "code": error.get("code"), "type": error.get("type")}
                raise RuntimeError("Image provider rejected the request; inspect the sanitized receipt.")
            record.update(status="response_received", usage=result.get("usage"),
                          cost=cost_from_usage(result.get("usage")),
                          elapsed_seconds=round(time.monotonic() - started, 2))
            save()
            data = result.get("data") or []
            if len(data) != 1 or not data[0].get("b64_json"):
                raise RuntimeError("No single base64 image returned; no automatic retry.")
            return SimpleNamespace(data=[SimpleNamespace(b64_json=data[0]["b64_json"])])
        except Exception as exc:
            record.update(status="failed_no_retry", exception_type=type(exc).__name__,
                          elapsed_seconds=round(time.monotonic() - started, 2))
            save()
            raise RuntimeError(f"Image request stopped ({type(exc).__name__}); do not retry this asset automatically.") from None
        finally:
            connection.close()


def finalize_saved_image(output: Path, receipt: Path, root: Path = ROOT) -> dict:
    if not output.is_file() or not receipt.is_file():
        raise RuntimeError("Image output did not finish saving; inspect the receipt before continuing.")
    record = json.loads(receipt.read_text(encoding="utf-8"))
    if record.get("status") != "response_received":
        raise ValueError("Only a successful provider response can finalize a saved image.")
    record.update(status="image_saved", output=output.relative_to(root).as_posix(),
                  sha256=digest(output), byte_count=output.stat().st_size)
    receipt.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return record


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=Path, required=True)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--cli", type=Path, required=True, help="Installed, unmodified imagegen skill CLI.")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--max-cost-usd", type=Decimal)
    parser.add_argument("--request-reserve-usd", type=Decimal, default=Decimal("0.25"))
    args = parser.parse_args()
    pack = load_pack(args.pack)
    asset = next((item for item in pack["assets"] if item["id"] == args.asset_id), None)
    if asset is None:
        raise ValueError("Unknown asset ID.")
    output_dir = pack_output_directory(pack)
    output = output_dir / (asset["id"] + ".png")
    receipt = output.with_suffix(".receipt.json")
    reference = output_dir / (asset["reference"] + ".png") if asset.get("reference") else None
    if asset.get('reference_file'):
        reference=reviewed_reference_path(asset['reference_file'])
    if output.exists() or receipt.exists():
        raise ValueError("Asset already attempted; do not overwrite or retry it.")
    prompt = pack["shared_prompt"] + "\n\n" + asset["prompt"]
    if args.execute:
        validate_change_control(pack, asset)
        ceiling = args.max_cost_usd
        declared = Decimal(pack["production"]["initial_batch_ceiling_usd"])
        if ceiling is None or ceiling > declared:
            raise ValueError("Execution requires a positive ceiling no larger than the declared pack budget.")
        validate_budget(output_dir, ceiling, args.request_reserve_usd)
        if asset.get('reference'):
            review_path = output_dir / "agent-reviews.json"
            reviews = json.loads(review_path.read_text(encoding="utf-8")) if review_path.exists() else {}
            review = reviews.get(asset["reference"], {})
            if not reference.is_file() or review.get("disposition") != "usable" or review.get("sha256") != digest(reference):
                raise ValueError("Reference needs current hash-bound agent visual inspection before paid continuation.")
    spec = importlib.util.spec_from_file_location("bundled_imagegen", args.cli.resolve())
    if not spec or not spec.loader:
        raise ValueError("Cannot load installed imagegen CLI.")
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)
    client = RecordedImageClient(output, receipt, digest(args.pack), asset["id"])
    cli._create_client = lambda: client
    command = "edit" if reference else "generate"
    sys.argv = [str(args.cli), command, "--model", MODEL, "--n", "1", "--size", "1536x1024",
                "--quality", "high", "--output-format", "png", "--no-augment", "--prompt", prompt, "--out", str(output)]
    if reference:
        sys.argv += ["--image", str(reference)]
    if not args.execute:
        sys.argv.append("--dry-run")
    cli.main()
    if args.execute:
        record = finalize_saved_image(output, receipt)
        print(json.dumps({"output": str(output), "receipt": str(receipt), "cost": record["cost"]}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
