"""A1+ simple past: regular -ed verbs and did only, starting in Unit 4.

User decision 2026-11-13, recorded in docs/product/project-guardrails.md
("Simple past"). The past starts in Unit 4, after Unit 1 teaches don't/doesn't
(1.8) and Do/Does...? (1.9), so Units 1-3 use no past forms at all. Irregular
past forms (was/were included) wait for a later course in every A1+ unit.
After did/didn't the verb is the base form, which this check does not touch.
"""
import re
import unittest
from pathlib import Path

from scripts.content_engine.catalog import load_catalog, load_standards
from scripts.content_engine.practice import card_language

ROOT = Path(__file__).resolve().parents[2]
FIRST_PAST_UNIT = 4

IRREGULAR_PAST = {
    "was", "were", "wasn't", "weren't", "went", "ate", "drank", "had", "hadn't", "got", "took", "came",
    "saw", "made", "bought", "gave", "ran", "swam", "wrote", "drove", "rode", "met", "sat", "slept",
    "woke", "spoke", "told", "said", "thought", "found", "felt", "knew", "began", "brought", "taught",
    "paid", "sold", "sang", "wore", "flew", "fell", "lost", "won", "kept", "heard",
}
DID = {"did", "didn't"}
# Words that end in -ed but are not past forms. Add an adjective here only when
# a lesson teaches it as an adjective (A1 7.2 teaches "tired").
NOT_PAST_ED = {"bed", "red", "tired", "united", "hundred"}


def words(card: dict) -> set[str]:
    return set(re.findall(r"[a-z]+(?:'[a-z]+)?", card_language(card).replace("’", "'")))


def past_forms(card: dict) -> tuple[set[str], set[str]]:
    """Return (irregular past forms, any past forms) found on the card."""
    found = words(card)
    regular = {w for w in found if w.endswith("ed") and not w.endswith("eed") and w not in NOT_PAST_ED}
    irregular = found & IRREGULAR_PAST
    return irregular, irregular | regular | (found & DID)


def a1plus_lessons():
    return load_catalog(ROOT, load_standards(ROOT, "a1-plus"))


class A1PlusSimplePastTests(unittest.TestCase):
    def test_no_past_forms_before_unit_4(self):
        problems = []
        for lesson in a1plus_lessons():
            if lesson.unit >= FIRST_PAST_UNIT:
                continue
            for card in lesson.data.get("cards") or []:
                found = past_forms(card)[1]
                if found:
                    problems.append(f"{lesson.number} {card.get('slide_id')}: {sorted(found)}")
        self.assertEqual(problems, [], "A1+ starts the past in Unit 4 (guardrail 'Simple past').")

    def test_no_irregular_past_forms_in_any_unit(self):
        problems = []
        for lesson in a1plus_lessons():
            for card in lesson.data.get("cards") or []:
                found = past_forms(card)[0]
                if found:
                    problems.append(f"{lesson.number} {card.get('slide_id')}: {sorted(found)}")
        self.assertEqual(problems, [], "A1+ teaches the past with regular -ed verbs and did only.")

    def test_the_check_recognizes_past_forms_and_spares_other_words(self):
        card = {"audio_text": "I cleaned the kitchen yesterday. Did you clean it? No, I didn't.",
                "options": [{"id": "a", "label": "She went home."}]}
        irregular, found = past_forms(card)
        self.assertEqual(irregular, {"went"})
        self.assertEqual(found, {"cleaned", "did", "didn't", "went"})
        spared = {"audio_text": "I need a red bed. I am tired. One hundred people live in the United States."}
        self.assertEqual(past_forms(spared), (set(), set()))


if __name__ == "__main__":
    unittest.main()
