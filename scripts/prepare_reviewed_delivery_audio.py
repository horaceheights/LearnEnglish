"""Prepare exact approved audio for a delivery candidate without installing it.

The exported registry is validated by the same resolver as the live course. Original
provider receipts and the exact listening manifest remain separately auditable.
This does not approve content, change the catalog, or publish media.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.course_audio_profile import narrator_for_speaker
from app.course_audio_receipts import probe_mp3, validate_provenance
from app.course_audio_registry import resolve_approved_take
from app.schemas import CourseAudioAsset


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def contained(root, relative):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if Path(relative).is_absolute() or not path.is_relative_to(root) or path == root:
        raise ValueError("Audio source escaped its media directory")
    return path


def reviewed_index(manifest_path, approval_path):
    # The local review page hashes UTF-8/LF before Windows writes its text file.
    raw = Path(manifest_path).read_bytes().replace(b"\r\n", b"\n")
    manifest, approval = json.loads(raw), read(approval_path)
    if (approval.get("status") != "user-listening-approved"
            or approval.get("batchSha256") != sha(raw)
            or not approval.get("recordedAt") or not approval.get("answer")):
        raise ValueError("Missing exact-batch user listening approval")
    reviewed = {item["sha256"]: item for item in approval["approved"]}
    if len(reviewed) != len(approval["approved"]):
        raise ValueError("Duplicate recording in approval")
    for item in manifest:
        decision = reviewed.get(item["sha256"])
        if not decision or any(decision.get(key) != item.get(key)
                               for key in ("text", "speakers", "delivery")):
            raise ValueError("Approval differs from the exact listening manifest")
    if len(manifest) != len(reviewed):
        raise ValueError("Approval includes recordings outside the reviewed batch")
    return reviewed, approval


def prepared_provenance(receipt, asset, payload):
    contract = receipt["contract"]
    request = contract["body"]
    if (receipt["sha256"] != sha(payload) or receipt["sourceText"] != asset.text
            or receipt["audioDelivery"] != asset.delivery):
        raise ValueError("Prepared recording differs from its generation receipt")
    return {
        "source": "elevenlabs-offline-render", "provider": "elevenlabs-premium",
        "model_id": request["model_id"], "voice_id": contract["voiceId"],
        "narrator": narrator_for_speaker(asset.speaker_role),
        "settings": request["voice_settings"], "seed": request["seed"],
        "provider_output_format": contract["outputFormat"],
        "stored_media": probe_mp3(payload), "processing": [receipt["processing"]],
        "generated_at": receipt["generatedAt"], "approved_at": None,
        "request_id": receipt["requestId"], "trace_id": None,
        "character_cost": int(receipt["characterCost"]) if receipt.get("characterCost") is not None else None,
        "generation_delivery": receipt["audioDelivery"],
        "provider_requests": [copy.deepcopy(request)],
        "source_receipt_sha256": sha(json.dumps(receipt, ensure_ascii=False, sort_keys=True,
                                                 separators=(",", ":")).encode()),
    }


def prepare(package, media_root, source_registry, manifest_path, approval_path, supplemental):
    reviewed, approval = reviewed_index(manifest_path, approval_path)
    registry = {"schema_version": 1, "takes": {}, "bindings": {}}
    payloads, receipts, assets = {}, {}, []
    for binding in package["canonicalAudioBindings"]:
        asset = CourseAudioAsset(**binding["asset"])
        assets.append(asset)
        take = binding["take"]
        if take is None:
            # Image repackaging changes the canonical asset ID, not the speech.
            # Every speech/role/revision field must still match the original
            # receipt; exact bytes and user review are checked below as usual.
            speech_contract = lambda value: {key: item for key, item in value.items()
                                             if key not in {"id", "image_ref"}}
            candidates = [entry for entry in supplemental
                          if speech_contract(entry[0]["asset"]) == speech_contract(binding["asset"])]
            if len(candidates) != 1:
                raise ValueError(f"Missing exact supplemental recording: {asset.id}")
            receipt, receipt_path = candidates[0]
            payload = contained(receipt_path.parent, receipt["file"]).read_bytes()
            digest = receipt["sha256"]
            provenance = copy.deepcopy(receipt["provenance"])
            receipts[f"{digest}.json"] = receipt
        else:
            payload = contained(media_root, take["file"]).read_bytes()
            digest = take["sha256"]
            if take.get("audioReceipt"):
                receipt = read(contained(media_root, take["audioReceipt"]))
                if sha(contained(media_root, take["audioReceipt"]).read_bytes()) != take["receiptSha256"]:
                    raise ValueError("Prepared source receipt changed after compilation")
                provenance = prepared_provenance(receipt, asset, payload)
                receipts[f"{digest}.json"] = receipt
            else:
                original = source_registry["takes"][digest]
                if (original["text"] != asset.text or original["audio_sha256"] != digest
                        or original["bytes"] != len(payload)):
                    raise ValueError("Normal source recording differs from registry")
                provenance = copy.deepcopy(original["provenance"])
                receipts[f"{digest}.json"] = original
        if sha(payload) != digest:
            raise ValueError("Source recording checksum mismatch")
        decision = reviewed.get(digest)
        if (not decision or decision["text"] != asset.text
                or asset.speaker_role not in decision["speakers"]
                or decision["delivery"] != (asset.delivery or (
                    "mission-introduction" if asset.purpose == "mission-intro" else "normal"))):
            raise ValueError(f"Recording not approved for this contract: {asset.id}")
        provenance["approved_at"] = approval["recordedAt"]
        provenance["review"] = {
            "status": "user-listening-approved", "audio_sha256": digest,
            "basis": approval["answer"], "batch_sha256": approval["batchSha256"],
        }
        validate_provenance(asset, provenance, audio_sha256=digest)
        entry = registry["takes"].setdefault(digest, {
            "file": f"takes/{digest}.mp3", "audio_sha256": digest, "bytes": len(payload),
            "text": asset.text, "profile_id": asset.profile_id, "provenance": provenance,
            "compatible_speaker_roles": [], "compatible_modes": [], "compatible_variants": [],
        })
        if entry["provenance"] != provenance or entry["text"] != asset.text:
            raise ValueError("Same recording has conflicting provenance")
        for field, value in (("compatible_speaker_roles", asset.speaker_role),
                             ("compatible_modes", asset.mode), ("compatible_variants", asset.variant)):
            entry[field] = sorted(set([*entry[field], value]))
        if asset.id in registry["bindings"]:
            raise ValueError("Duplicate canonical asset")
        registry["bindings"][asset.id] = {
            "take_id": digest, "approved_at": approval["recordedAt"],
            "approval_note": f"Exact user-approved listening batch {approval['batchSha256']}; unchanged provider bytes.",
        }
        if take is None and receipt["asset"] != binding["asset"]:
            registry["bindings"][asset.id]["source_asset"] = copy.deepcopy(receipt["asset"])
            registry["bindings"][asset.id]["rebind_reason"] = "Image packaging; exact speech contract and recording unchanged."
        payloads[entry["file"]] = payload
    return registry, payloads, receipts, assets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for option in ("package", "media-root", "source-registry", "manifest", "approval", "output-dir"):
        parser.add_argument(f"--{option}", type=Path, required=True)
    parser.add_argument("--supplemental-receipt", type=Path, action="append", default=[])
    args = parser.parse_args()
    output = args.output_dir.resolve()
    if output == (ROOT / "backend/approved-course-audio").resolve():
        raise ValueError("Preparation cannot write the live approved-audio registry")
    registry, payloads, receipts, assets = prepare(read(args.package), args.media_root,
        read(args.source_registry), args.manifest, args.approval,
        [(read(path), path.resolve()) for path in args.supplemental_receipt])
    for name, payload in payloads.items():
        path = contained(output, name)
        if path.exists() and path.read_bytes() != payload:
            raise ValueError("Refusing to replace existing audio")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
    for asset in assets:
        resolve_approved_take(asset, registry, output)
    for name, value in [("registry.json", registry), *[(f"source-receipts/{n}", v) for n, v in receipts.items()]]:
        path = contained(output, name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"approved_recordings": len(payloads), "validated_bindings": len(assets),
                      "installed": False, "published": False}))


if __name__ == "__main__":
    main()
