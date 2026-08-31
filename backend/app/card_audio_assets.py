from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
from pathlib import Path

from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse

from .schemas import CourseAudioAsset, Lesson, LessonCard


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_STORAGE_DIR = ROOT_DIR / "backend" / "storage" / "course-audio-assets"
CARD_AUDIO_PROFILE_VERSION = "persistent-card-audio-v1"
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
    image_ref: str | None = None,
) -> CourseAudioAsset:
    image_ref = (image_ref or card_image_ref(card)).strip()
    contract = {
        "version": CARD_AUDIO_PROFILE_VERSION,
        "lesson_id": lesson_id,
        "card_index": card_index,
        "purpose": purpose,
        "text": text.strip(),
        "mode": mode,
        "variant": variant,
        "image_ref": image_ref,
    }
    digest = hashlib.sha256(
        json.dumps(contract, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()[:20]
    safe_lesson_id = re.sub(r"[^a-z0-9-]+", "-", lesson_id.lower()).strip("-")
    asset_id = f"{safe_lesson_id}-c{card_index + 1:03d}-{purpose}-{digest}"
    return CourseAudioAsset(id=asset_id, purpose=purpose, text=text.strip(), mode=mode, variant=variant, image_ref=image_ref)


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
            assets.append(_asset(
                lesson_id, card_index, card, purpose="prompt", text=prompt_text,
                mode="prompt", variant="completion-prompt",
            ))
    elif raw_prompt:
        assets.append(_asset(
            lesson_id, card_index, card, purpose="prompt", text=raw_prompt,
            mode="pronunciation_slow" if is_pronunciation else "prompt",
            variant="split-ing" if is_pronunciation else ("question" if raw_prompt.lower() == "what is it?" else "prompt"),
        ))

    if is_pronunciation:
        for option_index, option in enumerate(card.options):
            option_text = (option.label or "").strip()
            if not option_text or option_text == raw_prompt:
                continue
            assets.append(_asset(
                lesson_id, card_index, card,
                purpose=f"pronunciation-option-{option_index + 1}",
                text=option_text,
                mode="pronunciation_slow",
                variant="split-ing",
                image_ref=option.image_url or card_image_ref(card),
            ))

    correct = _correct_option(card)
    answer_text = (
        (card.answer_audio_text or "").strip()
        or ((correct.label or "").strip() if correct else "")
        or raw_prompt
    )
    if answer_text:
        assets.append(_asset(
            lesson_id, card_index, card, purpose="answer", text=answer_text,
            mode="prompt", variant="answer",
        ))
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
    if asset_id not in asset_index(lessons):
        raise HTTPException(status_code=404, detail="Course audio asset not found.")
    path = asset_path(asset_id)
    if not path.is_file() or path.stat().st_size == 0:
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
    available = []
    missing = []
    for asset_id in index:
        path = asset_path(asset_id)
        (available if path.is_file() and path.stat().st_size > 0 else missing).append(asset_id)
    missing_assets = [
        index[asset_id].model_dump() if hasattr(index[asset_id], "model_dump") else index[asset_id].dict()
        for asset_id in missing
    ]
    return {
        "profile": CARD_AUDIO_PROFILE_VERSION,
        "storage_dir": str(storage_dir()),
        "total": len(index),
        "available": len(available),
        "missing": len(missing),
        "missing_asset_ids": missing,
        "missing_assets": missing_assets,
    }


async def store_approved_asset(asset_id: str, upload: UploadFile, lessons: dict[str, Lesson]) -> dict[str, object]:
    if asset_id not in asset_index(lessons):
        raise HTTPException(status_code=404, detail="Course audio asset not found.")
    if upload.content_type not in {"audio/mpeg", "audio/mp3", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Approved course audio must be an MP3 file.")

    target = asset_path(asset_id)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = await upload.read(5 * 1024 * 1024 + 1)
    if not payload or len(payload) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Approved course audio must be between 1 byte and 5 MB.")
    if not (payload.startswith(b"ID3") or payload[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}):
        raise HTTPException(status_code=422, detail="Uploaded file does not look like MP3 audio.")

    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{asset_id}-", suffix=".mp3", dir=target.parent)
    try:
        with os.fdopen(descriptor, "wb") as temporary:
            temporary.write(payload)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_name, target)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return {"asset_id": asset_id, "bytes": len(payload), "stored": True}


def seed_static_assets(lessons: dict[str, Lesson]) -> dict[str, int]:
    """Copy reviewed repository clips onto the runtime disk without generating audio."""
    destination = storage_dir()
    destination.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT_DIR / "frontend" / "lib" / "courseAudioManifest.json"
    static_dir = ROOT_DIR / "frontend" / "public" / "audio-cache"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    copied = 0
    present = 0
    missing = 0
    for asset in asset_index(lessons).values():
        target = destination / f"{asset.id}.mp3"
        if target.is_file() and target.stat().st_size > 0:
            present += 1
            continue
        # Completion prompts intentionally do not use the ordinary static cache.
        key = "\n".join([asset.text, asset.mode, "en-US", asset.variant])
        source_name = manifest.get(key)
        source = static_dir / source_name if isinstance(source_name, str) else None
        if source and source.is_file() and source.stat().st_size > 0:
            shutil.copy2(source, target)
            copied += 1
        else:
            missing += 1
    return {"present": present, "copied": copied, "missing": missing, "total": len(asset_index(lessons))}
