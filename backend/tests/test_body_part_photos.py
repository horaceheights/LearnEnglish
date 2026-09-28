"""Keep the approved body-photo series, safe choice crops and original voices."""
import hashlib
import json
from pathlib import Path
import unittest

from PIL import Image
from scripts.content_engine.plan import compose_lesson
from scripts.install_course_photo_reuse import pointer_parent

ROOT = Path(__file__).resolve().parents[2]


def read(relative):
    return json.loads((ROOT / relative).read_text(encoding='utf-8'))


def without_images(value):
    if isinstance(value, dict):
        return {k: without_images(v) for k, v in value.items() if k not in {'image_url', 'prompt_image_url'}}
    if isinstance(value, list):
        return [without_images(v) for v in value]
    return value


class BodyPartPhotoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = read('docs/product/lesson-7-1-body-photos-v1.json')
        cls.lesson = read('backend/lessons/unit_7/lesson-7-1-the-body.yaml')
        cls.assets = {a['id']: a for a in cls.pack['assets']}

    def test_all_stages_keep_the_reviewed_bindings_and_language(self):
        self.assertEqual({b['stage'] for b in self.pack['bindings']}, {'Learn', 'Recognize', 'Listen', 'Speak', 'Use'})
        for binding in self.pack['bindings']:
            parent, key = pointer_parent(self.lesson, binding['pointer'])
            self.assertEqual(parent[key], binding['new_filename'])
        serialized = json.dumps(without_images(self.lesson), ensure_ascii=False, sort_keys=True, separators=(',', ':'))
        self.assertEqual(hashlib.sha256(serialized.encode()).hexdigest(), self.pack['language_contract_sha256'])

    def test_four_picture_choices_keep_both_limbs_and_digits(self):
        closeups = {self.assets[part]['runtime_filename'] for part in ('arms', 'hands', 'feet')}
        wide = {self.assets[part+'-four-card']['runtime_filename'] for part in ('arms', 'hands', 'feet')}
        for card in self.lesson['cards']:
            images = {o['image_url'] for o in card['options'] if o.get('image_url')}
            if len(images) == 4:
                self.assertFalse(images & closeups, card['slide_id'])
            else:
                self.assertFalse(images & wide, card['slide_id'])

    def test_sources_and_all_client_copies_match_inspected_bytes(self):
        for asset in self.pack['assets']:
            with self.subTest(image=asset['id']):
                source = ROOT / asset['source_path']
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), asset['source_sha256'])
                for folder in ('Lessons/Lesson1/images', 'mobile/assets/lesson-assets', 'frontend/public/lesson-assets'):
                    path = ROOT / folder / asset['runtime_filename']
                    self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), asset['runtime_sha256'])
                    with Image.open(path) as image:
                        self.assertEqual(image.size, (1536, 1024))

    def test_engine_plan_rebuilds_the_exact_installed_lesson(self):
        plan = read('docs/product/content-plans/7.1-body-photos-v1.plan.json')
        self.assertEqual(compose_lesson(plan), self.lesson)

    def test_rebound_audio_keeps_the_original_recordings(self):
        registry = read('backend/approved-course-audio/registry.json')
        self.assertEqual(len(self.pack['preserved_audio_bindings']), 75)
        for pair in self.pack['preserved_audio_bindings']:
            self.assertEqual(registry['bindings'][pair['old_asset_id']]['take_id'], pair['take_id'])
            self.assertEqual(registry['bindings'][pair['new_asset_id']]['take_id'], pair['take_id'])


if __name__ == '__main__':
    unittest.main()
