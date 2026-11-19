"""Traducir on every written-choice slide: Reconoce, Escucha and mission replies (2026-11-18)."""
import unittest
from copy import deepcopy
from types import SimpleNamespace

from backend.app.data import ALL_LESSONS
from backend.app.schemas import ChoiceOption
from scripts.validate_lesson_cards import (
    option_translation_card,
    validate_option_translations,
)


def _card(*options, stage="Recognize", prompt_image_url="/lesson-assets/a1_bag.webp", mission_game=None):
    return SimpleNamespace(
        stage=stage, slide_id="R1", prompt_image_url=prompt_image_url, mission_game=mission_game,
        options=[ChoiceOption(id=f"o{index}", label=label, spanish_translation=spanish)
                 for index, (label, spanish) in enumerate(options)])


def _lesson(card):
    return SimpleNamespace(id="lesson-test", cards=[card])


class OptionTranslationTests(unittest.TestCase):
    def test_every_course_written_choice_has_real_spanish(self):
        lessons = list(ALL_LESSONS.values())
        qualifying = [card for lesson in lessons for card in lesson.cards if option_translation_card(card)]
        self.assertGreater(sum(card.stage == "Recognize" for card in qualifying), 600)
        self.assertGreater(sum(card.stage == "Listen" and getattr(card, "mission_game", None) is None for card in qualifying), 550)
        self.assertGreaterEqual(sum(getattr(card, "mission_game", None) is not None for card in qualifying), 12)
        self.assertEqual(validate_option_translations(lessons), [])

    def test_missing_instruction_fallback_and_duplicate_spanish_fail(self):
        cases = {
            "needs its Spanish": _card(("It is a bag.", "Es una bolsa."), ("It is a pen.", None)),
            "instruction or fallback": _card(("It is a bag.", "Elige la frase correcta."),
                                             ("It is a pen.", "Es un bolígrafo.")),
            "fallback": _card(("It is a bag.", "Traducción no disponible todavía."),
                              ("It is a pen.", "Es un bolígrafo.")),
            "same Spanish": _card(("These are his shoes.", "Estos son sus zapatos."),
                                  ("These are her shoes.", "Estos son sus zapatos.")),
        }
        for label, card in cases.items():
            with self.subTest(label):
                self.assertTrue(validate_option_translations([_lesson(card)]))

    def test_written_choice_slides_qualify_and_completa_and_picture_choices_do_not(self):
        written = _card(("It is a bag.", "Es una bolsa."), ("It is a pen.", "Es un bolígrafo."))
        self.assertTrue(option_translation_card(written))
        self.assertTrue(option_translation_card(_card(("A", "Uno"), ("B", "Dos"), stage="Listen")))
        self.assertTrue(option_translation_card(_card(("A", "Uno"), ("B", "Dos"), prompt_image_url="")))
        self.assertTrue(option_translation_card(_card(("At five.", "A las cinco."), ("At six.", "A las seis."),
            stage="Listen", mission_game=SimpleNamespace(kind="conversation-decision"))))
        self.assertFalse(option_translation_card(_card(("A", "Uno"), ("B", "Dos"), stage="Use")),
                         "Completa keeps its sentence tap (user decision 2026-11-18).")
        self.assertFalse(option_translation_card(_card(("A boy.", "Un niño."), ("A girl.", "Una niña."),
            stage="Listen", mission_game=SimpleNamespace(kind="crowd-search"))))
        pictured = deepcopy(written)
        pictured.options[0] = ChoiceOption(id="o0", label="It is a bag.", image_url="/lesson-assets/a1_bag.webp")
        self.assertFalse(option_translation_card(pictured))

    def test_unset_choice_spanish_is_omitted_from_serialized_choices(self):
        self.assertNotIn("spanish_translation", ChoiceOption(id="a", label="A bag").model_dump())
        self.assertEqual(
            ChoiceOption(id="a", label="A bag", spanish_translation="Una bolsa").model_dump()["spanish_translation"],
            "Una bolsa")


if __name__ == "__main__":
    unittest.main()
