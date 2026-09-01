from __future__ import annotations

import argparse
import copy
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.card_audio_assets import asset_index  # noqa: E402
from backend.app.course_audio_profile import render_profile_for  # noqa: E402
from backend.app.course_audio_receipts import (  # noqa: E402
    probe_mp3,
    sha256_bytes,
    validate_provenance,
)
from backend.app.course_audio_registry import (  # noqa: E402
    ApprovedTakeRegistryError,
    approved_audio_dir,
    load_approved_take_registry,
    resolve_approved_take,
)
from backend.app.data import LESSONS  # noqa: E402
from backend.app.schemas import CourseAudioAsset  # noqa: E402
from scripts.render_course_audio_assets import (  # noqa: E402
    RenderJob,
    bind_take,
    write_registry,
)


SOURCE_COMMIT = "bbf61ae3600e7649bf77e38e3eafd9657dff847d"
CACHE_FILENAME = "e2d962e2f69ac1b67f022e4d303b2c00364380b58419900e2b0d93e75bfec029.mp3"
CACHE_REPOSITORY_PATH = f"backend/storage/audio-cache/{CACHE_FILENAME}"
SOURCE_AUDIO = ROOT / CACHE_REPOSITORY_PATH
QA_REPOSITORY_PATH = "docs/qa/course-audio-repairs-2026-08-28.json"
QA_EVIDENCE = ROOT / QA_REPOSITORY_PATH
QA_AUDIT_ID = "880b9662cebee945966e70f0d17695cff2f721b54d4b52a599caf9e959db979c"
LIAM_AUDIO_SHA256 = "220f069bfc8f80ec9690dba49d4ccf61ced6767df5114506eb84b61391daa6aa"
LIAM_AUDIO_BYTES = 20_493
LIAM_VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ"
PINNED_ASSET_ID = "lesson-7-1-the-body-c030-prompt-a954daadf1eb5340a5f3"
PINNED_APPROVED_AT = "2026-08-31T21:15:40.861890+00:00"
PINNED_CAPTURED_AT = "2026-08-28T16:09:59-06:00"
PINNED_BINDING_NOTE = (
    "Reuse the exact committed, QA-validated Liam repair for the same "
    "visible-fragment completion contract and pinned voice."
)
PINNED_COMPLETION_CONTRACT = {
    "visual_prompt": "My [blank].",
    "full_text": "My eyes.",
    "blank_text": "eyes",
}
PINNED_ASSET_CONTRACT = {
    "id": PINNED_ASSET_ID,
    "purpose": "prompt",
    "text": "My eyes.",
    "mode": "prompt",
    "variant": "completion-prompt",
    "image_ref": "/lesson-assets/a1_scene_eyes_577edc6.webp",
    "semantic_role": "teacher",
    "speaker_role": "male-character",
    "profile_id": "a1-elevenlabs-character-cast-v1",
    "revision": 1,
}
PINNED_PROFILE_CONTRACT = {
    "provider": "elevenlabs-premium",
    "model_id": "eleven_multilingual_v2",
    "narrator": "male-conversational",
    "voice_id": LIAM_VOICE_ID,
    "provider_output_format": "mp3_44100_128",
    "seed": 1101,
    "settings": {
        "stability": 0.55,
        "similarity_boost": 0.80,
        "style": 0.0,
        "use_speaker_boost": True,
        "speed": 0.70,
    },
}


@dataclass(frozen=True)
class PrunedBinding:
    asset_id: str
    category: str
    reason: str


@dataclass(frozen=True)
class MigrationPlan:
    registry: dict[str, Any]
    source_registry: dict[str, Any]
    payload: bytes
    job: RenderJob
    take_id: str
    pruned_bindings: tuple[PrunedBinding, ...]


def _git_blob(repository_path: str) -> bytes:
    result = subprocess.run(
        ["git", "show", f"{SOURCE_COMMIT}:{repository_path}"],
        cwd=ROOT,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise ValueError(
            f"Cannot verify {repository_path} at pinned source commit {SOURCE_COMMIT}: {detail}"
        )
    return result.stdout


def _load_json_object(payload: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"{label} is not valid UTF-8 JSON.") from error
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a JSON object.")
    return value


def _validated_qa_row(document: dict[str, Any], label: str) -> dict[str, Any]:
    if document.get("audit_date") != "2026-08-28":
        raise ValueError(f"{label} has the wrong audit date.")
    if document.get("completion_audio_profile") != "visible-fragments-provider-fallback-v4":
        raise ValueError(f"{label} has the wrong completion-audio profile.")
    repairs = document.get("repairs")
    if not isinstance(repairs, list):
        raise ValueError(f"{label} has no repairs list.")
    matches = [row for row in repairs if isinstance(row, dict) and row.get("request_id") == QA_AUDIT_ID]
    if len(matches) != 1:
        raise ValueError(f"{label} must contain exactly one pinned Liam QA row.")
    row = matches[0]
    expected = {
        "audit_status": "confirmed_bad",
        "endpoint": "completion",
        "expected_visible_speech": "My",
        "locations": ["7.1 The Body — card 30 (Use)"],
        "narrator": "male-conversational",
        "provider": "elevenlabs-premium",
        "cache_file": CACHE_FILENAME,
        "sha256": LIAM_AUDIO_SHA256,
        "transcripts": {
            "whisper-1": "My?",
            "gpt-4o-transcribe": "Mai?",
        },
        "validation": "pass",
        "validation_note": "both OpenAI transcribers accepted the visible speech",
    }
    for field, expected_value in expected.items():
        if row.get(field) != expected_value:
            raise ValueError(f"{label} Liam QA field {field} does not match its pinned evidence.")
    return row


def verify_pinned_liam_source(
    source_audio: Path = SOURCE_AUDIO,
    qa_evidence: Path = QA_EVIDENCE,
    *,
    committed_audio: bytes | None = None,
    committed_qa: bytes | None = None,
) -> tuple[bytes, dict[str, Any]]:
    legacy_cache_key = "\n".join(
        [
            "a1-elevenlabs-cast-v14",
            "visible-fragments-provider-fallback-v4",
            PINNED_COMPLETION_CONTRACT["visual_prompt"],
            PINNED_COMPLETION_CONTRACT["full_text"],
            PINNED_COMPLETION_CONTRACT["blank_text"],
            "prompt",
            "en-US",
            "completion-prompt",
            PINNED_PROFILE_CONTRACT["provider"],
            PINNED_PROFILE_CONTRACT["model_id"],
            PINNED_PROFILE_CONTRACT["voice_id"],
            "mp3",
        ]
    )
    if f"{sha256_bytes(legacy_cache_key.encode('utf-8'))}.mp3" != CACHE_FILENAME:
        raise ValueError("The pinned cache key does not prove the exact Liam request contract.")
    if source_audio.name != CACHE_FILENAME:
        raise ValueError("The Liam source cache filename is not the pinned committed filename.")
    if qa_evidence.name != Path(QA_REPOSITORY_PATH).name:
        raise ValueError("The Liam QA evidence filename is not the pinned audit filename.")
    payload = source_audio.read_bytes()
    if len(payload) != LIAM_AUDIO_BYTES:
        raise ValueError(f"The Liam source cache must be exactly {LIAM_AUDIO_BYTES} bytes.")
    if sha256_bytes(payload) != LIAM_AUDIO_SHA256:
        raise ValueError("The Liam source cache checksum does not match its pinned QA hash.")
    media = probe_mp3(payload)
    if media != {
        "container": "mp3",
        "codec": "mp3float",
        "sample_rate_hz": 24_000,
        "channels": 1,
        "bit_rate_bps": 96_000,
    }:
        raise ValueError("The Liam source cache MP3 probe does not match its pinned media record.")

    committed_audio = committed_audio if committed_audio is not None else _git_blob(CACHE_REPOSITORY_PATH)
    if committed_audio != payload:
        raise ValueError("The Liam source cache differs from the byte-exact pinned source commit.")

    current_qa_payload = qa_evidence.read_bytes()
    committed_qa = committed_qa if committed_qa is not None else _git_blob(QA_REPOSITORY_PATH)
    current_row = _validated_qa_row(
        _load_json_object(current_qa_payload, "Current Liam QA evidence"),
        "Current Liam QA evidence",
    )
    committed_row = _validated_qa_row(
        _load_json_object(committed_qa, "Committed Liam QA evidence"),
        "Committed Liam QA evidence",
    )
    if current_row != committed_row:
        raise ValueError("The current Liam QA row differs from its pinned source-commit evidence.")
    return payload, current_row


def exact_liam_job(index: dict[str, CourseAudioAsset]) -> RenderJob:
    asset = index.get(PINNED_ASSET_ID)
    if asset is None:
        raise ValueError("The exact current My-eyes completion asset is missing.")
    actual = asset.model_dump() if hasattr(asset, "model_dump") else asset.dict()
    if actual != PINNED_ASSET_CONTRACT:
        raise ValueError("The current My-eyes completion asset contract drifted from its pinned review.")
    job = RenderJob(
        kind="completion",
        assets=[asset],
        text="My eyes.",
        visual_prompt="My [blank].",
        blank_text="eyes",
    )
    if job.completion_contract_metadata != PINNED_COMPLETION_CONTRACT:
        raise ValueError("The My-eyes completion rendering contract drifted.")
    if job.profile.as_provenance_contract() != PINNED_PROFILE_CONTRACT:
        raise ValueError("The approved Liam profile or ElevenLabs parameters drifted.")
    if job.request_fragments() != [("My?", "eleven_multilingual_v2")]:
        raise ValueError("The completion contract no longer sends only the visible My? fragment.")
    return job


def _liam_provenance(job: RenderJob, payload: bytes, qa_row: dict[str, Any]) -> dict[str, Any]:
    provenance = {
        "source": "committed-qa-validated-cache-repair",
        **job.profile.as_provenance_contract(),
        "stored_media": probe_mp3(payload),
        "processing": [
            "Imported byte-for-byte from the committed QA-validated legacy completion cache.",
            (
                "The legacy completion pipeline synthesized only the visible My? prefix and "
                "stitched deterministic digital silence for the omitted answer."
            ),
            "No transcoding, normalization, speed change, or voice substitution was applied during this import.",
        ],
        "generated_at": None,
        "captured_at": PINNED_CAPTURED_AT,
        "approved_at": PINNED_APPROVED_AT,
        # The legacy cache and QA packet do not expose provider billing or request IDs.
        "request_id": None,
        "trace_id": None,
        "character_cost": None,
        "source_commit": SOURCE_COMMIT,
        "source_cache_file": CACHE_FILENAME,
        "review": {
            "status": "qa-validated-cache-reuse",
            "audit_id": QA_AUDIT_ID,
            "expected_visible_speech": qa_row["expected_visible_speech"],
            "transcripts": copy.deepcopy(qa_row["transcripts"]),
            "validation": qa_row["validation"],
            "validation_note": qa_row["validation_note"],
        },
    }
    validate_provenance(job.assets[0], provenance, audio_sha256=LIAM_AUDIO_SHA256)
    return provenance


def _expected_liam_take(
    job: RenderJob,
    payload: bytes,
    qa_row: dict[str, Any],
) -> dict[str, Any]:
    asset = job.assets[0]
    return {
        "file": f"takes/{LIAM_AUDIO_SHA256}.mp3",
        "audio_sha256": LIAM_AUDIO_SHA256,
        "bytes": len(payload),
        "text": asset.text,
        "compatible_speaker_roles": [asset.speaker_role],
        "profile_id": asset.profile_id,
        "compatible_modes": [asset.mode],
        "compatible_variants": [asset.variant],
        "provenance": _liam_provenance(job, payload, qa_row),
        "completion_contract": copy.deepcopy(PINNED_COMPLETION_CONTRACT),
    }


def _prune_invalid_bindings(
    index: dict[str, CourseAudioAsset],
    registry: dict[str, Any],
    registry_dir: Path,
) -> tuple[dict[str, Any], tuple[PrunedBinding, ...]]:
    candidate = copy.deepcopy(registry)
    pruned: list[PrunedBinding] = []
    for asset_id in sorted(registry["bindings"]):
        asset = index.get(asset_id)
        if asset is None:
            candidate["bindings"].pop(asset_id)
            pruned.append(
                PrunedBinding(asset_id, "unknown-asset", "binding targets no current immutable asset")
            )
            continue
        try:
            resolve_approved_take(asset, registry, registry_dir)
        except (ApprovedTakeRegistryError, ValueError, OSError) as error:
            candidate["bindings"].pop(asset_id)
            pruned.append(PrunedBinding(asset_id, "invalid-contract", str(error)))
    return candidate, tuple(pruned)


def build_migration_plan(
    index: dict[str, CourseAudioAsset],
    registry: dict[str, Any],
    registry_dir: Path,
    payload: bytes,
    qa_row: dict[str, Any],
) -> MigrationPlan:
    job = exact_liam_job(index)
    candidate, pruned = _prune_invalid_bindings(index, registry, registry_dir)
    expected_take = _expected_liam_take(job, payload, qa_row)
    existing_take = candidate["takes"].get(LIAM_AUDIO_SHA256)
    if existing_take is not None and existing_take != expected_take:
        raise ValueError(
            "Refusing to relabel existing Brian, OpenAI, or unknown bytes as the pinned Liam take."
        )
    candidate["takes"][LIAM_AUDIO_SHA256] = expected_take
    bind_take(candidate, LIAM_AUDIO_SHA256, job, PINNED_BINDING_NOTE)

    for take_id, original_take in registry["takes"].items():
        if candidate["takes"].get(take_id) != original_take:
            raise ValueError(f"The migration attempted to modify existing take metadata: {take_id}")
    expected_binding = {
        "take_id": LIAM_AUDIO_SHA256,
        "approved_at": PINNED_APPROVED_AT,
        "approval_note": PINNED_BINDING_NOTE,
    }
    if candidate["bindings"].get(PINNED_ASSET_ID) != expected_binding:
        raise ValueError("The exact Liam asset binding was not constructed as approved.")
    return MigrationPlan(
        registry=candidate,
        source_registry=copy.deepcopy(registry),
        payload=payload,
        job=job,
        take_id=LIAM_AUDIO_SHA256,
        pruned_bindings=pruned,
    )


def _install_take_once(registry_dir: Path, payload: bytes) -> Path:
    takes_dir = registry_dir / "takes"
    takes_dir.mkdir(parents=True, exist_ok=True)
    target = takes_dir / f"{LIAM_AUDIO_SHA256}.mp3"
    if target.exists():
        if target.read_bytes() != payload:
            raise ValueError("The content-addressed Liam take path contains different bytes.")
        return target
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{LIAM_AUDIO_SHA256}-",
        suffix=".mp3",
        dir=takes_dir,
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
                raise ValueError("The content-addressed Liam take path contains different bytes.")
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return target


def apply_migration_plan(
    plan: MigrationPlan,
    registry_dir: Path,
    *,
    registry_writer: Callable[[dict[str, Any]], None] = write_registry,
) -> None:
    _install_take_once(registry_dir, plan.payload)
    resolved = resolve_approved_take(plan.job.assets[0], plan.registry, registry_dir)
    if resolved is None or resolved.take_id != plan.take_id:
        raise ValueError("The candidate Liam binding failed validation before registry publication.")
    # write_registry publishes one complete JSON replacement atomically. No take
    # record or physical take is deleted by this migration.
    registry_writer(plan.registry)
    stored = load_approved_take_registry(registry_dir)
    resolved = resolve_approved_take(plan.job.assets[0], stored, registry_dir)
    if resolved is None or resolved.take_id != plan.take_id:
        raise ValueError("The stored Liam binding failed validation after registry publication.")
    for take_id, original_take in plan.source_registry["takes"].items():
        if stored["takes"].get(take_id) != original_take:
            raise ValueError(f"The stored migration did not preserve take metadata: {take_id}")


def migrate(
    *,
    apply: bool,
    index: dict[str, CourseAudioAsset] | None = None,
    registry_dir: Path | None = None,
    source_audio: Path = SOURCE_AUDIO,
    qa_evidence: Path = QA_EVIDENCE,
    committed_audio: bytes | None = None,
    committed_qa: bytes | None = None,
    registry_writer: Callable[[dict[str, Any]], None] = write_registry,
) -> MigrationPlan:
    directory = registry_dir or approved_audio_dir()
    current_index = index or asset_index(LESSONS)
    payload, qa_row = verify_pinned_liam_source(
        source_audio,
        qa_evidence,
        committed_audio=committed_audio,
        committed_qa=committed_qa,
    )
    registry = load_approved_take_registry(directory)
    plan = build_migration_plan(current_index, registry, directory, payload, qa_row)
    if apply:
        apply_migration_plan(plan, directory, registry_writer=registry_writer)
    return plan


def _print_plan(plan: MigrationPlan, apply: bool) -> None:
    unknown = sum(item.category == "unknown-asset" for item in plan.pruned_bindings)
    invalid = sum(item.category == "invalid-contract" for item in plan.pruned_bindings)
    verb = "Pruned" if apply else "Would prune"
    print(
        f"Brian-to-Liam registry migration: {verb.lower()} {unknown} stale/unknown and "
        f"{invalid} current-contract-invalid bindings."
    )
    for item in plan.pruned_bindings:
        print(f"  {verb} {item.category} binding {item.asset_id}: {item.reason}")
    print(
        f"Existing take records preserved: {len(plan.source_registry['takes'])}; "
        f"exact Liam take {'bound' if apply else 'would be bound'} to {PINNED_ASSET_ID}."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Prune only stale/invalid persistent course-audio bindings and import the one "
            "committed QA-validated Liam completion take. Dry-run is the default."
        )
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Install the content-addressed Liam take and atomically publish the migrated registry.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    plan = migrate(apply=args.apply)
    _print_plan(plan, args.apply)
    if not args.apply:
        print("Dry run only; pass --apply to publish the local registry migration.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
