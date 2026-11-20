"""Spelling stays out of A1 and A1+.

User decision, 2026-11-20, recorded in docs/product/project-guardrails.md: the
alphabet lessons 3.15 The Alphabet and 3.16 How Do You Spell It? (built
2026-11-18) were removed from A1 ("they are no good"), and A1+ does not take
spelling either. A1 Unit 3 is back to sixteen lessons, with the review at 3.15
and the mission at 3.16, and A1+ Unit 3 follows those sixteen.
"""
import json
import re
import unittest
from pathlib import Path

from scripts.content_engine.catalog import load_catalog, load_standards

ROOT = Path(__file__).resolve().parents[2]
REMOVED_IDS = {"lesson-3-15-the-alphabet", "lesson-3-16-how-do-you-spell-it"}
# A spelled group of capital letters ("A, H, J, K", "B, double O, K").
LETTER_GROUP = re.compile(r"\b[A-Z], (?:double )?[A-Z]\b")
SPELL = re.compile(r"(?i)\bspell\b")


class SpellingStaysOutTests(unittest.TestCase):
    def test_a1_unit_3_has_sixteen_lessons_ending_in_review_and_mission(self):
        unit = [lesson for lesson in load_catalog(ROOT, load_standards(ROOT, "a1"))
                if lesson.data.get("unit_id") == "unit-3"]
        numbers = sorted((lesson.number for lesson in unit), key=lambda n: int(n.split(".")[1]))
        self.assertEqual(numbers, [f"3.{n}" for n in range(1, 17)])
        by_number = {lesson.number: lesson.data for lesson in unit}
        self.assertEqual(by_number["3.15"]["id"], "lesson-3-9-unit-3-review")
        self.assertEqual(by_number["3.16"]["id"], "lesson-3-10-introduction-mission")

    def test_no_alphabet_or_spelling_lesson_in_a1_or_a1_plus(self):
        for course in ("a1", "a1-plus"):
            for lesson in load_catalog(ROOT, load_standards(ROOT, course)):
                data = lesson.data
                with self.subTest(course=course, lesson=lesson.number):
                    self.assertNotIn(data["id"], REMOVED_IDS)
                    for item in data.get("vocabulary") or []:
                        self.assertIsNone(SPELL.search(item), item)
                        self.assertIsNone(LETTER_GROUP.search(item), item)
                    for card in data.get("cards") or []:
                        for text in (card.get("audio_text"), card.get("prompt"), card.get("answer")):
                            if isinstance(text, str):
                                self.assertIsNone(SPELL.search(text), text)
                                self.assertIsNone(LETTER_GROUP.search(text), text)

    def test_generated_catalogs_have_no_alphabet_lessons(self):
        for name in ("a1-course.json", "all-courses.json"):
            lessons = json.loads((ROOT / "mobile/src/generated" / name).read_text(encoding="utf-8"))
            self.assertFalse({lesson["id"] for lesson in lessons} & REMOVED_IDS, name)
        for removed in REMOVED_IDS:
            self.assertFalse((ROOT / "backend/lessons/unit_3" / f"{removed}.yaml").exists())
            self.assertFalse((ROOT / "mobile/src/generated" / f"{removed}.json").exists())


if __name__ == "__main__":
    unittest.main()
