import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "docs" / "product" / "a1-reviewed-photoreal-media.json"
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"
WEB_ASSETS = ROOT / "Lessons" / "Lesson1" / "images"
MOBILE_ASSETS = ROOT / "mobile" / "assets" / "lesson-assets"
FRONTEND_ASSETS = ROOT / "frontend" / "public" / "lesson-assets"
SOURCE_ROOT = WEB_ASSETS / "course-photoreal-sources"


class CoursePhotorealGuardrailTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.filenames = self.registry["files"]

    def test_registry_is_large_and_unique(self) -> None:
        self.assertGreaterEqual(len(self.filenames), 236)
        self.assertEqual(len(self.filenames), len(set(self.filenames)))
        self.assertTrue(all(name.endswith(".webp") for name in self.filenames))

    def test_every_reviewed_runtime_image_has_exact_distribution_parity(self) -> None:
        for filename in self.filenames:
            web = WEB_ASSETS / filename
            mobile = MOBILE_ASSETS / filename
            frontend = FRONTEND_ASSETS / filename
            self.assertTrue(web.is_file(), f"Missing canonical asset {filename}")
            self.assertTrue(mobile.is_file(), f"Missing mobile asset {filename}")
            self.assertTrue(frontend.is_file(), f"Missing frontend asset {filename}")
            self.assertEqual(
                web.read_bytes(),
                mobile.read_bytes(),
                f"Reviewed web/mobile bytes differ for {filename}",
            )
            self.assertEqual(
                web.read_bytes(),
                frontend.read_bytes(),
                f"Reviewed web/frontend bytes differ for {filename}",
            )

    def test_reviewed_files_are_protected_in_the_media_manifest(self) -> None:
        payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
        source_by_filename = {
            item["filename"]: item["source"] for item in payload["assets"]
        }
        for filename in self.filenames:
            if filename in source_by_filename:
                self.assertEqual(
                    source_by_filename[filename],
                    "reviewed-photoreal",
                    f"The media builder may overwrite {filename}",
                )

    def test_generated_source_archives_are_preserved(self) -> None:
        minimums = {
            "unit-1": 5,
            "unit-2": 5,
            "unit-4": 12,
            "unit-5": 27,
            "unit-6": 6,
            "unit-7": 23,
        }
        for unit, minimum in minimums.items():
            sources = list((SOURCE_ROOT / unit).glob("*.png"))
            self.assertGreaterEqual(
                len(sources),
                minimum,
                f"The reviewed {unit} source archive is incomplete",
            )


if __name__ == "__main__":
    unittest.main()
