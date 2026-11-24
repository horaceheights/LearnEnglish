import json
from pathlib import Path
import unittest

from backend.app.azure_pronunciation import COURSE_SPEECH_LOCALES
from backend.app.pronunciation_scoring import _speech_words
from backend.app.schemas import LessonCard

ROOT = Path(__file__).resolve().parents[2]


class CourseLanguageTests(unittest.TestCase):
    """Course app language and the Spanish course engine (approved 2026-11-19)."""

    def test_spanish_speech_scoring_is_allow_listed(self):
        self.assertIn("es-MX", COURSE_SPEECH_LOCALES)

    def test_spanish_words_with_accents_stay_whole(self):
        self.assertEqual(_speech_words("¿El niño está comiendo? ¡Sí!"), ["el", "niño", "está", "comiendo", "sí"])

    def test_spanish_cards_are_accepted(self):
        field = LessonCard.model_fields["target_language"]
        self.assertIn("es", str(field.annotation))

    def test_spanish_voices_are_the_auditioned_mexican_voices(self):
        from backend.app.course_audio_profile import NARRATION_SPEAKER_ROLES, NARRATOR_VOICE_IDS, narrator_for_speaker
        voices = {role: NARRATOR_VOICE_IDS[narrator_for_speaker(role)] for role in ("es-teacher", "es-co-teacher", "es-character")}
        self.assertEqual(voices, {"es-teacher": "pmruOMcxgUotq2bYO5Ne", "es-co-teacher": "iDEmt5MnqUotdwCIVplo",
                                  "es-character": "m7yTemJqdIqrcNleANfX"})
        # Ana María (2026-11-23) voices a pictured woman talking with another woman; she never narrates.
        self.assertNotIn("es-character", NARRATION_SPEAKER_ROLES)

    def test_only_courses_for_english_speakers_run_in_english(self):
        courses = json.loads((ROOT / "backend/courses.json").read_text(encoding="utf-8"))
        self.assertEqual({c["id"]: c.get("uiLanguage") for c in courses if c.get("uiLanguage")}, {"de-a1": "en", "es-a1": "en"})
