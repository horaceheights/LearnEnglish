"""Keep the reviewed day cue visible throughout a card, including dialogue cuts."""
import json
from pathlib import Path
import re
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
LESSON_ID = "lesson-4-8-days-and-time"
DAYS = "monday tuesday wednesday thursday friday saturday sunday".split()


class WeekdayCalendarMarkersTests(unittest.TestCase):
    def test_day_target_calendars_match_the_answer_in_every_view(self):
        lesson = json.loads((ROOT / "backend/lessons/unit_4" / f"{LESSON_ID}.yaml").read_text(encoding="utf-8"))
        seen = set()
        for card in lesson["cards"]:
            correct = next(option for option in card["options"] if option["id"] == card["correct_option_id"])
            answer_ids = card.get("correct_option_ids") or [card["correct_option_id"]]
            answer = " ".join(next(o["label"] for o in card["options"] if o["id"] == key) for key in answer_ids)
            days = re.findall(r"\b(" + "|".join(DAYS) + r")\b", answer.lower())
            if not days:
                continue
            self.assertEqual(len(set(days)), 1, card["slide_id"])
            day = days[0]
            filename = f"a1_photo_u4_days_week_{day}_handdrawn_v2.webp"
            expected = f"/lesson-assets/{filename}"
            seen.add((card["stage"], day))
            if card["prompt_image_url"]:
                self.assertEqual(card["prompt_image_url"], expected, card["slide_id"])
            if correct["image_url"]:
                self.assertEqual(correct["image_url"], expected, card["slide_id"])
            for field in ("audio_turns", "answer_audio_turns"):
                for turn in card.get(field, []):
                    self.assertEqual(turn["image_url"], expected, (card["slide_id"], field))
        for stage in ("Learn", "Recognize", "Listen", "Speak", "Use"):
            self.assertTrue(any(s == stage for s, _ in seen), stage)
        self.assertEqual({day for _, day in seen}, set(DAYS))

    def test_marker_is_large_visible_and_identical_on_both_clients(self):
        evidence = json.loads((ROOT / "docs/qa/weekday-calendar-markers-v2.json").read_text())
        for row in evidence["assets"]:
            filename = row["filename"]
            copies = [(ROOT / folder / filename).read_bytes() for folder in (
                "Lessons/Lesson1/images", "mobile/assets/lesson-assets", "frontend/public/lesson-assets")]
            self.assertEqual(copies[0], copies[1])
            self.assertEqual(copies[0], copies[2])
            with Image.open(ROOT / "Lessons/Lesson1/images" / filename) as image:
                self.assertEqual(image.size, (1536, 1024))
                # Measure actual blue ink, rather than trusting a filename or prompt.
                points = [(x, y) for y in range(125, 405) for x in range(100, 1425)
                          if (lambda rgb: rgb[2] - rgb[0] > 40 and rgb[2] - rgb[1] > 15 and rgb[0] < 120)(image.getpixel((x, y))[:3])]
                self.assertGreater(len(points), 800, filename)
                xs, ys = zip(*points)
                self.assertGreater(max(xs) - min(xs), 130, filename)
                self.assertGreater(max(ys) - min(ys), 170, filename)
                self.assertAlmostEqual((min(xs) + max(xs)) / 2, row["expected_center_x"], delta=30)


if __name__ == "__main__":
    unittest.main()
