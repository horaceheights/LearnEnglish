import json
from pathlib import Path
import unittest

from backend.app.azure_pronunciation import COURSE_SPEECH_LOCALES
from backend.app.course_audio_profile import NARRATION_SPEAKER_ROLES, NARRATOR_VOICE_IDS, narrator_for_speaker
from backend.app.data import COURSE_LESSONS
from backend.app.pronunciation_scoring import _speech_words

ROOT = Path(__file__).resolve().parents[2]


class GermanCourseTests(unittest.TestCase):
    """German pilot course contract (approved 2026-11-18)."""

    def descriptor(self):
        courses = json.loads((ROOT / "backend/courses.json").read_text(encoding="utf-8"))
        return next(course for course in courses if course["id"] == "de-a1")

    def test_umlaut_words_stay_whole_and_english_is_unchanged(self):
        self.assertEqual(_speech_words("Das Mädchen liest. Großeltern"), ["das", "mädchen", "liest", "großeltern"])
        self.assertEqual(_speech_words("He's a boy. They are running."), ["he's", "a", "boy", "they", "are", "running"])

    def test_course_speech_locale_is_allow_listed_and_english_courses_declare_none(self):
        self.assertIn(self.descriptor()["speechLocale"], COURSE_SPEECH_LOCALES)
        courses = json.loads((ROOT / "backend/courses.json").read_text(encoding="utf-8"))
        self.assertEqual([c["id"] for c in courses if "speechLocale" not in c], ["a1", "a1-plus"])

    def test_german_narration_alternates_carola_and_the_male_co_teacher_with_german_feedback(self):
        # User decisions 2026-11-18 (Carola) and 2026-11-19 (male co-teacher, alternating
        # within each section like the English teacher and co-teacher).
        self.assertTrue({"de-teacher", "de-co-teacher"} <= NARRATION_SPEAKER_ROLES)
        self.assertEqual(NARRATOR_VOICE_IDS[narrator_for_speaker("de-teacher")], "K75lPKuh15SyVhQC1LrE")
        self.assertEqual(NARRATOR_VOICE_IDS[narrator_for_speaker("de-co-teacher")], "TUKJhQmz3RPYBNAgC5A1")
        lessons = COURSE_LESSONS["de-a1"].values()
        self.assertTrue(lessons)
        for lesson in lessons:
            self.assertEqual(lesson.level, "Deutsch A1")
            position = {}
            for card in lesson.cards:
                position[card.stage] = position.get(card.stage, 0) + 1
                expected = "de-teacher" if position[card.stage] % 2 else "de-co-teacher"
                self.assertEqual(card.target_language, "de", (lesson.id, card.slide_id))
                self.assertEqual(card.audio_speaker, expected, (lesson.id, card.slide_id))
                for asset in card.audio_assets:
                    self.assertEqual(asset.speaker_role, expected, asset.id)

    def test_english_courses_never_carry_the_german_flag(self):
        for course_id in ("a1", "a1-plus"):
            for lesson in COURSE_LESSONS[course_id].values():
                for card in lesson.cards:
                    self.assertIsNone(card.target_language, (lesson.id, card.slide_id))


if __name__ == "__main__":
    unittest.main()
