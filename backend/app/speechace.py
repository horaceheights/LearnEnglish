import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import unquote

import httpx
from fastapi import HTTPException, UploadFile


SPEECHACE_PATH = "/api/scoring/text/v9/json"
_speechace_client: httpx.AsyncClient | None = None


def load_local_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()


def speechace_configured() -> bool:
    return bool(os.getenv("SPEECHACE_API_KEY"))


def speechace_base_url() -> str:
    return os.getenv("SPEECHACE_API_BASE_URL", "https://api.speechace.co").rstrip("/")


def speechace_dialect() -> str:
    return os.getenv("SPEECHACE_DIALECT", "en-us")


def speechace_api_key() -> str | None:
    api_key = os.getenv("SPEECHACE_API_KEY")
    if not api_key:
        return None

    return unquote(api_key)


def speechace_request_debug() -> dict[str, Any]:
    api_key = speechace_api_key()
    return {
        "base_url": speechace_base_url(),
        "path": SPEECHACE_PATH,
        "dialect": speechace_dialect(),
        "key_configured": bool(api_key),
        "key_was_url_encoded": "%" in os.getenv("SPEECHACE_API_KEY", ""),
    }


def speechace_client() -> httpx.AsyncClient:
    global _speechace_client
    if _speechace_client is None or _speechace_client.is_closed:
        _speechace_client = httpx.AsyncClient(timeout=30)
    return _speechace_client


async def close_speechace_client() -> None:
    if _speechace_client and not _speechace_client.is_closed:
        await _speechace_client.aclose()


async def score_pronunciation(
    *,
    text: str,
    audio_file: UploadFile,
    user_id: str | None = None,
    question_info: str | None = None,
) -> dict[str, Any]:
    api_key = speechace_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Speechace is not configured. Set SPEECHACE_API_KEY in the backend environment.",
        )

    started_at = time.perf_counter()
    audio_bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")
    read_audio_ms = round((time.perf_counter() - started_at) * 1000)

    params = {
        "key": api_key,
        "dialect": speechace_dialect(),
    }
    if user_id:
        params["user_id"] = user_id

    data = {
        "text": text,
    }
    if question_info:
        data["question_info"] = question_info

    files = {
        "user_audio_file": (
            audio_file.filename or "pronunciation.webm",
            audio_bytes,
            audio_file.content_type or "audio/webm",
        )
    }

    try:
        request_started_at = time.perf_counter()
        response = await speechace_client().post(
            f"{speechace_base_url()}{SPEECHACE_PATH}",
            params=params,
            data=data,
            files=files,
        )
        speechace_ms = round((time.perf_counter() - request_started_at) * 1000)
    except httpx.RequestError as error:
        raise HTTPException(status_code=502, detail=f"Could not reach Speechace: {error}") from error

    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Speechace returned a non-JSON response with status {response.status_code}.",
        ) from error

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=payload)

    if payload.get("status") == "error":
        raise HTTPException(status_code=400, detail=payload)

    payload["_timing"] = {
        "read_audio_ms": read_audio_ms,
        "speechace_ms": speechace_ms,
        "backend_total_ms": round((time.perf_counter() - started_at) * 1000),
        "audio_bytes": len(audio_bytes),
    }
    return payload
