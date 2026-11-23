import copy
import json
from pathlib import Path
import tempfile
import unittest

from scripts.prepare_reviewed_delivery_audio import prepare, reviewed_index, sha
from app.course_audio_profile import generation_profile_for


class ReviewedDeliveryAudioTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.payload = b"synthetic test fixture, never a production recording"
        self.digest = sha(self.payload)
        (self.root / "take.mp3").write_bytes(self.payload)
        self.item = {"sha256": self.digest, "text": "I work.", "speakers": ["ana"], "delivery": "normal"}
        raw = (json.dumps([self.item]) + "\n").encode()
        self.manifest = self.root / "manifest.json"
        self.manifest.write_bytes(raw)
        self.approval_path = self.root / "approval.json"
        self.approval = {"status": "user-listening-approved", "batchSha256": sha(raw),
                         "recordedAt": "2026-01-01T00:00:00Z", "answer": "Synthetic unit-test approval",
                         "approved": [self.item]}
        self.save_approval()
        self.asset = {"id": "fixture", "purpose": "prompt", "text": "I work.", "mode": "prompt",
                      "variant": "default", "image_ref": "/lesson-assets/fixture.webp",
                      "semantic_role": "prompt", "speaker_role": "ana",
                      "profile_id": "a1-elevenlabs-character-cast-v1", "revision": 1}
        provenance = {**generation_profile_for("ana", "prompt").as_provenance_contract(),
                      "source": "elevenlabs-offline-render", "stored_media": {}, "processing": [],
                      "generated_at": "2025-12-31T00:00:00Z", "approved_at": None,
                      "request_id": "synthetic-fixture", "trace_id": None, "character_cost": 0}
        self.registry = {"takes": {self.digest: {"text": "I work.", "audio_sha256": self.digest,
                          "bytes": len(self.payload), "provenance": provenance}}}
        self.package = {"canonicalAudioBindings": [{"asset": self.asset,
                        "take": {"file": "take.mp3", "sha256": self.digest}}]}

    def save_approval(self):
        self.approval_path.write_text(json.dumps(self.approval), encoding="utf-8")

    def prepare(self):
        return prepare(self.package, self.root, self.registry, self.manifest, self.approval_path, [])

    def test_exact_approval_preserves_bytes_and_original_provider_record(self):
        original = copy.deepcopy(self.registry)
        registry, payloads, receipts, assets = self.prepare()
        self.assertEqual(self.registry, original)
        self.assertEqual(list(payloads.values()), [self.payload])
        self.assertEqual(registry["takes"][self.digest]["provenance"]["review"]["audio_sha256"], self.digest)
        self.assertEqual(len(assets), 1)
        self.assertEqual(receipts[f"{self.digest}.json"], original["takes"][self.digest])

    def test_line_endings_do_not_change_the_page_batch_identity(self):
        self.manifest.write_bytes(self.manifest.read_bytes().replace(b"\n", b"\r\n"))
        self.assertIn(self.digest, reviewed_index(self.manifest, self.approval_path)[0])

    def test_pending_or_changed_approval_fails_closed(self):
        for field, value in (("status", "pending"), ("batchSha256", "0" * 64), ("approved", [])):
            with self.subTest(field=field):
                saved = copy.deepcopy(self.approval)
                self.approval[field] = value
                self.save_approval()
                with self.assertRaises(ValueError):
                    self.prepare()
                self.approval = saved

    def test_changed_bytes_cannot_use_the_existing_approval(self):
        (self.root / "take.mp3").write_bytes(b"different recording with a different length")
        with self.assertRaises(ValueError):
            self.prepare()

    def test_same_text_cannot_substitute_a_different_voice(self):
        self.registry["takes"][self.digest]["provenance"]["voice_id"] = "wrong-voice"
        with self.assertRaisesRegex(ValueError, "voice_id"):
            self.prepare()

    def test_missing_source_cannot_borrow_an_unrelated_supplement(self):
        self.package["canonicalAudioBindings"][0]["take"] = None
        with self.assertRaisesRegex(ValueError, "Missing exact supplemental"):
            self.prepare()

    def test_supplemental_image_repackaging_preserves_speech_and_original_receipt(self):
        original = copy.deepcopy(self.asset)
        receipt = {"asset": original, "file": "take.mp3", "sha256": self.digest,
                   "provenance": self.registry["takes"][self.digest]["provenance"]}
        self.package["canonicalAudioBindings"][0]["take"] = None
        self.asset.update(id="repackaged-fixture", image_ref="/lesson-assets/new.webp")
        registry, payloads, receipts, assets = prepare(self.package, self.root, self.registry,
            self.manifest, self.approval_path, [(receipt, self.root / "receipt.json")])
        self.assertEqual(registry["bindings"][self.asset["id"]]["source_asset"], original)
        self.assertEqual(receipts[f"{self.digest}.json"], receipt)
        self.assertEqual(list(payloads.values()), [self.payload])
        for key, value in (("text", "She works."), ("speaker_role", "luis"), ("revision", 2)):
            saved = self.asset[key]
            self.asset[key] = value
            with self.assertRaisesRegex(ValueError, "Missing exact supplemental"):
                prepare(self.package, self.root, self.registry, self.manifest, self.approval_path,
                        [(receipt, self.root / "receipt.json")])
            self.asset[key] = saved


if __name__ == "__main__":
    unittest.main()
