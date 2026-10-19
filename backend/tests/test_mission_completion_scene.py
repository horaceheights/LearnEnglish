"""Non-assessed outcomes stay distinct from answer-bearing mission scenes."""
import unittest
from pydantic import ValidationError
from backend.app.schemas import MissionGame, MissionCompletionScene
from scripts.a1_media_runtime_contracts import card_media_usages, validate_review_context


class MissionCompletionSceneTests(unittest.TestCase):
    def game(self, **changes):
        data = {"kind": "guided-search", "instruction_es": "Escucha y toca.", "validation": "single",
                "targets": [{"id": "a", "label_es": "Persona", "accepted_option_ids": ["a"],
                             "rect": {"x": .1, "y": .1, "width": .8, "height": .8}}],
                "cues": [{"id": "cue", "text": "Hello.", "answer_text": "Hello.",
                          "target_id": "a", "option_id": "a"}]}
        return MissionGame(**(data | changes))

    def test_legacy_game_serialization_omits_optional_scene(self):
        self.assertNotIn("completion_scene", self.game().model_dump(mode="json"))

    def test_scene_is_exact_and_cannot_be_added_to_a_voice_gate(self):
        scene = {"image_url": "/lesson-assets/arrival.webp", "context_es": "Ana llega al parque."}
        self.assertEqual(self.game(completion_scene=scene).completion_scene.context_es, scene["context_es"])
        with self.assertRaises(ValidationError):
            self.game(kind="voice-gate", completion_scene=scene)
        for value in ("", " ", " Ana llega.", "a" * 241):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                MissionCompletionScene(image_url=scene["image_url"], context_es=value)

    def test_transition_media_binds_caption_without_answers(self):
        card = {"slide_id": "M1", "stage": "Listen", "interaction_type": "mission-game",
                "prompt": "Hello.", "prompt_image_url": "/lesson-assets/hello.webp",
                "audio_text": "Hello.", "correct_option_id": "a",
                "context_es": "Ana saluda a un amigo.",
                "options": [{"id": "a", "label": "Hello.", "image_url": ""}],
                "mission_game": self.game(completion_scene={"image_url": "/lesson-assets/arrival.webp",
                                                           "context_es": "Ana llega al parque."}).model_dump(mode="json")}
        usages = card_media_usages({"id": "test", "sub_lesson_id": "7.10"}, card)
        context = next(x["context"] for x in usages if x["context"]["media_role"] == "completion_scene")
        self.assertEqual(context["prompt"], "Ana llega al parque.")
        self.assertEqual(context["options"], [])
        self.assertIsNone(context["audio_text"])
        self.assertIsNone(context["correct_option_id"])
        validate_review_context(context)
        with self.assertRaises(ValueError):
            validate_review_context(context | {"correct_option_id": "a"})
        with self.assertRaises(ValueError):
            validate_review_context(context | {"audio_text": "Hello."})


if __name__ == "__main__":
    unittest.main()
