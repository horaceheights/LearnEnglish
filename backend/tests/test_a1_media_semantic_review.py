import copy
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

from scripts import build_a1_media_semantic_review as semantic_review
from scripts import a1_media_runtime_contracts as runtime_contracts
from scripts import validate_lesson_cards as validator
from scripts.a1_media_runtime_contracts import card_media_usages, render_profile_sha256
from scripts.validate_lesson_cards import semantic_review_decision_findings


class A1MediaSemanticReviewTests(unittest.TestCase):
    def setUp(self) -> None:
        lesson = {"id": "lesson-2-10-test", "sub_lesson_id": "2.10"}
        card = {
            "slide_id": "R1",
            "interaction_type": "recognize-image",
            "prompt": "Choose the phrase.",
            "stage": "Recognize",
            "correct_option_id": "two-blue-cars-1",
            "options": [
                {
                    "id": "two-blue-cars-1",
                    "image_url": "/lesson-assets/example.webp",
                    "label": None,
                },
                {
                    "id": "one-white-car-2",
                    "image_url": "/lesson-assets/distractor.webp",
                    "label": None,
                },
            ],
            "audio_text": "Two blue cars.",
            "answer_audio_text": None,
            "prompt_image_url": "",
            "spanish_translation": "Dos carros azules.",
        }
        context = card_media_usages(lesson, card)[0]["context"]
        self.asset = {
            "filename": "example.webp",
            "concept": "Two blue cars",
            "description": "Exactly two blue cars and no other cars.",
            "card_refs": ["2.10|Recognize|R1"],
            "review_contexts": [context],
        }
        self.manifest = {"schema_version": 3, "assets": [self.asset]}

    def test_contract_hash_is_stable_but_semantically_sensitive(self) -> None:
        reordered = {
            "card_refs": ["2.10|Recognize|R1"],
            "description": "Exactly two blue cars and no other cars.",
            "concept": "Two blue cars",
            "filename": "example.webp",
            "review_contexts": self.asset["review_contexts"],
        }
        original_contract = semantic_review.semantic_contract(self.asset)
        reordered_contract = semantic_review.semantic_contract(reordered)
        self.assertEqual(
            semantic_review.semantic_contract_sha256(original_contract),
            semantic_review.semantic_contract_sha256(reordered_contract),
        )

        changed = copy.deepcopy(self.asset)
        changed["concept"] = "Three blue cars"
        self.assertNotEqual(
            semantic_review.semantic_contract_sha256(original_contract),
            semantic_review.semantic_contract_sha256(
                semantic_review.semantic_contract(changed)
            ),
        )

    def test_changed_asset_bytes_reset_an_approval_to_pending(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            asset_dir = Path(temporary_directory)
            asset_path = asset_dir / self.asset["filename"]
            asset_path.write_bytes(b"first reviewed image")
            with patch.object(semantic_review, "CANONICAL_ASSET_DIR", asset_dir):
                pending = semantic_review.synchronized_registry(self.manifest)
                approved = copy.deepcopy(pending)
                approved_row = approved["approvals"][0]
                approved_row["decision"] = "approved"
                approved_row["reviewer"] = "Human Reviewer"
                approved_row["reviewed_at"] = "2026-08-29"

                unchanged = semantic_review.synchronized_registry(self.manifest, approved)
                self.assertEqual(unchanged["approvals"][0]["decision"], "approved")

                asset_path.write_bytes(b"different unreviewed image")
                changed = semantic_review.synchronized_registry(self.manifest, approved)
                changed_row = changed["approvals"][0]
                self.assertEqual(changed_row["decision"], "pending")
                self.assertIsNone(changed_row["reviewer"])
                self.assertIsNone(changed_row["reviewed_at"])

    def test_changed_render_signature_resets_an_approval_to_pending(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            asset_dir = Path(temporary_directory)
            (asset_dir / self.asset["filename"]).write_bytes(b"same image bytes")
            with patch.object(semantic_review, "CANONICAL_ASSET_DIR", asset_dir):
                approved = semantic_review.synchronized_registry(self.manifest)
                approved["approvals"][0]["decision"] = "approved"
                approved["approvals"][0]["reviewer"] = "Human Reviewer"
                approved["approvals"][0]["reviewed_at"] = "2026-08-29"

                changed_manifest = copy.deepcopy(self.manifest)
                changed_signature = "1" * 64
                changed_manifest["assets"][0]["review_contexts"][0][
                    "render_signature_sha256"
                ] = changed_signature
                with patch.object(
                    runtime_contracts,
                    "render_profile_sha256",
                    return_value=changed_signature,
                ):
                    changed = semantic_review.synchronized_registry(
                        changed_manifest, approved
                    )

                self.assertEqual(changed["approvals"][0]["decision"], "pending")
                self.assertIsNone(changed["approvals"][0]["reviewer"])

    def test_preview_can_surface_a_stale_renderer_signature_without_approving_it(self) -> None:
        changed = copy.deepcopy(self.asset)
        changed["review_contexts"][0]["render_signature_sha256"] = "0" * 64

        with self.assertRaisesRegex(ValueError, "render signature is stale"):
            semantic_review.semantic_contract(changed)

        preview_contract = semantic_review.semantic_contract(
            changed,
            allow_stale_render_signatures=True,
        )
        self.assertEqual(
            preview_contract["review_contexts"][0]["render_signature_sha256"],
            "0" * 64,
        )

    def test_preview_can_synchronize_a_stale_renderer_signature_without_changing_it(self) -> None:
        changed_manifest = copy.deepcopy(self.manifest)
        changed_manifest["assets"][0]["review_contexts"][0][
            "render_signature_sha256"
        ] = "0" * 64

        with tempfile.TemporaryDirectory() as temporary_directory:
            asset_dir = Path(temporary_directory)
            (asset_dir / self.asset["filename"]).write_bytes(b"preview image")
            with patch.object(semantic_review, "CANONICAL_ASSET_DIR", asset_dir):
                registry = semantic_review.synchronized_registry(
                    changed_manifest,
                    allow_stale_render_signatures=True,
                )

        context = registry["approvals"][0]["review_contexts"][0]
        self.assertEqual(context["render_signature_sha256"], "0" * 64)
        self.assertEqual(registry["approvals"][0]["decision"], "pending")

    def test_every_learner_facing_card_change_invalidates_the_contract(self) -> None:
        original = semantic_review.semantic_contract(self.asset)
        original_hash = semantic_review.semantic_contract_sha256(original)

        mutations = {}

        changed_prompt = copy.deepcopy(self.asset)
        changed_prompt["review_contexts"][0]["prompt"] = "Choose a different phrase."
        mutations["prompt"] = changed_prompt

        changed_audio = copy.deepcopy(self.asset)
        changed_audio["review_contexts"][0]["audio_text"] = "One white car."
        mutations["audio"] = changed_audio

        swapped_correct = copy.deepcopy(self.asset)
        context = swapped_correct["review_contexts"][0]
        context["correct_option_id"] = "one-white-car-2"
        context["is_correct"] = False
        context["options"][0]["is_correct"] = False
        context["options"][1]["is_correct"] = True
        mutations["correct option"] = swapped_correct

        moved_to_prompt = copy.deepcopy(self.asset)
        context = moved_to_prompt["review_contexts"][0]
        context["media_role"] = "prompt"
        context["option_id"] = None
        context["option_label"] = None
        context["is_correct"] = None
        context["render_profile"] = "lesson-prompt-3x2-v1"
        context["render_signature_sha256"] = render_profile_sha256(
            "lesson-prompt-3x2-v1"
        )
        mutations["media role"] = moved_to_prompt

        added_distractor = copy.deepcopy(self.asset)
        added_distractor["review_contexts"][0]["options"].append(
            {
                "id": "three-yellow-pens-3",
                "label": None,
                "source_filename": "third.webp",
                "rendered_filename": "third.webp",
                "is_correct": False,
            }
        )
        mutations["distractor set"] = added_distractor

        changed_variant = copy.deepcopy(self.asset)
        context = changed_variant["review_contexts"][0]
        context["source_filename"] = "boy.webp"
        context["rendered_filename"] = "boy_3x2.webp"
        context["options"][0]["source_filename"] = "boy.webp"
        context["options"][0]["rendered_filename"] = "boy_3x2.webp"
        mutations["rendered variant"] = changed_variant

        for label, changed in mutations.items():
            with self.subTest(label=label):
                changed_contract = semantic_review.semantic_contract(changed)
                self.assertNotEqual(
                    original_hash,
                    semantic_review.semantic_contract_sha256(changed_contract),
                )

    def test_synchronizer_does_not_silently_choose_a_duplicate_approval(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            asset_dir = Path(temporary_directory)
            (asset_dir / self.asset["filename"]).write_bytes(b"image")
            with patch.object(semantic_review, "CANONICAL_ASSET_DIR", asset_dir):
                registry = semantic_review.synchronized_registry(self.manifest)
                registry["approvals"].append(copy.deepcopy(registry["approvals"][0]))
                with self.assertRaisesRegex(ValueError, "duplicate contract_sha256"):
                    semantic_review.synchronized_registry(self.manifest, registry)

    def test_preview_allows_only_pending_review_decisions(self) -> None:
        pending = [{"filename": "pending.webp", "concept": "Pending image"}]
        rejected = [{"filename": "rejected.webp", "concept": "Wrong image"}]

        preview_errors, preview_warnings = semantic_review_decision_findings(
            pending,
            [],
            "preview",
        )
        self.assertEqual(preview_errors, [])
        self.assertEqual(len(preview_warnings), 1)
        self.assertIn("Review advisory", preview_warnings[0])
        self.assertIn("explicit approval of the exact Preview group", preview_warnings[0])

        rejected_errors, rejected_warnings = semantic_review_decision_findings(
            [],
            rejected,
            "preview",
        )
        self.assertEqual(rejected_warnings, [])
        self.assertEqual(len(rejected_errors), 1)
        self.assertIn("rejected contracts", rejected_errors[0])

    def test_production_reports_pending_decisions_without_granting_approval(self) -> None:
        pending = [{"filename": "pending.webp", "concept": "Pending image"}]

        production_errors, production_warnings = semantic_review_decision_findings(
            pending,
            [],
            "production",
        )
        self.assertEqual(production_errors, [])
        self.assertEqual(len(production_warnings), 1)
        self.assertIn("pending contracts", production_warnings[0])
        self.assertIn("does not approve or rewrite", production_warnings[0])

    def validate_fixture(self, change=None, *, surface_warnings=True):
        with tempfile.TemporaryDirectory() as temporary_directory:
            fixture_root = Path(temporary_directory)
            asset_path = fixture_root / self.asset["filename"]
            asset_path.write_bytes(b"image")
            manifest = copy.deepcopy(self.manifest)
            manifest["assets"][0]["review_contexts"][0]["render_signature_sha256"] = "0" * 64
            with patch.object(semantic_review, "CANONICAL_ASSET_DIR", fixture_root):
                registry = semantic_review.synchronized_registry(
                    manifest, allow_stale_render_signatures=True
                )
            registry["manifest_path"] = "manifest.json"
            if change:
                change(manifest, registry, asset_path)
            manifest_path = fixture_root / "manifest.json"
            registry_path = fixture_root / "registry.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            registry_path.write_text(json.dumps(registry), encoding="utf-8")
            before = (manifest_path.read_bytes(), registry_path.read_bytes())
            runtime_counts = Counter({
                validator._context_counter_key(
                    self.asset["filename"], self.asset["review_contexts"][0],
                    ignore_render_signature=True,
                ): 1
            })
            warnings = [] if surface_warnings else None
            with patch.multiple(
                validator, ROOT=fixture_root, A1_MEDIA_MANIFEST=manifest_path,
                A1_MEDIA_SEMANTIC_APPROVALS=registry_path,
                LESSON_ASSET_DIR=fixture_root, MOBILE_LESSON_ASSET_DIR=fixture_root,
                FRONTEND_LESSON_ASSET_DIR=fixture_root,
            ), patch.object(validator, "_runtime_media_context_counts", return_value=runtime_counts):
                errors = validator.validate_a1_media_semantic_approvals("production", warnings)
            self.assertEqual(before, (manifest_path.read_bytes(), registry_path.read_bytes()))
            return errors, warnings

    def test_production_accepts_only_renderer_drift_and_pending_as_visible_advisories(self):
        errors, warnings = self.validate_fixture()
        self.assertEqual(errors, [])
        self.assertTrue(any("renderer-source signatures differ" in item for item in warnings))
        self.assertTrue(any("pending contracts" in item for item in warnings))

    def test_production_cannot_hide_renderer_or_pending_advisories(self):
        errors, _ = self.validate_fixture(surface_warnings=False)
        self.assertTrue(any("refusing to pass silently" in item for item in errors))

    def test_preview_approval_policy_still_blocks_changed_bytes_and_missing_media(self):
        for change, expected in [
            (lambda manifest, registry, asset: asset.write_bytes(b"changed"), "bytes changed"),
            (lambda manifest, registry, asset: asset.unlink(), "asset is missing"),
            (lambda manifest, registry, asset: registry["approvals"][0].update(
                decision="rejected"), "rejected contracts"),
            (lambda manifest, registry, asset: registry["approvals"][0].update(
                contract_sha256="1" * 64), "contract fields changed"),
            (lambda manifest, registry, asset: manifest["assets"][0]["review_contexts"][0].update(
                audio_text="Three red cars."), "missing 1 runtime image usages"),
            (lambda manifest, registry, asset: manifest["assets"][0]["review_contexts"][0].update(
                media_role="unexpected"), "invalid"),
        ]:
            with self.subTest(expected=expected):
                errors, _ = self.validate_fixture(change)
                self.assertTrue(any(expected in error for error in errors), errors)


if __name__ == "__main__":
    unittest.main()
