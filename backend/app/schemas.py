from typing import Any

from pydantic import BaseModel, Field, field_validator

from .course_audio_profile import narrator_for_speaker


class ChoiceOption(BaseModel):
    id: str
    image_url: str = ""
    label: str | None = None


class CourseAudioAsset(BaseModel):
    """Immutable audio contract published by an approved lesson release."""

    id: str
    purpose: str
    text: str
    mode: str
    variant: str
    image_ref: str
    semantic_role: str
    speaker_role: str
    profile_id: str
    revision: int


class CourseAudioTurn(BaseModel):
    text: str = Field(min_length=1)
    speaker_role: str = Field(min_length=1)
    image_url: str = Field(min_length=1)

    @field_validator("text", "speaker_role", "image_url")
    @classmethod
    def require_exact_nonempty_value(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Course audio turn values must not be blank.")
        if value != value.strip():
            raise ValueError(
                "Course audio turn values must not have leading or trailing whitespace."
            )
        return value

    @field_validator("speaker_role")
    @classmethod
    def require_supported_speaker_role(cls, value: str) -> str:
        narrator_for_speaker(value)
        return value


class LessonCard(BaseModel):
    slide_id: str | None = None
    interaction_type: str | None = None
    prompt: str
    stage: str
    correct_option_id: str
    options: list[ChoiceOption]
    audio_text: str | None = None
    answer_audio_text: str | None = None
    prompt_image_url: str = ""
    spanish_translation: str | None = None
    pedagogy_note: str | None = None
    audio_speaker: str | None = None
    answer_audio_speaker: str | None = None
    audio_turns: list[CourseAudioTurn] = Field(default_factory=list)
    answer_audio_turns: list[CourseAudioTurn] = Field(default_factory=list)
    audio_revision: int = Field(default=1, ge=1)
    answer_audio_revision: int = Field(default=1, ge=1)
    audio_assets: list[CourseAudioAsset] = Field(default_factory=list)


class Lesson(BaseModel):
    id: str
    title: str
    level: str
    unit_id: str
    unit_title: str
    unit_outcome: str = ""
    lesson_id: str
    lesson_title: str
    sub_lesson_id: str
    sub_lesson_title: str
    goal: str
    vocabulary: list[str]
    review_vocabulary: list[str] = Field(default_factory=list)
    grammar_function: str = ""
    prerequisite: str = ""
    speaking_outcome: str = ""
    purposeful_review_slides: list[str] = Field(default_factory=list)
    cards: list[LessonCard]


class AzureAssessmentInterpretRequest(BaseModel):
    expected_text: str
    payload: dict[str, Any]
    level: str | None = None
    exercise_type: str | None = None
