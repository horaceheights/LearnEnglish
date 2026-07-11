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
