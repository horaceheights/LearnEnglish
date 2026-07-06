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

PRONOUN_ACTIONS = ["running", "eating", "reading", "writing"]
PAIR_IMAGE_NAMES = {
    ("boy", "girl"): "they_boy_girl",
    ("boy", "man"): "they_boy_man",
    ("girl", "woman"): "they_girl_woman",
    ("man", "woman"): "they_man_woman",
}


def stable_shuffle(items: list[str], seed: str) -> list[str]:
    shuffled = [*items]
    random.Random(seed).shuffle(shuffled)
    return shuffled


def stable_shuffle_cards(cards: list[LessonCard], seed: str) -> list[LessonCard]:
    shuffled = [*cards]
    random.Random(seed).shuffle(shuffled)
    return shuffled


def pronoun_card_group(card: LessonCard) -> str:
    if card.prompt.startswith("They"):
        return "They"
    if card.prompt.startswith("She"):
        return "She"
    return "He"


def balanced_pronoun_mix(cards: list[LessonCard], seed: str) -> list[LessonCard]:
    groups = {
        "He": stable_shuffle_cards([card for card in cards if pronoun_card_group(card) == "He"], f"{seed}-he"),
        "She": stable_shuffle_cards([card for card in cards if pronoun_card_group(card) == "She"], f"{seed}-she"),
        "They": stable_shuffle_cards([card for card in cards if pronoun_card_group(card) == "They"], f"{seed}-they"),
    }
    mixed: list[LessonCard] = []
    last_group = ""

    while any(groups.values()):
        available_groups = [group for group, group_cards in groups.items() if group_cards and group != last_group]
        if not available_groups:
            available_groups = [group for group, group_cards in groups.items() if group_cards]

        next_group = max(available_groups, key=lambda group: (len(groups[group]), group))
        mixed.append(groups[next_group].pop(0))
        last_group = next_group

    return mixed


def person_image(person: str, action: str) -> str:
    return PEOPLE[person]["images"][action]


def portrait_image(person: str) -> str:
    return PEOPLE[person]["images"].get("portrait", person_image(person, "running"))


def pair_image(pair: tuple[str, str], action: str = "portrait") -> str:
    pair_key = tuple(pair)
    image_stem = PAIR_IMAGE_NAMES[pair_key]
    if action == "portrait":
        return f"{image_stem}.png"
    return f"{image_stem}_are_{action}.png"


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


def pronoun_intro_cards() -> list[LessonCard]:
    cards = [
        LessonCard(
            prompt="He",
            stage="Pronouns",
            correct_option_id="boy",
            options=[
                ChoiceOption(id="boy", image_url=image_url(portrait_image("boy"))),
                ChoiceOption(id="girl", image_url=image_url(portrait_image("girl"))),
                ChoiceOption(id="boy-girl", image_url=image_url(pair_image(("boy", "girl")))),
            ],
        ),
        LessonCard(
            prompt="He",
            stage="Pronouns",
            correct_option_id="man",
            options=[
                ChoiceOption(id="man", image_url=image_url(portrait_image("man"))),
                ChoiceOption(id="woman", image_url=image_url(portrait_image("woman"))),
                ChoiceOption(id="man-woman", image_url=image_url(pair_image(("man", "woman")))),
            ],
        ),
        LessonCard(
            prompt="She",
            stage="Pronouns",
            correct_option_id="girl",
            options=[
                ChoiceOption(id="girl", image_url=image_url(portrait_image("girl"))),
                ChoiceOption(id="boy", image_url=image_url(portrait_image("boy"))),
                ChoiceOption(id="boy-girl", image_url=image_url(pair_image(("boy", "girl")))),
            ],
        ),
        LessonCard(
            prompt="She",
            stage="Pronouns",
            correct_option_id="woman",
            options=[
                ChoiceOption(id="woman", image_url=image_url(portrait_image("woman"))),
                ChoiceOption(id="man", image_url=image_url(portrait_image("man"))),
                ChoiceOption(id="man-woman", image_url=image_url(pair_image(("man", "woman")))),
            ],
        ),
        LessonCard(
            prompt="They",
            stage="Pronouns",
            correct_option_id="boy-girl",
            options=[
                ChoiceOption(id="boy-girl", image_url=image_url(pair_image(("boy", "girl")))),
                ChoiceOption(id="boy", image_url=image_url(portrait_image("boy"))),
                ChoiceOption(id="girl", image_url=image_url(portrait_image("girl"))),
            ],
        ),
        LessonCard(
            prompt="They",
            stage="Pronouns",
            correct_option_id="man-woman",
            options=[
                ChoiceOption(id="man-woman", image_url=image_url(pair_image(("man", "woman")))),
                ChoiceOption(id="man", image_url=image_url(portrait_image("man"))),
                ChoiceOption(id="woman", image_url=image_url(portrait_image("woman"))),
            ],
        ),
    ]
    return balanced_pronoun_mix(cards, "lesson-2-pronoun-intro-mix")


def pronoun_sentence_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    singular_sets = [
        ("boy", "He", "girl", ("boy", "girl")),
        ("man", "He", "woman", ("man", "woman")),
        ("girl", "She", "boy", ("boy", "girl")),
        ("woman", "She", "man", ("man", "woman")),
    ]

    for person, pronoun, distractor_person, pair in singular_sets:
        for action in PRONOUN_ACTIONS:
            cards.append(
                LessonCard(
                    prompt=f"{pronoun} is {action}.",
                    stage="Pronoun Pattern",
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
                        ChoiceOption(
                            id=f"{'-'.join(pair)}-{action}",
                            image_url=image_url(pair_image(pair, action)),
                        ),
                    ],
                )
            )

    pair_sets = [
        (("boy", "girl"), "boy", "girl"),
        (("man", "woman"), "man", "woman"),
        (("boy", "man"), "boy", "man"),
        (("girl", "woman"), "girl", "woman"),
    ]

    for pair, first_distractor, second_distractor in pair_sets:
        pair_id = "-".join(pair)
        for action in PRONOUN_ACTIONS:
            cards.append(
                LessonCard(
                    prompt=f"They are {action}.",
                    stage="Pronoun Pattern",
                    correct_option_id=f"{pair_id}-{action}",
                    options=[
                        ChoiceOption(
                            id=f"{pair_id}-{action}",
                            image_url=image_url(pair_image(pair, action)),
                        ),
                        ChoiceOption(
                            id=f"{first_distractor}-{action}",
                            image_url=image_url(person_image(first_distractor, action)),
                        ),
                        ChoiceOption(
                            id=f"{second_distractor}-{action}",
                            image_url=image_url(person_image(second_distractor, action)),
                        ),
                    ],
                )
            )

    return balanced_pronoun_mix(cards, "lesson-2-pronoun-sentence-mix")


def pronunciation_focus_cards() -> list[LessonCard]:
    cards = [
        LessonCard(
            prompt="The boy",
            stage="Pronunciation",
            correct_option_id="boy",
            options=[
                ChoiceOption(id="boy", image_url=image_url(portrait_image("boy"))),
                ChoiceOption(id="girl", image_url=image_url(portrait_image("girl"))),
            ],
        ),
        LessonCard(
            prompt="The girl",
            stage="Pronunciation",
            correct_option_id="girl",
            options=[
                ChoiceOption(id="girl", image_url=image_url(portrait_image("girl"))),
                ChoiceOption(id="boy", image_url=image_url(portrait_image("boy"))),
            ],
        ),
        LessonCard(
            prompt="The man",
            stage="Pronunciation",
            correct_option_id="man",
            options=[
                ChoiceOption(id="man", image_url=image_url(portrait_image("man"))),
                ChoiceOption(id="woman", image_url=image_url(portrait_image("woman"))),
            ],
        ),
        LessonCard(
            prompt="The woman",
            stage="Pronunciation",
            correct_option_id="woman",
            options=[
                ChoiceOption(id="woman", image_url=image_url(portrait_image("woman"))),
                ChoiceOption(id="man", image_url=image_url(portrait_image("man"))),
            ],
        ),
        LessonCard(
            prompt="He is reading.",
            stage="Pronunciation",
            correct_option_id="boy-reading",
            options=[
                ChoiceOption(id="boy-reading", image_url=image_url(person_image("boy", "reading"))),
                ChoiceOption(id="girl-reading", image_url=image_url(person_image("girl", "reading"))),
            ],
        ),
        LessonCard(
            prompt="She is writing.",
            stage="Pronunciation",
            correct_option_id="girl-writing",
            options=[
                ChoiceOption(id="girl-writing", image_url=image_url(person_image("girl", "writing"))),
                ChoiceOption(id="boy-writing", image_url=image_url(person_image("boy", "writing"))),
            ],
        ),
        LessonCard(
            prompt="They are running.",
            stage="Pronunciation",
            correct_option_id="boy-girl-running",
            options=[
                ChoiceOption(id="boy-girl-running", image_url=image_url(pair_image(("boy", "girl"), "running"))),
                ChoiceOption(id="boy-running", image_url=image_url(person_image("boy", "running"))),
            ],
        ),
        LessonCard(
            prompt="They are eating.",
            stage="Pronunciation",
            correct_option_id="man-woman-eating",
            options=[
                ChoiceOption(id="man-woman-eating", image_url=image_url(pair_image(("man", "woman"), "eating"))),
                ChoiceOption(id="man-eating", image_url=image_url(person_image("man", "eating"))),
            ],
        ),
        LessonCard(
            prompt="The boy is drinking.",
            stage="Pronunciation",
            correct_option_id="boy-drinking",
            options=[
                ChoiceOption(id="boy-drinking", image_url=image_url(person_image("boy", "drinking"))),
                ChoiceOption(id="boy-eating", image_url=image_url(person_image("boy", "eating"))),
            ],
        ),
        LessonCard(
            prompt="The girl is sleeping.",
            stage="Pronunciation",
            correct_option_id="girl-sleeping",
            options=[
                ChoiceOption(id="girl-sleeping", image_url=image_url(person_image("girl", "sleeping"))),
                ChoiceOption(id="girl-sitting", image_url=image_url(person_image("girl", "sitting"))),
            ],
        ),
        LessonCard(
            prompt="The man is walking.",
            stage="Pronunciation",
            correct_option_id="man-walking",
            options=[
                ChoiceOption(id="man-walking", image_url=image_url(person_image("man", "walking"))),
                ChoiceOption(id="man-running", image_url=image_url(person_image("man", "running"))),
            ],
        ),
        LessonCard(
            prompt="The woman is swimming.",
            stage="Pronunciation",
            correct_option_id="woman-swimming",
            options=[
                ChoiceOption(id="woman-swimming", image_url=image_url(person_image("woman", "swimming"))),
                ChoiceOption(id="woman-walking", image_url=image_url(person_image("woman", "walking"))),
            ],
        ),
    ]

    return stable_shuffle_cards(cards, "lesson-3-pronunciation-focus")


LESSON_1 = Lesson(
    id="lesson-1-people-actions",
    title="1.1 People and Actions",
    level="Beginner A1",
    unit_id="unit-1",
    unit_title="Unit 1: People, Actions, And Basic Sentences",
    lesson_id="lesson-1",
    lesson_title="Lesson 1: People and Pronouns",
    sub_lesson_id="1.1",
    sub_lesson_title="People and Actions",
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

LESSON_2 = Lesson(
    id="lesson-2-pronouns",
    title="1.2 He, She, and They",
    level="Beginner A1",
    unit_id="unit-1",
    unit_title="Unit 1: People, Actions, And Basic Sentences",
    lesson_id="lesson-1",
    lesson_title="Lesson 1: People and Pronouns",
    sub_lesson_id="1.2",
    sub_lesson_title="He, She, and They",
    goal="Recognize he, she, and they in simple action sentences.",
    vocabulary=[
        "he",
        "she",
        "they",
        "is",
        "are",
        "running",
        "eating",
        "reading",
        "writing",
    ],
    cards=[*pronoun_intro_cards(), *pronoun_sentence_cards()],
)

LESSON_3 = Lesson(
    id="lesson-3-pronunciation",
    title="1.3 Pronunciation Practice",
    level="Beginner A1",
    unit_id="unit-1",
    unit_title="Unit 1: People, Actions, And Basic Sentences",
    lesson_id="lesson-1",
    lesson_title="Lesson 1: People and Pronouns",
    sub_lesson_id="1.3",
    sub_lesson_title="Pronunciation Practice",
    goal="Practice saying high-frequency people, pronouns, and action sentences clearly.",
    vocabulary=[
        "the",
        "boy",
        "girl",
        "man",
        "woman",
        "he",
        "she",
        "they",
        "is",
        "are",
        "reading",
        "writing",
        "running",
        "eating",
        "drinking",
        "sleeping",
        "walking",
        "swimming",
    ],
    cards=pronunciation_focus_cards(),
)


LESSONS = {
    LESSON_1.id: LESSON_1,
    LESSON_2.id: LESSON_2,
    LESSON_3.id: LESSON_3,
}
