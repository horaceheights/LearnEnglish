from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse

from .course_audio_profile import (
    COURSE_AUDIO_PROFILE_ID,
    NEUTRAL_SPEAKER_ROLES,
    render_profile_for,
)
from .course_audio_receipts import (
    LEGACY_STATIC_SOURCE,
    build_receipt,
    probe_mp3,
    receipt_path,
    sha256_bytes,
    sha256_file,
    validate_stored_asset,
    write_receipt_once,
)
from .course_audio_registry import (
    ApprovedTakeRegistryError,
    load_approved_take_registry,
    registry_binding_errors,
    resolve_approved_take,
)
from .schemas import CourseAudioAsset


ROOT_DIR = Path(__file__).resolve().parents[2]
APPROVED_AUDIO_DIR = ROOT_DIR / "backend" / "approved-course-audio"
CATALOG_PATH = APPROVED_AUDIO_DIR / "catalog.json"
LEGACY_MANIFEST_PATH = ROOT_DIR / "frontend" / "lib" / "courseAudioManifest.json"
LEGACY_AUDIO_DIR = ROOT_DIR / "frontend" / "public" / "audio-cache"
DEFAULT_STORAGE_DIR = ROOT_DIR / "backend" / "storage" / "course-audio-assets"
ASSET_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{15,159}$")

_last_seed_status: dict[str, object] = {
    "present": 0,
    "copied": 0,
    "missing": 0,
    "invalid": 0,
    "total": 0,
    "registry_errors": ["Persistent course audio has not been seeded yet."],
}
_last_elevenlabs_seed_status: dict[str, object] = {
    "present": 0,
    "copied": 0,
    "generated": 0,
    "missing": 0,
    "invalid": 0,
    "total": 0,
    "errors": ["ElevenLabs course audio has not been seeded yet."],
}
ELEVENLABS_STORAGE_VERSION = "elevenlabs-v2"


class ImmutableAssetConflict(RuntimeError):
    pass


def storage_dir() -> Path:
    configured = os.getenv("COURSE_AUDIO_STORAGE_DIR", "").strip()
    return Path(configured) if configured else DEFAULT_STORAGE_DIR


def elevenlabs_storage_dir() -> Path:
    return storage_dir() / ELEVENLABS_STORAGE_VERSION


@lru_cache(maxsize=1)
def asset_index() -> dict[str, CourseAudioAsset]:
    """Load the immutable release catalog without changing live Production lessons."""
    try:
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Persistent course-audio catalog is unavailable or invalid.") from error
    if catalog.get("schema_version") != 1:
        raise RuntimeError("Unsupported persistent course-audio catalog version.")
    if catalog.get("profile_id") != COURSE_AUDIO_PROFILE_ID:
        raise RuntimeError("Persistent course-audio catalog profile does not match the server.")
    raw_assets = catalog.get("assets")
    if not isinstance(raw_assets, dict) or not raw_assets:
        raise RuntimeError("Persistent course-audio catalog has no assets.")

    indexed: dict[str, CourseAudioAsset] = {}
    for asset_id, raw_asset in raw_assets.items():
        if not isinstance(asset_id, str) or not ASSET_ID_PATTERN.fullmatch(asset_id):
            raise RuntimeError("Persistent course-audio catalog contains an invalid asset ID.")
        if not isinstance(raw_asset, dict):
            raise RuntimeError(f"Persistent course-audio contract is invalid: {asset_id}.")
        asset = CourseAudioAsset(**raw_asset)
        if asset.id != asset_id:
            raise RuntimeError(f"Persistent course-audio catalog key mismatch: {asset_id}.")
        if asset.profile_id != COURSE_AUDIO_PROFILE_ID:
            raise RuntimeError(f"Persistent course-audio profile mismatch: {asset_id}.")
        render_profile_for(asset.speaker_role, asset.mode)
        indexed[asset_id] = asset
    return indexed


def asset_path(asset_id: str) -> Path:
    if not ASSET_ID_PATTERN.fullmatch(asset_id):
        raise HTTPException(status_code=404, detail="Course audio asset not found.")
    return storage_dir() / f"{asset_id}.mp3"


def _write_audio_once(target: Path, payload: bytes) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{target.stem}-",
        suffix=".mp3",
        dir=target.parent,
    )
    try:
        with os.fdopen(descriptor, "wb") as temporary:
            temporary.write(payload)
            temporary.flush()
            os.fsync(temporary.fileno())
        try:
            os.link(temporary_name, target)
        except FileExistsError:
            return False
        return True
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def install_asset_once(
    asset: CourseAudioAsset,
    payload: bytes,
    provenance: dict[str, object],
    *,
    allow_legacy_neutral: bool = False,
    destination: Path | None = None,
) -> dict[str, object]:
    """Install approved bytes and an image/card-bound receipt without overwriting."""
    actual_media = probe_mp3(payload)
    supplied_media = provenance.get("stored_media")
    if supplied_media is not None and supplied_media != actual_media:
        raise ValueError("Course audio stored_media does not match the approved MP3.")
    provenance = {**provenance, "stored_media": actual_media}
    receipt = build_receipt(
        asset,
        payload,
        provenance,
        allow_legacy_neutral=allow_legacy_neutral,
    )
    target = (destination or storage_dir()) / f"{asset.id}.mp3"
    sidecar = receipt_path(target)
    desired_sha256 = sha256_bytes(payload)

    if target.exists():
        if not target.is_file() or sha256_file(target) != desired_sha256:
            raise ImmutableAssetConflict("A different file already owns this immutable asset ID.")
        valid, _, _ = validate_stored_asset(asset, target)
        if valid:
            return {
                "asset_id": asset.id,
                "bytes": len(payload),
                "audio_sha256": desired_sha256,
                "stored": False,
                "idempotent": True,
            }
        if sidecar.exists():
            raise ImmutableAssetConflict("This immutable asset has an invalid existing receipt.")
        if not write_receipt_once(sidecar, receipt):
            valid, _, _ = validate_stored_asset(asset, target)
            if not valid:
                raise ImmutableAssetConflict("A competing receipt does not match this asset.")
        return {
            "asset_id": asset.id,
            "bytes": len(payload),
            "audio_sha256": desired_sha256,
            "stored": True,
            "idempotent": False,
        }

    if sidecar.exists():
        raise ImmutableAssetConflict("A receipt already exists without its immutable audio file.")
    wrote_audio = _write_audio_once(target, payload)
    if not wrote_audio:
        if not target.is_file() or sha256_file(target) != desired_sha256:
            raise ImmutableAssetConflict("A competing file does not match this asset.")
        valid, _, _ = validate_stored_asset(asset, target)
        if valid:
            return {
                "asset_id": asset.id,
                "bytes": len(payload),
                "audio_sha256": desired_sha256,
                "stored": False,
                "idempotent": True,
            }
        if sidecar.exists():
            raise ImmutableAssetConflict("A competing receipt does not match this asset.")
    if not write_receipt_once(sidecar, receipt):
        valid, _, _ = validate_stored_asset(asset, target)
        if not valid:
            raise ImmutableAssetConflict("A competing receipt does not match this asset.")
    return {
        "asset_id": asset.id,
        "bytes": len(payload),
        "audio_sha256": desired_sha256,
        "stored": True,
        "idempotent": False,
    }


def _legacy_provenance(source: Path, payload: bytes) -> dict[str, object]:
    captured_at = datetime.fromtimestamp(source.stat().st_mtime, timezone.utc).isoformat()
    return {
        "source": LEGACY_STATIC_SOURCE,
        "provider": "unknown-reviewed-legacy",
        "model_id": "unknown-reviewed-legacy",
        "voice_id": "unknown-reviewed-legacy",
        "narrator": "unknown-reviewed-legacy",
        "settings": {},
        "seed": None,
        "provider_output_format": "unknown-reviewed-legacy",
        "stored_media": probe_mp3(payload),
        "processing": ["Imported byte-for-byte from the reviewed static course-audio manifest."],
        "generated_at": None,
        "captured_at": captured_at,
        "approved_at": None,
        "request_id": None,
        "trace_id": None,
        "character_cost": None,
    }


def seed_static_assets() -> dict[str, object]:
    """Idempotently install reviewed repository takes onto the persistent disk."""
    global _last_seed_status

    destination = storage_dir()
    destination.mkdir(parents=True, exist_ok=True)
    index = asset_index()
    errors: list[str] = []
    legacy_manifest = (
        json.loads(LEGACY_MANIFEST_PATH.read_text(encoding="utf-8"))
        if LEGACY_MANIFEST_PATH.is_file()
        else {}
    )
    try:
        registry = load_approved_take_registry()
        # Historical superseded bindings remain useful audit history. Validate
        # only bindings active in this exact Preview catalog.
        active_registry = {
            **registry,
            "bindings": {
                asset_id: binding
                for asset_id, binding in registry["bindings"].items()
                if asset_id in index
            },
        }
        errors.extend(registry_binding_errors(index, active_registry))
    except ApprovedTakeRegistryError as error:
        active_registry = {"schema_version": 1, "takes": {}, "bindings": {}}
        errors.append(str(error))

    copied = 0
    present = 0
    missing = 0
    invalid = 0
    for asset in index.values():
        target = destination / f"{asset.id}.mp3"
        valid, _, _ = validate_stored_asset(asset, target)
        if valid:
            present += 1
            continue
        try:
            approved_take = resolve_approved_take(asset, active_registry)
            if approved_take is not None:
                install_asset_once(asset, approved_take.payload, approved_take.provenance)
            elif asset.speaker_role in NEUTRAL_SPEAKER_ROLES and asset.variant != "completion-prompt":
                legacy_key = "\n".join([asset.text, asset.mode, "en-US", asset.variant])
                source_name = legacy_manifest.get(legacy_key)
                source = LEGACY_AUDIO_DIR / source_name if isinstance(source_name, str) else None
                if source is None or not source.is_file() or source.stat().st_size <= 0:
                    missing += 1
                    errors.append(f"Approved asset has no reviewed take: {asset.id}.")
                    continue
                payload = source.read_bytes()
                install_asset_once(
                    asset,
                    payload,
                    _legacy_provenance(source, payload),
                    allow_legacy_neutral=True,
                )
            else:
                missing += 1
                errors.append(f"Approved asset has no reviewed take: {asset.id}.")
                continue
        except (ApprovedTakeRegistryError, ImmutableAssetConflict, ValueError) as error:
            invalid += 1
            errors.append(f"{asset.id}: {error}")
            continue

        valid, reason, _ = validate_stored_asset(asset, target)
        if valid:
            copied += 1
        else:
            invalid += 1
            errors.append(f"{asset.id}: {reason}")

    _last_seed_status = {
        "present": present,
        "copied": copied,
        "missing": missing,
        "invalid": invalid,
        "total": len(index),
        "registry_errors": sorted(set(errors)),
    }
    return dict(_last_seed_status)


def seed_status() -> dict[str, object]:
    return dict(_last_seed_status)


async def seed_elevenlabs_assets() -> dict[str, object]:
    """Install only verified ElevenLabs takes under a cache-busted directory."""
    global _last_elevenlabs_seed_status

    from .course_audio import get_course_audio

    destination = elevenlabs_storage_dir()
    destination.mkdir(parents=True, exist_ok=True)
    index = asset_index()
    registry = load_approved_take_registry()
    errors: list[str] = []
    copied = 0
    generated = 0
    present = 0
    missing = 0
    invalid = 0

    for asset in index.values():
        target = destination / f"{asset.id}.mp3"
        valid, _, _ = validate_stored_asset(asset, target)
        if valid:
            present += 1
            continue
        try:
            approved_take = resolve_approved_take(asset, registry)
            if approved_take is not None:
                install_asset_once(
                    asset,
                    approved_take.payload,
                    approved_take.provenance,
                    destination=destination,
                )
                copied += 1
            else:
                profile = render_profile_for(asset.speaker_role, asset.mode)
                response = await get_course_audio(
                    text=asset.text,
                    mode=asset.mode,
                    lang="en-US",
                    variant=asset.variant,
                    provider=profile.provider,
                    narrator=profile.narrator,
                )
                if (
                    response.headers.get("x-audio-provider") != profile.provider
                    or response.headers.get("x-audio-fallback-from")
                ):
                    raise ValueError("Production did not return the approved ElevenLabs provider.")
                payload = Path(response.path).read_bytes()
                timestamp = datetime.now(timezone.utc).isoformat()
                provenance = {
                    **profile.as_provenance_contract(),
                    "source": "generated-persistent-course-audio-v2",
                    "stored_media": probe_mp3(payload),
                    "processing": [
                        "Generated once through the Production ElevenLabs course-audio path.",
                        "Stored under a cache-busted persistent path; no legacy audio was used.",
                    ],
                    "generated_at": timestamp,
                    "approved_at": timestamp,
                    "request_id": None,
                    "trace_id": None,
                    "character_cost": None,
                }
                install_asset_once(asset, payload, provenance, destination=destination)
                generated += 1
        except Exception as error:
            invalid += 1
            errors.append(f"{asset.id}: {error}")
        else:
            valid, reason, _ = validate_stored_asset(asset, target)
            if not valid:
                invalid += 1
                errors.append(f"{asset.id}: {reason}")

        _last_elevenlabs_seed_status = {
            "present": present,
            "copied": copied,
            "generated": generated,
            "missing": missing,
            "invalid": invalid,
            "total": len(index),
            "errors": sorted(set(errors)),
        }

    _last_elevenlabs_seed_status = {
        "present": present,
        "copied": copied,
        "generated": generated,
        "missing": missing,
        "invalid": invalid,
        "total": len(index),
        "errors": sorted(set(errors)),
    }
    return dict(_last_elevenlabs_seed_status)


def elevenlabs_seed_status() -> dict[str, object]:
    return dict(_last_elevenlabs_seed_status)


def elevenlabs_release_status() -> dict[str, object]:
    """Return a non-secret identity/readiness contract for release automation."""
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    expected_assets = len(asset_index())
    seed = elevenlabs_seed_status()
    present = int(seed.get("present", 0))
    copied = int(seed.get("copied", 0))
    generated = int(seed.get("generated", 0))
    missing = int(seed.get("missing", 0))
    invalid = int(seed.get("invalid", 0))
    errors = seed.get("errors")
    error_count = len(errors) if isinstance(errors, list) else 1
    available = present + copied + generated

    return {
        "ready": (
            expected_assets > 0
            and int(seed.get("total", 0)) == expected_assets
            and available == expected_assets
            and missing == 0
            and invalid == 0
            and error_count == 0
        ),
        "catalog_sha256": sha256_bytes(
            CATALOG_PATH.read_bytes().replace(b"\r\n", b"\n")
        ),
        "catalog_asset_count": expected_assets,
        "profile_id": catalog.get("profile_id"),
        "available": available,
        "missing": missing,
        "invalid": invalid,
        "error_count": error_count,
    }


def read_asset(asset_id: str) -> FileResponse:
    return _read_asset_from(asset_id, storage_dir())


def read_elevenlabs_asset(asset_id: str) -> FileResponse:
    return _read_asset_from(asset_id, elevenlabs_storage_dir())


def _read_asset_from(asset_id: str, directory: Path) -> FileResponse:
    asset = asset_index().get(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Course audio asset not found.")
    path = directory / f"{asset_id}.mp3"
    valid, _, _ = validate_stored_asset(asset, path)
    if not valid:
        # Learner requests are read-only and never call a paid provider.
        raise HTTPException(status_code=503, detail="Approved course audio is not available yet.")
    return FileResponse(
        path,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


def storage_status() -> dict[str, object]:
    return _storage_status_for(storage_dir())


def elevenlabs_storage_status() -> dict[str, object]:
    return _storage_status_for(elevenlabs_storage_dir())


def _storage_status_for(directory: Path) -> dict[str, object]:
    index = asset_index()
    available: list[str] = []
    unavailable: list[str] = []
    invalid: list[dict[str, str]] = []
    for asset_id, asset in index.items():
        valid, reason, _ = validate_stored_asset(
            asset, directory / f"{asset_id}.mp3"
        )
        if valid:
            available.append(asset_id)
            continue
        unavailable.append(asset_id)
        if reason != "missing-audio":
            invalid.append({"asset_id": asset_id, "reason": reason})
    return {
        "profile": COURSE_AUDIO_PROFILE_ID,
        "storage_dir": str(directory),
        "total": len(index),
        "available": len(available),
        "missing": len(unavailable),
        "invalid": len(invalid),
        "missing_asset_ids": unavailable,
        "invalid_assets": invalid,
    }
