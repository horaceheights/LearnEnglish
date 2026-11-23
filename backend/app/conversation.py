from __future__ import annotations

import base64
import io
import logging
import os
from pathlib import Path
from typing import Any, Optional
import wave

from google import genai
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Predefined Unit Scenarios
UNIT_1_OBJECTIVES = [
    {
        "id": "greeting",
        "title": "Greet & Introduce",
        "description": "Greet Liam and introduce yourself (e.g. 'Hello, I am Alex' or 'My name is Alex').",
    },
    {
        "id": "identify_person",
        "title": "Identify Family Member",
        "description": "Ask about or identify someone in the family (e.g. 'Who is he?' or 'She is the mother').",
    },
    {
        "id": "describe_action",
        "title": "Describe an Action",
        "description": "Describe what someone at the party is doing (e.g. 'The father is cooking' or 'The children are playing').",
    },
]

UNIT_1_SYSTEM_INSTRUCTION = """You are Liam, a warm, friendly, and enthusiastic 24-year-old hosting your family's reunion celebration party. You are conversing in English with an A1 beginner language learner who is practicing what they learned in Unit 1 (People and Family).

PEDAGOGICAL & DIALOGUE RULES:
1. STRICT A1 LEVEL: Keep your English responses strictly simple, natural, and accessible to an absolute beginner. Use simple present tense ('I am', 'She is', 'They are') and present continuous ('is cooking', 'are playing').
2. CONCISE: Keep your response to 1 or 2 short, punchy sentences. Never overwhelm the beginner with long paragraphs.
3. PERSONALITY: Be warm, welcoming, and genuinely interested in talking to the learner.
4. GUIDED OBJECTIVES: Proactively guide the conversation so the learner has opportunities to achieve these 3 communicative goals:
   - 'greeting': Greet each other and exchange names.
   - 'identify_person': Ask who someone is, or name family members (mother, father, brother, sister, grandfather, grandmother, babies, children).
   - 'describe_action': Talk about actions happening at the party (eating, drinking, reading, writing, cooking, playing, studying, talking, working).
5. COMMUNICATIVE LENIENCY:
   - Award an objective if the communicative intent is recognizable and understandable, even if the learner makes minor A1 grammar or spelling errors (e.g. 'I Alex', 'The children is playing', 'She mother').
   - Do NOT penalize or block objectives over minor errors.
6. OBJECTIVE TRACKING:
   - In `completed_objectives`, list all objectives the learner has accomplished so far.
   - CRITICAL PERSISTENCE: Any objective achieved in a previous turn MUST remain in `completed_objectives`. Never remove an already completed objective.
   - Set `is_milestone_complete` to true if and only if all 3 objectives ('greeting', 'identify_person', 'describe_action') are present in `completed_objectives`.
7. SPANISH SCAFFOLDING: In `spanish_hint`, provide a natural Spanish translation of your English reply so the learner can check their comprehension if needed.
8. GENTLE COACHING: In `feedback_coaching`, provide brief, encouraging feedback in Spanish if the learner made a small grammar/vocabulary error (e.g., gently modeling 'They are' instead of 'They is'), or give a warm compliment when they speak well. If nothing needs correction, provide a short encouraging note or leave as a brief cheer.
9. CELEBRATION & WRAP-UP: When all 3 objectives are accomplished (`is_milestone_complete` is true), congratulate the learner enthusiastically in Liam's character reply (e.g., 'You did great! Welcome to the family celebration! Let's get some food together!').
"""


class ObjectiveStatus(BaseModel):
    id: str
    title: str
    description: str
    is_completed: bool


class ConversationTurnOutput(BaseModel):
    character_reply: str = Field(
        description="Liam's spoken response in simple, natural A1 English (1-2 sentences)."
    )
    spanish_hint: str = Field(
        description="Spanish translation / comprehension hint for Liam's response."
    )
    completed_objectives: list[str] = Field(
        default_factory=list,
        description="List of all objective IDs achieved so far ('greeting', 'identify_person', 'describe_action').",
    )
    feedback_coaching: Optional[str] = Field(
        default=None,
        description="Brief encouraging feedback or gentle correction in Spanish.",
    )
    is_milestone_complete: bool = Field(
        default=False,
        description="True if all 3 objectives have been successfully achieved.",
    )


class ConversationStartRequest(BaseModel):
    scenario_id: str = "unit-1-celebration"
    include_audio: bool = True


class ConversationTurnRequest(BaseModel):
    interaction_id: str
    learner_text: str
    scenario_id: str = "unit-1-celebration"
    include_audio: bool = True


class ConversationTurnResponse(BaseModel):
    interaction_id: str
    scenario_id: str
    character_name: str = "Liam"
    character_reply: str
    spanish_hint: str
    completed_objectives: list[str]
    objectives: list[ObjectiveStatus]
    feedback_coaching: Optional[str] = None
    is_milestone_complete: bool = False
    audio_base64: Optional[str] = None
    audio_mime_type: Optional[str] = None


def get_gemini_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key.strip().strip("\"'")

    # Check local backend/.env
    env_file = Path(__file__).resolve().parents[1] / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            name, sep, val = line.partition("=")
            if sep and name.strip() in {"GEMINI_API_KEY", "GOOGLE_API_KEY"}:
                return val.strip().strip("\"'")

    return ""


class ConversationService:
    def __init__(self, client: Optional[genai.Client] = None, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or get_gemini_api_key()
        self.client = client or (genai.Client(api_key=self.api_key) if self.api_key else None)
        self.text_model = "gemini-3.6-flash"
        self.tts_model = "gemini-3.1-flash-tts-preview"
        self.character_voice = "Puck"

    def _build_objective_statuses(self, completed_ids: list[str]) -> list[ObjectiveStatus]:
        completed_set = set(completed_ids)
        return [
            ObjectiveStatus(
                id=obj["id"],
                title=obj["title"],
                description=obj["description"],
                is_completed=obj["id"] in completed_set,
            )
            for obj in UNIT_1_OBJECTIVES
        ]

    @staticmethod
    def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)
        return buffer.getvalue()

    def _synthesize_voice(self, text: str) -> tuple[Optional[str], Optional[str]]:
        """Synthesize character speech using gemini-3.1-flash-tts-preview."""
        if not self.client:
            return None, None

        try:
            tts_interaction = self.client.interactions.create(
                model=self.tts_model,
                input=f"Say cheerfully as Liam: {text}",
                response_format={"type": "audio"},
                generation_config={
                    "speech_config": [
                        {"voice": self.character_voice}
                    ]
                },
            )
            output_audio = getattr(tts_interaction, "output_audio", None)
            if output_audio and getattr(output_audio, "data", None):
                raw_data = output_audio.data
                if isinstance(raw_data, str):
                    raw_bytes = base64.b64decode(raw_data)
                elif isinstance(raw_data, bytes):
                    raw_bytes = raw_data
                else:
                    raw_bytes = bytes(raw_data)

                mime = getattr(output_audio, "mime_type", "") or ""
                # If raw L16 PCM or missing RIFF header, wrap with standard WAV header
                if "l16" in mime.lower() or "pcm" in mime.lower() or not raw_bytes.startswith(b"RIFF"):
                    rate = 24000
                    if "rate=" in mime:
                        try:
                            rate = int(mime.split("rate=")[1].split(";")[0].strip())
                        except Exception:
                            rate = 24000
                    raw_bytes = self._pcm_to_wav(raw_bytes, sample_rate=rate, channels=1)
                    mime = "audio/wav"

                b64_str = base64.b64encode(raw_bytes).decode("ascii")
                return b64_str, mime
        except Exception as error:
            logger.warning(f"Failed to synthesize voice for turn: {error}")

        return None, None

    def start_conversation(
        self, scenario_id: str = "unit-1-celebration", include_audio: bool = True
    ) -> ConversationTurnResponse:
        """Begin a new conversational milestone interaction with Liam."""
        if not self.client:
            raise RuntimeError("Gemini API client is not configured. Missing GEMINI_API_KEY.")

        initial_prompt = (
            f"{UNIT_1_SYSTEM_INSTRUCTION}\n\n"
            "[Context: The celebration party is starting. The learner has just arrived at the garden entrance. "
            "Greet them warmly, welcome them to the party, introduce yourself as Liam, and ask for their name.]"
        )

        interaction = self.client.interactions.create(
            model=self.text_model,
            input=initial_prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": ConversationTurnOutput.model_json_schema(),
            },
        )

        raw_output = interaction.output_text or "{}"
        try:
            parsed = ConversationTurnOutput.model_validate_json(raw_output)
        except Exception as err:
            logger.error(f"Failed to parse structured output from Gemini: {err}\nRaw: {raw_output}")
            parsed = ConversationTurnOutput(
                character_reply="Hello! Welcome to the family celebration! I am Liam. What is your name?",
                spanish_hint="¡Hola! ¡Bienvenido a la celebración familiar! Soy Liam. ¿Cómo te llamas?",
                completed_objectives=[],
                feedback_coaching="¡Bienvenido a la conversación! Intenta saludar a Liam y decirle tu nombre.",
                is_milestone_complete=False,
            )

        audio_b64, audio_mime = (
            self._synthesize_voice(parsed.character_reply) if include_audio else (None, None)
        )
        is_complete = (
            parsed.is_milestone_complete
            or {"greeting", "identify_person", "describe_action"}.issubset(set(parsed.completed_objectives))
        )

        return ConversationTurnResponse(
            interaction_id=interaction.id,
            scenario_id=scenario_id,
            character_name="Liam",
            character_reply=parsed.character_reply,
            spanish_hint=parsed.spanish_hint,
            completed_objectives=parsed.completed_objectives,
            objectives=self._build_objective_statuses(parsed.completed_objectives),
            feedback_coaching=parsed.feedback_coaching,
            is_milestone_complete=is_complete,
            audio_base64=audio_b64,
            audio_mime_type=audio_mime,
        )

    def send_turn(
        self,
        interaction_id: str,
        learner_text: str,
        scenario_id: str = "unit-1-celebration",
        include_audio: bool = True,
    ) -> ConversationTurnResponse:
        """Process a conversational turn and advance milestone objectives."""
        if not self.client:
            raise RuntimeError("Gemini API client is not configured. Missing GEMINI_API_KEY.")

        turn_prompt = (
            f"The learner says: {learner_text.strip()}\n\n"
            "Respond naturally as Liam at an A1 beginner level. Update completed_objectives with any objectives "
            "achieved so far. Remember: never remove previously achieved objectives."
        )

        interaction = self.client.interactions.create(
            model=self.text_model,
            previous_interaction_id=interaction_id,
            input=turn_prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": ConversationTurnOutput.model_json_schema(),
            },
        )

        raw_output = interaction.output_text or "{}"
        try:
            parsed = ConversationTurnOutput.model_validate_json(raw_output)
        except Exception as err:
            logger.error(f"Failed to parse structured output from Gemini: {err}\nRaw: {raw_output}")
            parsed = ConversationTurnOutput(
                character_reply="That's great! Who is that next to the table?",
                spanish_hint="¡Qué bien! ¿Quién es esa persona al lado de la mesa?",
                completed_objectives=[],
                feedback_coaching=None,
                is_milestone_complete=False,
            )

        audio_b64, audio_mime = (
            self._synthesize_voice(parsed.character_reply) if include_audio else (None, None)
        )
        is_complete = (
            parsed.is_milestone_complete
            or {"greeting", "identify_person", "describe_action"}.issubset(set(parsed.completed_objectives))
        )

        return ConversationTurnResponse(
            interaction_id=interaction.id,
            scenario_id=scenario_id,
            character_name="Liam",
            character_reply=parsed.character_reply,
            spanish_hint=parsed.spanish_hint,
            completed_objectives=parsed.completed_objectives,
            objectives=self._build_objective_statuses(parsed.completed_objectives),
            feedback_coaching=parsed.feedback_coaching,
            is_milestone_complete=is_complete,
            audio_base64=audio_b64,
            audio_mime_type=audio_mime,
        )


# Singleton service instance for FastAPI routes
_service: Optional[ConversationService] = None


def get_conversation_service() -> ConversationService:
    global _service
    if _service is None:
        _service = ConversationService()
    return _service
