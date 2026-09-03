from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path

from scripts.a1_media_runtime_contracts import (
    card_media_usages,
    course_browser_media_usages,
    renderer_contract_source,
    render_profile_sha256,
    validate_review_context,
)


LESSON = {
    "id": "lesson-2-10-around-me-mission",
    "sub_lesson_id": "2.10",
}


def image_choice_card() -> dict[str, object]:
    return {
        "slide_id": "R1",
        "interaction_type": "recognize-image",
        "prompt": "Choose the person.",
        "stage": "Recognize",
        "correct_option_id": "boy",
        "options": [
            {
                "id": "boy",
                "image_url": "/lesson-assets/boy.webp?v=reviewed",
                "label": "The boy",
            },
            {
                "id": "girl",
                "image_url": "/lesson-assets/girl.webp#choice",
                "label": "The girl",
            },
        ],
        "audio_text": "The boy.",
        "answer_audio_text": None,
        "prompt_image_url": "",
        "spanish_translation": "Elige a la persona.",
    }


def option_context(card: dict[str, object], option_id: str = "boy") -> dict[str, object]:
    usages = card_media_usages(LESSON, card)
    return next(
        usage["context"]
        for usage in usages
        if usage["context"]["media_role"] == "option"
        and usage["context"]["option_id"] == option_id
    )


def canonical_context(context: dict[str, object]) -> bytes:
    normalized = validate_review_context(context)
    return json.dumps(
        normalized,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


class A1MediaRuntimeContractTests(unittest.TestCase):
    def test_option_variant_resolution_is_bound_in_full_option_set(self) -> None:
        context = option_context(image_choice_card())

        self.assertEqual(context["source_filename"], "boy.webp")
        self.assertEqual(context["rendered_filename"], "boy_3x2.webp")
        self.assertEqual(
            context["options"],
            [
                {
                    "id": "boy",
                    "label": "The boy",
                    "source_filename": "boy.webp",
                    "rendered_filename": "boy_3x2.webp",
                    "is_correct": True,
                },
                {
                    "id": "girl",
                    "label": "The girl",
                    "source_filename": "girl.webp",
                    "rendered_filename": "girl_3x2.webp",
                    "is_correct": False,
                },
            ],
        )
        self.assertEqual(validate_review_context(context), context)

    def test_correct_prompt_and_audio_mutations_change_canonical_context(self) -> None:
        original_card = image_choice_card()
        original = canonical_context(option_context(original_card))

        mutations = {
            "correct answer": ("correct_option_id", "girl"),
            "prompt": ("prompt", "Listen and choose the person."),
            "model audio": ("audio_text", "The girl."),
            "answer audio": ("answer_audio_text", "The boy."),
        }
        for name, (field, value) in mutations.items():
            with self.subTest(mutation=name):
                changed_card = copy.deepcopy(original_card)
                changed_card[field] = value
                changed = canonical_context(option_context(changed_card))
                self.assertNotEqual(original, changed)

    def test_prompt_and_option_roles_have_distinct_canonical_contexts(self) -> None:
        card = image_choice_card()
        card["prompt_image_url"] = "/lesson-assets/boy.webp"
        usages = card_media_usages(LESSON, card)
        prompt = next(
            usage["context"]
            for usage in usages
            if usage["context"]["media_role"] == "prompt"
        )
        option = next(
            usage["context"]
            for usage in usages
            if usage["context"]["media_role"] == "option"
            and usage["context"]["option_id"] == "boy"
        )

        self.assertEqual(prompt["source_filename"], "boy.webp")
        self.assertEqual(prompt["rendered_filename"], "boy_3x2.webp")
        self.assertEqual(option["rendered_filename"], "boy_3x2.webp")
        self.assertIsNone(prompt["option_id"])
        self.assertIsNone(prompt["is_correct"])
        self.assertEqual(option["option_id"], "boy")
        self.assertTrue(option["is_correct"])
        self.assertNotEqual(canonical_context(prompt), canonical_context(option))

    def test_adding_a_distractor_changes_an_existing_option_context(self) -> None:
        original_card = image_choice_card()
        original = canonical_context(option_context(original_card))

        changed_card = copy.deepcopy(original_card)
        changed_card["options"].append(
            {
                "id": "woman",
                "image_url": "/lesson-assets/woman.webp",
                "label": "The woman",
            }
        )
        changed = canonical_context(option_context(changed_card))

        self.assertNotEqual(original, changed)
        self.assertEqual(len(option_context(changed_card)["options"]), 3)

    def test_prompt_variant_mismatch_fails_closed(self) -> None:
        card = image_choice_card()
        card["prompt_image_url"] = "/lesson-assets/boy.webp"
        prompt = next(
            usage["context"]
            for usage in card_media_usages(LESSON, card)
            if usage["context"]["media_role"] == "prompt"
        )
        prompt["rendered_filename"] = "boy.webp"

        with self.assertRaises(ValueError):
            validate_review_context(prompt)

    def test_two_choice_action_uses_the_actual_preplay_poster(self) -> None:
        card = image_choice_card()
        card["options"] = [
            {
                "id": "running",
                "image_url": "/lesson-assets/boy_is_running.webp",
                "label": "He is running.",
            },
            {
                "id": "writing",
                "image_url": "/lesson-assets/girl_is_writing.webp",
                "label": "She is writing.",
            },
        ]
        card["correct_option_id"] = "running"
        contexts = [
            usage["context"]
            for usage in card_media_usages(LESSON, card)
            if usage["context"]["media_role"] == "option"
        ]

        self.assertEqual(
            [context["rendered_filename"] for context in contexts],
            [
                "boy_is_running-two-card-poster.webp",
                "girl_is_writing.webp",
            ],
        )
        self.assertEqual(
            [context["render_profile"] for context in contexts],
            [
                "two-card-action-poster-3x2-v1",
                "lesson-option-1to3-3x2-v1",
            ],
        )

    def test_render_profile_signature_is_required_and_current(self) -> None:
        context = option_context(image_choice_card())
        self.assertEqual(
            context["render_signature_sha256"],
            render_profile_sha256(context["render_profile"]),
        )
        stale = copy.deepcopy(context)
        stale["render_signature_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "render signature is stale"):
            validate_review_context(stale)

    def test_explicit_nonvisual_blocks_do_not_change_renderer_source(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            source_path = Path(temporary_directory) / "Renderer.tsx"
            source_path.write_text("before\nafter\n", encoding="utf-8")
            baseline = renderer_contract_source(source_path)
            source_path.write_text(
                "before\n"
                "// media-contract-ignore-start: lifecycle-watchdog\n"
                "const watchdog = setTimeout(advance, 8000);\n"
                "// media-contract-ignore-end: lifecycle-watchdog\n"
                "after\n",
                encoding="utf-8",
            )

            self.assertEqual(renderer_contract_source(source_path), baseline)

    def test_nonvisual_ignore_blocks_fail_closed_when_mismatched(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            source_path = Path(temporary_directory) / "Renderer.tsx"
            source_path.write_text(
                "// media-contract-ignore-start: lifecycle-watchdog\n"
                "const watchdog = setTimeout(advance, 8000);\n"
                "// media-contract-ignore-end: different-tag\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "mismatched media-contract ignore block"):
                renderer_contract_source(source_path)

    def test_course_browser_covers_every_real_thumbnail_framing(self) -> None:
        root = Path(__file__).resolve().parents[2]
        lessons = json.loads(
            (root / "mobile" / "src" / "generated" / "a1-course.json").read_text(
                encoding="utf-8"
            )
        )
        usages = course_browser_media_usages(lessons)
        roles = [usage["context"]["media_role"] for usage in usages]

        self.assertEqual(len(usages), 147)
        self.assertEqual(roles.count("lesson_thumbnail"), 70)
        self.assertEqual(roles.count("continue_thumbnail"), 70)
        self.assertEqual(roles.count("unit_thumbnail"), 7)
        self.assertTrue(
            all(validate_review_context(usage["context"]) == usage["context"] for usage in usages)
        )

    def test_structurally_invalid_contexts_fail_closed(self) -> None:
        valid = option_context(image_choice_card())

        missing_field = copy.deepcopy(valid)
        del missing_field["prompt"]
        extra_field = copy.deepcopy(valid)
        extra_field["unreviewed"] = True
        invalid_role = copy.deepcopy(valid)
        invalid_role["media_role"] = "thumbnail"
        path_filename = copy.deepcopy(valid)
        path_filename["source_filename"] = "nested/boy.webp"
        no_options = copy.deepcopy(valid)
        no_options["options"] = []
        no_correct = copy.deepcopy(valid)
        for option in no_correct["options"]:
            option["is_correct"] = False
        wrong_correct_id = copy.deepcopy(valid)
        wrong_correct_id["correct_option_id"] = "missing"
        malformed_option = copy.deepcopy(valid)
        malformed_option["options"][0]["unexpected"] = "field"

        invalid_contexts = {
            "missing field": missing_field,
            "extra field": extra_field,
            "invalid media role": invalid_role,
            "non-basename filename": path_filename,
            "empty full option set": no_options,
            "no correct option": no_correct,
            "wrong correct option id": wrong_correct_id,
            "malformed nested option": malformed_option,
        }
        for name, context in invalid_contexts.items():
            with self.subTest(context=name):
                with self.assertRaises(ValueError):
                    validate_review_context(context)

    def test_internally_inconsistent_contexts_fail_closed(self) -> None:
        valid = option_context(image_choice_card())

        wrong_variant = copy.deepcopy(valid)
        wrong_variant["rendered_filename"] = "boy.webp"
        wrong_variant["options"][0]["rendered_filename"] = "boy.webp"

        orphan_option = copy.deepcopy(valid)
        orphan_option["option_id"] = "not-in-the-option-set"

        mismatched_selected_option = copy.deepcopy(valid)
        mismatched_selected_option["is_correct"] = False

        duplicate_option_id = copy.deepcopy(valid)
        duplicate_option_id["options"][1]["id"] = "boy"

        empty_nested_filename = copy.deepcopy(valid)
        empty_nested_filename["options"][1]["source_filename"] = ""

        invalid_contexts = {
            "source does not resolve to required variant": wrong_variant,
            "selected option is absent": orphan_option,
            "selected correctness contradicts option set": mismatched_selected_option,
            "duplicate option id": duplicate_option_id,
            "empty nested filename": empty_nested_filename,
        }
        for name, context in invalid_contexts.items():
            with self.subTest(context=name):
                with self.assertRaises(ValueError):
                    validate_review_context(context)


if __name__ == "__main__":
    unittest.main()
