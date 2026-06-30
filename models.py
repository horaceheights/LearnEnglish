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


PEOPLE = {
    "boy": {
        "label": "The boy",
        "portrait": "boy.png",
        "distractor": "girl",
    },
    "girl": {
        "label": "The girl",
        "portrait": "girl.png",
        "distractor": "boy",
    },
    "man": {
        "label": "The man",
        "portrait": "man.png",
        "distractor": "woman",
    },
    "woman": {
        "label": "The woman",
        "portrait": "woman.png",
        "distractor": "man",
    },
}

ACTIONS = [
    "running",
    "walking",
    "swimming",
    "eating",
    "drinking",
    "reading",
    "writing",
    "sleeping",
    "sitting",
    "standing",
]


def action_image(person: str, action: str) -> Path:
    if person == "woman" and action == "walking":
        return image_file("Woman_is_walking.png")
    return image_file(f"{person}_is_{action}.png")


def noun_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt=PEOPLE["boy"]["label"],
            stage="People",
            correct_option_id="boy",
            options=[
                ChoiceOption("boy", image_file(PEOPLE["boy"]["portrait"])),
                ChoiceOption("girl", image_file(PEOPLE["girl"]["portrait"])),
            ],
        ),
        LessonCard(
            prompt=PEOPLE["girl"]["label"],
            stage="People",
            correct_option_id="girl",
            options=[
                ChoiceOption("boy", image_file(PEOPLE["boy"]["portrait"])),
                ChoiceOption("girl", image_file(PEOPLE["girl"]["portrait"])),
            ],
        ),
        LessonCard(
            prompt=PEOPLE["man"]["label"],
            stage="People",
            correct_option_id="man",
            options=[
                ChoiceOption("man", image_file(PEOPLE["man"]["portrait"])),
                ChoiceOption("woman", image_file(PEOPLE["woman"]["portrait"])),
            ],
        ),
        LessonCard(
            prompt=PEOPLE["woman"]["label"],
            stage="People",
            correct_option_id="woman",
            options=[
                ChoiceOption("man", image_file(PEOPLE["man"]["portrait"])),
                ChoiceOption("woman", image_file(PEOPLE["woman"]["portrait"])),
            ],
        ),
    ]


def sentence_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    for person, person_config in PEOPLE.items():
        for action in ACTIONS:
            distractor = person_config["distractor"]
            cards.append(
                LessonCard(
                    prompt=f"{person_config['label']} is {action}.",
                    stage="Pattern",
                    correct_option_id=f"{person}-{action}",
                    options=[
                        ChoiceOption(f"{person}-{action}", action_image(person, action)),
                        ChoiceOption(f"{distractor}-{action}", action_image(distractor, action)),
                    ],
                )
            )
    return cards


LESSON_1 = Lesson(
    id="lesson-1-people-actions",
    title="Lesson 1: People and Actions",
    level="Beginner A1",
    goal="Match simple English prompts to the correct picture without translation.",
    vocabulary=[*PEOPLE.keys(), *ACTIONS],
    cards=[*noun_cards(), *sentence_cards()],
)
