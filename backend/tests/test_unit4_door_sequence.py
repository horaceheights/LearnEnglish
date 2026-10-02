"""Keep visually rejected door states out of the reviewed curriculum."""
import hashlib
import json
import unittest
from pathlib import Path

from backend.app.data import LESSONS

ROOT = Path(__file__).resolve().parents[2]


class Unit4DoorSequenceTests(unittest.TestCase):
    def test_review_uses_only_the_inspected_door_replacements(self):
        review = json.loads((ROOT / 'docs/qa/unit4-door-mechanics-review-v1.json').read_text(encoding='utf8'))
        lesson = LESSONS['lesson-4-9-unit-4-review']
        refs = set()
        for card in lesson.cards:
            refs.add(card.prompt_image_url)
            refs.update(option.image_url for option in card.options)
            refs.update(turn.image_url for turn in card.audio_turns or [])
        names = {ref.rsplit('/', 1)[-1] for ref in refs if ref}
        self.assertFalse(names.intersection(review['rejected_runtime_filenames']))
        expected = {
            'a1_photo_u4_rebuild_review_open_we_v3_v1.webp',
            'a1_photo_u4_rebuild_review_close_we_v2_v1.webp',
            'a1_photo_u4_rebuild_review_open_you_v2_v1.webp',
            'a1_photo_u4_rebuild_review_door_group_sequence_v2_v1.webp',
        }
        self.assertEqual({row['runtime_filename'] for row in review['bindings']}, expected)
        self.assertTrue(expected.issubset(names))
        for row in review['bindings']:
            for folder in ('Lessons/Lesson1/images', 'frontend/public/lesson-assets', 'mobile/assets/lesson-assets'):
                path = ROOT / folder / row['runtime_filename']
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), row['runtime_sha256'])
            self.assertEqual(hashlib.sha256((ROOT / row['source']).read_bytes()).hexdigest(), row['source_sha256'])


if __name__ == '__main__':
    unittest.main()
