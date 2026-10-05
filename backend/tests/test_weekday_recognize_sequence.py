"""Acceptance contract for the approved 4.9 Recognize worked example.

The wider engine rollout is separate. These checks protect this reviewed
sequence, silent pre-answer evidence, and its repeatable authoring source.
"""
import calendar
import hashlib
import json
from pathlib import Path
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
# Reviewed canonical stage data at 33a5e1d0, before this Recognize-only change.
# Future approved changes to these stages must deliberately update this scope
# contract; re-importing a changed lesson must not silently erase the boundary.
UNCHANGED_STAGE_DIGESTS = {
    "Learn": "63778398168d91775d279dc9cb221b6ca6cd9869cf94a2ad721fabb773d3ebea",
    "Listen": "c9deb6a8c2533f4dcb21ac417ef61c2f371682555ae4297d354a2383c6ce8d51",
    "Speak": "47de7a0147cc5485742001922dc55bd81079ebce7bd9db4a428c128a4369c884",
    "Use": "7481f4868e5d4cd6823826cf0ad7a73d4cde25731b8e55bb728cabd39685e818",
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

    def test_every_card_is_answerable_without_upfront_audio_or_answer_captions(self):
        for card, (day, direction, alternatives) in zip(self.cards, SEQUENCE):
            with self.subTest(slide=card["slide_id"]):
                # Empty, not null: clients must not fall back to reading prompt.
                self.assertEqual(card["audio_text"], "")
                self.assertFalse(card.get("audio_turns"))
                self.assertFalse(card.get("answer_audio_turns"))
                self.assertFalse(any(asset.get("purpose") == "prompt" for asset in card.get("audio_assets", [])))
                self.assertIn(card["answer_audio_speaker"], ("teacher", "co-teacher"))
                correct = next(option for option in card["options"] if option["id"] == card["correct_option_id"])
                if direction == "image":
                    self.assertEqual(card["prompt_image_url"], "", "Do not show the answer picture beside the target word.")
                    self.assertEqual([option["image_url"] for option in card["options"]], [board(alternative) for alternative in alternatives])
                    self.assertTrue(all(option["label"] is None for option in card["options"]))
                    self.assertEqual(correct["image_url"], board(day))
                else:
                    self.assertEqual(card["prompt_image_url"], board(day))
                    self.assertEqual([option["label"] for option in card["options"]], [f"Today is {alternative}." for alternative in alternatives])
                    self.assertTrue(all(option["image_url"] == "" for option in card["options"]))
                    self.assertEqual(correct["label"], f"Today is {day}.")

    def test_translation_explains_visible_english_without_supplying_the_answer(self):
        words_es = {"Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles"}
        for card, (day, direction, _) in zip(self.cards, SEQUENCE):
            expected = f"{QUESTION_ES}\n{words_es[day]}" if direction == "image" else QUESTION_ES
            self.assertEqual(card["spanish_translation"], expected, card["slide_id"])

    def test_other_stages_keep_their_approved_content_media_and_audio(self):
        for stage, expected_digest in UNCHANGED_STAGE_DIGESTS.items():
            cards = [card for card in self.lesson["cards"] if card["stage"] == stage]
            serialized = json.dumps(cards, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            self.assertEqual(hashlib.sha256(serialized.encode("utf-8")).hexdigest(), expected_digest, stage)

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
                self.assertEqual(spec["exceptions"]["audio_text"], "")


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
        for row in self.receipt["assets"]:
            with self.subTest(day=row["day"]):
                copies = [(ROOT / folder / row["filename"]).read_bytes() for folder in (
                    "Lessons/Lesson1/images", "mobile/assets/lesson-assets", "frontend/public/lesson-assets")]
                self.assertEqual(copies[0], copies[1])
                self.assertEqual(copies[0], copies[2])
                self.assertEqual(hashlib.sha256(copies[0]).hexdigest(), row["sha256"])
                self.assertEqual(row["dimensions"], [1536, 1024])
                with Image.open(ROOT / "Lessons/Lesson1/images" / row["filename"]) as image:
                    self.assertEqual(image.size, (1536, 1024))

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
