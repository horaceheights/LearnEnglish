from typing import Any

from pydantic import BaseModel


class ChoiceOption(BaseModel):
    id: str
    image_url: str = ""
    label: str | None = None


class LessonCard(BaseModel):
    prompt: str
    stage: str
    correct_option_id: str
    options: list[ChoiceOption]
    audio_text: str | None = None
    answer_audio_text: str | None = None
    prompt_image_url: str = ""
    spanish_translation: str | None = None


class Lesson(BaseModel):
    id: str
    title: str
    level: str
    unit_id: str
    unit_title: str
    lesson_id: str
    lesson_title: str
    sub_lesson_id: str
    sub_lesson_title: str
    goal: str
    vocabulary: list[str]
    cards: list[LessonCard]


class AzureAssessmentInterpretRequest(BaseModel):
    expected_text: str
    payload: dict[str, Any]
    level: str | None = None
    exercise_type: str | None = None
