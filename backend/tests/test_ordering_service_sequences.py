"""Ordering is a service exchange, with pictured evidence before each reply."""
import json
import unittest
from pathlib import Path

from scripts.content_engine.plan import compose_lesson

ROOT = Path(__file__).resolve().parents[2]


def lesson(name):
    return json.loads((ROOT / "backend/lessons/unit_5" / f"{name}.yaml").read_text(encoding="utf-8"))


def by_id(data):
    return {card["slide_id"]: card for card in data["cards"]}


GREETING = "Hello! How can I help you?"
EXCHANGES = [
    [GREETING, "Can I have coffee, please?", "Here is your coffee.", "Thank you."],
    [GREETING, "Water, please.", "Here you are.", "Thank you."],
    [GREETING, "Can I have coffee and eggs, please?", "Here are your coffee and eggs.", "Thank you."],
]


class OrderingServiceSequenceTests(unittest.TestCase):
    def test_learn_models_complete_orders_before_their_practice(self):
        cafe = lesson("lesson-5-8-ordering-politely")
        learn = [c for c in cafe["cards"] if c["stage"] == "Learn"]
        self.assertEqual([c["audio_text"] for c in learn], sum(EXCHANGES, []))
        for i in range(0, len(learn), 4):
            group = learn[i:i + 4]
            roles = (["male-character", "female-character"] if i == 4
                     else ["female-character", "male-character"])
            self.assertEqual([c["audio_speaker"] for c in group],
                             roles * 2)
            self.assertEqual(len({c["options"][0]["image_url"] for c in group}), 4,
                             "Greeting, request, handover and thanks must depict different moments.")

    def test_recognition_reveals_response_evidence_before_selection(self):
        cafe = lesson("lesson-5-8-ordering-politely")
        pairs = [(a, b) for ex in EXCHANGES for a, b in zip(ex, ex[1:])]
        recognize = [c for c in cafe["cards"] if c["stage"] == "Recognize"]
        self.assertEqual(len(recognize), len(pairs))
        for card, (prompt, reply) in zip(recognize, pairs):
            self.assertEqual((card["prompt"], card["audio_text"], card["answer_audio_text"]),
                             (prompt, prompt, reply))
            self.assertEqual(card["reply_image_timing"], "after-prompt")
            self.assertNotIn("audio_turns", card, "Do not reveal response audio before the learner chooses.")
            response = card["answer_audio_turns"]
            self.assertEqual(len(response), 1)
            self.assertEqual(response[0]["text"], reply)
            self.assertNotEqual(card["prompt_image_url"], response[0]["image_url"])
            self.assertNotEqual(card["audio_speaker"], response[0]["speaker_role"])
            correct = next(o for o in card["options"] if o["id"] == card["correct_option_id"])
            self.assertEqual(correct["label"], reply)

    def test_listen_keeps_context_and_speaker_images_in_the_same_order(self):
        cafe = lesson("lesson-5-8-ordering-politely")
        pairs = [(a, b) for ex in EXCHANGES for a, b in zip(ex, ex[1:])]
        listening = [c for c in cafe["cards"] if c["stage"] == "Listen"]
        self.assertEqual(len(listening), len(pairs))
        for card, pair in zip(listening, pairs):
            self.assertEqual([t["text"] for t in card["audio_turns"]], list(pair))
            self.assertEqual(card["audio_text"], " ".join(pair))
            self.assertNotIn("reply_image_timing", card)
            self.assertNotEqual(*[t["image_url"] for t in card["audio_turns"]])
            self.assertNotEqual(*[t["speaker_role"] for t in card["audio_turns"]])
            correct = next(o for o in card["options"] if o["id"] == card["correct_option_id"])
            self.assertEqual(correct["label"], pair[1])

    def test_speaking_and_construction_finish_each_order_with_thanks(self):
        cafe = lesson("lesson-5-8-ordering-politely")
        expected = EXCHANGES[0] + EXCHANGES[1][1:] + EXCHANGES[2][1:]
        for stage in ("Speak", "Use"):
            cards = [c for c in cafe["cards"] if c["stage"] == stage]
            self.assertEqual([c["audio_text"] for c in cards], expected, stage)

    def test_acceptance_and_refusal_are_different_customers_in_every_stage(self):
        cards = by_id(lesson("lesson-5-can-i-have"))
        first_offer = "a1_u5_revision_shop_offer_bag_v1.webp"
        first_accept = "a1_u5_revision_shop_accept_bag_v1.webp"
        second_offer = "a1_u5_sequence_shop_offer_bag_second_customer_v1.webp"
        second_decline = "a1_u5_sequence_shop_decline_bag_second_customer_v1.webp"
        self.assertEqual(cards["L1"]["options"][0]["image_url"], first_offer)
        self.assertEqual(cards["L2"]["options"][0]["image_url"], first_accept)
        self.assertEqual(cards["L3"]["options"][0]["image_url"], second_offer)
        self.assertEqual(cards["L4"]["options"][0]["image_url"], second_decline)
        for sid, offer, response in (("R4", first_offer, first_accept), ("R10", second_offer, second_decline)):
            self.assertEqual(cards[sid]["prompt_image_url"], offer)
            self.assertEqual(cards[sid]["answer_audio_turns"][0]["image_url"], response)
            self.assertEqual(cards[sid]["reply_image_timing"], "after-prompt")
        self.assertEqual([t["image_url"] for t in cards["A4"]["audio_turns"]], [first_offer, first_accept])
        self.assertEqual([t["image_url"] for t in cards["A10"]["audio_turns"]], [second_offer, second_decline])
        self.assertEqual(cards["S9"]["options"][0]["image_url"], second_decline)
        self.assertEqual(cards["U9"]["prompt_image_url"], second_decline)

    def test_mission_service_gates_show_the_question_then_a_distinct_response(self):
        cards = by_id(lesson("lesson-5-10-cafe-mission"))
        for sid in ("M03", "M15", "M16", "M17", "M18"):
            card = cards[sid]
            self.assertEqual(card["mission_game"]["kind"], "voice-gate")
            self.assertNotEqual(card["audio_turns"][0]["image_url"], card["options"][0]["image_url"])
            self.assertEqual(card["audio_turns"][0]["text"], card["mission_game"]["cues"][0]["text"])

    def test_mission_meals_use_separate_chronological_scenes(self):
        mission = lesson("lesson-5-10-cafe-mission")
        cards = by_id(mission)
        order = [card["slide_id"] for card in mission["cards"]]
        meal_ids = ["M12", "M12L", "M12D"]
        first = order.index(meal_ids[0])
        self.assertEqual(order[first:first + 3], meal_ids)
        self.assertEqual(len({cards[sid]["prompt_image_url"] for sid in meal_ids}), 3)
        for sid, meal in zip(meal_ids, ("breakfast", "lunch", "dinner")):
            card = cards[sid]
            self.assertEqual(card["mission_chapter_id"], "comidas")
            cues = card["mission_game"]["cues"]
            self.assertEqual(len(cues), 4)
            self.assertTrue(all(f"for {meal}." in cue["text"] for cue in cues))
            self.assertEqual([turn["text"] for turn in card["audio_turns"]],
                             [cue["text"] for cue in cues])
            self.assertEqual([turn["speaker_role"] for turn in card["audio_turns"]],
                             ["female-character", "male-character"] * 2)
        breakfast = cards["M12"]["mission_game"]["cues"]
        self.assertEqual(breakfast[0]["text"], "I eat two eggs for breakfast.")
        self.assertEqual(breakfast[2]["text"], "I eat an egg for breakfast.")

    def test_mission_polite_acceptance_has_a_specific_offer(self):
        card = by_id(lesson("lesson-5-10-cafe-mission"))["M15"]
        self.assertEqual(card["mission_game"]["kind"], "voice-gate")
        self.assertEqual(card["mission_game"]["cue_audio_text"], "Do you want a bag?")
        self.assertEqual(card["mission_game"]["cues"][0]["answer_text"], "Yes, please.")
        self.assertEqual(card["audio_turns"][0]["speaker_role"], "male-character")
        self.assertEqual(card["answer_audio_speaker"], "female-character")
        self.assertIn("mission_bag_offer", card["audio_turns"][0]["image_url"])
        self.assertIn("mission_bag_accept", card["options"][0]["image_url"])

    def test_current_sequence_plans_compose_exactly(self):
        for number in ("5.9", "5.10", "5.11", "5.12"):
            plan = json.loads((ROOT / f"docs/product/content-plans/unit5-review-2026-10-08/{number}.plan.json").read_text(encoding="utf-8"))
            canonical = json.loads((ROOT / plan["source"]["path"]).read_text(encoding="utf-8"))
            self.assertEqual(compose_lesson(plan), canonical)


if __name__ == "__main__":
    unittest.main()
