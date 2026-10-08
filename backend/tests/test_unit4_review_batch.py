"""Protect the screenshot corrections and shared image-bank integrity rule."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from backend.app.data import LESSONS
from scripts import validate_lesson_cards as validator

ROOT = Path(__file__).resolve().parents[2]


class ScreenshotBatchTests(unittest.TestCase):
    def test_identical_bytes_cannot_hide_under_different_option_filenames(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "one.webp").write_bytes(b"identical image payload")
            (root / "renamed.webp").write_bytes(b"identical image payload")
            options = [SimpleNamespace(id=name, image_url=f"/lesson-assets/{name}.webp")
                       for name in ("one", "renamed")]
            lesson = SimpleNamespace(id="fixture", cards=[SimpleNamespace(prompt="Choose", options=options)])
            with patch.object(validator, "LESSONS", {"fixture": lesson}), patch.object(validator, "LESSON_ASSET_DIR", root):
                self.assertIn("identical image bytes", " ".join(validator.validate_duplicate_option_images()))
                (root / "renamed.webp").write_bytes(b"different image payload")
                self.assertEqual(validator.validate_duplicate_option_images(), [])

    def test_independent_mission_answers_have_no_artificial_sequence(self):
        mission = LESSONS["lesson-4-10-my-day-mission"]
        expected = {
            "M11": "Yes, I do. We wash our clothes.",
            "M12": "No, I do not. They clean the table.",
            "M16": "Yes, I do. I open the door.",
            "M17": "Yes, I do. I close the door.",
        }
        for card in mission.cards:
            if card.slide_id in expected:
                self.assertEqual(card.prompt, expected[card.slide_id])
                self.assertEqual(card.mission_game.cues[0].answer_text, expected[card.slide_id])
            if card.stage == "Speak":
                self.assertNotRegex(card.prompt.lower(), r"\b(first|then|after that|finally)\b")

    def test_short_response_photos_do_not_reuse_the_opposite_gesture(self):
        for lesson in LESSONS.values():
            for card in lesson.cards:
                target = card.audio_text or card.prompt
                if target == "No, I do not.":
                    self.assertNotIn("review_repair_yes", card.prompt_image_url or "")
                    self.assertNotIn("a1_photo_u4_no_i_do_not_v1.webp", card.prompt_image_url or "")
        review = {c.slide_id: c for c in LESSONS["lesson-4-9-unit-4-review"].cards}
        self.assertIn("male_no", review["U4"].prompt_image_url)
        self.assertIn("repair_yes", review["U8"].prompt_image_url)

    def test_reviewed_replacements_keep_their_inspected_bytes_in_both_clients(self):
        records = json.loads((ROOT / "docs/product/unit4-review-repair-media-v1.json").read_text(encoding="utf-8"))["records"]
        active = [row for row in records if row["disposition"] == "usable"]
        self.assertEqual(len(active), 16)
        for row in active:
            for directory in ("Lessons/Lesson1/images", "mobile/assets/lesson-assets", "frontend/public/lesson-assets"):
                path = ROOT / directory / row["runtime_filename"]
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), row["runtime_sha256"], str(path))


if __name__ == "__main__":
    unittest.main()
