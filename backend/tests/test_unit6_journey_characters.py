"""Regression contracts for the corrected journey protagonist, independent of audio approval."""
import json
import hashlib
import re
import unittest
from pathlib import Path
from backend.app.course_audio_profile import NARRATION_SPEAKER_ROLES
from scripts.content_engine.plan import compose_lesson

ROOT = Path(__file__).resolve().parents[2]
BRIEFS = ROOT / "docs/product/content-briefs/unit6-story-2026-10-10"
PLANS = ROOT / "docs/product/content-plans/unit6-story-2026-10-10"

def brief(number):
    return json.loads((BRIEFS / f"{number}.json").read_text(encoding="utf-8"))

class Unit6JourneyCharacterTests(unittest.TestCase):
    def test_all_fourteen_engine_plans_reproduce_installed_lessons(self):
        paths = list(PLANS.glob("*.plan.json"))
        self.assertEqual(14, len(paths))
        for path in paths:
            plan = json.loads(path.read_text(encoding="utf-8"))
            installed = json.loads((ROOT / plan["source"]["path"]).read_text(encoding="utf-8"))
            self.assertEqual(compose_lesson(plan), installed, path.name)

    def test_plural_train_travellers_use_the_reviewed_two_person_scene(self):
        item = next(i for i in brief("6.2")["items"] if i["id"] == "train-people")
        self.assertEqual("They go by train.", item["text"])
        self.assertTrue(item["image"].endswith("a1_photo_u6_pair_boards_train_v1.webp"))

    def test_first_person_story_models_have_explicit_character_voices(self):
        for path in BRIEFS.glob("*.json"):
            data = json.loads(path.read_text(encoding="utf-8"))
            for item in data.get("items", []):
                if re.search(r"\b(?:I|we)\b", item["text"], re.I):
                    with self.subTest(lesson=path.stem, item=item["id"]):
                        self.assertTrue(item.get("speaker"))
                        self.assertNotIn(item["speaker"], NARRATION_SPEAKER_ROLES)

    def test_arrivals_keep_ana_visible_in_distinct_arrival_scenes(self):
        expected = {
            "6.2": ("at-library", "ana_at_library_v1.webp"),
            "6.7": ("at-station", "ana_at_station_v1.webp"),
        }
        for number, (key, filename) in expected.items():
            item = next(i for i in brief(number)["items"] if i["id"] == key)
            self.assertEqual("ana", item["speaker"])
            self.assertTrue(item["image"].endswith(filename))
            self.assertTrue((ROOT / "Lessons/Lesson1/images" / Path(item["image"]).name).is_file())

    def test_station_departure_exit_arrival_share_a_voice_and_preserve_order(self):
        data = brief("6.7")
        items = {i["id"]: i for i in data["items"]}
        images = set()
        for key in ("station-going", "taxi-out", "at-station"):
            self.assertEqual("ana", items[key]["speaker"])
            images.add(items[key]["image"])
        self.assertEqual(3, len(images))
        sequence = data["stage_sequences"]["Speak"]
        self.assertLess(sequence.index("taxi-in"), sequence.index("taxi-out"))
        self.assertLess(sequence.index("taxi-in"), sequence.index("station-going"))
        self.assertLess(sequence.index("station-going"), sequence.index("taxi-out"))
        self.assertLess(sequence.index("taxi-out"), sequence.index("at-station"))
        lesson = compose_lesson(json.loads((PLANS / "6.7.plan.json").read_text(encoding="utf-8")))
        for card in lesson["cards"]:
            if card["slide_id"] in ("A6", "A10", "S12"):
                self.assertEqual(2, card["audio_revision"])
                self.assertEqual("ana", card["audio_speaker"])

    def test_corrections_preserve_the_approved_card_allocation(self):
        for number in range(1, 14):
            plan = json.loads((PLANS / f"6.{number}.plan.json").read_text(encoding="utf-8"))
            self.assertEqual(54 if number == 13 else 42, len(compose_lesson(plan)["cards"]))

    def test_departure_images_keep_the_exact_reviewed_direction_corrections(self):
        review = json.loads((PLANS / "schedule-direction-review.json").read_text(encoding="utf-8"))
        lesson = compose_lesson(json.loads((PLANS / "6.12.plan.json").read_text(encoding="utf-8")))
        rendered = json.dumps(lesson)
        # Pixel meaning is reviewed by a person; this guard prevents stale evidence,
        # rejected substitutions, or a new crop from silently reusing that review.
        for row in review["replacements"]:
            self.assertNotIn(row["old_image"], rendered)
            self.assertIn(row["new_image"], rendered)
            for version in ("old", "new"):
                image = ROOT / "Lessons/Lesson1/images" / row[f"{version}_image"]
                self.assertEqual(row[f"{version}_sha256"], hashlib.sha256(image.read_bytes()).hexdigest())
            for card in lesson["cards"]:
                if row["new_image"] in json.dumps(card):
                    self.assertLessEqual(len(card.get("options", [])), 2)
        self.assertNotIn("train_leaves_ten_v2.webp", rendered)

if __name__ == "__main__":
    unittest.main()
