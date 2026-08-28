import json
import re
import unittest
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from backend.app.data import LESSON_IMAGE_DIR, LESSONS


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
    "People and Core Actions",
    "He and She",
    "Two People: They and Are",
    "Children and Siblings",
    "Parents and Grandparents",
    "Family Actions",
    "Is, Are, and Not",
    "Who Is He? Who Are They?",
    "Unit 1 Spiral Review",
    "Family Scene Mission",
]
EXPECTED_VOCABULARY = {
    "lesson-1-people-actions": {
        "the", "is", "boy", "girl", "man", "woman",
        "running", "walking", "sitting", "standing",
    },
    "lesson-2-pronouns": {"he", "she", "eating", "drinking", "reading", "writing"},
    "lesson-3-two-people": {"and", "they", "are", "swimming", "sleeping"},
    "lesson-4-children-siblings": {
        "family", "baby", "babies", "child", "children",
        "brother", "brothers", "sister", "sisters",
    },
    "lesson-5-parents-grandparents": {
        "adult", "adults", "father", "mother", "parents",
        "grandfather", "grandmother", "grandparents",
    },
    "lesson-6-family-actions": {"playing", "studying", "working", "cooking", "talking"},
    "lesson-7-is-are-not": {"not"},
    "lesson-8-who": {"who"},
    "lesson-9-unit-review": set(),
    "lesson-10-family-mission": set(),
}
EXPECTED_STAGE_COUNTS = {
    "lesson-1-people-actions": {"Learn": 8, "Recognize": 12, "Listen": 8, "Speak": 8, "Use": 8},
    "lesson-2-pronouns": {"Learn": 8, "Recognize": 10, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-3-two-people": {"Learn": 9, "Recognize": 10, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-4-children-siblings": {"Learn": 9, "Recognize": 9, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-5-parents-grandparents": {"Learn": 10, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-6-family-actions": {"Learn": 10, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-7-is-are-not": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-8-who": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-9-unit-review": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
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
    return payload


class LessonStructureTests(unittest.TestCase):
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
                self.assertLessEqual(len(lesson.cards), 44)

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
        self.assertEqual(4, len(cards))
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
        self.assertEqual(3, len(cards))
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

    def test_family_image_choices_do_not_use_overlapping_categories(self):
        forbidden_distractors = {
            "Children": {"babies", "brothers", "sisters", "family"},
            "They are children.": {"babies", "brothers", "sisters", "family"},
            "They are brothers.": {"children", "family"},
            "They are sisters.": {"children", "family"},
            "They are the brothers.": {"babies", "children", "family"},
            "They are the sisters.": {"babies", "children", "family"},
            "Who are they? They are the brothers.": {"babies", "children", "family"},
            "Who are they? They are the sisters.": {"babies", "children", "family"},
            "They are a family.": {
                "babies", "brothers", "sisters", "children", "parents", "grandparents",
            },
        }
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                spoken_text = card.audio_text or card.answer_audio_text or card.prompt
                forbidden = forbidden_distractors.get(spoken_text)
                if not forbidden or not all(option.image_url for option in card.options):
                    continue
                distractor_ids = {
                    option.id for option in card.options
                    if option.id != card.correct_option_id
                }
                with self.subTest(lesson=lesson.id, card=index, spoken_text=spoken_text):
                    self.assertFalse(forbidden & distractor_ids)

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

    def test_lesson_1_7_negative_image_choices_confirm_the_positive_action(self):
        lesson = LESSONS["lesson-7-is-are-not"]
        actual = Counter(
            (card.audio_text, card.answer_audio_text)
            for card in lesson.cards
            if (
                card.stage in {"Recognize", "Listen"}
                and re.search(r"\b(?:is|are) not\b", card.audio_text or "", re.IGNORECASE)
                and all(option.image_url for option in card.options)
            )
        )
        expected = Counter({
            ("He is not cooking.", "He is not cooking, he is working."): 2,
            ("She is not reading.", "She is not reading, she is writing."): 1,
            ("They are not sitting.", "They are not sitting, they are running."): 2,
            (
                "The children are not studying.",
                "The children are not studying, they are playing.",
            ): 1,
            ("They are not studying.", "They are not studying, they are playing."): 1,
            ("She is not drinking.", "She is not drinking, she is writing."): 1,
        })
        self.assertEqual(expected, actual)

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
                    "complete4", "response-choice",
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

    def test_lesson_1_position_change_keeps_the_same_person(self):
        cards = {
            card.prompt: card
            for card in LESSONS["lesson-1-people-actions"].cards
            if card.stage == "Learn" and card.prompt in {"Sitting", "Standing"}
        }
        self.assertEqual(
            ["man_is_sitting.webp", "man_is_standing.webp"],
            [
                urlparse(cards[prompt].options[0].image_url).path.rsplit("/", 1)[-1]
                for prompt in ["Sitting", "Standing"]
            ],
        )

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
