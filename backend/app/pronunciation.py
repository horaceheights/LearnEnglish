import os
from typing import Any

from fastapi import HTTPException, UploadFile

from .azure_pronunciation import azure_configured, azure_debug, close_azure_client, get_browser_speech_token, score_with_azure


def pronunciation_provider() -> str:
    return os.getenv("PRONUNCIATION_PROVIDER", "azure").strip().lower()


def pronunciation_debug() -> dict[str, Any]:
    return {
        "provider": pronunciation_provider(),
        "configured": {"azure": azure_configured()},
        "azure_request": azure_debug(),
    }


async def close_pronunciation_clients() -> None:
    await close_azure_client()


async def get_pronunciation_browser_token() -> dict[str, str]:
    if pronunciation_provider() != "azure":
        raise HTTPException(status_code=503, detail="Browser streaming is only available with Azure Speech.")
    return await get_browser_speech_token()


async def score_pronunciation(*, text: str, audio_file: UploadFile, user_id: str | None = None, question_info: str | None = None, provider_override: str | None = None):
    provider = (provider_override or pronunciation_provider()).strip().lower()
    if provider == "azure":
        return await score_with_azure(text=text, audio_file=audio_file)
    raise HTTPException(status_code=503, detail=f"Unsupported pronunciation provider: {provider}")
