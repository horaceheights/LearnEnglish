import contextlib
import hashlib
import io
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from scripts import render_four_card_media_audit as audit


class FourCardMediaAuditTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.root = Path(self.temporary_directory.name)
        self.canonical = self.root / "canonical"
        self.mobile = self.root / "mobile"
        self.frontend = self.root / "frontend"
        for directory in (self.canonical, self.mobile, self.frontend):
            directory.mkdir()
            (directory / "effective.webp").write_bytes(b"current-effective-image")

        lesson = {
            "lesson_id": "lesson-test",
            "id": "lesson-test",
            "unit_id": "unit-2",
            "sub_lesson_id": "2.1",
        }
        card = {
            "stage": "Recognize",
            "slide_id": "R5",
            "interaction_type": "t2i4",
            "prompt": "Four yellow pens",
            "audio_text": "Four yellow pens",
            "answer_audio_text": None,
            "spanish_translation": "Cuatro bolígrafos amarillos",
            "correct_option_id": "pens",
            "options": [
                {
                    "id": "pens",
                    "label": None,
                    "image_url": "/lesson-assets/effective.webp",
                },
                {
                    "id": "books",
                    "label": None,
                    "image_url": "/lesson-assets/books.webp",
                },
                {
                    "id": "cars",
                    "label": None,
                    "image_url": "/lesson-assets/cars.webp",
                },
                {
                    "id": "bags",
                    "label": None,
                    "image_url": "/lesson-assets/bags.webp",
                },
            ],
            "prompt_image_url": "",
        }
        self.context = next(
            usage["context"]
            for usage in audit.card_media_usages(lesson, card)
            if usage["context"]["option_id"] == "pens"
        )
        self.asset = {
            "asset_id": "test-contract",
            "filename": "effective.webp",
            "concept": "four-yellow-pens",
            "description": "exactly four separate yellow pens on a plain background",
            "card_refs": ["2.1|Recognize|R5"],
            "review_contexts": [self.context],
        }
        self.runtime = {
            "review_context": deepcopy(self.context),
            "lesson_title": "2.1 Test",
            "card_index": 12,
        }

    def build_entries(self, asset=None, runtime=None):
        return audit.build_review_entries(
            {
                "schema_version": audit.MANIFEST_SCHEMA_VERSION,
                "assets": [asset or self.asset],
            },
            [runtime or self.runtime],
            canonical_root=self.canonical,
            mobile_root=self.mobile,
            frontend_root=self.frontend,
        )

    def test_packet_binds_explicit_meaning_file_hash_contract_role_and_context(self) -> None:
        entry = self.build_entries()[0]
        expected_asset_hash = hashlib.sha256(b"current-effective-image").hexdigest()

        self.assertEqual(entry["review_id"], "FC-0001")
        self.assertEqual(entry["rendered_filename"], "effective.webp")
        self.assertEqual(entry["asset_sha256"], expected_asset_hash)
        authoritative_contract = audit.semantic_contract(self.asset)
        self.assertEqual(entry["contract"], authoritative_contract)
        self.assertEqual(
            entry["contract_sha256"],
            audit.semantic_contract_sha256(authoritative_contract),
        )
        self.assertEqual(entry["expected"]["concept"], "four-yellow-pens")
        self.assertIn("full contract", entry["expected"]["meaning"])
        self.assertEqual(entry["role"]["media_role"], "option")
        self.assertTrue(entry["role"]["is_correct"])
        self.assertEqual(entry["context"]["lesson_id"], "lesson-test")
        self.assertEqual(entry["context"]["card_index"], 12)
        self.assertEqual(entry["context"]["prompt"], "Four yellow pens")

        lines = "".join(audit.review_entry_lines(entry)).replace(" ", "")
        self.assertIn("source:effective.webp", lines)
        self.assertIn("effective:effective.webp", lines)
        self.assertIn(expected_asset_hash, lines)
        self.assertIn(entry["contract_sha256"], lines)
        self.assertIn("expected:four-yellow-pens", lines)
        self.assertIn("CORRECToption", lines)
        self.assertIn("context:lesson-test", lines)

        packet = audit.review_packet("b" * 64, [entry])
        self.assertFalse(packet["authoritative_approval_record"])
        self.assertEqual(packet["approval_recording"], "forbidden")
        self.assertEqual(packet["contract_count"], 1)
        self.assertEqual(
            packet["contracts"][entry["contract_sha256"]]["description"],
            self.asset["description"],
        )
        self.assertNotIn("contract", packet["entries"][0])
        self.assertNotIn("disposition", packet)
        self.assertIn("Never record approval", packet["warning"])

    def test_runtime_and_contract_context_must_match_exactly(self) -> None:
        runtime = deepcopy(self.runtime)
        runtime["review_context"]["prompt"] = "Ambiguous prompt"

        with self.assertRaisesRegex(audit.ReviewAidError, "does not match the embedded runtime"):
            self.build_entries(runtime=runtime)

    def test_all_published_copies_must_match_before_rendering(self) -> None:
        (self.frontend / "effective.webp").write_bytes(b"stale-frontend-copy")

        with self.assertRaisesRegex(audit.ReviewAidError, "not byte-identical"):
            self.build_entries()

    def test_missing_concept_or_contract_is_not_a_reviewable_label(self) -> None:
        asset = deepcopy(self.asset)
        asset["description"] = ""

        with self.assertRaisesRegex(audit.ReviewAidError, "description.*non-empty"):
            self.build_entries(asset=asset)

    def test_missing_or_stale_render_signature_fails_closed(self) -> None:
        asset = deepcopy(self.asset)
        del asset["review_contexts"][0]["render_signature_sha256"]
        with self.assertRaisesRegex(audit.ReviewAidError, "render_signature_sha256"):
            self.build_entries(asset=asset)

        runtime = deepcopy(self.runtime)
        runtime["review_context"]["render_signature_sha256"] = "0" * 64
        with self.assertRaisesRegex(audit.ReviewAidError, "render signature is stale"):
            self.build_entries(runtime=runtime)

    def test_wrong_manifest_schema_fails_closed(self) -> None:
        with self.assertRaisesRegex(audit.ReviewAidError, "schema_version"):
            audit.build_review_entries(
                {"schema_version": -1, "assets": [self.asset]},
                [self.runtime],
                canonical_root=self.canonical,
                mobile_root=self.mobile,
                frontend_root=self.frontend,
            )

    def test_failed_image_decode_preserves_previous_complete_output(self) -> None:
        entry = self.build_entries()[0]
        packet = audit.review_packet("b" * 64, [entry])
        corrupt_images = self.root / "corrupt-images"
        corrupt_images.mkdir()
        (corrupt_images / "effective.webp").write_bytes(b"not-an-image")
        output_root = self.root / "review-output"
        output_root.mkdir()
        sentinel = output_root / "previous-complete-packet.txt"
        sentinel.write_text("preserve me", encoding="utf-8")

        with self.assertRaisesRegex(audit.ReviewAidError, "Cannot decode"):
            audit.publish_review_aid(
                packet,
                [entry],
                output_root,
                manifest_sha256="b" * 64,
                image_root=corrupt_images,
            )

        self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve me")
        self.assertEqual(list(output_root.iterdir()), [sentinel])
        self.assertEqual(list(self.root.glob(".review-output.staging-*")), [])

    def test_successful_render_never_replaces_an_unowned_output_directory(self) -> None:
        entry = self.build_entries()[0]
        packet = audit.review_packet("b" * 64, [entry])
        render_images = self.root / "render-images"
        render_images.mkdir()
        audit.Image.new("RGB", (20, 20), "yellow").save(
            render_images / "effective.webp", "PNG"
        )
        output_root = self.root / "unowned-output"
        output_root.mkdir()
        sentinel = output_root / "user-notes.txt"
        sentinel.write_text("preserve me", encoding="utf-8")

        with self.assertRaisesRegex(audit.ReviewAidError, "unowned"):
            audit.publish_review_aid(
                packet,
                [entry],
                output_root,
                manifest_sha256="b" * 64,
                image_root=render_images,
            )

        self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve me")
        self.assertEqual(list(output_root.iterdir()), [sentinel])
        self.assertEqual(list(self.root.glob(".unowned-output.staging-*")), [])

    def test_owned_output_is_replaced_only_after_complete_render(self) -> None:
        entry = self.build_entries()[0]
        packet = audit.review_packet("b" * 64, [entry])
        render_images = self.root / "owned-render-images"
        render_images.mkdir()
        audit.Image.new("RGB", (20, 20), "yellow").save(
            render_images / "effective.webp", "PNG"
        )
        output_root = self.root / "owned-output"

        for _ in range(2):
            inventory_path, sheets = audit.publish_review_aid(
                packet,
                [entry],
                output_root,
                manifest_sha256="b" * 64,
                image_root=render_images,
            )
            self.assertTrue(inventory_path.is_file())
            self.assertEqual(len(sheets), 1)
            self.assertTrue(sheets[0].is_file())
            self.assertTrue((output_root / audit.OUTPUT_MARKER_NAME).is_file())
            self.assertEqual(list(self.root.glob(".owned-output.*-*")), [])

    def test_renderer_has_no_approval_manifest_writer_or_cli_flag(self) -> None:
        self.assertFalse(hasattr(audit, "write_review_manifest"))
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                audit.build_argument_parser().parse_args(["--write-review-manifest"])

    def test_project_guardrail_requires_unambiguous_non_authoritative_review_aids(self) -> None:
        guardrails = (
            audit.ROOT / "docs" / "product" / "project-guardrails.md"
        ).read_text(encoding="utf-8")
        self.assertIn("Every human still-image review aid must show", guardrails)
        self.assertIn("expected concept and option meaning", guardrails)
        self.assertIn("source and effective rendered filenames", guardrails)
        self.assertIn("correct option or a distractor", guardrails)
        self.assertIn("must never create or update an approval registry", guardrails)


if __name__ == "__main__":
    unittest.main()
