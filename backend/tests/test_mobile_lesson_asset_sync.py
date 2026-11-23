from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
HELPER_PATH = ROOT / "scripts" / "lesson_asset_sync.py"
SPEC = importlib.util.spec_from_file_location("lesson_asset_sync", HELPER_PATH)
assert SPEC and SPEC.loader
HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPER)


class MobileLessonAssetSyncTests(unittest.TestCase):
    def test_same_size_but_different_asset_bytes_are_replaced(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "canonical.webp"
            destination = root / "mobile.webp"
            source.write_bytes(b"RIGHT")
            destination.write_bytes(b"WRONG")

            copied = HELPER.copy_lesson_image_if_changed(source, destination)

            self.assertTrue(copied)
            self.assertEqual(destination.read_bytes(), b"RIGHT")

    def test_identical_asset_bytes_are_not_rewritten(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "canonical.webp"
            destination = root / "mobile.webp"
            source.write_bytes(b"SAME")
            destination.write_bytes(b"SAME")

            copied = HELPER.copy_lesson_image_if_changed(source, destination)

            self.assertFalse(copied)


if __name__ == "__main__":
    unittest.main()
