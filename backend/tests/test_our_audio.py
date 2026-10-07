"""Keep the user-approved Our take immutable and scoped to its three cards."""
import copy
import hashlib
import json
import unittest
from pathlib import Path

from backend.app.course_audio_profile import render_profile_for
from backend.app.course_audio_receipts import (
    NATURAL_OUR_ASSET_IDS, NATURAL_OUR_AUDIO_SHA256, validate_provenance,
)
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take
from backend.app.data import LESSONS

ROOT = Path(__file__).resolve().parents[2]
REJECTED = "5a9383a63bbdec438d07178728e6e15ae674d065565a832a8ee479b2ba3582f6"


class OurAudioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = load_approved_take_registry()
        cls.assets = [a for lesson in LESSONS.values() for card in lesson.cards
                      for a in card.audio_assets if a.text == "Our"]

    def test_all_standalone_our_uses_the_approved_revision_and_original_bytes(self):
        self.assertEqual({a.id for a in self.assets}, NATURAL_OUR_ASSET_IDS)
        review = json.loads((ROOT / "docs/qa/our-audio-2026-10-07.json").read_text())
        self.assertEqual(review["audio_sha256"], NATURAL_OUR_AUDIO_SHA256)
        self.assertEqual(set(review["asset_ids"]), NATURAL_OUR_ASSET_IDS)
        for asset in self.assets:
            with self.subTest(asset=asset.id):
                self.assertEqual(asset.revision, 2)
                self.assertEqual(asset.speaker_role, "male-character")
                take = resolve_approved_take(asset, self.registry)
                self.assertEqual(hashlib.sha256(take.payload).hexdigest(), NATURAL_OUR_AUDIO_SHA256)
                self.assertEqual(take.provenance["settings"]["speed"], 1.0)
                self.assertEqual(take.provenance["request_id"], "ADRw1rTt4TXvXDiRkzip")
        all_assets = [a for lesson in LESSONS.values() for card in lesson.cards for a in card.audio_assets]
        active = {a.id for a in all_assets
                  if self.registry["bindings"].get(a.id, {}).get("take_id") == NATURAL_OUR_AUDIO_SHA256}
        self.assertEqual(active, NATURAL_OUR_ASSET_IDS)
        self.assertNotIn(REJECTED, {self.registry["bindings"].get(a.id, {}).get("take_id") for a in all_assets})
        old = ROOT / "backend/approved-course-audio" / self.registry["takes"][REJECTED]["file"]
        self.assertEqual(hashlib.sha256(old.read_bytes()).hexdigest(), REJECTED)

    def test_exception_rejects_changed_bytes_binding_or_voice(self):
        asset = self.assets[0]
        provenance = resolve_approved_take(asset, self.registry).provenance
        for candidate, checksum in [(asset, "0" * 64),
                                    (asset.model_copy(update={"id": "other-card"}), NATURAL_OUR_AUDIO_SHA256)]:
            with self.assertRaisesRegex(ValueError, "profile field: model_id"):
                validate_provenance(candidate, provenance, audio_sha256=checksum)
        changed = copy.deepcopy(provenance)
        changed["voice_id"] = "another-voice"
        with self.assertRaisesRegex(ValueError, "profile field: voice_id"):
            validate_provenance(asset, changed, audio_sha256=NATURAL_OUR_AUDIO_SHA256)
        self.assertEqual(render_profile_for("male-character", "prompt").speed, 0.7)

    def test_both_mobile_exports_match_the_canonical_audio(self):
        course = json.loads((ROOT / "mobile/src/generated/a1-course.json").read_text())
        embedded = next(l for l in course if l["id"] == "lesson-3-our-their")
        standalone = json.loads((ROOT / "mobile/src/generated/lesson-3-our-their.json").read_text())
        self.assertEqual(standalone, embedded)
        for card, exported in zip(LESSONS["lesson-3-our-their"].cards, embedded["cards"]):
            self.assertEqual(exported["audio_assets"], [a.model_dump() for a in card.audio_assets])


if __name__ == "__main__":
    unittest.main()
