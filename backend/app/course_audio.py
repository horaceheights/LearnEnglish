import hashlib
import os
from pathlib import Path
import asyncio

import httpx
from fastapi import HTTPException
from fastapi.responses import FileResponse


ROOT_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT_DIR / "storage" / "audio-cache"
OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech"
SUPPORTED_FORMATS = {
    "mp3": "audio/mpeg",
    "opus": "audio/ogg",
    "aac": "audio/aac",
    "flac": "audio/flac",
    "wav": "audio/wav",
}
_generation_locks: dict[str, asyncio.Lock] = {}


def load_local_env() -> None:
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()


def openai_api_key() -> str:
    raw_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    key_start = raw_key.find("sk-")
    if key_start >= 0:
        return raw_key[key_start:].strip()
    return raw_key


def audio_configured() -> bool:
    return bool(openai_api_key())


def audio_debug() -> dict[str, object]:
    return {
        "openai_audio_configured": audio_configured(),
        "model": os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        "voice": os.getenv("OPENAI_TTS_VOICE", "coral"),
        "format": os.getenv("OPENAI_TTS_FORMAT", "mp3"),
        "cache_dir": str(CACHE_DIR),
    }


def audio_instructions(mode: str, lang: str, variant: str) -> str:
    language_hint = "Spanish" if lang.lower().startswith("es") else "English"
    if mode == "pronunciation_slow":
        return (
            f"Speak in {language_hint} as a warm A1 English teacher. Speak slowly and clearly. "
            "Leave a small pause between each word. For words ending in -ing, gently separate the base "
            "and the -ing part, for example run...ning or swim...ming. Keep the tone friendly and natural."
        )
    if mode == "pronunciation_repeat":
        return (
            f"Speak in {language_hint} as a warm A1 English teacher. Repeat the phrase clearly at a medium-slow "
            "pace, faster than a slow demonstration but slower than normal conversation. Keep every word distinct."
        )
    if mode == "feedback":
        if lang.lower().startswith("es"):
            return (
                "Speak in friendly Mexican/Latin American Spanish for a beginner English learner. "
                "Use simple, encouraging wording and a warm teacher tone. Keep it short and upbeat."
            )
        return (
            "Speak in English as a warm, encouraging A1 teacher. Make this very short feedback phrase "
            "sound cheerful, clear, and natural, like a friendly celebration after a correct answer."
        )
    return (
        f"Speak in {language_hint} as a friendly A1 English teacher. Use a warm, clear, natural voice. "
        "Do not speak too fast. Make short beginner phrases easy to understand."
    )


def cache_path_for(text: str, mode: str, lang: str, variant: str, model: str, voice: str, output_format: str) -> Path:
    key = "\n".join([text, mode, lang, variant, model, voice, output_format])
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.{output_format}"


async def get_course_audio(text: str, mode: str, lang: str, variant: str) -> FileResponse:
    cleaned_text = text.strip()
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Text is required.")

    if len(cleaned_text) > 500:
        raise HTTPException(status_code=400, detail="Text is too long for course audio.")

    api_key = openai_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="OpenAI course audio is not configured.")

    model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    voice = os.getenv("OPENAI_TTS_VOICE", "coral")
    output_format = os.getenv("OPENAI_TTS_FORMAT", "mp3").lower()
    media_type = SUPPORTED_FORMATS.get(output_format)
    if not media_type:
        raise HTTPException(status_code=500, detail=f"Unsupported OPENAI_TTS_FORMAT: {output_format}")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    audio_path = cache_path_for(cleaned_text, mode, lang, variant, model, voice, output_format)
    if audio_path.exists() and audio_path.stat().st_size > 0:
        return FileResponse(audio_path, media_type=media_type, filename=audio_path.name)

    lock_key = audio_path.name
    lock = _generation_locks.setdefault(lock_key, asyncio.Lock())
    async with lock:
        if audio_path.exists() and audio_path.stat().st_size > 0:
            return FileResponse(audio_path, media_type=media_type, filename=audio_path.name)

        payload = {
            "model": model,
            "voice": voice,
            "input": cleaned_text,
            "instructions": audio_instructions(mode, lang, variant),
            "response_format": output_format,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(OPENAI_SPEECH_URL, json=payload, headers=headers)
        except httpx.HTTPError as error:
            raise HTTPException(status_code=502, detail="Could not reach OpenAI audio service.") from error

        if response.status_code >= 400:
            detail = response.text[:500] if response.text else "OpenAI audio request failed."
            raise HTTPException(status_code=502, detail=detail)

        audio_path.write_bytes(response.content)
    return FileResponse(audio_path, media_type=media_type, filename=audio_path.name)
