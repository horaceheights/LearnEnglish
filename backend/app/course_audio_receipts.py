from __future__ import annotations

import hashlib
import io
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import av

from .course_audio_profile import NEUTRAL_SPEAKER_ROLES, render_profile_for
from .schemas import CourseAudioAsset


RECEIPT_VERSION = 1
LEGACY_STATIC_SOURCE = "legacy-static-manifest"
REVIEWED_EXACT_OVERRIDE_SOURCE = "reviewed-exact-audio-override"
APPROVED_ONE_AUDIO_SHA256 = (
    "802f1c7d7e2d8a3e868f89f7d99fdb106f0f3b7fd4876cfe088634e4b9e9f432"
)
APPROVED_ONE_AUDIO_APPROVED_AT = "2026-08-28T15:20:54-06:00"
APPROVED_ONE_AUDIO_SOURCE_COMMIT = "84efef509c902cd416eb37511fce18ca3b9bcd6d"
APPROVED_ONE_AUDIO_PROCESSING = [
    "Copied byte-for-byte from the reviewed bundled One correction.",
    "No transcoding, normalization, speed change, or voice substitution was applied.",
]
APPROVED_ONE_AUDIO_REVIEW = {
    "status": "reviewed-exact-override",
    "basis": (
        "The user approved this clearer standalone One recording; the exact bytes were "
        "already shipped across Learn, Recognize, and Speak in the source commit."
    ),
}
APPROVED_ONE_AUDIO_BINDING_NOTE = (
    "Bound to the exact reviewed standalone One correction; provider and voice are "
    "intentionally not inferred."
)
REVIEWED_EXACT_AUDIO_OVERRIDES = {
    APPROVED_ONE_AUDIO_SHA256: {
        "text": "One",
        "approved_at": APPROVED_ONE_AUDIO_APPROVED_AT,
        "source_commit": APPROVED_ONE_AUDIO_SOURCE_COMMIT,
        "processing": APPROVED_ONE_AUDIO_PROCESSING,
        "review": APPROVED_ONE_AUDIO_REVIEW,
        "binding_note": APPROVED_ONE_AUDIO_BINDING_NOTE,
        "contracts": frozenset(
            {
                ("teacher", "prompt", "prompt"),
                ("teacher", "pronunciation_slow", "split-ing"),
                ("answer", "prompt", "answer"),
            }
        ),
    }
}


def binding_note_for_provenance(provenance: dict[str, Any], default: str) -> str:
    if provenance.get("source") != REVIEWED_EXACT_OVERRIDE_SOURCE:
        return default
    approved_sha256 = provenance.get("approved_audio_sha256")
    if not isinstance(approved_sha256, str):
        raise ValueError("Reviewed exact audio has no pinned binding note.")
    override = REVIEWED_EXACT_AUDIO_OVERRIDES.get(approved_sha256)
    if override is None:
        raise ValueError("Reviewed exact audio has no pinned binding note.")
    return override["binding_note"]


REQUIRED_PROVENANCE_FIELDS = {
    "source",
    "provider",
    "model_id",
    "voice_id",
    "narrator",
    "settings",
    "seed",
    "provider_output_format",
    "stored_media",
    "processing",
    "generated_at",
    "approved_at",
    "request_id",
    "trace_id",
    "character_cost",
}
CANONICAL_RECEIPT_FIELDS = {
    "receipt_version",
    "asset_id",
    "audio_sha256",
    "bytes",
    "profile_id",
    "semantic_role",
    "speaker_role",
    "revision",
    "purpose",
    "text",
    "mode",
    "variant",
    "image_ref",
}


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as audio_file:
        for chunk in iter(lambda: audio_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def probe_mp3(payload: bytes) -> dict[str, object]:
    """Decode enough of an upload to prove it contains playable MP3 audio."""
    if not payload:
        raise ValueError("Course audio is empty.")
    try:
        with av.open(io.BytesIO(payload), mode="r", format="mp3") as container:
            audio_streams = [stream for stream in container.streams if stream.type == "audio"]
            if len(audio_streams) != 1:
                raise ValueError("Course audio must contain exactly one audio stream.")
            stream = audio_streams[0]
            first_frame = next(container.decode(stream), None)
            if first_frame is None or first_frame.samples <= 0:
                raise ValueError("Course audio does not contain decodable samples.")
            codec = stream.codec_context
            return {
                "container": "mp3",
                "codec": codec.name or "mp3",
                "sample_rate_hz": int(codec.sample_rate or first_frame.sample_rate or 0),
                "channels": int(codec.channels or len(first_frame.layout.channels) or 0),
                "bit_rate_bps": int(stream.bit_rate or container.bit_rate or 0),
            }
    except (av.FFmpegError, EOFError, OSError) as error:
        raise ValueError("Course audio is not a decodable MP3 file.") from error


def receipt_path(audio_path: Path) -> Path:
    return audio_path.with_suffix(".json")


def _profile_mismatch(asset: CourseAudioAsset, provenance: dict[str, Any]) -> str | None:
    expected = render_profile_for(asset.speaker_role, asset.mode).as_provenance_contract()
    for key, value in expected.items():
        if provenance.get(key) != value:
            return key
    return None


def validate_provenance(
    asset: CourseAudioAsset,
    provenance: dict[str, Any],
    *,
    allow_legacy_neutral: bool = False,
    audio_sha256: str | None = None,
) -> None:
    if not isinstance(provenance, dict):
        raise ValueError("Course audio provenance must be a JSON object.")
    missing = sorted(REQUIRED_PROVENANCE_FIELDS - provenance.keys())
    if missing:
        raise ValueError(f"Course audio provenance is missing: {', '.join(missing)}")
    reserved = sorted(CANONICAL_RECEIPT_FIELDS & provenance.keys())
    if reserved:
        raise ValueError(
            "Course audio provenance cannot override receipt fields: " + ", ".join(reserved)
        )
    if not isinstance(provenance.get("settings"), dict):
        raise ValueError("Course audio provenance settings must be an object.")
    if not isinstance(provenance.get("stored_media"), dict):
        raise ValueError("Course audio provenance stored_media must be an object.")
    if not isinstance(provenance.get("processing"), list):
        raise ValueError("Course audio provenance processing must be a list.")
    character_cost = provenance.get("character_cost")
    if character_cost is not None and (
        not isinstance(character_cost, int) or isinstance(character_cost, bool) or character_cost < 0
    ):
        raise ValueError("Course audio character_cost must be a non-negative integer or null.")

    is_reviewed_exact_override = provenance.get("source") == REVIEWED_EXACT_OVERRIDE_SOURCE
    if is_reviewed_exact_override:
        allowed_fields = REQUIRED_PROVENANCE_FIELDS | {
            "approved_audio_sha256",
            "registry_binding",
            "source_commit",
            "review",
        }
        unexpected_fields = sorted(provenance.keys() - allowed_fields)
        if unexpected_fields:
            raise ValueError(
                "Reviewed exact audio has unexpected provenance fields: "
                + ", ".join(unexpected_fields)
            )
        approved_sha256 = provenance.get("approved_audio_sha256")
        override = REVIEWED_EXACT_AUDIO_OVERRIDES.get(approved_sha256)
        if override is None or audio_sha256 != approved_sha256:
            raise ValueError("Reviewed exact audio does not match its pinned approved checksum.")
        if asset.text != override["text"]:
            raise ValueError("Reviewed exact audio text does not match its approved scope.")
        contract = (asset.speaker_role, asset.mode, asset.variant)
        if contract not in override["contracts"]:
            raise ValueError("Reviewed exact audio contract is outside its approved scope.")
        unknown_provider_fields = (
            "provider",
            "model_id",
            "voice_id",
            "narrator",
            "seed",
            "generated_at",
            "request_id",
            "trace_id",
            "character_cost",
        )
        if any(provenance.get(field) is not None for field in unknown_provider_fields):
            raise ValueError("Reviewed exact audio cannot invent unknown provider metadata.")
        if provenance.get("settings") != {}:
            raise ValueError("Reviewed exact audio cannot invent unknown provider settings.")
        if provenance.get("provider_output_format") != "reviewed-bundled-mp3":
            raise ValueError("Reviewed exact audio must identify its bundled source format.")
        for field in ("approved_at", "source_commit", "processing", "review"):
            if provenance.get(field) != override[field]:
                raise ValueError(
                    f"Reviewed exact audio does not match its pinned {field} record."
                )
        registry_binding = provenance.get("registry_binding")
        if registry_binding is not None and registry_binding != {
            "take_id": approved_sha256,
            "approved_at": override["approved_at"],
            "approval_note": override["binding_note"],
        }:
            raise ValueError(
                "Reviewed exact audio does not match its pinned registry binding."
            )
        return

    is_legacy = provenance.get("source") == LEGACY_STATIC_SOURCE
    if is_legacy:
        if not allow_legacy_neutral:
            raise ValueError("Legacy static provenance is allowed only during reviewed startup seeding.")
        if asset.speaker_role not in NEUTRAL_SPEAKER_ROLES:
            raise ValueError("Named-character audio cannot use a voice-unknown legacy file.")
        if asset.variant == "completion-prompt":
            raise ValueError("Completion prompts cannot use the ordinary legacy audio cache.")
        return

    mismatch = _profile_mismatch(asset, provenance)
    if mismatch:
        raise ValueError(f"Course audio provenance does not match profile field: {mismatch}.")


def build_receipt(
    asset: CourseAudioAsset,
    payload: bytes,
    provenance: dict[str, Any],
    *,
    allow_legacy_neutral: bool = False,
) -> dict[str, Any]:
    payload_sha256 = sha256_bytes(payload)
    validate_provenance(
        asset,
        provenance,
        allow_legacy_neutral=allow_legacy_neutral,
        audio_sha256=payload_sha256,
    )
    # Canonical fields are server-derived and deliberately applied last. The
    # caller cannot replace an asset binding, checksum, or revision via JSON.
    return {
        **provenance,
        "receipt_version": RECEIPT_VERSION,
        "asset_id": asset.id,
        "audio_sha256": payload_sha256,
        "bytes": len(payload),
        "profile_id": asset.profile_id,
        "semantic_role": asset.semantic_role,
        "speaker_role": asset.speaker_role,
        "revision": asset.revision,
        "purpose": asset.purpose,
        "text": asset.text,
        "mode": asset.mode,
        "variant": asset.variant,
        "image_ref": asset.image_ref,
    }


def write_receipt_atomic(path: Path, receipt: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.stem}-",
        suffix=".json",
        dir=path.parent,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            json.dump(receipt, temporary, indent=2, sort_keys=True)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_name, path)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def write_receipt_once(path: Path, receipt: dict[str, Any]) -> bool:
    """Atomically create a receipt without ever replacing an existing one."""
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.stem}-",
        suffix=".json",
        dir=path.parent,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            json.dump(receipt, temporary, indent=2, sort_keys=True)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        try:
            os.link(temporary_name, path)
        except FileExistsError:
            return False
        return True
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def validate_stored_asset(
    asset: CourseAudioAsset,
    audio_path: Path,
) -> tuple[bool, str, dict[str, Any] | None]:
    if not audio_path.is_file() or audio_path.stat().st_size == 0:
        return False, "missing-audio", None
    sidecar = receipt_path(audio_path)
    if not sidecar.is_file():
        return False, "missing-receipt", None
    try:
        receipt = json.loads(sidecar.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False, "invalid-receipt-json", None
    expected = {
        "receipt_version": RECEIPT_VERSION,
        "asset_id": asset.id,
        "profile_id": asset.profile_id,
        "semantic_role": asset.semantic_role,
        "speaker_role": asset.speaker_role,
        "revision": asset.revision,
        "purpose": asset.purpose,
        "text": asset.text,
        "mode": asset.mode,
        "variant": asset.variant,
        "image_ref": asset.image_ref,
    }
    for key, value in expected.items():
        if receipt.get(key) != value:
            return False, f"receipt-{key}-mismatch", receipt
    try:
        validate_provenance(
            asset,
            {key: value for key, value in receipt.items() if key not in CANONICAL_RECEIPT_FIELDS},
            allow_legacy_neutral=receipt.get("source") == LEGACY_STATIC_SOURCE,
            audio_sha256=receipt.get("audio_sha256"),
        )
    except ValueError:
        return False, "receipt-provenance-invalid", receipt
    if receipt.get("bytes") != audio_path.stat().st_size:
        return False, "receipt-size-mismatch", receipt
    if receipt.get("audio_sha256") != sha256_file(audio_path):
        return False, "receipt-sha256-mismatch", receipt
    return True, "ok", receipt
