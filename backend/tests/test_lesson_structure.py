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

    def test_lesson_1_3_uses_two_choices_before_four_choices(self):
        lesson = LESSONS["lesson-4-family-members"]
        practice_cards = [card for card in lesson.cards if card.stage == "Action Introduction"]

        self.assertTrue(all(len(card.options) == 2 for card in practice_cards[:16]))
        self.assertFalse(any(len(card.options) == 2 for card in practice_cards[16:]))
        self.assertTrue(any(len(card.options) == 4 for card in practice_cards[16:]))


if __name__ == "__main__":
    unittest.main()
