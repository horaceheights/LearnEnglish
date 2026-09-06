import json
import re
import unittest
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import urlparse

from backend.app.data import LESSON_IMAGE_DIR, LESSONS
from scripts.validate_lesson_cards import (
    MISSION_BOARD_INTERACTIONS,
    MISSION_COMPLETION_INTERACTIONS,
    validate_family_adult_ambiguity,
    validate_mission_contracts,
)


STAGES = ["Learn", "Recognize", "Listen", "Speak", "Use"]
UNIT_1_IDS = [
    "lesson-1-people-actions",
    "lesson-2-pronouns",
    "lesson-3-two-people",
    "lesson-4-children-siblings",
    "lesson-5-parents-grandparents",
    "lesson-6-family-actions",
    "lesson-7-is-are-not",
    "lesson-8-who",
    "lesson-9-unit-review",
    "lesson-10-family-mission",
]
EXPECTED_TITLES = [
    "Meet the People",
    "People in Action",
    "Two People: They and Are",
    "Children and Siblings",
    "Parents and Grandparents",
    "Family Actions",
    "What They Are Not Doing",
    "Who Is He? Who Are They?",
    "Unit 1 Story Review",
    "People in Action Mission",
]
EXPECTED_VOCABULARY = {
    "lesson-1-people-actions": {
        "a", "boy", "girl", "man", "woman", "he", "she", "is",
    },
    "lesson-2-pronouns": {"the", "eating", "drinking", "reading", "writing"},
    "lesson-3-two-people": {"and", "they", "are", "running", "sitting", "swimming", "sleeping"},
    "lesson-4-children-siblings": {
        "family", "baby", "babies", "child", "children",
        "brother", "brothers", "sister", "sisters",
    },
    "lesson-5-parents-grandparents": {
        "an", "adult", "adults", "father", "mother", "parents",
        "grandfather", "grandmother", "grandparents", "grandchildren",
    },
    "lesson-6-family-actions": {"playing", "studying", "working", "cooking", "talking"},
    "lesson-7-is-are-not": {"not"},
    "lesson-8-who": {"who"},
    "lesson-9-unit-review": set(),
    "lesson-10-family-mission": set(),
}
EXPECTED_STAGE_COUNTS = {
    "lesson-1-people-actions": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-2-pronouns": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-3-two-people": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-4-children-siblings": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-5-parents-grandparents": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-6-family-actions": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-7-is-are-not": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-8-who": {"Learn": 10, "Recognize": 10, "Listen": 10, "Speak": 10, "Use": 10},
    "lesson-9-unit-review": {"Learn": 14, "Recognize": 14, "Listen": 10, "Speak": 8, "Use": 8},
}
UNIT_ONE_GOLD = [
    "a", "boy", "girl", "man", "woman", "he", "she", "is", "the",
    "eating", "drinking", "reading", "writing", "and", "they", "are",
    "running", "sitting", "swimming", "sleeping", "family", "baby",
    "babies", "child", "children", "brother", "brothers", "sister",
    "sisters", "an", "adult", "adults", "father", "mother", "parents",
    "grandfather", "grandmother", "grandparents", "grandchildren", "playing",
    "studying", "working", "cooking", "talking", "not", "who",
]
MISSION_CHAPTERS = (
    ["casting-call"] * 5
    + ["build-the-cast"] * 8
    + ["shoot-and-edit"] * 7
    + ["record-and-premiere"] * 2
)
MISSION_STAGES = [
    "Use", "Learn", "Recognize", "Recognize", "Use", "Recognize", "Recognize", "Use",
    "Use", "Listen", "Use", "Speak", "Recognize", "Use", "Listen",
    "Use", "Listen", "Recognize", "Listen", "Use", "Speak", "Use",
]
MISSION_INTERACTION_SEQUENCE = [
    "mission-unlock",
    "mission-match",
    "mission-clue",
    "mission-match",
    "mission-truth-stamp",
    "mission-match",
    "mission-match",
    "mission-sentence",
    "mission-sentence",
    "mission-listen",
    "mission-sentence",
    "mission-speak",
    "mission-clue",
    "mission-match",
    "mission-listen",
    "mission-match",
    "mission-listen",
    "mission-clue",
    "mission-match",
    "mission-truth-stamp",
    "mission-speak",
    "mission-finale",
]
MISSION_VISUAL_KEYS = [
    "a1_u1_studio_01_clapperboard",
    "a1_u1_studio_02_people_casting",
    "a1_u1_studio_03_pronoun_marks",
    "a1_u1_studio_04_young_cast",
    "a1_u1_studio_05_adult_cast",
    "a1_u1_studio_06_parent_roles",
    "a1_u1_studio_07_generation_roles",
    "a1_u1_studio_08_title_card",
    "a1_u1_studio_09_who_father",
    "a1_u1_studio_10_who_mother",
    "a1_u1_studio_11_who_parents",
    "a1_u1_studio_12_who_children",
    "a1_u1_studio_13_who_grandparents",
    "a1_u1_studio_14_eating_drinking",
    "a1_u1_studio_15_reading_writing",
    "a1_u1_studio_16_running_sitting",
    "a1_u1_studio_17_swimming_sleeping",
    "a1_u1_studio_18_playing_studying",
    "a1_u1_studio_19_work_cook_talk",
    "a1_u1_studio_20_not_continuity",
    "a1_u1_studio_21_final_question",
    "a1_u1_studio_22_premiere",
]
MISSION_BOUND_STILLS = {
    1: "a1_u1_studio_01_clapperboard.webp",
    2: "a1_u1_studio_02_people_casting.webp",
    3: "a1_u1_studio_03_pronoun_marks.webp",
    4: "a1_u1_studio_04_young_cast.webp",
    5: "a1_u1_studio_05_adult_cast.webp",
    6: "a1_u1_studio_06_parent_roles.webp",
    7: "a1_u1_studio_07_generation_roles.webp",
    8: "a1_u1_studio_08_title_card.webp",
    9: "a1_u1_studio_09_who_father.webp",
    10: "a1_u1_studio_10_who_mother.webp",
    11: "a1_u1_studio_11_who_parents.webp",
    12: "a1_u1_studio_12_who_children.webp",
    13: "a1_u1_studio_13_who_grandparents.webp",
    14: "a1_u1_studio_14_eating_drinking.webp",
    15: "a1_u1_studio_15_reading_writing.webp",
    16: "a1_u1_studio_16_running_sitting.webp",
    17: "a1_u1_studio_17_swimming_sleeping.webp",
    18: "a1_u1_studio_18_playing_studying.webp",
    19: "a1_u1_studio_19_work_cook_talk.webp",
    20: "a1_u1_studio_20_not_continuity.webp",
    21: "a1_u1_studio_21_final_question.webp",
    22: "a1_u1_studio_22_premiere.webp",
}


def lesson_payload(lesson):
    if hasattr(lesson, "model_dump"):
        payload = lesson.model_dump(mode="json")
    else:
        payload = json.loads(lesson.json())
    for card in payload.get("cards", []):
        if card.get("spanish_translation") is None:
            card.pop("spanish_translation", None)
        if not card.get("correct_option_ids"):
            card.pop("correct_option_ids", None)
        if not card.get("audio_turns"):
            card.pop("audio_turns", None)
        if not card.get("answer_audio_turns"):
            card.pop("answer_audio_turns", None)
    return payload


class LessonStructureTests(unittest.TestCase):
    @staticmethod
    def _semantic_option(option_id, label, image_url=""):
        return SimpleNamespace(id=option_id, label=label, image_url=image_url)

    @staticmethod
    def _semantic_card(
        *,
        prompt,
        options,
        correct_option_id,
        prompt_image_url="",
        audio_text=None,
        answer_audio_text=None,
        interaction_type="choice",
        correct_option_ids=None,
    ):
        return SimpleNamespace(
            prompt=prompt,
            options=options,
            correct_option_id=correct_option_id,
            correct_option_ids=correct_option_ids or [],
            prompt_image_url=prompt_image_url,
            audio_text=audio_text,
            answer_audio_text=answer_audio_text,
            interaction_type=interaction_type,
        )

    @staticmethod
    def _semantic_findings(card):
        lesson = SimpleNamespace(id="synthetic-semantic-card", cards=[card])
        return validate_family_adult_ambiguity({lesson.id: lesson})

    def test_unit_1_follows_the_approved_ten_lesson_roadmap(self):
        unit_1 = [lesson for lesson in LESSONS.values() if lesson.unit_id == "unit-1"]
        self.assertEqual(UNIT_1_IDS, [lesson.id for lesson in unit_1])
        self.assertEqual(
            [f"1.{index}" for index in range(1, 11)],
            [lesson.sub_lesson_id for lesson in unit_1],
        )
        self.assertEqual(EXPECTED_TITLES, [lesson.sub_lesson_title for lesson in unit_1])

    def test_complete_a1_course_has_seven_units_and_ten_lessons_each(self):
        self.assertEqual(70, len(LESSONS))
        for unit in range(1, 8):
            lessons = [lesson for lesson in LESSONS.values() if lesson.unit_id == f"unit-{unit}"]
            with self.subTest(unit=unit):
                self.assertEqual(10, len(lessons))
                self.assertEqual(
                    [f"{unit}.{index}" for index in range(1, 11)],
                    [lesson.sub_lesson_id for lesson in lessons],
                )

    def test_units_2_through_7_have_complete_execution_metadata(self):
        for lesson in LESSONS.values():
            if lesson.unit_id == "unit-1":
                continue
            with self.subTest(lesson=lesson.id):
                self.assertGreaterEqual(len(lesson.cards), 32)
                self.assertLessEqual(len(lesson.cards), 40)
                self.assertTrue(lesson.unit_outcome)
                self.assertTrue(lesson.grammar_function)
                self.assertTrue(lesson.speaking_outcome)
                self.assertTrue(lesson.prerequisite)
                self.assertTrue(lesson.purposeful_review_slides)
                self.assertTrue(all(card.slide_id for card in lesson.cards))
                self.assertTrue(all(card.interaction_type for card in lesson.cards))
                self.assertTrue(all(card.spanish_translation for card in lesson.cards))

    def test_rebuilt_unit_1_lessons_have_complete_execution_metadata(self):
        rebuilt_ids = UNIT_1_IDS[1:]
        for lesson_id in rebuilt_ids:
            lesson = LESSONS[lesson_id]
            with self.subTest(lesson=lesson_id):
                self.assertTrue(lesson.unit_outcome)
                self.assertTrue(lesson.grammar_function)
                self.assertTrue(lesson.speaking_outcome)
                self.assertTrue(lesson.prerequisite)
                self.assertTrue(lesson.purposeful_review_slides)
                self.assertTrue(all(card.slide_id for card in lesson.cards))
                self.assertTrue(all(card.interaction_type for card in lesson.cards))
                self.assertTrue(all(card.spanish_translation for card in lesson.cards))
                self.assertTrue(all(card.pedagogy_note for card in lesson.cards))

    def test_rebuilt_unit_1_stages_preserve_story_order(self):
        for lesson_id in UNIT_1_IDS[1:9]:
            lesson = LESSONS[lesson_id]
            for stage in STAGES:
                beats = []
                for card in lesson.cards:
                    if card.stage != stage:
                        continue
                    match = re.match(r"Story beat (\d+):", card.pedagogy_note)
                    self.assertIsNotNone(match, (lesson_id, stage, card.slide_id))
                    beats.append(int(match.group(1)))
                with self.subTest(lesson=lesson_id, stage=stage):
                    self.assertEqual(list(range(1, len(beats) + 1)), beats)

    def test_new_lessons_do_not_replay_the_previous_lesson_cards(self):
        unit_lessons = [LESSONS[lesson_id] for lesson_id in UNIT_1_IDS[:9]]

        def card_signature(card):
            correct = next(
                option for option in card.options if option.id == card.correct_option_id
            )
            return (
                (card.audio_text or card.answer_audio_text or card.prompt or "").strip().lower(),
                card.prompt_image_url or correct.image_url,
            )

        for previous, current in zip(unit_lessons, unit_lessons[1:]):
            overlap = {
                card_signature(card) for card in previous.cards
            } & {
                card_signature(card) for card in current.cards
            }
            with self.subTest(previous=previous.id, current=current.id):
                self.assertEqual(set(), overlap)

    def test_lesson_1_9_is_a_fresh_comprehensive_review(self):
        review = LESSONS["lesson-9-unit-review"]
        self.assertEqual([], review.vocabulary)

        review_media = {
            urlparse(url).path.rsplit("/", 1)[-1]
            for card in review.cards
            for url in [card.prompt_image_url, *(option.image_url for option in card.options)]
            if url
        }
        earlier_media = {
            urlparse(url).path.rsplit("/", 1)[-1]
            for lesson_id in UNIT_1_IDS[:8]
            for card in LESSONS[lesson_id].cards
            for url in [card.prompt_image_url, *(option.image_url for option in card.options)]
            if url
        }
        self.assertTrue(review_media)
        self.assertTrue(all(name.startswith("a1_u1_review_") for name in review_media))
        self.assertEqual(set(), review_media & earlier_media)

        declared = {
            word.lower()
            for lesson_id in UNIT_1_IDS[:8]
            for word in LESSONS[lesson_id].vocabulary
        }
        review_text = " ".join(
            text
            for card in review.cards
            for text in [
                card.prompt or "",
                card.audio_text or "",
                card.answer_audio_text or "",
                *(option.label or "" for option in card.options),
            ]
        )
        tokens = set(re.findall(r"[a-z]+", review_text.lower()))
        coverage = len(declared & tokens) / len(declared)
        self.assertGreaterEqual(coverage, 0.70)

    def test_lesson_1_10_is_a_distinct_ordered_unit_mastery_mission(self):
        mission = LESSONS["lesson-10-family-mission"]
        self.assertEqual([], mission.vocabulary)
        self.assertEqual("mission", mission.experience_type)
        self.assertEqual(3, mission.content_revision)
        self.assertEqual(22, len(mission.cards))
        self.assertEqual(UNIT_ONE_GOLD, mission.review_vocabulary)
        self.assertEqual(
            ["casting-call", "build-the-cast", "shoot-and-edit", "record-and-premiere"],
            [chapter.id for chapter in mission.mission.chapters],
        )
        self.assertTrue(mission.mission.label)
        self.assertTrue(mission.mission.title)
        self.assertTrue(mission.mission.briefing)
        self.assertLessEqual(len(mission.mission.briefing), 200)
        self.assertTrue(mission.mission.completion_title)
        self.assertTrue(mission.mission.completion_message)
        self.assertEqual(
            [f"M{index:02d}" for index in range(1, 23)],
            [card.slide_id for card in mission.cards],
        )
        self.assertEqual(MISSION_CHAPTERS, [card.mission_chapter_id for card in mission.cards])
        self.assertEqual(MISSION_STAGES, [card.stage for card in mission.cards])
        self.assertEqual(
            MISSION_INTERACTION_SEQUENCE,
            [card.interaction_type for card in mission.cards],
        )

        mission_media = {
            urlparse(url).path.rsplit("/", 1)[-1]
            for card in mission.cards
            for url in [card.prompt_image_url, *(option.image_url for option in card.options)]
            if url
        }
        self.assertFalse(any(name.startswith("a1_u1_album_") for name in mission_media))

        visual_keys = []
        for beat, card in enumerate(mission.cards, 1):
            with self.subTest(beat=beat, slide=card.slide_id):
                self.assertRegex(card.pedagogy_note, rf"^Mission beat {beat:02d}/22:")
                self.assertTrue(card.instruction_es)
                self.assertTrue(card.success_outcome_es)
                self.assertTrue(card.visual_description_es)
                visual_keys.append(card.mission_visual_key)
                expected_still = MISSION_BOUND_STILLS.get(beat)
                if expected_still:
                    self.assertEqual(
                        expected_still,
                        urlparse(card.prompt_image_url).path.rsplit("/", 1)[-1],
                    )
                else:
                    self.assertFalse(card.prompt_image_url)
                if card.interaction_type == "mission-speak":
                    self.assertEqual(1, len(card.options))
                    self.assertEqual(
                        expected_still,
                        urlparse(card.options[0].image_url).path.rsplit("/", 1)[-1],
                    )
                else:
                    self.assertFalse(any(option.image_url for option in card.options))
                option_ids = [option.id for option in card.options]
                target_option_ids = [
                    target.correct_option_id for target in card.mission_targets
                ]
                if card.interaction_type == "mission-match":
                    self.assertTrue(card.mission_targets)
                if card.mission_targets:
                    self.assertTrue(set(target_option_ids).issubset(set(option_ids)))
                    self.assertEqual(card.correct_option_ids, target_option_ids)
        self.assertEqual(MISSION_VISUAL_KEYS, visual_keys)
        self.assertEqual(22, len(set(visual_keys)))
        self.assertEqual({"Learn", "Recognize", "Listen", "Speak", "Use"}, {card.stage for card in mission.cards})

        opener = mission.cards[0]
        self.assertEqual("mission-unlock", opener.interaction_type)
        self.assertEqual("guided-no-fail", opener.mission_tutorial_mode)
        self.assertEqual(["FA", "MI", "LY"], [
            next(option.label for option in opener.options if option.id == option_id)
            for option_id in opener.correct_option_ids
        ])
        self.assertEqual("family", opener.answer_audio_text.lower())

        casting_loop = mission.cards[1:7]
        self.assertEqual(
            [
                "mission-match", "mission-clue", "mission-match",
                "mission-truth-stamp", "mission-match", "mission-match",
            ],
            [card.interaction_type for card in casting_loop],
        )

        pronoun_script = mission.cards[2]
        self.assertEqual("mission-clue", pronoun_script.interaction_type)
        self.assertFalse(pronoun_script.mission_targets)
        self.assertEqual(
            "He is a boy. He is a man. She is a woman. She is a girl.",
            next(
                option.label
                for option in pronoun_script.options
                if option.id == pronoun_script.correct_option_id
            ),
        )
        self.assertEqual(
            {
                "She is a boy. He is a man. She is a woman. He is a girl.",
                "He is a boy. He is a woman. She is a man. She is a girl.",
            },
            {
                option.label
                for option in pronoun_script.options
                if option.id != pronoun_script.correct_option_id
            },
        )

        younger_cast = mission.cards[3]
        younger_cast_options = {option.id: option.label for option in younger_cast.options}
        self.assertEqual(
            [
                "The baby is a child.",
                "The babies are children.",
                "The brother and the sister are children.",
                "The brothers and the sisters are children.",
            ],
            [
                younger_cast_options[target.correct_option_id]
                for target in younger_cast.mission_targets
            ],
        )
        self.assertTrue({
            "The baby is an adult.",
            "The babies are adults.",
        }.issubset({option.label for option in younger_cast.options}))

        adult_cast = mission.cards[4]
        adult_cast_options = {option.id: option.label for option in adult_cast.options}
        self.assertEqual("mission-truth-stamp", adult_cast.interaction_type)
        self.assertFalse(adult_cast.mission_targets)
        self.assertEqual(
            "An adult. Adults.",
            adult_cast_options[adult_cast.correct_option_id],
        )
        self.assertIn("A adult. Adults.", adult_cast_options.values())
        self.assertIn("An adult. Children.", adult_cast_options.values())

        parent_roles = mission.cards[5]
        parent_options = {option.id: option.label for option in parent_roles.options}
        self.assertEqual("mission-match", parent_roles.interaction_type)
        self.assertEqual(
            ["He is the father.", "She is the mother.", "They are the parents."],
            [
                parent_options[target.correct_option_id]
                for target in parent_roles.mission_targets
            ],
        )
        self.assertEqual(
            {
                "He is the grandfather.",
                "She is the grandmother.",
                "They are the grandparents.",
                "He is a boy.",
                "She is a girl.",
            },
            {
                option.label for option in parent_roles.options
                if option.id not in parent_roles.correct_option_ids
            },
        )

        generation_roles = mission.cards[6]
        generation_options = {option.id: option.label for option in generation_roles.options}
        self.assertEqual(
            [
                "He is the grandfather.",
                "She is the grandmother.",
                "They are the grandparents.",
                "They are the grandchildren.",
            ],
            [
                generation_options[target.correct_option_id]
                for target in generation_roles.mission_targets
            ],
        )
        self.assertEqual(
            {"He is a boy.", "She is a girl.", "They are the brothers.", "They are the sisters."},
            {
                option.label for option in generation_roles.options
                if option.id not in generation_roles.correct_option_ids
            },
        )

        father_question = mission.cards[8]
        father_question_options = {
            option.id: option.label for option in father_question.options
        }
        self.assertEqual("mission-sentence", father_question.interaction_type)
        self.assertEqual("___ ___ ___?", father_question.prompt)
        self.assertEqual(
            ["Who", "is", "he"],
            [father_question_options[option_id] for option_id in father_question.correct_option_ids],
        )
        self.assertEqual("Who is he?", father_question.answer_audio_text)
        self.assertIn("are", father_question_options.values())
        self.assertNotIn(
            next(option_id for option_id, label in father_question_options.items() if label == "are"),
            father_question.correct_option_ids,
        )

        mother_question = mission.cards[9]
        self.assertEqual("Who is she?", mother_question.audio_text)
        self.assertEqual("Who is she?", next(
            option.label
            for option in mother_question.options
            if option.id == mother_question.correct_option_id
        ))
        self.assertEqual(
            {"Who is she?", "Who is he?", "Who are they?"},
            {option.label for option in mother_question.options},
        )

        grandparent_clue = mission.cards[12]
        self.assertEqual("Who are they?", grandparent_clue.audio_text)
        self.assertEqual(
            "They are the grandparents.",
            grandparent_clue.answer_audio_text,
        )
        self.assertNotIn("grandparents", grandparent_clue.audio_text.lower())
        self.assertNotIn("who are they", grandparent_clue.answer_audio_text.lower())

        eating_drinking_shot = mission.cards[13]
        eating_drinking_options = {
            option.id: option.label for option in eating_drinking_shot.options
        }
        self.assertEqual(
            ["Toma izquierda", "Toma derecha"],
            [target.label for target in eating_drinking_shot.mission_targets],
        )
        self.assertEqual(
            ["The man is eating.", "The man is drinking."],
            [
                eating_drinking_options[target.correct_option_id]
                for target in eating_drinking_shot.mission_targets
            ],
        )

        cast_action_board = mission.cards[15]
        cast_action_options = {
            option.id: option.label for option in cast_action_board.options
        }
        self.assertEqual(
            ["Persona izquierda", "Persona del centro", "Persona derecha"],
            [target.label for target in cast_action_board.mission_targets],
        )
        self.assertEqual(
            [
                "The brother is running.",
                "The sister is running.",
                "The mother is sitting.",
            ],
            [
                cast_action_options[target.correct_option_id]
                for target in cast_action_board.mission_targets
            ],
        )
        self.assertEqual(
            {
                "The brother is running.",
                "The brother is sitting.",
                "The sister is running.",
                "The sister is sitting.",
                "The mother is sitting.",
                "The mother is running.",
            },
            set(cast_action_options.values()),
        )

        polarity_board = mission.cards[19]
        polarity_options = {option.id: option.label for option in polarity_board.options}
        self.assertEqual(6, len(polarity_options))
        self.assertEqual(
            [
                "He is not sitting. He is running.",
                "She is not sleeping. She is cooking.",
                "They are not sitting. They are swimming.",
            ],
            [
                polarity_options[target.correct_option_id]
                for target in polarity_board.mission_targets
            ],
        )
        self.assertEqual(
            {
                "He is sitting. He is not running.",
                "She is sleeping. She is not cooking.",
                "They are sitting. They are not swimming.",
            },
            {
                label
                for option_id, label in polarity_options.items()
                if option_id not in polarity_board.correct_option_ids
            },
        )

        action_sync = mission.cards[18]
        self.assertEqual(
            {
                "The parents are working.",
                "The parents are talking.",
                "The grandmother is cooking.",
                "The grandmother is working.",
                "The brothers are talking.",
                "The brothers are cooking.",
            },
            {option.label for option in action_sync.options},
        )

        reading_writing = mission.cards[14]
        self.assertEqual(
            {
                "The boy is reading and writing.",
                "The boy is reading and sleeping.",
                "The boy is eating and writing.",
            },
            {option.label for option in reading_writing.options},
        )
        for card in (candidate for candidate in mission.cards if candidate.stage == "Listen"):
            if not card.audio_text or not card.answer_audio_text:
                continue
            self.assertNotEqual(
                card.audio_text.strip().lower(),
                card.answer_audio_text.strip().lower(),
                f"{card.slide_id} must not replay an identical Listen line after success.",
            )

        visible_copy = " ".join([
            mission.title,
            mission.sub_lesson_title,
            mission.mission.title,
            mission.mission.briefing,
            *(card.instruction_es for card in mission.cards),
            *(card.success_outcome_es for card in mission.cards),
            *(card.visual_description_es for card in mission.cards),
        ])
        self.assertNotRegex(visible_copy.lower(), r"\b(?:album|álbum)\b")
        self.assertEqual([], validate_mission_contracts())

    def test_mission_rejects_retired_album_pixels_under_a_new_filename(self):
        retired_album_hash = (
            "34f1fe85fc4ac8d142e69ef863e26e52299da762c989c5f71a97a74940c44bd3"
        )
        with patch(
            "scripts.validate_lesson_cards.sha256_file",
            return_value=retired_album_hash,
        ):
            errors = validate_mission_contracts()

        self.assertTrue(
            any("byte-identical retired album imagery" in error for error in errors),
            errors,
        )

    def test_mission_contract_fails_closed_on_core_regressions(self):
        cases = []

        wrong_count = deepcopy(LESSONS)
        wrong_count["lesson-10-family-mission"].cards.pop()
        cases.append((wrong_count, "must contain exactly 22 mission beats"))

        missing_who_form = deepcopy(LESSONS)
        missing_who_card = missing_who_form["lesson-10-family-mission"].cards[8]
        missing_who_card.answer_audio_text = "She is the mother."
        missing_who_replacements = {
            "who": "She",
            "is": "is",
            "he": "the mother",
        }
        for option in missing_who_card.options:
            if option.id in missing_who_replacements:
                option.label = missing_who_replacements[option.id]
        cases.append((missing_who_form, "must assess the question form 'who is he'"))

        unintroduced_language = deepcopy(LESSONS)
        unintroduced_language["lesson-10-family-mission"].cards[12].options[1].label = (
            "They are the teachers."
        )
        cases.append((unintroduced_language, "unintroduced assessed/distractor English"))

        reused_review_media = deepcopy(LESSONS)
        prior_url = next(
            card.prompt_image_url
            for card in reused_review_media["lesson-9-unit-review"].cards
            if card.prompt_image_url
        )
        reused_review_media["lesson-10-family-mission"].cards[0].prompt_image_url = prior_url
        cases.append((reused_review_media, "reuses earlier lesson media"))

        missing_instruction = deepcopy(LESSONS)
        missing_instruction["lesson-10-family-mission"].cards[0].instruction_es = ""
        cases.append((missing_instruction, "needs an explicit instruction_es"))

        missing_visual_description = deepcopy(LESSONS)
        missing_visual_description["lesson-10-family-mission"].cards[0].visual_description_es = ""
        cases.append((missing_visual_description, "needs an authored visual_description_es"))

        weak_is_contrast = deepcopy(LESSONS)
        weak_is_contrast["lesson-10-family-mission"].cards[8].options[0].label = "is"
        cases.append((weak_is_contrast, "must require IS against an ARE distractor"))

        weak_she_question = deepcopy(LESSONS)
        weak_she_question["lesson-10-family-mission"].cards[9].options[0].label = "She is the mother."
        cases.append((weak_she_question, "must contrast and identify the exact heard 'Who is she?'"))

        missing_polarity_pair = deepcopy(LESSONS)
        missing_polarity_pair["lesson-10-family-mission"].cards[19].options.pop()
        cases.append((missing_polarity_pair, "must retain three polarity-paired NOT contrasts"))

        duplicate_visual = deepcopy(LESSONS)
        duplicate_visual["lesson-10-family-mission"].cards[1].mission_visual_key = (
            duplicate_visual["lesson-10-family-mission"].cards[0].mission_visual_key
        )
        cases.append((duplicate_visual, "repeats assessed visual contracts"))

        answer_revealing_target = deepcopy(LESSONS)
        answer_revealing_target["lesson-10-family-mission"].cards[1].mission_targets[0].label = (
            "Arriba izquierda · niño"
        )
        cases.append((answer_revealing_target, "target labels must locate the pictured slots"))

        repetitive_mechanic = deepcopy(LESSONS)
        for card in repetitive_mechanic["lesson-10-family-mission"].cards[2:5]:
            card.interaction_type = "mission-clue"
            card.stage = "Recognize"
        cases.append((repetitive_mechanic, "more than two consecutive beats"))

        retired_album = deepcopy(LESSONS)
        retired_album["lesson-10-family-mission"].mission.title = "Álbum familiar"
        cases.append((retired_album, "without visible album copy"))

        tutorial_only_family = deepcopy(LESSONS)
        tutorial_mission = tutorial_only_family["lesson-10-family-mission"]
        for card_index in (7, 21):
            card = tutorial_mission.cards[card_index]
            card.answer_audio_text = (card.answer_audio_text or "").replace(
                "family", "parents"
            )
            for option in card.options:
                if str(option.label or "").lower() == "family":
                    option.label = "parents"
        cases.append((tutorial_only_family, "assessed successful path outside its no-fail tutorial: ['family']"))

        for catalog, expected_error in cases:
            with self.subTest(expected_error=expected_error):
                self.assertTrue(
                    any(expected_error in error for error in validate_mission_contracts(catalog)),
                    f"Mission validator did not reject {expected_error!r}.",
                )

    def test_each_rebuilt_lesson_ends_with_ordered_multi_word_construction(self):
        for lesson_id in UNIT_1_IDS[1:9]:
            cards = [card for card in LESSONS[lesson_id].cards if card.correct_option_ids]
            with self.subTest(lesson=lesson_id):
                self.assertTrue(cards)
                self.assertTrue(all(card.prompt.count("___") >= 2 for card in cards))
                self.assertTrue(all(len(card.correct_option_ids) >= 2 for card in cards))

    def test_lesson_1_2_reuses_pronouns_only_inside_larger_ideas(self):
        lesson = LESSONS["lesson-2-pronouns"]
        self.assertNotIn("he", lesson.vocabulary)
        self.assertNotIn("she", lesson.vocabulary)
        self.assertIn("he", lesson.review_vocabulary)
        self.assertIn("she", lesson.review_vocabulary)
        learn_prompts = {card.prompt.strip().lower() for card in lesson.cards if card.stage == "Learn"}
        self.assertFalse({"he", "she"} & learn_prompts)

    def test_every_lesson_uses_the_same_five_stage_shell(self):
        for lesson in LESSONS.values():
            if getattr(lesson, "experience_type", None) == "mission":
                continue
            with self.subTest(lesson=lesson.id):
                self.assertEqual(STAGES, list(dict.fromkeys(card.stage for card in lesson.cards)))
                self.assertNotIn("Grammar", {card.stage for card in lesson.cards})

    def test_stage_counts_and_lesson_lengths_are_intentional(self):
        for lesson_id, expected_counts in EXPECTED_STAGE_COUNTS.items():
            lesson = LESSONS[lesson_id]
            counts = {
                stage: sum(card.stage == stage for card in lesson.cards)
                for stage in STAGES
            }
            with self.subTest(lesson=lesson_id):
                self.assertEqual(expected_counts, counts)
                self.assertGreaterEqual(len(lesson.cards), 30)
                self.assertLessEqual(len(lesson.cards), 54)

    def test_vocabulary_load_matches_the_curriculum_contract(self):
        for lesson_id, expected in EXPECTED_VOCABULARY.items():
            with self.subTest(lesson=lesson_id):
                self.assertEqual(expected, set(LESSONS[lesson_id].vocabulary))

    def test_preview_snapshots_match_all_unit_1_lessons(self):
        snapshot_root = Path(__file__).resolve().parents[2] / "mobile" / "src" / "generated"
        for lesson in LESSONS.values():
            snapshot_path = snapshot_root / f"{lesson.id}.json"
            with self.subTest(lesson=lesson.id):
                self.assertTrue(snapshot_path.is_file(), snapshot_path)
                snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
                self.assertEqual(lesson_payload(lesson), snapshot)

    def test_cards_have_valid_answers_and_existing_assets(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                option_ids = [option.id for option in card.options]
                with self.subTest(lesson=lesson.id, card=index):
                    self.assertEqual(len(option_ids), len(set(option_ids)))
                    self.assertIn(card.correct_option_id, option_ids)

                option_image_urls = [option.image_url for option in card.options if option.image_url]
                with self.subTest(lesson=lesson.id, card=index, check="unique visible choices"):
                    self.assertEqual(len(option_image_urls), len(set(option_image_urls)))

                media_urls = [card.prompt_image_url] if card.prompt_image_url else []
                media_urls.extend(option.image_url for option in card.options if option.image_url)
                for media_url in media_urls:
                    asset_name = urlparse(media_url).path.rsplit("/", 1)[-1]
                    with self.subTest(lesson=lesson.id, card=index, asset=asset_name):
                        self.assertTrue((LESSON_IMAGE_DIR / asset_name).is_file())

    def test_people_and_action_image_choices_keep_one_visual_question(self):
        portrait_images = {
            "boy.webp",
            "girl.webp",
            "man.webp",
            "woman.webp",
            "they_boy_girl.webp",
        }
        action_images = {
            "boy_is_eating.webp",
            "man_is_drinking.webp",
            "girl_is_reading.webp",
            "woman_is_writing.webp",
            "man_is_sitting.webp",
            "boy_is_swimming.webp",
            "girl_is_sleeping.webp",
            "they_boy_girl_are_eating.webp",
            "they_boy_girl_are_reading.webp",
            "they_boy_girl_are_running.webp",
            "they_boy_girl_are_writing.webp",
        }

        for lesson_id in ("lesson-2-pronouns", "lesson-3-two-people"):
            for card in LESSONS[lesson_id].cards:
                image_names = {
                    urlparse(option.image_url).path.rsplit("/", 1)[-1]
                    for option in card.options
                    if option.image_url
                }
                if not image_names:
                    continue
                with self.subTest(lesson=lesson_id, slide=card.slide_id):
                    self.assertFalse(
                        image_names & portrait_images and image_names & action_images,
                        "subject-only portraits and action scenes cannot share an option bank",
                    )

        lesson_two_subject_cards = [
            card
            for card in LESSONS["lesson-2-pronouns"].cards
            if card.slide_id in {"R1", "A1"}
        ]
        self.assertEqual(2, len(lesson_two_subject_cards))
        expected_subject_images = {"boy.webp", "girl.webp", "man.webp", "woman.webp"}
        for card in lesson_two_subject_cards:
            image_names = {
                urlparse(option.image_url).path.rsplit("/", 1)[-1]
                for option in card.options
            }
            with self.subTest(slide=card.slide_id):
                self.assertEqual(expected_subject_images, image_names)

    def test_text_only_cards_have_at_most_three_options(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                if not card.options or any(option.image_url for option in card.options):
                    continue
                if card.interaction_type in MISSION_BOARD_INTERACTIONS:
                    continue
                with self.subTest(lesson=lesson.id, card=index):
                    self.assertLessEqual(len(card.options), 3)
                    self.assertIn(card.correct_option_id, [option.id for option in card.options])

    def test_recognize_connects_images_and_text_in_both_directions(self):
        for unit in range(1, 8):
            cards = [
                card for lesson in LESSONS.values() if lesson.unit_id == f"unit-{unit}"
                for card in lesson.cards if card.stage == "Recognize"
            ]
            text_to_image = [
                card for card in cards
                if not card.prompt_image_url and all(option.image_url for option in card.options)
            ]
            image_to_text = [
                card for card in cards
                if card.prompt_image_url and all(not option.image_url for option in card.options)
            ]
            with self.subTest(unit=unit):
                self.assertTrue(text_to_image)
                self.assertTrue(image_to_text)
                self.assertTrue(all(card.audio_text == card.prompt for card in text_to_image))
                self.assertTrue(all(
                    (not card.audio_text and card.answer_audio_text)
                    or (card.prompt and card.audio_text == card.prompt)
                    or (card.audio_text and card.answer_audio_text)
                    for card in image_to_text
                ))

    def test_lesson_8_question_form_choices_do_not_reveal_the_answer(self):
        cards = [
            card
            for card in LESSONS["lesson-8-who"].cards
            if card.stage == "Recognize"
            and card.prompt_image_url
            and all(not option.image_url and option.label for option in card.options)
        ]
        self.assertEqual(5, len(cards))
        for card in cards:
            with self.subTest(prompt=card.prompt):
                self.assertEqual('', card.prompt)
                self.assertFalse(card.audio_text)
                self.assertTrue(all(option.label in {"Who is he?", "Who is she?", "Who are they?"} for option in card.options))
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertEqual(correct_option.label, card.answer_audio_text)

    def test_lesson_8_has_separate_question_answer_pairs_in_every_stage(self):
        identities = ['father', 'mother', 'parents', 'children', 'grandparents']
        questions = ['Who is he?', 'Who is she?', 'Who are they?', 'Who are they?', 'Who are they?']
        answers = ['He is the father.', 'She is the mother.', 'They are the parents.', 'They are the children.', 'They are the grandparents.']
        for stage in STAGES:
            cards = [card for card in LESSONS['lesson-8-who'].cards if card.stage == stage]
            self.assertEqual(10, len(cards))
            for index, identity in enumerate(identities):
                question, answer = cards[index * 2:index * 2 + 2]
                def text(card):
                    return card.answer_audio_text if stage in {'Recognize', 'Use'} and card.answer_audio_text else card.audio_text
                self.assertEqual(questions[index], text(question))
                self.assertEqual(answers[index], text(answer))
                self.assertEqual('male-character', question.audio_speaker)
                question_image = question.prompt_image_url or next(option.image_url for option in question.options if option.id == question.correct_option_id)
                self.assertIn(f'a1_who_question_{identity}.webp', question_image)
                self.assertNotIn('a1_who_question_', answer.prompt_image_url or '')
                self.assertTrue(all('a1_who_question_' not in (option.image_url or '') for option in answer.options))
                if stage == 'Listen':
                    self.assertEqual(1, sum(option.label == questions[index] for option in question.options))

    def test_lesson_10_assesses_every_unit_1_who_form(self):
        mission = LESSONS["lesson-10-family-mission"]
        gold_text = " ".join(
            value
            for card in mission.cards
            for value in (
                card.prompt or "",
                card.audio_text or "",
                card.answer_audio_text or "",
                *(
                    option.label or ""
                    for option in card.options
                    if option.id in ({card.correct_option_id} | set(card.correct_option_ids))
                ),
            )
        ).lower()
        normalized = re.sub(r"[^a-z]+", " ", gold_text)
        for question in ("who is he", "who is she", "who are they"):
            with self.subTest(question=question):
                self.assertIn(question, normalized)

    def test_lesson_2_6_object_identity_card_uses_aligned_question_and_answers(self):
        card = next(
            card
            for card in LESSONS["lesson-2-6-numbers-1-10"].cards
            if card.slide_id == "R8"
        )

        self.assertEqual("Recognize", card.stage)
        self.assertEqual("What is it?", card.prompt)
        self.assertEqual(card.prompt, card.audio_text)
        self.assertEqual(
            ["It is a phone.", "It is a bag."],
            [option.label for option in card.options],
        )
        correct_option = next(
            option for option in card.options if option.id == card.correct_option_id
        )
        self.assertEqual("It is a phone.", correct_option.label)
        self.assertEqual(correct_option.label, card.answer_audio_text)

    def test_listen_hides_text_and_uses_audio_with_image_choices(self):
        for lesson in LESSONS.values():
            if getattr(lesson, "experience_type", None) == "mission":
                continue
            cards = [card for card in lesson.cards if card.stage == "Listen"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(card.prompt == "Listen and choose." for card in cards))
                self.assertTrue(all(card.audio_text for card in cards))
                self.assertTrue(all(
                    all(option.image_url for option in card.options)
                    or all(not option.image_url and option.label for option in card.options)
                    for card in cards
                ))

    def test_unit_one_semantic_choices_have_one_valid_answer(self):
        findings = validate_family_adult_ambiguity(LESSONS)

        self.assertEqual([], findings, "\n".join(findings))

    def test_lesson_1_5_grandchildren_scene_has_known_correct_semantics(self):
        lesson = LESSONS["lesson-5-parents-grandparents"]
        cards = [
            card
            for card in lesson.cards
            if card.slide_id in {"L10", "R10"}
        ]
        self.assertEqual(2, len(cards))
        for card in cards:
            self.assertEqual(
                "The grandparents and the grandchildren are family.",
                card.audio_text or card.prompt,
            )
            correct_option = next(
                option for option in card.options if option.id == card.correct_option_id
            )
            self.assertEqual(
                "/lesson-assets/family_grandparents_grandchildren.webp",
                correct_option.image_url,
            )
        scoped_lesson = SimpleNamespace(id=lesson.id, cards=cards)

        self.assertEqual(
            [],
            validate_family_adult_ambiguity({lesson.id: scoped_lesson}),
        )

        recognize_card = next(card for card in cards if card.slide_id == "R10")
        unsupported_card = self._semantic_card(
            prompt=recognize_card.prompt,
            audio_text=recognize_card.audio_text,
            interaction_type=recognize_card.interaction_type,
            correct_option_id="correct",
            options=[
                self._semantic_option(
                    "correct",
                    recognize_card.options[0].label,
                    "/lesson-assets/family_grandparents.webp",
                ),
                self._semantic_option(
                    "wrong-1",
                    "He is the father.",
                    "/lesson-assets/family_father.webp",
                ),
            ],
        )

        findings = self._semantic_findings(unsupported_card)
        self.assertEqual(1, len(findings))
        self.assertIn("declared correct answers", findings[0])
        self.assertIn("family_grandparents.webp", findings[0])

    def test_semantic_guardrail_checks_declared_correct_answer_in_each_visual_mode(self):
        cases = (
            self._semantic_card(
                prompt="Choose the correct sentence.",
                prompt_image_url="/lesson-assets/family_grandfather.webp",
                correct_option_id="declared-correct",
                options=[
                    self._semantic_option("declared-correct", "She is the mother."),
                ],
            ),
            self._semantic_card(
                prompt="Choose the correct sentence.",
                prompt_image_url="/lesson-assets/family_parents.webp",
                correct_option_id="declared-correct",
                options=[
                    self._semantic_option("declared-correct", "An adult"),
                ],
            ),
            self._semantic_card(
                prompt="He is the grandfather.",
                correct_option_id="declared-correct",
                options=[
                    self._semantic_option(
                        "declared-correct",
                        "She is the mother.",
                        "/lesson-assets/family_mother.webp",
                    ),
                ],
            ),
            self._semantic_card(
                interaction_type="complete2",
                prompt="He is the ___.",
                prompt_image_url="/lesson-assets/family_grandfather.webp",
                correct_option_id="declared-correct",
                options=[
                    self._semantic_option("declared-correct", "mother"),
                ],
            ),
            self._semantic_card(
                interaction_type="complete4",
                prompt="___ is the ___.",
                prompt_image_url="/lesson-assets/family_grandfather.webp",
                correct_option_id="she",
                correct_option_ids=["she", "grandfather"],
                options=[
                    self._semantic_option("she", "She"),
                    self._semantic_option("grandfather", "grandfather"),
                ],
            ),
        )
        for card in cases:
            with self.subTest(interaction_type=card.interaction_type):
                findings = self._semantic_findings(card)
                self.assertEqual(1, len(findings))
                self.assertIn("declared correct answers", findings[0])

    def test_semantic_guardrail_understands_grandchildren_scene_subsets(self):
        card = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/family_grandparents_grandchildren.webp",
            correct_option_id="whole-scene",
            options=[
                self._semantic_option(
                    "whole-scene",
                    "The grandparents and the grandchildren are family.",
                ),
                self._semantic_option("family-subset", "They are a family."),
                self._semantic_option("grandparents-subset", "They are the grandparents."),
                self._semantic_option("children-subset", "Children"),
            ],
        )

        findings = self._semantic_findings(card)

        self.assertEqual(1, len(findings))
        for option_id in ("family-subset", "grandparents-subset", "children-subset"):
            self.assertIn(option_id, findings[0])

    def test_semantic_guardrail_distinguishes_parallel_family_generation_scenes(self):
        scenes = (
            (
                "The grandparents and the grandchildren are family.",
                "family_grandparents_grandchildren.webp",
            ),
            (
                "The parents and the children are a family.",
                "family_parents_children.webp",
            ),
        )
        for correct_index in range(len(scenes)):
            correct_text, correct_asset = scenes[correct_index]
            wrong_text, wrong_asset = scenes[1 - correct_index]
            with self.subTest(correct_asset=correct_asset):
                card = self._semantic_card(
                    prompt=correct_text,
                    correct_option_id="correct",
                    options=[
                        self._semantic_option(
                            "correct",
                            correct_text,
                            f"/lesson-assets/{correct_asset}",
                        ),
                        self._semantic_option(
                            "other-generation",
                            wrong_text,
                            f"/lesson-assets/{wrong_asset}",
                        ),
                    ],
                )

                self.assertEqual([], self._semantic_findings(card))

    def test_semantic_guardrail_preserves_heterogeneous_group_cardinality(self):
        child_target = self._semantic_card(
            prompt="They are children.",
            correct_option_id="children",
            options=[
                self._semantic_option(
                    "children",
                    "They are children.",
                    "/lesson-assets/they_boy_girl_are_eating.webp",
                ),
                self._semantic_option(
                    "mixed-ages",
                    "The boy and the man are eating.",
                    "/lesson-assets/they_boy_man_are_eating.webp",
                ),
            ],
        )
        mixed_target = self._semantic_card(
            prompt="The boy and the man are eating.",
            correct_option_id="mixed-ages",
            options=[
                self._semantic_option(
                    "mixed-ages",
                    "The boy and the man are eating.",
                    "/lesson-assets/they_boy_man_are_eating.webp",
                ),
                self._semantic_option(
                    "two-children",
                    "The boy and the girl are eating.",
                    "/lesson-assets/they_boy_girl_are_eating.webp",
                ),
            ],
        )

        self.assertEqual([], self._semantic_findings(child_target))
        self.assertEqual([], self._semantic_findings(mixed_target))

    def test_lesson_1_3_bare_pronoun_card_identifies_the_whole_pair(self):
        lesson = LESSONS["lesson-3-two-people"]
        card = next(card for card in lesson.cards if card.slide_id == "R2")
        self.assertEqual("/lesson-assets/they_boy_girl.webp", card.prompt_image_url)
        self.assertEqual(["They", "He", "She"], [option.label for option in card.options])
        self.assertEqual("They", next(
            option.label for option in card.options if option.id == card.correct_option_id
        ))

        self.assertEqual([], self._semantic_findings(card))

    def test_semantic_guardrail_scopes_only_bare_pronouns_to_the_whole_scene(self):
        for image, correct_pronoun in (
            ("they_boy_girl.webp", "They"),
            ("family_father.webp", "He"),
            ("family_mother.webp", "She"),
        ):
            with self.subTest(image=image):
                card = self._semantic_card(
                    prompt="Choose the correct word.",
                    prompt_image_url=f"/lesson-assets/{image}",
                    correct_option_id=correct_pronoun,
                    options=[
                        self._semantic_option(pronoun, f" {pronoun}. ")
                        for pronoun in ("They", "He", "She")
                    ],
                )
                self.assertEqual([], self._semantic_findings(card))

        card.correct_option_id = "They"
        findings = self._semantic_findings(card)
        self.assertTrue(any("declared correct answers" in finding for finding in findings))

        scoped_sentence = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/family_grandparents.webp",
            correct_option_id="whole-scene",
            options=[
                self._semantic_option("whole-scene", "They are the grandparents."),
                self._semantic_option("still-true-subset", "She is the grandmother."),
            ],
        )
        findings = self._semantic_findings(scoped_sentence)
        self.assertEqual(1, len(findings))
        self.assertIn("still-true-subset", findings[0])

        scoped_completion = self._semantic_card(
            interaction_type="complete2",
            prompt="She is the ___. They are the grandparents.",
            prompt_image_url="/lesson-assets/family_grandparents.webp",
            correct_option_id="role-answer",
            options=[
                self._semantic_option("role-answer", "grandmother"),
                self._semantic_option("overlapping-role", "mother"),
                self._semantic_option("exclusive-role", "boy"),
            ],
        )
        findings = self._semantic_findings(scoped_completion)
        self.assertEqual(1, len(findings))
        self.assertIn("overlapping-role", findings[0])
        self.assertNotIn("declared correct answers", findings[0])

    def test_semantic_guardrail_requires_explicit_negative_visual_fact(self):
        card = self._semantic_card(
            prompt="They are not sitting.",
            correct_option_id="running",
            options=[
                self._semantic_option(
                    "running",
                    "They are running.",
                    "/lesson-assets/they_boy_girl_are_running.webp",
                ),
                self._semantic_option(
                    "sitting-and-talking",
                    "They are sitting and talking.",
                    "/lesson-assets/family_grandparents_talking.webp",
                ),
            ],
        )

        self.assertEqual([], self._semantic_findings(card))

    def test_semantic_guardrail_keeps_unknown_a1_scenes_conservative(self):
        card = self._semantic_card(
            prompt="He is the father.",
            correct_option_id="unknown-scene",
            options=[
                self._semantic_option(
                    "unknown-scene",
                    "He is the father.",
                    "/lesson-assets/a1_scene_unknown-family-role.webp",
                ),
            ],
        )

        self.assertEqual([], self._semantic_findings(card))

    def test_semantic_guardrail_uses_visual_meaning_not_option_ids(self):
        card = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/family_grandfather.webp",
            correct_option_id="opaque-right",
            options=[
                self._semantic_option("opaque-right", "He is the grandfather."),
                self._semantic_option("opaque-singular", "An adult"),
                self._semantic_option("opaque-plural", "Adults"),
            ],
        )

        findings = self._semantic_findings(card)

        self.assertEqual(1, len(findings))
        self.assertIn("opaque-singular", findings[0])
        self.assertNotIn("opaque-plural", findings[0])

    def test_semantic_guardrail_rejects_true_shorter_picture_label(self):
        card = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/boy_is_eating.webp",
            correct_option_id="full-sentence",
            options=[
                self._semantic_option("full-sentence", "The boy is eating."),
                self._semantic_option("shorter-label", "The boy."),
                self._semantic_option("exclusive-label", "The girl."),
            ],
        )

        findings = self._semantic_findings(card)

        self.assertEqual(1, len(findings))
        self.assertIn("shorter-label", findings[0])
        self.assertNotIn("exclusive-label", findings[0])

    def test_semantic_guardrail_rejects_true_family_subsets(self):
        card = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/family_all_members.webp",
            correct_option_id="whole-scene",
            options=[
                self._semantic_option("whole-scene", "They are a family."),
                self._semantic_option("visible-adults", "Adults"),
                self._semantic_option("visible-parents", "They are the parents."),
                self._semantic_option("wrong-category", "They are babies."),
            ],
        )

        findings = self._semantic_findings(card)

        self.assertEqual(1, len(findings))
        self.assertIn("visible-adults", findings[0])
        self.assertIn("visible-parents", findings[0])
        self.assertNotIn("wrong-category", findings[0])

    def test_semantic_guardrail_rejects_related_groups_for_a_generic_family_target(self):
        related_group_assets = (
            "family_parents.webp",
            "family_grandparents.webp",
            "family_adults.webp",
            "family_children.webp",
            "family_brothers.webp",
            "family_sisters.webp",
            "family_babies.webp",
        )
        for asset_name in related_group_assets:
            with self.subTest(asset_name=asset_name):
                card = self._semantic_card(
                    prompt="They are a family.",
                    correct_option_id="whole-family",
                    options=[
                        self._semantic_option(
                            "whole-family",
                            "They are a family.",
                            "/lesson-assets/family_all_members.webp",
                        ),
                        self._semantic_option(
                            "also-family",
                            "A related group",
                            f"/lesson-assets/{asset_name}",
                        ),
                    ],
                )

                findings = self._semantic_findings(card)
                self.assertEqual(1, len(findings))
                self.assertIn("also-family", findings[0])

    def test_semantic_guardrail_does_not_infer_negative_family_identity_from_absence(self):
        unknown_relation = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/they_boy_man_are_eating.webp",
            correct_option_id="known-action",
            options=[
                self._semantic_option("known-action", "The boy and the man are eating."),
                self._semantic_option("unproved-negative", "They are not a family."),
            ],
        )
        false_correct = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/family_parents.webp",
            correct_option_id="false-negative",
            options=[
                self._semantic_option("false-negative", "They are not a family."),
            ],
        )

        self.assertEqual([], self._semantic_findings(unknown_relation))
        findings = self._semantic_findings(false_correct)
        self.assertEqual(1, len(findings))
        self.assertIn("declared correct answers", findings[0])

    def test_semantic_guardrail_rejects_overlapping_generation_roles(self):
        cases = (
            ("family_father.webp", "He is the father.", "He is the grandfather."),
            ("family_grandfather.webp", "He is the grandfather.", "He is the father."),
            ("family_mother.webp", "She is the mother.", "She is the grandmother."),
            ("family_grandmother.webp", "She is the grandmother.", "She is the mother."),
            ("family_parents.webp", "They are the parents.", "They are the grandparents."),
            ("family_grandparents.webp", "They are the grandparents.", "They are the parents."),
        )
        for asset_name, correct_label, overlapping_label in cases:
            with self.subTest(asset_name=asset_name, overlapping_label=overlapping_label):
                card = self._semantic_card(
                    prompt="Choose the correct sentence.",
                    prompt_image_url=f"/lesson-assets/{asset_name}",
                    correct_option_id="role-answer",
                    options=[
                        self._semantic_option("role-answer", correct_label),
                        self._semantic_option("overlapping-role", overlapping_label),
                    ],
                )

                findings = self._semantic_findings(card)

                self.assertEqual(1, len(findings))
                self.assertIn("overlapping-role", findings[0])

    def test_semantic_guardrail_is_cardinality_aware_for_image_options(self):
        singular_target = self._semantic_card(
            prompt="Listen and choose.",
            audio_text="An adult",
            correct_option_id="adult-answer",
            options=[
                self._semantic_option(
                    "adult-answer",
                    "An adult",
                    "/lesson-assets/family_father.webp",
                ),
                self._semantic_option(
                    "another-adult",
                    "A grandfather",
                    "/lesson-assets/family_grandfather.webp",
                ),
                self._semantic_option(
                    "plural-adults",
                    "Adults",
                    "/lesson-assets/family_adults.webp",
                ),
            ],
        )
        plural_target = self._semantic_card(
            prompt="Adults",
            correct_option_id="adults-answer",
            options=[
                self._semantic_option(
                    "adults-answer",
                    "Adults",
                    "/lesson-assets/family_adults.webp",
                ),
                self._semantic_option(
                    "parents-subset",
                    "The parents",
                    "/lesson-assets/family_parents.webp",
                ),
                self._semantic_option(
                    "family-subset",
                    "A family",
                    "/lesson-assets/family_all_members.webp",
                ),
            ],
        )

        findings = self._semantic_findings(singular_target)

        self.assertEqual(1, len(findings))
        self.assertIn("another-adult", findings[0])
        self.assertNotIn("plural-adults", findings[0])
        findings = self._semantic_findings(plural_target)
        self.assertEqual(1, len(findings))
        self.assertIn("parents-subset", findings[0])
        self.assertIn("family-subset", findings[0])

    def test_semantic_guardrail_does_not_apply_image_entailment_to_audio_to_text(self):
        card = self._semantic_card(
            prompt="Listen and choose.",
            audio_text="He is the grandfather.",
            correct_option_id="exact-phrase",
            options=[
                self._semantic_option("exact-phrase", "He is the grandfather."),
                self._semantic_option("broader-phrase", "An adult"),
            ],
        )

        self.assertEqual([], self._semantic_findings(card))

    def test_semantic_guardrail_handles_negative_polarity(self):
        exact_contrast = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/family_father_talking.webp",
            correct_option_id="positive",
            options=[
                self._semantic_option("positive", "He is talking."),
                self._semantic_option("exact-negative", "He is not talking."),
            ],
        )
        incomplete_negative_contrast = self._semantic_card(
            prompt="Choose the correct sentence.",
            prompt_image_url="/lesson-assets/family_father_talking.webp",
            correct_option_id="negative",
            options=[
                self._semantic_option("negative", "He is not cooking."),
                self._semantic_option("still-true", "He is talking."),
                self._semantic_option("false-action", "He is cooking."),
            ],
        )

        self.assertEqual([], self._semantic_findings(exact_contrast))
        findings = self._semantic_findings(incomplete_negative_contrast)
        self.assertEqual(1, len(findings))
        self.assertIn("still-true", findings[0])
        self.assertNotIn("false-action", findings[0])

    def test_semantic_guardrail_checks_image_backed_completion(self):
        safe_card = self._semantic_card(
            interaction_type="complete2",
            prompt="He is the ___.",
            prompt_image_url="/lesson-assets/family_grandfather.webp",
            correct_option_id="role-answer",
            options=[
                self._semantic_option("role-answer", "grandfather"),
                self._semantic_option("exclusive-role", "mother"),
                self._semantic_option("wrong-number", "parents"),
            ],
        )

        for interaction_type in ("complete2", "mission-sentence"):
            with self.subTest(interaction_type=interaction_type):
                ambiguous_card = self._semantic_card(
                    interaction_type=interaction_type,
                    prompt="He is the ___.",
                    prompt_image_url="/lesson-assets/family_grandfather.webp",
                    correct_option_id="role-answer",
                    options=[
                        self._semantic_option("role-answer", "grandfather"),
                        self._semantic_option("overlapping-role", "father"),
                        self._semantic_option("wrong-number", "parents"),
                    ],
                )

                findings = self._semantic_findings(ambiguous_card)
                self.assertEqual(1, len(findings))
                self.assertIn("overlapping-role", findings[0])
                self.assertNotIn("wrong-number", findings[0])
        self.assertEqual([], self._semantic_findings(safe_card))

    def test_negative_listening_uses_an_exact_binary_contrast(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                audio = (card.audio_text or "").lower()
                if (
                    card.stage != "Listen"
                    or not re.search(r"\b(?:is|are) not\b", audio)
                    or not all(option.image_url for option in card.options)
                ):
                    continue
                with self.subTest(lesson=lesson.id, card=index, audio=card.audio_text):
                    self.assertEqual(2, len(card.options))

    def test_lesson_1_7_negative_contrasts_confirm_the_positive_action(self):
        lesson = LESSONS["lesson-7-is-are-not"]
        cards = [
            card
            for card in lesson.cards
            if (
                card.stage in {"Recognize", "Listen"}
                and re.search(r"\b(?:is|are) not\b", card.audio_text or "", re.IGNORECASE)
            )
        ]
        self.assertEqual(10, len(cards))
        for card in cards:
            with self.subTest(stage=card.stage, slide=card.slide_id):
                self.assertEqual(2, len(card.options))
                self.assertFalse(card.prompt_image_url)
                self.assertTrue(all(option.image_url for option in card.options))
                correct = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertIn(" not ", f" {correct.label.lower()} ")
                self.assertTrue(card.answer_audio_text)
                self.assertRegex(
                    card.answer_audio_text.lower(),
                    r"\b(talking|writing|running|playing|sitting)\b",
                )

    def test_not_cooking_recognition_requires_an_image_choice(self):
        card = next(card for card in LESSONS["lesson-7-is-are-not"].cards if card.slide_id == "R2")
        self.assertEqual("He is not cooking.", card.prompt)
        self.assertEqual("t2i2", card.interaction_type)
        self.assertFalse(card.prompt_image_url)
        self.assertEqual(2, len(card.options))
        self.assertTrue(all(option.image_url for option in card.options))
        self.assertEqual("He is not cooking. He is talking.", card.answer_audio_text)

    def test_specific_identity_choices_include_the_answer_in_the_audio(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                audio = card.audio_text or ""
                if (
                    card.stage != "Recognize"
                    or card.prompt_image_url
                    or not audio.lower().startswith("who ")
                ):
                    continue
                with self.subTest(lesson=lesson.id, card=index, audio=audio):
                    self.assertRegex(audio, r"\?\s+(He|She|They) (is|are) ")

    def test_speak_uses_one_clear_image_and_a_model_phrase(self):
        for lesson in LESSONS.values():
            if getattr(lesson, "experience_type", None) == "mission":
                continue
            cards = [card for card in lesson.cards if card.stage == "Speak"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(cards)
                self.assertTrue(all(card.prompt and card.audio_text == card.prompt for card in cards))
                self.assertTrue(all(len(card.options) == 1 for card in cards))
                self.assertTrue(all(card.options[0].image_url for card in cards))

    def test_use_is_interactive_completion_not_a_grammar_section(self):
        for lesson in LESSONS.values():
            if getattr(lesson, "experience_type", None) == "mission":
                continue
            cards = [card for card in lesson.cards if card.stage == "Use"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(cards)
                self.assertTrue(all(card.interaction_type in {
                    None, "choice", "choose2", "choose4", "complete", "complete2",
                    "complete4", "response-choice", "mission-word-parts",
                    "mission-sentence", "mission-finale",
                } for card in cards))
                self.assertTrue(all(card.answer_audio_text for card in cards))
                self.assertTrue(all(all(not option.image_url and option.label for option in card.options) for card in cards))

    def test_shared_course_audio_boundary_rejects_visual_blanks(self):
        from backend.app.course_audio import sanitize_course_audio_text

        examples = [
            "It is a ___.",
            "___ is a school.",
            "What ___ it?",
            "I [pause] agree.",
            "I [blank] agree.",
            "It is a {blank}.",
            "It is a ...",
            "It is a …",
        ]
        for example in examples:
            with self.subTest(example=example), self.assertRaises(ValueError):
                sanitize_course_audio_text(example)

    def test_learn_starts_with_clear_single_visual_anchors(self):
        for lesson in list(LESSONS.values())[:8]:
            cards = [card for card in lesson.cards if card.stage == "Learn"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(len(card.options) == 1 for card in cards))
                self.assertTrue(all(card.options[0].image_url for card in cards))
                self.assertTrue(all(card.audio_text for card in cards))

    def test_lesson_1_builds_identity_before_actions(self):
        lesson = LESSONS["lesson-1-people-actions"]
        self.assertEqual(
            [
                "A boy",
                "He",
                "He is a boy.",
                "A girl",
                "She",
                "She is a girl.",
                "A man",
                "He is a man.",
                "A woman",
                "She is a woman.",
            ],
            [card.prompt for card in lesson.cards if card.stage == "Learn"],
        )
        self.assertEqual([], lesson.review_vocabulary)
        self.assertEqual([], lesson.purposeful_review_slides)
        self.assertTrue(lesson.unit_outcome)
        self.assertTrue(lesson.grammar_function)
        self.assertTrue(lesson.prerequisite)
        self.assertTrue(lesson.speaking_outcome)
        self.assertTrue(all(card.slide_id for card in lesson.cards))
        self.assertTrue(all(card.interaction_type for card in lesson.cards))
        self.assertTrue(all(card.spanish_translation for card in lesson.cards))
        self.assertTrue(all(card.pedagogy_note for card in lesson.cards))
        action_words = {"running", "walking", "sitting", "standing"}
        self.assertFalse(action_words & set(lesson.vocabulary))

    def test_lesson_1_varies_clothing_without_changing_the_people_contract(self):
        lesson = LESSONS["lesson-1-people-actions"]
        referenced_images = {
            urlparse(image_url).path.rsplit("/", 1)[-1]
            for card in lesson.cards
            for image_url in [
                card.prompt_image_url,
                *(option.image_url for option in card.options),
            ]
            if image_url
        }
        for person in ("boy", "girl", "man", "woman"):
            with self.subTest(person=person):
                self.assertIn(f"{person}.webp", referenced_images)
                self.assertIn(f"a1_l1_{person}_alt.webp", referenced_images)
                self.assertIn(f"a1_l1_{person}_transfer.webp", referenced_images)
        course_source = (
            Path(__file__).resolve().parents[2]
            / "mobile"
            / "src"
            / "screens"
            / "CourseScreen.tsx"
        ).read_text(encoding="utf-8")
        self.assertIn("image: 'a1_l1_people_together.webp'", course_source)

    def test_lesson_1_repeats_one_story_order_through_every_stage(self):
        lesson = LESSONS["lesson-1-people-actions"]
        person_rank = {"boy": 0, "girl": 1, "man": 2, "woman": 3}

        for stage in STAGES:
            targets = []
            for card in lesson.cards:
                if card.stage != stage:
                    continue
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                targets.append(" ".join([
                    card.answer_audio_text or "",
                    card.audio_text or "",
                    card.prompt or "",
                    correct_option.label or "",
                    correct_option.image_url or "",
                ]))
            ranks = [
                next(
                    person_rank[person]
                    for person in person_rank
                    if re.search(
                        rf"\b{person}\b",
                        re.sub(r"[^a-z]+", " ", target.lower()),
                    )
                )
                for target in targets
            ]
            with self.subTest(stage=stage):
                self.assertEqual(sorted(ranks), ranks)

        self.assertGreaterEqual(
            len({card.interaction_type for card in lesson.cards if card.stage == "Recognize"}),
            3,
        )
        self.assertGreaterEqual(
            len({card.interaction_type for card in lesson.cards if card.stage == "Listen"}),
            3,
        )

    def test_lesson_1_closes_with_ordered_two_word_completions(self):
        cards = [
            card for card in LESSONS["lesson-1-people-actions"].cards
            if card.correct_option_ids
        ]
        self.assertEqual(["U5", "U7"], [card.slide_id for card in cards])
        self.assertEqual([["he", "a"], ["she", "a"]], [card.correct_option_ids for card in cards])
        self.assertTrue(all(card.prompt.count("___") == 2 for card in cards))

    def test_new_words_continue_into_active_stages(self):
        expected_examples = {
            "lesson-3-two-people": ["They are running.", "He is swimming.", "She is sleeping."],
            "lesson-4-children-siblings": ["They are children.", "They are brothers.", "They are sisters."],
            "lesson-5-parents-grandparents": ["They are the parents.", "They are the grandparents."],
            "lesson-6-family-actions": ["The father is working.", "The mother is cooking.", "The parents are talking."],
            "lesson-7-is-are-not": ["He is not cooking.", "They are not sitting."],
            "lesson-8-who": ["Who is he?", "Who are they?"],
        }
        for lesson_id, phrases in expected_examples.items():
            active_text = {
                card.audio_text or card.answer_audio_text or card.prompt
                for card in LESSONS[lesson_id].cards
                if card.stage in {"Listen", "Speak", "Use"}
            }
            with self.subTest(lesson=lesson_id):
                self.assertTrue(set(phrases).issubset(active_text))

    def test_mobile_action_video_map_only_references_existing_clips(self):
        root = Path(__file__).resolve().parents[2]
        mapping_source = (root / "mobile" / "src" / "actionVideos.ts").read_text(encoding="utf-8")
        video_references = re.findall(r"'([^']+-scene-v\d+\.mp4)'", mapping_source)
        self.assertTrue(video_references)
        for video_reference in set(video_references):
            video_name = Path(video_reference).name
            with self.subTest(video=video_name):
                self.assertTrue((root / "frontend" / "public" / "lesson-assets" / video_name).is_file())

    def test_action_video_normalizer_preserves_source_quality(self):
        root = Path(__file__).resolve().parents[2]
        generator_source = (root / "scripts" / "generate_lesson_action_videos.py").read_text(
            encoding="utf-8"
        )
        normalize_existing_source = generator_source.split("def normalize_existing() -> None:", 1)[1].split(
            "\ndef main() -> None:", 1
        )[0]

        self.assertIn('"-crf", "20"', generator_source)
        self.assertIn("RAW_DIR", normalize_existing_source)
        self.assertNotIn('ASSETS.glob("*-scene-v2.mp4")', normalize_existing_source)


if __name__ == "__main__":
    unittest.main()
