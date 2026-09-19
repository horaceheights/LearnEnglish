"""Numbers are taught with numerals, and counting photos wait for their nouns.

User decision, 2026-09-19: a lesson that introduces a number shows the numeral
itself. A photo of counted objects may only come back once the learner has been
taught both the number word and the name of the object being counted.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import unittest

from scripts.audit_course_media_preservation import IMAGE_ROOTS, images, lessons


ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "docs" / "product" / "a1-counting-photos.json"
COURSE_SCREEN = ROOT / "mobile" / "src" / "screens" / "CourseScreen.tsx"
NUMERAL_CARD = "a1_photo_number_card_{:02d}_v1.webp"
# Lesson 2.6 teaches the number words one to ten.
NUMBER_WORDS_LESSON = (2, 6)


def order(lesson: dict) -> tuple[int, int]:
    unit, number = str(lesson["sub_lesson_id"]).split(".")
    return int(unit), int(number)


def teaches(word: str, lesson: dict) -> bool:
    """Whether a lesson declares ``word`` (singular or plural) as vocabulary."""
    forms = {word, f"{word}s", f"{word}es"}
    if word.endswith("y"):
        forms.add(f"{word[:-1]}ies")
    declared = {token.lower() for entry in lesson.get("vocabulary", [])
                for token in re.findall(r"[a-zA-Z]+", str(entry))}
    return bool(forms & declared)


class NumberTeachingImageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        cls.lessons = lessons(ROOT)
        cls.counting = {row["filename"]: row for row in cls.registry["photos"]}

    def test_counting_photos_are_preserved_byte_for_byte(self) -> None:
        for filename, row in self.counting.items():
            for folder in IMAGE_ROOTS:
                path = ROOT / folder / filename
                with self.subTest(filename=filename, folder=folder):
                    self.assertTrue(path.is_file(), f"{filename} must stay available for later counting lessons")
                    self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), row["sha256"])

    def test_four_card_copies_are_still_unreframed_duplicates(self) -> None:
        # Recorded so a later counting lesson does not mistake them for real reframes.
        for filename, row in self.counting.items():
            if "byte_identical_copy_of" not in row:
                continue
            with self.subTest(filename=filename):
                self.assertEqual(row["sha256"], self.counting[row["byte_identical_copy_of"]]["sha256"])

    def test_lesson_2_6_introduces_every_number_with_its_numeral(self) -> None:
        lesson = self.lessons["lesson-2-6-numbers-1-10"]
        teaching = {card["slide_id"]: card for card in lesson["cards"] if card.get("stage") == "Learn"}
        for number in range(1, 11):
            with self.subTest(number=number):
                card = teaching[f"L{number}"]
                self.assertEqual(card["options"][0]["image_url"], NUMERAL_CARD.format(number))

    def test_no_lesson_counts_objects_the_learner_has_not_been_taught(self) -> None:
        for lesson in self.lessons.values():
            bound = images(lesson) & set(self.counting)
            for filename in sorted(bound):
                row = self.counting[filename]
                with self.subTest(lesson=lesson["sub_lesson_id"], filename=filename):
                    self.assertGreaterEqual(
                        order(lesson), NUMBER_WORDS_LESSON,
                        f"{filename} counts objects before Lesson 2.6 teaches the number words")
                    taught = [other for other in self.lessons.values()
                              if teaches(row["noun"], other) and order(other) <= order(lesson)]
                    self.assertTrue(
                        taught,
                        f"{lesson['sub_lesson_id']} counts {row['count']} of them before any lesson "
                        f"teaches '{row['noun']}'")

    def test_course_menu_never_opens_a_lesson_with_an_untaught_counted_object(self) -> None:
        source = COURSE_SCREEN.read_text(encoding="utf-8")
        entries = re.findall(r"'(lesson-[^'\s]+)':\s*\{\s*image:\s*'([^']+)'", source)
        self.assertGreaterEqual(len(entries), 70, "CourseScreen must keep an explicit thumbnail per lesson")
        for lesson_id, filename in entries:
            row = self.counting.get(filename)
            if row is None:
                continue
            lesson = self.lessons[lesson_id]
            with self.subTest(lesson=lesson_id, filename=filename):
                taught = [other for other in self.lessons.values()
                          if teaches(row["noun"], other) and order(other) <= order(lesson)]
                self.assertTrue(taught, f"{lesson_id}'s thumbnail shows {row['noun']}s before they are taught")


if __name__ == "__main__":
    unittest.main()
