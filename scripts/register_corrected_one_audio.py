from __future__ import annotations

import argparse
import copy
import os
import sys
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.course_audio_receipts import (  # noqa: E402
    APPROVED_ONE_AUDIO_APPROVED_AT,
    APPROVED_ONE_AUDIO_BINDING_NOTE,
    APPROVED_ONE_AUDIO_PROCESSING,
    APPROVED_ONE_AUDIO_REVIEW,
    APPROVED_ONE_AUDIO_SHA256,
    APPROVED_ONE_AUDIO_SOURCE_COMMIT,
    REVIEWED_EXACT_OVERRIDE_SOURCE,
    probe_mp3,
    sha256_bytes,
    validate_provenance,
)
from backend.app.course_audio_registry import (  # noqa: E402
    approved_audio_dir,
    load_approved_take_registry,
    resolve_approved_take,
)
from backend.app.data import LESSONS  # noqa: E402
from backend.app.schemas import CourseAudioAsset  # noqa: E402
from scripts.render_course_audio_assets import write_registry  # noqa: E402


APPROVED_ONE_BYTES = 12_141
SOURCE_AUDIO = ROOT / "mobile" / "assets" / "course-audio" / "one-corrected.mp3"
KNOWN_REJECTED_TAKE_IDS = {
    "0613fa10f4c08d4302b287d726294ef947cac56818a346a685d9adad58d68b42"
}
EXPECTED_ONE_CONTRACT_COUNTS = Counter(
    {
        ("teacher", "prompt", "prompt"): 2,
        ("teacher", "pronunciation_slow", "split-ing"): 1,
        ("answer", "prompt", "answer"): 3,
    }
)
EXPECTED_ONE_STAGE_COUNTS = Counter({"Learn": 2, "Recognize": 2, "Speak": 2})


def standalone_one_assets() -> list[tuple[CourseAudioAsset, str, str]]:
    matches: list[tuple[CourseAudioAsset, str, str]] = []
    for lesson in LESSONS.values():
        for card in lesson.cards:
            for asset in card.audio_assets:
                if asset.text == "One":
                    matches.append((asset, lesson.id, card.stage))
    matches.sort(key=lambda item: item[0].id)

    contract_counts = Counter(
        (asset.speaker_role, asset.mode, asset.variant) for asset, _lesson_id, _stage in matches
    )
    stage_counts = Counter(stage for _asset, _lesson_id, stage in matches)
    lesson_ids = {lesson_id for _asset, lesson_id, _stage in matches}
    if contract_counts != EXPECTED_ONE_CONTRACT_COUNTS:
        raise ValueError(
            "The reviewed One override must target exactly its six approved audio contracts."
        )
    if stage_counts != EXPECTED_ONE_STAGE_COUNTS or lesson_ids != {
        "lesson-2-6-numbers-1-10"
    }:
        raise ValueError(
            "The reviewed One override must target only the approved Learn, Recognize, and Speak cards."
        )
    return matches


def reviewed_one_provenance(payload: bytes) -> dict[str, Any]:
    return {
        "source": REVIEWED_EXACT_OVERRIDE_SOURCE,
        "provider": None,
        "model_id": None,
        "voice_id": None,
        "narrator": None,
        "settings": {},
        "seed": None,
        "provider_output_format": "reviewed-bundled-mp3",
        "stored_media": probe_mp3(payload),
        "processing": list(APPROVED_ONE_AUDIO_PROCESSING),
        "generated_at": None,
        "approved_at": APPROVED_ONE_AUDIO_APPROVED_AT,
        "request_id": None,
        "trace_id": None,
        "character_cost": None,
        "approved_audio_sha256": APPROVED_ONE_AUDIO_SHA256,
        "source_commit": APPROVED_ONE_AUDIO_SOURCE_COMMIT,
        "review": dict(APPROVED_ONE_AUDIO_REVIEW),
    }


def expected_take(
    assets: list[tuple[CourseAudioAsset, str, str]], payload: bytes
) -> dict[str, Any]:
    profile_ids = {asset.profile_id for asset, _lesson_id, _stage in assets}
    if len(profile_ids) != 1:
        raise ValueError("The six approved One assets must use one persistent-audio profile.")
    return {
        "file": f"takes/{APPROVED_ONE_AUDIO_SHA256}.mp3",
        "audio_sha256": APPROVED_ONE_AUDIO_SHA256,
        "bytes": len(payload),
        "text": "One",
        "compatible_speaker_roles": sorted(
            {asset.speaker_role for asset, _lesson_id, _stage in assets}
        ),
        "profile_id": next(iter(profile_ids)),
        "compatible_modes": sorted({asset.mode for asset, _lesson_id, _stage in assets}),
        "compatible_variants": sorted(
            {asset.variant for asset, _lesson_id, _stage in assets}
        ),
        "provenance": reviewed_one_provenance(payload),
    }


def planned_registry() -> tuple[dict[str, Any], bytes, list[tuple[CourseAudioAsset, str, str]]]:
    payload = SOURCE_AUDIO.read_bytes()
    if len(payload) != APPROVED_ONE_BYTES:
        raise ValueError(
            f"The reviewed One source must be exactly {APPROVED_ONE_BYTES} bytes."
        )
    if sha256_bytes(payload) != APPROVED_ONE_AUDIO_SHA256:
        raise ValueError("The reviewed One source checksum does not match its approval.")
    probe_mp3(payload)

    assets = standalone_one_assets()
    take = expected_take(assets, payload)
    provenance = take["provenance"]
    for asset, _lesson_id, _stage in assets:
        validate_provenance(asset, provenance, audio_sha256=APPROVED_ONE_AUDIO_SHA256)

    registry = copy.deepcopy(load_approved_take_registry())
    existing_take = registry["takes"].get(APPROVED_ONE_AUDIO_SHA256)
    if existing_take is not None and existing_take != take:
        raise ValueError("The approved One take ID already has different metadata.")
    registry["takes"][APPROVED_ONE_AUDIO_SHA256] = take

    for asset, _lesson_id, _stage in assets:
        existing = registry["bindings"].get(asset.id)
        if existing is not None:
            if not isinstance(existing, dict):
                raise ValueError(f"The existing One binding is malformed: {asset.id}")
            existing_take_id = existing.get("take_id")
            if existing_take_id not in KNOWN_REJECTED_TAKE_IDS | {
                APPROVED_ONE_AUDIO_SHA256
            }:
                raise ValueError(
                    f"Refusing to replace an unexpected approved One take: {asset.id}"
                )
        registry["bindings"][asset.id] = {
            "take_id": APPROVED_ONE_AUDIO_SHA256,
            "approved_at": APPROVED_ONE_AUDIO_APPROVED_AT,
            "approval_note": APPROVED_ONE_AUDIO_BINDING_NOTE,
        }
    return registry, payload, assets


def install_physical_take(payload: bytes) -> Path:
    takes_directory = approved_audio_dir() / "takes"
    takes_directory.mkdir(parents=True, exist_ok=True)
    target = takes_directory / f"{APPROVED_ONE_AUDIO_SHA256}.mp3"
    if target.exists():
        if target.read_bytes() != payload:
            raise ValueError("The content-addressed One path contains different bytes.")
        return target

    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{APPROVED_ONE_AUDIO_SHA256}-",
        suffix=".mp3",
        dir=takes_directory,
    )
    try:
        with os.fdopen(descriptor, "wb") as temporary:
            temporary.write(payload)
            temporary.flush()
            os.fsync(temporary.fileno())
        try:
            os.link(temporary_name, target)
        except FileExistsError:
            if target.read_bytes() != payload:
                raise ValueError("The content-addressed One path contains different bytes.")
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return target


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Register the already-reviewed standalone One MP3 against exactly six persistent "
            "course-audio assets. Dry-run is the default."
        )
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Install the content-addressed MP3 and atomically update the approved registry.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    registry, payload, assets = planned_registry()
    action = "will bind" if args.apply else "would bind"
    print(
        f"Reviewed One plan: {action} {len(assets)} immutable assets to "
        f"{APPROVED_ONE_AUDIO_SHA256}."
    )
    for asset, lesson_id, stage in assets:
        print(f"  {lesson_id} {stage}: {asset.id}")
    if not args.apply:
        print("Dry run only; pass --apply to write the take and registry.")
        return 0

    install_physical_take(payload)
    for asset, _lesson_id, _stage in assets:
        resolved = resolve_approved_take(asset, registry)
        if resolved is None or resolved.take_id != APPROVED_ONE_AUDIO_SHA256:
            raise ValueError(f"The candidate One binding did not verify: {asset.id}")
    write_registry(registry)
    stored = load_approved_take_registry()
    for asset, _lesson_id, _stage in assets:
        resolved = resolve_approved_take(asset, stored)
        if resolved is None or resolved.take_id != APPROVED_ONE_AUDIO_SHA256:
            raise ValueError(f"The stored One binding did not verify: {asset.id}")
    print("Reviewed One registration verified for all six assets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
