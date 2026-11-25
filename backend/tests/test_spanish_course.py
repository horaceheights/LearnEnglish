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
        self.assertEqual({c["id"]: c.get("uiLanguage") for c in courses if c.get("uiLanguage")}, {"de-a1": "en", "es-a1": "en", "es-a1-plus": "en"})


class SpanishA1PlusTests(unittest.TestCase):
    """Spanish A1+ (es-a1-plus) follows English A1+ card by card, with English help (user, 2026-11-24)."""

    @classmethod
    def setUpClass(cls):
        from backend.app.data import COURSE_DESCRIPTORS, COURSE_LESSONS
        cls.course = next(c for c in COURSE_DESCRIPTORS if c["id"] == "es-a1-plus")
        cls.lessons = COURSE_LESSONS["es-a1-plus"]

    def card(self, number, slide_id):
        lesson = self.lessons[f"es-a1-plus-unit-1-lesson-1-{number}"]
        return next(card for card in lesson.cards if card.slide_id == slide_id)

    def test_unit_1_has_the_thirteen_a1_plus_lessons(self):
        ids = sorted(lesson.id for lesson in self.lessons.values() if lesson.unit_id == "es-a1-plus-unit-1")
        self.assertEqual(ids, sorted(f"es-a1-plus-unit-1-lesson-1-{n}" for n in range(1, 14)))
        mission = self.lessons["es-a1-plus-unit-1-lesson-1-13"]
        self.assertEqual(getattr(mission, "experience_type", None), "mission")
        self.assertEqual(len(mission.cards), 11)

    def test_cards_teach_mexican_spanish_with_english_help(self):
        self.assertEqual((self.course["speechLocale"], self.course["uiLanguage"]), ("es-MX", "en"))
        for lesson in self.lessons.values():
            for card in lesson.cards:
                self.assertEqual(card.target_language, "es", (lesson.id, card.slide_id))

    def test_english_short_answers_repeat_the_verb_of_the_question(self):
        # "Yes, she does." has no Spanish form: the answer repeats the question's verb phrase.
        self.assertEqual((self.card(9, "S2").audio_text, self.card(9, "S2").spanish_translation), ("Sí, ella toma té.", "Yes, she does."))
        self.assertEqual(self.card(9, "S3").audio_text, "No, él no toma té.")

    def test_his_her_its_distractors_are_lines_spanish_can_tell_apart(self):
        # Spanish "su" is his, her and its alike, so 1.10 A9 names other pets instead.
        self.assertEqual(sorted(o.label for o in self.card(10, "A9").options), ["Se llama Luna.", "Se llama Max.", "Se llama Rio."])

    def test_two_people_never_share_one_voice_in_a_dialogue(self):
        # 1.2 L4: Diego speaks, then the narrator; the narrator line moves to the other narrator.
        self.assertEqual([t.speaker_role for t in self.card(2, "L4").audio_turns], ["es-co-teacher", "es-teacher"])
