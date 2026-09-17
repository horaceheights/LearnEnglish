import hashlib
import json
from pathlib import Path
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FOLDERS = ('Lessons/Lesson1/images', 'mobile/assets/lesson-assets', 'frontend/public/lesson-assets')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class UsePhotorealRepairsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = json.loads((ROOT / 'docs/product/use-photoreal-repairs-v1.json').read_text(encoding='utf-8'))
        cls.proof = json.loads((ROOT / 'docs/qa/use-photoreal-repairs-v1.json').read_text(encoding='utf-8'))

    def test_four_new_composites_have_scoped_replacements_not_a_provider_sweep(self):
        self.assertEqual(4, len(self.pack['assets']))
        self.assertEqual({('lesson-5-4-likes-and-dislikes', 'U7'), ('lesson-5-5-wants-and-needs', 'U7'),
                          ('lesson-6-8-schedules', 'U6'), ('lesson-7-9-complete-a1-review', 'U3')},
                         {(a['lesson_id'], a['slide_id']) for a in self.pack['assets']})
        for asset in self.pack['assets']:
            lesson = json.loads((ROOT / 'backend/lessons' / f"unit_{asset['unit']}" / f"{asset['lesson_id']}.yaml").read_text(encoding='utf-8'))
            card = next(c for c in lesson['cards'] if c['slide_id'] == asset['slide_id'])
            self.assertEqual('Use', card['stage'])
            self.assertEqual(asset['sentence'], card['answer_audio_text'])
            self.assertEqual(asset['runtime_filename'], card['prompt_image_url'])
            for folder in FOLDERS:
                self.assertEqual(asset['old_sha256'], sha(ROOT / folder / asset['old_filename']))

    def test_sources_receipts_review_and_all_runtime_copies_agree(self):
        self.assertEqual(sha(ROOT / 'docs/product/use-photoreal-repairs-v1.json'), self.proof['pack_sha256'])
        registry = json.loads((ROOT / 'docs/product/a1-reviewed-photoreal-media.json').read_text(encoding='utf-8'))
        self.assertEqual(4, len(self.proof['assets']))
        for record in self.proof['assets']:
            source = ROOT / record['source_path']
            receipt, review = record['receipt'], record['agent_review']
            self.assertEqual('image_saved', receipt['status'])
            self.assertEqual(1, receipt['generation_requests_sent'])
            self.assertEqual(0, receipt['automatic_retries'])
            self.assertEqual(sha(source), receipt['sha256'])
            self.assertEqual(source.stat().st_size, receipt['byte_count'])
            self.assertEqual(sha(source), review['sha256'])
            self.assertEqual('usable', review['disposition'])
            self.assertGreater(len(review['observed_description']), 60)
            self.assertIn(record['runtime_filename'], registry['files'])
            for key, value in self.pack['image_settings'].items():
                self.assertEqual(value, receipt['request'][key])
            for folder in FOLDERS:
                target = ROOT / folder / record['runtime_filename']
                self.assertEqual(record['runtime_sha256'], sha(target))
                with Image.open(target) as image:
                    self.assertEqual((1536, 1024), image.size)

    def test_benchmark_is_reused_without_a_second_paid_generation(self):
        asset = next(a for a in self.pack['assets'] if a.get('reuse_existing_benchmark'))
        record = next(a for a in self.proof['assets'] if a['asset_id'] == asset['id'])
        self.assertEqual(asset['source_sha256'], record['receipt']['sha256'])
        self.assertEqual('req_b4bdc1b877364f878e03430224aa49be', record['receipt']['provider_request_id'])


if __name__ == '__main__':
    unittest.main()
