import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import unittest
from types import SimpleNamespace
from pydantic import ValidationError

from app.card_audio_assets import assets_for_card
from app.course_audio_profile import matches_delivery_request
from app.schemas import ChoiceOption, CourseAudioTurn, LessonCard, TeachingClock


class DeliveryIntegrationTests(unittest.TestCase):
    def test_time_choices_require_distinct_visible_clocks(self):
        from scripts.validate_lesson_cards import validate_duplicate_option_images
        options = [ChoiceOption(id=str(hour), image_url="/lesson-assets/example.webp",
                   clock_cues=[TeachingClock(hour=hour, minute=0)]) for hour in (7, 8)]
        lesson = SimpleNamespace(id="clock-choice", cards=[SimpleNamespace(prompt="What time?", options=options)])
        self.assertEqual(validate_duplicate_option_images([lesson]), [])
        options[1].clock_cues = options[0].clock_cues
        self.assertIn("duplicate option image", " ".join(validate_duplicate_option_images([lesson])))

    def test_cast_contract_detects_role_changes_and_turn_reordering(self):
        from copy import deepcopy
        from scripts.validate_course_audio_cast import cast_contract
        lesson = {"id": "sample", "cards": [{"slide_id": "L1", "audio_speaker": "ana",
                  "audio_turns": [{"speaker_role": "luis", "text": "At seven."},
                                  {"speaker_role": "luis", "text": "At eight."}]}]}
        expected = cast_contract([lesson])
        changed = deepcopy(lesson)
        changed["cards"][0]["audio_speaker"] = "luis"
        self.assertNotEqual(expected, cast_contract([changed]))
        changed = deepcopy(lesson)
        changed["cards"][0]["audio_turns"].reverse()
        self.assertNotEqual(expected, cast_contract([changed]))

    def test_unconfigured_cards_keep_their_serialized_contract(self):
        option = ChoiceOption(id="a", image_url="/lesson-assets/example.webp", label="A book.")
        turn = CourseAudioTurn(text="A book.", speaker_role="teacher", image_url=option.image_url)
        self.assertEqual(option.model_dump(), {"id": "a", "image_url": option.image_url, "label": "A book."})
        self.assertEqual(turn.model_dump(), {"text": "A book.", "speaker_role": "teacher", "image_url": option.image_url})

    def test_clock_rejects_inferred_or_invalid_times(self):
        for hour, minute in [(0, 0), (13, 0), (8, 60), (8, -1), (True, 0), (8.0, 0)]:
            with self.subTest(hour=hour, minute=minute), self.assertRaises(ValidationError):
                TeachingClock(hour=hour, minute=minute)

    def test_authored_only_policy_does_not_buy_an_unused_answer(self):
        card = LessonCard(slide_id="choice", stage="Listen", prompt="Listen and choose.",
                          interaction_type="a2t", audio_text="I arrive home at six.",
                          options=[ChoiceOption(id="a", label="Let's meet at seven.")], correct_option_id="a")
        old = assets_for_card("sample", 0, card)
        self.assertEqual({asset.purpose for asset in old}, {"prompt", "answer"})
        card.answer_audio_policy = "authored-only"
        new = assets_for_card("sample", 0, card)
        self.assertEqual([asset.purpose for asset in new], ["prompt"])
        self.assertEqual(new[0], old[0])

    def test_prepared_delivery_keeps_exact_words_and_native_emphasis(self):
        self.assertTrue(matches_delivery_request("But she starts at nine.", "a1-pronunciation-v1",
                        "[speaking very slowly and clearly] [pause] BUT she starts at NINE."))
        self.assertTrue(matches_delivery_request("OK.", "a1-pronunciation-v1", "[speaking slowly and clearly] OK."))
        for bad in ("[speaking very slowly and clearly] But she starts at eight.",
                    "[speaking very slowly and clearly] [laughing] But she starts at nine.",
                    "[speaking very slowly and clearly] Slowly. But she starts at nine."):
            self.assertFalse(matches_delivery_request("But she starts at nine.", "a1-pronunciation-v1", bad))

    def test_success_reply_is_not_allowed_before_a_choice(self):
        with self.assertRaisesRegex(ValidationError, "success reply"):
            LessonCard(slide_id="choice", stage="Listen", prompt="Listen and choose.",
                       options=[ChoiceOption(id="a", label="At seven.")], correct_option_id="a",
                       success_audio_turns=[CourseAudioTurn(text="OK.", speaker_role="ana", image_url="/lesson-assets/a.webp")])
