import base64
import json
import os
import time
from typing import Any

import httpx
from fastapi import HTTPException, UploadFile


_client: httpx.AsyncClient | None = None


def azure_configured() -> bool:
    return bool(os.getenv("AZURE_SPEECH_KEY") and os.getenv("AZURE_SPEECH_REGION"))


def azure_debug() -> dict[str, Any]:
    region = os.getenv("AZURE_SPEECH_REGION", "")
    return {
        "region": region,
        "locale": os.getenv("AZURE_SPEECH_LOCALE", "en-US"),
        "key_configured": bool(os.getenv("AZURE_SPEECH_KEY")),
        "endpoint": f"https://{region}.stt.speech.microsoft.com" if region else None,
    }


def azure_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30)
    return _client


async def close_azure_client() -> None:
    if _client and not _client.is_closed:
        await _client.aclose()


def _content_type(audio_file: UploadFile) -> str:
    content_type = (audio_file.content_type or "").lower()
    if "wav" in content_type:
        return "audio/wav; codecs=audio/pcm; samplerate=16000"
    if "ogg" in content_type and "opus" in content_type:
        return "audio/ogg; codecs=opus"
    raise HTTPException(
        status_code=415,
        detail="Azure pronunciation scoring requires 16 kHz PCM WAV or Ogg/Opus audio.",
    )


def normalize_azure_result(payload: dict[str, Any], elapsed_ms: int, audio_bytes: int) -> dict[str, Any]:
    best = (payload.get("NBest") or [{}])[0]
    assessment = best.get("PronunciationAssessment") or best
    words = []
    for word in best.get("Words") or []:
        word_assessment = word.get("PronunciationAssessment") or word
        syllables = [
            {
                "letters": item.get("Grapheme") or item.get("Syllable"),
                "quality_score": (item.get("PronunciationAssessment") or item).get("AccuracyScore"),
            }
            for item in word.get("Syllables") or []
        ]
        phones = [
            {
                "phone": item.get("Phoneme"),
                "quality_score": (item.get("PronunciationAssessment") or item).get("AccuracyScore"),
            }
            for item in word.get("Phonemes") or []
        ]
        words.append({
            "word": word.get("Word"),
            "quality_score": word_assessment.get("AccuracyScore"),
            "syllable_score_list": syllables,
            "phone_score_list": phones,
            "error_type": word_assessment.get("ErrorType"),
        })

    return {
        "provider": "azure",
        "text_score": {
            "quality_score": assessment.get("PronScore") or assessment.get("AccuracyScore"),
            "speechace_score": {"pronunciation": assessment.get("PronScore")},
            "word_score_list": words,
            "azure_scores": {
                "accuracy": assessment.get("AccuracyScore"),
                "fluency": assessment.get("FluencyScore"),
                "completeness": assessment.get("CompletenessScore"),
            },
        },
        "recognized_text": payload.get("DisplayText") or best.get("Display"),
        "_timing": {"provider_ms": elapsed_ms, "backend_total_ms": elapsed_ms, "audio_bytes": audio_bytes},
        "_provider_response": payload,
    }


async def score_with_azure(*, text: str, audio_file: UploadFile) -> dict[str, Any]:
    key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_SPEECH_REGION")
    locale = os.getenv("AZURE_SPEECH_LOCALE", "en-US")
    if not key or not region:
        raise HTTPException(status_code=503, detail="Azure Speech is not configured.")

    audio = await audio_file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    config = {
        "ReferenceText": text,
        "GradingSystem": "HundredMark",
        "Granularity": "Phoneme",
        "Dimension": "Comprehensive",
        "EnableMiscue": True,
        "PhonemeAlphabet": "IPA",
    }
    encoded_config = base64.b64encode(json.dumps(config).encode("utf-8")).decode("ascii")
    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
    started = time.perf_counter()
    try:
        response = await azure_client().post(
            url,
            params={"language": locale, "format": "detailed"},
            headers={
                "Ocp-Apim-Subscription-Key": key,
                "Pronunciation-Assessment": encoded_config,
                "Content-Type": _content_type(audio_file),
                "Accept": "application/json",
            },
            content=audio,
        )
    except httpx.RequestError as error:
        raise HTTPException(status_code=502, detail=f"Could not reach Azure Speech: {error}") from error

    elapsed_ms = round((time.perf_counter() - started) * 1000)
    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail=f"Azure Speech returned status {response.status_code} without JSON.") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=payload)
    if payload.get("RecognitionStatus") not in {"Success", 0}:
        status = payload.get("RecognitionStatus", "Unknown")
        raise HTTPException(status_code=422, detail={"message": f"Azure recognition failed: {status}", "azure": payload})
    return normalize_azure_result(payload, elapsed_ms, len(audio))
