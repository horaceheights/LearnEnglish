import copy
import json
import tempfile
import unittest
from pathlib import Path

from scripts.audit_a1_unit_parity import CONTRACTS, audit, function_coverage, review_reuse, successful_language


class UnitParityTests(unittest.TestCase):
    def test_all_remaining_units_have_every_foundation_lesson_in_scope(self):
        contracts = json.loads(CONTRACTS.read_text(encoding="utf-8"))
        self.assertEqual(set(contracts["units"]), {"2", "3", "4", "5", "6", "7"})
        for unit, contract in contracts["units"].items():
            with self.subTest(unit=unit):
                taught = {function["taught_in"] for function in contract["functions"]}
                self.assertTrue({f"{unit}.{n}" for n in range(1, 9)} <= taught)
                ids = [function["id"] for function in contract["functions"]]
                self.assertEqual(len(ids), len(set(ids)))

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
