from __future__ import annotations

from dataclasses import dataclass


COURSE_AUDIO_PROFILE_ID = "a1-elevenlabs-character-cast-v1"
COURSE_AUDIO_PROVIDER = "elevenlabs-premium"
COURSE_AUDIO_MODEL_ID = "eleven_multilingual_v2"
COURSE_AUDIO_OUTPUT_FORMAT = "mp3_44100_128"
COURSE_AUDIO_SEED = 1101

NARRATOR_VOICE_IDS = {
    "female-teacher": "XfNU2rGpBa01ckF309OY",  # Nichalia
    "female-warm": "EXAVITQu4vr4xnSDxMaL",  # Sarah
    "male-warm": "nPczCjzI2devNBz1zQrb",  # Brian
    "male-conversational": "TX3LPaxmHKxFdv7VOQHJ",  # Liam
}

# Lesson content names the semantic speaker, never a provider voice ID. Named
# characters stay recognizable across stages while neutral teaching language
# keeps the established teacher voice.
SPEAKER_NARRATORS = {
    "teacher": "female-teacher",
    "question": "female-teacher",
    "answer": "female-teacher",
    "ana": "female-warm",
    "sofia": "female-warm",
    "female-character": "female-warm",
    "luis": "male-warm",
    "diego": "male-warm",
    "male-character": "male-warm",
}

NEUTRAL_SPEAKER_ROLES = frozenset({"teacher", "question", "answer"})
NAMED_SPEAKER_ROLES = frozenset(set(SPEAKER_NARRATORS) - NEUTRAL_SPEAKER_ROLES)


@dataclass(frozen=True)
class CourseAudioRenderProfile:
    profile_id: str
    provider: str
    model_id: str
    narrator: str
    voice_id: str
    output_format: str
    seed: int
    stability: float
    similarity_boost: float
    style: float
    use_speaker_boost: bool
    speed: float

    def as_provenance_contract(self) -> dict[str, object]:
        """Return the exact provider request contract stored in receipts.

        The provider output format is intentionally distinct from the probed
        format of the reviewed file on disk. Older approved takes were
        normalized after ElevenLabs returned them, while new offline renders
        may retain the provider bytes unchanged.
        """
        return {
            "provider": self.provider,
            "model_id": self.model_id,
            "narrator": self.narrator,
            "voice_id": self.voice_id,
            "provider_output_format": self.output_format,
            "seed": self.seed,
            "settings": {
                "stability": self.stability,
                "similarity_boost": self.similarity_boost,
                "style": self.style,
                "use_speaker_boost": self.use_speaker_boost,
                "speed": self.speed,
            },
        }


def narrator_for_speaker(speaker_role: str) -> str:
    try:
        return SPEAKER_NARRATORS[speaker_role]
    except KeyError as error:
        raise ValueError(f"Unsupported course audio speaker role: {speaker_role}") from error


def render_profile_for(speaker_role: str, mode: str) -> CourseAudioRenderProfile:
    narrator = narrator_for_speaker(speaker_role)
    # These are the already-approved ElevenLabs values. Prompt and
    # pronunciation speed deliberately remain identical at 0.70.
    return CourseAudioRenderProfile(
        profile_id=COURSE_AUDIO_PROFILE_ID,
        provider=COURSE_AUDIO_PROVIDER,
        model_id=COURSE_AUDIO_MODEL_ID,
        narrator=narrator,
        voice_id=NARRATOR_VOICE_IDS[narrator],
        output_format=COURSE_AUDIO_OUTPUT_FORMAT,
        seed=COURSE_AUDIO_SEED,
        stability=0.55,
        similarity_boost=0.80,
        style=0.0,
        use_speaker_boost=True,
        speed=0.70,
    )
