import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pydantic import ValidationError

from backend.app.data import load_lesson_from_file
from backend.app.schemas import Lesson, MissionLesson


def standard_lesson_payload() -> dict:
    return {
        "id": "lesson-standard",
        "title": "Standard lesson",
        "level": "A1",
        "unit_id": "unit-1",
        "unit_title": "People",
        "lesson_id": "lesson-1",
        "lesson_title": "People",
        "sub_lesson_id": "1.1",
        "sub_lesson_title": "People",
        "goal": "Identify a person.",
        "vocabulary": ["a man"],
        "cards": [
            {
                "prompt": "A man",
                "stage": "Learn",
                "correct_option_id": "man",
                "options": [{"id": "man", "label": "A man", "image_url": ""}],
            }
        ],
    }


def mission_lesson_payload() -> dict:
    payload = standard_lesson_payload()
    payload.update(
        {
            "id": "lesson-mission",
            "sub_lesson_id": "1.10",
            "sub_lesson_title": "Family mission",
            "experience_type": "mission",
            "content_revision": 2,
            "mission": {
                "label": "Final mission",
                "title": "Find the family",
                "briefing": "Follow the clues and introduce the family.",
                "completion_title": "Mission complete",
                "completion_message": "You found and introduced the family.",
                "chapters": [
                    {"id": "arrival", "title": "Arrival", "objective": "Meet the family."},
                    {"id": "clues", "title": "Clues", "objective": "Identify each person."},
                ],
            },
            "cards": [
                {
                    "slide_id": "M01",
                    "interaction_type": "mission-brief",
                    "mission_chapter_id": "arrival",
                    "mission_visual_key": "mission-arrival",
                    "visual_description_es": "Una familia entra al set de cine.",
                    "instruction_es": "Comienza la misión.",
                    "success_outcome_es": "La misión queda abierta.",
                    "prompt": "Meet the family.",
                    "stage": "Learn",
                    "correct_option_id": "start",
                    "options": [{"id": "start", "label": "Start", "image_url": ""}],
                },
                {
                    "slide_id": "M02",
                    "interaction_type": "mission-clue",
                    "mission_chapter_id": "clues",
                    "mission_visual_key": "mission-clue",
                    "visual_description_es": "Un hombre aparece solo frente a la cámara.",
                    "instruction_es": "Resuelve la pista.",
                    "success_outcome_es": "La persona queda identificada.",
                    "prompt": "Who is he?",
                    "stage": "Recognize",
                    "correct_option_id": "father",
                    "options": [{"id": "father", "label": "The father", "image_url": ""}],
                },
            ],
        }
    )
    return payload


class MissionSchemaTests(unittest.TestCase):
    def test_standard_lessons_keep_the_existing_serialized_shape(self):
        lesson = Lesson(**standard_lesson_payload())

        self.assertNotIn("experience_type", lesson.model_dump())
        self.assertNotIn("content_revision", lesson.model_dump())
        self.assertNotIn("mission", lesson.model_dump())

    def test_mission_lessons_require_and_serialize_presentation_metadata(self):
        lesson = MissionLesson(**mission_lesson_payload())

        self.assertEqual(lesson.experience_type, "mission")
        self.assertEqual(lesson.content_revision, 2)
        self.assertEqual(lesson.cards[1].mission_chapter_id, "clues")
        self.assertEqual(
            lesson.cards[1].visual_description_es,
            "Un hombre aparece solo frente a la cámara.",
        )
        self.assertEqual([chapter.id for chapter in lesson.mission.chapters], ["arrival", "clues"])

    def test_mission_match_requires_targets_and_allows_untargeted_distractors(self):
        payload = mission_lesson_payload()
        card = payload["cards"][1]
        card["interaction_type"] = "mission-match"
        card["correct_option_ids"] = ["father"]
        card["options"].append(
            {"id": "not-father", "label": "He is not the father.", "image_url": ""}
        )
        card["mission_targets"] = [
            {"id": "actor", "label": "Actor señalado", "correct_option_id": "father"}
        ]

        lesson = MissionLesson(**payload)

        self.assertEqual(lesson.cards[1].mission_targets[0].correct_option_id, "father")
        self.assertEqual(2, len(lesson.cards[1].options))

    def test_mission_truth_stamp_accepts_an_ordered_target_board(self):
        payload = mission_lesson_payload()
        card = payload["cards"][1]
        card["interaction_type"] = "mission-truth-stamp"
        card["correct_option_ids"] = ["father"]
        card["mission_targets"] = [
            {"id": "shot", "label": "Toma señalada", "correct_option_id": "father"}
        ]

        lesson = MissionLesson(**payload)

        self.assertEqual(lesson.cards[1].mission_targets[0].id, "shot")

    def test_target_order_must_match_correct_option_order(self):
        payload = mission_lesson_payload()
        card = payload["cards"][1]
        card["interaction_type"] = "mission-match"
        card["options"].append({"id": "mother", "label": "The mother", "image_url": ""})
        card["correct_option_ids"] = ["father", "mother"]
        card["mission_targets"] = [
            {"id": "mother", "label": "Madre", "correct_option_id": "mother"},
            {"id": "father", "label": "Padre", "correct_option_id": "father"},
        ]
        with self.assertRaisesRegex(ValidationError, "target order must match"):
            MissionLesson(**payload)

    def test_mission_match_rejects_missing_or_invalid_targets(self):
        payload = mission_lesson_payload()
        payload["cards"][1]["interaction_type"] = "mission-match"
        with self.assertRaisesRegex(ValidationError, "require at least one mission target"):
            MissionLesson(**payload)

        payload = mission_lesson_payload()
        payload["cards"][1]["interaction_type"] = "mission-match"
        payload["cards"][1]["mission_targets"] = [
            {"id": "actor", "label": "Actor señalado", "correct_option_id": "missing"}
        ]
        with self.assertRaisesRegex(ValidationError, "reference missing option IDs"):
            MissionLesson(**payload)

    def test_non_target_interactions_reject_mission_targets(self):
        payload = mission_lesson_payload()
        payload["cards"][1]["mission_targets"] = [
            {"id": "actor", "label": "Actor señalado", "correct_option_id": "father"}
        ]
        with self.assertRaisesRegex(ValidationError, "Only target-based"):
            MissionLesson(**payload)

    def test_mission_chapter_ids_must_be_unique(self):
        payload = mission_lesson_payload()
        payload["mission"]["chapters"][1]["id"] = "arrival"

        with self.assertRaisesRegex(ValidationError, "Mission chapter IDs must be unique"):
            MissionLesson(**payload)

    def test_every_card_must_reference_a_declared_chapter(self):
        payload = mission_lesson_payload()
        payload["cards"][1]["mission_chapter_id"] = "unknown"

        with self.assertRaisesRegex(ValidationError, "undeclared chapters: unknown"):
            MissionLesson(**payload)

    def test_every_declared_chapter_must_have_a_card(self):
        payload = mission_lesson_payload()
        payload["cards"] = payload["cards"][:1]

        with self.assertRaisesRegex(ValidationError, "chapters have no cards: clues"):
            MissionLesson(**payload)

    def test_chapter_cards_must_be_contiguous_and_follow_declared_order(self):
        payload = mission_lesson_payload()
        payload["cards"].append({**payload["cards"][0], "slide_id": "M03"})

        with self.assertRaisesRegex(ValidationError, "declared chapter order"):
            MissionLesson(**payload)

    def test_loader_routes_by_experience_type_and_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            mission_path = Path(directory) / "mission.yaml"
            mission_path.write_text(json.dumps(mission_lesson_payload()), encoding="utf-8")
            with patch(
                "backend.app.data.bind_lesson_audio_assets",
                side_effect=lambda lesson: lesson,
            ):
                lesson = load_lesson_from_file(mission_path)
            self.assertIsInstance(lesson, MissionLesson)

            standard_path = Path(directory) / "standard.yaml"
            standard_path.write_text(json.dumps(standard_lesson_payload()), encoding="utf-8")
            with patch(
                "backend.app.data.bind_lesson_audio_assets",
                side_effect=lambda lesson: lesson,
            ):
                standard_lesson = load_lesson_from_file(standard_path)
            self.assertIs(type(standard_lesson), Lesson)

            unsupported = mission_lesson_payload()
            unsupported["experience_type"] = "experimental"
            unsupported_path = Path(directory) / "unsupported.yaml"
            unsupported_path.write_text(json.dumps(unsupported), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unsupported lesson experience_type"):
                load_lesson_from_file(unsupported_path)


if __name__ == "__main__":
    unittest.main()
