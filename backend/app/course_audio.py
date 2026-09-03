import hashlib
import os
import re
from pathlib import Path
import asyncio
from array import array
from dataclasses import dataclass
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
from fastapi.responses import FileResponse, Response


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
_silent_completion_audio: bytes | None = None
AUDIO_PROFILE_VERSION = "a1-elevenlabs-cast-v14"
COMPLETION_PROMPT_AUDIO_PROFILE_VERSION = "visible-fragments-provider-fallback-v4"
COMPLETION_ENDING_ARTICLE_MODEL = "eleven_flash_v2"
COMPLETION_ENDING_ARTICLE_MARKUP = (
    '<phoneme alphabet="cmu-arpabet" ph="EY1">a</phoneme>'
)
COMPLETION_PLACEHOLDER_PATTERN = re.compile(
    r"(?:_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\])",
    flags=re.IGNORECASE,
)
COMPLETION_PLACEHOLDER_SILENCE_SECONDS = 0.55
COMPLETION_TRAILING_SILENCE_SECONDS = 0.28
COMPLETION_FRAGMENT_PADDING_SECONDS = 0.08
COMPLETION_GENERATION_ATTEMPTS = 2
DEFAULT_ELEVENLABS_BUILTIN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
# Nichalia Schwartz is a professional American teacher/e-learning voice from
# the ElevenLabs Voice Library. Paid plans can use Voice Library voices by ID.
DEFAULT_ELEVENLABS_PREMIUM_VOICE_ID = "XfNU2rGpBa01ckF309OY"
ELEVENLABS_PREMIUM_CAST = {
    # Professional teacher/e-learning voice already approved in lesson 1.3.
    "female-teacher": DEFAULT_ELEVENLABS_PREMIUM_VOICE_ID,
    # Natural default voices available to paid API accounts.
    "female-warm": "EXAVITQu4vr4xnSDxMaL",  # Sarah
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
ELEVENLABS_PREMIUM_PROMPT_SPEED = 0.70
ELEVENLABS_PREMIUM_PRONUNCIATION_SPEED = 0.70


@dataclass(frozen=True)
class CompletionPromptContract:
    prefix: str
    blank_text: str
    suffix: str
    answer_start: int
    answer_end: int
    ending_blank: bool


@dataclass(frozen=True)
class CompletionSequenceContract:
    visible_parts: tuple[str, ...]
    blank_texts: tuple[str, ...]

# The first course deliberately uses a small vocabulary. Keeping its irregular
# syllable counts explicit makes pacing deterministic instead of treating
# "woman" and "boy" as if they took the same teaching time.
COURSE_SYLLABLES = {
    "a": 1,
    "adult": 2,
    "adults": 2,
    "actions": 2,
    "an": 1,
    "and": 1,
    "are": 1,
    "babies": 2,
    "baby": 2,
    "bag": 1,
    "bags": 1,
    "bike": 1,
    "black": 1,
    "blue": 1,
    "book": 1,
    "books": 1,
    "boy": 1,
    "bridge": 1,
    "brother": 2,
    "brothers": 2,
    "building": 2,
    "bus": 1,
    "car": 1,
    "cars": 1,
    "chair": 1,
    "child": 1,
    "children": 2,
    "choose": 1,
    "color": 2,
    "cooking": 2,
    "drinking": 2,
    "eating": 2,
    "eight": 1,
    "fa": 1,
    "family": 3,
    "father": 2,
    "five": 1,
    "find": 1,
    "four": 1,
    "girl": 1,
    "grandfather": 3,
    "grandmother": 3,
    "grandparents": 3,
    "green": 1,
    "he": 1,
    "hospital": 3,
    "house": 1,
    "is": 1,
    "it": 1,
    "listen": 2,
    "man": 1,
    "meet": 1,
    "mother": 2,
    "mo": 1,
    "nine": 1,
    "not": 1,
    "number": 2,
    "one": 1,
    "parents": 2,
    "park": 1,
    "pen": 1,
    "pens": 1,
    "phone": 1,
    "phones": 1,
    "phrase": 1,
    "playing": 2,
    "people": 2,
    "reading": 2,
    "red": 1,
    "restaurant": 3,
    "running": 2,
    "school": 1,
    "sentence": 2,
    "she": 1,
    "seven": 2,
    "sister": 2,
    "sisters": 2,
    "six": 1,
    "sitting": 2,
    "sleeping": 2,
    "standing": 2,
    "store": 1,
    "street": 1,
    "studying": 3,
    "swimming": 2,
    "talking": 2,
    "table": 2,
    "ten": 1,
    "that": 1,
    "the": 1,
    "ther": 1,
    "they": 1,
    "this": 1,
    "three": 1,
    "two": 1,
    "walking": 2,
    "what": 1,
    "white": 1,
    "who": 1,
    "woman": 2,
    "working": 2,
    "writing": 2,
    "yellow": 2,
}

# Units 2-7 expand the spoken A1 inventory. These counts were checked against
# the CMU Pronouncing Dictionary and reviewed for the course's names and café
# label so pacing remains deterministic for every canonical lesson prompt.
COURSE_SYLLABLES.update({
    "afternoon": 3,
    "am": 1,
    "american": 4,
    "ana": 2,
    "apple": 2,
    "apples": 2,
    "arms": 1,
    "arrives": 2,
    "at": 1,
    "bag": 1,
    "bags": 1,
    "banana": 3,
    "bananas": 3,
    "bank": 1,
    "bathroom": 2,
    "bed": 1,
    "bedroom": 2,
    "black": 1,
    "blue": 1,
    "book": 1,
    "books": 1,
    "boots": 1,
    "bread": 1,
    "breakfast": 2,
    "brush": 1,
    "by": 1,
    "caf": 2,
    "can": 1,
    "canada": 3,
    "canadian": 4,
    "cannot": 2,
    "cars": 1,
    "chair": 1,
    "chairs": 1,
    "chicken": 2,
    "cloudy": 2,
    "coffee": 2,
    "cold": 1,
    "color": 2,
    "come": 1,
    "computer": 3,
    "cook": 1,
    "cross": 1,
    "day": 1,
    "dining": 2,
    "dinner": 2,
    "do": 1,
    "doctor": 2,
    "dollar": 2,
    "dollars": 2,
    "door": 1,
    "dress": 1,
    "dressed": 1,
    "drink": 1,
    "drinks": 1,
    "driver": 2,
    "ears": 1,
    "eat": 1,
    "egg": 1,
    "eggs": 1,
    "eight": 1,
    "eighteen": 2,
    "eleven": 3,
    "english": 2,
    "every": 3,
    "excuse": 2,
    "eyes": 1,
    "face": 1,
    "far": 1,
    "farmer": 2,
    "feet": 1,
    "fifteen": 2,
    "first": 1,
    "fish": 1,
    "five": 1,
    "food": 1,
    "for": 1,
    "four": 1,
    "fourteen": 2,
    "friday": 2,
    "from": 1,
    "fruit": 1,
    "get": 1,
    "go": 1,
    "goes": 1,
    "good": 1,
    "goodbye": 2,
    "grapes": 1,
    "green": 1,
    "hands": 1,
    "happy": 2,
    "has": 1,
    "hat": 1,
    "have": 1,
    "head": 1,
    "hello": 2,
    "help": 1,
    "her": 1,
    "here": 1,
    "his": 1,
    "home": 1,
    "hospital": 3,
    "hot": 1,
    "how": 1,
    "hungry": 2,
    "i": 1,
    "in": 1,
    "jacket": 2,
    "job": 1,
    "juice": 1,
    "kitchen": 2,
    "lamp": 1,
    "leaves": 1,
    "left": 1,
    "legs": 1,
    "library": 3,
    "like": 1,
    "listening": 3,
    "living": 2,
    "luis": 2,
    "lunch": 1,
    "me": 1,
    "mexican": 3,
    "mexico": 3,
    "milk": 1,
    "monday": 2,
    "morning": 2,
    "mouth": 1,
    "much": 1,
    "music": 2,
    "my": 1,
    "name": 1,
    "near": 1,
    "need": 1,
    "needs": 1,
    "next": 1,
    "night": 1,
    "nine": 1,
    "nineteen": 2,
    "no": 1,
    "number": 2,
    "nurse": 1,
    "o'clock": 2,
    "old": 1,
    "on": 1,
    "one": 1,
    "orange": 2,
    "oranges": 3,
    "pants": 1,
    "pear": 1,
    "pen": 1,
    "pens": 1,
    "pharmacy": 3,
    "phone": 1,
    "phones": 1,
    "phrase": 1,
    "play": 1,
    "please": 1,
    "rainy": 2,
    "read": 1,
    "red": 1,
    "repeat": 2,
    "restaurant": 3,
    "rice": 1,
    "right": 1,
    "room": 1,
    "sad": 1,
    "saturday": 3,
    "sentence": 2,
    "seven": 2,
    "seventeen": 3,
    "shirt": 1,
    "shoes": 1,
    "six": 1,
    "sixteen": 2,
    "skirt": 1,
    "sleep": 1,
    "slowly": 2,
    "socks": 1,
    "sofa": 2,
    "sofia": 3,
    "some": 1,
    "sorry": 2,
    "spain": 1,
    "spanish": 2,
    "speak": 1,
    "states": 1,
    "station": 2,
    "stop": 1,
    "straight": 1,
    "strawberries": 3,
    "strawberry": 3,
    "study": 2,
    "sunday": 2,
    "sunny": 2,
    "table": 2,
    "taxi": 2,
    "tea": 1,
    "teacher": 2,
    "teeth": 1,
    "ten": 1,
    "thank": 1,
    "that": 1,
    "then": 1,
    "there": 1,
    "thirsty": 2,
    "thirteen": 2,
    "this": 1,
    "three": 1,
    "thursday": 2,
    "tired": 2,
    "to": 1,
    "train": 1,
    "tuesday": 2,
    "turn": 1,
    "tv": 2,
    "twelve": 1,
    "twenty": 2,
    "two": 1,
    "umbrella": 3,
    "under": 2,
    "understand": 3,
    "united": 3,
    "up": 1,
    "wake": 1,
    "walk": 1,
    "want": 1,
    "wants": 1,
    "wash": 1,
    "watch": 1,
    "watching": 2,
    "water": 2,
    "we": 1,
    "wednesday": 2,
    "where": 1,
    "white": 1,
    "window": 2,
    "windy": 2,
    "word": 1,
    "words": 1,
    "work": 1,
    "years": 1,
    "yellow": 2,
    "yes": 1,
    "you": 1,
    "your": 1,
})

ING_PRONUNCIATION_NOTES = {
    "building": "'building' /ˈbɪl.dɪŋ/",
    "cooking": "'cooking' /ˈkʊk.ɪŋ/",
    "drinking": "'drinking' /ˈdrɪŋ.kɪŋ/",
    "dining": "'dining' /ˈdaɪ.nɪŋ/",
    "eating": "'eating' /ˈiː.tɪŋ/",
    "listening": "'listening' /ˈlɪs.ən.ɪŋ/",
    "living": "'living' /ˈlɪv.ɪŋ/",
    "morning": "'morning' /ˈmɔr.nɪŋ/",
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
    "watching": "'watching' /ˈwɑtʃ.ɪŋ/",
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
        "elevenlabs_premium_prompt_speed": ELEVENLABS_PREMIUM_PROMPT_SPEED,
        "elevenlabs_premium_pronunciation_speed": ELEVENLABS_PREMIUM_PRONUNCIATION_SPEED,
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
    if re.search(r"\bbus\b", lowered):
        notes.append("Pronounce 'bus' as /bʌs/ with the vowel in 'cup'; never make it sound like 'boss'.")
    if re.search(r"\bchair\b", lowered):
        notes.append("Pronounce 'chair' as /tʃɛr/ with a crisp CH onset; never make it sound like 'share'.")
    if re.search(r"\bbooks\b", lowered):
        notes.append(
            "Pronounce 'books' as /bʊks/ with a clear final /ks/ cluster; do not drop the K or final S."
        )
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
        "Speak only the requested words, exactly once. Stop immediately after the final requested word. "
        "Never add a preface, repeated word, filler vocalization, explanation, or closing sound. "
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
    key = "\n".join(
        [AUDIO_PROFILE_VERSION, text, mode, lang, variant, model, voice, output_format]
    )
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.{output_format}"


def completion_prompt_contract(
    visual_prompt: str,
    full_text: str,
    blank_text: str,
) -> CompletionPromptContract:
    """Validate and locate one visual completion blank inside its full answer.

    This contract is intentionally exact. The server must never guess which
    occurrence of a word to mute or normalize learner-facing punctuation.
    """
    sequence = completion_sequence_contract(visual_prompt, full_text, (blank_text,))
    prefix, suffix = sequence.visible_parts
    answer = sequence.blank_texts[0]

    answer_start = len(prefix)
    answer_end = answer_start + len(answer)
    return CompletionPromptContract(
        prefix=prefix,
        blank_text=answer,
        suffix=suffix,
        answer_start=answer_start,
        answer_end=answer_end,
        ending_blank=not bool(re.search(r"[A-Za-z0-9']", suffix)),
    )


def completion_sequence_contract(
    visual_prompt: str,
    full_text: str,
    blank_texts: tuple[str, ...] | list[str],
) -> CompletionSequenceContract:
    """Validate one or more ordered visual blanks against the completed text."""
    prompt = str(visual_prompt or "")
    completed = str(full_text or "")
    answers = tuple(str(blank_text or "") for blank_text in blank_texts)
    if not prompt or not completed or not answers or any(not answer for answer in answers):
        raise ValueError("visual_prompt, full_text, and every blank_text are required.")
    if max(len(prompt), len(completed), *(len(answer) for answer in answers)) > 500:
        raise ValueError("Completion prompt audio text is too long.")
    placeholders = list(COMPLETION_PLACEHOLDER_PATTERN.finditer(prompt))
    if len(placeholders) != len(answers):
        raise ValueError(
            "visual_prompt placeholder count must equal the ordered blank_text count."
        )
    if COMPLETION_PLACEHOLDER_PATTERN.search(completed) or any(
        COMPLETION_PLACEHOLDER_PATTERN.search(answer) for answer in answers
    ):
        raise ValueError("Completed and blank text cannot contain a visual placeholder.")

    visible_parts: list[str] = []
    cursor = 0
    reconstructed: list[str] = []
    for placeholder, answer in zip(placeholders, answers, strict=True):
        visible = prompt[cursor:placeholder.start()]
        visible_parts.append(visible)
        reconstructed.extend((visible, answer))
        cursor = placeholder.end()
    visible_parts.append(prompt[cursor:])
    reconstructed.append(prompt[cursor:])
    if "".join(reconstructed) != completed:
        raise ValueError(
            "full_text must exactly equal visual_prompt with every ordered blank_text inserted."
        )
    return CompletionSequenceContract(
        visible_parts=tuple(visible_parts),
        blank_texts=answers,
    )


def completion_prompt_fragments(
    contract: CompletionPromptContract,
) -> tuple[str | None, str | None]:
    """Return only learner-visible speech on each side of the blank.

    A rising question mark gives an ending blank such as ``It is a?`` the
    requested eliciting tone. The final article uses supported phoneme markup
    so it is reliably pronounced as the English strong form /eɪ/ ("ay"),
    rather than being guessed as "ee". A comma gives a middle blank a natural
    boundary before the fixed silent gap. These are non-spoken controls for
    TTS, not placeholders. The missing answer is never included.
    """

    fragments = completion_sequence_fragments(CompletionSequenceContract(
        visible_parts=(contract.prefix, contract.suffix),
        blank_texts=(contract.blank_text,),
    ))
    return fragments[0], fragments[1]


def completion_sequence_fragments(
    contract: CompletionSequenceContract,
) -> tuple[str | None, ...]:
    """Return only the visible speech segments around all ordered blanks."""
    fragments: list[str | None] = []
    last_blank_index = len(contract.blank_texts) - 1
    for index, raw_part in enumerate(contract.visible_parts):
        part = raw_part.strip()
        if not re.search(r"[A-Za-z0-9']", part):
            fragments.append(None)
            continue
        if index > 0:
            part = re.sub(r"^[\s.,!?;:…]+", "", part).strip()
        if index <= last_blank_index:
            part = re.sub(r"[\s.,!?;:…]+$", "", part).strip()
            later_visible = any(
                re.search(r"[A-Za-z0-9']", later_part)
                for later_part in contract.visible_parts[index + 1:]
            )
            if later_visible:
                part = f"{part},"
            elif re.search(r"\ba$", part, flags=re.IGNORECASE):
                part = re.sub(
                    r"\b(a)$",
                    f"{COMPLETION_ENDING_ARTICLE_MARKUP}?",
                    part,
                    flags=re.IGNORECASE,
                )
            else:
                part = f"{part}?"
        fragments.append(part or None)
    return tuple(fragments)


def completion_fragment_model(fragment: str | None, default_model: str) -> str:
    """Use the phoneme-capable model only for the marked ending article."""
    if fragment and COMPLETION_ENDING_ARTICLE_MARKUP in fragment:
        return COMPLETION_ENDING_ARTICLE_MODEL
    return default_model


def completion_fragment_units_for_openai(fragment: str | None) -> tuple[str, ...]:
    """Convert controls and isolate a trailing one-word clause when necessary."""
    if fragment is None:
        return ()
    prepared = fragment.replace(COMPLETION_ENDING_ARTICLE_MARKUP, "a")
    # OpenAI can elide a one-word clause embedded after a complete sentence
    # (for example the "I" in "It is hot. I,"). Synthesize that visible word
    # independently and join it back to the preceding visible speech.
    isolated_clause = re.fullmatch(r"(.+[.!?])\s+([A-Za-z']+),", prepared)
    if isolated_clause:
        return (isolated_clause.group(1), f"{isolated_clause.group(2)}?")
    return (prepared,)


def assemble_visible_fragment_samples(fragment_audio: list[bytes]) -> array:
    """Join independently synthesized visible units with a natural short gap."""
    joined = array("h")
    separator = array("h", [0]) * round(0.10 * NORMALIZATION_SAMPLE_RATE)
    padding = round(COMPLETION_FRAGMENT_PADDING_SECONDS * NORMALIZATION_SAMPLE_RATE)
    for index, audio_bytes in enumerate(fragment_audio):
        decoded = _decoded_mono_samples(audio_bytes)
        if not decoded:
            raise ValueError("Completion prompt fragment contains no decoded samples.")
        speech_start, speech_end = _active_sample_bounds(decoded)
        if speech_end <= speech_start:
            raise ValueError("Completion prompt fragment contains no audible speech.")
        if index:
            joined.extend(separator)
        joined.extend(decoded[max(0, speech_start - padding):min(len(decoded), speech_end + padding)])
    return joined


def assemble_completion_fragment_samples(
    prefix_audio: bytes | None,
    suffix_audio: bytes | None,
) -> array:
    """Stitch independently generated visible fragments around digital silence."""

    return assemble_completion_sequence_samples((prefix_audio, suffix_audio))


def assemble_completion_sequence_samples(
    fragment_audio: tuple[bytes | None, ...] | list[bytes | None],
) -> array:
    """Stitch ordered visible segments around one digital gap per answer blank."""

    def trimmed_fragment(audio_bytes: bytes | None) -> array:
        if not audio_bytes:
            return array("h")
        decoded = _decoded_mono_samples(audio_bytes)
        if not decoded:
            raise ValueError("Completion prompt fragment contains no decoded samples.")
        speech_start, speech_end = _active_sample_bounds(decoded)
        if speech_end <= speech_start:
            raise ValueError("Completion prompt fragment contains no audible speech.")
        padding = round(COMPLETION_FRAGMENT_PADDING_SECONDS * NORMALIZATION_SAMPLE_RATE)
        return decoded[max(0, speech_start - padding):min(len(decoded), speech_end + padding)]

    leading_silence = array("h", [0]) * round(0.18 * NORMALIZATION_SAMPLE_RATE)
    placeholder_silence = array("h", [0]) * round(
        COMPLETION_PLACEHOLDER_SILENCE_SECONDS * NORMALIZATION_SAMPLE_RATE
    )
    trailing_silence = array("h", [0]) * round(
        COMPLETION_TRAILING_SILENCE_SECONDS * NORMALIZATION_SAMPLE_RATE
    )
    completed = array("h", leading_silence)
    for index, audio_bytes in enumerate(fragment_audio):
        completed.extend(trimmed_fragment(audio_bytes))
        if index < len(fragment_audio) - 1:
            completed.extend(placeholder_silence)
    completed.extend(trailing_silence)
    return completed


def completion_prompt_cache_path(
    visual_prompt: str,
    full_text: str,
    blank_text: str,
    mode: str,
    lang: str,
    variant: str,
    provider: str,
    model: str,
    voice: str,
) -> Path:
    key = "\n".join(
        [
            AUDIO_PROFILE_VERSION,
            COMPLETION_PROMPT_AUDIO_PROFILE_VERSION,
            visual_prompt,
            full_text,
            blank_text,
            mode,
            lang,
            variant,
            provider,
            model,
            voice,
            "mp3",
        ]
    )
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.mp3"


def sanitize_course_audio_text(text: str) -> str:
    """Normalize clean course text and reject every visual placeholder."""
    cleaned_text = re.sub(r"\s+", " ", str(text or "").strip())
    if COMPLETION_PLACEHOLDER_PATTERN.search(cleaned_text):
        raise ValueError(
            "Visual completion placeholders cannot cross the course-audio text boundary."
        )
    return cleaned_text


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


def completion_audio_file_response(audio_path: Path, provider: str) -> FileResponse:
    provider_path = audio_path.with_suffix(".provider")
    actual_provider = provider
    try:
        if provider_path.is_file():
            recorded_provider = provider_path.read_text(encoding="utf-8").strip()
            if recorded_provider in {"openai", "elevenlabs", "elevenlabs-premium"}:
                actual_provider = recorded_provider
    except OSError:
        pass
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Audio-Profile": COMPLETION_PROMPT_AUDIO_PROFILE_VERSION,
        "X-Audio-Provider": actual_provider,
    }
    if actual_provider != provider:
        headers["X-Audio-Fallback-From"] = provider
    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename=audio_path.name,
        headers=headers,
    )


def silent_completion_audio_response(reason: str) -> Response:
    global _silent_completion_audio
    if _silent_completion_audio is None:
        silent_samples = array("h", [0]) * round(
            NORMALIZATION_SAMPLE_RATE
            * (COMPLETION_PLACEHOLDER_SILENCE_SECONDS + COMPLETION_TRAILING_SILENCE_SECONDS)
        )
        _silent_completion_audio = _encode_mp3(silent_samples)
    return Response(
        content=_silent_completion_audio,
        media_type="audio/mpeg",
        headers={
            # A temporary provider or alignment failure must be retried rather
            # than cached forever as the successful clip.
            "Cache-Control": "no-store",
            "X-Audio-Profile": COMPLETION_PROMPT_AUDIO_PROFILE_VERSION,
            "X-Audio-Fail-Silent": "true",
            "X-Audio-Fail-Silent-Reason": reason,
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


async def _generate_openai_completion_fragment_audio(
    client: httpx.AsyncClient,
    fragment: str,
    mode: str,
    lang: str,
    variant: str,
    model: str,
    voice: str,
) -> bytes:
    unit_audio = [
        await _generate_openai_audio(
            client,
            unit,
            mode,
            lang,
            variant,
            model,
            voice,
            "mp3",
        )
        for unit in completion_fragment_units_for_openai(fragment)
    ]
    if len(unit_audio) == 1:
        return unit_audio[0]
    return _encode_mp3(assemble_visible_fragment_samples(unit_audio))


async def _generate_elevenlabs_audio(
    client: httpx.AsyncClient,
    text: str,
    model: str,
    voice: str,
    premium: bool = False,
    mode: str = "prompt",
    seed: int = 1101,
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
        "speed": (
            ELEVENLABS_PREMIUM_PRONUNCIATION_SPEED
            if premium and mode == "pronunciation_slow"
            else ELEVENLABS_PREMIUM_PROMPT_SPEED if premium else 1.0
        ),
    }
    response = await client.post(
        f"{ELEVENLABS_SPEECH_URL}/{voice}",
        params={"output_format": "mp3_44100_128"},
        json={
            "text": text,
            "model_id": model,
            "seed": seed,
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


def _provider_audio_settings(provider: str, narrator: str, variant: str) -> tuple[str, str, str]:
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
    return model, voice, output_format


async def _provider_audio(
    text: str,
    mode: str,
    lang: str,
    variant: str,
    provider: str,
    narrator: str,
) -> FileResponse:
    model, voice, output_format = _provider_audio_settings(provider, narrator, variant)

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


async def get_course_completion_audio(
    visual_prompt: str,
    full_text: str,
    blank_text: str,
    mode: str = "prompt",
    lang: str = "en-US",
    variant: str = "prompt",
    provider: str = "elevenlabs-premium",
    narrator: str = "female-teacher",
) -> FileResponse | Response:
    """Speak only the visible fragments around a completion blank.

    The missing answer is never sent to the speech provider, so no answer
    phoneme can leak across a timestamp boundary. Any provider, decoding, or
    stitching uncertainty produces only local silence.
    """
    try:
        contract = completion_prompt_contract(visual_prompt, full_text, blank_text)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    requested_provider = str(provider or "").strip().lower()
    if requested_provider not in {"elevenlabs", "elevenlabs-premium"}:
        return silent_completion_audio_response("unsupported-provider")

    try:
        model, voice, output_format = _provider_audio_settings(
            requested_provider,
            narrator,
            variant,
        )
    except HTTPException:
        return silent_completion_audio_response("unsupported-narrator")
    if output_format != "mp3":
        return silent_completion_audio_response("unsupported-format")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    audio_path = completion_prompt_cache_path(
        visual_prompt,
        full_text,
        blank_text,
        mode,
        lang,
        variant,
        requested_provider,
        model,
        voice,
    )
    if audio_path.exists() and audio_path.stat().st_size > 0:
        return completion_audio_file_response(audio_path, requested_provider)

    lock = _generation_locks.setdefault(audio_path.name, asyncio.Lock())
    async with lock:
        if audio_path.exists() and audio_path.stat().st_size > 0:
            return completion_audio_file_response(audio_path, requested_provider)
        prefix_fragment, suffix_fragment = completion_prompt_fragments(contract)
        completed_audio: bytes | None = None
        generated_provider = requested_provider
        failure_reason = "provider-failure"
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                for attempt in range(COMPLETION_GENERATION_ATTEMPTS):
                    try:
                        seed = 1101 + attempt
                        prefix_audio = (
                            await _generate_elevenlabs_audio(
                                client,
                                prefix_fragment,
                                completion_fragment_model(prefix_fragment, model),
                                voice,
                                premium=requested_provider == "elevenlabs-premium",
                                mode=mode,
                                seed=seed,
                            )
                            if prefix_fragment
                            else None
                        )
                        suffix_audio = (
                            await _generate_elevenlabs_audio(
                                client,
                                suffix_fragment,
                                completion_fragment_model(suffix_fragment, model),
                                voice,
                                premium=requested_provider == "elevenlabs-premium",
                                mode=mode,
                                seed=seed,
                            )
                            if suffix_fragment
                            else None
                        )
                        completed_audio = _encode_mp3(
                            assemble_completion_fragment_samples(prefix_audio, suffix_audio)
                        )
                        break
                    except (HTTPException, httpx.HTTPError):
                        failure_reason = "provider-failure"
                    except (ValueError, TypeError, KeyError, OSError, av.FFmpegError):
                        failure_reason = "invalid-fragment-audio"

                if completed_audio is None:
                    try:
                        openai_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
                        openai_voice = voice_for_variant(variant)
                        prefix_audio = (
                            await _generate_openai_completion_fragment_audio(
                                client,
                                prefix_fragment,
                                mode,
                                lang,
                                variant,
                                openai_model,
                                openai_voice,
                            )
                            if prefix_fragment
                            else None
                        )
                        suffix_audio = (
                            await _generate_openai_completion_fragment_audio(
                                client,
                                suffix_fragment,
                                mode,
                                lang,
                                variant,
                                openai_model,
                                openai_voice,
                            )
                            if suffix_fragment
                            else None
                        )
                        completed_audio = _encode_mp3(
                            assemble_completion_fragment_samples(prefix_audio, suffix_audio)
                        )
                        generated_provider = "openai"
                    except (HTTPException, httpx.HTTPError):
                        failure_reason = "provider-failure"
                    except (ValueError, TypeError, KeyError, OSError, av.FFmpegError):
                        failure_reason = "invalid-fragment-audio"
        except httpx.HTTPError:
            failure_reason = "provider-failure"

        if completed_audio is None:
            return silent_completion_audio_response(failure_reason)

        try:
            temporary_path = audio_path.with_suffix(".tmp")
            temporary_path.write_bytes(completed_audio)
            temporary_path.replace(audio_path)
            if generated_provider != requested_provider:
                audio_path.with_suffix(".provider").write_text(
                    generated_provider,
                    encoding="utf-8",
                )
        except OSError:
            return silent_completion_audio_response("invalid-fragment-audio")

    return completion_audio_file_response(audio_path, requested_provider)


async def get_course_audio(
    text: str,
    mode: str,
    lang: str,
    variant: str,
    provider: str = "openai",
    narrator: str = "female-teacher",
) -> FileResponse:
    try:
        cleaned_text = sanitize_course_audio_text(text)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Visual completion placeholders require /api/audio/course-completion.mp3.",
        ) from error
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
