import unittest

from backend.app.data import LESSONS


EXPECTED_STAGES = [
    "New Vocab",
    "Action Introduction",
    "Plural Challenge",
    "Listen",
    "Pronunciation Practice",
    "Grammar",
]


class LessonStructureTests(unittest.TestCase):
    def test_every_lesson_uses_the_lesson_1_1_journey(self):
        for lesson in LESSONS.values():
            with self.subTest(lesson=lesson.id):
                stages = list(dict.fromkeys(card.stage for card in lesson.cards))
                self.assertEqual(EXPECTED_STAGES, stages)

    def test_every_shared_stage_contains_cards(self):
        for lesson in LESSONS.values():
            counts = {
                stage: sum(card.stage == stage for card in lesson.cards)
                for stage in EXPECTED_STAGES
            }
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(count > 0 for count in counts.values()), counts)

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
