"""Acceptance contract for the approved 4.9 question-first worked example.

The wider engine rollout is separate. These checks protect this reviewed
sequence in every stage, written recognition with pronunciation, and its authoring source.
"""
import calendar
import hashlib
import json
from pathlib import Path
import re
import unittest

from PIL import Image

from scripts.content_engine.install import lesson_text
from scripts.content_engine.plan import compose_lesson

ROOT = Path(__file__).resolve().parents[2]
LESSON_PATH = ROOT / "backend/lessons/unit_4/lesson-4-8-days-and-time.yaml"
PLAN_PATH = ROOT / "docs/product/content-plans/4.9-approved-unit4-v1.plan.json"
BOARD_RECEIPT_PATH = ROOT / "docs/product/weekday-calendar-board-v1.json"
QUESTION = "What day is it today?"
QUESTION_ES = "¿Qué día es hoy?"
# The order and answer banks were approved in the review mockup. Runtime
# shuffling may vary answer positions, but must not reorder these cards.
SEQUENCE = (
    ("Monday", "text", ("Monday", "Tuesday")),
    ("Monday", "image", ("Monday", "Tuesday")),
    ("Tuesday", "text", ("Tuesday", "Monday")),
    ("Tuesday", "image", ("Tuesday", "Wednesday")),
    ("Wednesday", "text", ("Wednesday", "Tuesday")),
    ("Wednesday", "image", ("Wednesday", "Thursday")),
    ("Thursday", "text", ("Thursday", "Wednesday", "Friday")),
    ("Friday", "text", ("Friday", "Thursday", "Saturday")),
    ("Saturday", "text", ("Saturday", "Friday", "Sunday")),
    ("Sunday", "text", ("Sunday", "Saturday", "Monday")),
)
# The user corrected the sound-off interpretation and extended the complete
# calendar boards to every section. Re-importing the accepted plan preserves
# that reviewed presentation, while the explicit assertions protect its meaning.
PRESERVED_STAGE_DIGESTS = {
    "Learn": "74c4440c9ea6093da6adf2a8eb78c886acc48daf13657856d823356d1dbb43b5",
    "Recognize": "ae4f38ff017d880afb85a43e3c2ec239a06c1d23e31706b8faa47b2a697ae60b",
}


def board(day):
    return f"/lesson-assets/a1_photo_u4_days_week_board_{day.lower()}_v1.webp"


def blue_components(image):
    """Measure dark blue ink in the pixels, independent of filenames/receipt.

    Eight-way connectivity retains the slightly uneven pen loop. Small blue
    house/school windows are classified separately by their measured bounds.
    """
    pixels = image.convert("RGB").load()
    mask = set()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue = pixels[x, y]
            if red < 100 and green < 145 and blue > 95 and blue - red > 55 and blue - green > 30:
                mask.add((x, y))
    components = []
    while mask:
        first = mask.pop()
        pending, points = [first], [first]
        while pending:
            x, y = pending.pop()
            for adjacent_x in (x - 1, x, x + 1):
                for adjacent_y in (y - 1, y, y + 1):
                    point = (adjacent_x, adjacent_y)
                    if point in mask:
                        mask.remove(point)
                        pending.append(point)
                        points.append(point)
        components.append(points)
    return components


class WeekdayRecognizeSequenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lesson = json.loads(LESSON_PATH.read_text(encoding="utf-8"))
        cls.cards = [card for card in cls.lesson["cards"] if card["stage"] == "Recognize"]

    def test_question_leads_the_reviewed_weekday_order_in_both_directions(self):
        learn = [card for card in self.lesson["cards"] if card["stage"] == "Learn"]
        self.assertEqual(learn[0]["prompt"], QUESTION)
        self.assertEqual(len(self.cards), len(SEQUENCE))
        for index, (card, (day, direction, alternatives)) in enumerate(zip(self.cards, SEQUENCE), 1):
            with self.subTest(slide=card["slide_id"]):
                self.assertEqual(card["slide_id"], f"R{index}")
                self.assertEqual(card["prompt"], f"{QUESTION}\n{day}" if direction == "image" else QUESTION)
                self.assertEqual(card["interaction_type"], f"t2i{len(alternatives)}" if direction == "image" else f"i2t{len(alternatives)}")
                self.assertEqual(card["answer_audio_text"], f"Today is {day}.")
        # After each early reverse reinforcement, advance through the same
        # Monday-to-Sunday target order that Learn introduced.
        ordered_days = list(dict.fromkeys(day for day, _, _ in SEQUENCE))
        self.assertEqual([card["prompt"] for card in learn[1:]], ordered_days)

    def test_every_card_keeps_written_evidence_and_pronunciation_without_answer_leakage(self):
        for card, (day, direction, alternatives) in zip(self.cards, SEQUENCE):
            with self.subTest(slide=card["slide_id"]):
                self.assertEqual(card["prompt_presentation"], "written")
                self.assertEqual(card["audio_speaker"], card["answer_audio_speaker"])
                self.assertEqual(card["audio_text"], f"{QUESTION} {day}" if direction == "image" else QUESTION)
                self.assertFalse(card.get("answer_audio_turns"))
                self.assertIn(card["answer_audio_speaker"], ("teacher", "co-teacher"))
                correct = next(option for option in card["options"] if option["id"] == card["correct_option_id"])
                if direction == "image":
                    self.assertEqual([turn["text"] for turn in card["audio_turns"]], [QUESTION, day])
                    self.assertEqual([turn["speaker_role"] for turn in card["audio_turns"]], ["co-teacher"] * 2)
                    self.assertEqual([turn["image_url"] for turn in card["audio_turns"]], [board("unmarked"), board(day)])
                    self.assertEqual(card["prompt_image_url"], "", "Do not show the answer picture beside the target word.")
                    self.assertEqual([option["image_url"] for option in card["options"]], [board(alternative) for alternative in alternatives])
                    self.assertTrue(all(option["label"] is None for option in card["options"]))
                    self.assertEqual(correct["image_url"], board(day))
                else:
                    self.assertFalse(card.get("audio_turns"))
                    self.assertEqual(card["prompt_image_url"], board(day))
                    self.assertEqual([option["label"] for option in card["options"]], [f"Today is {alternative}." for alternative in alternatives])
                    self.assertTrue(all(option["image_url"] == "" for option in card["options"]))
                    self.assertEqual(correct["label"], f"Today is {day}.")

    def test_translation_explains_visible_english_without_supplying_the_answer(self):
        words_es = {"Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles"}
        for card, (day, direction, _) in zip(self.cards, SEQUENCE):
            expected = f"{QUESTION_ES}\n{words_es[day]}" if direction == "image" else QUESTION_ES
            self.assertEqual(card["spanish_translation"], expected, card["slide_id"])
            # Independent code points prevent a corrupted copied constant from
            # making mojibake appear correct in both content and expectations.
            self.assertEqual([ord(char) for char in card["spanish_translation"][:9]],
                             [0xBF, 0x51, 0x75, 0xE9, 0x20, 0x64, 0xED, 0x61, 0x20])

    def test_learn_and_recognize_keep_their_approved_content_media_and_audio(self):
        for stage, expected_digest in PRESERVED_STAGE_DIGESTS.items():
            cards = [card for card in self.lesson["cards"] if card["stage"] == stage]
            serialized = json.dumps(cards, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            self.assertEqual(hashlib.sha256(serialized.encode("utf-8")).hexdigest(), expected_digest, stage)

    def test_listen_opens_with_the_question_then_practises_every_day_in_order(self):
        cards = [card for card in self.lesson["cards"] if card["stage"] == "Listen"]
        days = list(dict.fromkeys(day for day, _, _ in SEQUENCE))
        expected_audio = [QUESTION] + days[:3] + [f"{QUESTION} Today is {day}." for day in days[3:]]
        self.assertEqual(len(cards), 8)
        self.assertEqual([card["slide_id"] for card in cards], [f"A{i}" for i in range(1, 9)])
        self.assertEqual([card["audio_text"] for card in cards], expected_audio)
        self.assertEqual([option["label"] for option in cards[0]["options"]], [QUESTION, "What is your name?"])
        self.assertEqual([card["interaction_type"] for card in cards], ["a2t2"] + ["a2i2"] * 3 + ["a2t3"] * 4)
        for card in cards:
            self.assertEqual(card["prompt"], "Listen and choose.", "Keep the spoken target transcript out of the prompt.")
            self.assertEqual(card["prompt_image_url"], "", "The target calendar must not reveal an audio-only answer.")
            self.assertEqual(" ".join(turn["text"] for turn in card["audio_turns"]), card["audio_text"])
        for card, day in zip(cards[1:4], days[:3]):
            self.assertEqual(card["prompt_image_url"], "", "Do not reveal the correct picture above the image choices.")
            self.assertTrue(all(option["image_url"] and option["label"] is None for option in card["options"]))
            correct = next(option for option in card["options"] if option["id"] == card["correct_option_id"])
            self.assertEqual(correct["image_url"], board(day))
        for card, day in zip(cards[4:], days[3:]):
            correct = next(option for option in card["options"] if option["id"] == card["correct_option_id"])
            self.assertEqual(correct["label"], f"Today is {day}.")
            self.assertTrue(all(not option["image_url"] and option["label"].startswith("Today is ") for option in card["options"]))

    def test_speak_pronounces_the_question_before_all_seven_replies(self):
        cards = [card for card in self.lesson["cards"] if card["stage"] == "Speak"]
        days = list(dict.fromkeys(day for day, _, _ in SEQUENCE))
        targets = [QUESTION] + [f"Today is {day}." for day in days]
        self.assertEqual([card["slide_id"] for card in cards], [f"S{i}" for i in range(1, 9)])
        self.assertEqual([card["prompt"] for card in cards], targets)
        self.assertEqual([card["audio_text"] for card in cards], targets)
        self.assertTrue(all(card["interaction_type"] == "speak" and len(card["options"]) == 1 for card in cards))
        self.assertEqual([card["options"][0]["label"] for card in cards], targets)
        self.assertEqual([card.get("audio_speaker") for card in cards],
                         ["ana", None, "co-teacher", None, "co-teacher", None, "co-teacher", None],
                         "Retain the existing voice attached to each target after reordering.")

    def test_use_keeps_question_first_weekday_order_and_four_guided_then_four_full(self):
        cards = [card for card in self.lesson["cards"] if card["stage"] == "Use"]
        days = list(dict.fromkeys(day for day, _, _ in SEQUENCE))
        targets = [QUESTION] + [f"Today is {day}." for day in days]
        self.assertEqual(len(self.lesson["cards"]), 42)
        self.assertEqual([card["slide_id"] for card in cards], [f"U{i}" for i in range(1, 9)])
        self.assertEqual([card["audio_text"] for card in cards], targets)
        self.assertEqual([card["answer_audio_text"] for card in cards], targets)
        self.assertEqual([card["interaction_type"] for card in cards], ["complete2"] * 4 + ["complete-sentence"] * 4)
        self.assertEqual(cards[0]["prompt"], "What day ___ ___ today?")
        for index, card in enumerate(cards):
            by_id = {option["id"]: option["label"] for option in card["options"]}
            ordered = [by_id[identifier] for identifier in card["correct_option_ids"]]
            self.assertEqual(len(ordered), 2 if index < 4 else 3)
            self.assertEqual(len(card["options"]), len(ordered), "Use only the exact required tiles.")
            words = iter(ordered)
            completed = re.sub("___", lambda _: next(words), card["prompt"])
            self.assertEqual(completed, targets[index])
            self.assertEqual(card["spanish_translation"], card["translation"])

    def test_approved_authoring_plan_rebuilds_current_canonical_content_exactly(self):
        plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
        self.assertFalse(plan.get("draft"))
        self.assertEqual(compose_lesson(plan), self.lesson)
        self.assertEqual(lesson_text(compose_lesson(plan)).encode("utf-8"), LESSON_PATH.read_bytes())
        self.assertEqual(plan["source"]["path"], LESSON_PATH.relative_to(ROOT).as_posix())
        self.assertEqual(plan["source"]["sha256"], hashlib.sha256(LESSON_PATH.read_bytes()).hexdigest())
        for spec in plan["cards"]:
            if spec["stage"] == "Recognize":
                self.assertEqual(spec["recipe"], "choice")
                self.assertEqual(spec["prompt_presentation"], "written")
                self.assertNotEqual(spec.get("exceptions", {}).get("audio_text"), "")

    def test_all_sections_use_the_same_board_family_and_neutral_question_context(self):
        def image_refs(value):
            if isinstance(value, dict):
                for key, child in value.items():
                    if key in ("image_url", "prompt_image_url") and child:
                        yield child
                    else:
                        yield from image_refs(child)
            elif isinstance(value, list):
                for child in value:
                    yield from image_refs(child)

        refs = list(image_refs(self.lesson["cards"]))
        self.assertTrue(refs)
        self.assertTrue(all(re.fullmatch(r"/lesson-assets/a1_photo_u4_days_week_board_(?:unmarked|monday|tuesday|wednesday|thursday|friday|saturday|sunday)_v1\.webp", ref) for ref in refs))
        for card in self.lesson["cards"]:
            for turn in card.get("audio_turns", []):
                if turn["text"] == QUESTION:
                    self.assertEqual(turn["image_url"], board("unmarked"), card["slide_id"])
        for slide in ("L0", "S1", "U1"):
            card = next(card for card in self.lesson["cards"] if card["slide_id"] == slide)
            self.assertIn(board("unmarked"), list(image_refs(card)), slide)

    def test_prompt_pronunciation_reuses_exact_approved_question_and_word_takes(self):
        from backend.app.data import LESSONS

        registry = json.loads((ROOT / "backend/approved-course-audio/registry.json").read_text(encoding="utf-8"))
        expected = {
            ("teacher", QUESTION): "ae1d21ebae21beddb0229f270a88da0be9f04327656ee90182683602a8573fac",
            ("co-teacher", QUESTION): "521497530aff441f82cbc1a08254daed33c3401a9b277c5d83e040892ab77727",
            ("co-teacher", "Monday"): "08c4bd76a86a2aaaf3b2fd8331f4ba572267c130f97adee96a754d431093770e",
            ("co-teacher", "Tuesday"): "81bab853536a562c68f9b048c6e200ae0ba838cab76abf3ed2a0bbdc2fafebe6",
            ("co-teacher", "Wednesday"): "c28afb328b23bdfe454d650b4b7a9c0d4a41bb7a93d6afa006aea1bf28698aa5",
        }
        prompts = [asset for card in LESSONS["lesson-4-8-days-and-time"].cards if card.stage == "Recognize"
                   for asset in card.audio_assets if asset.purpose.startswith("prompt")]
        self.assertEqual(len(prompts), 13)
        for asset in prompts:
            self.assertEqual(registry["bindings"][asset.id]["take_id"], expected[(asset.speaker_role, asset.text)])


class WeekdayCalendarBoardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receipt = json.loads(BOARD_RECEIPT_PATH.read_text(encoding="utf-8"))

    def test_receipted_date_mapping_is_a_valid_monday_first_complete_month(self):
        # This verifies the declared calendar relation, not OCR of the photo's
        # numbers. The receipt binds the visually reviewed numbers to exact bytes.
        self.assertEqual(self.receipt["month"], "2023-05")
        self.assertEqual(self.receipt["calendar_week_start"], "Monday")
        self.assertEqual(self.receipt["visible_dates"], list(range(1, 32)))
        first_week = calendar.Calendar(firstweekday=calendar.MONDAY).monthdayscalendar(2023, 5)[0]
        self.assertEqual(first_week, list(range(1, 8)))
        self.assertEqual(self.receipt["weekday_targets_in_first_row"], first_week)
        self.assertEqual(len(self.receipt["assets"]), 7)
        for weekday, row in enumerate(self.receipt["assets"]):
            self.assertEqual(row["date"], weekday + 1)
            self.assertEqual(row["day"], calendar.day_name[weekday].lower())
            self.assertEqual(calendar.weekday(2023, 5, row["date"]), weekday)

    def test_all_client_copies_match_the_receipted_full_calendar_bytes(self):
        for row in [*self.receipt["assets"], self.receipt["neutral_asset"]]:
            with self.subTest(filename=row["filename"]):
                copies = [(ROOT / folder / row["filename"]).read_bytes() for folder in (
                    "Lessons/Lesson1/images", "mobile/assets/lesson-assets", "frontend/public/lesson-assets")]
                self.assertEqual(copies[0], copies[1])
                self.assertEqual(copies[0], copies[2])
                self.assertEqual(hashlib.sha256(copies[0]).hexdigest(), row["sha256"])
                self.assertEqual(row["dimensions"], [1536, 1024])
                with Image.open(ROOT / "Lessons/Lesson1/images" / row["filename"]) as image:
                    self.assertEqual(image.size, (1536, 1024))

    def test_question_introduction_pixels_do_not_mark_a_weekday_answer(self):
        row = self.receipt["neutral_asset"]
        self.assertEqual(row["marker"], "none")
        self.assertEqual(hashlib.sha256((ROOT / row["source_png"]).read_bytes()).hexdigest(),
                         row["source_sha256"])
        with Image.open(ROOT / "Lessons/Lesson1/images" / row["filename"]) as image:
            for points in blue_components(image):
                xs, ys = zip(*points)
                self.assertLess(len(points), 200, "A day-marker loop remains on the neutral calendar.")
                self.assertLess(max(xs) - min(xs), 35)
                self.assertLess(max(ys) - min(ys), 35)

    def test_pixels_have_one_large_loop_around_the_correct_first_row_cell(self):
        for row in self.receipt["assets"]:
            with self.subTest(day=row["day"]):
                with Image.open(ROOT / "Lessons/Lesson1/images" / row["filename"]) as image:
                    components = blue_components(image)
                marker_components = []
                for points in components:
                    xs, ys = zip(*points)
                    # Exclude only the measured tiny activity windows, not an
                    # arbitrary region that could hide an extra wrong-day loop.
                    within_activity_windows = any(
                        min(xs) >= 56 + (column + 0.5) * 204 - half_width
                        and max(xs) <= 56 + (column + 0.5) * 204 + half_width
                        for column, half_width in ((0, 40), (1, 58), (3, 40), (4, 58), (6, 40))
                    )
                    window = (len(points) <= 100 and max(xs) - min(xs) <= 14
                              and max(ys) - min(ys) <= 16 and min(ys) >= 240 and max(ys) <= 300
                              and within_activity_windows)
                    if not window:
                        marker_components.append(points)
                self.assertEqual(len(marker_components), 1, "Extra or missing blue marker, outside the tiny drawing windows.")
                marker = marker_components[0]
                self.assertGreater(len(marker), 2500)
                xs, ys = zip(*marker)
                self.assertGreaterEqual(max(xs) - min(xs), 185, "The loop must enclose the whole cell width.")
                self.assertLessEqual(max(xs) - min(xs), 215)
                self.assertGreaterEqual(max(ys) - min(ys), 178, "The loop must enclose the date and its picture together.")
                self.assertLessEqual(max(ys) - min(ys), 205)
                self.assertLessEqual(min(ys), 140)
                self.assertGreaterEqual(max(ys), 310)
                # Measured grid: seven approximately 204px columns from x56.
                # A small margin permits the freehand line to cross a grid edge.
                left = 56 + (row["date"] - 1) * 204 - 8
                right = 56 + row["date"] * 204 + 8
                in_target = sum(left <= x <= right and 120 <= y <= 326 for x, y in marker)
                self.assertGreaterEqual(in_target / len(marker), 0.99, "The blue loop marks a different cell or row.")


if __name__ == "__main__":
    unittest.main()
