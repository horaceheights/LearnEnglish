import unittest
from types import SimpleNamespace

from scripts.validate_lesson_cards import (
    find_use_prompt_image_mismatches,
    validate_use_prompt_image_meaning,
)


def _lessons(*cards):
    return {"lesson-5-1-fruits": SimpleNamespace(sub_lesson_id="5.1", cards=list(cards))}


def _card(sentence, image, stage="Use", slide_id="U3"):
    return SimpleNamespace(
        stage=stage,
        slide_id=slide_id,
        prompt_image_url=f"/lesson-assets/{image}" if image else "",
        answer_audio_text=sentence,
        audio_text=sentence,
    )


def _asset(filename, description, *, concept="", source="composite-or-generated", stages=("Learn",)):
    return {
        "filename": filename,
        "concept": concept,
        "description": description,
        "source": source,
        "review_contexts": [{"stage": stage} for stage in stages],
    }


MANIFEST = {
    "assets": [
        _asset(
            "a1_scene_grapes.webp",
            "One compact bunch of purple grapes; individual berries remain visible.",
            concept="Grapes",
        ),
        _asset("a1_scene_red_apple.webp", "One shiny red apple on a plain table.", concept="A red apple"),
        _asset(
            "a1_scene_age_20.webp",
            "Ana points to the handwritten age 20 on her form.",
            source="reviewed-photoreal",
        ),
        _asset("a1_scene_lunch.webp", "Table with rice and chicken; clock around 1:00.", concept="Lunch"),
        _asset("a1_scene_family.webp", "Parents and three children on a sofa.", concept="A family"),
        # Contracts generated from the card or a lesson thumbnail restate that
        # text, so they are not evidence of what the picture shows.
        _asset(
            "a1_scene_card_text_only.webp",
            "Unit 5 learner-facing still for The apple is red.",
            source="unit-use-runtime",
            stages=("Use",),
        ),
        _asset(
            "a1_scene_card_text_only.webp",
            "Course-browser lesson thumbnail for 5.1 Fruits; the image must show red apples.",
            source="course-browser-runtime",
        ),
        _asset(
            "a1_scene_rewritten_row.webp",
            "Course-browser continue thumbnail for 5.1 Fruits; the image must show red apples.",
            source="reviewed-photoreal",
        ),
    ]
}


class UsePromptImageMeaningTest(unittest.TestCase):
    def findings(self, *cards):
        return find_use_prompt_image_mismatches(_lessons(*cards), MANIFEST)

    def test_flags_a_sentence_its_image_does_not_show(self):
        mismatches, unverifiable = self.findings(_card("The apple is red.", "a1_scene_grapes.webp"))

        self.assertEqual([], unverifiable)
        self.assertEqual(1, len(mismatches))
        self.assertIn("Lesson 5.1 Use U3", mismatches[0])
        self.assertIn("a1_scene_grapes.webp", mismatches[0])

    def test_accepts_an_image_described_with_the_sentence_content(self):
        self.assertEqual(([], []), self.findings(_card("The apple is red.", "a1_scene_red_apple.webp")))

    def test_word_forms_number_digits_and_plain_categories_count_as_shown(self):
        self.assertEqual(
            ([], []),
            self.findings(
                _card("I am twenty years old.", "a1_scene_age_20.webp", slide_id="U1"),
                _card("They are children.", "a1_scene_family.webp", slide_id="U2"),
                _card("It is a fruit.", "a1_scene_red_apple.webp", slide_id="U4"),
            ),
        )

    def test_a_shared_number_does_not_hide_a_wrong_scene(self):
        mismatches, _ = self.findings(_card("It is one dollar.", "a1_scene_lunch.webp"))

        self.assertEqual(1, len(mismatches))

    def test_card_generated_contracts_cannot_vouch_for_the_image(self):
        mismatches, unverifiable = self.findings(
            _card("The apple is red.", "a1_scene_card_text_only.webp"),
            _card("The apple is red.", "a1_scene_rewritten_row.webp", slide_id="U4"),
        )

        self.assertEqual([], mismatches)
        self.assertEqual(
            [
                "Lesson 5.1 Use U3 (a1_scene_card_text_only.webp)",
                "Lesson 5.1 Use U4 (a1_scene_rewritten_row.webp)",
            ],
            unverifiable,
        )

    def test_only_use_stage_prompt_images_are_checked(self):
        self.assertEqual(
            ([], []),
            self.findings(
                _card("The apple is red.", "a1_scene_grapes.webp", stage="Recognize"),
                _card("The apple is red.", None, slide_id="U4"),
            ),
        )

    def test_undescribed_image_is_judged_by_what_the_course_teaches_with_it(self):
        teaching_card = SimpleNamespace(
            stage="Learn",
            slide_id="L10",
            prompt_image_url="/lesson-assets/a1_n10.webp",
            audio_text="Ten",
            answer_audio_text=None,
            prompt="Choose the number.",
            options=[],
            correct_option_id=None,
            correct_option_ids=[],
        )
        teaching = {"lesson-2-6": SimpleNamespace(sub_lesson_id="2.6", cards=[teaching_card])}

        mismatches, unverifiable = find_use_prompt_image_mismatches(
            _lessons(_card("How old are you?", "a1_n10.webp")), MANIFEST, teaching
        )
        self.assertEqual([], unverifiable)
        self.assertEqual(1, len(mismatches))
        self.assertIn("taught elsewhere only as 'Ten'", mismatches[0])
        self.assertEqual(
            ([], []),
            find_use_prompt_image_mismatches(_lessons(_card("It is ten.", "a1_n10.webp")), MANIFEST, teaching),
        )

    def test_preview_advises_while_production_blocks(self):
        lessons = _lessons(_card("The apple is red.", "a1_scene_grapes.webp"))
        warnings = []

        self.assertEqual([], validate_use_prompt_image_meaning("preview", warnings, lessons, MANIFEST))
        self.assertEqual(1, len(warnings))
        self.assertTrue(warnings[0].startswith("Preview-only advisory:"))
        self.assertEqual(1, len(validate_use_prompt_image_meaning("production", [], lessons, MANIFEST)))


if __name__ == "__main__":
    unittest.main()
