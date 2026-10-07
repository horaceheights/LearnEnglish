import json
import unittest
from collections import Counter
from pathlib import Path

from pydantic import ValidationError
from backend.app.schemas import LessonCard
from scripts.content_engine.plan import compose_lesson

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


class OwnershipLessonTest(unittest.TestCase):
    def test_scope_and_shared_plan(self):
        lesson = read('backend/lessons/unit_3/lesson-3-our-their.yaml')
        self.assertEqual(lesson, compose_lesson(read('docs/product/content-plans/3.11-ownership-v1.plan.json')))
        self.assertEqual(lesson['vocabulary'], ['our', 'their'])
        self.assertEqual(Counter(c['stage'] for c in lesson['cards']),
                         {'Learn': 2, 'Recognize': 12, 'Listen': 10, 'Speak': 8, 'Use': 8})
        learn = [c for c in lesson['cards'] if c['stage'] == 'Learn']
        self.assertEqual([c['spanish_translation'] for c in learn], ['Nuestro', 'Su (de ellos)'])
        self.assertTrue(all(c['learn_translation_preview_ms'] == 1000 for c in learn))
        self.assertTrue(all('learn_translation_preview_ms' not in c for c in lesson['cards'] if c['stage'] != 'Learn'))
        for card in lesson['cards']:
            if card['stage'] in {'Recognize', 'Listen'}:
                self.assertEqual(len(card['options']), 2, 'Ownership gestures need the complete 3:2 frame.')
        for owner in ['our', 'their']:
            for noun in ['car', 'house', 'books', 'phones']:
                self.assertIn(f'a1_ownership_{owner}_{noun}_v1.webp', json.dumps(lesson))

    def test_no_named_possessive_dependency(self):
        for path in ['lesson-3-our-their.yaml', 'lesson-3-9-unit-3-review.yaml', 'lesson-3-10-introduction-mission.yaml']:
            lesson = read(f'backend/lessons/unit_3/{path}')
            # Contractions remain valid; this gate targets the deferred ownership forms.
            self.assertNotRegex(json.dumps(lesson['cards']), r"(?i)\b(?:ana|luis|diego|sofia|woman|man)['’]s\b")
        review = read('backend/lessons/unit_3/lesson-3-9-unit-3-review.yaml')
        self.assertEqual(next(c for c in review['cards'] if c['slide_id'] == 'N20')['audio_text'], 'They are their grandchildren.')

    def test_preview_requires_teaching_image_and_authored_spanish(self):
        payload = dict(stage='Learn', prompt='Our', correct_option_id='our', options=[dict(id='our', image_url='our.webp')],
                       spanish_translation='Nuestro', learn_translation_preview_ms=1000)
        self.assertEqual(LessonCard(**payload).learn_translation_preview_ms, 1000)
        for patch in [dict(stage='Recognize'), dict(options=[]), dict(options=[dict(id='our', image_url='')]),
                      dict(spanish_translation=''), dict(learn_translation_preview_ms=0)]:
            with self.assertRaises(ValidationError):
                LessonCard(**{**payload, **patch})
        del payload['learn_translation_preview_ms']
        self.assertNotIn('learn_translation_preview_ms', LessonCard(**payload).model_dump())


if __name__ == '__main__':
    unittest.main()
