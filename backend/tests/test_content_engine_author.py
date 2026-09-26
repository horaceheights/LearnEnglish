import json
import tempfile
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
        # Install into a scratch root: a test must never write into the real course.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / self.plan["source"]["path"]
            target.parent.mkdir(parents=True)
            target.write_text("{}", encoding="utf-8")
            self.assertTrue(self.plan["draft"])
            with self.assertRaisesRegex(InstallRefused, "draft"):
                install(root, [self.plan], validate=lambda root: [])
            reviewed = {**self.plan, "draft": False}
            with self.assertRaisesRegex(InstallRefused, "already exists"):
                install(root, [reviewed], validate=lambda root: [])
            self.assertEqual(target.read_text(encoding="utf-8"), "{}")

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

    def test_learn_introduces_only_new_vocabulary(self):
        # User decision, 2026-09-24: sentences on known frames are practice only.
        brief = json.loads(json.dumps(self.brief))
        for item in brief["items"]:
            if item["kind"] == "family-action":
                item["learn"] = False
        brief["layout"] = {"Recognize": 12, "Listen": 10, "Speak": 8, "Use": 7}
        lesson = compose_lesson(propose_lesson(brief, self.standards)[0])
        learn = [card["options"][0]["label"] for card in lesson["cards"] if card["stage"] == "Learn"]
        self.assertEqual(learn, ["Playing", "Studying", "Working", "Cooking", "Talking"])
        practised = " ".join(str(card.get("answer_audio_text") or card.get("audio_text") or "")
                             for card in lesson["cards"] if card["stage"] != "Learn")
        self.assertIn("The mother is cooking.", practised)
        self.assertEqual(len(lesson["cards"]), 42)
        findings = audit([CatalogLesson("1.6", 1, lesson_role(lesson), lesson, BRIEF)], self.standards)
        self.assertEqual([finding for finding in findings if finding.rule == "learn-new-only"], [])
        with self.assertRaisesRegex(BriefError, "at least two new items"):
            propose_lesson({**brief, "items": [{**item, "learn": False} for item in brief["items"]]}, self.standards)

    def test_a_learn_card_on_a_known_frame_is_reported(self):
        findings = audit([CatalogLesson("1.6", 1, lesson_role(self.lesson), self.lesson, BRIEF)], self.standards)
        repeated = {finding.item for finding in findings if finding.rule == "learn-new-only"}
        self.assertIn("The mother is cooking.", repeated)
        self.assertNotIn("Cooking", repeated)

    def test_a_grid_unsafe_picture_never_enters_a_four_picture_card(self):
        brief = json.loads(json.dumps(self.brief))
        unsafe = {item["image"] for item in brief["items"] if item["kind"] == "family-action"}
        for item in brief["items"]:
            if item["image"] in unsafe:
                item["four_card"] = False
        lesson = compose_lesson(propose_lesson(brief, self.standards)[0])
        for card in lesson["cards"]:
            images = [option["image_url"] for option in card.get("options") or [] if option.get("image_url")]
            if len(images) == 4:
                with self.subTest(slide=card["slide_id"]):
                    self.assertFalse(unsafe & {Path(image).name for image in images} | unsafe & set(images))

    def test_a_reply_item_asks_its_question_over_the_picture(self):
        brief = json.loads(json.dumps(self.brief))
        for item in brief["items"]:
            if item["kind"] == "family-action":
                item.update(question="Who is it?", question_es="¿Quién es?")
        lesson = compose_lesson(propose_lesson(brief, self.standards)[0])
        replies = [card for card in lesson["cards"] if card["stage"] == "Recognize" and card["prompt_image_url"]]
        self.assertTrue(replies)
        for card in replies:
            with self.subTest(slide=card["slide_id"]):
                self.assertEqual((card["prompt"], card["audio_text"]), ("Who is it?", "Who is it?"))
                self.assertEqual(card["spanish_translation"], "¿Quién es?")
                self.assertIn(card["answer_audio_text"], {option["label"] for option in card["options"]})
        brief["items"][1].pop("question_es")
        with self.assertRaisesRegex(BriefError, "Spanish of its question"):
            propose_lesson(brief, self.standards)

    def test_preferred_wrong_options_keep_one_variable(self):
        brief = json.loads((ROOT / "docs/product/content-briefs/unit-2/2.6-numbers-1-5.json").read_text(encoding="utf-8"))
        plan, banks = propose_lesson(brief, self.standards)
        count_banks = [bank for bank in banks if bank["correct"] == "Three books." and not bank["images"]]
        self.assertTrue(count_banks)
        for bank in count_banks:
            self.assertEqual(set(bank["wrong"]), {"Two books.", "Four books."})
        lesson = compose_lesson(plan)
        practice_only = {item["text"] for item in brief["items"] if item.get("learn") is False}
        reviewed = {card["slide_id"] for card in lesson["cards"]
                    if (card.get("answer_audio_text") or card.get("audio_text")) in practice_only}
        self.assertTrue(reviewed and reviewed <= set(lesson["purposeful_review_slides"]))

    def test_colors_show_discs_only_on_learn_and_name_things_by_text(self):
        brief = json.loads((ROOT / "docs/product/content-briefs/unit-2/2.8-colors.json").read_text(encoding="utf-8"))
        lesson = compose_lesson(propose_lesson(brief, self.standards)[0])
        learn = [card for card in lesson["cards"] if card["stage"] == "Learn"]
        self.assertEqual([card["prompt"] for card in learn], ["Colors", "Red", "Blue", "Green", "Yellow", "Black", "White"])
        for card in lesson["cards"]:
            images = json.dumps(card)
            if card["stage"] != "Learn":
                self.assertNotIn("a1_photo_u2_color_", images, card["slide_id"])
                self.assertNotIn("a1_photo_u2_colors_v1", images, card["slide_id"])
            answer = card.get("answer_audio_text") or card.get("audio_text") or ""
            if card["stage"] in ("Recognize", "Listen") and answer.startswith("It is a "):
                self.assertFalse(any(option.get("image_url") for option in card["options"]), card["slide_id"])

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
        with self.assertRaisesRegex(BriefError, "No lonely"):
            propose_lesson(brief, self.standards)

    def test_avoided_options_are_never_proposed_and_banks_shrink_instead(self):
        items = [{**item, "avoid": ["Studying", "Working"]} if item["text"] == "Playing" else item
                 for item in self.brief["items"]]
        plan, banks = propose_lesson({**self.brief, "items": items}, self.standards)
        for bank in banks:
            if bank["correct"] == "Playing":
                self.assertFalse({"Studying", "Working"} & set(bank["wrong"]))
        lesson = compose_lesson(plan)
        self.assertEqual(len(lesson["cards"]), 42)

    def test_wrong_options_without_a_specific_hint_are_replaced(self):
        from scripts.content_engine.author import propose_explained_lesson
        first_plan, first_banks = propose_lesson(self.brief, self.standards)
        target = next(bank for bank in first_banks if len(bank["wrong"]) >= 1)
        unexplained = {(target["correct"], target["wrong"][0])}
        calls = []

        def check(lesson):
            calls.append(lesson["id"])
            proposed = {(card["options"][0]["label"], option["label"]) for card in lesson["cards"] for option in card["options"]}
            return unexplained & proposed if len(calls) == 1 else set()

        plan, banks = propose_explained_lesson(self.brief, self.standards, check=check)
        self.assertEqual(len(calls), 2)
        for bank in banks:
            if bank["correct"] == target["correct"]:
                self.assertNotIn(target["wrong"][0], bank["wrong"])

    def test_extending_a_lesson_keeps_every_reviewed_card_and_appends_per_section(self):
        from scripts.content_engine.author import extend_lesson
        lesson = json.loads((ROOT / "backend/lessons/unit_2/lesson-2-2-streets-and-transportation.yaml")
                            .read_text(encoding="utf-8"))
        original = {card["slide_id"]: card for card in lesson["cards"]}
        extended, banks = extend_lesson(lesson, self.standards, check=lambda lesson: set())
        stages = [card["stage"] for card in extended["cards"]]
        self.assertEqual(stages, sorted(stages, key=["Learn", "Recognize", "Listen", "Speak", "Use"].index))
        kept = [card for card in extended["cards"] if card["slide_id"] in original]
        self.assertEqual(kept, [original[card["slide_id"]] for card in kept])
        added = [card for card in extended["cards"] if card["slide_id"] not in original]
        self.assertEqual(sorted(card["stage"] for card in added),
                         ["Listen", "Listen", "Recognize", "Recognize", "Speak", "Use"])
        self.assertTrue(all(len(bank["wrong"]) >= 1 for bank in banks))

    def test_named_speakers_and_exchanges_voice_every_card_that_plays_them(self):
        brief = json.loads((ROOT / "docs/product/content-briefs/unit-3/3.3-am-is-and-are.json").read_text(encoding="utf-8"))
        items = {item["text"]: item for item in brief["items"]}
        lesson = compose_lesson(propose_lesson(brief, self.standards)[0])
        self.assertEqual(lesson["cards"][0]["audio_speaker"], "luis")
        for card in lesson["cards"]:
            answer = card.get("answer_audio_text") or card.get("audio_text")
            item = items.get(answer)
            if item is None:
                continue
            with self.subTest(slide=card["slide_id"]):
                if item.get("turns"):
                    self.assertNotEqual(card["stage"], "Use")
                    turns = card.get("audio_turns") or card.get("answer_audio_turns")
                    self.assertEqual([turn["speaker_role"] for turn in turns],
                                     [turn["speaker"] for turn in item["turns"]])
                    self.assertEqual(" ".join(turn["text"] for turn in turns), item["text"])
                elif item.get("question") and card.get("prompt") == item["question"]:
                    self.assertEqual((card["audio_speaker"], card["answer_audio_speaker"]),
                                     (item["question_speaker"], item["speaker"]))
                elif item.get("speaker"):
                    self.assertEqual(item["speaker"], card.get("audio_speaker") or card.get("answer_audio_speaker"))
                else:
                    # Narration takes turns between the brief's narrators; the teacher needs no role.
                    self.assertIn(card.get("audio_speaker") or card.get("answer_audio_speaker") or "teacher",
                                  brief["narrators"])
        broken = {**brief, "items": [{**item, "turns": [{"text": "Hi.", "speaker": "ana", "image": item["image"]}]}
                                     if item.get("turns") else item for item in brief["items"]]}
        with self.assertRaisesRegex(BriefError, "must say exactly its text"):
            propose_lesson(broken, self.standards)

    def test_a_replaced_learn_take_keeps_its_bumped_revision(self):
        # Lesson 3.1 L1 "Hello." rejected an old take with revision 2; the engine must keep it.
        brief = json.loads((ROOT / "docs/product/content-briefs/unit-3/3.1-greetings-and-names.json").read_text(encoding="utf-8"))
        lesson = compose_lesson(propose_lesson(brief, self.standards)[0])
        learn = lesson["cards"][0]
        self.assertEqual((learn["prompt"], learn["audio_revision"], learn["answer_audio_revision"]), ("Hello.", 2, 2))
        self.assertEqual([card["slide_id"] for card in lesson["cards"] if card.get("audio_revision")], ["L1"])

    def test_accepted_conflicts_picture_only_words_and_multiword_names(self):
        from scripts.content_engine.author import coherent, form
        hello, goodbye = {"text": "Hello."}, {"text": "Goodbye."}
        self.assertFalse(coherent([hello, goodbye]))
        self.assertTrue(coherent([{**hello, "accepts": {"conversational-response": "Greetings are responses."}},
                                  goodbye]))
        self.assertEqual(form({"text": "The United States", "form": "word"}), "word")
        brief = json.loads((ROOT / "docs/product/content-briefs/unit-3/3.9-professions.json").read_text(encoding="utf-8"))
        jobs = {item["text"] for item in brief["items"] if item.get("text_choices") is False}
        self.assertTrue(jobs)
        for bank in propose_lesson(brief, self.standards)[1]:
            if bank["correct"] in jobs:
                self.assertTrue(bank["images"], bank["slide_id"])

    def test_a_brief_that_breaks_the_lesson_length_is_refused(self):
        with self.assertRaisesRegex(BriefError, "standard lessons need 40-42"):
            propose_lesson({**self.brief, "items": self.brief["items"][:6]}, self.standards)


if __name__ == "__main__":
    unittest.main()
