import base64
import io
import json
import os
import time
import wave
from typing import Any

import av
import httpx
import sentry_sdk
from av.error import FFmpegError
from fastapi import HTTPException, UploadFile


_client: httpx.AsyncClient | None = None
_browser_token: str | None = None
_browser_token_expires_at = 0.0


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


async def get_browser_speech_token() -> dict[str, str]:
    global _browser_token, _browser_token_expires_at

    key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_SPEECH_REGION")
    locale = os.getenv("AZURE_SPEECH_LOCALE", "en-US")
    if not key or not region:
        raise HTTPException(status_code=503, detail="Azure Speech is not configured.")

    now = time.monotonic()
    if _browser_token and now < _browser_token_expires_at:
        return {"token": _browser_token, "region": region, "locale": locale}

    token_url = f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    try:
        response = await azure_client().post(
            token_url,
            headers={"Ocp-Apim-Subscription-Key": key, "Content-Length": "0"},
            content=b"",
        )
    except httpx.RequestError as error:
        raise HTTPException(status_code=502, detail=f"Could not request an Azure Speech token: {error}") from error

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail="Azure Speech token request failed.")

    token = response.text.strip()
    if not token:
        raise HTTPException(status_code=502, detail="Azure Speech returned an empty token.")

    _browser_token = token
    _browser_token_expires_at = now + 8 * 60
    return {"token": token, "region": region, "locale": locale}


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


def _is_mobile_audio(audio_file: UploadFile) -> bool:
    content_type = (audio_file.content_type or "").lower()
    filename = (audio_file.filename or "").lower()
    return (
        content_type in {"audio/m4a", "audio/mp4", "audio/x-m4a", "video/mp4"}
        or filename.endswith((".m4a", ".mp4"))
    )


def convert_mobile_audio_to_wav(audio: bytes) -> bytes:
    """Decode mobile AAC/M4A and return Azure-compatible 16 kHz mono PCM WAV."""
    try:
        with av.open(io.BytesIO(audio), mode="r") as container:
            audio_stream = next((stream for stream in container.streams if stream.type == "audio"), None)
            if audio_stream is None:
                raise ValueError("The uploaded file does not contain an audio stream.")

            resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
            pcm = bytearray()
            for frame in container.decode(audio_stream):
                for converted in resampler.resample(frame):
                    pcm.extend(bytes(converted.planes[0])[: converted.samples * 2])
            for converted in resampler.resample(None):
                pcm.extend(bytes(converted.planes[0])[: converted.samples * 2])
    except (FFmpegError, EOFError, ValueError) as error:
        raise HTTPException(status_code=415, detail=f"Could not decode the mobile audio recording: {error}") from error

    if not pcm:
        raise HTTPException(status_code=400, detail="The mobile audio recording contains no samples.")

    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(pcm)
    return output.getvalue()


def normalize_azure_result(payload: dict[str, Any], timing: dict[str, int]) -> dict[str, Any]:
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
            "word_score_list": words,
            "azure_scores": {
                "accuracy": assessment.get("AccuracyScore"),
                "fluency": assessment.get("FluencyScore"),
                "completeness": assessment.get("CompletenessScore"),
            },
        },
        "recognized_text": payload.get("DisplayText") or best.get("Display"),
        "_timing": timing,
        "_provider_response": payload,
    }


async def score_with_azure(*, text: str, audio_file: UploadFile) -> dict[str, Any]:
    key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_SPEECH_REGION")
    locale = os.getenv("AZURE_SPEECH_LOCALE", "en-US")
    if not key or not region:
        raise HTTPException(status_code=503, detail="Azure Speech is not configured.")

    backend_started = time.perf_counter()
    read_started = time.perf_counter()
    with sentry_sdk.start_span(op="file.read", name="Read pronunciation audio") as read_span:
        audio = await audio_file.read()
        read_span.set_data("audio.uploaded_bytes", len(audio))
    read_audio_ms = round((time.perf_counter() - read_started) * 1000)
    if not audio:
        raise HTTPException(status_code=400, detail="Audio file is empty.")
    uploaded_audio_bytes = len(audio)
    convert_audio_ms = 0
    if _is_mobile_audio(audio_file):
        convert_started = time.perf_counter()
        with sentry_sdk.start_span(op="audio.convert", name="Convert pronunciation audio") as convert_span:
            audio = convert_mobile_audio_to_wav(audio)
            convert_span.set_data("audio.converted_bytes", len(audio))
        convert_audio_ms = round((time.perf_counter() - convert_started) * 1000)
        content_type = "audio/wav; codecs=audio/pcm; samplerate=16000"
    else:
        content_type = _content_type(audio_file)

    config = {
        "ReferenceText": text,
        "GradingSystem": "HundredMark",
        "Granularity": "Phoneme",
        "Dimension": "Comprehensive",
        # Fillers, repetitions, and self-corrections are normal for beginners.
        # Completeness is still reported, but extra words must not reduce accuracy.
        "EnableMiscue": False,
        "PhonemeAlphabet": "IPA",
    }
    encoded_config = base64.b64encode(json.dumps(config).encode("utf-8")).decode("ascii")
    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
    started = time.perf_counter()
    try:
        with sentry_sdk.start_span(op="pronunciation.provider", name="Azure pronunciation assessment") as provider_span:
            response = await azure_client().post(
                url,
                params={"language": locale, "format": "detailed"},
                headers={
                    "Ocp-Apim-Subscription-Key": key,
                    "Pronunciation-Assessment": encoded_config,
                    "Content-Type": content_type,
                    "Accept": "application/json",
                },
                content=audio,
            )
            provider_span.set_data("http.response.status_code", response.status_code)
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
    return normalize_azure_result(payload, {
        "read_audio_ms": read_audio_ms,
        "convert_audio_ms": convert_audio_ms,
        "provider_ms": elapsed_ms,
        "backend_total_ms": round((time.perf_counter() - backend_started) * 1000),
        "uploaded_audio_bytes": uploaded_audio_bytes,
        "audio_bytes": len(audio),
    })


async def transcribe_with_azure(*, audio_file: UploadFile, locale: str = "es-MX") -> dict[str, Any]:
    """Transcribe short feedback audio without retaining the uploaded recording."""
    key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_SPEECH_REGION")
    if not key or not region:
        raise HTTPException(status_code=503, detail="Azure Speech is not configured.")

    audio = await audio_file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Audio file is empty.")
    if _is_mobile_audio(audio_file):
        audio = convert_mobile_audio_to_wav(audio)
        content_type = "audio/wav; codecs=audio/pcm; samplerate=16000"
    else:
        content_type = _content_type(audio_file)

    url = f"https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1"
    try:
        with sentry_sdk.start_span(op="feedback.transcription", name="Transcribe lesson feedback") as span:
            response = await azure_client().post(
                url,
                params={"language": locale, "format": "detailed", "profanity": "masked"},
                headers={
                    "Ocp-Apim-Subscription-Key": key,
                    "Content-Type": content_type,
                    "Accept": "application/json",
                },
                content=audio,
            )
            span.set_data("http.response.status_code", response.status_code)
            span.set_data("audio.bytes", len(audio))
    except httpx.RequestError as error:
        raise HTTPException(status_code=502, detail=f"Could not reach Azure Speech: {error}") from error

    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail="Azure Speech returned an invalid response.") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=payload)
    if payload.get("RecognitionStatus") not in {"Success", 0}:
        status = payload.get("RecognitionStatus", "Unknown")
        raise HTTPException(status_code=422, detail=f"Azure recognition failed: {status}")

    best = (payload.get("NBest") or [{}])[0]
    transcript = (payload.get("DisplayText") or best.get("Display") or best.get("Lexical") or "").strip()
    if not transcript:
        raise HTTPException(status_code=422, detail="No pudimos entender la grabación.")
    return {"transcript": transcript, "locale": locale}
