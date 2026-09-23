from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import tempfile
import unittest

from scripts.audit_course_media_preservation import ROOT, BASELINE, PLANS, IMAGE_ROOTS, audit, images, lessons, validate_plan
from scripts.build_unit_2_review_pack import PACK, LESSON, compile_lesson
from scripts.render_course_stills import load_pack, pack_output_directory
from scripts.audit_a1_unit_parity import function_coverage, CONTRACTS, successful_language, normalize, review_reuse
from scripts.course_contract import is_foundation


class MediaPreservationTests(unittest.TestCase):
    def test_repository_preserves_original_pixels_and_unaffected_lesson_uses(self):
        baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
        plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
        self.assertEqual(audit(ROOT, baseline, plans), [])

    def fixture(self, folder):
        root = Path(folder)
        old_hash = hashlib.sha256(b"original").hexdigest()
        for image_root in IMAGE_ROOTS:
            (root / image_root).mkdir(parents=True)
            (root / image_root / "gemini.webp").write_bytes(b"original")
        data = {"foundation": {"id": "foundation", "sub_lesson_id": "2.1", "cards": [{"image_url": "gemini.webp"}]},
                "review": {"id": "review", "sub_lesson_id": "2.9", "cards": [{"image_url": "gemini.webp"}]}}
        directory = root / "backend/lessons/unit_2"
        directory.mkdir(parents=True)
        for key, lesson in data.items():
            (directory / f"{key}.yaml").write_text(json.dumps(lesson))
        baseline = {"assets": {"gemini.webp": {"provenance": "unknown-protected", "copies": {r: old_hash for r in IMAGE_ROOTS}}},
                    "lesson_bindings": {key: ["gemini.webp"] for key in data}}
        plan = {"lesson_id": "review", "old_filename": "gemini.webp", "new_filename": "fresh.webp", "old_sha256": old_hash,
                "issue": "review-reuses-earlier-image", "issue_detail": "The review repeats exact image bytes already used in the earlier teaching lesson; preserve the original there."}
        return root, data, baseline, plan

    def test_unknown_images_are_protected_not_classified_as_codex(self):
        with tempfile.TemporaryDirectory() as folder:
            root, _, baseline, _ = self.fixture(folder)
            (root / IMAGE_ROOTS[1] / "gemini.webp").write_bytes(b"replacement")
            self.assertIn("Original media changed", " ".join(audit(root, baseline, [])))

    def test_valid_exception_changes_only_review_reference(self):
        with tempfile.TemporaryDirectory() as folder:
            root, data, baseline, plan = self.fixture(folder)
            data["review"]["cards"][0]["image_url"] = "fresh.webp"
            (root / "backend/lessons/unit_2/review.yaml").write_text(json.dumps(data["review"]))
            self.assertEqual(audit(root, baseline, [plan]), [])
            self.assertIn("Unplanned", " ".join(audit(root, baseline, [])))

    def test_exception_does_not_allow_overwriting_original(self):
        with tempfile.TemporaryDirectory() as folder:
            root, _, baseline, plan = self.fixture(folder)
            (root / IMAGE_ROOTS[0] / "gemini.webp").unlink()
            self.assertIn("Original media changed", " ".join(audit(root, baseline, [plan])))

    def test_exception_cannot_retire_other_lesson_use(self):
        with tempfile.TemporaryDirectory() as folder:
            root, data, baseline, plan = self.fixture(folder)
            data["foundation"]["cards"] = []
            (root / "backend/lessons/unit_2/foundation.yaml").write_text(json.dumps(data["foundation"]))
            self.assertIn("Unplanned", " ".join(audit(root, baseline, [plan])))

    def test_rejects_fake_problem_wrong_hash_and_wrong_scope(self):
        with tempfile.TemporaryDirectory() as folder:
            root, data, baseline, plan = self.fixture(folder)
            for changes in ({"issue": "make it prettier"}, {"old_sha256": "0" * 64},
                            {"lesson_id": "foundation"}, {"new_filename": "../overwrite.webp"},
                            {"issue_detail": "old"}):
                with self.subTest(changes=changes), self.assertRaises(ValueError):
                    validate_plan({**plan, **changes}, baseline, data, root)
            baseline["lesson_bindings"]["foundation"] = []
            with self.assertRaisesRegex(ValueError, "No earlier"):
                validate_plan(plan, baseline, data, root)

    def use_image_fixture(self, folder):
        root, data, baseline, _ = self.fixture(folder)
        data["foundation"]["cards"] = [{"slide_id": "U3", "stage": "Use", "answer_audio_text": "The apple is red.",
                                        "prompt_image_url": "apple.webp"}]
        (root / "backend/lessons/unit_2/foundation.yaml").write_text(json.dumps(data["foundation"]))
        plan = {"lesson_id": "foundation", "slide_id": "U3", "old_filename": "gemini.webp", "new_filename": "apple.webp",
                "old_sha256": baseline["assets"]["gemini.webp"]["copies"][IMAGE_ROOTS[0]],
                "issue": "use-image-contradicts-sentence",
                "issue_detail": "The Use sentence says the apple is red, but the bound image shows grapes."}
        return root, baseline, plan, (lambda lesson, card, filename: filename == "gemini.webp")

    def test_use_image_exception_rebinds_only_a_contradicting_use_card(self):
        with tempfile.TemporaryDirectory() as folder:
            root, baseline, plan, contradicts = self.use_image_fixture(folder)
            self.assertEqual(audit(root, baseline, [plan], contradicts), [])
            self.assertIn("Unplanned", " ".join(audit(root, baseline, [], contradicts)))

    def test_use_image_exception_requires_a_real_contradiction_and_a_real_fix(self):
        with tempfile.TemporaryDirectory() as folder:
            root, baseline, plan, contradicts = self.use_image_fixture(folder)
            current = lessons(root)
            has_evidence = lambda filename: True
            validate_plan(plan, baseline, current, root, contradicts, has_evidence)
            for changes, predicate in (({"slide_id": "U9"}, contradicts),
                                       ({"new_filename": "other.webp"}, contradicts),
                                       ({}, lambda lesson, card, filename: False),
                                       ({}, lambda lesson, card, filename: True)):
                with self.subTest(changes=changes), self.assertRaises(ValueError):
                    validate_plan({**plan, **changes}, baseline, current, root, predicate, has_evidence)

    def test_use_image_exception_retires_an_untaught_placeholder_only_with_a_recorded_review(self):
        with tempfile.TemporaryDirectory() as folder:
            root, baseline, plan, _ = self.use_image_fixture(folder)
            current = lessons(root)
            nothing_contradicts = lambda lesson, card, filename: False
            reviewed = {**plan, "original_shows": "a stick figure pointing at one apple"}
            validate_plan(reviewed, baseline, current, root, nothing_contradicts, lambda filename: False)
            for candidate, has_evidence in ((plan, lambda filename: False), (reviewed, lambda filename: True)):
                with self.subTest(reviewed="original_shows" in candidate, evidence=has_evidence("")), \
                        self.assertRaises(ValueError):
                    validate_plan(candidate, baseline, current, root, nothing_contradicts, has_evidence)

    def test_review_pack_uses_fresh_names_and_declares_all_exceptions(self):
        pack = load_pack(PACK)
        baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
        plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
        self.assertEqual(len(pack["assets"]), 16)
        self.assertEqual(pack_output_directory(pack).name, "unit-2-review-v1")
        self.assertNotEqual(pack_output_directory(pack), pack_output_directory(load_pack(ROOT / "docs/product/unit-2-mission-pack.json")))
        for asset in pack["assets"]:
            self.assertNotIn(asset["runtime_filename"], baseline["assets"])
            for old in asset["change_control"].get("replaces", []):
                self.assertEqual(len([plan for plan in plans if plan["old_filename"] == old and plan["new_filename"] == asset["runtime_filename"]]), 1)
        for value in ("../escape", "unit-2-review-v1/escape", "unit-0-review-v1"):
            with self.assertRaises(ValueError):
                pack_output_directory({**pack, "output_namespace": value})

    def test_review_content_keeps_progression_and_real_distance_contrasts(self):
        pack = load_pack(PACK)
        base = json.loads(LESSON.read_bytes())
        original = deepcopy(base)
        result = compile_lesson(base, pack)
        self.assertEqual(base, original)
        self.assertEqual(len(result["cards"]), 48)
        self.assertEqual([card["stage"] for card in result["cards"]],
                         ["Learn"] * 8 + ["Recognize"] * 8 + ["Listen"] * 18 + ["Speak"] * 6 + ["Use"] * 8)
        by_id = {card["slide_id"]: card for card in result["cards"]}
        for key, suffix in (("R5", "chair"), ("N3", "bag"), ("N4", "chair")):
            self.assertEqual({opt["id"] for opt in by_id[key]["options"]}, {"near-" + suffix, "far-" + suffix})
        for key in ("R4", "R7", "R8"):
            self.assertEqual(by_id[key]["audio_text"], "")
            self.assertEqual(by_id[key]["prompt"], "")
        for key in ("U1", "U2", "U3", "U4"):
            self.assertEqual(by_id[key]["audio_text"], by_id[key]["prompt"])
            self.assertEqual(len(by_id[key]["correct_option_ids"]), 2)
        for key in ("U5", "U6", "U7", "U8"):
            self.assertEqual(by_id[key]["interaction_type"], "complete-sentence")
        coverage = function_coverage(result, json.loads(CONTRACTS.read_text())["units"]["2"]["functions"])
        self.assertFalse(any(value["missing_patterns"] for value in coverage.values()))
        lines = successful_language(result)
        for word in ("two blue cars", "seven", "eight", "nine", "ten"):
            self.assertIn(word, lines)
        foundations = [lesson for lesson in lessons(ROOT).values()
                       if lesson["sub_lesson_id"].startswith("2.") and is_foundation(lesson)]
        vocabulary = {normalize(word) for lesson in foundations for word in lesson.get("vocabulary", [])}
        self.assertEqual(len(vocabulary), 43)
        missing = {word for word in vocabulary if not any(re.search(r"\b" + re.escape(word) + r"\b", line) for line in lines)}
        self.assertEqual(missing, set())
        self.assertEqual(compile_lesson(result, pack), result)

    def test_installed_review_does_not_reuse_earlier_or_mission_pixels(self):
        current = lessons(ROOT)
        review = current["lesson-2-9-unit-2-review"]
        comparison = [lesson for lesson in current.values() if lesson["sub_lesson_id"] != "2.9"
                      and int(lesson["sub_lesson_id"].split(".")[0]) <= 2]
        self.assertEqual(review_reuse(review, comparison, ROOT / IMAGE_ROOTS[0]),
                         {"reused_images": [], "missing_images": []})


if __name__ == "__main__":
    unittest.main()
