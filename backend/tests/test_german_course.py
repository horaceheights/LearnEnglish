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

    def test_unit_4_has_seventeen_lessons_ending_in_review_and_mission(self):
        # User approval of the German Unit 4 map ("Approve, build"), 2026-11-23.
        ids = [lesson.id for lesson in COURSE_LESSONS["de-a1"].values() if lesson.unit_id == "de-a1-unit-4"]
        self.assertEqual(sorted(ids), sorted(f"de-a1-unit-4-lesson-4-{n}" for n in range(1, 18)))
        self.assertEqual(getattr(COURSE_LESSONS["de-a1"]["de-a1-unit-4-lesson-4-17"], "experience_type", None), "mission")
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-4-lesson-4-17"].cards), 20)
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-4-lesson-4-16"].cards), 86)

    def test_unit_4_keeps_colors_before_the_verb_and_no_am_pm(self):
        # Approved Unit 4 map, 2026-11-23: a color only follows der/die/das (das blaue Buch),
        # never ein/einen (no ein blaues Buch yet), and German clock times never say a.m./p.m.
        colors = "rot blau grün gelb schwarz weiß braun grau".split()
        for lesson in COURSE_LESSONS["de-a1"].values():
            if lesson.unit_id != "de-a1-unit-4":
                continue
            for card in lesson.cards:
                text = card.audio_text or card.answer_audio_text or ""
                words = _speech_words(text)
                self.assertNotRegex(text.lower(), r"\b[ap]\.m\.", (lesson.id, card.slide_id))
                for word, after in zip(words, words[1:]):
                    if any(after.startswith(c) and after != c for c in colors):
                        self.assertIn(word, {"der", "die", "das"}, (lesson.id, card.slide_id, text))

    def test_unit_5_has_sixteen_lessons_ending_in_review_and_mission(self):
        # User instruction of 2026-11-23 to complete German Units 5-7, ported from English A1 Unit 5.
        ids = [lesson.id for lesson in COURSE_LESSONS["de-a1"].values() if lesson.unit_id == "de-a1-unit-5"]
        self.assertEqual(sorted(ids), sorted(f"de-a1-unit-5-lesson-5-{n}" for n in range(1, 17)))
        mission = COURSE_LESSONS["de-a1"]["de-a1-unit-5-lesson-5-16"]
        self.assertEqual(getattr(mission, "experience_type", None), "mission")
        self.assertEqual([card.slide_id for card in mission.cards], [f"M{n:02d}" for n in range(1, 25)])
        self.assertEqual(len(COURSE_LESSONS["de-a1"]["de-a1-unit-5-lesson-5-15"].cards), 68)

    def test_units_6_and_7_have_fifteen_lessons_ending_in_review_and_mission(self):
        # User instruction of 2026-11-23 to complete German Units 5-7, ported from English A1 Units 6-7.
        for unit, review, mission in ((6, 56, 15), (7, 79, 24)):
            ids = [lesson.id for lesson in COURSE_LESSONS["de-a1"].values() if lesson.unit_id == f"de-a1-unit-{unit}"]
            self.assertEqual(sorted(ids), sorted(f"de-a1-unit-{unit}-lesson-{unit}-{n}" for n in range(1, 16)))
            self.assertEqual(getattr(COURSE_LESSONS["de-a1"][f"de-a1-unit-{unit}-lesson-{unit}-15"], "experience_type", None), "mission")
            self.assertEqual(len(COURSE_LESSONS["de-a1"][f"de-a1-unit-{unit}-lesson-{unit}-15"].cards), mission)
            self.assertEqual(len(COURSE_LESSONS["de-a1"][f"de-a1-unit-{unit}-lesson-{unit}-14"].cards), review)

    def test_units_6_and_7_give_directions_with_du_and_keep_colors_after_the_verb(self):
        # Directions and help requests use du; the only adjective ending before a noun is -en after den/dem (den blauen Bus).
        for lesson in COURSE_LESSONS["de-a1"].values():
            if lesson.unit_id not in ("de-a1-unit-6", "de-a1-unit-7"):
                continue
            for card in lesson.cards:
                text = card.audio_text or card.answer_audio_text or ""
                self.assertNotRegex(text, r"\b(Gehen|Biegen|Halten|Nehmen) Sie\b", (lesson.id, card.slide_id))
                for match in re.finditer(r"\b(\w+e[nr]?) (Bus|Hose|Pullover|Kleid|Rock|Jacke|Hut|Hemd)\b", text):
                    self.assertIn(match.group(1).lower(), {"blauen", "roten", "blaue", "rote", "die", "der", "das", "den", "dem", "meine", "eine", "keine", "seine", "ihre", "deine", "welcher", "nächste", "einen", "meinen", "keinen", "seinen", "ihren", "deinen", "unseren"},
                                  (lesson.id, card.slide_id, text))

    def test_unit_5_keeps_polite_sie_for_shop_workers_and_haben_last(self):
        # The polite Sie/Ihr/Ihnen is only for shop and café workers; Kann ich bitte ... haben? ends with haben.
        for lesson in COURSE_LESSONS["de-a1"].values():
            if lesson.unit_id != "de-a1-unit-5":
                continue
            for card in lesson.cards:
                for text in {card.audio_text or "", card.answer_audio_text or "", *(o.label for o in card.options if len(o.label.split()) > 2)}:
                    for sentence in re.findall(r"[^.?!]+[.?!]?", text):
                        if re.search(r"\b(Ihnen|Ihr|Ihre)\b|\bMöchten Sie\b", sentence):
                            self.assertRegex(sentence, r"helfen|Hier (ist|sind)|Möchten Sie", (lesson.id, card.slide_id, sentence))
                        if sentence.strip().startswith("Kann ich bitte"):
                            self.assertTrue(sentence.strip().endswith("haben?"), (lesson.id, card.slide_id, sentence))
                    self.assertNotIn("Dollars", text, (lesson.id, card.slide_id))

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
