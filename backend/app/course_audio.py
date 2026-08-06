import hashlib
import os
import re
from pathlib import Path
import asyncio
from array import array
from fractions import Fraction
from io import BytesIO
import math
import statistics
import struct
import wave
from xml.sax.saxutils import escape as xml_escape

import av
import httpx
from fastapi import HTTPException
from fastapi.responses import FileResponse


ROOT_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT_DIR / "storage" / "audio-cache"
OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech"
ELEVENLABS_SPEECH_URL = "https://api.elevenlabs.io/v1/text-to-speech"
SUPPORTED_FORMATS = {
    "mp3": "audio/mpeg",
    "opus": "audio/ogg",
    "aac": "audio/aac",
    "flac": "audio/flac",
    "wav": "audio/wav",
}
_generation_locks: dict[str, asyncio.Lock] = {}
_ready_cue: bytes | None = None
AUDIO_PROFILE_VERSION = "a1-elevenlabs-cast-v11"
DEFAULT_ELEVENLABS_BUILTIN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
# Nichalia Schwartz is a professional American teacher/e-learning voice from
# the ElevenLabs Voice Library. Paid plans can use Voice Library voices by ID.
DEFAULT_ELEVENLABS_PREMIUM_VOICE_ID = "XfNU2rGpBa01ckF309OY"
ELEVENLABS_PREMIUM_CAST = {
    # Professional teacher/e-learning voice already approved in lesson 1.3.
    "female-teacher": DEFAULT_ELEVENLABS_PREMIUM_VOICE_ID,
    # Natural default voices available to paid API accounts.
    "female-warm": "EXAVITQu4vr4xnSDxMaL",  # Sarah
    "male-warm": "nPczCjzI2devNBz1zQrb",  # Brian
    "male-conversational": "TX3LPaxmHKxFdv7VOQHJ",  # Liam
}
PROMPT_TARGET_SPM = 150
SHORT_VOCAB_TARGET_SPM = 120
PRONUNCIATION_TARGET_SPM = 125
TARGET_RMS_DBFS = -22.5
TARGET_MEDIAN_PITCH_HZ = 190.0
NORMALIZATION_SAMPLE_RATE = 24_000
MAX_TEMPO_SLOWDOWN = 0.55
MAX_TEMPO_SPEEDUP = 1.60
MAX_PITCH_SHIFT = 1.12

# The first course deliberately uses a small vocabulary. Keeping its irregular
# syllable counts explicit makes pacing deterministic instead of treating
# "woman" and "boy" as if they took the same teaching time.
COURSE_SYLLABLES = {
    "a": 1,
    "adult": 2,
    "adults": 2,
    "an": 1,
    "and": 1,
    "are": 1,
    "babies": 2,
    "baby": 2,
    "bike": 1,
    "boy": 1,
    "bridge": 1,
    "brother": 2,
    "brothers": 2,
    "building": 2,
    "bus": 1,
    "car": 1,
    "child": 1,
    "children": 2,
    "choose": 1,
    "cooking": 2,
    "eating": 2,
    "family": 3,
    "father": 2,
    "girl": 1,
    "grandfather": 3,
    "grandmother": 3,
    "grandparents": 3,
    "he": 1,
    "house": 1,
    "is": 1,
    "it": 1,
    "listen": 2,
    "man": 1,
    "mother": 2,
    "not": 1,
    "parents": 2,
    "park": 1,
    "playing": 2,
    "reading": 2,
    "running": 2,
    "school": 1,
    "she": 1,
    "sister": 2,
    "sisters": 2,
    "sitting": 2,
    "sleeping": 2,
    "standing": 2,
    "store": 1,
    "street": 1,
    "studying": 3,
    "swimming": 2,
    "talking": 2,
    "the": 1,
    "they": 1,
    "walking": 2,
    "what": 1,
    "woman": 2,
    "working": 2,
    "writing": 2,
}

ING_PRONUNCIATION_NOTES = {
    "building": "'building' /ˈbɪl.dɪŋ/",
    "cooking": "'cooking' /ˈkʊk.ɪŋ/",
    "eating": "'eating' /ˈiː.tɪŋ/",
    "playing": "'playing' /ˈpleɪ.ɪŋ/",
    "reading": "'reading' /ˈriː.dɪŋ/",
    "running": "'running' /ˈrʌn.ɪŋ/",
    "sitting": "'sitting' /ˈsɪt.ɪŋ/",
    "sleeping": "'sleeping' /ˈsliː.pɪŋ/",
    "standing": "'standing' /ˈstæn.dɪŋ/",
    "studying": "'studying' /ˈstʌd.i.ɪŋ/",
    "swimming": "'swimming' /ˈswɪm.ɪŋ/",
    "talking": "'talking' /ˈtɔk.ɪŋ/",
    "walking": "'walking' /ˈwɔk.ɪŋ/",
    "working": "'working' /ˈwɝ.kɪŋ/",
    "writing": "'writing' /ˈraɪ.tɪŋ/",
}


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


def elevenlabs_api_key() -> str:
    return (os.getenv("ELEVENLABS_API_KEY") or "").strip()


def azure_speech_key() -> str:
    return (os.getenv("AZURE_SPEECH_KEY") or "").strip()


def audio_configured() -> bool:
    return bool(openai_api_key())


def audio_debug() -> dict[str, object]:
    teacher_voice = os.getenv("OPENAI_TTS_VOICE", "coral")
    return {
        "openai_audio_configured": audio_configured(),
        "elevenlabs_audio_configured": bool(elevenlabs_api_key()),
        "elevenlabs_model": os.getenv("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2"),
        "elevenlabs_voice_id": os.getenv(
            "ELEVENLABS_BUILTIN_VOICE_ID", DEFAULT_ELEVENLABS_BUILTIN_VOICE_ID
        ),
        "elevenlabs_voice_type": "built-in",
        "elevenlabs_premium_model": os.getenv(
            "ELEVENLABS_PREMIUM_MODEL", "eleven_multilingual_v2"
        ),
        "elevenlabs_premium_voice_id": os.getenv(
            "ELEVENLABS_PREMIUM_VOICE_ID", DEFAULT_ELEVENLABS_PREMIUM_VOICE_ID
        ),
        "elevenlabs_premium_voice_type": "voice-library-professional",
        "elevenlabs_premium_cast": {
            narrator: premium_voice_for_narrator(narrator)
            for narrator in ELEVENLABS_PREMIUM_CAST
        },
        "azure_audio_configured": bool(
            azure_speech_key() and (os.getenv("AZURE_SPEECH_REGION") or "").strip()
        ),
        "azure_voice": os.getenv("AZURE_TTS_VOICE", "en-US-JennyNeural"),
        "model": os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
        "voice": teacher_voice,
        "question_voice": teacher_voice,
        "answer_voice": teacher_voice,
        "format": os.getenv("OPENAI_TTS_FORMAT", "mp3"),
        "audio_profile": AUDIO_PROFILE_VERSION,
        "prompt_target_spm": PROMPT_TARGET_SPM,
        "short_vocab_target_spm": SHORT_VOCAB_TARGET_SPM,
        "pronunciation_target_spm": PRONUNCIATION_TARGET_SPM,
        "target_rms_dbfs": TARGET_RMS_DBFS,
        "target_median_pitch_hz": TARGET_MEDIAN_PITCH_HZ,
        "tempo_correction_range": [MAX_TEMPO_SLOWDOWN, MAX_TEMPO_SPEEDUP],
        "cache_dir": str(CACHE_DIR),
    }


def syllable_count(text: str) -> int:
    total = 0
    for match in re.finditer(r"[A-Za-z']+", text.lower()):
        word = match.group(0).strip("'")
        if not word:
            continue
        if word in COURSE_SYLLABLES:
            total += COURSE_SYLLABLES[word]
            continue
        groups = re.findall(r"[aeiouy]+", word)
        count = len(groups)
        if word.endswith("e") and not word.endswith(("le", "ye")) and count > 1:
            count -= 1
        total += max(1, count)
    return total


def target_syllables_per_minute(text: str, mode: str, variant: str) -> int:
    syllables = syllable_count(text)
    word_count = len(re.findall(r"[A-Za-z']+", text))
    if mode.startswith("pronunciation"):
        return PRONUNCIATION_TARGET_SPM
    if word_count <= 2:
        return SHORT_VOCAB_TARGET_SPM
    if variant == "answer":
        return 145
    return PROMPT_TARGET_SPM


def target_active_seconds(text: str, mode: str, variant: str) -> float:
    syllables = syllable_count(text)
    pace = target_syllables_per_minute(text, mode, variant)
    return syllables * 60 / pace if syllables and pace else 0


def pronunciation_notes(text: str) -> str:
    lowered = text.lower()
    notes: list[str] = []
    if re.search(r"\bthe\b", lowered):
        notes.append(
            "Make the voiced TH in 'the' clearly audible as /ðə/ before a consonant; give it enough time "
            "to imitate, while keeping the main stress on the following noun."
        )
    if re.search(r"\bboy\b", lowered):
        notes.append("Pronounce 'boy' as /bɔɪ/, one natural diphthong; never turn it into a prolonged 'booooy'.")
    if re.search(r"\bgirl\b", lowered):
        notes.append(
            "Pronounce American English 'girl' as one careful syllable /ɡɝl/; make the R-colored vowel and "
            "final L distinct without rushing it."
        )
    if re.search(r"\bman\b", lowered):
        notes.append("Pronounce 'man' as /mæn/ with a clear short-A vowel; do not reduce the vowel.")
    if re.search(r"\bwoman\b", lowered):
        notes.append("Pronounce 'woman' as two even syllables /ˈwʊm.ən/.")
    ing_words = [word for word in ING_PRONUNCIATION_NOTES if re.search(rf"\b{word}\b", lowered)]
    if ing_words:
        models = ", ".join(ING_PRONUNCIATION_NOTES[word] for word in ing_words)
        notes.append(
            f"Use this pronunciation model: {models}. Give every syllable its proper time, but keep the final "
            "/ŋ/ brief and natural. Do not rush the final verb, pause inside the word, hold the nasal, or add a "
            "hard G sound."
        )
    return " ".join(notes)


def audio_instructions(text: str, mode: str, lang: str, variant: str) -> str:
    language_hint = "Spanish" if lang.lower().startswith("es") else "English"
    pace = target_syllables_per_minute(text, mode, variant)
    target_seconds = target_active_seconds(text, mode, variant)
    word_notes = pronunciation_notes(text)
    voice_reference = (
        "Always use the same teacher persona and sound like every clip was recorded in one studio session: "
        "a calm adult female teacher with a warm but neutral tone, steady medium pitch, and restrained pitch "
        "movement. Keep the delivery near the pitch and clarity of a careful reading of 'The girl is writing.' "
        "Avoid sounding unusually bright, deep, breathy, theatrical, excited, sing-song, or conversational. "
    )
    shared = (
        voice_reference +
        f"The spoken words themselves should last about {target_seconds:.1f} seconds, excluding silence. "
        "Use careful General American pronunciation with correct vowels and consonants. Keep the same measured "
        "syllable pace from the beginning through the final word; never accelerate the predicate or an -ing "
        "ending. Keep vocal level, microphone distance, and pitch range consistent. Use natural word stress and "
        "a gentle falling pitch for a statement. Do not unnaturally elongate stressed vowels."
    )
    if mode == "pronunciation_slow":
        return (
            f"Speak in {language_hint} as a warm A1 pronunciation teacher. Model the exact phrase slowly and "
            f"clearly at about {pace} spoken syllables per minute. Leave a small natural space between words, "
            f"but never split a word unnaturally. {shared} {word_notes}"
        )
    if mode == "pronunciation_repeat":
        return (
            f"Speak in {language_hint} as a warm A1 English teacher. Repeat the phrase clearly at a medium-slow "
            f"pace near {pace} spoken syllables per minute. Keep every word distinct. {shared} {word_notes}"
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
            f"{voice_reference}Use only a slight, controlled rise at the end for question intonation. Keep it "
            "natural and concise."
        )
    if variant == "answer":
        return (
            f"Speak in {language_hint} as a warm A1 English teacher confirming the answer. "
            f"Say the full sentence clearly at about {target_syllables_per_minute('a sentence', mode, variant)} "
            f"spoken syllables per minute so the learner can repeat it. {shared} {word_notes}"
        )
    return (
        f"Speak in {language_hint} as a friendly A1 English teacher. Use a warm, clear, natural voice. "
        f"Use an even teaching pace of about {PROMPT_TARGET_SPM} spoken syllables per minute, or about "
        f"{SHORT_VOCAB_TARGET_SPM} for a short vocabulary label. {shared} Make short beginner phrases "
        f"easy to imitate. {word_notes}"
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


def _median_fundamental_hz(samples: array) -> float:
    """Estimate the voiced median pitch cheaply for short generated clips."""
    frame_size = NORMALIZATION_SAMPLE_RATE // 25
    hop_size = frame_size // 2
    downsample = 4
    reduced_rate = NORMALIZATION_SAMPLE_RATE // downsample
    minimum_lag = reduced_rate // 300
    maximum_lag = reduced_rate // 75
    gate_rms = 32767 * (10 ** (-35 / 20))
    pitches: list[float] = []

    for start in range(0, max(0, len(samples) - frame_size), hop_size):
        frame = samples[start:start + frame_size]
        rms = math.sqrt(sum(value * value for value in frame) / len(frame))
        if rms < gate_rms:
            continue
        reduced = [float(value) for value in frame[::downsample]]
        mean = sum(reduced) / len(reduced)
        reduced = [value - mean for value in reduced]
        best_lag = 0
        best_correlation = 0.0
        for lag in range(minimum_lag, maximum_lag + 1):
            left = reduced[:-lag]
            right = reduced[lag:]
            left_energy = sum(value * value for value in left)
            right_energy = sum(value * value for value in right)
            if not left_energy or not right_energy:
                continue
            correlation = sum(a * b for a, b in zip(left, right)) / math.sqrt(left_energy * right_energy)
            if correlation > best_correlation:
                best_correlation = correlation
                best_lag = lag
        if best_lag and best_correlation >= 0.3:
            pitches.append(reduced_rate / best_lag)

    return statistics.median(pitches) if pitches else 0.0


def _normalize_pitch(samples: array) -> array:
    current_pitch = _median_fundamental_hz(samples)
    if not current_pitch:
        return samples
    factor = max(1 / MAX_PITCH_SHIFT, min(MAX_PITCH_SHIFT, TARGET_MEDIAN_PITCH_HZ / current_pitch))
    if abs(1 - factor) < 0.01:
        return samples

    graph = av.filter.Graph()
    source = graph.add_abuffer(
        sample_rate=NORMALIZATION_SAMPLE_RATE,
        format="s16",
        layout="mono",
        time_base=Fraction(1, NORMALIZATION_SAMPLE_RATE),
    )
    pitched_rate = round(NORMALIZATION_SAMPLE_RATE * factor)
    rate = graph.add("asetrate", args=str(pitched_rate))
    resample = graph.add("aresample", args=str(NORMALIZATION_SAMPLE_RATE))
    restore_duration = graph.add("atempo", args=f"{1 / factor:.6f}")
    sink = graph.add("abuffersink")
    graph.link_nodes(source, rate, resample, restore_duration, sink)
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
    return output or samples


def _normalize_volume(samples: array) -> array:
    if not samples:
        return samples
    active_start, active_end = _active_sample_bounds(samples)
    active = samples[active_start:active_end]
    block_size = max(1, NORMALIZATION_SAMPLE_RATE // 50)
    gate_rms = 32767 * (10 ** (-38 / 20))
    voiced_sum_squares = 0
    voiced_sample_count = 0
    for start in range(0, len(active), block_size):
        block = active[start:start + block_size]
        if not block:
            continue
        block_sum_squares = sum(value * value for value in block)
        block_rms = math.sqrt(block_sum_squares / len(block))
        if block_rms >= gate_rms:
            voiced_sum_squares += block_sum_squares
            voiced_sample_count += len(block)
    rms = math.sqrt(voiced_sum_squares / voiced_sample_count) if voiced_sample_count else 0
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


def normalize_course_audio(
    audio_bytes: bytes,
    text: str,
    mode: str,
    variant: str,
    output_format: str,
    preserve_voice_pitch: bool = False,
    preserve_natural_timing: bool = False,
) -> bytes:
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
    syllables = syllable_count(text)
    active_seconds = (speech_end - speech_start) / NORMALIZATION_SAMPLE_RATE
    current_spm = syllables * 60 / active_seconds if syllables and active_seconds else 0
    target_spm = target_syllables_per_minute(text, mode, variant)
    tempo_factor = (
        max(MAX_TEMPO_SLOWDOWN, min(MAX_TEMPO_SPEEDUP, target_spm / current_spm))
        if current_spm
        else 1.0
    )
    adjusted = active if preserve_natural_timing else _tempo_adjust(active, tempo_factor)
    voiced_audio = adjusted if preserve_voice_pitch else _normalize_pitch(adjusted)
    normalized = _normalize_volume(voiced_audio)
    leading_silence = array("h", [0]) * round(NORMALIZATION_SAMPLE_RATE * 0.18)
    trailing_silence = array("h", [0]) * round(NORMALIZATION_SAMPLE_RATE * 0.28)
    return _encode_mp3(leading_silence + normalized + trailing_silence)


def voice_for_variant(variant: str) -> str:
    # One recognizable teacher voice across prompts, questions, answers, and
    # pronunciation practice is more important than variant-specific voices.
    return os.getenv("OPENAI_TTS_VOICE", "coral")


def cache_path_for(text: str, mode: str, lang: str, variant: str, model: str, voice: str, output_format: str) -> Path:
    key = "\n".join([AUDIO_PROFILE_VERSION, text, mode, lang, variant, model, voice, output_format])
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.{output_format}"


def audio_file_response(audio_path: Path, media_type: str, provider: str) -> FileResponse:
    return FileResponse(
        audio_path,
        media_type=media_type,
        filename=audio_path.name,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Audio-Profile": AUDIO_PROFILE_VERSION,
            "X-Audio-Provider": provider,
        },
    )


def normalized_provider(provider: str) -> str:
    requested = provider.strip().lower()
    if requested not in {"openai", "elevenlabs", "elevenlabs-premium", "azure"}:
        raise HTTPException(status_code=400, detail="Unsupported course audio provider.")
    return requested


def premium_voice_for_narrator(narrator: str) -> str:
    requested = narrator.strip().lower()
    if requested not in ELEVENLABS_PREMIUM_CAST:
        raise HTTPException(status_code=400, detail="Unsupported course narrator.")
    default_voice = ELEVENLABS_PREMIUM_CAST[requested]
    if requested == "female-teacher":
        default_voice = os.getenv("ELEVENLABS_PREMIUM_VOICE_ID", default_voice)
    environment_name = f"ELEVENLABS_VOICE_{requested.upper().replace('-', '_')}_ID"
    return os.getenv(environment_name, default_voice)


async def _generate_openai_audio(
    client: httpx.AsyncClient,
    text: str,
    mode: str,
    lang: str,
    variant: str,
    model: str,
    voice: str,
    output_format: str,
) -> bytes:
    api_key = openai_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="OpenAI course audio is not configured.")
    payload = {
        "model": model,
        "voice": voice,
        "input": text,
        "instructions": audio_instructions(text, mode, lang, variant),
        "response_format": output_format,
    }
    response = await client.post(
        OPENAI_SPEECH_URL,
        json=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    if response.status_code >= 400:
        detail = response.text[:500] if response.text else "OpenAI audio request failed."
        raise HTTPException(status_code=502, detail=detail)
    return response.content


async def _generate_elevenlabs_audio(
    client: httpx.AsyncClient,
    text: str,
    model: str,
    voice: str,
    premium: bool = False,
    mode: str = "prompt",
) -> bytes:
    api_key = elevenlabs_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="ElevenLabs course audio is not configured.")
    voice_settings = {
        "stability": 0.55 if premium else 0.85,
        "similarity_boost": 0.80 if premium else 0.78,
        "style": 0.0,
        "use_speaker_boost": True,
        # Let ElevenLabs produce the slower delivery natively. Stretching an
        # already-generated word can create artifacts such as "sis-steeer".
        "speed": 0.86 if premium and mode == "pronunciation_slow" else 0.92 if premium else 1.0,
    }
    response = await client.post(
        f"{ELEVENLABS_SPEECH_URL}/{voice}",
        params={"output_format": "mp3_44100_128"},
        json={
            "text": text,
            "model_id": model,
            "seed": 1101,
            "voice_settings": voice_settings,
        },
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    if response.status_code >= 400:
        provider_message = ""
        try:
            error_payload = response.json()
            error_detail = error_payload.get("detail", {}) if isinstance(error_payload, dict) else {}
            if isinstance(error_detail, dict):
                provider_message = str(error_detail.get("message") or error_detail.get("status") or "")
        except ValueError:
            pass
        safe_message = re.sub(r"[^A-Za-z0-9 .,:'_()-]", "", provider_message)[:160]
        suffix = f" {safe_message}" if safe_message else ""
        raise HTTPException(
            status_code=502,
            detail=f"ElevenLabs audio request failed with status {response.status_code}.{suffix}",
        )
    return response.content


async def _generate_azure_audio(
    client: httpx.AsyncClient,
    text: str,
    lang: str,
    voice: str,
) -> bytes:
    api_key = azure_speech_key()
    region = (os.getenv("AZURE_SPEECH_REGION") or "").strip()
    if not api_key or not region:
        raise HTTPException(status_code=503, detail="Azure course audio is not configured.")

    safe_locale = lang if re.fullmatch(r"[A-Za-z]{2,3}-[A-Za-z]{2,4}", lang) else "en-US"
    safe_voice = voice if re.fullmatch(r"[A-Za-z0-9:.-]+", voice) else "en-US-JennyNeural"
    ssml = (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        f'xml:lang="{safe_locale}"><voice name="{safe_voice}">'
        f'<prosody rate="-5%" pitch="+0%" volume="+0%">{xml_escape(text)}</prosody>'
        "</voice></speak>"
    )
    response = await client.post(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        content=ssml.encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": api_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
            "User-Agent": "SpanGlish",
            "Accept": "audio/mpeg",
        },
    )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Azure audio request failed with status {response.status_code}.",
        )
    return response.content


async def _provider_audio(
    text: str,
    mode: str,
    lang: str,
    variant: str,
    provider: str,
    narrator: str,
) -> FileResponse:
    if provider == "elevenlabs-premium":
        model = os.getenv("ELEVENLABS_PREMIUM_MODEL", "eleven_multilingual_v2")
        voice = premium_voice_for_narrator(narrator)
        output_format = "mp3"
    elif provider == "elevenlabs":
        model = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2")
        voice = os.getenv(
            "ELEVENLABS_BUILTIN_VOICE_ID", DEFAULT_ELEVENLABS_BUILTIN_VOICE_ID
        )
        output_format = "mp3"
    elif provider == "azure":
        model = "azure-neural"
        voice = os.getenv("AZURE_TTS_VOICE", "en-US-JennyNeural")
        output_format = "mp3"
    else:
        model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
        voice = voice_for_variant(variant)
        output_format = os.getenv("OPENAI_TTS_FORMAT", "mp3").lower()

    media_type = SUPPORTED_FORMATS.get(output_format)
    if not media_type:
        raise HTTPException(status_code=500, detail=f"Unsupported course audio format: {output_format}")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_model = f"{provider}:{model}"
    audio_path = cache_path_for(text, mode, lang, variant, cache_model, voice, output_format)
    if audio_path.exists() and audio_path.stat().st_size > 0:
        return audio_file_response(audio_path, media_type, provider)

    lock = _generation_locks.setdefault(audio_path.name, asyncio.Lock())
    async with lock:
        if audio_path.exists() and audio_path.stat().st_size > 0:
            return audio_file_response(audio_path, media_type, provider)
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                if provider in {"elevenlabs", "elevenlabs-premium"}:
                    audio_bytes = await _generate_elevenlabs_audio(
                        client,
                        text,
                        model,
                        voice,
                        premium=provider == "elevenlabs-premium",
                        mode=mode,
                    )
                elif provider == "azure":
                    audio_bytes = await _generate_azure_audio(client, text, lang, voice)
                else:
                    audio_bytes = await _generate_openai_audio(
                        client, text, mode, lang, variant, model, voice, output_format
                    )
        except httpx.HTTPError as error:
            raise HTTPException(status_code=502, detail=f"Could not reach {provider} audio service.") from error

        try:
            audio_bytes = normalize_course_audio(
                audio_bytes,
                text,
                mode,
                variant,
                output_format,
                preserve_voice_pitch=provider == "elevenlabs-premium",
                preserve_natural_timing=provider == "elevenlabs-premium",
            )
        except (ValueError, av.FFmpegError):
            # A generated take is still usable if optional normalization cannot decode it.
            pass
        audio_path.write_bytes(audio_bytes)
    return audio_file_response(audio_path, media_type, provider)


async def get_course_audio(
    text: str,
    mode: str,
    lang: str,
    variant: str,
    provider: str = "openai",
    narrator: str = "female-teacher",
) -> FileResponse:
    cleaned_text = text.strip()
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Text is required.")

    if len(cleaned_text) > 500:
        raise HTTPException(status_code=400, detail="Text is too long for course audio.")

    requested_provider = normalized_provider(provider)
    if requested_provider == "elevenlabs-premium":
        # Validate before entering provider fallback so a programming error does
        # not silently replace a requested cast member with an unrelated voice.
        premium_voice_for_narrator(narrator)
    try:
        return await _provider_audio(
            cleaned_text, mode, lang, variant, requested_provider, narrator
        )
    except HTTPException as provider_error:
        if requested_provider == "openai":
            raise
        # A provider experiment must never interrupt a lesson. The fallback has
        # a separate OpenAI cache, so the requested provider is retried later.
        fallback = await _provider_audio(
            cleaned_text, mode, lang, variant, "openai", narrator
        )
        fallback.headers["X-Audio-Fallback-From"] = requested_provider
        fallback.headers["X-Audio-Fallback-Reason"] = str(provider_error.detail)[:120]
        return fallback
