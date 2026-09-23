import copy
import json
import unittest
from pathlib import Path

from scripts.content_engine.catalog import load_catalog, load_standards
from scripts.content_engine.plan import compose_lesson, import_card, import_lesson, recipe_coverage

ROOT = Path(__file__).resolve().parents[2]


def option(identifier, label=None, image=""):
    return {"id": identifier, "image_url": image, "label": label}


class ContentEnginePlanTests(unittest.TestCase):
    def test_every_live_lesson_rebuilds_exactly_from_its_plan(self):
        catalog = load_catalog(ROOT, load_standards(ROOT, "a1"))
        self.assertTrue(catalog)
        for lesson in catalog:
            with self.subTest(lesson=lesson.number):
                original = copy.deepcopy(lesson.data)
                plan = json.loads(json.dumps(import_lesson(lesson.data), ensure_ascii=False))
                self.assertEqual(compose_lesson(plan), original)
                self.assertEqual(lesson.data, original, "Importing must not modify the lesson.")

    def test_a_standard_teach_card_is_pure_recipe_content(self):
        card = {"slide_id": "L1", "interaction_type": "teach", "prompt": "A boy", "stage": "Learn",
                "correct_option_id": "boy", "options": [option("boy", "A boy", "boy.webp")],
                "audio_text": "A boy", "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": "Un niño", "pedagogy_note": "introduces boy"}
        spec = import_card(card)
        self.assertEqual(spec["recipe"], "teach")
        self.assertNotIn("exceptions", spec)
        for predicted in ("interaction_type", "prompt", "audio_text", "correct_option_id"):
            self.assertNotIn(predicted, spec)

    def test_caption_free_listening_keeps_its_authored_cue(self):
        card = {"slide_id": "A1", "interaction_type": "a2i2", "prompt": "Listen and choose.", "stage": "Listen",
                "correct_option_id": "apple", "options": [option("banana", image="b.webp"), option("apple", image="a.webp")],
                "audio_text": "An apple", "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": "Escucha y elige."}
        spec = import_card(card)
        self.assertEqual((spec["answer"], spec["audio_text"]), (1, "An apple"))
        self.assertNotIn("exceptions", spec)

    def test_deviations_are_counted_exceptions_not_lost(self):
        card = {"slide_id": "S1", "interaction_type": "repeat", "prompt": "It is a park.", "stage": "Speak",
                "correct_option_id": "park", "options": [option("park", "It is a park.", "park.webp")],
                "audio_text": "It is a park.", "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": "Es un parque."}
        plan = {"plan_version": 1, "lesson": {"id": "x"}, "cards": [import_card(card)]}
        self.assertEqual(plan["cards"][0]["exceptions"], {"interaction_type": "repeat"})
        self.assertEqual(compose_lesson(plan)["cards"][0], card)
        self.assertEqual(recipe_coverage(plan)["pure"], 0)

    def test_absent_fields_survive_a_round_trip(self):
        card = {"slide_id": "R1", "interaction_type": "i2t2", "prompt": "", "stage": "Recognize",
                "correct_option_id": "a", "options": [option("a", "It is a park."), option("b", "It is a bank.")],
                "audio_text": None, "answer_audio_text": "It is a park.", "prompt_image_url": "park.webp",
                "spanish_translation": "Elige la oración."}
        plan = {"plan_version": 1, "lesson": {}, "cards": [import_card(card)]}
        self.assertEqual(compose_lesson(plan)["cards"][0], card)


if __name__ == "__main__":
    unittest.main()
