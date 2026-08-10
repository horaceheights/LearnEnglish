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


if __name__ == "__main__":
    unittest.main()
