import unittest

from backend.app import main
from backend.app.data import LESSONS


def card_sequence(lesson):
    return [
        (
            card.slide_id,
            card.stage,
            card.prompt,
            card.interaction_type,
            card.correct_option_id,
        )
        for card in lesson.cards
    ]


class LessonDeliveryTests(unittest.TestCase):
    def test_delivery_preserves_authored_card_order_and_only_shuffles_options(self):
        source_option_orders = {
            lesson.id: [[option.id for option in card.options] for card in lesson.cards]
            for lesson in LESSONS.values()
        }

        for _ in range(3):
            for lesson in LESSONS.values():
                delivered = main.lesson_for_delivery(lesson)
                with self.subTest(lesson=lesson.id):
                    self.assertEqual(card_sequence(lesson), card_sequence(delivered))
                    self.assertEqual(len(lesson.cards), len(delivered.cards))
                    for source_card, delivered_card in zip(lesson.cards, delivered.cards):
                        self.assertCountEqual(
                            [option.id for option in source_card.options],
                            [option.id for option in delivered_card.options],
                        )

        self.assertEqual(
            source_option_orders,
            {
                lesson.id: [[option.id for option in card.options] for card in lesson.cards]
                for lesson in LESSONS.values()
            },
            "Delivery must not mutate the canonical authored lessons.",
        )


if __name__ == "__main__":
    unittest.main()
