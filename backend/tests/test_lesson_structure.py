import hashlib
import json
import re
import unittest
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse

from PIL import Image

from backend.app.data import LESSON_IMAGE_DIR, LESSONS
from scripts.validate_lesson_cards import validate_family_adult_ambiguity


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
    "Family Scene Mission",
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
    "lesson-8-who": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-9-unit-review": {"Learn": 14, "Recognize": 14, "Listen": 10, "Speak": 8, "Use": 8},
    "lesson-10-family-mission": {"Learn": 4, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
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

    def test_lesson_1_10_is_a_distinct_ordered_family_mission(self):
        mission = LESSONS["lesson-10-family-mission"]
        self.assertEqual([], mission.vocabulary)
        self.assertEqual(32, len(mission.cards))

        mission_media = {
            urlparse(url).path.rsplit("/", 1)[-1]
            for card in mission.cards
            for url in [card.prompt_image_url, *(option.image_url for option in card.options)]
            if url
        }
        earlier_media = {
            urlparse(url).path.rsplit("/", 1)[-1]
            for lesson_id in UNIT_1_IDS[:9]
            for card in LESSONS[lesson_id].cards
            for url in [card.prompt_image_url, *(option.image_url for option in card.options)]
            if url
        }
        self.assertTrue(mission_media)
        self.assertTrue(all(name.startswith("a1_u1_mission_") for name in mission_media))
        self.assertEqual(set(), mission_media & earlier_media)

        for step, card in enumerate(mission.cards, 1):
            with self.subTest(step=step, slide=card.slide_id):
                self.assertRegex(card.pedagogy_note, rf"^Mission step {step:02d}/32:")

        use_cards = [card for card in mission.cards if card.stage == "Use"]
        self.assertEqual(
            ["mission-word-parts"] * 2
            + ["mission-sentence"] * 5
            + ["mission-finale"],
            [card.interaction_type for card in use_cards],
        )
        self.assertEqual(
            [
                "fa-ther", "mo-ther", "He is reading.", "She is writing.",
                "They are playing.", "They are talking.",
                "They are not sleeping.", "They are a family.",
            ],
            [card.answer_audio_text for card in use_cards],
        )
        self.assertTrue(all(2 <= len(card.correct_option_ids) <= 3 for card in use_cards))
        self.assertTrue(all(len(card.options) <= 3 for card in use_cards))

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

    def test_lesson_10_father_reading_uses_the_reviewed_clue_card_scene(self):
        lesson = LESSONS["lesson-10-family-mission"]
        reviewed_asset = "a1_u1_mission_father_reading_clear.webp"
        identity_asset = "a1_u1_mission_father_reading.webp"
        expected_action_slides = {"L3", "R3", "A1", "S2", "U3"}
        expected_identity_slides = {"R2", "S1", "U1"}

        action_references_by_slide = {}
        identity_references_by_slide = {}
        for card in lesson.cards:
            media_urls = [card.prompt_image_url] if card.prompt_image_url else []
            media_urls.extend(option.image_url for option in card.options if option.image_url)
            asset_names = {
                urlparse(media_url).path.rsplit("/", 1)[-1]
                for media_url in media_urls
            }
            if reviewed_asset in asset_names:
                action_references_by_slide[card.slide_id] = asset_names
            if identity_asset in asset_names:
                identity_references_by_slide[card.slide_id] = asset_names

        self.assertEqual(expected_action_slides, set(action_references_by_slide))
        self.assertEqual(expected_identity_slides, set(identity_references_by_slide))

        asset_path = LESSON_IMAGE_DIR / reviewed_asset
        with Image.open(asset_path) as image:
            self.assertEqual((1536, 1024), image.size)
        self.assertEqual(
            "ab6404c7041d182e0b38ae45a80c6f688f21d02137a83384608a809fb70e9dd1",
            hashlib.sha256(asset_path.read_bytes()).hexdigest(),
            "Changing the reviewed printed-clue pixels requires a new at-mobile-size visual review.",
        )

    def test_text_only_cards_have_at_most_three_options(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                if not card.options or any(option.image_url for option in card.options):
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

    def test_lesson_8_identity_text_choices_ask_the_question_up_front(self):
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
                self.assertIn(card.prompt, {"Who is he?", "Who is she?", "Who are they?"})
                self.assertEqual(card.prompt, card.audio_text)
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertEqual(correct_option.label, card.answer_audio_text)

    def test_lesson_10_identity_text_choices_ask_the_question_up_front(self):
        cards = [
            card
            for card in LESSONS["lesson-10-family-mission"].cards
            if card.stage == "Recognize"
            and card.prompt_image_url
            and card.prompt == "Who are they?"
        ]
        self.assertEqual(2, len(cards))
        for card in cards:
            with self.subTest(image=card.prompt_image_url):
                self.assertEqual("Who are they?", card.audio_text)
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertEqual(correct_option.label, card.answer_audio_text)
                self.assertNotIn("Who are they?", card.answer_audio_text)

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
            cards = [card for card in lesson.cards if card.stage == "Speak"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(cards)
                self.assertTrue(all(card.prompt and card.audio_text == card.prompt for card in cards))
                self.assertTrue(all(len(card.options) == 1 for card in cards))
                self.assertTrue(all(card.options[0].image_url for card in cards))

    def test_use_is_interactive_completion_not_a_grammar_section(self):
        for lesson in LESSONS.values():
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
