import json
import re
from pathlib import Path
import unittest

from backend.app.azure_pronunciation import COURSE_SPEECH_LOCALES
from backend.app.course_audio_profile import NARRATION_SPEAKER_ROLES, NARRATOR_VOICE_IDS, narrator_for_speaker
from backend.app.data import COURSE_LESSONS
from backend.app.pronunciation_scoring import _speech_words

ROOT = Path(__file__).resolve().parents[2]
FIRST_PERSON = re.compile(r"\b(ich|mein|meine|meinen)\b", re.IGNORECASE)
MASCULINE_ROLES = set("lehrer arzt koch fahrer bauer krankenpfleger kellner polizist künstler sänger arbeiter mechaniker "
                      "mexikaner amerikaner kanadier spanier".split())
FEMININE_ROLES = {"ärztin", "köchin", "bäuerin"} | {role + "in" for role in MASCULINE_ROLES - {"arzt", "koch", "bauer"}}


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
        narrators = {"de-teacher", "de-co-teacher"}
        for lesson in lessons:
            self.assertEqual(lesson.level, "Deutsch A1")
            mission = getattr(lesson, "experience_type", None) == "mission"
            position = {}
            for index, card in enumerate(lesson.cards):
                position[card.stage] = position.get(card.stage, 0) + 1
                if mission:
                    # Mission beats alternate by beat; every closing voice-gate question is Carola's.
                    expected = "de-teacher" if card.stage == "Speak" or index % 2 == 0 else "de-co-teacher"
                else:
                    expected = "de-teacher" if position[card.stage] % 2 else "de-co-teacher"
                self.assertEqual(card.target_language, "de", (lesson.id, card.slide_id))
                turns = [*(card.audio_turns or []), *(getattr(card, "answer_audio_turns", None) or [])]
                if lesson.unit_id not in ("de-a1-unit-1", "de-a1-unit-2") and (
                        turns or FIRST_PERSON.search(card.audio_text or card.answer_audio_text or "")):
                    # German Unit 3 (2026-11-21): in a dialogue each speaker keeps a voice of their
                    # gender, and a first-person line is read by the narrator of the speaker's gender.
                    self.assertIn(card.audio_speaker, narrators | {None}, (lesson.id, card.slide_id))
                    self.assertTrue({turn.speaker_role for turn in turns} <= narrators, (lesson.id, card.slide_id))
                    for asset in card.audio_assets:
                        if mission and "mission-intro" in asset.id:
                            continue
                        self.assertIn(asset.speaker_role, narrators, asset.id)
                    continue
                self.assertEqual(card.audio_speaker, expected, (lesson.id, card.slide_id))
                for asset in card.audio_assets:
                    if mission and "mission-intro" in asset.id:
                        # The English briefing is read by the English teacher for the English-speaking learner.
                        self.assertIn(asset.speaker_role, {"teacher", expected}, asset.id)
                        continue
                    self.assertEqual(asset.speaker_role, expected, asset.id)

    def test_unit_1_has_fourteen_lessons_ending_in_review_and_mission(self):
        # User approval "Approve, generate", 2026-11-19.
        ids = [lesson.id for lesson in COURSE_LESSONS["de-a1"].values() if lesson.unit_id == "de-a1-unit-1"]
        self.assertEqual(sorted(ids), sorted(f"de-a1-unit-1-lesson-1-{n}" for n in range(1, 15)))
        mission = COURSE_LESSONS["de-a1"]["de-a1-unit-1-lesson-1-14"]
        self.assertEqual(len(mission.cards), 24)
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-1-lesson-1-13"].cards), 62)

    def test_unit_2_has_fifteen_lessons_ending_in_review_and_mission(self):
        # User approval of the German Unit 2 map ("Approve, build"), 2026-11-20.
        ids = [lesson.id for lesson in COURSE_LESSONS["de-a1"].values() if lesson.unit_id == "de-a1-unit-2"]
        self.assertEqual(sorted(ids), sorted(f"de-a1-unit-2-lesson-2-{n}" for n in range(1, 16)))
        self.assertEqual(getattr(COURSE_LESSONS["de-a1"]["de-a1-unit-2-lesson-2-15"], "experience_type", None), "mission")
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-2-lesson-2-15"].cards), 15)
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-2-lesson-2-14"].cards), 72)

    def test_unit_3_has_sixteen_lessons_ending_in_review_and_mission(self):
        # User approval of the German Unit 3 map ("Approve, build"), 2026-11-21.
        ids = [lesson.id for lesson in COURSE_LESSONS["de-a1"].values() if lesson.unit_id == "de-a1-unit-3"]
        self.assertEqual(sorted(ids), sorted(f"de-a1-unit-3-lesson-3-{n}" for n in range(1, 17)))
        self.assertEqual(getattr(COURSE_LESSONS["de-a1"]["de-a1-unit-3-lesson-3-16"], "experience_type", None), "mission")
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-3-lesson-3-16"].cards), 16)
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-3-lesson-3-15"].cards), 58)

    def test_unit_3_first_person_lines_match_the_speaker_and_use_du_only(self):
        # A woman says Ich bin Lehrerin in Carola's voice; a man says Ich bin Lehrer in the
        # co-teacher's voice. The polite Sie and ihr (you plural) are not taught in Unit 3.
        for lesson in COURSE_LESSONS["de-a1"].values():
            if lesson.unit_id != "de-a1-unit-3":
                continue
            for card in lesson.cards:
                text = card.audio_text or card.answer_audio_text or ""
                words = _speech_words(text)
                for word, after in zip(words, words[1:]):
                    self.assertFalse(word == "ihr" and after in {"seid", "macht", "habt", "kommt"}, (lesson.id, card.slide_id, text))
                if card.audio_turns or getattr(card, "answer_audio_turns", None) or getattr(lesson, "experience_type", None) == "mission":
                    continue
                match = re.search(r"\bIch bin (\w+)\b", text)
                if match and match.group(1).lower() in FEMININE_ROLES:
                    self.assertEqual(card.audio_speaker, "de-teacher", (lesson.id, card.slide_id))
                elif match and match.group(1).lower() in MASCULINE_ROLES:
                    self.assertEqual(card.audio_speaker, "de-co-teacher", (lesson.id, card.slide_id))

    def test_unit_2_keeps_colors_and_sizes_after_the_noun(self):
        # Singular adjective endings (ein roter Bus) are deferred: German Unit 2 says
        # Das Auto ist rot. The only ending is -e before a counted plural (drei grüne Bücher).
        stems = "rot blau grün gelb schwarz weiß braun grau groß klein neu alt".split()
        for lesson in COURSE_LESSONS["de-a1"].values():
            if lesson.unit_id != "de-a1-unit-2":
                continue
            for card in lesson.cards:
                words = _speech_words(card.audio_text or "")
                for before, word in zip(words, words[1:]):
                    for stem in stems:
                        if word in {stem + "er", stem + "es", stem + "en"} or (word == stem + "e" and before in {"ein", "eine", "der", "die", "das"}):
                            self.fail((lesson.id, card.slide_id, card.audio_text))

    def test_german_answer_banks_count_umlaut_words_whole(self):
        from scripts.answer_choice_guardrail import analyze_bank
        card = {"target_language": "de", "options": [{"label": "Was ist das? Das ist ein Buch."}, {"label": "Was ist das? Das ist ein Handy."}]}
        self.assertEqual(analyze_bank(card), ("phrases", [], {}))
        self.assertEqual(analyze_bank({"target_language": "de", "options": [{"label": "Fünf"}, {"label": "Vier"}]}), ("words", [], {}))

    def test_animals_eat_with_fressen_never_essen(self):
        animals = ("hund", "katze", "vogel", "kaninchen")
        for lesson in COURSE_LESSONS["de-a1"].values():
            for card in lesson.cards:
                for sentence in (card.audio_text or "").split("."):
                    words = _speech_words(sentence)
                    for animal in animals:
                        if animal in words and len(words) <= 4 and words[-1] in {"isst", "essen"}:
                            self.fail((lesson.id, card.slide_id, sentence))

    def test_english_courses_never_carry_the_german_flag(self):
        for course_id in ("a1", "a1-plus"):
            for lesson in COURSE_LESSONS[course_id].values():
                for card in lesson.cards:
                    self.assertIsNone(card.target_language, (lesson.id, card.slide_id))


if __name__ == "__main__":
    unittest.main()
