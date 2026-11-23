"""Keep the reviewed short words and explicit object practice in both clients."""
import copy
import hashlib
import json
import re
import unittest
from pathlib import Path

from backend.app.course_audio_receipts import NATURAL_LOCATION_WORD_ASSET_IDS, validate_provenance
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take
from backend.app.data import LESSONS

ROOT = Path(__file__).resolve().parents[2]
LESSON_ID = "lesson-4-3-where-things-are"
REJECTED = {
    "In": "5e5b01ad1ffe84d9d5ac6ed90cc9e28886a7239a1c6619c2ab5c92c23450e783",
    "On": "0c3bca9702f985c17d78251382a27abfb9bbbfa218beaef2d8fcf7b018a23a27",
}


class LocationWordAudioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = load_approved_take_registry()
        cls.lesson = LESSONS[LESSON_ID]
        cls.assets = {a.id: a for lesson in LESSONS.values() for card in lesson.cards
                      for a in card.audio_assets}

    def test_every_active_rejected_take_is_replaced_with_the_reviewed_bytes(self):
        expected = set().union(*NATURAL_LOCATION_WORD_ASSET_IDS.values())
        affected = {a.id for a in self.assets.values()
                    if a.text in REJECTED and a.speaker_role in {"teacher", "answer"}}
        self.assertEqual(affected, expected)
        for sha256, identifiers in NATURAL_LOCATION_WORD_ASSET_IDS.items():
            active = {a.id for a in self.assets.values()
                      if self.registry["bindings"].get(a.id, {}).get("take_id") == sha256}
            self.assertEqual(active, identifiers)
            for identifier in identifiers:
                asset = self.assets[identifier]
                resolved = resolve_approved_take(asset, self.registry)
                self.assertEqual(asset.revision, 2)
                self.assertEqual(hashlib.sha256(resolved.payload).hexdigest(), sha256)
                self.assertEqual(resolved.provenance["settings"]["speed"], 0.85)
                self.assertEqual(resolved.provenance["model_id"], "eleven_flash_v2")
        self.assertFalse({self.registry["bindings"].get(a.id, {}).get("take_id")
                          for a in self.assets.values()} & set(REJECTED.values()))
        # Historical files and approval records remain available for audit.
        for rejected in REJECTED.values():
            self.assertIn(rejected, self.registry["takes"])

    def test_short_word_exception_cannot_change_other_audio_or_voices(self):
        for sha256, identifiers in NATURAL_LOCATION_WORD_ASSET_IDS.items():
            asset = self.assets[next(iter(identifiers))]
            provenance = resolve_approved_take(asset, self.registry).provenance
            for changed, checksum in [(asset, "0" * 64),
                                       (asset.model_copy(update={"id": "other-card"}), sha256)]:
                with self.assertRaisesRegex(ValueError, "profile field: model_id"):
                    validate_provenance(changed, provenance, audio_sha256=checksum)
            changed = copy.deepcopy(provenance)
            changed["voice_id"] = "another-voice"
            with self.assertRaisesRegex(ValueError, "profile field: voice_id"):
                validate_provenance(asset, changed, audio_sha256=sha256)

    def test_location_practice_names_objects_in_every_stage(self):
        self.assertEqual(len(self.lesson.cards), 42)
        self.assertEqual({c.stage for c in self.lesson.cards},
                         {"Learn", "Recognize", "Listen", "Speak", "Use"})
        for card in self.lesson.cards:
            language = [card.prompt, card.audio_text, card.answer_audio_text,
                        *[option.label for option in card.options]]
            with self.subTest(slide=card.slide_id):
                self.assertFalse(any(re.search(r"\bit\b", text or "", re.I) for text in language))
                if card.stage == "Use":
                    options = {o.id: o.label for o in card.options}
                    answers = iter(options[key] for key in card.correct_option_ids)
                    completed = re.sub(r"_+", lambda _: next(answers), card.prompt)
                    self.assertEqual(completed, card.answer_audio_text)
        cards = {c.slide_id: c for c in self.lesson.cards}
        self.assertEqual(cards["R4"].prompt, "Where is the blue book?")
        self.assertEqual(cards["R4"].answer_audio_text, "The blue book is in the bag.")
        self.assertEqual(cards["R10"].prompt, "Where is the bag?")
        brief = json.loads((ROOT / "docs/product/content-briefs/unit-4/4.3-where-things-are.json").read_text(encoding="utf-8"))
        for item in brief["items"] + brief["pool"]:
            for text in [item["text"], item.get("question", ""), *item.get("prefer", [])]:
                self.assertNotRegex(text, r"(?i)\bit\b")

    def test_mobile_export_preserves_the_canonical_text_and_audio(self):
        course = json.loads((ROOT / "mobile/src/generated/a1-course.json").read_text(encoding="utf-8"))
        embedded = next(l for l in course if l["id"] == LESSON_ID)
        standalone = json.loads((ROOT / f"mobile/src/generated/{LESSON_ID}.json").read_text(encoding="utf-8"))
        self.assertEqual(standalone, embedded)
        self.assertEqual(len(embedded["cards"]), len(self.lesson.cards))
        for card, exported in zip(self.lesson.cards, embedded["cards"]):
            for field in ("slide_id", "prompt", "audio_text", "answer_audio_text", "options", "audio_assets"):
                self.assertEqual(exported[field], card.model_dump()[field])
            for asset in card.audio_assets:
                self.assertIsNotNone(resolve_approved_take(asset, self.registry))


if __name__ == "__main__":
    unittest.main()
