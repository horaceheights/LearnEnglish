import hashlib
import os
import re
from pathlib import Path
import asyncio
from array import array
from fractions import Fraction
from io import BytesIO
import math
import struct
import wave

import av
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
_ready_cue: bytes | None = None
AUDIO_PROFILE_VERSION = "a1-balanced-v1"
PROMPT_TARGET_WPM = 135
PRONUNCIATION_TARGET_WPM = 95
TARGET_RMS_DBFS = -24.0
NORMALIZATION_SAMPLE_RATE = 24_000


def ready_cue_wav() -> bytes:
    global _ready_cue
    if _ready_cue is not None:
        return _ready_cue

    sample_rate = 16_000
    duration_seconds = 0.18
    frame_count = int(sample_rate * duration_seconds)
    buffer = BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        frames = bytearray()
        for index in range(frame_count):
            time = index / sample_rate
            envelope = min(1.0, index / 160, (frame_count - index) / 320)
            sample = int(11_500 * envelope * math.sin(2 * math.pi * 880 * time))
            frames.extend(struct.pack("<h", sample))
        audio.writeframes(frames)
    _ready_cue = buffer.getvalue()
    return _ready_cue


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
        "question_voice": os.getenv("OPENAI_TTS_QUESTION_VOICE", "alloy"),
        "answer_voice": os.getenv("OPENAI_TTS_ANSWER_VOICE", os.getenv("OPENAI_TTS_VOICE", "coral")),
        "format": os.getenv("OPENAI_TTS_FORMAT", "mp3"),
        "audio_profile": AUDIO_PROFILE_VERSION,
        "prompt_target_wpm": PROMPT_TARGET_WPM,
        "pronunciation_target_wpm": PRONUNCIATION_TARGET_WPM,
        "target_rms_dbfs": TARGET_RMS_DBFS,
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
    if variant == "question":
        return (
            f"Speak in {language_hint} as a friendly classroom guide asking a beginner learner a short question. "
            "Use a clear, curious question intonation. Keep it natural and concise."
        )
    if variant == "answer":
        return (
            f"Speak in {language_hint} as a warm A1 English teacher confirming the answer. "
            "Say the full sentence clearly and a little slowly so the learner can repeat it."
        )
    return (
        f"Speak in {language_hint} as a friendly A1 English teacher. Use a warm, clear, natural voice. "
        "Use an even, unhurried pace and consistent volume. Never rush longer sentences. "
        "Make short beginner phrases easy to understand."
    )


def _decoded_mono_samples(audio_bytes: bytes) -> array:
    samples = array("h")
    with av.open(BytesIO(audio_bytes), mode="r") as container:
        audio_stream = next((stream for stream in container.streams if stream.type == "audio"), None)
        if audio_stream is None:
            raise ValueError("Generated course audio contains no audio stream.")
        resampler = av.AudioResampler(format="s16", layout="mono", rate=NORMALIZATION_SAMPLE_RATE)
        for frame in container.decode(audio_stream):
            for converted in resampler.resample(frame):
                samples.extend(array("h", bytes(converted.planes[0])[: converted.samples * 2]))
        for converted in resampler.resample(None):
            samples.extend(array("h", bytes(converted.planes[0])[: converted.samples * 2]))
    return samples


def _active_sample_bounds(samples: array) -> tuple[int, int]:
    window = max(1, NORMALIZATION_SAMPLE_RATE // 50)
    threshold = 32767 * (10 ** (-38 / 20))
    active_windows = []
    for start in range(0, len(samples), window):
        block = samples[start:start + window]
        if block and max(abs(value) for value in block) >= threshold:
            active_windows.append(start // window)
    if not active_windows:
        return 0, len(samples)
    start = active_windows[0] * window
    end = min(len(samples), (active_windows[-1] + 1) * window)
    return start, end


def _tempo_adjust(samples: array, factor: float) -> array:
    graph = av.filter.Graph()
    source = graph.add_abuffer(
        sample_rate=NORMALIZATION_SAMPLE_RATE,
        format="s16",
        layout="mono",
        time_base=Fraction(1, NORMALIZATION_SAMPLE_RATE),
    )
    tempo = graph.add("atempo", args=f"{factor:.6f}")
    sink = graph.add("abuffersink")
    graph.link_nodes(source, tempo, sink)
    graph.configure()

    output = array("h")
    pts = 0
    for start in range(0, len(samples), 1024):
        block = samples[start:start + 1024]
        frame = av.AudioFrame(format="s16", layout="mono", samples=len(block))
        frame.sample_rate = NORMALIZATION_SAMPLE_RATE
        frame.time_base = Fraction(1, NORMALIZATION_SAMPLE_RATE)
        frame.pts = pts
        frame.planes[0].update(block.tobytes())
        pts += len(block)
        source.push(frame)
        while True:
            try:
                filtered = sink.pull()
            except (av.error.BlockingIOError, av.error.EOFError):
                break
            output.extend(array("h", bytes(filtered.planes[0])[: filtered.samples * 2]))

    source.push(None)
    while True:
        try:
            filtered = sink.pull()
        except (av.error.BlockingIOError, av.error.EOFError):
            break
        output.extend(array("h", bytes(filtered.planes[0])[: filtered.samples * 2]))
    return output


def _normalize_volume(samples: array) -> array:
    if not samples:
        return samples
    active_start, active_end = _active_sample_bounds(samples)
    active = samples[active_start:active_end]
    rms = math.sqrt(sum(value * value for value in active) / max(len(active), 1))
    if rms <= 0:
        return samples
    target_rms = 32767 * (10 ** (TARGET_RMS_DBFS / 20))
    peak = max(abs(value) for value in active)
    peak_limit = 32767 * (10 ** (-2 / 20))
    gain = min(target_rms / rms, peak_limit / max(peak, 1))
    return array("h", (max(-32768, min(32767, round(value * gain))) for value in samples))


def _encode_mp3(samples: array) -> bytes:
    output = BytesIO()
    with av.open(output, mode="w", format="mp3") as container:
        stream = container.add_stream("libmp3lame", rate=NORMALIZATION_SAMPLE_RATE)
        stream.layout = "mono"
        stream.bit_rate = 96_000
        pts = 0
        for start in range(0, len(samples), 1024):
            block = samples[start:start + 1024]
            frame = av.AudioFrame(format="s16", layout="mono", samples=len(block))
            frame.sample_rate = NORMALIZATION_SAMPLE_RATE
            frame.time_base = Fraction(1, NORMALIZATION_SAMPLE_RATE)
            frame.pts = pts
            frame.planes[0].update(block.tobytes())
            pts += len(block)
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode(None):
            container.mux(packet)
    return output.getvalue()


def normalize_course_audio(audio_bytes: bytes, text: str, mode: str, output_format: str) -> bytes:
    if output_format != "mp3":
        return audio_bytes
    samples = _decoded_mono_samples(audio_bytes)
    if not samples:
        return audio_bytes
    speech_start, speech_end = _active_sample_bounds(samples)
    safety_padding = round(NORMALIZATION_SAMPLE_RATE * 0.12)
    trim_start = max(0, speech_start - safety_padding)
    trim_end = min(len(samples), speech_end + safety_padding)
    active = samples[trim_start:trim_end]
    word_count = len(re.findall(r"[A-Za-z']+", text))
    active_seconds = (speech_end - speech_start) / NORMALIZATION_SAMPLE_RATE
    current_wpm = word_count * 60 / active_seconds if word_count and active_seconds else 0
    target_wpm = PRONUNCIATION_TARGET_WPM if mode.startswith("pronunciation") else PROMPT_TARGET_WPM
    tempo_factor = max(0.5, min(2.0, target_wpm / current_wpm)) if current_wpm else 1.0
    adjusted = _tempo_adjust(active, tempo_factor)
    normalized = _normalize_volume(adjusted)
    leading_silence = array("h", [0]) * round(NORMALIZATION_SAMPLE_RATE * 0.18)
    trailing_silence = array("h", [0]) * round(NORMALIZATION_SAMPLE_RATE * 0.28)
    return _encode_mp3(leading_silence + normalized + trailing_silence)


def voice_for_variant(variant: str) -> str:
    if variant == "question":
        return os.getenv("OPENAI_TTS_QUESTION_VOICE", "alloy")
    if variant == "answer":
        return os.getenv("OPENAI_TTS_ANSWER_VOICE", os.getenv("OPENAI_TTS_VOICE", "coral"))
    return os.getenv("OPENAI_TTS_VOICE", "coral")


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
    voice = voice_for_variant(variant)
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

        audio_bytes = response.content
        try:
            audio_bytes = normalize_course_audio(audio_bytes, cleaned_text, mode, output_format)
        except (ValueError, av.FFmpegError):
            # A generated take is still usable if optional normalization cannot decode it.
            pass
        audio_path.write_bytes(audio_bytes)
    return FileResponse(audio_path, media_type=media_type, filename=audio_path.name)
