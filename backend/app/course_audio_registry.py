from __future__ import annotations

import copy
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .course_audio_receipts import probe_mp3, sha256_bytes, validate_provenance
from .schemas import CourseAudioAsset


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_APPROVED_AUDIO_DIR = ROOT_DIR / "backend" / "approved-course-audio"
REGISTRY_SCHEMA_VERSION = 1
_TAKE_FILE_CACHE: dict[tuple[str, str, int, int], tuple[bytes, dict[str, object]]] = {}


class ApprovedTakeRegistryError(ValueError):
    pass


@dataclass(frozen=True)
class ResolvedApprovedTake:
    take_id: str
    payload: bytes
    provenance: dict[str, Any]


def approved_audio_dir() -> Path:
    return DEFAULT_APPROVED_AUDIO_DIR


def load_approved_take_registry(directory: Path | None = None) -> dict[str, Any]:
    root = directory or approved_audio_dir()
    path = root / "registry.json"
    if not path.is_file():
        return {"schema_version": REGISTRY_SCHEMA_VERSION, "takes": {}, "bindings": {}}
    try:
        registry = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ApprovedTakeRegistryError("Approved course-audio registry is not valid JSON.") from error
    if not isinstance(registry, dict):
        raise ApprovedTakeRegistryError("Approved course-audio registry must be an object.")
    if registry.get("schema_version") != REGISTRY_SCHEMA_VERSION:
        raise ApprovedTakeRegistryError("Unsupported approved course-audio registry version.")
    if not isinstance(registry.get("takes"), dict) or not isinstance(registry.get("bindings"), dict):
        raise ApprovedTakeRegistryError("Approved course-audio registry needs takes and bindings objects.")
    return registry


def _safe_take_path(directory: Path, relative_name: object) -> Path:
    if not isinstance(relative_name, str) or not relative_name.strip():
        raise ApprovedTakeRegistryError("Approved take has no file path.")
    relative = Path(relative_name)
    if relative.is_absolute() or relative.suffix.lower() != ".mp3":
        raise ApprovedTakeRegistryError("Approved take paths must be relative MP3 files.")
    root = directory.resolve()
    resolved = (directory / relative).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as error:
        raise ApprovedTakeRegistryError("Approved take path escapes its registry directory.") from error
    return resolved


def _string_list(value: object, field: str) -> list[str]:
    if not isinstance(value, list) or not value or not all(isinstance(item, str) for item in value):
        raise ApprovedTakeRegistryError(f"Approved take {field} must be a non-empty string list.")
    return value


def resolve_approved_take(
    asset: CourseAudioAsset,
    registry: dict[str, Any],
    directory: Path | None = None,
) -> ResolvedApprovedTake | None:
    binding = registry["bindings"].get(asset.id)
    if binding is None:
        return None
    if not isinstance(binding, dict):
        raise ApprovedTakeRegistryError(f"Approved binding for {asset.id} must be an object.")
    take_id = binding.get("take_id")
    if not isinstance(take_id, str) or not take_id:
        raise ApprovedTakeRegistryError(f"Approved binding for {asset.id} has no take_id.")
    take = registry["takes"].get(take_id)
    if not isinstance(take, dict):
        raise ApprovedTakeRegistryError(f"Approved take {take_id} is not defined.")

    root = directory or approved_audio_dir()
    path = _safe_take_path(root, take.get("file"))
    if not path.is_file():
        raise ApprovedTakeRegistryError(f"Approved take file is missing: {take_id}.")
    stat = path.stat()
    declared_sha256 = take.get("audio_sha256")
    declared_bytes = take.get("bytes")
    if (
        not isinstance(declared_sha256, str)
        or len(declared_sha256) != 64
        or any(character not in "0123456789abcdef" for character in declared_sha256)
    ):
        raise ApprovedTakeRegistryError(f"Approved take checksum is malformed: {take_id}.")
    if (
        not isinstance(declared_bytes, int)
        or isinstance(declared_bytes, bool)
        or declared_bytes <= 0
    ):
        raise ApprovedTakeRegistryError(f"Approved take byte count is malformed: {take_id}.")
    cache_key = (str(path), declared_sha256, declared_bytes, stat.st_mtime_ns)
    cached = _TAKE_FILE_CACHE.get(cache_key)
    if cached is None:
        payload = path.read_bytes()
        actual_media = probe_mp3(payload)
        _TAKE_FILE_CACHE[cache_key] = (payload, actual_media)
    else:
        payload, actual_media = cached
    actual_sha256 = sha256_bytes(payload)
    if take.get("audio_sha256") != actual_sha256:
        raise ApprovedTakeRegistryError(f"Approved take checksum does not match: {take_id}.")
    if path.name != f"{actual_sha256}.mp3":
        raise ApprovedTakeRegistryError(f"Approved take file is not content-addressed: {take_id}.")
    if take.get("bytes") != len(payload):
        raise ApprovedTakeRegistryError(f"Approved take byte count does not match: {take_id}.")
    if take.get("text") != asset.text:
        raise ApprovedTakeRegistryError(f"Approved take text does not match asset {asset.id}.")
    compatible_speakers = take.get("compatible_speaker_roles")
    if compatible_speakers is None:
        compatible_speakers = [take.get("speaker_role")]
    compatible_speakers = _string_list(compatible_speakers, "compatible_speaker_roles")
    if asset.speaker_role not in compatible_speakers:
        raise ApprovedTakeRegistryError(f"Approved take speaker does not match asset {asset.id}.")
    if take.get("profile_id") != asset.profile_id:
        raise ApprovedTakeRegistryError(f"Approved take profile does not match asset {asset.id}.")
    if asset.mode not in _string_list(take.get("compatible_modes"), "compatible_modes"):
        raise ApprovedTakeRegistryError(f"Approved take mode does not match asset {asset.id}.")
    if asset.variant not in _string_list(take.get("compatible_variants"), "compatible_variants"):
        raise ApprovedTakeRegistryError(f"Approved take variant does not match asset {asset.id}.")

    provenance = copy.deepcopy(take.get("provenance"))
    if not isinstance(provenance, dict):
        raise ApprovedTakeRegistryError(f"Approved take provenance is missing: {take_id}.")
    if provenance.get("stored_media") != actual_media:
        raise ApprovedTakeRegistryError(f"Approved take media probe does not match: {take_id}.")
    if binding.get("approved_at") != provenance.get("approved_at"):
        raise ApprovedTakeRegistryError(f"Approved binding date does not match take {take_id}.")
    provenance["registry_binding"] = {
        "take_id": take_id,
        "approved_at": binding.get("approved_at"),
        "approval_note": binding.get("approval_note", ""),
    }
    try:
        validate_provenance(asset, provenance)
    except ValueError as error:
        raise ApprovedTakeRegistryError(str(error)) from error
    return ResolvedApprovedTake(take_id=take_id, payload=payload, provenance=provenance)


def registry_binding_errors(
    assets: dict[str, CourseAudioAsset],
    registry: dict[str, Any],
    directory: Path | None = None,
) -> list[str]:
    errors: list[str] = []
    for asset_id in registry["bindings"]:
        asset = assets.get(asset_id)
        if asset is None:
            errors.append(f"Approved binding targets an unknown asset: {asset_id}.")
            continue
        try:
            resolve_approved_take(asset, registry, directory)
        except ApprovedTakeRegistryError as error:
            errors.append(str(error))
    return errors
