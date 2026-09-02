import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CANVAS = ROOT / "docs" / "product" / "a1-course-canvas.json"
UNIT3_LESSONS = ROOT / "backend" / "lessons" / "unit_3"
WEB_ASSETS = ROOT / "Lessons" / "Lesson1" / "images"
MOBILE_ASSETS = ROOT / "mobile" / "assets" / "lesson-assets"
APPROVED_SOURCES = WEB_ASSETS / "unit-3-approved-sources"


def image_references(value: object) -> set[str]:
    references: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"image_url", "prompt_image_url"} and isinstance(child, str):
                filename = child.strip().removeprefix("/lesson-assets/")
                if filename:
                    references.add(filename)
            references.update(image_references(child))
    elif isinstance(value, list):
        for child in value:
            references.update(image_references(child))
    return references


class Unit3PhotorealGuardrailTests(unittest.TestCase):
    def setUp(self) -> None:
        canvas = json.loads(CANVAS.read_text(encoding="utf-8"))
        self.unit = next(unit for unit in canvas["units"] if int(unit["unit"]) == 3)

    def test_scene_contracts_do_not_restore_legacy_diagram_cues(self) -> None:
        forbidden = re.compile(
            r"speech bubble tail|halo required|role badge|birthday-cake icon|"
            r"dot array|ownership link icon|two separate equal panels",
            re.IGNORECASE,
        )
        for lesson in self.unit["lessons"]:
            for concept, description in lesson["scene_contract"].items():
                self.assertIsNone(
                    forbidden.search(description),
                    f"{lesson['id']} {concept} restores a legacy diagram cue: {description}",
                )

    def test_recast_prone_professions_use_new_people(self) -> None:
        professions = next(
            lesson for lesson in self.unit["lessons"] if lesson["id"] == "3.6"
        )["scene_contract"]
        for concept in ("cook-sofia", "farmer-ana", "nurse-sofia"):
            description = professions[concept].lower()
            self.assertIn("new", description)
            self.assertIn("instead of recasting", description)

    def test_approved_source_archive_is_preserved(self) -> None:
        sources = sorted(APPROVED_SOURCES.glob("*.png"))
        self.assertGreaterEqual(
            len(sources),
            66,
            "The approved Unit 3 source archive must not be replaced by generic composites.",
        )

    def test_every_unit3_runtime_image_has_exact_mobile_parity(self) -> None:
        references: set[str] = set()
        for lesson_path in UNIT3_LESSONS.glob("*.yaml"):
            references.update(
                image_references(json.loads(lesson_path.read_text(encoding="utf-8")))
            )

        self.assertGreaterEqual(len(references), 83)
        for filename in sorted(references):
            web = WEB_ASSETS / filename
            mobile = MOBILE_ASSETS / filename
            self.assertTrue(web.is_file(), f"Missing canonical Unit 3 asset {filename}")
            self.assertTrue(mobile.is_file(), f"Missing mobile Unit 3 asset {filename}")
            self.assertEqual(
                web.read_bytes(),
                mobile.read_bytes(),
                f"Unit 3 web/mobile asset bytes differ for {filename}",
            )

    def test_composite_refresh_protects_reviewed_photography(self) -> None:
        builder = (ROOT / "scripts" / "build_a1_media_composites.py").read_text(
            encoding="utf-8"
        )
        self.assertGreaterEqual(builder.count('"reviewed-photoreal"'), 2)


if __name__ == "__main__":
    unittest.main()
