import json
import unittest

from pydantic import ValidationError

from backend.app.card_audio_assets import assets_for_card
from backend.app.schemas import ChoiceOption, CourseAudioTurn, LessonCard


def dialogue_card(**updates: object) -> LessonCard:
    values: dict[str, object] = {
        "prompt": "What is your name? My name is Ana.",
        "audio_text": "What is your name? My name is Ana.",
        "answer_audio_text": "What is your name? My name is Ana.",
        "stage": "Learn",
        "correct_option_id": "dialogue",
        "options": [
            ChoiceOption(
                id="dialogue",
                image_url="/lesson-assets/dialogue.webp",
                label="What is your name? My name is Ana.",
            )
        ],
    }
    values.update(updates)
    return LessonCard(**values)


class CourseAudioTurnAssetTests(unittest.TestCase):
    def test_ordered_prompt_turns_replace_aggregate_and_bind_exact_images(self):
        card = dialogue_card(audio_turns=[
            CourseAudioTurn(
                text="What is your name?",
                speaker_role="male-character",
                image_url="/lesson-assets/man-asks.webp",
            ),
            CourseAudioTurn(
                text="My name is Ana.",
                speaker_role="ana",
                image_url="/lesson-assets/ana-answers.webp",
            ),
        ])

        first = assets_for_card("lesson-dialogue", 4, card)
        second = assets_for_card("lesson-dialogue", 4, card)
        prompt_assets = [asset for asset in first if asset.purpose.startswith("prompt")]

        self.assertEqual(["prompt-turn-1", "prompt-turn-2"], [
            asset.purpose for asset in prompt_assets
        ])
        self.assertEqual(
            ["What is your name?", "My name is Ana."],
            [asset.text for asset in prompt_assets],
        )
        self.assertEqual(
            ["male-character", "ana"],
            [asset.speaker_role for asset in prompt_assets],
        )
        self.assertEqual(
            ["/lesson-assets/man-asks.webp", "/lesson-assets/ana-answers.webp"],
            [asset.image_ref for asset in prompt_assets],
        )
        self.assertEqual(["question", "teacher"], [
            asset.semantic_role for asset in prompt_assets
        ])
        self.assertNotIn("prompt", {asset.purpose for asset in first})
        self.assertNotIn("answer", {asset.purpose for asset in first})
        self.assertEqual(
            [asset.id for asset in first],
            [asset.id for asset in second],
        )
        self.assertEqual(len(first), len({asset.id for asset in first}))

    def test_one_turn_can_correct_the_prompt_image_binding(self):
        card = dialogue_card(
            prompt="Hello.",
            audio_text="Hello.",
            answer_audio_text="Hello.",
            audio_turns=[{
                "text": "Hello.",
                "speaker_role": "ana",
                "image_url": "/lesson-assets/ana-says-hello.webp",
            }],
        )

        prompt = next(
            asset for asset in assets_for_card("lesson-hello", 0, card)
            if asset.purpose == "prompt-turn-1"
        )

        self.assertEqual("/lesson-assets/ana-says-hello.webp", prompt.image_ref)
        self.assertEqual("ana", prompt.speaker_role)

    def test_prompt_turns_must_reconstruct_canonical_text_exactly(self):
        card = dialogue_card(audio_turns=[
            {
                "text": "What is your name?",
                "speaker_role": "male-character",
                "image_url": "/lesson-assets/man-asks.webp",
            },
            {
                "text": "I am Ana.",
                "speaker_role": "ana",
                "image_url": "/lesson-assets/ana-answers.webp",
            },
        ])

        with self.assertRaisesRegex(ValueError, "reconstruct the canonical audio text exactly"):
            assets_for_card("lesson-dialogue", 0, card)

    def test_turn_rejects_unsupported_speaker_role(self):
        with self.assertRaisesRegex(ValidationError, "Unsupported course audio speaker role"):
            CourseAudioTurn(
                text="Hello.",
                speaker_role="unknown-character",
                image_url="/lesson-assets/person.webp",
            )

    def test_whole_field_speaker_must_not_conflict_with_turn_speakers(self):
        cases = [
            dialogue_card(
                audio_speaker="ana",
                audio_turns=[{
                    "text": "What is your name? My name is Ana.",
                    "speaker_role": "male-character",
                    "image_url": "/lesson-assets/dialogue.webp",
                }],
            ),
            dialogue_card(
                answer_audio_speaker="ana",
                answer_audio_turns=[{
                    "text": "What is your name? My name is Ana.",
                    "speaker_role": "male-character",
                    "image_url": "/lesson-assets/dialogue.webp",
                }],
            ),
        ]

        for card in cases:
            with self.subTest(card=card), self.assertRaisesRegex(
                ValueError, "conflict with the whole-field speaker"
            ):
                assets_for_card("lesson-dialogue", 0, card)

    def test_speak_prompt_turns_preserve_pronunciation_contract(self):
        card = dialogue_card(
            stage="Speak",
            audio_turns=[{
                "text": "What is your name? My name is Ana.",
                "speaker_role": "ana",
                "image_url": "/lesson-assets/ana-speaks.webp",
            }],
        )

        prompt = next(
            asset for asset in assets_for_card("lesson-dialogue", 0, card)
            if asset.purpose == "prompt-turn-1"
        )

        self.assertEqual("pronunciation_slow", prompt.mode)
        self.assertEqual("split-ing", prompt.variant)

    def test_answer_turns_replace_aggregate_and_preserve_answer_contract(self):
        card = dialogue_card(answer_audio_turns=[
            {
                "text": "What is your name?",
                "speaker_role": "male-character",
                "image_url": "/lesson-assets/man-asks.webp",
            },
            {
                "text": "My name is Ana.",
                "speaker_role": "ana",
                "image_url": "/lesson-assets/ana-answers.webp",
            },
        ])

        answer_assets = [
            asset for asset in assets_for_card("lesson-dialogue", 0, card)
            if asset.purpose.startswith("answer")
        ]

        self.assertEqual(["answer-turn-1", "answer-turn-2"], [
            asset.purpose for asset in answer_assets
        ])
        self.assertTrue(all(asset.mode == "prompt" for asset in answer_assets))
        self.assertTrue(all(asset.variant == "answer" for asset in answer_assets))
        self.assertTrue(all(asset.semantic_role == "answer" for asset in answer_assets))
        self.assertNotIn("answer", {asset.purpose for asset in answer_assets})

    def test_distinct_answer_text_still_requires_its_own_turn_contract(self):
        card = dialogue_card(
            answer_audio_text="Yes, my name is Ana.",
            audio_turns=[
                {
                    "text": "What is your name?",
                    "speaker_role": "male-character",
                    "image_url": "/lesson-assets/man-asks.webp",
                },
                {
                    "text": "My name is Ana.",
                    "speaker_role": "ana",
                    "image_url": "/lesson-assets/ana-answers.webp",
                },
            ],
        )

        assets = assets_for_card("lesson-dialogue", 0, card)

        self.assertIn("answer", {asset.purpose for asset in assets})

    def test_turn_text_and_image_must_be_exact_nonempty_values(self):
        invalid_values = [
            {"text": " ", "speaker_role": "ana", "image_url": "/image.webp"},
            {"text": "Hello. ", "speaker_role": "ana", "image_url": "/image.webp"},
            {"text": "Hello.", "speaker_role": "ana", "image_url": ""},
            {"text": "Hello.", "speaker_role": "ana", "image_url": " /image.webp"},
        ]

        for values in invalid_values:
            with self.subTest(values=values), self.assertRaises(ValidationError):
                CourseAudioTurn(**values)

    def test_ordinary_card_asset_ids_and_json_contracts_are_unchanged(self):
        card = LessonCard(
            prompt="Hello.",
            audio_text="Hello.",
            stage="Learn",
            correct_option_id="speaker",
            options=[ChoiceOption(
                id="speaker",
                image_url="/lesson-assets/boy.webp",
                label="Hello.",
            )],
            audio_speaker="ana",
        )

        actual = [asset.model_dump() for asset in assets_for_card("lesson-test", 0, card)]
        expected_json = """[
          {
            "id": "lesson-test-c001-prompt-6c1c23a7d9c2801b9e9d",
            "purpose": "prompt",
            "text": "Hello.",
            "mode": "prompt",
            "variant": "prompt",
            "image_ref": "/lesson-assets/boy.webp",
            "semantic_role": "teacher",
            "speaker_role": "ana",
            "profile_id": "a1-elevenlabs-character-cast-v1",
            "revision": 1
          },
          {
            "id": "lesson-test-c001-answer-7cdafad69f97aacd882c",
            "purpose": "answer",
            "text": "Hello.",
            "mode": "prompt",
            "variant": "answer",
            "image_ref": "/lesson-assets/boy.webp",
            "semantic_role": "answer",
            "speaker_role": "ana",
            "profile_id": "a1-elevenlabs-character-cast-v1",
            "revision": 1
          }
        ]"""

        self.assertEqual(json.loads(expected_json), actual)


if __name__ == "__main__":
    unittest.main()
