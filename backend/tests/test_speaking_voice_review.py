import dataclasses
import unittest

from backend.app.data import LESSONS
from scripts.review_speaking_voices import check_rows, describe, load_review, spoken_lines


class SpeakingVoiceReviewTests(unittest.TestCase):
    """Lines a pictured person says must keep a reviewed, gender-matched voice.

    The 2026-09-17 photo sweep put speaking men under lines voiced by the female
    narrator and nothing failed. A new or replaced picture now fails here until
    someone looks at it and records who says the line.
    """

    def test_every_spoken_line_over_a_picture_has_a_reviewed_matching_voice(self) -> None:
        report = check_rows(spoken_lines(LESSONS), load_review())
        self.assertTrue(report.ok, "\n" + describe(report))

    def test_the_check_catches_a_replaced_picture_a_wrong_voice_and_a_stale_record(self) -> None:
        rows = spoken_lines(LESSONS)
        review = load_review()
        train = next(row for row in rows if row.lesson == "lesson-6-2-transportation"
                     and row.slide == "L4" and row.purpose == "prompt")
        self.assertEqual("male", review[(train.image, train.text)])
        others = [row for row in rows if row is not train]

        replaced = check_rows(others + [dataclasses.replace(train, image="a1_new_speaker.webp")], review)
        self.assertEqual(["a1_new_speaker.webp"], [row.image for row in replaced.unreviewed])

        narrated = check_rows(others + [dataclasses.replace(train, speaker_role="teacher")], review)
        self.assertEqual([("female", "male")], [(row.voice, expected) for row, expected in narrated.mismatched])

        diego = next(row for row in rows if row.text == "My name is Diego.")
        misnamed = check_rows([dataclasses.replace(diego, speaker_role="teacher", image=None)], review)
        self.assertEqual(["My name is Diego."], [row.text for row in misnamed.misnamed])

        stale = check_rows([row for row in rows if (row.image, row.text) != (train.image, train.text)], review)
        self.assertIn((train.image, train.text), stale.stale)

    def test_narration_may_use_either_neutral_narrator_but_never_a_character(self) -> None:
        rows = spoken_lines(LESSONS)
        line = next(row for row in rows if row.image)
        review = {(line.image, line.text): "narrator"}
        for role in ("teacher", "co-teacher"):
            narrated = check_rows([dataclasses.replace(line, speaker_role=role)], review)
            self.assertEqual([], narrated.mismatched, role)
        acted = check_rows([dataclasses.replace(line, speaker_role="male-character")], review)
        self.assertEqual(["narrator"], [expected for _, expected in acted.mismatched])


if __name__ == "__main__":
    unittest.main()
