import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlparse

from backend.app.data import LESSON_IMAGE_DIR, LESSONS


STAGES = ["Learn", "Recognize", "Listen", "Speak", "Use"]
UNIT_1_IDS = [
    "lesson-1-people-actions",
    "lesson-2-pronouns",
    "lesson-3-two-people",
    "lesson-4-children-siblings",
    "lesson-5-parents-grandparents",
    "lesson-6-family-actions",
    "lesson-7-is-are-not",
    "lesson-8-who",
    "lesson-9-unit-review",
    "lesson-10-family-mission",
]
EXPECTED_TITLES = [
    "Meet the People",
    "People in Action",
    "Two People: They and Are",
    "Children and Siblings",
    "Parents and Grandparents",
    "Family Actions",
    "What They Are Not Doing",
    "Who Is He? Who Are They?",
    "Unit 1 Story Review",
    "Family Scene Mission",
]
EXPECTED_VOCABULARY = {
    "lesson-1-people-actions": {
        "a", "boy", "girl", "man", "woman", "he", "she", "is",
    },
    "lesson-2-pronouns": {"the", "eating", "drinking", "reading", "writing"},
    "lesson-3-two-people": {"and", "they", "are", "running", "sitting", "swimming", "sleeping"},
    "lesson-4-children-siblings": {
        "family", "baby", "babies", "child", "children",
        "brother", "brothers", "sister", "sisters",
    },
    "lesson-5-parents-grandparents": {
        "an", "adult", "adults", "father", "mother", "parents",
        "grandfather", "grandmother", "grandparents",
    },
    "lesson-6-family-actions": {"playing", "studying", "working", "cooking", "talking"},
    "lesson-7-is-are-not": {"not"},
    "lesson-8-who": {"who"},
    "lesson-9-unit-review": set(),
    "lesson-10-family-mission": set(),
}
EXPECTED_STAGE_COUNTS = {
    "lesson-1-people-actions": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-2-pronouns": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-3-two-people": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-4-children-siblings": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-5-parents-grandparents": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-6-family-actions": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-7-is-are-not": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-8-who": {"Learn": 10, "Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7},
    "lesson-9-unit-review": {"Learn": 14, "Recognize": 14, "Listen": 10, "Speak": 8, "Use": 8},
    "lesson-10-family-mission": {"Learn": 4, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
}


def lesson_payload(lesson):
    if hasattr(lesson, "model_dump"):
        payload = lesson.model_dump(mode="json")
    else:
        payload = json.loads(lesson.json())
    for card in payload.get("cards", []):
        if card.get("spanish_translation") is None:
            card.pop("spanish_translation", None)
        if not card.get("correct_option_ids"):
            card.pop("correct_option_ids", None)
        if not card.get("audio_turns"):
            card.pop("audio_turns", None)
        if not card.get("answer_audio_turns"):
            card.pop("answer_audio_turns", None)
    return payload


class LessonStructureTests(unittest.TestCase):
    def test_unit_1_follows_the_approved_ten_lesson_roadmap(self):
        unit_1 = [lesson for lesson in LESSONS.values() if lesson.unit_id == "unit-1"]
        self.assertEqual(UNIT_1_IDS, [lesson.id for lesson in unit_1])
        self.assertEqual(
            [f"1.{index}" for index in range(1, 11)],
            [lesson.sub_lesson_id for lesson in unit_1],
        )
        self.assertEqual(EXPECTED_TITLES, [lesson.sub_lesson_title for lesson in unit_1])

    def test_complete_a1_course_has_seven_units_and_ten_lessons_each(self):
        self.assertEqual(70, len(LESSONS))
        for unit in range(1, 8):
            lessons = [lesson for lesson in LESSONS.values() if lesson.unit_id == f"unit-{unit}"]
            with self.subTest(unit=unit):
                self.assertEqual(10, len(lessons))
                self.assertEqual(
                    [f"{unit}.{index}" for index in range(1, 11)],
                    [lesson.sub_lesson_id for lesson in lessons],
                )

    def test_units_2_through_7_have_complete_execution_metadata(self):
        for lesson in LESSONS.values():
            if lesson.unit_id == "unit-1":
                continue
            with self.subTest(lesson=lesson.id):
                self.assertGreaterEqual(len(lesson.cards), 32)
                self.assertLessEqual(len(lesson.cards), 40)
                self.assertTrue(lesson.unit_outcome)
                self.assertTrue(lesson.grammar_function)
                self.assertTrue(lesson.speaking_outcome)
                self.assertTrue(lesson.prerequisite)
                self.assertTrue(lesson.purposeful_review_slides)
                self.assertTrue(all(card.slide_id for card in lesson.cards))
                self.assertTrue(all(card.interaction_type for card in lesson.cards))
                self.assertTrue(all(card.spanish_translation for card in lesson.cards))

    def test_rebuilt_unit_1_lessons_have_complete_execution_metadata(self):
        rebuilt_ids = UNIT_1_IDS[1:9]
        for lesson_id in rebuilt_ids:
            lesson = LESSONS[lesson_id]
            with self.subTest(lesson=lesson_id):
                self.assertTrue(lesson.unit_outcome)
                self.assertTrue(lesson.grammar_function)
                self.assertTrue(lesson.speaking_outcome)
                self.assertTrue(lesson.prerequisite)
                self.assertTrue(lesson.purposeful_review_slides)
                self.assertTrue(all(card.slide_id for card in lesson.cards))
                self.assertTrue(all(card.interaction_type for card in lesson.cards))
                self.assertTrue(all(card.spanish_translation for card in lesson.cards))
                self.assertTrue(all(card.pedagogy_note for card in lesson.cards))

    def test_rebuilt_unit_1_stages_preserve_story_order(self):
        for lesson_id in UNIT_1_IDS[1:9]:
            lesson = LESSONS[lesson_id]
            for stage in STAGES:
                beats = []
                for card in lesson.cards:
                    if card.stage != stage:
                        continue
                    match = re.match(r"Story beat (\d+):", card.pedagogy_note)
                    self.assertIsNotNone(match, (lesson_id, stage, card.slide_id))
                    beats.append(int(match.group(1)))
                with self.subTest(lesson=lesson_id, stage=stage):
                    self.assertEqual(list(range(1, len(beats) + 1)), beats)

    def test_new_lessons_do_not_replay_the_previous_lesson_cards(self):
        unit_lessons = [LESSONS[lesson_id] for lesson_id in UNIT_1_IDS[:9]]

        def card_signature(card):
            correct = next(
                option for option in card.options if option.id == card.correct_option_id
            )
            return (
                (card.audio_text or card.answer_audio_text or card.prompt or "").strip().lower(),
                card.prompt_image_url or correct.image_url,
            )

        for previous, current in zip(unit_lessons, unit_lessons[1:]):
            overlap = {
                card_signature(card) for card in previous.cards
            } & {
                card_signature(card) for card in current.cards
            }
            with self.subTest(previous=previous.id, current=current.id):
                self.assertEqual(set(), overlap)

    def test_lesson_1_9_is_a_fresh_comprehensive_review(self):
        review = LESSONS["lesson-9-unit-review"]
        self.assertEqual([], review.vocabulary)

        review_media = {
            urlparse(url).path.rsplit("/", 1)[-1]
            for card in review.cards
            for url in [card.prompt_image_url, *(option.image_url for option in card.options)]
            if url
        }
        earlier_media = {
            urlparse(url).path.rsplit("/", 1)[-1]
            for lesson_id in UNIT_1_IDS[:8]
            for card in LESSONS[lesson_id].cards
            for url in [card.prompt_image_url, *(option.image_url for option in card.options)]
            if url
        }
        self.assertTrue(review_media)
        self.assertTrue(all(name.startswith("a1_u1_review_") for name in review_media))
        self.assertEqual(set(), review_media & earlier_media)

        declared = {
            word.lower()
            for lesson_id in UNIT_1_IDS[:8]
            for word in LESSONS[lesson_id].vocabulary
        }
        review_text = " ".join(
            text
            for card in review.cards
            for text in [
                card.prompt or "",
                card.audio_text or "",
                card.answer_audio_text or "",
                *(option.label or "" for option in card.options),
            ]
        )
        tokens = set(re.findall(r"[a-z]+", review_text.lower()))
        coverage = len(declared & tokens) / len(declared)
        self.assertGreaterEqual(coverage, 0.70)

    def test_each_rebuilt_lesson_ends_with_ordered_multi_word_construction(self):
        for lesson_id in UNIT_1_IDS[1:9]:
            cards = [card for card in LESSONS[lesson_id].cards if card.correct_option_ids]
            with self.subTest(lesson=lesson_id):
                self.assertTrue(cards)
                self.assertTrue(all(card.prompt.count("___") >= 2 for card in cards))
                self.assertTrue(all(len(card.correct_option_ids) >= 2 for card in cards))

    def test_lesson_1_2_reuses_pronouns_only_inside_larger_ideas(self):
        lesson = LESSONS["lesson-2-pronouns"]
        self.assertNotIn("he", lesson.vocabulary)
        self.assertNotIn("she", lesson.vocabulary)
        self.assertIn("he", lesson.review_vocabulary)
        self.assertIn("she", lesson.review_vocabulary)
        learn_prompts = {card.prompt.strip().lower() for card in lesson.cards if card.stage == "Learn"}
        self.assertFalse({"he", "she"} & learn_prompts)

    def test_every_lesson_uses_the_same_five_stage_shell(self):
        for lesson in LESSONS.values():
            with self.subTest(lesson=lesson.id):
                self.assertEqual(STAGES, list(dict.fromkeys(card.stage for card in lesson.cards)))
                self.assertNotIn("Grammar", {card.stage for card in lesson.cards})

    def test_stage_counts_and_lesson_lengths_are_intentional(self):
        for lesson_id, expected_counts in EXPECTED_STAGE_COUNTS.items():
            lesson = LESSONS[lesson_id]
            counts = {
                stage: sum(card.stage == stage for card in lesson.cards)
                for stage in STAGES
            }
            with self.subTest(lesson=lesson_id):
                self.assertEqual(expected_counts, counts)
                self.assertGreaterEqual(len(lesson.cards), 30)
                self.assertLessEqual(len(lesson.cards), 54)

    def test_vocabulary_load_matches_the_curriculum_contract(self):
        for lesson_id, expected in EXPECTED_VOCABULARY.items():
            with self.subTest(lesson=lesson_id):
                self.assertEqual(expected, set(LESSONS[lesson_id].vocabulary))

    def test_preview_snapshots_match_all_unit_1_lessons(self):
        snapshot_root = Path(__file__).resolve().parents[2] / "mobile" / "src" / "generated"
        for lesson in LESSONS.values():
            snapshot_path = snapshot_root / f"{lesson.id}.json"
            with self.subTest(lesson=lesson.id):
                self.assertTrue(snapshot_path.is_file(), snapshot_path)
                snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
                self.assertEqual(lesson_payload(lesson), snapshot)

    def test_cards_have_valid_answers_and_existing_assets(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                option_ids = [option.id for option in card.options]
                with self.subTest(lesson=lesson.id, card=index):
                    self.assertEqual(len(option_ids), len(set(option_ids)))
                    self.assertIn(card.correct_option_id, option_ids)

                option_image_urls = [option.image_url for option in card.options if option.image_url]
                with self.subTest(lesson=lesson.id, card=index, check="unique visible choices"):
                    self.assertEqual(len(option_image_urls), len(set(option_image_urls)))

                media_urls = [card.prompt_image_url] if card.prompt_image_url else []
                media_urls.extend(option.image_url for option in card.options if option.image_url)
                for media_url in media_urls:
                    asset_name = urlparse(media_url).path.rsplit("/", 1)[-1]
                    with self.subTest(lesson=lesson.id, card=index, asset=asset_name):
                        self.assertTrue((LESSON_IMAGE_DIR / asset_name).is_file())

    def test_text_only_cards_have_at_most_three_options(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                if not card.options or any(option.image_url for option in card.options):
                    continue
                with self.subTest(lesson=lesson.id, card=index):
                    self.assertLessEqual(len(card.options), 3)
                    self.assertIn(card.correct_option_id, [option.id for option in card.options])

    def test_recognize_connects_images_and_text_in_both_directions(self):
        for unit in range(1, 8):
            cards = [
                card for lesson in LESSONS.values() if lesson.unit_id == f"unit-{unit}"
                for card in lesson.cards if card.stage == "Recognize"
            ]
            text_to_image = [
                card for card in cards
                if not card.prompt_image_url and all(option.image_url for option in card.options)
            ]
            image_to_text = [
                card for card in cards
                if card.prompt_image_url and all(not option.image_url for option in card.options)
            ]
            with self.subTest(unit=unit):
                self.assertTrue(text_to_image)
                self.assertTrue(image_to_text)
                self.assertTrue(all(card.audio_text == card.prompt for card in text_to_image))
                self.assertTrue(all(
                    (not card.audio_text and card.answer_audio_text)
                    or (card.prompt and card.audio_text == card.prompt)
                    or (card.audio_text and card.answer_audio_text)
                    for card in image_to_text
                ))

    def test_lesson_8_identity_text_choices_ask_the_question_up_front(self):
        cards = [
            card
            for card in LESSONS["lesson-8-who"].cards
            if card.stage == "Recognize"
            and card.prompt_image_url
            and all(not option.image_url and option.label for option in card.options)
        ]
        self.assertEqual(5, len(cards))
        for card in cards:
            with self.subTest(prompt=card.prompt):
                self.assertIn(card.prompt, {"Who is he?", "Who is she?", "Who are they?"})
                self.assertEqual(card.prompt, card.audio_text)
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertEqual(correct_option.label, card.answer_audio_text)

    def test_lesson_10_identity_text_choices_ask_the_question_up_front(self):
        cards = [
            card
            for card in LESSONS["lesson-10-family-mission"].cards
            if card.stage == "Recognize"
            and card.prompt_image_url
            and card.prompt == "Who are they?"
        ]
        self.assertEqual(3, len(cards))
        for card in cards:
            with self.subTest(image=card.prompt_image_url):
                self.assertEqual("Who are they?", card.audio_text)
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertEqual(correct_option.label, card.answer_audio_text)
                self.assertNotIn("Who are they?", card.answer_audio_text)

    def test_lesson_2_6_object_identity_card_uses_aligned_question_and_answers(self):
        card = next(
            card
            for card in LESSONS["lesson-2-6-numbers-1-10"].cards
            if card.slide_id == "R8"
        )

        self.assertEqual("Recognize", card.stage)
        self.assertEqual("What is it?", card.prompt)
        self.assertEqual(card.prompt, card.audio_text)
        self.assertEqual(
            ["It is a phone.", "It is a bag."],
            [option.label for option in card.options],
        )
        correct_option = next(
            option for option in card.options if option.id == card.correct_option_id
        )
        self.assertEqual("It is a phone.", correct_option.label)
        self.assertEqual(correct_option.label, card.answer_audio_text)

    def test_listen_hides_text_and_uses_audio_with_image_choices(self):
        for lesson in LESSONS.values():
            cards = [card for card in lesson.cards if card.stage == "Listen"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(card.prompt == "Listen and choose." for card in cards))
                self.assertTrue(all(card.audio_text for card in cards))
                self.assertTrue(all(
                    all(option.image_url for option in card.options)
                    or all(not option.image_url and option.label for option in card.options)
                    for card in cards
                ))

    def test_family_image_choices_do_not_use_overlapping_categories(self):
        forbidden_distractors = {
            "Children": {"babies", "brothers", "sisters", "family"},
            "They are children.": {"babies", "brothers", "sisters", "family"},
            "They are brothers.": {"children", "family"},
            "They are sisters.": {"children", "family"},
            "They are the brothers.": {"babies", "children", "family"},
            "They are the sisters.": {"babies", "children", "family"},
            "Who are they? They are the brothers.": {"babies", "children", "family"},
            "Who are they? They are the sisters.": {"babies", "children", "family"},
            "They are a family.": {
                "babies", "brothers", "sisters", "children", "parents", "grandparents",
            },
        }
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                spoken_text = card.audio_text or card.answer_audio_text or card.prompt
                forbidden = forbidden_distractors.get(spoken_text)
                if not forbidden or not all(option.image_url for option in card.options):
                    continue
                distractor_ids = {
                    option.id for option in card.options
                    if option.id != card.correct_option_id
                }
                with self.subTest(lesson=lesson.id, card=index, spoken_text=spoken_text):
                    self.assertFalse(forbidden & distractor_ids)

    def test_negative_listening_uses_an_exact_binary_contrast(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                audio = (card.audio_text or "").lower()
                if (
                    card.stage != "Listen"
                    or not re.search(r"\b(?:is|are) not\b", audio)
                    or not all(option.image_url for option in card.options)
                ):
                    continue
                with self.subTest(lesson=lesson.id, card=index, audio=card.audio_text):
                    self.assertEqual(2, len(card.options))

    def test_lesson_1_7_negative_contrasts_confirm_the_positive_action(self):
        lesson = LESSONS["lesson-7-is-are-not"]
        cards = [
            card
            for card in lesson.cards
            if (
                card.stage in {"Recognize", "Listen"}
                and re.search(r"\b(?:is|are) not\b", card.audio_text or "", re.IGNORECASE)
            )
        ]
        self.assertEqual(10, len(cards))
        for card in cards:
            with self.subTest(stage=card.stage, slide=card.slide_id):
                self.assertEqual(2, len(card.options))
                if card.stage == "Recognize":
                    self.assertTrue(card.prompt_image_url)
                    self.assertTrue(all(not option.image_url for option in card.options))
                else:
                    self.assertFalse(card.prompt_image_url)
                    self.assertTrue(all(option.image_url for option in card.options))
                correct = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertIn(" not ", f" {correct.label.lower()} ")
                self.assertTrue(card.answer_audio_text)
                self.assertRegex(
                    card.answer_audio_text.lower(),
                    r"\b(talking|writing|running|playing|sitting)\b",
                )

    def test_specific_identity_choices_include_the_answer_in_the_audio(self):
        for lesson in LESSONS.values():
            for index, card in enumerate(lesson.cards, 1):
                audio = card.audio_text or ""
                if (
                    card.stage != "Recognize"
                    or card.prompt_image_url
                    or not audio.lower().startswith("who ")
                ):
                    continue
                with self.subTest(lesson=lesson.id, card=index, audio=audio):
                    self.assertRegex(audio, r"\?\s+(He|She|They) (is|are) ")

    def test_speak_uses_one_clear_image_and_a_model_phrase(self):
        for lesson in LESSONS.values():
            cards = [card for card in lesson.cards if card.stage == "Speak"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(cards)
                self.assertTrue(all(card.prompt and card.audio_text == card.prompt for card in cards))
                self.assertTrue(all(len(card.options) == 1 for card in cards))
                self.assertTrue(all(card.options[0].image_url for card in cards))

    def test_use_is_interactive_completion_not_a_grammar_section(self):
        for lesson in LESSONS.values():
            cards = [card for card in lesson.cards if card.stage == "Use"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(cards)
                self.assertTrue(all(card.interaction_type in {
                    None, "choice", "choose2", "choose4", "complete", "complete2",
                    "complete4", "response-choice",
                } for card in cards))
                self.assertTrue(all(card.answer_audio_text for card in cards))
                self.assertTrue(all(all(not option.image_url and option.label for option in card.options) for card in cards))

    def test_shared_course_audio_boundary_rejects_visual_blanks(self):
        from backend.app.course_audio import sanitize_course_audio_text

        examples = [
            "It is a ___.",
            "___ is a school.",
            "What ___ it?",
            "I [pause] agree.",
            "I [blank] agree.",
            "It is a {blank}.",
            "It is a ...",
            "It is a …",
        ]
        for example in examples:
            with self.subTest(example=example), self.assertRaises(ValueError):
                sanitize_course_audio_text(example)

    def test_learn_starts_with_clear_single_visual_anchors(self):
        for lesson in list(LESSONS.values())[:8]:
            cards = [card for card in lesson.cards if card.stage == "Learn"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(len(card.options) == 1 for card in cards))
                self.assertTrue(all(card.options[0].image_url for card in cards))
                self.assertTrue(all(card.audio_text for card in cards))

    def test_lesson_1_builds_identity_before_actions(self):
        lesson = LESSONS["lesson-1-people-actions"]
        self.assertEqual(
            [
                "A boy",
                "He",
                "He is a boy.",
                "A girl",
                "She",
                "She is a girl.",
                "A man",
                "He is a man.",
                "A woman",
                "She is a woman.",
            ],
            [card.prompt for card in lesson.cards if card.stage == "Learn"],
        )
        self.assertEqual([], lesson.review_vocabulary)
        self.assertEqual([], lesson.purposeful_review_slides)
        self.assertTrue(lesson.unit_outcome)
        self.assertTrue(lesson.grammar_function)
        self.assertTrue(lesson.prerequisite)
        self.assertTrue(lesson.speaking_outcome)
        self.assertTrue(all(card.slide_id for card in lesson.cards))
        self.assertTrue(all(card.interaction_type for card in lesson.cards))
        self.assertTrue(all(card.spanish_translation for card in lesson.cards))
        self.assertTrue(all(card.pedagogy_note for card in lesson.cards))
        action_words = {"running", "walking", "sitting", "standing"}
        self.assertFalse(action_words & set(lesson.vocabulary))

    def test_lesson_1_varies_clothing_without_changing_the_people_contract(self):
        lesson = LESSONS["lesson-1-people-actions"]
        referenced_images = {
            urlparse(image_url).path.rsplit("/", 1)[-1]
            for card in lesson.cards
            for image_url in [
                card.prompt_image_url,
                *(option.image_url for option in card.options),
            ]
            if image_url
        }
        for person in ("boy", "girl", "man", "woman"):
            with self.subTest(person=person):
                self.assertIn(f"{person}.webp", referenced_images)
                self.assertIn(f"a1_l1_{person}_alt.webp", referenced_images)
                self.assertIn(f"a1_l1_{person}_transfer.webp", referenced_images)
        course_source = (
            Path(__file__).resolve().parents[2]
            / "mobile"
            / "src"
            / "screens"
            / "CourseScreen.tsx"
        ).read_text(encoding="utf-8")
        self.assertIn("image: 'a1_l1_people_together.webp'", course_source)

    def test_lesson_1_repeats_one_story_order_through_every_stage(self):
        lesson = LESSONS["lesson-1-people-actions"]
        person_rank = {"boy": 0, "girl": 1, "man": 2, "woman": 3}

        for stage in STAGES:
            targets = []
            for card in lesson.cards:
                if card.stage != stage:
                    continue
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                targets.append(" ".join([
                    card.answer_audio_text or "",
                    card.audio_text or "",
                    card.prompt or "",
                    correct_option.label or "",
                    correct_option.image_url or "",
                ]))
            ranks = [
                next(
                    person_rank[person]
                    for person in person_rank
                    if re.search(
                        rf"\b{person}\b",
                        re.sub(r"[^a-z]+", " ", target.lower()),
                    )
                )
                for target in targets
            ]
            with self.subTest(stage=stage):
                self.assertEqual(sorted(ranks), ranks)

        self.assertGreaterEqual(
            len({card.interaction_type for card in lesson.cards if card.stage == "Recognize"}),
            3,
        )
        self.assertGreaterEqual(
            len({card.interaction_type for card in lesson.cards if card.stage == "Listen"}),
            3,
        )

    def test_lesson_1_closes_with_ordered_two_word_completions(self):
        cards = [
            card for card in LESSONS["lesson-1-people-actions"].cards
            if card.correct_option_ids
        ]
        self.assertEqual(["U5", "U7"], [card.slide_id for card in cards])
        self.assertEqual([["he", "a"], ["she", "a"]], [card.correct_option_ids for card in cards])
        self.assertTrue(all(card.prompt.count("___") == 2 for card in cards))

    def test_new_words_continue_into_active_stages(self):
        expected_examples = {
            "lesson-3-two-people": ["They are running.", "He is swimming.", "She is sleeping."],
            "lesson-4-children-siblings": ["They are children.", "They are brothers.", "They are sisters."],
            "lesson-5-parents-grandparents": ["They are the parents.", "They are the grandparents."],
            "lesson-6-family-actions": ["The father is working.", "The mother is cooking.", "The parents are talking."],
            "lesson-7-is-are-not": ["He is not cooking.", "They are not sitting."],
            "lesson-8-who": ["Who is he?", "Who are they?"],
        }
        for lesson_id, phrases in expected_examples.items():
            active_text = {
                card.audio_text or card.answer_audio_text or card.prompt
                for card in LESSONS[lesson_id].cards
                if card.stage in {"Listen", "Speak", "Use"}
            }
            with self.subTest(lesson=lesson_id):
                self.assertTrue(set(phrases).issubset(active_text))

    def test_mobile_action_video_map_only_references_existing_clips(self):
        root = Path(__file__).resolve().parents[2]
        mapping_source = (root / "mobile" / "src" / "actionVideos.ts").read_text(encoding="utf-8")
        video_references = re.findall(r"'([^']+-scene-v\d+\.mp4)'", mapping_source)
        self.assertTrue(video_references)
        for video_reference in set(video_references):
            video_name = Path(video_reference).name
            with self.subTest(video=video_name):
                self.assertTrue((root / "frontend" / "public" / "lesson-assets" / video_name).is_file())

    def test_action_video_normalizer_preserves_source_quality(self):
        root = Path(__file__).resolve().parents[2]
        generator_source = (root / "scripts" / "generate_lesson_action_videos.py").read_text(
            encoding="utf-8"
        )
        normalize_existing_source = generator_source.split("def normalize_existing() -> None:", 1)[1].split(
            "\ndef main() -> None:", 1
        )[0]

        self.assertIn('"-crf", "20"', generator_source)
        self.assertIn("RAW_DIR", normalize_existing_source)
        self.assertNotIn('ASSETS.glob("*-scene-v2.mp4")', normalize_existing_source)


if __name__ == "__main__":
    unittest.main()
