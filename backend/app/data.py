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

LESSON_1_ACTION_PAIRS = [
    ("boy", "running"),
    ("boy", "swimming"),
    ("boy", "eating"),
    ("boy", "reading"),
    ("girl", "walking"),
    ("girl", "drinking"),
    ("girl", "writing"),
    ("girl", "sleeping"),
    ("man", "walking"),
    ("man", "swimming"),
    ("man", "drinking"),
    ("man", "sitting"),
    ("woman", "eating"),
    ("woman", "reading"),
    ("woman", "writing"),
    ("woman", "standing"),
]

PRONOUN_ACTIONS = ["running", "eating", "reading", "writing"]
PAIR_IMAGE_NAMES = {
    ("boy", "girl"): "they_boy_girl",
    ("boy", "man"): "they_boy_man",
    ("girl", "woman"): "they_girl_woman",
    ("man", "woman"): "they_man_woman",
}

FAMILY_PEOPLE = {
    "family": {"label": "A family", "image": "family_all_members.png"},
    "baby": {"label": "A baby", "image": "family_baby.png"},
    "babies": {"label": "Babies", "image": "family_babies.png"},
    "child": {"label": "A child", "image": "boy.png"},
    "children": {"label": "Children", "image": "family_children.png"},
    "adult": {"label": "An adult", "image": "family_father.png"},
    "adults": {"label": "Adults", "image": "family_adults.png"},
    "brother": {"label": "A brother", "image": "boy.png"},
    "brothers": {"label": "Brothers", "image": "family_brothers.png"},
    "sister": {"label": "A sister", "image": "girl.png"},
    "sisters": {"label": "Sisters", "image": "family_sisters.png"},
    "father": {"label": "A father", "image": "family_father.png"},
    "mother": {"label": "A mother", "image": "family_mother.png"},
    "parents": {"label": "Parents", "image": "family_parents.png"},
    "grandfather": {"label": "A grandfather", "image": "family_grandfather.png"},
    "grandmother": {"label": "A grandmother", "image": "family_grandmother.png"},
    "grandparents": {"label": "Grandparents", "image": "family_grandparents.png"},
}

FAMILY_ACTIONS = {
    "baby-sleeping": {
        "prompt": "A baby is sleeping.",
        "stage": "Family Sentences",
        "image": "family_baby_sleeping.png",
        "distractors": ["children-playing", "mother-cooking", "father-working"],
    },
    "children-playing": {
        "prompt": "Children are playing.",
        "stage": "Family Sentences",
        "image": "family_children_playing.png",
        "distractors": ["baby-sleeping", "father-working", "parents-talking"],
    },
    "brother-studying": {
        "prompt": "A brother is studying.",
        "stage": "Family Sentences",
        "image": "family_brother_studying.png",
        "distractors": ["sister-reading", "children-playing", "father-working"],
    },
    "sister-reading": {
        "prompt": "A sister is reading.",
        "stage": "Family Sentences",
        "image": "girl_is_reading.png",
        "distractors": ["brother-studying", "mother-cooking", "children-playing"],
    },
    "father-working": {
        "prompt": "A father is working.",
        "stage": "Family Sentences",
        "image": "family_father_working.png",
        "distractors": ["mother-cooking", "parents-talking", "baby-sleeping"],
    },
    "mother-cooking": {
        "prompt": "A mother is cooking.",
        "stage": "Family Sentences",
        "image": "family_mother_cooking.png",
        "distractors": ["father-working", "sister-reading", "parents-talking"],
    },
    "parents-talking": {
        "prompt": "Parents are talking.",
        "stage": "Family Sentences",
        "image": "family_parents_talking.png",
        "distractors": ["children-playing", "grandparents-sitting", "baby-sleeping"],
    },
    "grandparents-sitting": {
        "prompt": "Grandparents are sitting.",
        "stage": "Family Sentences",
        "image": "family_grandparents_sitting.png",
        "distractors": ["parents-talking", "children-playing", "father-working"],
    },
    "parents-adults": {
        "prompt": "The parents are adults.",
        "stage": "Family Sentences",
        "image": "family_parents.png",
        "distractors": ["children-playing", "baby-sleeping", "grandparents-sitting"],
    },
}

FAMILY_PRACTICE_IMAGES = {
    "family": "family_all_members.png",
    "adult-man": "family_father.png",
    "adult-woman": "family_mother.png",
    "adult-pair": "family_adults.png",
    "adults": "family_adults.png",
    "child-boy": "boy.png",
    "child-girl": "girl.png",
    "children": "family_children.png",
    "baby": "family_baby.png",
    "babies": "family_babies.png",
    "parents": "family_parents.png",
    "grandparents": "family_grandparents.png",
    "father": "family_father.png",
    "mother": "family_mother.png",
    "grandfather": "family_grandfather.png",
    "grandmother": "family_grandmother.png",
    "brother": "boy.png",
    "sister": "girl.png",
    "adults-playing": "family_adults_playing.png",
    "grandparents-talking": "family_grandparents_talking.png",
    "father-talking": "family_father_talking.png",
    "mother-talking": "family_mother_talking.png",
    "children-studying": "family_children_studying.png",
    "brother-playing": "family_brother_playing.png",
    "sister-playing": "family_sister_playing.png",
    "parents-talking": "family_parents_talking.png",
    "grandparents-sitting": "family_grandparents_sitting.png",
    "father-working": "family_father_working.png",
    "mother-cooking": "family_mother_cooking.png",
    "baby-sleeping": "family_baby_sleeping.png",
    "children-playing": "family_children_playing.png",
    "brother-studying": "family_brother_studying.png",
    "sister-reading": "girl_is_reading.png",
}

PLACES_AROUND_ME = {
    "park": {"label": "a park", "sentence": "It is a park.", "image": "place_park.png"},
    "house": {"label": "a house", "sentence": "It is a house.", "image": "place_house.png"},
    "school": {"label": "a school", "sentence": "It is a school.", "image": "place_school.png"},
    "street": {"label": "a street", "sentence": "It is a street.", "image": "place_street.png"},
    "bridge": {"label": "a bridge", "sentence": "It is a bridge.", "image": "place_bridge.png"},
    "store": {"label": "a store", "sentence": "It is a store.", "image": "place_store.png"},
    "building": {"label": "a building", "sentence": "It is a building.", "image": "place_building.png"},
    "car": {"label": "a car", "sentence": "It is a car.", "image": "object_car.png"},
    "bike": {"label": "a bike", "sentence": "It is a bike.", "image": "object_bike.png"},
    "bus": {"label": "a bus", "sentence": "It is a bus.", "image": "place_bus.png"},
}

PLACE_IDS = ["park", "house", "school", "street", "bridge", "store", "building", "car", "bike", "bus"]

PLACE_RECOGNITION_GROUPS = [
    ["park", "house", "school", "street"],
    ["bridge", "store", "building", "bus"],
    ["car", "bike", "street", "bridge"],
]

PLACE_PRONUNCIATION_IDS = ["park", "house", "school", "street", "bridge", "bus"]

LESSON_1_SENTENCE_PAIRS = [
    ("boy", "running"),
    ("boy", "reading"),
    ("girl", "walking"),
    ("girl", "writing"),
    ("man", "walking"),
    ("man", "swimming"),
    ("woman", "reading"),
    ("woman", "standing"),
]

LESSON_1_RECOGNITION_GROUPS = [
    ["boy-running", "girl-walking", "man-walking", "woman-standing"],
    ["boy-reading", "girl-writing", "man-swimming", "woman-reading"],
]

LESSON_1_PRONUNCIATION_IDS = [
    "boy-running",
    "girl-walking",
    "boy-reading",
    "girl-writing",
    "man-swimming",
    "woman-standing",
]

LESSON_1_GRAMMAR_SPECS = [
    {
        "id": "grammar-boy-running-is",
        "prompt": "The boy ___ running.",
        "answer": "is",
        "sentence": "The boy is running.",
        "image": "boy_is_running.png",
    },
    {
        "id": "grammar-girl-writing-is",
        "prompt": "The girl ___ writing.",
        "answer": "is",
        "sentence": "The girl is writing.",
        "image": "girl_is_writing.png",
    },
    {
        "id": "grammar-man-swimming-is",
        "prompt": "The man ___ swimming.",
        "answer": "is",
        "sentence": "The man is swimming.",
        "image": "man_is_swimming.png",
    },
    {
        "id": "grammar-woman-reading-is",
        "prompt": "The woman ___ reading.",
        "answer": "is",
        "sentence": "The woman is reading.",
        "image": "woman_is_reading.png",
    },
    {
        "id": "grammar-boy-girl-running-are",
        "prompt": "The boy and the girl ___ running.",
        "answer": "are",
        "sentence": "The boy and the girl are running.",
        "image": "they_boy_girl_are_running.png",
    },
    {
        "id": "grammar-man-woman-reading-are",
        "prompt": "The man and the woman ___ reading.",
        "answer": "are",
        "sentence": "The man and the woman are reading.",
        "image": "they_man_woman_are_reading.png",
    },
    {
        "id": "grammar-boy-man-eating-are",
        "prompt": "The boy and the man ___ eating.",
        "answer": "are",
        "sentence": "The boy and the man are eating.",
        "image": "they_boy_man_are_eating.png",
    },
    {
        "id": "grammar-girl-woman-writing-are",
        "prompt": "The girl and the woman ___ writing.",
        "answer": "are",
        "sentence": "The girl and the woman are writing.",
        "image": "they_girl_woman_are_writing.png",
    },
]

LESSON_1_PLURAL_SENTENCES = [
    {
        "id": "boy-girl-running",
        "prompt": "The boy and the girl are running.",
        "image": "they_boy_girl_are_running.png",
    },
    {
        "id": "man-woman-reading",
        "prompt": "The man and the woman are reading.",
        "image": "they_man_woman_are_reading.png",
    },
    {
        "id": "boy-man-eating",
        "prompt": "The boy and the man are eating.",
        "image": "they_boy_man_are_eating.png",
    },
    {
        "id": "girl-woman-writing",
        "prompt": "The girl and the woman are writing.",
        "image": "they_girl_woman_are_writing.png",
    },
]

LESSON_2_PRONOUN_VOCAB = [
    ("he-boy", "He", "boy.png"),
    ("he-man", "He", "man.png"),
    ("she-girl", "She", "girl.png"),
    ("she-woman", "She", "woman.png"),
    ("they-children", "They", "they_boy_girl.png"),
    ("they-adults", "They", "they_man_woman.png"),
]

LESSON_2_SENTENCE_SPECS = [
    ("he-boy-reading", "He is reading.", "boy_is_reading.png"),
    ("he-man-walking", "He is walking.", "man_is_walking.png"),
    ("she-girl-writing", "She is writing.", "girl_is_writing.png"),
    ("she-woman-reading", "She is reading.", "woman_is_reading.png"),
    ("they-boy-girl-running", "They are running.", "they_boy_girl_are_running.png"),
    ("they-man-woman-eating", "They are eating.", "they_man_woman_are_eating.png"),
    ("they-boy-man-reading", "They are reading.", "they_boy_man_are_reading.png"),
    ("they-girl-woman-writing", "They are writing.", "they_girl_woman_are_writing.png"),
]

LESSON_2_PRONUNCIATION_IDS = [
    "he-boy-reading",
    "she-girl-writing",
    "they-boy-girl-running",
    "they-man-woman-eating",
]

LESSON_3_FAMILY_NEW_VOCAB_IDS = [
    "family",
    "baby",
    "babies",
    "child",
    "children",
    "adult",
    "adults",
    "brother",
    "brothers",
    "sister",
    "sisters",
    "father",
    "mother",
    "parents",
    "grandfather",
    "grandmother",
    "grandparents",
]

LESSON_3_FAMILY_GROUPS = [
    ["baby", "babies", "child", "children"],
    ["brother", "brothers", "sister", "sisters"],
    ["adult", "adults", "child", "children"],
    ["parents", "grandparents", "father", "mother"],
    ["father", "mother", "grandfather", "grandmother"],
]

LESSON_3_PRONUNCIATION_IDS = [
    "baby",
    "children",
    "brother",
    "sister",
    "parents",
    "grandparents",
]

LESSON_3_FAMILY_PRACTICE_IDS = [
    "family",
    "baby",
    "babies",
    "child",
    "children",
    "adult",
    "adults",
    "brother",
    "sister",
    "father",
    "mother",
    "parents",
    "grandparents",
]

LESSON_3_GRAMMAR_SPECS = [
    ("A baby ___ sleeping.", "is", "A baby is sleeping.", "family_baby_sleeping.png"),
    ("Children ___ playing.", "are", "Children are playing.", "family_children_playing.png"),
    ("A father ___ working.", "is", "A father is working.", "family_father_working.png"),
    ("Parents ___ talking.", "are", "Parents are talking.", "family_parents_talking.png"),
    ("A grandfather ___ sitting.", "is", "A grandfather is sitting.", "family_grandfather.png"),
    ("Grandparents ___ sitting.", "are", "Grandparents are sitting.", "family_grandparents_sitting.png"),
]

LESSON_4_ACTION_VOCAB = [
    ("playing", "Playing", "family_children_playing.png"),
    ("working", "Working", "family_father_working.png"),
    ("talking", "Talking", "family_parents_talking.png"),
    ("cooking", "Cooking", "family_mother_cooking.png"),
    ("studying", "Studying", "family_brother_studying.png"),
    ("sitting", "Sitting", "family_grandparents_sitting.png"),
]

LESSON_4_ACTION_SPECS = [
    ("adults-playing", "The adults are playing."),
    ("grandparents-talking", "The grandparents are talking."),
    ("parents-talking", "The parents are talking."),
    ("grandparents-sitting", "The grandparents are sitting."),
    ("father-working", "The father is working."),
    ("mother-cooking", "The mother is cooking."),
    ("children-playing", "The children are playing."),
    ("children-studying", "The children are studying."),
    ("brother-studying", "The brother is studying."),
    ("sister-reading", "The sister is reading."),
]

LESSON_4_PRONUNCIATION_IDS = [
    "adults-playing",
    "grandparents-talking",
    "father-working",
    "mother-cooking",
    "children-studying",
    "brother-studying",
]


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


def family_image(person: str) -> str:
    return FAMILY_PEOPLE[person]["image"]


def family_practice_image(option_id: str) -> str:
    return FAMILY_PRACTICE_IMAGES[option_id]


def place_image(option_id: str) -> str:
    return PLACES_AROUND_ME[option_id]["image"]


def place_choice(option_id: str, label: str | None = None) -> ChoiceOption:
    return ChoiceOption(
        id=option_id,
        image_url=image_url(place_image(option_id)),
        label=label or PLACES_AROUND_ME[option_id]["label"],
    )


def person_choice(person: str, label: str | None = None) -> ChoiceOption:
    return ChoiceOption(
        id=person,
        image_url=image_url(portrait_image(person)),
        label=label or PEOPLE[person]["label"],
    )


def action_card_id(person: str, action: str) -> str:
    return f"{person}-{action}"


def parse_action_card_id(option_id: str) -> tuple[str, str]:
    person, action = option_id.split("-", 1)
    return person, action


def action_sentence(person: str, action: str) -> str:
    return f"{PEOPLE[person]['label']} is {action}."


def action_choice(option_id: str, label: str | None = None) -> ChoiceOption:
    person, action = parse_action_card_id(option_id)
    return ChoiceOption(
        id=option_id,
        image_url=image_url(person_image(person, action)),
        label=label or action_sentence(person, action),
    )


def text_choice(option_id: str, label: str) -> ChoiceOption:
    return ChoiceOption(id=option_id, label=label)


def people_action_cards() -> list[LessonCard]:
    return [
        *people_new_vocab_cards(),
        *people_meaning_practice_cards(),
        *people_listen_cards(),
        *people_pronunciation_cards(),
        *people_plural_intro_cards(),
        *people_grammar_cards(),
    ]


def people_new_vocab_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for person in PEOPLE_IN_ORDER:
        cards.append(
            LessonCard(
                prompt=PEOPLE[person]["label"],
                stage="New Vocab",
                correct_option_id=person,
                options=[person_choice(person)],
                audio_text=PEOPLE[person]["label"],
            )
        )

    return cards


def people_meaning_practice_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for index, (person, action) in enumerate(LESSON_1_SENTENCE_PAIRS, 1):
        correct_id = action_card_id(person, action)
        group = next(group for group in LESSON_1_RECOGNITION_GROUPS if correct_id in group)
        option_ids = stable_shuffle(group, f"people-meaning-{index}-{correct_id}")
        sentence = action_sentence(person, action)
        cards.append(
            LessonCard(
                prompt=sentence,
                stage="Meaning Practice",
                correct_option_id=correct_id,
                options=[action_choice(option_id, "") for option_id in option_ids],
                audio_text=sentence,
            )
        )

    return cards


def people_listen_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for group_index, group in enumerate(LESSON_1_RECOGNITION_GROUPS, 1):
        for correct_id in group:
            person, action = parse_action_card_id(correct_id)
            option_ids = stable_shuffle(group, f"people-listen-{group_index}-{correct_id}")
            cards.append(
                LessonCard(
                    prompt="Listen and choose.",
                    stage="Listen",
                    correct_option_id=correct_id,
                    options=[action_choice(option_id, "") for option_id in option_ids],
                    audio_text=action_sentence(person, action),
                )
            )

    return stable_shuffle_cards(cards, "people-listen")


def people_pronunciation_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for option_id in LESSON_1_PRONUNCIATION_IDS:
        person, action = parse_action_card_id(option_id)
        sentence = action_sentence(person, action)
        cards.append(
            LessonCard(
                prompt=sentence,
                stage="Pronunciation Practice",
                correct_option_id=option_id,
                options=[action_choice(option_id, sentence)],
                audio_text=sentence,
            )
        )

    return cards


def people_plural_intro_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for spec in LESSON_1_PLURAL_SENTENCES:
        cards.append(
            LessonCard(
                prompt=spec["prompt"],
                stage="More People",
                correct_option_id=spec["id"],
                options=[
                    ChoiceOption(
                        id=spec["id"],
                        image_url=image_url(spec["image"]),
                        label=spec["prompt"],
                    )
                ],
                audio_text=spec["prompt"],
            )
        )

    return cards


def people_grammar_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for spec in stable_shuffle_cards(LESSON_1_GRAMMAR_SPECS, "people-grammar-card-order"):
        options = stable_shuffle(["is", "are"], f"people-grammar-{spec['id']}")
        cards.append(
            LessonCard(
                prompt=spec["prompt"],
                stage="Grammar",
                correct_option_id=spec["answer"],
                options=[text_choice(option, option) for option in options],
                audio_text="",
                answer_audio_text=spec["sentence"],
                prompt_image_url=image_url(spec["image"]),
            )
        )

    return cards


def image_choice(option_id: str, image_name: str, label: str = "") -> ChoiceOption:
    return ChoiceOption(id=option_id, image_url=image_url(image_name), label=label)


def sentence_spec_choice(spec: tuple[str, str, str], label: str = "") -> ChoiceOption:
    option_id, sentence, image_name = spec
    return image_choice(option_id, image_name, label or sentence)


def lesson_2_pronoun_cards() -> list[LessonCard]:
    return [
        *lesson_2_new_vocab_cards(),
        *lesson_2_meaning_cards(),
        *lesson_2_listen_cards(),
        *lesson_2_pronunciation_cards(),
        *lesson_2_grammar_cards(),
    ]


def lesson_2_new_vocab_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt=label,
            stage="New Vocab",
            correct_option_id=option_id,
            options=[image_choice(option_id, image_name, label)],
            audio_text=label,
        )
        for option_id, label, image_name in LESSON_2_PRONOUN_VOCAB
    ]


def lesson_2_meaning_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    for index, correct_spec in enumerate(LESSON_2_SENTENCE_SPECS, 1):
        correct_id, sentence, _image_name = correct_spec
        option_specs = stable_shuffle_cards(LESSON_2_SENTENCE_SPECS, f"lesson-2-meaning-{index}-{correct_id}")[:4]
        if correct_spec not in option_specs:
            option_specs[-1] = correct_spec
        option_specs = stable_shuffle_cards(option_specs, f"lesson-2-meaning-final-{index}-{correct_id}")
        cards.append(
            LessonCard(
                prompt=sentence,
                stage="Meaning Practice",
                correct_option_id=correct_id,
                options=[sentence_spec_choice(spec, "") for spec in option_specs],
                audio_text=sentence,
            )
        )
    return cards


def lesson_2_listen_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    for index, correct_spec in enumerate(LESSON_2_SENTENCE_SPECS, 1):
        correct_id, sentence, _image_name = correct_spec
        option_specs = stable_shuffle_cards(LESSON_2_SENTENCE_SPECS, f"lesson-2-listen-{index}-{correct_id}")[:4]
        if correct_spec not in option_specs:
            option_specs[-1] = correct_spec
        option_specs = stable_shuffle_cards(option_specs, f"lesson-2-listen-final-{index}-{correct_id}")
        cards.append(
            LessonCard(
                prompt="Listen and choose.",
                stage="Listen",
                correct_option_id=correct_id,
                options=[sentence_spec_choice(spec, "") for spec in option_specs],
                audio_text=sentence,
            )
        )
    return stable_shuffle_cards(cards, "lesson-2-listen-order")


def lesson_2_pronunciation_cards() -> list[LessonCard]:
    specs_by_id = {option_id: (option_id, sentence, image_name) for option_id, sentence, image_name in LESSON_2_SENTENCE_SPECS}
    cards: list[LessonCard] = []
    for option_id in LESSON_2_PRONUNCIATION_IDS:
        spec = specs_by_id[option_id]
        _id, sentence, _image_name = spec
        cards.append(
            LessonCard(
                prompt=sentence,
                stage="Pronunciation Practice",
                correct_option_id=option_id,
                options=[sentence_spec_choice(spec, sentence)],
                audio_text=sentence,
            )
        )
    return cards


def lesson_2_grammar_cards() -> list[LessonCard]:
    specs = [
        ("He ___ reading.", "is", "He is reading.", "boy_is_reading.png"),
        ("She ___ writing.", "is", "She is writing.", "girl_is_writing.png"),
        ("They ___ running.", "are", "They are running.", "they_boy_girl_are_running.png"),
        ("They ___ eating.", "are", "They are eating.", "they_man_woman_are_eating.png"),
        ("He ___ walking.", "is", "He is walking.", "man_is_walking.png"),
        ("They ___ writing.", "are", "They are writing.", "they_girl_woman_are_writing.png"),
    ]
    cards: list[LessonCard] = []
    for index, (prompt, answer, sentence, image_name) in enumerate(stable_shuffle_cards(specs, "lesson-2-grammar-order"), 1):
        options = stable_shuffle(["is", "are"], f"lesson-2-grammar-{index}-{answer}")
        cards.append(
            LessonCard(
                prompt=prompt,
                stage="Grammar",
                correct_option_id=answer,
                options=[text_choice(option, option) for option in options],
                audio_text="",
                answer_audio_text=sentence,
                prompt_image_url=image_url(image_name),
            )
        )
    return cards


def family_choice(option_id: str, label: str | None = None) -> ChoiceOption:
    return ChoiceOption(
        id=option_id,
        image_url=image_url(family_image(option_id)),
        label=label or FAMILY_PEOPLE[option_id]["label"],
    )


def family_member_cards() -> list[LessonCard]:
    return [
        *family_member_new_vocab_cards(),
        *family_member_meaning_cards(),
        *family_member_listen_cards(),
        *family_member_pronunciation_cards(),
        *family_member_grammar_cards(),
    ]


def family_member_new_vocab_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt=FAMILY_PEOPLE[option_id]["label"],
            stage="New Vocab",
            correct_option_id=option_id,
            options=[family_choice(option_id)],
            audio_text=FAMILY_PEOPLE[option_id]["label"],
        )
        for option_id in LESSON_3_FAMILY_NEW_VOCAB_IDS
    ]


def family_member_meaning_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    for index, correct_id in enumerate(LESSON_3_FAMILY_PRACTICE_IDS, 1):
        group = next((group for group in LESSON_3_FAMILY_GROUPS if correct_id in group), [correct_id])
        option_ids = stable_shuffle(group, f"family-member-meaning-{index}-{correct_id}")
        cards.append(
            LessonCard(
                prompt=FAMILY_PEOPLE[correct_id]["label"],
                stage="Meaning Practice",
                correct_option_id=correct_id,
                options=[family_choice(option_id, "") for option_id in option_ids],
                audio_text=FAMILY_PEOPLE[correct_id]["label"],
            )
        )
    return stable_shuffle_cards(cards, "family-member-meaning-order")


def family_member_listen_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    for index, correct_id in enumerate(LESSON_3_FAMILY_PRACTICE_IDS, 1):
        group = next((group for group in LESSON_3_FAMILY_GROUPS if correct_id in group), [correct_id])
        option_ids = stable_shuffle(group, f"family-member-listen-{index}-{correct_id}")
        cards.append(
            LessonCard(
                prompt="Listen and choose.",
                stage="Listen",
                correct_option_id=correct_id,
                options=[family_choice(option_id, "") for option_id in option_ids],
                audio_text=FAMILY_PEOPLE[correct_id]["label"],
            )
        )
    return stable_shuffle_cards(cards, "family-member-listen-order")


def family_member_pronunciation_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt=FAMILY_PEOPLE[option_id]["label"],
            stage="Pronunciation Practice",
            correct_option_id=option_id,
            options=[family_choice(option_id, FAMILY_PEOPLE[option_id]["label"])],
            audio_text=FAMILY_PEOPLE[option_id]["label"],
        )
        for option_id in LESSON_3_PRONUNCIATION_IDS
    ]


def family_member_grammar_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    for index, (prompt, answer, sentence, image_name) in enumerate(stable_shuffle_cards(LESSON_3_GRAMMAR_SPECS, "family-grammar-order"), 1):
        options = stable_shuffle(["is", "are"], f"family-member-grammar-{index}-{answer}")
        cards.append(
            LessonCard(
                prompt=prompt,
                stage="Grammar",
                correct_option_id=answer,
                options=[text_choice(option, option) for option in options],
                audio_text="",
                answer_audio_text=sentence,
                prompt_image_url=image_url(image_name),
            )
        )
    return cards


def family_action_cards() -> list[LessonCard]:
    return [
        *family_action_new_vocab_cards(),
        *family_action_meaning_cards(),
        *family_action_listen_cards(),
        *family_action_pronunciation_cards(),
        *family_action_grammar_cards(),
    ]


def family_action_new_vocab_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt=label,
            stage="New Vocab",
            correct_option_id=option_id,
            options=[image_choice(option_id, image_name, label)],
            audio_text=label,
        )
        for option_id, label, image_name in LESSON_4_ACTION_VOCAB
    ]


def family_action_meaning_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    specs = [(option_id, sentence, family_practice_image(option_id)) for option_id, sentence in LESSON_4_ACTION_SPECS]
    for index, correct_spec in enumerate(specs, 1):
        correct_id, sentence, _image_name = correct_spec
        option_specs = stable_shuffle_cards(specs, f"family-action-meaning-{index}-{correct_id}")[:4]
        if correct_spec not in option_specs:
            option_specs[-1] = correct_spec
        option_specs = stable_shuffle_cards(option_specs, f"family-action-meaning-final-{index}-{correct_id}")
        cards.append(
            LessonCard(
                prompt=sentence,
                stage="Meaning Practice",
                correct_option_id=correct_id,
                options=[sentence_spec_choice(spec, "") for spec in option_specs],
                audio_text=sentence,
            )
        )
    return cards


def family_action_listen_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []
    specs = [(option_id, sentence, family_practice_image(option_id)) for option_id, sentence in LESSON_4_ACTION_SPECS]
    for index, correct_spec in enumerate(specs, 1):
        correct_id, sentence, _image_name = correct_spec
        option_specs = stable_shuffle_cards(specs, f"family-action-listen-{index}-{correct_id}")[:4]
        if correct_spec not in option_specs:
            option_specs[-1] = correct_spec
        option_specs = stable_shuffle_cards(option_specs, f"family-action-listen-final-{index}-{correct_id}")
        cards.append(
            LessonCard(
                prompt="Listen and choose.",
                stage="Listen",
                correct_option_id=correct_id,
                options=[sentence_spec_choice(spec, "") for spec in option_specs],
                audio_text=sentence,
            )
        )
    return stable_shuffle_cards(cards, "family-action-listen-order")


def family_action_pronunciation_cards() -> list[LessonCard]:
    specs_by_id = {
        option_id: (option_id, sentence, family_practice_image(option_id))
        for option_id, sentence in LESSON_4_ACTION_SPECS
    }
    cards: list[LessonCard] = []
    for option_id in LESSON_4_PRONUNCIATION_IDS:
        spec = specs_by_id[option_id]
        _id, sentence, _image_name = spec
        cards.append(
            LessonCard(
                prompt=sentence,
                stage="Pronunciation Practice",
                correct_option_id=option_id,
                options=[sentence_spec_choice(spec, sentence)],
                audio_text=sentence,
            )
        )
    return cards


def family_action_grammar_cards() -> list[LessonCard]:
    specs = [
        ("The father ___ working.", "is", "The father is working.", "family_father_working.png"),
        ("The mother ___ cooking.", "is", "The mother is cooking.", "family_mother_cooking.png"),
        ("The children ___ playing.", "are", "The children are playing.", "family_children_playing.png"),
        ("The parents ___ talking.", "are", "The parents are talking.", "family_parents_talking.png"),
        ("The brother ___ studying.", "is", "The brother is studying.", "family_brother_studying.png"),
        ("The grandparents ___ sitting.", "are", "The grandparents are sitting.", "family_grandparents_sitting.png"),
    ]
    cards: list[LessonCard] = []
    for index, (prompt, answer, sentence, image_name) in enumerate(stable_shuffle_cards(specs, "family-action-grammar-order"), 1):
        options = stable_shuffle(["is", "are"], f"family-action-grammar-{index}-{answer}")
        cards.append(
            LessonCard(
                prompt=prompt,
                stage="Grammar",
                correct_option_id=answer,
                options=[text_choice(option, option) for option in options],
                audio_text="",
                answer_audio_text=sentence,
                prompt_image_url=image_url(image_name),
            )
        )
    return cards


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

    for person, action in LESSON_1_ACTION_PAIRS:
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

    for person, action in LESSON_1_ACTION_PAIRS:
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


def family_vocabulary_cards() -> list[LessonCard]:
    intro_pairs = [
        ("baby", "babies"),
        ("child", "children"),
        ("adult", "adults"),
        ("brother", "brothers"),
        ("sister", "sisters"),
        ("father", "mother"),
        ("parents", "grandparents"),
        ("grandfather", "grandmother"),
    ]

    cards: list[LessonCard] = []
    for first_id, second_id in intro_pairs:
        for correct_id in (first_id, second_id):
            option_ids = stable_shuffle([first_id, second_id], f"family-intro-{correct_id}")
            cards.append(
                LessonCard(
                    prompt=FAMILY_PEOPLE[correct_id]["label"],
                    stage="Family",
                    correct_option_id=correct_id,
                    options=[
                        ChoiceOption(id=option_id, image_url=image_url(family_image(option_id)))
                        for option_id in option_ids
                    ],
                )
            )

    return cards


def family_context_cards() -> list[LessonCard]:
    return [
        LessonCard(
            prompt=FAMILY_PEOPLE["family"]["label"],
            stage="Family",
            correct_option_id="family",
            options=[
                ChoiceOption(id="family", image_url=image_url(family_image("family"))),
            ],
        )
    ]


def family_vocabulary_challenge_cards() -> list[LessonCard]:
    card_specs = [
        ("baby", ["baby", "babies", "adult", "adults"]),
        ("babies", ["babies", "baby", "adult", "adults"]),
        ("child", ["child", "children", "adult", "adults"]),
        ("children", ["children", "child", "adult", "adults"]),
        ("adult", ["adult", "adults", "child", "children"]),
        ("adults", ["adults", "adult", "child", "children"]),
        ("brother", ["brother", "sister", "father", "mother"]),
        ("brothers", ["brothers", "sisters", "parents", "grandparents"]),
        ("sister", ["sister", "brother", "mother", "father"]),
        ("sisters", ["sisters", "brothers", "parents", "grandparents"]),
        ("father", ["father", "mother", "grandfather", "grandmother"]),
        ("mother", ["mother", "father", "grandmother", "grandfather"]),
        ("parents", ["parents", "grandparents", "children", "babies"]),
        ("grandfather", ["grandfather", "grandmother", "father", "mother"]),
        ("grandmother", ["grandmother", "grandfather", "mother", "father"]),
        ("grandparents", ["grandparents", "parents", "children", "babies"]),
    ]

    cards: list[LessonCard] = []
    for correct_id, option_ids in card_specs:
        shuffled_options = stable_shuffle(option_ids, f"family-challenge-{correct_id}")
        cards.append(
            LessonCard(
                prompt=FAMILY_PEOPLE[correct_id]["label"],
                stage="Family Challenge",
                correct_option_id=correct_id,
                options=[
                    ChoiceOption(id=option_id, image_url=image_url(family_image(option_id)))
                    for option_id in shuffled_options
                ],
            )
        )

    return cards


def family_sentence_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for correct_id, action in FAMILY_ACTIONS.items():
        option_ids = stable_shuffle(
            [correct_id, *action["distractors"]],
            f"family-sentence-{correct_id}",
        )
        cards.append(
            LessonCard(
                prompt=action["prompt"],
                stage=action["stage"],
                correct_option_id=correct_id,
                options=[
                    ChoiceOption(
                        id=option_id,
                        image_url=image_url(FAMILY_ACTIONS[option_id]["image"]),
                    )
                    for option_id in option_ids
                ],
            )
        )

    return cards


def family_action_practice_cards() -> list[LessonCard]:
    card_specs = [
        ("They are a family.", "family", ["family", "adults-playing", "children-playing", "baby-sleeping"]),
        ("He is an adult.", "adult-man", ["adult-man", "child-boy", "baby", "children"]),
        ("She is an adult.", "adult-woman", ["adult-woman", "child-girl", "baby", "children"]),
        ("They are adults.", "adults", ["adults", "children", "babies", "family"]),
        ("The boy is a child.", "child-boy", ["child-boy", "adult-man", "baby", "adults"]),
        ("The girl is a child.", "child-girl", ["child-girl", "adult-woman", "baby", "adults"]),
        ("They are children.", "children", ["children", "adult-pair", "baby", "babies"]),
        ("They are parents.", "parents", ["parents", "grandparents", "children", "babies"]),
        ("They are grandparents.", "grandparents", ["grandparents", "parents", "children", "babies"]),
        ("He is a father.", "father", ["father", "mother", "brother", "baby"]),
        ("She is a mother.", "mother", ["mother", "father", "sister", "baby"]),
        ("He is a grandfather.", "grandfather", ["grandfather", "grandmother", "father", "brother"]),
        ("She is a grandmother.", "grandmother", ["grandmother", "grandfather", "mother", "sister"]),
        ("He is a brother.", "brother", ["brother", "father", "grandfather", "baby"]),
        ("She is a sister.", "sister", ["sister", "mother", "grandmother", "baby"]),
        ("The adults are playing.", "adults-playing", ["adults-playing", "parents-talking", "father-working", "mother-cooking"]),
        (
            "The grandparents are talking.",
            "grandparents-talking",
            ["grandparents-talking", "grandparents-sitting", "parents-talking", "children-playing"],
        ),
        ("The parents are talking.", "parents-talking", ["parents-talking", "grandparents-talking", "adults-playing", "children-playing"]),
        (
            "The grandparents are sitting.",
            "grandparents-sitting",
            ["grandparents-sitting", "grandparents-talking", "parents-talking", "children-playing"],
        ),
        ("The father is working.", "father-working", ["father-working", "mother-cooking", "adults-playing", "parents-talking"]),
        ("The father is talking.", "father-talking", ["father-talking", "father-working", "mother-talking", "mother-cooking"]),
        ("The mother is cooking.", "mother-cooking", ["mother-cooking", "father-working", "parents-talking", "adults-playing"]),
        ("The mother is talking.", "mother-talking", ["mother-talking", "mother-cooking", "father-talking", "father-working"]),
        ("The baby is sleeping.", "baby-sleeping", ["baby-sleeping", "children-playing", "adults-playing", "mother-cooking"]),
        ("The children are playing.", "children-playing", ["children-playing", "adults-playing", "baby-sleeping", "parents-talking"]),
        ("The children are studying.", "children-studying", ["children-studying", "children-playing", "adults-playing", "baby-sleeping"]),
        ("The brother is studying.", "brother-studying", ["brother-studying", "sister-reading", "children-playing", "father-working"]),
        ("The brother is playing.", "brother-playing", ["brother-playing", "brother-studying", "sister-playing", "sister-reading"]),
        ("The sister is reading.", "sister-reading", ["sister-reading", "brother-studying", "mother-cooking", "children-playing"]),
        ("The sister is playing.", "sister-playing", ["sister-playing", "sister-reading", "brother-playing", "brother-studying"]),
    ]

    cards: list[LessonCard] = []
    for prompt, correct_id, option_ids in card_specs:
        shuffled_options = stable_shuffle(option_ids, f"family-action-practice-{prompt}")
        cards.append(
            LessonCard(
                prompt=prompt,
                stage="Family Action Practice",
                correct_option_id=correct_id,
                options=[
                    ChoiceOption(id=option_id, image_url=image_url(family_practice_image(option_id)))
                    for option_id in shuffled_options
                ],
            )
        )

    return cards


def object_place_cards() -> list[LessonCard]:
    return [
        *place_new_word_cards(),
        *place_sentence_learning_cards(),
        *place_picture_to_text_cards(),
        *place_listen_to_picture_cards(),
        *place_pronunciation_cards(),
        *place_grammar_cards(),
    ]


def place_new_word_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for option_id in PLACE_IDS:
        item = PLACES_AROUND_ME[option_id]
        cards.append(
            LessonCard(
                prompt=item["label"],
                stage="New Words",
                correct_option_id=option_id,
                options=[place_choice(option_id)],
                audio_text=item["label"],
            )
        )

    return cards


def place_sentence_learning_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for option_id in PLACE_IDS:
        item = PLACES_AROUND_ME[option_id]
        cards.append(
            LessonCard(
                prompt=item["sentence"],
                stage="What Is It?",
                correct_option_id=option_id,
                options=[place_choice(option_id, item["sentence"])],
                audio_text=item["sentence"],
            )
        )

    return cards


def place_picture_to_text_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for group_index, group in enumerate(PLACE_RECOGNITION_GROUPS, 1):
        for correct_id in group:
            item = PLACES_AROUND_ME[correct_id]
            option_ids = stable_shuffle(group, f"place-picture-text-{group_index}-{correct_id}")
            cards.append(
                LessonCard(
                    prompt="What is it?",
                    stage="Picture To Text",
                    correct_option_id=correct_id,
                    options=[
                        text_choice(option_id, PLACES_AROUND_ME[option_id]["sentence"])
                        for option_id in option_ids
                    ],
                    audio_text="What is it?",
                    answer_audio_text=item["sentence"],
                    prompt_image_url=image_url(place_image(correct_id)),
                )
            )

    return stable_shuffle_cards(cards, "place-picture-to-text")


def place_listen_to_picture_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for group_index, group in enumerate(PLACE_RECOGNITION_GROUPS, 1):
        for correct_id in group:
            item = PLACES_AROUND_ME[correct_id]
            option_ids = stable_shuffle(group, f"place-listen-picture-{group_index}-{correct_id}")
            cards.append(
                LessonCard(
                    prompt="What is it?",
                    stage="Listen To Picture",
                    correct_option_id=correct_id,
                    options=[place_choice(option_id, "") for option_id in option_ids],
                    audio_text=item["sentence"],
                )
            )

    return stable_shuffle_cards(cards, "place-listen-to-picture")


def place_pronunciation_cards() -> list[LessonCard]:
    cards: list[LessonCard] = []

    for option_id in PLACE_PRONUNCIATION_IDS:
        item = PLACES_AROUND_ME[option_id]
        cards.append(
            LessonCard(
                prompt=item["sentence"],
                stage="Pronunciation Practice",
                correct_option_id=option_id,
                options=[place_choice(option_id, item["sentence"])],
                audio_text=item["sentence"],
            )
        )

    return cards


def place_grammar_cards() -> list[LessonCard]:
    grammar_specs = [
        ("What ___ it?", "is", ["is", "are"], "What is it?", "park"),
        ("___ is a school.", "It", ["It", "What"], "It is a school.", "school"),
        ("It ___ a bridge.", "is", ["is", "are"], "It is a bridge.", "bridge"),
        ("What is ___?", "it", ["it", "a"], "What is it?", "store"),
        ("It is ___ park.", "a", ["a", "an"], "It is a park.", "park"),
        ("It is ___ building.", "a", ["a", "an"], "It is a building.", "building"),
    ]
    cards: list[LessonCard] = []
    for index, (prompt, answer, choices, sentence, place_id) in enumerate(grammar_specs, 1):
        shuffled_choices = stable_shuffle(choices, f"place-grammar-{index}-{answer}")
        cards.append(
            LessonCard(
                prompt=prompt,
                stage="Grammar",
                correct_option_id=answer,
                options=[text_choice(choice, choice) for choice in shuffled_choices],
                audio_text="",
                answer_audio_text=sentence,
                prompt_image_url=image_url(place_image(place_id)),
            )
        )
    return cards


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
    cards=people_action_cards(),
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
    cards=lesson_2_pronoun_cards(),
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

LESSON_4 = Lesson(
    id="lesson-4-family-members",
    title="1.3 Family Members",
    level="Beginner A1",
    unit_id="unit-1",
    unit_title="Unit 1: People, Actions, And Basic Sentences",
    lesson_id="lesson-1",
    lesson_title="Lesson 1: People and Pronouns",
    sub_lesson_id="1.3",
    sub_lesson_title="Family Members",
    goal="Recognize close family members and a few natural family action sentences.",
    vocabulary=[
        "a",
        "an",
        "baby",
        "babies",
        "child",
        "children",
        "adult",
        "adults",
        "family",
        "brother",
        "brothers",
        "sister",
        "sisters",
        "father",
        "mother",
        "parents",
        "grandfather",
        "grandmother",
        "grandparents",
        "playing",
        "working",
        "cooking",
        "talking",
        "studying",
        "sleeping",
        "reading",
        "sitting",
    ],
    cards=family_member_cards(),
)

LESSON_5 = Lesson(
    id="lesson-5-family-action-practice",
    title="1.4 Family Action Practice",
    level="Beginner A1",
    unit_id="unit-1",
    unit_title="Unit 1: People, Actions, And Basic Sentences",
    lesson_id="lesson-1",
    lesson_title="Lesson 1: People and Pronouns",
    sub_lesson_id="1.4",
    sub_lesson_title="Family Action Practice",
    goal="Practice short family sentences with adult, child, children, and common family actions.",
    vocabulary=[
        "a",
        "an",
        "the",
        "he",
        "she",
        "they",
        "family",
        "adult",
        "adults",
        "child",
        "children",
        "boy",
        "girl",
        "parents",
        "grandparents",
        "father",
        "mother",
        "brother",
        "sister",
        "playing",
        "talking",
        "sitting",
        "working",
        "cooking",
        "sleeping",
        "studying",
        "reading",
    ],
    cards=family_action_cards(),
)

LESSON_6 = Lesson(
    id="lesson-6-objects-places",
    title="1.5 Places Around Me",
    level="Beginner A1",
    unit_id="unit-1",
    unit_title="Unit 1: People, Actions, And Basic Sentences",
    lesson_id="lesson-1",
    lesson_title="Lesson 1: People and Pronouns",
    sub_lesson_id="1.5",
    sub_lesson_title="Places Around Me",
    goal="Recognize common outdoor places and answer the question: What is it?",
    vocabulary=[
        "a",
        "what",
        "it",
        "is",
        "park",
        "house",
        "school",
        "street",
        "bridge",
        "store",
        "building",
        "car",
        "bike",
        "bus",
    ],
    cards=object_place_cards(),
)


LESSONS = {
    LESSON_1.id: LESSON_1,
    LESSON_2.id: LESSON_2,
    LESSON_4.id: LESSON_4,
    LESSON_5.id: LESSON_5,
    LESSON_6.id: LESSON_6,
}
