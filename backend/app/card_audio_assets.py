from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile
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
from .schemas import CourseAudioAsset, CourseAudioTurn, Lesson, LessonCard


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_STORAGE_DIR = ROOT_DIR / "backend" / "storage" / "course-audio-assets"
CARD_AUDIO_PROFILE_VERSION = COURSE_AUDIO_PROFILE_ID
ASSET_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{15,159}$")
VISUAL_PLACEHOLDER_PATTERN = re.compile(
    r"_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]",
    flags=re.IGNORECASE,
)


def storage_dir() -> Path:
    configured = os.getenv("COURSE_AUDIO_STORAGE_DIR", "").strip()
    return Path(configured) if configured else DEFAULT_STORAGE_DIR


def _correct_option(card: LessonCard):
    return next((option for option in card.options if option.id == card.correct_option_id), None)


def card_image_ref(card: LessonCard) -> str:
    """Return the exact canonical visual that the model clip teaches."""
    if card.prompt_image_url.strip():
        return card.prompt_image_url.strip()
    correct = _correct_option(card)
    if correct and correct.image_url.strip():
        return correct.image_url.strip()

    # Listen cards can intentionally be text-only. Bind them to a stable digest
    # of the complete rendered choice contract instead of pretending an image exists.
    rendered = {
        "prompt": card.prompt,
        "options": [
            {"id": option.id, "label": option.label or "", "image_url": option.image_url}
            for option in card.options
        ],
    }
    digest = hashlib.sha256(
        json.dumps(rendered, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()[:20]
    return f"text-only:{digest}"


def _asset(
    lesson_id: str,
    card_index: int,
    card: LessonCard,
    *,
    purpose: str,
    text: str,
    mode: str,
    variant: str,
    semantic_role: str,
    speaker_role: str,
    revision: int,
    image_ref: str | None = None,
) -> CourseAudioAsset:
    image_ref = (card_image_ref(card) if image_ref is None else image_ref).strip()
    if not image_ref:
        raise ValueError("Course audio assets must have an exact nonempty image binding.")
    # Validate every content-authored role against the pinned provider-neutral
    # cast before it can enter an immutable asset contract.
    render_profile_for(speaker_role, mode)
    contract = {
        "profile_id": CARD_AUDIO_PROFILE_VERSION,
        "lesson_id": lesson_id,
        "card_index": card_index,
        "purpose": purpose,
        "text": text.strip(),
        "mode": mode,
        "variant": variant,
        "image_ref": image_ref,
        "semantic_role": semantic_role,
        "speaker_role": speaker_role,
        "revision": revision,
    }
    digest = hashlib.sha256(
        json.dumps(contract, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()[:20]
    safe_lesson_id = re.sub(r"[^a-z0-9-]+", "-", lesson_id.lower()).strip("-")
    asset_id = f"{safe_lesson_id}-c{card_index + 1:03d}-{purpose}-{digest}"
    return CourseAudioAsset(
        id=asset_id,
        purpose=purpose,
        text=text.strip(),
        mode=mode,
        variant=variant,
        image_ref=image_ref,
        semantic_role=semantic_role,
        speaker_role=speaker_role,
        profile_id=CARD_AUDIO_PROFILE_VERSION,
        revision=revision,
    )


def _semantic_role(purpose: str, text: str) -> str:
    if purpose == "answer" or purpose.startswith("answer-turn-"):
        return "answer"
    if text.strip().endswith("?"):
        return "question"
    return "teacher"


def _speaker_role(card: LessonCard, purpose: str, semantic_role: str) -> str:
    if purpose == "answer":
        return card.answer_audio_speaker or card.audio_speaker or semantic_role
    return card.audio_speaker or semantic_role


def _turn_assets(
    lesson_id: str,
    card_index: int,
    card: LessonCard,
    *,
    purpose: str,
    canonical_text: str,
    turns: list[CourseAudioTurn],
    mode: str,
    variant: str,
    revision: int,
    whole_field_speaker: str | None,
) -> list[CourseAudioAsset]:
    if not turns:
        return []

    reconstructed_text = " ".join(turn.text for turn in turns)
    if reconstructed_text != canonical_text:
        raise ValueError(
            f"{purpose} audio turns must reconstruct the canonical audio text exactly: "
            f"{reconstructed_text!r} != {canonical_text!r}."
        )

    if whole_field_speaker is not None:
        conflicting_roles = sorted({
            turn.speaker_role
            for turn in turns
            if turn.speaker_role != whole_field_speaker
        })
        if conflicting_roles:
            raise ValueError(
                f"{purpose} audio turns conflict with the whole-field speaker "
                f"{whole_field_speaker!r}: {', '.join(conflicting_roles)}."
            )

    assets: list[CourseAudioAsset] = []
    for turn_index, turn in enumerate(turns, start=1):
        turn_purpose = f"{purpose}-turn-{turn_index}"
        semantic_role = _semantic_role(turn_purpose, turn.text)
        assets.append(_asset(
            lesson_id,
            card_index,
            card,
            purpose=turn_purpose,
            text=turn.text,
            mode=mode,
            variant=variant,
            semantic_role=semantic_role,
            speaker_role=turn.speaker_role,
            revision=revision,
            image_ref=turn.image_url,
        ))
    return assets


def assets_for_card(lesson_id: str, card_index: int, card: LessonCard) -> list[CourseAudioAsset]:
    assets: list[CourseAudioAsset] = []
    raw_prompt = (card.audio_text if card.audio_text is not None else card.prompt).strip()
    has_blank = bool(VISUAL_PLACEHOLDER_PATTERN.search(card.prompt) or VISUAL_PLACEHOLDER_PATTERN.search(raw_prompt))
    is_pronunciation = card.stage in {"Pronunciation Practice", "Speak"}

    if has_blank:
        # The persistent clip contains the approved visible-fragment + silence
        # rendering. The full text is metadata for validation, never live TTS input.
        prompt_text = (card.answer_audio_text or "").strip()
        if prompt_text:
            if card.audio_turns:
                assets.extend(_turn_assets(
                    lesson_id,
                    card_index,
                    card,
                    purpose="prompt",
                    canonical_text=prompt_text,
                    turns=card.audio_turns,
                    mode="prompt",
                    variant="completion-prompt",
                    revision=card.audio_revision,
                    whole_field_speaker=card.audio_speaker,
                ))
            else:
                semantic_role = _semantic_role("prompt", prompt_text)
                assets.append(_asset(
                    lesson_id, card_index, card, purpose="prompt", text=prompt_text,
                    mode="prompt", variant="completion-prompt",
                    semantic_role=semantic_role,
                    speaker_role=_speaker_role(card, "prompt", semantic_role),
                    revision=card.audio_revision,
                ))
    elif raw_prompt:
        prompt_mode = "pronunciation_slow" if is_pronunciation else "prompt"
        prompt_variant = "split-ing" if is_pronunciation else (
            "question" if raw_prompt.lower() == "what is it?" else "prompt"
        )
        if card.audio_turns:
            assets.extend(_turn_assets(
                lesson_id,
                card_index,
                card,
                purpose="prompt",
                canonical_text=raw_prompt,
                turns=card.audio_turns,
                mode=prompt_mode,
                variant=prompt_variant,
                revision=card.audio_revision,
                whole_field_speaker=card.audio_speaker,
            ))
        else:
            semantic_role = _semantic_role("prompt", raw_prompt)
            assets.append(_asset(
                lesson_id, card_index, card, purpose="prompt", text=raw_prompt,
                mode=prompt_mode,
                variant=prompt_variant,
                semantic_role=semantic_role,
                speaker_role=_speaker_role(card, "prompt", semantic_role),
                revision=card.audio_revision,
            ))
    elif card.audio_turns:
        raise ValueError("prompt audio turns require canonical prompt audio text.")

    if is_pronunciation:
        for option_index, option in enumerate(card.options):
            option_text = (option.label or "").strip()
            if not option_text or option_text == raw_prompt:
                continue
            purpose = f"pronunciation-option-{option_index + 1}"
            semantic_role = _semantic_role(purpose, option_text)
            assets.append(_asset(
                lesson_id, card_index, card,
                purpose=purpose,
                text=option_text,
                mode="pronunciation_slow",
                variant="split-ing",
                semantic_role=semantic_role,
                speaker_role=_speaker_role(card, purpose, semantic_role),
                revision=card.audio_revision,
                image_ref=option.image_url or card_image_ref(card),
            ))

    correct = _correct_option(card)
    answer_text = (
        (card.answer_audio_text or "").strip()
        or ((correct.label or "").strip() if correct else "")
        or raw_prompt
    )
    if answer_text:
        if card.answer_audio_turns:
            assets.extend(_turn_assets(
                lesson_id,
                card_index,
                card,
                purpose="answer",
                canonical_text=answer_text,
                turns=card.answer_audio_turns,
                mode="prompt",
                variant="answer",
                revision=card.answer_audio_revision,
                whole_field_speaker=card.answer_audio_speaker or card.audio_speaker,
            ))
        elif card.audio_turns and answer_text == raw_prompt:
            # The correct-answer replay is the same authored conversation. Its
            # already-bound prompt turn sequence is authoritative; emitting a
            # whole answer asset here would collapse multiple speakers back
            # into one voice and break the exact image/voice pairing.
            pass
        else:
            semantic_role = _semantic_role("answer", answer_text)
            assets.append(_asset(
                lesson_id, card_index, card, purpose="answer", text=answer_text,
                mode="prompt", variant="answer",
                semantic_role=semantic_role,
                speaker_role=_speaker_role(card, "answer", semantic_role),
                revision=card.answer_audio_revision,
            ))
    elif card.answer_audio_turns:
        raise ValueError("answer audio turns require canonical answer audio text.")
    return assets


def bind_lesson_audio_assets(lesson: Lesson) -> Lesson:
    for card_index, card in enumerate(lesson.cards):
        card.audio_assets = assets_for_card(lesson.id, card_index, card)
    return lesson


def asset_index(lessons: dict[str, Lesson]) -> dict[str, CourseAudioAsset]:
    return {
        asset.id: asset
        for lesson in lessons.values()
        for card in lesson.cards
        for asset in card.audio_assets
    }


def asset_path(asset_id: str) -> Path:
    if not ASSET_ID_PATTERN.fullmatch(asset_id):
        raise HTTPException(status_code=404, detail="Course audio asset not found.")
    return storage_dir() / f"{asset_id}.mp3"


def read_asset(asset_id: str, lessons: dict[str, Lesson]) -> FileResponse:
    index = asset_index(lessons)
    asset = index.get(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Course audio asset not found.")
    path = asset_path(asset_id)
    valid, _, _ = validate_stored_asset(asset, path)
    if not valid:
        # Learner traffic is deliberately read-only. A missing clip must never
        # fan out to OpenAI, ElevenLabs, or any other metered provider.
        raise HTTPException(status_code=503, detail="Approved course audio is not available yet.")
    return FileResponse(
        path,
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


def storage_status(lessons: dict[str, Lesson]) -> dict[str, object]:
    index = asset_index(lessons)
    available: list[str] = []
    unavailable: list[str] = []
    invalid: list[dict[str, str]] = []
    for asset_id, asset in index.items():
        path = asset_path(asset_id)
        valid, reason, _ = validate_stored_asset(asset, path)
        if valid:
            available.append(asset_id)
        else:
            unavailable.append(asset_id)
            if reason != "missing-audio":
                invalid.append({"asset_id": asset_id, "reason": reason})
    missing_assets = [
        index[asset_id].model_dump() if hasattr(index[asset_id], "model_dump") else index[asset_id].dict()
        for asset_id in unavailable
    ]
    return {
        "profile": CARD_AUDIO_PROFILE_VERSION,
        "storage_dir": str(storage_dir()),
        "total": len(index),
        "available": len(available),
        # `missing` remains the release-gate count and therefore includes
        # corrupt or unaudited files, not only absent paths.
        "missing": len(unavailable),
        "invalid": len(invalid),
        "missing_asset_ids": unavailable,
        "missing_assets": missing_assets,
        "invalid_assets": invalid,
    }


class ImmutableAssetConflict(RuntimeError):
    pass


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
            # A same-filesystem hard link publishes the completed temporary
            # file atomically and fails if the immutable target already exists.
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
    provenance: dict[str, Any],
    *,
    allow_legacy_neutral: bool = False,
) -> dict[str, object]:
    actual_media = probe_mp3(payload)
    supplied_media = provenance.get("stored_media")
    if supplied_media is not None and supplied_media != actual_media:
        raise ValueError("Course audio stored_media does not match the uploaded MP3.")
    provenance = {**provenance, "stored_media": actual_media}
    receipt = build_receipt(
        asset,
        payload,
        provenance,
        allow_legacy_neutral=allow_legacy_neutral,
    )
    target = asset_path(asset.id)
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
        valid, reason, _ = validate_stored_asset(asset, target)
        if not valid:
            raise ImmutableAssetConflict(f"The installed asset failed receipt validation: {reason}.")
        return {
            "asset_id": asset.id,
            "bytes": len(payload),
            "audio_sha256": desired_sha256,
            "stored": False,
            "idempotent": True,
            "receipt_repaired": True,
        }

    if sidecar.exists():
        raise ImmutableAssetConflict("A receipt already owns this immutable asset ID.")
    created = _write_audio_once(target, payload)
    if not created:
        return install_asset_once(
            asset,
            payload,
            provenance,
            allow_legacy_neutral=allow_legacy_neutral,
        )
    if not write_receipt_once(sidecar, receipt):
        raise ImmutableAssetConflict("A competing receipt does not match this new asset.")
    valid, reason, _ = validate_stored_asset(asset, target)
    if not valid:
        raise ImmutableAssetConflict(f"The installed asset failed receipt validation: {reason}.")
    return {
        "asset_id": asset.id,
        "bytes": len(payload),
        "audio_sha256": desired_sha256,
        "stored": True,
        "idempotent": False,
    }


async def store_approved_asset(
    asset_id: str,
    upload: UploadFile,
    provenance: dict[str, Any],
    lessons: dict[str, Lesson],
) -> dict[str, object]:
    asset = asset_index(lessons).get(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Course audio asset not found.")
    if upload.content_type not in {"audio/mpeg", "audio/mp3", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Approved course audio must be an MP3 file.")

    payload = await upload.read(5 * 1024 * 1024 + 1)
    if not payload or len(payload) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Approved course audio must be between 1 byte and 5 MB.")
    try:
        return install_asset_once(asset, payload, provenance)
    except ImmutableAssetConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


def _legacy_provenance(source: Path, payload: bytes) -> dict[str, Any]:
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


def seed_static_assets(lessons: dict[str, Lesson]) -> dict[str, object]:
    """Copy reviewed repository clips onto the runtime disk without generating audio."""
    destination = storage_dir()
    destination.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT_DIR / "frontend" / "lib" / "courseAudioManifest.json"
    static_dir = ROOT_DIR / "frontend" / "public" / "audio-cache"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    index = asset_index(lessons)
    registry_errors: list[str] = []
    try:
        registry = load_approved_take_registry()
        registry_errors.extend(registry_binding_errors(index, registry))
    except ApprovedTakeRegistryError as error:
        registry = {"schema_version": 1, "takes": {}, "bindings": {}}
        registry_errors.append(str(error))

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

        installed = False
        try:
            approved_take = resolve_approved_take(asset, registry)
            if approved_take is not None:
                install_asset_once(asset, approved_take.payload, approved_take.provenance)
                installed = True
            elif (
                asset.speaker_role in NEUTRAL_SPEAKER_ROLES
                and asset.variant != "completion-prompt"
            ):
                key = "\n".join([asset.text, asset.mode, "en-US", asset.variant])
                source_name = manifest.get(key)
                source = static_dir / source_name if isinstance(source_name, str) else None
                if source and source.is_file() and source.stat().st_size > 0:
                    payload = source.read_bytes()
                    install_asset_once(
                        asset,
                        payload,
                        _legacy_provenance(source, payload),
                        allow_legacy_neutral=True,
                    )
                    installed = True
        except (ApprovedTakeRegistryError, ImmutableAssetConflict, ValueError) as error:
            registry_errors.append(f"{asset.id}: {error}")

        valid, reason, _ = validate_stored_asset(asset, target)
        if valid and installed:
            copied += 1
        elif target.exists() or receipt_path(target).exists():
            invalid += 1
            registry_errors.append(f"{asset.id}: {reason}")
        else:
            missing += 1
    return {
        "present": present,
        "copied": copied,
        "missing": missing,
        "invalid": invalid,
        "total": len(index),
        "registry_errors": sorted(set(registry_errors)),
    }
