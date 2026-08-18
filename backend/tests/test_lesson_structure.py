import json
import unittest
from pathlib import Path
from urllib.parse import urlparse

from backend.app.data import LESSON_IMAGE_DIR, LESSONS


LESSON_1_STAGES = [
    "Learn",
    "Recognize",
    "Listen",
    "Speak",
    "Use",
]

LEGACY_STAGES = [
    "New Vocab",
    "Action Introduction",
    "Plural Challenge",
    "Listen",
    "Pronunciation Practice",
    "Grammar",
]


class LessonStructureTests(unittest.TestCase):
    def test_mobile_preview_snapshot_matches_lesson_1(self):
        lesson = LESSONS["lesson-1-people-actions"]
        snapshot_path = (
            Path(__file__).resolve().parents[2]
            / "mobile"
            / "src"
            / "generated"
            / "lesson-1-people-actions.json"
        )
        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
        lesson_payload = (
            lesson.model_dump(mode="json")
            if hasattr(lesson, "model_dump")
            else json.loads(lesson.json())
        )
        self.assertEqual(lesson_payload, snapshot)

    def test_lesson_1_uses_the_five_stage_journey(self):
        lesson = LESSONS["lesson-1-people-actions"]
        stages = list(dict.fromkeys(card.stage for card in lesson.cards))
        self.assertEqual(LESSON_1_STAGES, stages)

    def test_unmigrated_lessons_keep_the_legacy_journey(self):
        for lesson in list(LESSONS.values())[1:]:
            with self.subTest(lesson=lesson.id):
                stages = list(dict.fromkeys(card.stage for card in lesson.cards))
                self.assertEqual(LEGACY_STAGES, stages)

    def test_lesson_1_stage_counts_match_the_reduced_design(self):
        lesson = LESSONS["lesson-1-people-actions"]
        counts = {
            stage: sum(card.stage == stage for card in lesson.cards)
            for stage in LESSON_1_STAGES
        }
        self.assertEqual(
            {"Learn": 8, "Recognize": 12, "Listen": 8, "Speak": 8, "Use": 8},
            counts,
        )
        self.assertEqual(44, len(lesson.cards))

    def test_lesson_1_speaking_starts_with_people_before_sentences(self):
        speak_cards = [
            card
            for card in LESSONS["lesson-1-people-actions"].cards
            if card.stage == "Speak"
        ]

        self.assertEqual(
            ["The boy", "The girl", "The woman", "The man"],
            [card.prompt for card in speak_cards[:4]],
        )

    def test_lesson_1_vocabulary_stays_within_the_first_step(self):
        lesson = LESSONS["lesson-1-people-actions"]
        self.assertEqual(
            {
                "the",
                "is",
                "boy",
                "girl",
                "man",
                "woman",
                "running",
                "walking",
                "sitting",
                "standing",
            },
            set(lesson.vocabulary),
        )
        lesson_text = " ".join(
            str(card.audio_text or card.answer_audio_text or card.prompt).lower()
            for card in lesson.cards
        )
        for deferred_word in ["are", "they", "not", "swimming", "sleeping", "reading", "writing"]:
            self.assertNotIn(deferred_word, lesson_text)

    def test_lesson_1_position_change_keeps_the_same_person(self):
        lesson = LESSONS["lesson-1-people-actions"]
        position_cards = {
            card.prompt: card
            for card in lesson.cards
            if card.stage == "Learn" and card.prompt in {"Sitting", "Standing"}
        }

        self.assertEqual({"Sitting", "Standing"}, set(position_cards))
        self.assertEqual(
            ["man_is_sitting.webp", "man_is_standing.webp"],
            [
                urlparse(position_cards[prompt].options[0].image_url).path.rsplit("/", 1)[-1]
                for prompt in ["Sitting", "Standing"]
            ],
        )

    def test_lesson_1_recognition_works_in_both_directions(self):
        cards = [card for card in LESSONS["lesson-1-people-actions"].cards if card.stage == "Recognize"]
        text_to_image = [
            card for card in cards
            if not card.prompt_image_url and all(option.image_url for option in card.options)
        ]
        image_to_text = [
            card for card in cards
            if card.prompt_image_url and all(not option.image_url for option in card.options)
        ]
        self.assertEqual(8, len(text_to_image))
        self.assertEqual(4, len(image_to_text))
        self.assertEqual(6, sum(len(card.options) == 2 for card in cards))
        self.assertEqual(6, sum(len(card.options) == 4 for card in cards))
        self.assertTrue(all(card.audio_text == card.prompt for card in text_to_image))
        self.assertTrue(all(not card.answer_audio_text for card in text_to_image))
        self.assertTrue(all(not card.audio_text for card in image_to_text))
        self.assertTrue(all(card.answer_audio_text for card in image_to_text))

    def test_lesson_1_listening_hides_the_answer_text(self):
        cards = [card for card in LESSONS["lesson-1-people-actions"].cards if card.stage == "Listen"]
        self.assertTrue(all(card.prompt == "Listen and choose." for card in cards))
        self.assertTrue(all(card.audio_text for card in cards))
        self.assertTrue(all(all(option.image_url for option in card.options) for card in cards))

    def test_lesson_1_use_cards_complete_sentences_without_a_grammar_stage(self):
        lesson = LESSONS["lesson-1-people-actions"]
        cards = [card for card in lesson.cards if card.stage == "Use"]
        self.assertTrue(all("___" in card.prompt for card in cards))
        self.assertTrue(all(card.prompt_image_url for card in cards))
        self.assertTrue(all(card.answer_audio_text for card in cards))
        self.assertTrue(all(all(not option.image_url for option in card.options) for card in cards))
        self.assertNotIn("Grammar", {card.stage for card in lesson.cards})

    def test_lesson_1_cards_have_valid_answers_and_assets(self):
        lesson = LESSONS["lesson-1-people-actions"]

        for index, card in enumerate(lesson.cards, 1):
            option_ids = [option.id for option in card.options]
            with self.subTest(card=index, stage=card.stage):
                self.assertEqual(len(option_ids), len(set(option_ids)))
                self.assertIn(card.correct_option_id, option_ids)

            image_urls = [card.prompt_image_url] if card.prompt_image_url else []
            image_urls.extend(option.image_url for option in card.options if option.image_url)
            for asset_url in image_urls:
                asset_name = urlparse(asset_url).path.rsplit("/", 1)[-1]
                with self.subTest(card=index, asset=asset_name):
                    self.assertTrue((LESSON_IMAGE_DIR / asset_name).is_file())

    def test_family_lessons_use_two_choices_before_four_choices_in_vocab(self):
        for lesson_id in ["lesson-4-family-members", "lesson-4-family-members-continued"]:
            lesson = LESSONS[lesson_id]
            option_counts = [
                len(card.options)
                for card in lesson.cards
                if card.stage == "New Vocab" and len(card.options) > 1
            ]
            first_four_choice = option_counts.index(4)

            with self.subTest(lesson=lesson_id):
                self.assertGreater(first_four_choice, 0)
                self.assertTrue(all(count == 2 for count in option_counts[:first_four_choice]))
                self.assertTrue(all(count == 4 for count in option_counts[first_four_choice:]))

    def test_family_action_sections_only_contain_ing_actions_and_negatives(self):
        for lesson_id in ["lesson-4-family-members", "lesson-4-family-members-continued"]:
            action_cards = [
                card for card in LESSONS[lesson_id].cards if card.stage == "Action Introduction"
            ]
            action_text = [str(card.audio_text or card.prompt).lower() for card in action_cards]

            with self.subTest(lesson=lesson_id):
                self.assertTrue(all("ing" in text for text in action_text), action_text)
                self.assertTrue(any(" not " in text for text in action_text), action_text)

    def test_family_split_and_following_lesson_numbers_are_in_order(self):
        self.assertEqual(
            ["1.1", "1.2", "1.3", "1.4", "1.5"],
            [lesson.sub_lesson_id for lesson in LESSONS.values()],
        )
        self.assertEqual(
            "Family Members Continued",
            LESSONS["lesson-4-family-members-continued"].sub_lesson_title,
        )
        self.assertNotIn("lesson-5-family-action-practice", LESSONS)
        self.assertEqual("Places Around Me", LESSONS["lesson-6-objects-places"].sub_lesson_title)

    def test_family_action_practice_is_distributed_between_family_lessons(self):
        expected_by_lesson = {
            "lesson-4-family-members": {
                "Children are studying.",
                "A brother is studying.",
            },
            "lesson-4-family-members-continued": {
                "The adults are playing.",
                "The grandparents are talking.",
                "The grandparents are sitting.",
                "The father is working.",
                "The mother is cooking.",
            },
        }
        for lesson_id, expected_sentences in expected_by_lesson.items():
            spoken_text = {
                card.audio_text
                for card in LESSONS[lesson_id].cards
                if card.audio_text
            }
            with self.subTest(lesson=lesson_id):
                self.assertTrue(expected_sentences.issubset(spoken_text))


if __name__ == "__main__":
    unittest.main()
