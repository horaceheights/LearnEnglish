"""Protect the fresh Playing take without relaxing the shared voice profile."""
import copy
import hashlib
import json
import unittest
from pathlib import Path

from backend.app.course_audio_receipts import (
    NATURAL_PLAYING_AUDIO_SHA256,
    NATURAL_PLAYING_ASSET_IDS,
    validate_provenance,
)
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take
from backend.app.data import LESSONS
from backend.app.schemas import CourseAudioAsset


ROOT = Path(__file__).resolve().parents[2]


class PlayingAudioTests(unittest.TestCase):
    def setUp(self):
        self.registry = load_approved_take_registry()
        evidence = json.loads((ROOT / "docs/qa/playing-audio-2026-09-20.json").read_text(encoding="utf-8"))
        self.assets = [CourseAudioAsset.model_validate(asset) for asset in evidence["retired_assets"]]

    def test_historical_approved_bytes_are_preserved_after_contextual_replacement(self):
        self.assertEqual({asset.id for asset in self.assets}, NATURAL_PLAYING_ASSET_IDS)
        for asset in self.assets:
            with self.subTest(asset=asset.id):
                self.assertEqual(asset.revision, 2)
                resolved = resolve_approved_take(asset, self.registry)
                self.assertEqual(hashlib.sha256(resolved.payload).hexdigest(), NATURAL_PLAYING_AUDIO_SHA256)
                self.assertEqual(resolved.provenance["settings"]["speed"], 0.85)
                self.assertEqual(resolved.provenance["model_id"], "eleven_flash_v2")
                self.assertEqual(resolved.provenance["source"], "elevenlabs-offline-render")
                self.assertEqual(resolved.provenance["request_id"], "0Ta5Kuh0x8P5j9JVteuT")
        course = json.loads((ROOT / "mobile/src/generated/a1-course.json").read_text(encoding="utf-8"))
        lesson = next(item for item in course if item["id"] == "lesson-6-family-actions")
        embedded = [asset for card in lesson["cards"] for asset in card["audio_assets"]
                    if asset["text"] == "Playing"]
        self.assertEqual(embedded, [], "Bare verbs must not return to the active lesson.")
        self.assertTrue(any(asset.text == "They are playing." for card in LESSONS["lesson-6-family-actions"].cards
                            for asset in card.audio_assets))

    def test_natural_speed_exception_requires_exact_bytes_and_binding(self):
        asset = self.assets[0]
        provenance = resolve_approved_take(asset, self.registry).provenance
        with self.assertRaisesRegex(ValueError, "profile field: model_id"):
            validate_provenance(asset, provenance, audio_sha256="0" * 64)
        other = asset.model_copy(update={"id": "another-card"})
        with self.assertRaisesRegex(ValueError, "profile field: model_id"):
            validate_provenance(other, provenance, audio_sha256=NATURAL_PLAYING_AUDIO_SHA256)
        changed = copy.deepcopy(provenance)
        changed["voice_id"] = "another-voice"
        with self.assertRaisesRegex(ValueError, "profile field: voice_id"):
            validate_provenance(asset, changed, audio_sha256=NATURAL_PLAYING_AUDIO_SHA256)

    def test_no_other_active_assets_use_this_take(self):
        active = {asset.id for lesson in LESSONS.values() for card in lesson.cards
                  for asset in card.audio_assets
                  if self.registry["bindings"].get(asset.id, {}).get("take_id") == NATURAL_PLAYING_AUDIO_SHA256}
        self.assertEqual(active, set(), "The standalone take is archived, never rebound to a new sentence.")


if __name__ == "__main__":
    unittest.main()
