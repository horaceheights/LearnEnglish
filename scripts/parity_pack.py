"""Shared, unit-agnostic steps for installing a reviewed Units 3-7 parity pack.

Operator-only and paid-call free. Each unit script authors its own lesson
content and delegates the evidence checks and file installation here, so the
Unit 2 rules (receipt-bound pixels, hash-bound agent inspection, byte-identical
copies, preserved originals) apply unchanged to every later unit.
"""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts.audit_course_media_preservation import BASELINE, IMAGE_ROOTS, PLANS, lessons, validate_plan  # noqa: E402
from scripts.render_course_stills import digest, pack_output_directory  # noqa: E402


def prepare_review_exceptions(pack: dict) -> int:
    """Record review-only exceptions for a pack's scoped replacements.

    Only the Lesson 9 review binding changes; the original file and every earlier
    teaching use remain byte-for-byte intact.
    """
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))
    current = lessons(ROOT)
    added = 0
    for asset in pack["assets"]:
        for old in asset["change_control"].get("replaces", []):
            proposal = {"lesson_id": pack["lesson_id"], "old_filename": old,
                        "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                        "new_filename": asset["runtime_filename"], "issue": "review-reuses-earlier-image",
                        "issue_detail": f"Lesson {pack['lesson_number']} repeats the exact bytes already used by earlier "
                                        "teaching cards; retain this original and every other use, replace only the "
                                        "review binding with a fresh scene.",
                        "source_provenance": baseline["assets"][old]["provenance"],
                        "original_action": "preserve-byte-for-byte"}
            validate_plan(proposal, baseline, current, ROOT)
            existing = [p for p in plans["changes"] if (p["lesson_id"], p["old_filename"]) == (pack["lesson_id"], old)]
            if existing and existing != [proposal]:
                raise ValueError(f"A different exception already exists for {old}; reconcile it explicitly.")
            if not existing:
                plans["changes"].append(proposal)
                added += 1
    PLANS.write_text(json.dumps(plans, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added


def reviewed_assets(pack: dict, runtime_name=lambda asset: asset["runtime_filename"]) -> tuple[dict, list[dict]]:
    """Return agent reviews and install records; fail closed on any stale evidence."""
    output = pack_output_directory(pack)
    reviews_path = output / "agent-reviews.json"
    if not reviews_path.is_file():
        raise ValueError(f"{pack['lesson_number']}: missing explicit agent visual inspections.")
    reviews = json.loads(reviews_path.read_text(encoding="utf-8"))
    records = []
    for asset in pack["assets"]:
        source = output / f"{asset['id']}.png"
        receipt_path = source.with_suffix(".receipt.json")
        if not source.is_file() or not receipt_path.is_file():
            raise ValueError(f"{asset['id']}: not generated with a receipt yet.")
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        review = reviews.get(asset["id"], {})
        expected_prompt = pack["shared_prompt"] + "\n\n" + asset["prompt"]
        if receipt.get("status") != "image_saved" or receipt.get("sha256") != digest(source):
            raise ValueError(f"{asset['id']}: missing or stale receipt.")
        if (receipt.get("request", {}).get("prompt") != expected_prompt
                or any(receipt.get("request", {}).get(k) != v for k, v in pack["image_settings"].items())
                or receipt.get("byte_count") != source.stat().st_size or receipt.get("generation_requests_sent") != 1):
            raise ValueError(f"{asset['id']}: receipt does not match the exact scene contract.")
        if asset.get("reference"):
            reference = output / f"{asset['reference']}.png"
            if [ref["sha256"] for ref in receipt.get("references", [])] != [hashlib.sha256(reference.read_bytes()).hexdigest()]:
                raise ValueError(f"{asset['id']}: stale reference pixels.")
        if review.get("disposition") != "usable" or review.get("sha256") != digest(source) or not review.get("notes"):
            raise ValueError(f"{asset['id']}: individual visual inspection required.")
        records.append({"asset_id": asset["id"], "runtime_filename": runtime_name(asset), "receipt": receipt,
                        "agent_review": review, "change_control": asset.get("change_control", {}),
                        "human_approval": "pending"})
    return reviews, records


def paid_attempts(pack: dict, reviews: dict, installed: set[str]) -> tuple[list[dict], list[tuple[Path, Path]]]:
    """Every paid attempt stays in the ledger; unused output needs an explicit rejection."""
    output = pack_output_directory(pack)
    attempts, rejected = [], []
    for path in sorted(output.glob("*.receipt.json")):
        receipt = json.loads(path.read_text(encoding="utf-8"))
        key = receipt["asset_id"]
        source = output / f"{key}.png"
        if (receipt.get("status") != "image_saved" or not source.is_file()
                or receipt.get("sha256") != digest(source) or receipt.get("cost", {}).get("usd") is None):
            raise ValueError(f"Paid attempt {key} is not reconciled.")
        attempts.append({"receipt": receipt, "installed": key in installed, "agent_review": reviews.get(key, {})})
        if key not in installed:
            if reviews.get(key, {}).get("disposition") != "rejected" or reviews[key].get("sha256") != digest(source):
                raise ValueError(f"Unused paid output {key} needs an explicit hash-bound rejection.")
            rejected.append(source)
    return attempts, rejected


def render_webp(source: Path) -> bytes:
    from PIL import Image
    with Image.open(source) as photo:
        if photo.size != (1536, 1024):
            raise ValueError(f"{source.name}: never crop generated pixels into compliance.")
        stream = io.BytesIO()
        photo.convert("RGB").save(stream, "WEBP", quality=92, method=6)
        return stream.getvalue()


def stage_images(pack: dict, records: list[dict]) -> dict[str, bytes]:
    """Preflight every runtime file before anything is written."""
    output = pack_output_directory(pack)
    exports = {}
    for record in records:
        pixels = render_webp(output / f"{record['asset_id']}.png")
        name = record["runtime_filename"]
        for folder in IMAGE_ROOTS:
            target = ROOT / folder / name
            if target.exists() and target.read_bytes() != pixels:
                raise ValueError(f"Refusing to overwrite a different versioned asset: {target}")
        record["runtime_sha256"] = hashlib.sha256(pixels).hexdigest()
        exports[name] = pixels
    return exports


def install_images(pack: dict, exports: dict[str, bytes], records: list[dict], rejected: list[Path], archive: Path) -> None:
    output = pack_output_directory(pack)
    for name, pixels in exports.items():
        for folder in IMAGE_ROOTS:
            (ROOT / folder / name).write_bytes(pixels)
    archive.mkdir(parents=True, exist_ok=True)
    for record in records:
        source = output / f"{record['asset_id']}.png"
        target = archive / source.name
        if target.exists() and digest(target) != digest(source):
            raise ValueError("A different archived source exists; preserve it and use a new version.")
        shutil.copyfile(source, target)
        record["source_path"] = target.relative_to(ROOT).as_posix()
    for source in rejected:
        target = archive / "rejected" / source.name
        if target.exists() and digest(target) != digest(source):
            raise ValueError("Do not overwrite rejected source history.")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)


def register_photoreal(names) -> None:
    registry = ROOT / "docs/product/a1-reviewed-photoreal-media.json"
    data = json.loads(registry.read_text(encoding="utf-8"))
    data["files"] = sorted(set(data["files"]) | set(names))
    registry.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
