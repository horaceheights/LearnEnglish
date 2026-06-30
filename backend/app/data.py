from pathlib import Path
import random

from .schemas import ChoiceOption, Lesson, LessonCard


ROOT_DIR = Path(__file__).resolve().parents[2]
LESSON_IMAGE_DIR = ROOT_DIR / "Lessons" / "Lesson1" / "images"


def image_url(name: str) -> str:
    return f"/lesson-assets/{Path(name).with_suffix('.webp').name}"


PEOPLE = {
    "boy": {
        "label": "The boy",
        "images": {
            "portrait": "boy.png",
            "running": "boy_is_running.png",
            "walking": "boy_is_walking.png",
            "swimming": "boy_is_swimming.png",
            "eating": "boy_is_eating.png",
            "drinking": "boy_is_drinking.png",
            "reading": "boy_is_reading.png",
            "writing": "boy_is_writing.png",
            "sleeping": "boy_is_sleeping.png",
            "sitting": "boy_is_sitting.png",
            "standing": "boy_is_standing.png",
        },
    },
    "girl": {
        "label": "The girl",
        "images": {
            "portrait": "girl.png",
            "running": "girl_is_running.png",
            "walking": "girl_is_walking.png",
            "swimming": "girl_is_swimming.png",
            "eating": "girl_is_eating.png",
            "drinking": "girl_is_drinking.png",
            "reading": "girl_is_reading.png",
            "writing": "girl_is_writing.png",
            "sleeping": "girl_is_sleeping.png",
            "sitting": "girl_is_sitting.png",
            "standing": "girl_is_standing.png",
        },
    },
    "man": {
        "label": "The man",
        "images": {
            "portrait": "man.png",
            "running": "man_is_running.png",
            "walking": "man_is_walking.png",
            "swimming": "man_is_swimming.png",
            "eating": "man_is_eating.png",
            "drinking": "man_is_drinking.png",
            "reading": "man_is_reading.png",
            "writing": "man_is_writing.png",
            "sleeping": "man_is_sleeping.png",
            "sitting": "man_is_sitting.png",
            "standing": "man_is_standing.png",
        },
    },
    "woman": {
        "label": "The woman",
        "images": {
            "portrait": "woman.png",
            "running": "woman_is_running.png",
            "walking": "Woman_is_walking.png",
            "swimming": "woman_is_swimming.png",
            "eating": "woman_is_eating.png",
            "drinking": "woman_is_drinking.png",
            "reading": "woman_is_reading.png",
            "writing": "woman_is_writing.png",
            "sleeping": "woman_is_sleeping.png",
            "sitting": "woman_is_sitting.png",
            "standing": "woman_is_standing.png",
        },
    },
}

ACTIONS = {
    "running": "Running",
    "walking": "Walking",
    "swimming": "Swimming",
    "eating": "Eating",
    "drinking": "Drinking",
    "reading": "Reading",
    "writing": "Writing",
    "sleeping": "Sleeping",
    "sitting": "Sitting",
    "standing": "Standing",
}

PEOPLE_IN_ORDER = ["boy", "girl", "man", "woman"]
ACTIONS_IN_ORDER = [
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


def stable_shuffle(items: list[str], seed: str) -> list[str]:
    shuffled = [*items]
    random.Random(seed).shuffle(shuffled)
    return shuffled


def person_image(person: str, action: str) -> str:
    return PEOPLE[person]["images"][action]


def portrait_image(person: str) -> str:
    return PEOPLE[person]["images"].get("portrait", person_image(person, "running"))


def noun_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt="The boy",
            stage="People",
            correct_option_id="boy",
            options=[
                ChoiceOption(id="boy", image_url=image_url(portrait_image("boy"))),
                ChoiceOption(id="girl", image_url=image_url(portrait_image("girl"))),
            ],
        ),
        LessonCard(
            prompt="The girl",
            stage="People",
            correct_option_id="girl",
            options=[
                ChoiceOption(id="boy", image_url=image_url(portrait_image("boy"))),
                ChoiceOption(id="girl", image_url=image_url(portrait_image("girl"))),
            ],
        ),
        LessonCard(
            prompt="The man",
            stage="People",
            correct_option_id="man",
            options=[
                ChoiceOption(id="man", image_url=image_url(portrait_image("man"))),
                ChoiceOption(id="woman", image_url=image_url(portrait_image("woman"))),
            ],
        ),
        LessonCard(
            prompt="The woman",
            stage="People",
            correct_option_id="woman",
            options=[
                ChoiceOption(id="man", image_url=image_url(portrait_image("man"))),
                ChoiceOption(id="woman", image_url=image_url(portrait_image("woman"))),
            ],
        ),
    ]


def noun_cards_stage_two() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for person in PEOPLE_IN_ORDER:
        options = stable_shuffle(PEOPLE_IN_ORDER, f"noun-stage-two-{person}")
        cards.append(
            LessonCard(
                prompt=PEOPLE[person]["label"],
                stage="People Challenge",
                correct_option_id=person,
                options=[
                    ChoiceOption(id=option, image_url=image_url(portrait_image(option)))
                    for option in options
                ],
            )
        )

    return cards


def sentence_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    distractor_people = {
        "boy": "girl",
        "girl": "boy",
        "man": "woman",
        "woman": "man",
    }

    for person in PEOPLE_IN_ORDER:
        for action in ACTIONS_IN_ORDER:
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


def sentence_cards_stage_two() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for person in PEOPLE_IN_ORDER:
        for action in ACTIONS_IN_ORDER:
            mode = stable_shuffle(["same-person", "same-action"], f"challenge-mode-{person}-{action}")[0]

            if mode == "same-action":
                option_people = stable_shuffle(PEOPLE_IN_ORDER, f"same-action-stage-two-{person}-{action}")
                options = [
                    ChoiceOption(
                        id=f"{option_person}-{action}",
                        image_url=image_url(person_image(option_person, action)),
                    )
                    for option_person in option_people
                ]
            else:
                distractor_actions = [item for item in ACTIONS_IN_ORDER if item != action]
                selected_actions = stable_shuffle(distractor_actions, f"same-person-stage-two-{person}-{action}")[:3]
                option_actions = stable_shuffle([action, *selected_actions], f"option-stage-two-{person}-{action}")
                options = [
                    ChoiceOption(
                        id=f"{person}-{option_action}",
                        image_url=image_url(person_image(person, option_action)),
                    )
                    for option_action in option_actions
                ]

            cards.append(
                LessonCard(
                    prompt=f"{PEOPLE[person]['label']} is {action}.",
                    stage="Pattern Challenge",
                    correct_option_id=f"{person}-{action}",
                    options=options,
                )
            )

    return cards


LESSON_1 = Lesson(
    id="lesson-1-people-actions",
    title="Lesson 1: People and Actions",
    level="Beginner A1",
    goal="Match simple English prompts to the correct picture without translation.",
    vocabulary=[
        "boy",
        "girl",
        "man",
        "woman",
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
    ],
    cards=[*noun_cards(), *sentence_cards(), *noun_cards_stage_two(), *sentence_cards_stage_two()],
)


LESSONS = {
    LESSON_1.id: LESSON_1,
}
