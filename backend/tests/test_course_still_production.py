import io
import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from scripts.render_course_stills import ROOT, cost_from_usage, load_pack, multipart, validate_budget, finalize_saved_image
from scripts.audit_a1_unit_parity import CONTRACTS, function_coverage


class CourseStillProductionTests(unittest.TestCase):
    def test_finalize_saved_output_preserves_cost_without_another_request(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output, receipt = root / "scene.png", root / "scene.receipt.json"
            output.write_bytes(b"saved image bytes")
            receipt.write_text(json.dumps({"status": "response_received", "generation_requests_sent": 1,
                                           "cost": {"usd": "0.043"}}))
            result = finalize_saved_image(output, receipt, root)
            self.assertEqual(result["status"], "image_saved")
            self.assertEqual(result["byte_count"], 17)
            self.assertEqual(result["generation_requests_sent"], 1)
            self.assertEqual(result["cost"], {"usd": "0.043"})
            self.assertEqual(len(result["sha256"]), 64)
            with self.assertRaises(ValueError):
                finalize_saved_image(output, receipt, root)

    def test_sample_cost_and_unknown_usage_are_truthful(self):
        self.assertEqual(cost_from_usage({"input_tokens_details": {"text_tokens": 393, "image_tokens": 0},
                                         "output_tokens": 1372})["usd"], "0.043125")
        self.assertIsNone(cost_from_usage(None)["usd"])
        self.assertIsNone(cost_from_usage({"output_tokens": 1})["usd"])

    def test_budget_counts_prior_receipts_and_reserves_next_attempt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a.receipt.json").write_text(json.dumps({"status": "image_saved", "generation_requests_sent": 1,
                                                             "cost": {"usd": "0.1"}}))
            self.assertEqual(validate_budget(root, Decimal("0.4"), Decimal("0.25")), Decimal("0.1"))
            with self.assertRaises(ValueError):
                validate_budget(root, Decimal("0.3"), Decimal("0.25"))

    def test_uncertain_attempt_prevents_more_spending(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a.receipt.json").write_text(json.dumps({"status": "in_flight", "generation_requests_sent": 1}))
            with self.assertRaisesRegex(ValueError, "Uncertain"):
                validate_budget(root, Decimal("1.5"), Decimal("0.25"))

    def test_multipart_records_reference_hash_without_leaking_file_path(self):
        stream = io.BytesIO(b"reference image bytes")
        stream.name = "/private/path/reference.png"
        body, content_type, refs = multipart({"image": [stream], "prompt": "Preserve identity."})
        self.assertIn(b'name="image[]"', body)
        self.assertNotIn(b"/private/path", body)
        self.assertEqual(refs[0]["filename"], "reference.png")
        self.assertEqual(len(refs[0]["sha256"]), 64)
        self.assertIn("multipart/form-data", content_type)

    def test_unit_two_pack_contains_real_coverage_not_legacy_family_filler(self):
        pack = load_pack(ROOT / "docs/product/unit-2-mission-pack.json")
        self.assertEqual(sum(len(beat["cues"]) for beat in pack["beats"]), 36)
        self.assertEqual(len(pack["voice_gates"]), 4)
        self.assertEqual(len(pack["assets"]), 18)
        cards = [{"mission_game": {"cues": [{"text": text, "answer_text": text} for text in beat["cues"]]}}
                 for beat in pack["beats"]]
        cards += [{"mission_game": {"cues": [{"text": gate["question"], "answer_text": gate["answer"]}]}}
                  for gate in pack["voice_gates"]]
        functions = json.loads(CONTRACTS.read_text(encoding="utf-8"))["units"]["2"]["functions"]
        self.assertFalse(any(value["missing_patterns"] for value in function_coverage({"cards": cards}, functions).values()))
        assessed = " ".join(cue["text"] for card in cards for cue in card["mission_game"]["cues"])
        for unintroduced in ("waiting", "bench", "there are", "have", "want"):
            self.assertNotIn(unintroduced, assessed.casefold())
        for gate in pack["voice_gates"]:
            self.assertNotEqual(gate["question_asset"], gate["response_asset"])
            self.assertEqual(gate["question"], "What is it?")
            self.assertTrue(gate["answer"].startswith("It is a "))


if __name__ == "__main__":
    unittest.main()
