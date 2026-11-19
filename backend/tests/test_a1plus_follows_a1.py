"""A1+ follows A1 lesson by lesson, by number.

User decisions recorded in docs/product/project-guardrails.md ("A1+ lesson
standards"): every A1+ lesson X.Y follows up A1 X.Y (2026-11-09), and after A1
Unit 1 gained 1.10 Pets and 1.11 Friends and People, A1+ Unit 1 follows the new
numbering: 1.10 Pets, 1.11 Friends and People, 1.12 review, 1.13 mission
(2026-11-18).

A rebuilt A1+ lesson names its source at the start of its grammar_function
("A follow-up of A1 1.6 Parents and Grandparents: ..."). The lessons that
predate the rule and the follow-ups not built yet are listed below, and both
lists only shrink. An A1 lesson added to a unit that A1+ already has must be
added to the A1+ plan (the guardrails and NOT_YET_BUILT) in the same change.
"""
import re
import unittest
from pathlib import Path

from scripts.content_engine.catalog import load_catalog, load_standards

ROOT = Path(__file__).resolve().parents[2]

# A1+ lessons that predate the same-number rule. Remove a number when its
# position is rebuilt as the follow-up of the A1 lesson with the same number.
NOT_YET_REBUILT: set[str] = set()
# A1 lessons whose A1+ follow-up does not exist yet.
NOT_YET_BUILT: set[str] = set()


def lessons(course: str) -> dict:
    return {lesson.number: lesson for lesson in load_catalog(ROOT, load_standards(ROOT, course))}


def names_its_source(lesson) -> bool:
    text = lesson.data.get("grammar_function") or ""
    return re.match(rf"A follow-up of A1 {re.escape(lesson.number)}(?!\d)", text) is not None


class A1PlusFollowsA1Tests(unittest.TestCase):
    def setUp(self):
        self.a1 = lessons("a1")
        self.a1plus = lessons("a1-plus")

    def test_every_rebuilt_lesson_follows_the_a1_lesson_with_its_number(self):
        problems = []
        for number, lesson in self.a1plus.items():
            if number in NOT_YET_REBUILT:
                continue
            source = self.a1.get(number)
            if source is None:
                problems.append(f"A1+ {number} has no A1 {number} to follow up")
                continue
            if not names_its_source(lesson):
                problems.append(f"A1+ {number} grammar_function must open with 'A follow-up of A1 {number}'")
            if lesson.role != source.role:
                problems.append(f"A1+ {number} is a {lesson.role}, but A1 {number} is a {source.role}")
        self.assertEqual(problems, [], "Every A1+ lesson follows up the A1 lesson with the same number.")

    def test_every_a1_lesson_in_an_a1plus_unit_has_a_planned_follow_up(self):
        for unit in sorted({lesson.unit for lesson in self.a1plus.values()}):
            a1_numbers = {number for number, lesson in self.a1.items() if lesson.unit == unit}
            a1plus_numbers = {number for number, lesson in self.a1plus.items() if lesson.unit == unit}
            planned = {number for number in NOT_YET_BUILT if int(number.split(".")[0]) == unit}
            self.assertEqual(
                a1plus_numbers | planned, a1_numbers,
                f"A1+ Unit {unit} follows A1 Unit {unit} lesson by lesson: name each new A1 lesson's "
                "follow-up in the guardrails and NOT_YET_BUILT, and retire A1+ lessons with no A1 source.",
            )

    def test_the_waiting_lists_only_hold_lessons_still_waiting(self):
        built = set(self.a1plus) & NOT_YET_BUILT
        self.assertEqual(built, set(), "Remove built follow-ups from NOT_YET_BUILT.")
        for number in sorted(NOT_YET_REBUILT):
            self.assertIn(number, self.a1plus, f"A1+ {number} is not in the catalog; remove it from NOT_YET_REBUILT.")
            self.assertFalse(
                names_its_source(self.a1plus[number]),
                f"A1+ {number} has been rebuilt as a follow-up; remove it from NOT_YET_REBUILT.",
            )

    def test_the_source_check_reads_the_exact_lesson_number(self):
        lesson = type("Lesson", (), {"number": "1.1", "data": {"grammar_function": "A follow-up of A1 1.10 Pets: x"}})
        self.assertFalse(names_its_source(lesson))
        lesson.data = {"grammar_function": "A follow-up of A1 1.1 Meet the People: x"}
        self.assertTrue(names_its_source(lesson))
        lesson.number, lesson.data = "1.4", {"grammar_function": "A follow-up of A1 1.4-1.6: the family"}
        self.assertTrue(names_its_source(lesson))


if __name__ == "__main__":
    unittest.main()
