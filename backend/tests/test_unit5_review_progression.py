"""Keep the approved Unit 5 progression on the successful learner path."""
import json
import re
import unittest
from copy import deepcopy
from pathlib import Path

from scripts.content_engine.plan import compose_lesson

ROOT = Path(__file__).resolve().parents[2]
COURSE = json.loads((ROOT / "mobile/src/generated/a1-course.json").read_text(encoding="utf-8"))
LESSONS = {lesson["sub_lesson_id"]: lesson for lesson in COURSE}
STAGES = ("Learn", "Recognize", "Listen", "Speak", "Use")


def successful_text(card):
    """Never count a distractor as practice."""
    if card.get("mission_game"):
        return " ".join(cue.get("answer_text", "") for cue in card["mission_game"]["cues"])
    if card.get("answer_audio_text"):
        return card["answer_audio_text"]
    if card.get("audio_text"):
        return card["audio_text"]
    return card.get("prompt", "")


class UnitFiveReviewTests(unittest.TestCase):
    def test_all_reviewed_engine_plans_reproduce_canonical_content(self):
        plans = sorted((ROOT / "docs/product/content-plans/unit5-review-2026-10-08").glob("*.plan.json"))
        self.assertEqual(len(plans), 16)
        for path in plans:
            plan = json.loads(path.read_text(encoding="utf-8"))
            authored = compose_lesson(plan)
            canonical = ROOT / plan["source"]["path"]
            self.assertEqual(authored, json.loads(canonical.read_text(encoding="utf-8")), path.name)

    def test_agreement_and_negative_needs_are_retrieved_in_every_stage(self):
        for number, phrases in (
            ("5.5", ("Me too.", "Me neither.")),
            ("5.6", ("I want juice.", "I do not want milk.", "I need water.", "I do not need juice.")),
        ):
            for stage in STAGES:
                text = " ".join(successful_text(card) for card in LESSONS[number]["cards"] if card["stage"] == stage)
                for phrase in phrases:
                    self.assertIn(phrase, text, (number, stage))
        lesson = LESSONS["5.5"]
        self.assertEqual([c["audio_text"] for c in lesson["cards"] if c["stage"] == "Learn"],
                         ["I like coffee.", "Me too.", "I do not like milk.", "Me neither."])
        for slide in ("R10", "R11"):
            card = next(c for c in lesson["cards"] if c["slide_id"] == slide)
            self.assertEqual(len(card["answer_audio_turns"]), 2, "Keep the already coherent question and reply.")

    def test_meals_follow_day_order_and_do_not_introduce_hunger(self):
        for stage in STAGES:
            ranks = []
            for card in LESSONS["5.7"]["cards"]:
                if card["stage"] != stage:
                    continue
                match = re.search(r"\b(breakfast|lunch|dinner)\b", successful_text(card), re.I)
                if match:
                    ranks.append(("breakfast", "lunch", "dinner").index(match[1].lower()))
            self.assertEqual(set(ranks), {0, 1, 2}, stage)
            self.assertEqual(ranks, sorted(ranks), stage)
        self.assertNotIn("hungry", json.dumps(LESSONS["5.7"]).lower())
        self.assertIn("hungry", json.dumps(LESSONS["7.2"]).lower())

    def test_replies_have_a_distinct_correct_answer_frame_and_speaker(self):
        for number, slide, reply in (("5.5", "R2", "Me too."), ("5.5", "R4", "Me neither."),
                                     ("5.7", "R11", "Me too.")):
            card = next(c for c in LESSONS[number]["cards"] if c["slide_id"] == slide)
            self.assertEqual(card["answer_audio_text"], reply)
            turns = card["answer_audio_turns"]
            self.assertEqual(len(turns), 1)
            self.assertEqual(turns[0]["text"], reply)
            self.assertTrue(card["prompt_image_url"])
            self.assertNotEqual(turns[0]["image_url"], card["prompt_image_url"])
            self.assertNotEqual(turns[0]["speaker_role"], card["audio_speaker"])
            correct = next(o for o in card["options"] if o["id"] == card["correct_option_id"])
            self.assertEqual(correct["label"], reply)

    def test_ordering_introduces_requests_before_shop_transfer(self):
        cafe, market = LESSONS["5.9"], LESSONS["5.10"]
        self.assertIn("Ordering Politely 1", cafe["title"])
        self.assertIn("Ordering Politely 2", market["title"])
        learn = [c["audio_text"] for c in cafe["cards"] if c["stage"] == "Learn"]
        self.assertEqual(learn[:4], ["Hello! How can I help you?", "Can I have coffee, please?",
                                     "Here is your coffee.", "Thank you."])
        self.assertIn("Water, please.", learn)
        self.assertIn("Can I have coffee and eggs, please?", learn)
        self.assertNotIn("A café", learn)
        for stage in ("Recognize", "Listen", "Speak", "Use"):
            text = " ".join(successful_text(c) for c in market["cards"] if c["stage"] == stage)
            for phrase in ("Can I have three apples, please?", "Can I have the blue bag, please?",
                           "Yes, please.", "No, thank you."):
                self.assertIn(phrase, text, stage)

    def test_review_and_mission_retrieve_revised_functions(self):
        for number in ("5.11", "5.12"):
            text = " ".join(successful_text(c) for c in LESSONS[number]["cards"])
            for phrase in ("Me too.", "Me neither.", "I do not want milk.", "I do not need juice.",
                           "Can I have coffee and eggs, please?", "Thank you."):
                self.assertIn(phrase, text, number)
        mission = LESSONS["5.12"]["cards"]
        self.assertEqual(len(mission), 20)
        self.assertEqual(sum(c["mission_game"]["kind"] == "voice-gate" for c in mission), 10)
        self.assertEqual([c["slide_id"] for c in mission],
                         [*[f"M{i:02}" for i in range(1, 13)], "M12L", "M12D",
                          *[f"M{i:02}" for i in range(13, 19)]])

    def test_mission_contract_preserves_recap_order_card_identity_and_mission_media(self):
        from scripts.validate_lesson_cards import LESSONS as canonical, validate_mission_contracts

        self.assertEqual(validate_mission_contracts(canonical), [])
        mission_id = "lesson-5-10-cafe-mission"
        cases = (
            ("missing meal", "must contain exactly 20 mission beats"),
            ("renumbered stable card", "mission beat IDs must preserve the approved sequence"),
            ("market inside recap", "approved chapter beat map"),
            ("teaching hero", "namespace"),
        )
        for name, expected_error in cases:
            with self.subTest(regression=name):
                lesson = deepcopy(canonical[mission_id])
                lunch = next(card for card in lesson.cards if card.slide_id == "M12L")
                if name == "missing meal":
                    lesson.cards.remove(lunch)
                elif name == "renumbered stable card":
                    for index, card in enumerate(lesson.cards, 1):
                        card.slide_id = f"M{index:02d}"
                elif name == "market inside recap":
                    lunch.mission_chapter_id = "precios"
                else:
                    lunch.prompt_image_url = "/lesson-assets/a1_u5_sequence_cafe_lunch_v1.webp"
                errors = validate_mission_contracts({**canonical, mission_id: lesson})
                self.assertTrue(any(expected_error in error for error in errors), errors)

    def test_price_cues_hit_their_own_physical_tag(self):
        card = next(c for c in LESSONS["5.12"]["cards"] if c["slide_id"] == "M13")
        self.assertIn("mission_price_board", card["prompt_image_url"])
        game = card["mission_game"]
        targets = {target["id"]: target for target in game["targets"]}
        # Centers measured on the inspected 1536x1024 source, also checked at phone size.
        for cue, x, claim in zip(game["cues"], (.115, .37, .64, .89), (
            "The apples are one dollar.", "The bananas are two dollars.",
            "The bread is three dollars.", "The milk is five dollars.",
        )):
            self.assertEqual(cue["answer_text"], claim)
            hits = [target["id"] for target in targets.values()
                    if target["rect"]["x"] <= x <= target["rect"]["x"] + target["rect"]["width"]
                    and target["rect"]["y"] <= .55 <= target["rect"]["y"] + target["rect"]["height"]]
            self.assertEqual(hits, [cue["target_id"]])


if __name__ == "__main__":
    unittest.main()
