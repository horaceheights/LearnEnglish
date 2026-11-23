import copy
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import report_release_readiness as readiness
from scripts.a1_media_runtime_contracts import card_media_usages
from scripts.build_a1_media_semantic_review import semantic_contract_sha256


class ReleaseReadinessTests(unittest.TestCase):
    def test_approval_is_required_even_when_review_advisories_are_allowed(self):
        report = readiness.readiness_report(
            "a" * 40, [], ["Renderer review is outdated."], {}
        )
        self.assertEqual(report["status"], "awaiting-preview-approval")
        self.assertFalse(report["production_approved"])
        self.assertIn("exact latest Android/iOS Preview", report["approval_requirement"])
        self.assertIn("Eligible after testing", readiness.markdown_summary(report))

    def test_integrity_failure_cannot_be_reported_as_eligible(self):
        report = readiness.readiness_report("a" * 40, ["Missing media."], [], {})
        self.assertEqual(report["status"], "blocked")
        self.assertIn("Blocked by content", readiness.markdown_summary(report))

    def test_targeted_inventory_preserves_records_and_displays_current_bindings(self):
        context = card_media_usages(
            {"id": "lesson-test", "sub_lesson_id": "1.1"},
            {
                "stage": "Learn", "slide_id": "L1", "prompt": "A boy.",
                "audio_text": "A boy.", "interaction_type": "recognize-image",
                "correct_option_id": "boy",
                "options": [{"id": "boy", "label": "A boy.", "image_url": "/lesson-assets/boy.webp"}],
            },
        )[0]["context"]
        asset = {
            "filename": context["rendered_filename"], "concept": "A boy",
            "description": "One boy.", "card_refs": ["1.1|Learn|L1"],
            "review_contexts": [context],
        }
        current = copy.deepcopy(asset)
        asset["review_contexts"][0]["render_signature_sha256"] = "0" * 64
        old_hash = semantic_contract_sha256(asset)
        registry = {"approvals": [{
            "contract_sha256": old_hash, "decision": "approved",
            "reviewer": "Human", "reviewed_at": "2026-10-01",
            "asset_sha256": "1" * 64,
        }]}
        before = copy.deepcopy((asset, registry))
        with tempfile.TemporaryDirectory() as temporary_directory:
            asset_dir = Path(temporary_directory)
            (asset_dir / asset["filename"]).write_bytes(b"actual current image")
            inventory = readiness.review_inventory({"assets": [asset]}, registry, asset_dir)
            entry = inventory["affected_contracts"][0]
            self.assertEqual(entry["decision"], "approved")
            self.assertEqual(entry["stored_contract_sha256"], old_hash)
            self.assertEqual(entry["current_contract_sha256"], semantic_contract_sha256(current))
            self.assertNotEqual(entry["current_asset_sha256"], entry["stored_asset_sha256"])
            self.assertEqual(entry["current_contract"]["review_contexts"][0], context | {
                "render_signature_sha256": current["review_contexts"][0]["render_signature_sha256"]
            })
            self.assertEqual(entry["stored_contract"]["review_contexts"][0]["render_signature_sha256"], "0" * 64)
            registry["approvals"][0]["contract_sha256"] = semantic_contract_sha256(current)
            unaffected = readiness.review_inventory({"assets": [current]}, registry, asset_dir)
            self.assertEqual(unaffected["affected_contracts"], [])
        # Restore the test's intentional registry change before comparing inputs.
        registry["approvals"][0]["contract_sha256"] = old_hash
        self.assertEqual((asset, registry), before)

    def test_failed_earlier_checks_produce_a_blocked_artifact_and_nonzero_exit(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            with (
                patch.object(readiness, "validate_a1_media_semantic_approvals", return_value=[]),
                patch.object(readiness, "review_inventory", return_value={}),
                patch.object(readiness.subprocess, "check_output", return_value="a" * 40),
                patch.object(readiness.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "", "")),
            ):
                result = readiness.main([
                    "--output-directory", temporary_directory,
                    "--verification-status", "failure",
                ])
            report = json.loads((Path(temporary_directory) / "readiness.json").read_text(encoding="utf-8"))
            self.assertEqual(result, 1)
            self.assertEqual(report["status"], "blocked")
            self.assertFalse(report["production_approved"])
            self.assertIn("earlier required verification", report["blockers"][0])


if __name__ == "__main__":
    unittest.main()
