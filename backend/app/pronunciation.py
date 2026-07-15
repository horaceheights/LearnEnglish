import os
from typing import Any

from fastapi import HTTPException, UploadFile

from .azure_pronunciation import azure_configured, azure_debug, close_azure_client, score_with_azure
from .speechace import close_speechace_client, score_pronunciation as score_with_speechace, speechace_configured, speechace_request_debug


def pronunciation_provider() -> str:
    return os.getenv("PRONUNCIATION_PROVIDER", "speechace").strip().lower()


def pronunciation_debug() -> dict[str, Any]:
    return {
        "provider": pronunciation_provider(),
        "configured": {"azure": azure_configured(), "speechace": speechace_configured()},
        "azure_request": azure_debug(),
        "speechace_request": speechace_request_debug(),
    }


async def close_pronunciation_clients() -> None:
    await close_azure_client()
    await close_speechace_client()


async def score_pronunciation(*, text: str, audio_file: UploadFile, user_id: str | None = None, question_info: str | None = None, provider_override: str | None = None):
    provider = (provider_override or pronunciation_provider()).strip().lower()
    if provider == "azure":
        return await score_with_azure(text=text, audio_file=audio_file)
    if provider == "speechace":
        result = await score_with_speechace(text=text, audio_file=audio_file, user_id=user_id, question_info=question_info)
        result.setdefault("provider", "speechace")
        return result
    raise HTTPException(status_code=503, detail=f"Unsupported pronunciation provider: {provider}")
