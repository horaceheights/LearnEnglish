"""Conversation decisions preserve one justified choice and ordinary tutor attempts."""
import unittest
from copy import deepcopy
from types import SimpleNamespace

from pydantic import ValidationError

from backend.app.schemas import LessonCard, MissionGame, MissionLesson, MissionLessonCard
from backend.app.tutor_context import build_tutor_context


class MissionConversationDecisionTests(unittest.TestCase):
    def payload(self):
        return {
            "slide_id": "confirm-frequency", "mission_chapter_id": "conversation",
            "stage": "Listen", "interaction_type": "a2t", "prompt": "Listen and choose.",
            "context_es": "Ana y Luis conversan sobre sus planes.",
            "prompt_image_url": "/lesson-assets/phone.webp",
            "audio_text": "I study at home at seven.",
            "audio_turns": [{"text": "I study at home at seven.", "speaker_role": "ana",
                             "image_url": "/lesson-assets/phone.webp"}],
            "answer_audio_text": "How often do you study at home? I usually study at home.",
            "answer_audio_turns": [
                {"text": "How often do you study at home?", "speaker_role": "luis",
                 "image_url": "/lesson-assets/question.webp"},
                {"text": "I usually study at home.", "speaker_role": "ana",
                 "image_url": "/lesson-assets/reply.webp"}],
            "correct_option_id": "frequency", "correct_option_ids": ["frequency"],
            "options": [{"id": "time", "label": "What time do you study?"},
                        {"id": "frequency", "label": "How often do you study at home?"}],
            "mission_game": {"kind": "conversation-decision", "validation": "single",
                             "instruction_es": "Escucha y elige cómo continuar."},
        }

    def test_ordinary_choices_need_no_fake_target_or_cue(self):
        card = MissionLessonCard(**self.payload())
        self.assertEqual(card.mission_game.targets, [])
        self.assertEqual(card.mission_game.cues, [])
        self.assertEqual(len(card.answer_audio_turns), 2)
        self.assertEqual(card.correct_option_ids, ["frequency"])

    def test_existing_scene_missions_keep_their_approved_beat_ids(self):
        from scripts.validate_lesson_cards import LESSONS, validate_mission_contracts
        original = next(lesson for lesson in LESSONS.values()
                        if getattr(lesson, "experience_type", None) == "mission")
        changed = deepcopy(original)
        changed.cards[0].slide_id = "renamed-existing-beat"
        errors = validate_mission_contracts({**LESSONS, changed.id: changed})
        self.assertTrue(any("approved sequence" in error for error in errors))

    def test_accepts_two_images_or_three_text_alternatives(self):
        data = self.payload()
        data["options"].append({"id": "place", "label": "Where do you study?"})
        MissionLessonCard(**data)
        data = self.payload()
        data["interaction_type"] = "a2i"
        data["options"] = [{"id": "time", "image_url": "/lesson-assets/one.webp"},
                           {"id": "frequency", "image_url": "/lesson-assets/two.webp"}]
        MissionLessonCard(**data)

    def test_rejects_unanswerable_or_incoherent_choice_contracts(self):
        invalid = [
            {"correct_option_id": "missing"},
            {"correct_option_ids": ["time", "frequency"]},
            {"prompt": "How often does Ana study?"},
            {"stage": "Recognize"}, {"interaction_type": "mission-game"},
            {"prompt_image_url": " "}, {"audio_text": "An unheard sentence."},
            {"audio_turns": []}, {"answer_audio_text": "An unrelated response."},
            {"answer_audio_turns": []}, {"answer_audio_text": None},
            {"options": [{"id": "frequency", "label": "Yes."}]},
            {"options": [{"id": "frequency", "label": " "}, {"id": "time", "label": "No."}]},
            {"options": [{"id": "frequency", "label": "Yes."}, {"id": "frequency", "label": "No."}]},
            {"options": [{"id": "frequency", "label": "Yes."}, {"id": "time", "label": " yes. "}]},
            {"interaction_type": "a2i", "options": [{"id": "frequency", "image_url": " "}, {"id": "time", "image_url": " "}]},
            {"interaction_type": "a2i", "options": [{"id": "frequency", "image_url": "/same.webp"}, {"id": "time", "image_url": "/same.webp"}]},
            {"options": [{"id": "frequency", "label": "Yes."}, {"id": "time", "image_url": "/x.webp"}]},
        ]
        for changes in invalid:
            with self.subTest(changes=changes), self.assertRaises(ValidationError):
                MissionLessonCard(**(self.payload() | changes))

    def test_search_only_configuration_is_rejected(self):
        for change in ({"validation": "ordered"}, {"cue_order": "authored"},
                       {"scene_scope": "two-person-dialogue"}, {"tutorial_mode": "guided-no-fail"},
                       {"cue_audio_text": "A clue."}, {"instruction_es": "Elige la frecuencia."}):
            data = self.payload()
            data["mission_game"].update(change)
            with self.subTest(change=change), self.assertRaises(ValidationError):
                MissionLessonCard(**data)
        for kind in ("guided-search", "crowd-search", "voice-gate"):
            with self.subTest(kind=kind), self.assertRaises(ValidationError):
                MissionGame(kind=kind, validation="single", instruction_es="Escucha.")

    def test_completion_scene_remains_unscored_and_optional(self):
        data = self.payload()
        data["mission_game"]["completion_scene"] = {
            "image_url": "/lesson-assets/arrival.webp", "context_es": "Luis llega a la biblioteca."}
        card = MissionLessonCard(**data)
        self.assertEqual(card.correct_option_ids, ["frequency"])
        self.assertEqual(card.mission_game.completion_scene.image_url, "/lesson-assets/arrival.webp")

    def test_fact_check_may_advance_without_a_redundant_spoken_response(self):
        data = self.payload() | {"answer_audio_text": None, "answer_audio_turns": []}
        card = MissionLessonCard(**data)
        self.assertIsNone(card.answer_audio_text)
        self.assertEqual(card.answer_audio_turns, [])

    def test_tutor_uses_selected_choice_without_disclosing_future_answers(self):
        lesson = SimpleNamespace(sub_lesson_title="A visit", level="A1+", goal="Agree a plan",
                                 vocabulary=[], grammar_function="Questions", prerequisite="A1")
        card = MissionLessonCard(**self.payload())
        before = build_tutor_context(lesson, card)
        self.assertEqual(before["mode"], "before_answer")
        self.assertIn("useful next question", before["task"])
        for key in ("expected_words", "answer_model", "heard_model", "prompt"):
            self.assertNotIn(key, before)
        error = build_tutor_context(lesson, card, ["time"])
        self.assertEqual(error["mode"], "after_error")
        self.assertEqual(error["heard_model"], "I study at home at seven.")
        self.assertEqual(error["submitted_words"], ["What time do you study?"])
        self.assertEqual(build_tutor_context(lesson, card, ["frequency"])["mode"], "after_correct")
        for focus in ({"cue_index": 0}, {"target_id": "frequency"}):
            with self.assertRaises(ValueError):
                build_tutor_context(lesson, card, **focus)

    def mission(self):
        decision = self.payload() | {"pedagogy_note": "Mission beat 01/05: Ask for the missing information."}
        cards = [decision]
        for index in range(1, 5):
            text = "I usually study at home."
            cards.append({
                "slide_id": f"recap-{index}", "mission_chapter_id": "conversation",
                "stage": "Speak", "interaction_type": "mission-finale" if index == 4 else "mission-speak",
                "prompt": text, "prompt_presentation": "written", "audio_text": text,
                "audio_turns": [{"text": "How often do you study at home?", "speaker_role": "luis",
                                 "image_url": "/lesson-assets/question.webp"}],
                "correct_option_id": "answer", "options": [{"id": "answer", "label": text,
                    "image_url": f"/lesson-assets/response-{index}.webp"}],
                "pedagogy_note": f"Mission beat {index + 1:02d}/05: Recall the conversation.",
                "mission_game": {"kind": "voice-gate", "instruction_es": "Responde en voz alta.",
                    "validation": "single", "targets": [{"id": "response", "label_es": "Respuesta",
                        "accepted_option_ids": ["answer"], "rect": {"x": .1, "y": .1, "width": .8, "height": .8}}],
                    "cues": [{"id": "question", "text": "How often do you study at home?",
                        "answer_text": text, "target_id": "response", "option_id": "answer"}]},
            })
        return MissionLesson(id="test-decision-mission", title="A visit", level="A1+", unit_id="test",
            unit_title="Plans", lesson_id="test-decision-mission", lesson_title="A visit", sub_lesson_id="1.12",
            sub_lesson_title="A visit", goal="Agree a plan", vocabulary=[], content_revision=1,
            experience_type="mission", cards=cards, mission={
                "label": "MISIÓN", "title": "Una visita", "briefing": "Prepara una visita.",
                "kickoff_image_url": "/lesson-assets/kickoff.webp", "objectives": ["Completa la conversación"],
                "completion_title": "Visita completada", "completion_message": "Has completado la visita.",
                "chapters": [{"id": "conversation", "title": "Una conversación", "objective": "Acuerda un plan"}],
            })

    def contract_errors(self, lesson):
        from scripts.validate_lesson_cards import validate_mission_contracts
        return [error for error in validate_mission_contracts({lesson.id: lesson}) if error.startswith(lesson.id)]

    def test_new_mission_accepts_stable_authored_ids_and_four_closing_gates(self):
        self.assertEqual(self.contract_errors(self.mission()), [])

    def test_tutor_distinguishes_image_answers_with_empty_labels(self):
        data = self.payload()
        data["interaction_type"] = "a2i"
        data["options"] = [{"id": "time", "image_url": "/lesson-assets/one.webp"},
                           {"id": "frequency", "image_url": "/lesson-assets/two.webp"}]
        lesson = self.mission()
        for card in (MissionLessonCard(**data), LessonCard(**data)):
            with self.subTest(card_kind=type(card).__name__):
                error = build_tutor_context(lesson, card, ["time"])
                self.assertEqual(error["mode"], "after_error")
                self.assertEqual(error["submitted_image_option_ids"], ["time"])
                self.assertEqual(build_tutor_context(lesson, card, ["frequency"])["mode"], "after_correct")
                self.assertNotIn("expected_image_option_ids", build_tutor_context(lesson, card))

    def test_catalog_rejects_interspersed_gates_and_unwritten_replies(self):
        lesson = self.mission()
        lesson.cards[0], lesson.cards[1] = lesson.cards[1], lesson.cards[0]
        self.assertTrue(any("four consecutive" in error for error in self.contract_errors(lesson)))
        lesson = self.mission()
        lesson.cards[-1].prompt_presentation = None
        self.assertTrue(any("written answer" in error for error in self.contract_errors(lesson)))
        lesson = self.mission()
        lesson.cards[-1].options[0].image_url = lesson.cards[-1].audio_turns[0].image_url
        self.assertTrue(any("distinct response" in error for error in self.contract_errors(lesson)))


if __name__ == "__main__":
    unittest.main()
