from __future__ import annotations

import json
import unittest
from unittest.mock import MagicMock, patch

from starlette.testclient import TestClient

from backend.app.conversation import (
    UNIT_1_OBJECTIVES,
    ConversationService,
    ConversationStartRequest,
    ConversationTurnOutput,
    ConversationTurnRequest,
    ConversationTurnResponse,
    get_conversation_service,
)
from backend.app.main import app


class MockInteraction:
    def __init__(self, interaction_id: str, output_text: str | None = None, output_audio: Any = None):
        self.id = interaction_id
        self.output_text = output_text
        self.output_audio = output_audio


class MockAudioOutput:
    def __init__(self, data: bytes | str, mime_type: str = "audio/wav"):
        self.data = data
        self.mime_type = mime_type


class ConversationServiceTests(unittest.TestCase):
    def setUp(self):
        self.mock_client = MagicMock()
        self.service = ConversationService(client=self.mock_client, api_key="test-key")

    def test_start_conversation_success(self):
        output_payload = ConversationTurnOutput(
            character_reply="Hello! Welcome to the celebration! I am Liam. What is your name?",
            spanish_hint="¡Hola! ¡Bienvenido a la fiesta! Soy Liam. ¿Cómo te llamas?",
            completed_objectives=[],
            feedback_coaching="Saluda a Liam y preséntate.",
            is_milestone_complete=False,
        )
        mock_text_interaction = MockInteraction(
            interaction_id="int-100",
            output_text=output_payload.model_dump_json(),
        )
        mock_audio_interaction = MockInteraction(
            interaction_id="tts-100",
            output_audio=MockAudioOutput(data=b"RIFF_TEST_WAV", mime_type="audio/wav"),
        )
        self.mock_client.interactions.create.side_effect = [
            mock_text_interaction,
            mock_audio_interaction,
        ]

        response = self.service.start_conversation(scenario_id="unit-1-celebration", include_audio=True)

        self.assertEqual(response.interaction_id, "int-100")
        self.assertEqual(response.character_name, "Liam")
        self.assertEqual(response.character_reply, output_payload.character_reply)
        self.assertEqual(response.spanish_hint, output_payload.spanish_hint)
        self.assertEqual(len(response.objectives), 3)
        self.assertFalse(any(obj.is_completed for obj in response.objectives))
        self.assertFalse(response.is_milestone_complete)
        self.assertIsNotNone(response.audio_base64)
        self.assertEqual(response.audio_mime_type, "audio/wav")

    def test_start_conversation_without_audio(self):
        output_payload = ConversationTurnOutput(
            character_reply="Hello! I am Liam.",
            spanish_hint="¡Hola! Soy Liam.",
            completed_objectives=[],
            feedback_coaching=None,
            is_milestone_complete=False,
        )
        mock_text_interaction = MockInteraction(
            interaction_id="int-101",
            output_text=output_payload.model_dump_json(),
        )
        self.mock_client.interactions.create.return_value = mock_text_interaction

        response = self.service.start_conversation(include_audio=False)

        self.assertEqual(response.interaction_id, "int-101")
        self.assertIsNone(response.audio_base64)
        self.assertIsNone(response.audio_mime_type)
        # Should only call interactions.create once for text, never for TTS
        self.assertEqual(self.mock_client.interactions.create.call_count, 1)

    def test_send_turn_preserves_interaction_id_and_tracks_objectives(self):
        output_payload = ConversationTurnOutput(
            character_reply="Nice to meet you, Alex! That is my father by the grill.",
            spanish_hint="¡Gusto en conocerte, Alex! Ese es mi padre junto a la parrilla.",
            completed_objectives=["greeting"],
            feedback_coaching="¡Excelente presentación!",
            is_milestone_complete=False,
        )
        mock_text_interaction = MockInteraction(
            interaction_id="int-102",
            output_text=output_payload.model_dump_json(),
        )
        self.mock_client.interactions.create.return_value = mock_text_interaction

        response = self.service.send_turn(
            interaction_id="int-100",
            learner_text="Hello Liam, my name is Alex!",
            include_audio=False,
        )

        call_kwargs = self.mock_client.interactions.create.call_args[1]
        self.assertEqual(call_kwargs.get("previous_interaction_id"), "int-100")
        self.assertEqual(response.interaction_id, "int-102")
        self.assertIn("greeting", response.completed_objectives)

        greeting_obj = next(obj for obj in response.objectives if obj.id == "greeting")
        self.assertTrue(greeting_obj.is_completed)
        self.assertFalse(response.is_milestone_complete)

    def test_milestone_completion_when_all_objectives_achieved(self):
        output_payload = ConversationTurnOutput(
            character_reply="Fantastic! You did great, welcome to the family!",
            spanish_hint="¡Fantástico! ¡Hiciste un gran trabajo!",
            completed_objectives=["greeting", "identify_person", "describe_action"],
            feedback_coaching="¡Reto completado!",
            is_milestone_complete=True,
        )
        mock_text_interaction = MockInteraction(
            interaction_id="int-103",
            output_text=output_payload.model_dump_json(),
        )
        self.mock_client.interactions.create.return_value = mock_text_interaction

        response = self.service.send_turn(
            interaction_id="int-102",
            learner_text="The father is cooking and the children are playing!",
            include_audio=False,
        )

        self.assertTrue(response.is_milestone_complete)
        self.assertTrue(all(obj.is_completed for obj in response.objectives))

    def test_defensive_completion_if_gemini_omits_boolean_flag(self):
        # Gemini returned all 3 completed_objectives, but forgot is_milestone_complete=True
        output_payload = ConversationTurnOutput(
            character_reply="Great job!",
            spanish_hint="¡Buen trabajo!",
            completed_objectives=["greeting", "identify_person", "describe_action"],
            feedback_coaching=None,
            is_milestone_complete=False,
        )
        mock_text_interaction = MockInteraction(
            interaction_id="int-104",
            output_text=output_payload.model_dump_json(),
        )
        self.mock_client.interactions.create.return_value = mock_text_interaction

        response = self.service.send_turn(
            interaction_id="int-103",
            learner_text="He is eating.",
            include_audio=False,
        )

        # Defensive logic must override and mark it complete
        self.assertTrue(response.is_milestone_complete)

    def test_malformed_json_fallback(self):
        mock_text_interaction = MockInteraction(
            interaction_id="int-err",
            output_text="Not valid json from model",
        )
        self.mock_client.interactions.create.return_value = mock_text_interaction

        response = self.service.send_turn(
            interaction_id="int-100",
            learner_text="Hello",
            include_audio=False,
        )

        self.assertEqual(response.interaction_id, "int-err")
        self.assertTrue(len(response.character_reply) > 0)
        self.assertFalse(response.is_milestone_complete)

    def test_tts_error_handled_gracefully(self):
        output_payload = ConversationTurnOutput(
            character_reply="Hello!",
            spanish_hint="¡Hola!",
            completed_objectives=[],
            is_milestone_complete=False,
        )
        mock_text_interaction = MockInteraction(
            interaction_id="int-105",
            output_text=output_payload.model_dump_json(),
        )
        # First call succeeds for text, second call raises exception for TTS
        self.mock_client.interactions.create.side_effect = [
            mock_text_interaction,
            RuntimeError("TTS quota exceeded or timeout"),
        ]

        response = self.service.start_conversation(include_audio=True)

        self.assertEqual(response.interaction_id, "int-105")
        self.assertIsNone(response.audio_base64)


class ConversationFastApiEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("backend.app.main.get_conversation_service")
    def test_api_conversation_start_endpoint(self, mock_get_service):
        mock_service = MagicMock()
        mock_get_service.return_value = mock_service
        mock_service.start_conversation.return_value = ConversationTurnResponse(
            interaction_id="int-api-1",
            scenario_id="unit-1-celebration",
            character_name="Liam",
            character_reply="Hello! I am Liam.",
            spanish_hint="¡Hola! Soy Liam.",
            completed_objectives=[],
            objectives=[
                {"id": obj["id"], "title": obj["title"], "description": obj["description"], "is_completed": False}
                for obj in UNIT_1_OBJECTIVES
            ],
            feedback_coaching=None,
            is_milestone_complete=False,
            audio_base64="dGVzdA==",
            audio_mime_type="audio/wav",
        )

        response = self.client.post(
            "/api/conversation/start",
            json={"scenario_id": "unit-1-celebration", "include_audio": True},
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["interaction_id"], "int-api-1")
        self.assertEqual(data["character_name"], "Liam")
        mock_service.start_conversation.assert_called_once_with(
            scenario_id="unit-1-celebration",
            include_audio=True,
        )

    @patch("backend.app.main.get_conversation_service")
    def test_api_conversation_turn_endpoint(self, mock_get_service):
        mock_service = MagicMock()
        mock_get_service.return_value = mock_service
        mock_service.send_turn.return_value = ConversationTurnResponse(
            interaction_id="int-api-2",
            scenario_id="unit-1-celebration",
            character_name="Liam",
            character_reply="Nice to meet you!",
            spanish_hint="¡Mucho gusto!",
            completed_objectives=["greeting"],
            objectives=[
                {"id": obj["id"], "title": obj["title"], "description": obj["description"], "is_completed": (obj["id"] == "greeting")}
                for obj in UNIT_1_OBJECTIVES
            ],
            feedback_coaching="¡Bien!",
            is_milestone_complete=False,
            audio_base64=None,
            audio_mime_type=None,
        )

        response = self.client.post(
            "/api/conversation/turn",
            json={
                "interaction_id": "int-api-1",
                "learner_text": "Hello Liam, my name is Alex!",
                "scenario_id": "unit-1-celebration",
                "include_audio": False,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["interaction_id"], "int-api-2")
        self.assertIn("greeting", data["completed_objectives"])
        mock_service.send_turn.assert_called_once_with(
            interaction_id="int-api-1",
            learner_text="Hello Liam, my name is Alex!",
            scenario_id="unit-1-celebration",
            include_audio=False,
        )

    def test_get_conversation_web_page(self):
        response = self.client.get("/conversation")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Liam", response.text)
        self.assertIn("webkitSpeechRecognition", response.text)


if __name__ == "__main__":
    unittest.main()
