"""Read-only course delivery from the approved Cloudflare R2 inventory.

The publisher validates MP3 bytes and receipts before committing this inventory.
Runtime checks its pinned receipts and object ETags/sizes; protected release CI
also downloads and hashes every object. No learner request writes or renders.
"""
from __future__ import annotations

import hashlib
import json
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path

import httpx
from fastapi import HTTPException
from fastapi.responses import RedirectResponse

from .course_audio_profile import COURSE_AUDIO_PROFILE_ID, render_profile_for
from .course_audio_receipts import (
    CANONICAL_RECEIPT_FIELDS, LEGACY_STATIC_SOURCE, validate_provenance,
    RECEIPT_VERSION, probe_mp3,
)
from .persistent_audio_assets import CATALOG_PATH, asset_index, ASSET_ID_PATTERN
from .course_audio_registry import load_approved_take_registry

MEDIA_BASE_URL = "https://cdn.learnspanglish.app"
ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "docs/product/course-audio-upload-manifest.json"
_lock = threading.Lock()
_status: dict = {"ready": False, "available": 0, "missing": 0, "invalid": 0, "error_count": 1}
_available: set[str] = set()


def catalog_sha256() -> str:
    return hashlib.sha256(CATALOG_PATH.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def object_url(key: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_./-]+", key) or ".." in key or key.startswith("/"):
        raise ValueError("Invalid Cloudflare object key")
    return f"{MEDIA_BASE_URL}/{key}"


@lru_cache(maxsize=1)
def inventory() -> dict:
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if (data.get("schema_version") != 1 or data.get("base_url") != MEDIA_BASE_URL
            or data.get("catalog_sha256") != catalog_sha256()
            or data.get("profile_id") != COURSE_AUDIO_PROFILE_ID
            or set(data.get("assets", {})) != set(asset_index())):
        raise ValueError("Cloudflare inventory does not match the exact release catalog")
    registry = load_approved_take_registry()
    for asset_id, entry in data["assets"].items():
        if entry.get("key") != f"course-audio/elevenlabs-v2/{asset_id}.mp3":
            raise ValueError("Cloudflare audio key does not match its immutable ID")
        for kind in ("audio", "receipt"):
            value = entry.get(kind, {})
            if (not re.fullmatch(r"[a-f0-9]{64}", value.get("sha256", ""))
                    or not re.fullmatch(r"[a-f0-9]{32}", value.get("etag", ""))
                    or not isinstance(value.get("bytes"), int) or value["bytes"] <= 0):
                raise ValueError("Cloudflare object descriptor is invalid")
        # Validate active registry contracts without rebinding an already-owned
        # immutable ID to a later equivalent take. Installed receipts remain
        # the authoritative provenance for those existing bytes.
        binding = registry["bindings"].get(asset_id)
        if binding is not None:
            asset = asset_index()[asset_id]
            take = registry["takes"].get(binding.get("take_id"), {})
            if (take.get("text") != asset.text or take.get("profile_id") != asset.profile_id
                    or asset.speaker_role not in take.get("compatible_speaker_roles", [take.get("speaker_role")])
                    or asset.mode not in take.get("compatible_modes", [])
                    or asset.variant not in take.get("compatible_variants", [])
                    or binding.get("approved_at") != take.get("provenance", {}).get("approved_at")):
                raise ValueError("Cloudflare catalog has an invalid approved registry binding")
            validate_provenance(asset, take["provenance"], audio_sha256=take.get("audio_sha256"))
    return data


def validate_receipt(asset, receipt: dict, descriptor: dict) -> None:
    expected = {
        "receipt_version": RECEIPT_VERSION, "asset_id": asset.id,
        "profile_id": asset.profile_id, "semantic_role": asset.semantic_role,
        "speaker_role": asset.speaker_role, "revision": asset.revision,
        "purpose": asset.purpose, "text": asset.text, "mode": asset.mode,
        "variant": asset.variant, "image_ref": asset.image_ref,
        "audio_sha256": descriptor["sha256"], "bytes": descriptor["bytes"],
    }
    if any(receipt.get(key) != value for key, value in expected.items()):
        raise ValueError("Cloudflare receipt does not match the canonical audio contract")
    if receipt.get("source") == LEGACY_STATIC_SOURCE:
        raise ValueError("Provider-unknown audio cannot enter the verified inventory")
    validate_provenance(asset, {k: v for k, v in receipt.items() if k not in CANONICAL_RECEIPT_FIELDS},
                        audio_sha256=receipt["audio_sha256"])


def _check_response(response: httpx.Response, descriptor: dict, *, full: bool) -> None:
    response.raise_for_status()
    if (response.headers.get("etag", "").strip('"') != descriptor["etag"]
            or int(response.headers.get("content-length", -1)) != descriptor["bytes"]):
        raise ValueError("Cloudflare object ETag/size mismatch")
    if full and hashlib.sha256(response.content).hexdigest() != descriptor["sha256"]:
        raise ValueError("Cloudflare object checksum mismatch")


def verify_inventory(*, full: bool = False, workers: int = 16) -> dict:
    """Verify all catalog bindings. Full mode is mandatory before publication."""
    global _status, _available
    index = asset_index()
    valid: set[str] = set()
    errors: list[str] = []
    missing = invalid = 0
    try:
        data = inventory()
        with httpx.Client(timeout=30, follow_redirects=False, headers={"Accept-Encoding": "identity"},
                          limits=httpx.Limits(max_connections=workers)) as client:
            def check(item):
                asset_id, entry = item
                try:
                    receipt_response = client.get(object_url(entry["key"].removesuffix(".mp3") + ".json"))
                    _check_response(receipt_response, entry["receipt"], full=True)
                    receipt = receipt_response.json()
                    validate_receipt(index[asset_id], receipt, entry["audio"])
                    audio = (client.get if full else client.head)(object_url(entry["key"]))
                    _check_response(audio, entry["audio"], full=full)
                    if full and probe_mp3(audio.content) != receipt["stored_media"]:
                        raise ValueError("Cloudflare MP3 media probe mismatch")
                    return asset_id, None, False
                except httpx.HTTPStatusError as error:
                    return asset_id, str(error.response.status_code), error.response.status_code == 404
                except Exception as error:
                    return asset_id, str(error), False
            with ThreadPoolExecutor(max_workers=workers) as pool:
                for asset_id, reason, is_missing in pool.map(check, data["assets"].items()):
                    if reason is None:
                        valid.add(asset_id)
                    else:
                        missing += int(is_missing)
                        invalid += int(not is_missing)
                        errors.append(f"{asset_id}: {reason}")
    except Exception as error:
        errors.append(str(error))
        invalid = len(index)
    result = {
        "storage_provider": "cloudflare-r2", "base_url": MEDIA_BASE_URL,
        "ready": len(valid) == len(index) and not errors,
        "catalog_sha256": catalog_sha256(), "catalog_asset_count": len(index),
        "profile_id": COURSE_AUDIO_PROFILE_ID, "available": len(valid),
        "missing": missing, "invalid": invalid, "error_count": len(errors),
        "verification": "sha256-mp3-receipt" if full else "etag-size-receipt",
    }
    with _lock:
        _available = valid
        _status = result
    return {**result, "errors": errors}


def release_status() -> dict:
    with _lock:
        return {"storage_provider": "cloudflare-r2", "base_url": MEDIA_BASE_URL,
                "catalog_sha256": catalog_sha256(), "catalog_asset_count": len(asset_index()),
                "profile_id": COURSE_AUDIO_PROFILE_ID, **_status}


def read_legacy_asset(asset_id: str) -> RedirectResponse:
    """Keep the original bytes behind shipped v1 immutable URLs."""
    if not ASSET_ID_PATTERN.fullmatch(asset_id):
        raise HTTPException(404, "Course audio asset not found.")
    key = f"course-audio/{asset_id}.mp3"
    if key not in inventory().get("historical_objects", {}):
        raise HTTPException(404, "Course audio asset not found.")
    return RedirectResponse(object_url(key), status_code=307,
                            headers={"Cache-Control": "public, max-age=31536000, immutable"})


def read_asset(asset_id: str) -> RedirectResponse:
    if not ASSET_ID_PATTERN.fullmatch(asset_id):
        raise HTTPException(404, "Course audio asset not found.")
    if asset_id in asset_index():
        with _lock:
            ready = asset_id in _available
        if not ready:
            raise HTTPException(503, "Approved course audio is not available yet.")
        key = inventory()["assets"][asset_id]["key"]
    else:
        # Preserve already-shipped clients' superseded immutable IDs.
        key = f"course-audio/elevenlabs-v2/{asset_id}.mp3"
        if key not in inventory().get("historical_objects", {}):
            raise HTTPException(404, "Course audio asset not found.")
    return RedirectResponse(object_url(key), status_code=307,
                            headers={"Cache-Control": "public, max-age=31536000, immutable"})


def legacy_course_audio(text, mode, lang, variant, provider, narrator):
    """Frozen compatibility for shipped clients; misses never call a provider."""
    from .course_audio import sanitize_course_audio_text, normalized_provider, _provider_audio_settings, cache_path_for
    try:
        text = sanitize_course_audio_text(text)
        provider = normalized_provider(provider)
        model, voice, output_format = _provider_audio_settings(provider, narrator, variant)
        name = cache_path_for(text, mode, lang, variant, model, voice, output_format).name
    except (ValueError, HTTPException) as error:
        raise HTTPException(400, "Invalid course audio request.") from error
    key = f"course-audio/compatibility-cache/{name}"
    if key in inventory().get("historical_objects", {}):
        return RedirectResponse(object_url(key), status_code=307)
    # Current approved recordings can satisfy a known legacy contract too.
    for asset in asset_index().values():
        profile = render_profile_for(asset.speaker_role, asset.mode)
        if (lang == "en-US" and asset.text == text and asset.mode == mode and asset.variant == variant
                and profile.provider == provider and profile.narrator == narrator):
            return read_asset(asset.id)
    raise HTTPException(503, "Approved course audio is not available.")


def legacy_completion_audio(visual_prompt, full_text, blank_text, mode, lang, variant, provider, narrator):
    from .course_audio import completion_prompt_contract, normalized_provider, _provider_audio_settings, completion_prompt_cache_path, silent_completion_audio_response
    try:
        completion_prompt_contract(visual_prompt, full_text, blank_text)
        provider = normalized_provider(provider)
        model, voice, _ = _provider_audio_settings(provider, narrator, variant)
        name = completion_prompt_cache_path(visual_prompt, full_text, blank_text, mode, lang, variant, provider, model, voice).name
    except (ValueError, HTTPException):
        return silent_completion_audio_response("invalid-static-contract")
    key = f"course-audio/compatibility-cache/{name}"
    if key in inventory().get("historical_objects", {}):
        return RedirectResponse(object_url(key), status_code=307)
    return silent_completion_audio_response("missing-static-completion")
