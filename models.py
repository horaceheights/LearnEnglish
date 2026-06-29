from dataclasses import dataclass
from pathlib import Path


IMAGE_DIR = Path(__file__).resolve().parent / "Lessons" / "Lesson1" / "images"


@dataclass(frozen=True)
class ChoiceOption:
    id: str
    image_path: Path


@dataclass(frozen=True)
class LessonCard:
    prompt: str
    options: list[ChoiceOption]
    correct_option_id: str
    stage: str


@dataclass(frozen=True)
class Lesson:
    id: str
    title: str
    level: str
    goal: str
    vocabulary: list[str]
    cards: list[LessonCard]


def image_file(name: str) -> Path:
    return IMAGE_DIR / name


LESSON_1 = Lesson(
    id="lesson-1-people-actions",
    title="Lesson 1: People and Actions",
    level="Beginner A1",
    goal="Match simple English prompts to the correct picture without translation.",
    vocabulary=["boy", "girl", "man", "woman", "running", "walking", "swimming", "eating"],
    cards=[
        LessonCard(
            prompt="The boy",
            stage="People",
            correct_option_id="boy",
            options=[
                ChoiceOption("boy", image_file("boy.png")),
                ChoiceOption("girl", image_file("girl.png")),
            ],
        ),
        LessonCard(
            prompt="The girl",
            stage="People",
            correct_option_id="girl",
            options=[
                ChoiceOption("boy", image_file("boy.png")),
                ChoiceOption("girl", image_file("girl.png")),
            ],
        ),
        LessonCard(
            prompt="The man",
            stage="People",
            correct_option_id="man",
            options=[
                ChoiceOption("man", image_file("man.png")),
                ChoiceOption("woman", image_file("woman.png")),
            ],
        ),
        LessonCard(
            prompt="The woman",
            stage="People",
            correct_option_id="woman",
            options=[
                ChoiceOption("man", image_file("man.png")),
                ChoiceOption("woman", image_file("woman.png")),
            ],
        ),
        LessonCard(
            prompt="The boy is running.",
            stage="Pattern",
            correct_option_id="boy-running",
            options=[
                ChoiceOption("boy-running", image_file("boy_is_running.png")),
                ChoiceOption("girl-walking", image_file("girl_is_walking.png")),
            ],
        ),
        LessonCard(
            prompt="The man is swimming.",
            stage="Pattern",
            correct_option_id="man-swimming",
            options=[
                ChoiceOption("man-swimming", image_file("man_is_swimming.png")),
                ChoiceOption("woman-eating", image_file("woman_is_eating.png")),
            ],
        ),
    ],
)
