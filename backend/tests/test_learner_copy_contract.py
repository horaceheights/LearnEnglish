import copy
import json
from pathlib import Path
import unittest

from scripts.compile_lesson_delivery import validate_source_fields
from scripts.learner_copy_contract import card_context_errors


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/product/content-plans/a1plus-unit1-mobile-2026-10-26/unit-preview-content.json"


class LearnerCopyContractTests(unittest.TestCase):
    def test_shortening_a_scenario_does_not_satisfy_removal(self):
        for text in ("Ana describe su día.", "Por la tarde."):
            self.assertTrue(card_context_errors(text))
        self.assertEqual([], card_context_errors(None))
        self.assertEqual([], card_context_errors(""))

    def test_source_admission_rejects_context_in_every_stage_and_mission(self):
        source = json.loads(SOURCE.read_text(encoding="utf-8"))
        validate_source_fields(source)
        combinations = {(lesson["kind"], card["stage"], card["activity"])
                        for lesson in source["lessons"] for card in lesson["cards"]}
        for kind, stage, activity in combinations:
            changed = copy.deepcopy(source)
            lesson = next(lesson for lesson in changed["lessons"] if lesson["kind"] == kind)
            card = next(card for card in lesson["cards"] if card["stage"] == stage and card["activity"] == activity)
            card["context_es"] = "Por la tarde."
            with self.subTest(kind=kind, stage=stage, activity=activity), self.assertRaisesRegex(ValueError, "per-card Spanish scenario"):
                validate_source_fields(changed)

    def test_entire_installed_and_embedded_course_has_no_scenario_paragraphs(self):
        from backend.app.data import COURSE_LESSONS
        lessons = list(COURSE_LESSONS["a1-plus"].values())
        self.assertTrue(lessons)
        for lesson in lessons:
            for card in lesson.cards:
                with self.subTest(lesson=lesson.id, card=card.slide_id):
                    self.assertEqual([], card_context_errors(card.context_es))
        for filename in ("a1-plus-course.json", "all-courses.json"):
            payload = json.loads((ROOT / "mobile/src/generated" / filename).read_text(encoding="utf-8"))
            affected = [lesson for lesson in payload if lesson["id"] in COURSE_LESSONS["a1-plus"]]
            self.assertEqual(set(COURSE_LESSONS["a1-plus"]), {lesson["id"] for lesson in affected})
            self.assertEqual(sum(len(lesson.cards) for lesson in lessons), sum(len(lesson["cards"]) for lesson in affected))
            for lesson in affected:
                self.assertTrue(all(not card.get("context_es") for card in lesson["cards"]), lesson["id"])
