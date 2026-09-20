import json
import re
import subprocess
import unittest
from pathlib import Path
from types import SimpleNamespace

from backend.app.data import LESSONS
from scripts.validate_lesson_cards import validate_answer_choice_forms


ROOT = Path(__file__).resolve().parents[2]


class AnswerChoiceFormTests(unittest.TestCase):
    def findings(self, labels, stage="Recognize", interaction="i2t3", images=False, mission=None):
        card = SimpleNamespace(
            slide_id="R2", stage=stage, interaction_type=interaction, mission_game=mission,
            options=[SimpleNamespace(label=label, image_url=f"{i}.webp" if images else "")
                     for i, label in enumerate(labels)],
        )
        return validate_answer_choice_forms([SimpleNamespace(id="example", cards=[card])])

    def test_rejects_mixed_forms_in_every_choice_stage_and_direction(self):
        for stage in ("Recognize", "Listen", "Use"):
            for images in (False, True):
                with self.subTest(stage=stage, images=images):
                    self.assertEqual(1, len(self.findings(
                        ["Working", "Studying", "The children are playing."], stage, images=images)))

    def test_form_does_not_depend_on_punctuation_or_answer_position(self):
        for labels in (["The children are playing", "Working."],
                       ["Working.", "The children are playing"],
                       ["Running", "She runs."]):
            with self.subTest(labels=labels):
                self.assertEqual(1, len(self.findings(labels)))

    def test_preserves_words_sentences_and_natural_utterances(self):
        for labels in (["Playing", "Studying", "Working"],
                       ["The children are playing.", "The mother is cooking.", "The father is working."],
                       ["Hello.", "Here you are.", "Thank you."],
                       ["Cross the street.", "Stop."], ["Bus", "Train", "Bus stop"]):
            with self.subTest(labels=labels):
                self.assertEqual([], self.findings(labels))

    def test_construction_tokens_and_mission_targets_are_not_competing_answers(self):
        labels = ["Playing", "The children are playing."]
        self.assertEqual([], self.findings(labels, "Use", "complete-sentence"))
        self.assertEqual([], self.findings(labels, mission=SimpleNamespace()))

    def test_whole_course_has_no_word_sentence_mixtures(self):
        self.assertEqual([], validate_answer_choice_forms())

    def test_family_action_sentence_banks_are_balanced_and_varied(self):
        lesson = LESSONS["lesson-6-family-actions"]
        checked = []
        for card in lesson.cards:
            if card.stage not in {"Recognize", "Listen"} or any(o.image_url for o in card.options):
                continue
            labels = [o.label for o in card.options]
            if all(len(label.split()) == 1 for label in labels):
                continue
            checked.append(card.slide_id)
            parsed = [re.fullmatch(r"(.+) (?:is|are) (\w+ing)\.", label) for label in labels]
            self.assertTrue(all(parsed), (card.slide_id, labels))
            self.assertEqual(len(labels), len({match[1] for match in parsed}))
            self.assertEqual(len(labels), len({match[2] for match in parsed}))
            counts = [len(label.split()) for label in labels]
            self.assertLessEqual(max(counts) - min(counts), 1)
        self.assertEqual(["R2", "R4", "R6", "R8", "A6"], checked)
        for slide_id in ("R1", "R3", "R5", "R7", "R9"):
            card = next(card for card in lesson.cards if card.slide_id == slide_id)
            self.assertTrue(all(len(option.label.split()) == 1 for option in card.options))

    def test_authoring_and_both_mobile_exports_match_canonical_choices(self):
        result = subprocess.run(
            ["node", "--input-type=module", "-e",
             "import { lesson16 } from './scripts/build_unit_1_lessons.mjs'; console.log(JSON.stringify(lesson16));"],
            cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True,
        )
        authored = json.loads(result.stdout)
        canonical = json.loads((ROOT / "backend/lessons/unit_1/1.6_family_actions.yaml").read_text(encoding="utf-8"))
        generated = ROOT / "mobile/src/generated"
        snapshot = json.loads((generated / "lesson-6-family-actions.json").read_text(encoding="utf-8"))
        course = json.loads((generated / "a1-course.json").read_text(encoding="utf-8"))
        embedded = next(lesson for lesson in course if lesson["id"] == canonical["id"])
        for card in canonical["cards"]:
            if card["stage"] not in {"Recognize", "Listen"}:
                continue
            for source in (authored, snapshot, embedded):
                other = next(c for c in source["cards"] if c["slide_id"] == card["slide_id"])
                self.assertEqual(card["options"], other["options"], card["slide_id"])


if __name__ == "__main__":
    unittest.main()
