import unittest

from pydantic import ValidationError

from backend.app.schemas import LessonCard
from scripts.content_engine.plan import compose_card, import_card


class WrittenPromptPresentationTests(unittest.TestCase):
    def card(self, **overrides):
        return {
            "slide_id": "R1", "stage": "Recognize", "interaction_type": "t2i2",
            "prompt": "What day is it today?\nMonday",
            "audio_text": "What day is it today? Monday",
            "answer_audio_text": "Today is Monday.", "correct_option_id": "a",
            "options": [{"id": "a", "label": "", "image_url": "a.webp"},
                        {"id": "b", "label": "", "image_url": "b.webp"}],
            **overrides,
        }

    def test_written_presentation_round_trips_with_independent_pronunciation(self):
        source = self.card(prompt_presentation="written")
        payload = LessonCard(**source).model_dump(mode="json")
        self.assertEqual(payload["prompt_presentation"], "written")
        self.assertEqual(payload["prompt"], source["prompt"])
        self.assertEqual(payload["audio_text"], source["audio_text"])
        self.assertEqual(compose_card(import_card(source)), source)

    def test_optional_field_never_changes_unaffected_api_or_export_payloads(self):
        ordinary = LessonCard(**self.card())
        self.assertNotIn("prompt_presentation", ordinary.model_dump(mode="json"))
        self.assertNotIn("prompt_presentation", ordinary.model_dump_json())
        explicit_null = LessonCard(**self.card(prompt_presentation=None))
        self.assertEqual(explicit_null.model_dump(mode="json"), ordinary.model_dump(mode="json"))
        self.assertNotIn("prompt_presentation", compose_card(import_card(self.card())))

    def test_unrecognized_modes_fail_closed(self):
        for mode in ("silent", "listening", "", 1):
            with self.subTest(mode=mode), self.assertRaises(ValidationError):
                LessonCard(**self.card(prompt_presentation=mode))


if __name__ == "__main__":
    unittest.main()
