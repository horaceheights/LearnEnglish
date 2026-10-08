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
    return CatalogLesson(number, int(number.split(".")[0]), role, data, Path(f"{number}.yaml"))


def rules(findings, rule):
    return {(finding.lesson, finding.item) for finding in findings if finding.rule == rule}


class ContentPracticeTests(unittest.TestCase):
    def test_verbs_need_context_but_nouns_commands_and_construction_tiles_remain_valid(self):
        settings = {**STANDARDS, "verbs_require_subject": ["want", "eating", "need"]}
        bad = card("Listen", "Want", "Need")
        bad["slide_id"] = "bare"
        good = [
            card("Learn", "I want water.", "I need water."),
            card("Learn", "Water", "Milk"),
            card("Learn", "Open the door.", "Close the door."),
            {**card("Use", "I ___ water.", "need"), "interaction_type": "complete2"},
        ]
        good[-1]["options"][0]["label"] = "want"
        group = lesson("7.1", [], [bad, *good], role="review")
        self.assertEqual(rules(audit([group], settings), "verb-context"),
                         {("7.1", "bare:want"), ("7.1", "bare:need")})

    def test_answer_dialogue_turns_count_as_successful_practice(self):
        from scripts.content_engine.practice import card_evidence
        c = card("Recognize", "I do not like milk.", "Me too.")
        c["answer_audio_turns"] = [{"text": "Me neither.", "speaker_role": "luis"}]
        self.assertIn("me neither.", card_evidence(c))

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

    def test_approved_pacing_is_scoped_to_the_named_lesson(self):
        settings = {**STANDARDS, "standard_lesson_cards": {"min": 3, "max": 3},
                    "approved_lesson_card_limits": {"approved": {"min": 4, "max": 4}}}
        current = lesson("7.1", [], [card("Speak", "") for _ in range(4)])
        current.data["id"] = "approved"
        self.assertFalse(rules(audit([current], settings), "lesson-length"))
        current.data["id"] = "other"
        self.assertTrue(rules(audit([current], settings), "lesson-length"))
        current.data["id"] = "approved"
        current.data["cards"].pop()
        self.assertTrue(rules(audit([current], settings), "lesson-length"))

    def test_new_question_frame_reuses_only_previously_taught_object_words(self):
        standards = {**STANDARDS, "learn_frame_words": ["the"],
                     "learn_question_frames": {"Where is": "Where is the {object}?"}}
        prior = lesson("1.1", ["blue", "book", "phone"], [], role="review")
        for text, new_vocabulary, rejected in [
            ("Where is the phone?", ["Where is"], False),
            ("Where is the blue book?", ["Where is"], False),
            ("Where is the telescope?", ["Where is"], True),
            ("The phone is blue.", ["Where is"], True),
            ("Where is the phone?", ["under"], True),
            ("Where is the phone? It is blue.", ["Where is"], True),
        ]:
            with self.subTest(text=text, vocabulary=new_vocabulary):
                current = lesson("2.1", new_vocabulary, [card("Learn", text, text)])
                findings = audit([prior, current], standards)
                self.assertEqual(bool(rules(findings, "learn-new-only")), rejected)
                if "telescope" in text:
                    self.assertIn(("2.1", "telescope"), rules(findings, "untaught-word"))


if __name__ == "__main__":
    unittest.main()
