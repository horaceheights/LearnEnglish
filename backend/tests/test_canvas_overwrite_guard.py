import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_a1_units_2_7 import guard_existing_lessons


class CanvasOverwriteGuardTests(unittest.TestCase):
    def test_new_export_and_identical_repeat_are_safe(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            path = root / "unit_2" / "lesson.yaml"
            payload = {"id": "lesson", "cards": []}
            guard_existing_lessons([(path, payload)], root)
            self.assertFalse(path.parent.exists())
            path.parent.mkdir()
            path.write_text(json.dumps(payload), encoding="utf-8")
            guard_existing_lessons([(path, payload)], root)

    def test_mission_and_newer_completa_cannot_be_replaced(self):
        for kind in ("mission", "complete-sentence"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                path = root / "lesson.yaml"
                original = json.dumps({"id": "lesson", "experience_type": kind})
                path.write_text(original, encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "No files were written"):
                    guard_existing_lessons([(path, {"id": "lesson", "cards": []})], root)
                self.assertEqual(original, path.read_text(encoding="utf-8"))

    def test_renamed_and_hand_authored_lessons_are_preserved(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            old = root / "custom-mission.yaml"
            original = "id: custom-mission\nexperience_type: mission\n"
            old.write_text(original, encoding="utf-8")
            new = root / "canvas-mission.yaml"
            with self.assertRaisesRegex(ValueError, "would remove"):
                guard_existing_lessons([(new, {"id": "canvas-mission"})], root)
            self.assertFalse(new.exists())
            self.assertEqual(original, old.read_text(encoding="utf-8"))
            with self.assertRaisesRegex(ValueError, "not this exporter's JSON"):
                guard_existing_lessons([(old, {"id": "custom-mission"})], root)


if __name__ == "__main__":
    unittest.main()
