"""A1+ 2.5 this/that photos: a THIS photo and a THAT photo per scene, and the picture switch on "but".

User decisions recorded in docs/product/project-guardrails.md (A1+ Unit 2 order, 2.5, and the decision log,
2026-11-19): after testing 2.5 in Preview the user found the photos unclear ("the person is just looking at this
one but person does not point at the other bag or item for that one") and chose "two image transitions". In each
scene the THIS photo shows the speaker looking down at the near thing and touching it, and the THAT photo, taken
from the same camera, shows the speaker turned to the far thing and pointing down at it. A *but* sentence plays as
two turns by the same speaker, THIS photo first and then THAT photo, so the picture changes on *but*. Lines with
*this one* show a THIS photo, lines with *that one* show a THAT photo, and no 2.5 photo goes into a
four-picture card.
"""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LESSON = ROOT / "backend/lessons/a1_plus/unit_2/a1plus-unit-2-lesson-2-5.yaml"


def cards() -> list[dict]:
    return json.loads(LESSON.read_text(encoding="utf-8"))["cards"]


def switches() -> list[tuple[dict, list[dict]]]:
    """Every card that plays a *but that* sentence, with the turns it plays."""
    found = []
    for card in cards():
        for field in ("audio_turns", "answer_audio_turns"):
            turns = card.get(field) or []
            if any("but that" in turn["text"] for turn in turns):
                found.append((card, turns))
    return found


def card_picture(card: dict) -> str:
    """The one picture shown with a single line: the prompt picture, else the single option's picture."""
    if card.get("prompt_image_url"):
        return card["prompt_image_url"]
    options = card.get("options") or []
    return options[0].get("image_url") or "" if len(options) == 1 else ""


class ThisThatPointingTests(unittest.TestCase):
    def test_but_sentences_switch_from_this_photo_to_that_photo(self):
        pairs = switches()
        self.assertGreaterEqual(len(pairs), 10)
        for card, turns in pairs:
            with self.subTest(card=card["slide_id"]):
                self.assertEqual(len(turns), 2, "a but sentence plays as exactly two turns")
                first, second = turns
                self.assertEqual(first["speaker_role"], second["speaker_role"], "one speaker says both halves")
                self.assertTrue(first["text"].endswith(","), "the first turn stops before but")
                self.assertTrue(second["text"].startswith("but that"), "the picture changes on but")
                self.assertNotEqual(first["image_url"], second["image_url"], "THIS photo, then THAT photo")

    def test_this_and_that_photos_stay_apart(self):
        this_photos = {turns[0]["image_url"] for _, turns in switches()}
        that_photos = {turns[1]["image_url"] for _, turns in switches()}
        self.assertEqual(len(this_photos), 5)
        self.assertEqual(len(that_photos), 5)
        self.assertFalse(this_photos & that_photos)
        for card in cards():
            line = card.get("answer_audio_text") or card.get("audio_text") or card.get("prompt") or ""
            picture = card_picture(card)
            if not picture or "but" in line:
                continue
            with self.subTest(card=card["slide_id"], line=line):
                if " that one " in f" {line.lower()} ":
                    self.assertIn(picture, that_photos, "a that one line shows the speaker pointing at the far thing")
                elif " this one " in f" {line.lower()} ":
                    self.assertIn(picture, this_photos, "a this one line shows the speaker touching the near thing")

    def test_no_four_picture_card(self):
        photos = {turn["image_url"] for _, turns in switches() for turn in turns}
        for card in cards():
            images = [option.get("image_url") for option in card.get("options") or [] if option.get("image_url")]
            if len(images) >= 4:
                self.assertFalse(set(images) & photos, card["slide_id"])


if __name__ == "__main__":
    unittest.main()
