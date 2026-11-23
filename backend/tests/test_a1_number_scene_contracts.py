from __future__ import annotations

import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
CANVAS_PATH = ROOT / "docs" / "product" / "a1-course-canvas.json"
UNIT_2_PATH = ROOT / "docs" / "product" / "unit-2-curriculum.json"
COUNTED_OBJECT = re.compile(r"\b(?:stars?|dots?|apples?|bananas?|oranges?|mugs?|pens?|pencils?|blocks?)\b", re.IGNORECASE)


def lesson(payload: dict[str, object], lesson_id: str) -> dict[str, object]:
    units = payload.get("units")
    if isinstance(units, list):
        lessons = [
            item
            for unit in units
            if isinstance(unit, dict)
            for item in unit.get("lessons", [])
            if isinstance(item, dict)
        ]
    else:
        unit = payload.get("unit", {})
        lessons = unit.get("lessons", []) if isinstance(unit, dict) else []
    return next(item for item in lessons if item.get("id") == lesson_id)


class A1NumberSceneContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.canvas = json.loads(CANVAS_PATH.read_text(encoding="utf-8"))
        cls.unit_2 = json.loads(UNIT_2_PATH.read_text(encoding="utf-8"))

    def test_number_one_to_ten_contracts_show_the_numeral_not_counted_objects(self) -> None:
        # Numbers are introduced with the numeral itself (user decision, 2026-09-19);
        # counting photos wait until the learner has been taught the counted noun.
        canvas_contracts = lesson(self.canvas, "2.6")["scene_contract"]
        unit_contracts = lesson(self.unit_2, "2.6")["scene_contract"]

        for number in range(1, 11):
            key = f"n{number}"
            with self.subTest(number=number):
                description = canvas_contracts[key]
                self.assertEqual(unit_contracts[key], description)
                self.assertIn("photoreal community-center registration", description)
                self.assertIn("holds one physical card", description)
                self.assertTrue(description.endswith(f"showing only the large numeral {number}"))
                self.assertIsNone(COUNTED_OBJECT.search(description), description)

    def test_reused_number_cards_keep_explicit_truthful_contracts(self) -> None:
        repeated = {
            ("2.7", "n2"): 2,
            ("2.7", "n4"): 4,
        }

        for (lesson_id, key), number in repeated.items():
            with self.subTest(lesson_id=lesson_id, key=key):
                description = lesson(self.canvas, lesson_id)["scene_contract"][key]
                self.assertIn("reuse the established", description)
                self.assertTrue(description.endswith(f"showing only the large numeral {number}"))
                self.assertEqual(
                    description.split(": ", 1)[1],
                    lesson(self.canvas, "2.6")["scene_contract"][key],
                )
                self.assertNotIn("approved", description.lower())
                self.assertIsNone(COUNTED_OBJECT.search(description), description)

    def test_unit3_number_cards_use_real_people_and_physical_numerals(self) -> None:
        person_cards = {
            ("3.3", "n3"): 3,
            ("3.4", "n6"): 6,
            ("3.4", "n8"): 8,
            ("3.4", "n10"): 10,
            ("3.9", "n7"): 7,
        }

        for (lesson_id, key), number in person_cards.items():
            with self.subTest(lesson_id=lesson_id, key=key):
                description = lesson(self.canvas, lesson_id)["scene_contract"][key]
                self.assertIn("photoreal community-center registration", description)
                self.assertIn("holds one physical card", description)
                self.assertIn(f"large numeral {number}", description)
                self.assertNotIn("approved", description.lower())
                self.assertNotIn("star", description.lower())

    def test_scene_contract_prose_never_claims_formal_approval(self) -> None:
        for payload_name, payload in (("canvas", self.canvas), ("unit-2", self.unit_2)):
            units = payload.get("units")
            if isinstance(units, list):
                lessons = [
                    item
                    for unit in units
                    if isinstance(unit, dict)
                    for item in unit.get("lessons", [])
                    if isinstance(item, dict)
                ]
            else:
                unit = payload.get("unit", {})
                lessons = unit.get("lessons", []) if isinstance(unit, dict) else []

            for item in lessons:
                for key, description in item.get("scene_contract", {}).items():
                    with self.subTest(payload=payload_name, lesson=item.get("id"), key=key):
                        self.assertNotIn("approved", str(description).lower())


if __name__ == "__main__":
    unittest.main()
