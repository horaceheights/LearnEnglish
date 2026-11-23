import copy
import json
import tempfile
import unittest
from pathlib import Path

from scripts.audit_a1_unit_parity import (CONTRACTS, audit, function_coverage, mission_deferral, mission_functions,
                                          review_reuse, successful_language)
from backend.app.data import LESSONS
from scripts.course_contract import is_foundation


class UnitParityTests(unittest.TestCase):
    def test_all_remaining_units_have_every_foundation_lesson_in_scope(self):
        contracts = json.loads(CONTRACTS.read_text(encoding="utf-8"))
        self.assertEqual(set(contracts["units"]), {"2", "3", "4", "5", "6", "7"})
        for unit, contract in contracts["units"].items():
            with self.subTest(unit=unit):
                taught = {function["taught_in"] for function in contract["functions"]}
                foundations = {lesson.sub_lesson_id for lesson in LESSONS.values()
                               if lesson.unit_id == f"unit-{unit}" and is_foundation(lesson)}
                self.assertTrue(foundations and foundations <= taught)
                ids = [function["id"] for function in contract["functions"]]
                self.assertEqual(len(ids), len(set(ids)))

    def test_a_mission_deferral_needs_a_dated_reason_and_stays_reported(self):
        function = {"id": "size", "taught_in": "2.11", "patterns": [r"\bbig\b"]}
        deferred = {**function, "mission_practice_deferred": {
            "approved_on": "2026-11-14", "reason": "User decision: the mission beat is a separate follow-up task."}}
        self.assertEqual(mission_functions([function, deferred]), [function])
        for broken in ({"approved_on": "2026-11-14"}, {"reason": "x" * 60}, {"approved_on": "soon", "reason": "x" * 60}):
            with self.subTest(broken=broken), self.assertRaises(ValueError):
                mission_deferral({**function, "mission_practice_deferred": broken})
        # Each recorded deferral is a 2026-11-14 user decision for one coverage-gap lesson: 2.11, 4.11, 4.12, 5.11 and 5.12 (the last under the 2026-11-15 standing rule).
        contracts = json.loads(CONTRACTS.read_text(encoding="utf-8"))
        recorded = {(unit, f["id"]) for unit, contract in contracts["units"].items()
                    for f in contract["functions"] if mission_deferral(f)}
        # 2026-11-17: every unit mission now practises its coverage-gap lessons; no deferral is left.
        self.assertEqual(recorded, set())
        lessons = [json.loads(path.read_text(encoding="utf-8-sig"))
                   for path in sorted((CONTRACTS.parents[2] / "backend/lessons/unit_2").glob("*.yaml"))]
        result = audit(lessons, {**contracts, "units": {"2": contracts["units"]["2"]}}, CONTRACTS.parents[2] / "Lessons/Lesson1/images")
        self.assertEqual(result["units"]["2"]["mission_practice_deferred"], [])
        self.assertTrue(result["units"]["2"]["ready"], result["units"]["2"]["gaps"])

    def test_metadata_and_distractors_cannot_claim_successful_practice(self):
        lesson = {
            "goal": "What is it?", "review_vocabulary": ["what", "this", "that"],
            "cards": [{"prompt": "A book", "audio_text": "A book",
                       "correct_option_id": "correct", "options": [
                           {"id": "correct", "label": "A book"},
                           {"id": "wrong", "label": "What is it?"}]}],
        }
        functions = [{"id": "what", "taught_in": "2.4", "patterns": [r"\bwhat is it\b"]}]
        self.assertEqual(function_coverage(lesson, functions)["what"]["missing_patterns"], [r"\bwhat is it\b"])

    def test_each_mission_cue_counts_not_just_first_legacy_answer(self):
        lesson = {"cards": [{"correct_option_id": "first", "mission_game": {
            "cues": [{"text": "What is it?", "answer_text": "It is a book."},
                     {"text": "That is a phone.", "answer_text": "That is a phone."}]
        }}]}
        self.assertIn("that is a phone", successful_language(lesson))
        functions = [{"id": "what", "taught_in": "2.4", "patterns": [r"\bwhat is it\b", r"\bit is a book\b"]}]
        self.assertEqual(function_coverage(lesson, functions)["what"]["missing_patterns"], [])

    def test_fragments_on_different_cards_are_not_a_practised_sentence(self):
        lesson = {"cards": [{"audio_text": "That is"}, {"audio_text": "a phone"}]}
        function = {"id": "that", "taught_in": "2.5", "patterns": [r"\bthat is a phone\b"]}
        self.assertTrue(function_coverage(lesson, [function])["that"]["missing_patterns"])

    def test_renamed_duplicate_and_missing_review_images_fail(self):
        def lesson(image):
            return {"cards": [{"prompt_image_url": image}]}
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "old.webp").write_bytes(b"same photo")
            (root / "renamed.webp").write_bytes(b"same photo")
            review = {"cards": [{"prompt_image_url": "renamed.webp"}, {"prompt_image_url": "missing.webp"}]}
            self.assertEqual(review_reuse(review, [lesson("old.webp")], root), {
                "reused_images": ["renamed.webp"], "missing_images": ["missing.webp"],
            })

    def test_short_mission_is_not_ready_even_with_perfect_metadata(self):
        contracts = {"minimum_listening_decisions": 32, "minimum_voice_gates": 4,
                     "review_vocabulary_fraction": .7,
                     "units": {"2": {"functions": []}}}
        lesson = {"sub_lesson_id": "2.10", "experience_type": "mission",
                  "mission": {"title": "Everything covered"}, "cards": [
                      {"slide_id": "M01", "mission_game": {"kind": "guided-search", "cues": [{"text": "A book"}]}}
                  ]}
        with tempfile.TemporaryDirectory() as temporary:
            result = audit([copy.deepcopy(lesson)], contracts, Path(temporary))
        self.assertFalse(result["ready"])
        self.assertIn("Only 1 listening decisions", " ".join(result["units"]["2"]["gaps"]))
        self.assertIn("Only 0 speaking tasks", " ".join(result["units"]["2"]["gaps"]))


if __name__ == "__main__":
    unittest.main()
