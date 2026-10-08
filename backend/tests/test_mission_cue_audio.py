import unittest
from types import SimpleNamespace

from backend.app.card_audio_assets import bind_lesson_audio_assets
from backend.app.schemas import LessonCard, MissionLessonCard


def mission_card(*, speaker="male-character", cue="Do you want a bag?",
                 turn_text=None, extra_turn=False, stage="Speak", no_turns=False):
    turn_text = cue if turn_text is None else turn_text
    spoken_answer = "Yes, please." if stage == "Speak" else turn_text
    turns = [] if no_turns else [
        {"text": turn_text, "speaker_role": speaker, "image_url": "question.webp"}
    ]
    if extra_turn:
        turns.append({"text": "Yes, please.", "speaker_role": "female-character",
                      "image_url": "response.webp"})
    return MissionLessonCard.model_validate({
        "slide_id": "M1", "mission_chapter_id": "shop",
        "interaction_type": "mission-speak" if stage == "Speak" else "mission-game",
        "stage": stage, "prompt": spoken_answer, "audio_text": spoken_answer,
        "answer_audio_text": None, "audio_turns": turns,
        "correct_option_id": "response",
        "options": [{"id": "response", "label": spoken_answer, "image_url": "response.webp"}],
        "mission_game": {
            "kind": "voice-gate" if stage == "Speak" else "guided-search",
            "instruction_es": "Escucha.", "validation": "single", "cue_audio_text": cue,
            "targets": [{"id": "response", "label_es": "Respuesta",
                         "accepted_option_ids": ["response"],
                         "rect": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}}],
            "cues": [{"id": "cue-response", "text": cue, "answer_text": spoken_answer,
                      "target_id": "response", "option_id": "response"}],
        },
    })


def bind_card(card):
    lesson = SimpleNamespace(id="mission-test", content_revision=7, cards=[card])
    bind_lesson_audio_assets(lesson)
    return {asset.purpose: asset for asset in card.audio_assets}


class MissionCueAudioTests(unittest.TestCase):
    def test_single_matching_male_and_female_turn_owns_fallback_voice_and_contract(self):
        for role, cue in (("male-character", "Do you want a bag?"),
                          ("female-character", "Here you are.")):
            with self.subTest(role=role, cue=cue):
                assets = bind_card(mission_card(speaker=role, cue=cue))
                fallback, turn = assets["mission-cue"], assets["prompt-turn-1"]
                self.assertEqual(role, fallback.speaker_role)
                self.assertEqual(turn.text, fallback.text)
                self.assertEqual((turn.mode, turn.variant),
                                 (fallback.mode, fallback.variant))
                self.assertEqual(("pronunciation_slow", "split-ing"),
                                 (fallback.mode, fallback.variant))
                self.assertEqual(7, fallback.revision)
                self.assertNotEqual(turn.id, fallback.id)
                self.assertNotIn("answer", assets)

    def test_single_listening_turn_uses_its_existing_prompt_variant(self):
        for cue, variant in (("Do you want a bag?", "prompt"), ("What is it?", "question")):
            with self.subTest(cue=cue):
                assets = bind_card(mission_card(stage="Listen", cue=cue))
                fallback = assets["mission-cue"]
                self.assertEqual("male-character", fallback.speaker_role)
                self.assertEqual(("prompt", variant), (fallback.mode, fallback.variant))
                self.assertEqual(assets["prompt-turn-1"].variant, fallback.variant)

    def test_nonmatching_single_turn_keeps_legacy_neutral_fallback(self):
        assets = bind_card(mission_card(turn_text="Do you want milk?"))
        fallback = assets["mission-cue"]
        self.assertEqual("Do you want a bag?", fallback.text)
        self.assertEqual(("teacher", "prompt", "question"),
                         (fallback.speaker_role, fallback.mode, fallback.variant))
        self.assertEqual("male-character", assets["prompt-turn-1"].speaker_role)

    def test_multiple_turns_do_not_claim_fallback_even_when_first_text_matches(self):
        assets = bind_card(mission_card(extra_turn=True))
        fallback = assets["mission-cue"]
        self.assertEqual(fallback.text, assets["prompt-turn-1"].text)
        self.assertIn("prompt-turn-2", assets)
        self.assertEqual(("teacher", "prompt", "question"),
                         (fallback.speaker_role, fallback.mode, fallback.variant))

    def test_no_authored_turn_keeps_legacy_question_and_statement_fallbacks(self):
        for cue, variant in (("Do you want a bag?", "question"), ("Here you are.", "prompt")):
            with self.subTest(cue=cue):
                assets = bind_card(mission_card(no_turns=True, cue=cue))
                fallback = assets["mission-cue"]
                self.assertEqual(("teacher", "prompt", variant),
                                 (fallback.speaker_role, fallback.mode, fallback.variant))

    def test_standard_card_does_not_gain_a_mission_cue(self):
        card = LessonCard(prompt="Coffee.", stage="Learn", correct_option_id="coffee",
                          options=[{"id": "coffee", "label": "Coffee.", "image_url": "coffee.webp"}])
        self.assertNotIn("mission-cue", bind_card(card))


if __name__ == "__main__":
    unittest.main()
