from pydantic import BaseModel


class ChoiceOption(BaseModel):
    id: str
    image_url: str


class LessonCard(BaseModel):
    prompt: str
    stage: str
    correct_option_id: str
    options: list[ChoiceOption]


class Lesson(BaseModel):
    id: str
    title: str
    level: str
    goal: str
    vocabulary: list[str]
    cards: list[LessonCard]
