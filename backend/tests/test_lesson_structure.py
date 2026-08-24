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
UNIT_2_IDS = [
    "lesson-11-places-around-me",
    "lesson-12-streets-and-transportation",
    "lesson-13-common-objects",
    "lesson-14-what-is-it",
    "lesson-15-this-and-that",
    "lesson-16-numbers-1-10",
    "lesson-17-basic-colors",
    "lesson-18-count-and-describe",
    "lesson-19-unit-2-review",
    "lesson-20-around-me-mission",
]
UNIT_1_TITLES = [
    "People and Core Actions",
    "He and She",
    "Two People: They and Are",
    "Children and Siblings",
    "Parents and Grandparents",
    "Family Actions",
    "Is, Are, and Not",
    "Who Is He? Who Are They?",
    "Unit 1 Spiral Review",
    "Family Scene Mission",
]
UNIT_2_TITLES = [
    "Places Around Me",
    "Streets and Transportation",
    "Common Objects",
    "What Is It?",
    "This and That",
    "Numbers 1-10",
    "Basic Colors",
    "Count and Describe",
    "Unit 2 Review",
    "Around Me Mission",
]
EXPECTED_VOCABULARY = {
    "lesson-1-people-actions": {
        "the", "is", "boy", "girl", "man", "woman",
        "running", "walking", "sitting", "standing",
    },
    "lesson-2-pronouns": {"he", "she", "eating", "drinking", "reading", "writing"},
    "lesson-3-two-people": {"and", "they", "are", "swimming", "sleeping"},
    "lesson-4-children-siblings": {
        "family", "baby", "babies", "child", "children",
        "brother", "brothers", "sister", "sisters",
    },
    "lesson-5-parents-grandparents": {
        "adult", "adults", "father", "mother", "parents",
        "grandfather", "grandmother", "grandparents",
    },
    "lesson-6-family-actions": {"playing", "studying", "working", "cooking", "talking"},
    "lesson-7-is-are-not": {"not"},
    "lesson-8-who": {"who"},
    "lesson-9-unit-review": set(),
    "lesson-10-family-mission": set(),
    "lesson-11-places-around-me": {
        "park", "school", "store", "house", "restaurant", "hospital", "it",
    },
    "lesson-12-streets-and-transportation": {"street", "bridge", "bus", "car", "bike"},
    "lesson-13-common-objects": {"book", "pen", "phone", "bag", "chair", "table"},
    "lesson-14-what-is-it": {"what", "What is it?"},
    "lesson-15-this-and-that": {"this", "that"},
    "lesson-16-numbers-1-10": {
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    },
    "lesson-17-basic-colors": {"red", "blue", "green", "yellow", "black", "white"},
    "lesson-18-count-and-describe": {"books", "pens", "phones", "bags", "cars"},
    "lesson-19-unit-2-review": set(),
    "lesson-20-around-me-mission": set(),
}
EXPECTED_STAGE_COUNTS = {
    "lesson-1-people-actions": {"Learn": 8, "Recognize": 12, "Listen": 8, "Speak": 8, "Use": 8},
    "lesson-2-pronouns": {"Learn": 8, "Recognize": 10, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-3-two-people": {"Learn": 9, "Recognize": 10, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-4-children-siblings": {"Learn": 9, "Recognize": 9, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-5-parents-grandparents": {"Learn": 10, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-6-family-actions": {"Learn": 10, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-7-is-are-not": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-8-who": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-9-unit-review": {"Learn": 4, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-10-family-mission": {"Learn": 4, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-11-places-around-me": {"Learn": 8, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-12-streets-and-transportation": {"Learn": 8, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-13-common-objects": {"Learn": 8, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-14-what-is-it": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-15-this-and-that": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-16-numbers-1-10": {"Learn": 10, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-17-basic-colors": {"Learn": 8, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 6},
    "lesson-18-count-and-describe": {"Learn": 6, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-19-unit-2-review": {"Learn": 4, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
    "lesson-20-around-me-mission": {"Learn": 4, "Recognize": 8, "Listen": 6, "Speak": 6, "Use": 8},
}


def lesson_payload(lesson):
    if hasattr(lesson, "model_dump"):
        payload = lesson.model_dump(mode="json")
    else:
        payload = json.loads(lesson.json())
    for card in payload.get("cards", []):
        if card.get("spanish_translation") is None:
            card.pop("spanish_translation", None)
    return payload


def lessons_in_unit(unit_id):
    return [lesson for lesson in LESSONS.values() if lesson.unit_id == unit_id]


def media_asset_name(media_url):
    return urlparse(media_url).path.rsplit("/", 1)[-1]


class LessonStructureTests(unittest.TestCase):
    def test_unit_1_follows_the_approved_ten_lesson_roadmap(self):
        unit_lessons = lessons_in_unit("unit-1")
        self.assertEqual(UNIT_1_IDS, [lesson.id for lesson in unit_lessons])
        self.assertEqual(
            [f"1.{index}" for index in range(1, 11)],
            [lesson.sub_lesson_id for lesson in unit_lessons],
        )
        self.assertEqual(UNIT_1_TITLES, [lesson.sub_lesson_title for lesson in unit_lessons])

    def test_unit_2_follows_the_approved_ten_lesson_roadmap(self):
        unit_lessons = lessons_in_unit("unit-2")
        self.assertEqual(UNIT_2_IDS, [lesson.id for lesson in unit_lessons])
        self.assertEqual(
            [f"2.{index}" for index in range(1, 11)],
            [lesson.sub_lesson_id for lesson in unit_lessons],
        )
        self.assertEqual(UNIT_2_TITLES, [lesson.sub_lesson_title for lesson in unit_lessons])

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
                self.assertLessEqual(len(lesson.cards), 44)

    def test_vocabulary_load_matches_the_curriculum_contract(self):
        for lesson_id, expected in EXPECTED_VOCABULARY.items():
            with self.subTest(lesson=lesson_id):
                self.assertEqual(expected, set(LESSONS[lesson_id].vocabulary))

    def test_lesson_2_reading_completion_uses_three_relevant_options(self):
        lesson = LESSONS["lesson-2-pronouns"]
        card = next(
            card
            for card in lesson.cards
            if card.stage == "Use"
            and card.prompt == "She is ___."
            and card.correct_option_id == "reading"
        )
        self.assertEqual(
            ["drinking", "reading", "writing"],
            sorted(option.id for option in card.options),
        )

    def test_preview_snapshots_match_all_lessons(self):
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

    def test_recognize_connects_images_and_text_in_both_directions(self):
        for lesson in LESSONS.values():
            cards = [card for card in lesson.cards if card.stage == "Recognize"]
            text_to_image = [
                card for card in cards
                if not card.prompt_image_url and all(option.image_url for option in card.options)
            ]
            image_to_text = [
                card for card in cards
                if card.prompt_image_url and all(not option.image_url for option in card.options)
            ]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(text_to_image)
                self.assertTrue(image_to_text)
                self.assertTrue(all(card.audio_text == card.prompt for card in text_to_image))
                self.assertTrue(all(
                    (not card.audio_text and card.answer_audio_text)
                    or (card.prompt and card.audio_text == card.prompt)
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
        self.assertEqual(4, len(cards))
        for card in cards:
            with self.subTest(prompt=card.prompt):
                self.assertIn(card.prompt, {"Who is he?", "Who is she?", "Who are they?"})
                self.assertEqual(card.prompt, card.audio_text)
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                self.assertEqual(correct_option.label, card.answer_audio_text)

    def test_listen_hides_answer_text_and_uses_one_clear_choice_mode(self):
        for lesson in LESSONS.values():
            cards = [card for card in lesson.cards if card.stage == "Listen"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(card.prompt == "Listen and choose." for card in cards))
                self.assertTrue(all(card.audio_text for card in cards))
                self.assertTrue(any(all(option.image_url for option in card.options) for card in cards))
                self.assertTrue(all(
                    all(option.image_url for option in card.options)
                    or all(not option.image_url and option.label for option in card.options)
                    for card in cards
                ))
                if lesson.unit_id == "unit-2":
                    self.assertTrue(all(
                        not (option.label or "").strip()
                        for card in cards
                        for option in card.options
                        if option.image_url
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
                if card.stage != "Listen" or " not " not in (card.audio_text or "").lower():
                    continue
                with self.subTest(lesson=lesson.id, card=index, audio=card.audio_text):
                    self.assertEqual(2, len(card.options))

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

    def test_use_is_interactive_completion_or_supported_choice_not_a_grammar_section(self):
        for lesson in LESSONS.values():
            cards = [card for card in lesson.cards if card.stage == "Use"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(
                    "___" in card.prompt
                    or card.prompt.endswith("?")
                    or card.prompt.lower().startswith("choose ")
                    for card in cards
                ))
                self.assertTrue(all(card.prompt_image_url for card in cards))
                self.assertTrue(all(card.answer_audio_text for card in cards))
                self.assertTrue(all(all(not option.image_url and option.label for option in card.options) for card in cards))

    def test_learn_starts_with_clear_single_visual_anchors(self):
        for lesson in LESSONS.values():
            cards = [card for card in lesson.cards if card.stage == "Learn"]
            with self.subTest(lesson=lesson.id):
                self.assertTrue(all(len(card.options) == 1 for card in cards))
                self.assertTrue(all(card.options[0].image_url for card in cards))
                self.assertTrue(all(card.audio_text for card in cards))

    def test_lesson_1_position_change_keeps_the_same_person(self):
        cards = {
            card.prompt: card
            for card in LESSONS["lesson-1-people-actions"].cards
            if card.stage == "Learn" and card.prompt in {"Sitting", "Standing"}
        }
        self.assertEqual(
            ["man_is_sitting.webp", "man_is_standing.webp"],
            [
                urlparse(cards[prompt].options[0].image_url).path.rsplit("/", 1)[-1]
                for prompt in ["Sitting", "Standing"]
            ],
        )

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

    def test_unit_2_new_language_reaches_active_practice(self):
        for lesson in lessons_in_unit("unit-2")[:8]:
            active_parts = []
            for card in lesson.cards:
                if card.stage not in {"Recognize", "Listen", "Speak", "Use"}:
                    continue
                active_parts.extend([
                    card.prompt,
                    card.audio_text or "",
                    card.answer_audio_text or "",
                    card.correct_option_id,
                ])
                active_parts.extend(option.id for option in card.options)
                active_parts.extend(option.label or "" for option in card.options)
            active_text = " ".join(active_parts).lower()
            for vocabulary_item in lesson.vocabulary:
                with self.subTest(lesson=lesson.id, vocabulary=vocabulary_item):
                    self.assertIn(vocabulary_item.lower(), active_text)

    def test_unit_2_spiral_review_covers_each_dependency_group(self):
        review_text = " ".join(
            part
            for lesson_id in UNIT_2_IDS[-2:]
            for card in LESSONS[lesson_id].cards
            for part in [
                card.prompt,
                card.audio_text or "",
                card.answer_audio_text or "",
                *(option.id for option in card.options),
                *(option.label or "" for option in card.options),
            ]
        ).lower()
        for sample in [
            "park", "bus", "book", "what", "this", "that", "two", "three",
            "blue", "green", "cars", "books",
        ]:
            with self.subTest(sample=sample):
                self.assertIn(sample, review_text)

    def test_unit_2_avoids_untaught_location_language(self):
        forbidden = re.compile(r"\b(in|on|at|near|far|where)\b", re.IGNORECASE)
        for lesson in lessons_in_unit("unit-2"):
            for index, card in enumerate(lesson.cards, 1):
                learner_text = [
                    card.prompt,
                    card.audio_text or "",
                    card.answer_audio_text or "",
                    *(option.label or "" for option in card.options),
                ]
                with self.subTest(lesson=lesson.id, card=index):
                    self.assertFalse(any(forbidden.search(text) for text in learner_text))

    def test_unit_2_has_exact_contextual_spanish_for_every_card(self):
        for lesson in lessons_in_unit("unit-2"):
            for index, card in enumerate(lesson.cards, 1):
                with self.subTest(lesson=lesson.id, card=index):
                    self.assertTrue((card.spanish_translation or "").strip())
                    self.assertNotEqual(
                        "Traducción no disponible todavía.",
                        card.spanish_translation,
                    )

    def test_unit_2_places_use_the_approved_non_leaking_images(self):
        learn_cards = {
            card.prompt: card
            for card in LESSONS["lesson-11-places-around-me"].cards
            if card.stage == "Learn"
        }
        self.assertEqual(
            "unit2_restaurant.webp",
            media_asset_name(learn_cards["A restaurant"].options[0].image_url),
        )
        self.assertEqual(
            "unit2_hospital.webp",
            media_asset_name(learn_cards["A hospital"].options[0].image_url),
        )
        curriculum_path = Path(__file__).resolve().parents[2] / "docs" / "product" / "unit-2-curriculum.json"
        curriculum = json.loads(curriculum_path.read_text(encoding="utf-8"))["unit"]
        places = next(lesson for lesson in curriculum["lessons"] if lesson["id"] == "2.1")
        self.assertIn("only by a large H", places["scene_contract"]["hospital"])
        self.assertIn("no written RESTAURANT label", places["scene_contract"]["restaurant"])

    def test_unit_2_numbers_use_the_realistic_metal_series(self):
        learn_cards = [
            card for card in LESSONS["lesson-16-numbers-1-10"].cards
            if card.stage == "Learn"
        ]
        self.assertEqual(
            [f"unit2_n{number}.webp" for number in range(1, 11)],
            [media_asset_name(card.options[0].image_url) for card in learn_cards],
        )
        self.assertNotIn(
            "unit2_q",
            " ".join(
                option.image_url
                for card in LESSONS["lesson-16-numbers-1-10"].cards
                for option in card.options
            ),
        )
        curriculum_path = Path(__file__).resolve().parents[2] / "docs" / "product" / "unit-2-curriculum.json"
        curriculum = json.loads(curriculum_path.read_text(encoding="utf-8"))["unit"]
        numbers = next(lesson for lesson in curriculum["lessons"] if lesson["id"] == "2.6")
        for number in range(1, 11):
            contract = numbers["scene_contract"][f"n{number}"]
            with self.subTest(number=number):
                self.assertIn("brushed-metal", contract)
                self.assertIn(f"exactly {number} separate gold stars", contract)
                self.assertIn("no plain dot counter", contract)

    def test_unit_2_this_that_and_mission_keep_visual_context(self):
        this_that_media = {
            media_asset_name(media_url)
            for card in LESSONS["lesson-15-this-and-that"].cards
            for media_url in [
                card.prompt_image_url,
                *(option.image_url for option in card.options),
            ]
            if media_url
        }
        self.assertTrue(any(name.startswith("unit2_near_") for name in this_that_media))
        self.assertTrue(any(name.startswith("unit2_far_") for name in this_that_media))

        mission_media = {
            media_asset_name(media_url)
            for card in LESSONS["lesson-20-around-me-mission"].cards
            for media_url in [
                card.prompt_image_url,
                *(option.image_url for option in card.options),
            ]
            if media_url
        }
        self.assertTrue({
            "unit2_mission_park.webp",
            "unit2_mission_bus.webp",
            "unit2_mission_book_near.webp",
            "unit2_mission_bag_far.webp",
            "unit2_mission_two_blue_cars.webp",
            "unit2_mission_three_green_books.webp",
            "unit2_mission_four_yellow_pens.webp",
            "unit2_mission_school.webp",
            "unit2_mission_store.webp",
        }.issubset(mission_media))

    def test_mobile_action_video_map_only_references_existing_clips(self):
        root = Path(__file__).resolve().parents[2]
        mapping_source = (root / "mobile" / "src" / "actionVideos.ts").read_text(encoding="utf-8")
        video_names = re.findall(r"'([^']+-scene-v2\.mp4)'", mapping_source)
        self.assertTrue(video_names)
        for video_name in video_names:
            with self.subTest(video=video_name):
                self.assertTrue((root / "frontend" / "public" / "lesson-assets" / video_name).is_file())

if __name__ == "__main__":
    unittest.main()
