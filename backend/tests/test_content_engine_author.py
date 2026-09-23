import json
import unittest
from pathlib import Path

from backend.app.schemas import Lesson
from scripts.answer_choice_guardrail import analyze_bank
from scripts.content_engine.author import BriefError, propose_lesson, review_sheet
from scripts.content_engine.catalog import CatalogLesson, load_standards, lesson_role
from scripts.content_engine.install import InstallRefused, install
from scripts.content_engine.plan import compose_lesson
from scripts.content_engine.practice import audit

ROOT = Path(__file__).resolve().parents[2]
BRIEF = ROOT / "docs/product/content-briefs/example-1.6-family-actions.json"


class ContentEngineAuthorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.standards = load_standards(ROOT, "a1")
        cls.brief = json.loads(BRIEF.read_text(encoding="utf-8"))
        cls.plan, cls.banks = propose_lesson(cls.brief, cls.standards)
        cls.lesson = compose_lesson(cls.plan)

    def test_a_brief_becomes_a_complete_standard_lesson(self):
        Lesson(**self.lesson)
        stages = [card["stage"] for card in self.lesson["cards"]]
        self.assertEqual(len(stages), 42)
        self.assertEqual([stage for index, stage in enumerate(stages) if index == 0 or stages[index - 1] != stage],
                         ["Learn", "Recognize", "Listen", "Speak", "Use"])

    def test_proposals_are_drafts_that_cannot_be_installed(self):
        self.assertTrue(self.plan["draft"])
        with self.assertRaisesRegex(InstallRefused, "draft"):
            install(ROOT, [self.plan], validate=lambda root: [])
        reviewed = {**self.plan, "draft": False}
        with self.assertRaisesRegex(InstallRefused, "already exists"):
            install(ROOT, [reviewed], validate=lambda root: [])

    def test_every_proposed_bank_passes_the_shared_answer_bank_check(self):
        for card in self.lesson["cards"]:
            if card["stage"] not in ("Recognize", "Listen"):
                continue
            with self.subTest(slide=card["slide_id"]):
                _, hard, conflicts = analyze_bank(card)
                self.assertEqual((hard, conflicts), ([], {}))
                labels = [option["label"] for option in card["options"]]
                self.assertEqual(len(labels), len(set(labels)))
                images = [option["image_url"] for option in card["options"] if option["image_url"]]
                self.assertEqual(len(images), len(set(images)))
                if not images:
                    self.assertLessEqual(len(labels), 3)

    def test_two_options_come_before_four(self):
        for stage in ("Recognize", "Listen"):
            counts = [len(card["options"]) for card in self.lesson["cards"] if card["stage"] == stage]
            first_large = next(index for index, count in enumerate(counts) if count > 2)
            self.assertTrue(all(count == 2 for count in counts[:first_large]))
            self.assertGreater(first_large, 0)

    def test_wrong_options_share_the_answers_kind(self):
        kinds = {item["text"]: item["kind"] for item in self.brief["items"] + self.brief["pool"]}
        for bank in self.banks:
            with self.subTest(slide=bank["slide_id"]):
                self.assertEqual({kinds[text] for text in bank["wrong"]}, {kinds[bank["correct"]]})

    def test_the_proposal_meets_the_lesson_practice_standards(self):
        lesson = CatalogLesson("1.6", 1, lesson_role(self.lesson), self.lesson, BRIEF)
        findings = [finding for finding in audit([lesson], self.standards)
                    if finding.rule in {"lesson-length", "new-item-budget", "exposures", "stage-variety"}]
        self.assertEqual(findings, [])

    def test_the_review_sheet_lists_every_bank(self):
        sheet = review_sheet(self.plan, self.banks)
        for bank in self.banks:
            self.assertIn(f"| {bank['slide_id']} |", sheet)
        self.assertIn("answer-choice-review.md", sheet)

    def test_a_brief_without_enough_same_kind_items_is_explained(self):
        brief = {**self.brief, "pool": [], "items": [
            {**item, "kind": "action" if index else "lonely"} for index, item in enumerate(self.brief["items"])]}
        with self.assertRaisesRegex(BriefError, "Not enough lonely"):
            propose_lesson(brief, self.standards)

    def test_a_brief_that_breaks_the_lesson_length_is_refused(self):
        with self.assertRaisesRegex(BriefError, "standard lessons need 40-42"):
            propose_lesson({**self.brief, "items": self.brief["items"][:6]}, self.standards)


if __name__ == "__main__":
    unittest.main()
