import json
import unittest
from pathlib import Path

from scripts.audit_content_practice import BASELINE, read_baseline
from scripts.content_engine.catalog import CatalogLesson, load_catalog, load_standards
from scripts.content_engine.practice import audit, is_known

ROOT = Path(__file__).resolve().parents[2]
STANDARDS = {
    "standard_lesson_cards": {"min": 2, "max": 12},
    "review_lesson_cards": {"min": 1, "max": 12},
    "max_new_items_per_lesson": 2,
    "min_exposures_per_new_item": 3,
    "min_stages_per_new_item": 3,
    "new_item_needs_one_of_stages": ["Listen", "Speak"],
    "min_later_lessons_per_new_item": 1,
    "later_reuse_exempt_final_units": 1,
    "instruction_words": ["listen"],
    "proper_names": ["ana"],
}


def card(stage, text, distractor="A dog"):
    return {"stage": stage, "prompt": text, "correct_option_id": "right",
            "options": [{"id": "right", "label": text}, {"id": "wrong", "label": distractor}]}


def lesson(number, vocabulary, cards, role="standard"):
    data = {"sub_lesson_id": number, "vocabulary": vocabulary, "cards": cards}
    return CatalogLesson(number, int(number.split(".")[0]), role, data)


def rules(findings, rule):
    return {(finding.lesson, finding.item) for finding in findings if finding.rule == rule}


class ContentPracticeTests(unittest.TestCase):
    def test_current_course_matches_the_reviewed_baseline(self):
        standards = load_standards(ROOT, "a1")
        keys = {finding.key for finding in audit(load_catalog(ROOT, standards), standards)}
        baseline = read_baseline(ROOT, "a1")
        self.assertEqual(sorted(keys - baseline), [], "New practice findings; fix the content.")
        self.assertEqual(sorted(baseline - keys), [], f"Fixed findings remain in {BASELINE}; shrink it.")

    def test_well_practiced_item_passes_every_rule(self):
        taught = lesson("1.1", ["a dog"], [card("Learn", "A dog"), card("Listen", "A dog"), card("Speak", "A dog")])
        later = lesson("2.1", [], [card("Use", "A dog")], role="review")
        self.assertEqual(audit([taught, later], STANDARDS), [])

    def test_thin_practice_is_reported_by_rule(self):
        thin = lesson("1.1", ["cat", "dog", "cow"], [card("Learn", "cat"), card("Recognize", "dog", "cat")]
                      + [card(stage, "cow", "cat") for stage in ("Learn", "Recognize", "Listen")])
        last = lesson("2.1", [], [card("Use", "cat", "cow")], role="review")
        findings = audit([thin, last], STANDARDS)
        self.assertEqual(rules(findings, "new-item-budget"), {("1.1", "lesson")})
        self.assertEqual(rules(findings, "exposures"), {("1.1", "cat"), ("1.1", "dog")})
        self.assertIn(("1.1", "dog"), rules(findings, "stage-variety"))
        # Only correct answers count as reuse; a distractor is not practice.
        self.assertEqual(rules(findings, "later-reuse"), {("1.1", "dog"), ("1.1", "cow")})

    def test_final_unit_is_exempt_from_later_reuse(self):
        final = lesson("7.1", ["hat"], [card(stage, "hat") for stage in ("Learn", "Listen", "Speak")])
        self.assertEqual(rules(audit([final], STANDARDS), "later-reuse"), set())

    def test_distractors_and_prompts_may_not_use_untaught_words(self):
        early = lesson("1.1", ["a dog"], [card(stage, "A dog", "A red dog") for stage in ("Learn", "Listen", "Speak")])
        self.assertEqual(rules(audit([early], STANDARDS), "untaught-word"), {("1.1", "red")})

    def test_plurals_are_known_but_third_person_verbs_are_not(self):
        known = {"apple", "box", "strawberry", "go"}
        self.assertTrue(all(is_known(word, known) for word in ("apples", "boxes", "strawberries")))
        self.assertFalse(is_known("goes", known))

    def test_standards_are_configuration_for_each_course(self):
        standards = json.loads((ROOT / "docs/product/content-standards.json").read_text(encoding="utf-8"))
        a1 = standards["courses"]["a1"]
        self.assertEqual(a1["standard_lesson_cards"], {"min": 40, "max": 42})
        self.assertEqual(a1["max_new_items_per_lesson"], 8)
        self.assertEqual(a1["min_exposures_per_new_item"], 5)
        self.assertEqual(a1["min_stages_per_new_item"], 4)
        self.assertEqual(a1["min_later_lessons_per_new_item"], 2)


if __name__ == "__main__":
    unittest.main()
