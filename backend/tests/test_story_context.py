"""Visible context must preserve old payloads and hidden-answer boundaries."""
import unittest
from types import SimpleNamespace
from pydantic import ValidationError
from backend.app.schemas import LessonCard
from backend.app.tutor_context import build_tutor_context


class StoryContextTests(unittest.TestCase):
    def card(self, **changes):
        return LessonCard(**dict(
            {"slide_id": "A1", "stage": "Listen", "interaction_type": "a2t2",
             "prompt": "Listen and choose.", "audio_text": "It is cold.",
             "correct_option_id": "cold", "options": [
                 {"id": "cold", "label": "It is cold."},
                 {"id": "hot", "label": "It is hot."}]}, **changes))

    def test_legacy_payload_does_not_gain_a_null_field(self):
        self.assertNotIn("context_es", self.card().model_dump(mode="json"))

    def test_context_survives_serialization_without_disclosing_listening_answer(self):
        card = self.card(context_es="Otro día, en otro lugar.")
        restored = LessonCard(**card.model_dump(mode="json"))
        lesson = SimpleNamespace(sub_lesson_title="Weather", level="A1", goal="Ask about weather",
                                 vocabulary=["cold", "hot"], grammar_function="It is", prerequisite="Earlier lessons")
        context = build_tutor_context(lesson, restored)
        self.assertEqual(context["visible_story_context"], "Otro día, en otro lugar.")
        for hidden in ("heard_model", "answer_model", "expected_words", "prompt"):
            self.assertNotIn(hidden, context)

    def test_empty_padded_and_overlong_context_is_rejected(self):
        for value in ("", "   ", " Contexto", "Contexto ", "a" * 241):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                self.card(context_es=value)


if __name__ == "__main__":
    unittest.main()
