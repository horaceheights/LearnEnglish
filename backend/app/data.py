from pathlib import Path

from .schemas import ChoiceOption, Lesson, LessonCard


ROOT_DIR = Path(__file__).resolve().parents[2]
LESSON_IMAGE_DIR = ROOT_DIR / "Lessons" / "Lesson1" / "images"


def image_url(name: str) -> str:
    return f"/lesson-assets/{name}"


PEOPLE = {
    "boy": {
        "label": "The boy",
        "images": {
            "running": "boy_is_running.png",
            "walking": "boy_is_walking.png",
            "swimming": "boy_is_swimming.png",
            "eating": "boy_is_eating.png",
        },
    },
    "girl": {
        "label": "The girl",
        "images": {
            "running": "girl_is_running.png",
            "walking": "girl_is_walking.png",
            "swimming": "girl_is_swimming.png",
            "eating": "girl_is_eating.png",
        },
    },
    "man": {
        "label": "The man",
        "images": {
            "running": "man_is_running.png",
            "walking": "man_is_walking.png",
            "swimming": "man_is_swimming.png",
            "eating": "man_is_eating.png",
        },
    },
    "woman": {
        "label": "The woman",
        "images": {
            "running": "woman_is_running.png",
            "walking": "Woman_is_walking.png",
            "swimming": "woman_is_swimming.png",
            "eating": "woman_is_eating.png",
        },
    },
}

ACTIONS = {
    "running": "Running",
    "walking": "Walking",
    "swimming": "Swimming",
    "eating": "Eating",
}
def person_image(person: str, action: str) -> str:
    return PEOPLE[person]["images"][action]


def noun_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt="The boy",
            stage="People",
            correct_option_id="boy",
            options=[
                ChoiceOption(id="boy", image_url=image_url(person_image("boy", "running"))),
                ChoiceOption(id="girl", image_url=image_url(person_image("girl", "running"))),
            ],
        ),
        LessonCard(
            prompt="The girl",
            stage="People",
            correct_option_id="girl",
            options=[
                ChoiceOption(id="boy", image_url=image_url(person_image("boy", "eating"))),
                ChoiceOption(id="girl", image_url=image_url(person_image("girl", "eating"))),
            ],
        ),
        LessonCard(
            prompt="The man",
            stage="People",
            correct_option_id="man",
            options=[
                ChoiceOption(id="man", image_url=image_url(person_image("man", "walking"))),
                ChoiceOption(id="woman", image_url=image_url(person_image("woman", "walking"))),
            ],
        ),
        LessonCard(
            prompt="The woman",
            stage="People",
            correct_option_id="woman",
            options=[
                ChoiceOption(id="man", image_url=image_url(person_image("man", "swimming"))),
                ChoiceOption(id="woman", image_url=image_url(person_image("woman", "swimming"))),
            ],
        ),
    ]


def action_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt="Running",
            stage="Actions",
            correct_option_id="running",
            options=[
                ChoiceOption(id="running", image_url=image_url(person_image("boy", "running"))),
                ChoiceOption(id="walking", image_url=image_url(person_image("boy", "walking"))),
            ],
        ),
        LessonCard(
            prompt="Walking",
            stage="Actions",
            correct_option_id="walking",
            options=[
                ChoiceOption(id="walking", image_url=image_url(person_image("girl", "walking"))),
                ChoiceOption(id="eating", image_url=image_url(person_image("girl", "eating"))),
            ],
        ),
        LessonCard(
            prompt="Swimming",
            stage="Actions",
            correct_option_id="swimming",
            options=[
                ChoiceOption(id="swimming", image_url=image_url(person_image("man", "swimming"))),
                ChoiceOption(id="eating", image_url=image_url(person_image("man", "eating"))),
            ],
        ),
        LessonCard(
            prompt="Eating",
            stage="Actions",
            correct_option_id="eating",
            options=[
                ChoiceOption(id="swimming", image_url=image_url(person_image("woman", "swimming"))),
                ChoiceOption(id="eating", image_url=image_url(person_image("woman", "eating"))),
            ],
        ),
    ]


def sentence_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    people_in_order = ["boy", "girl", "man", "woman"]
    actions_in_order = ["running", "walking", "swimming", "eating"]
    distractor_people = {
        "boy": "girl",
        "girl": "boy",
        "man": "woman",
        "woman": "man",
    }

    for person in people_in_order:
        for action in actions_in_order:
            distractor_person = distractor_people[person]
            cards.append(
                LessonCard(
                    prompt=f"{PEOPLE[person]['label']} is {action}.",
                    stage="Pattern",
                    correct_option_id=f"{person}-{action}",
                    options=[
                        ChoiceOption(
                            id=f"{person}-{action}",
                            image_url=image_url(person_image(person, action)),
                        ),
                        ChoiceOption(
                            id=f"{distractor_person}-{action}",
                            image_url=image_url(person_image(distractor_person, action)),
                        ),
                    ],
                )
            )

    return cards


LESSON_1 = Lesson(
    id="lesson-1-people-actions",
    title="Lesson 1: People and Actions",
    level="Beginner A1",
    goal="Match simple English prompts to the correct picture without translation.",
    vocabulary=["boy", "girl", "man", "woman", "running", "walking", "swimming", "eating"],
    cards=[*noun_cards(), *action_cards(), *sentence_cards()],
)


LESSONS = {
    LESSON_1.id: LESSON_1,
}
