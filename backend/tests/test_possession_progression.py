"""The approved possession arc must remain clear in teaching and retrieval."""
import json
import re
import unittest
from collections import Counter
from pathlib import Path

from scripts.content_engine.plan import compose_lesson
from scripts.content_engine.practice import learn_context_groups

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


class PossessionProgressionTests(unittest.TestCase):
    def setUp(self):
        self.lesson = read('backend/lessons/unit_3/lesson-3-8-have-and-has.yaml')

    def test_sources_compose_exactly_and_preserve_scope(self):
        for name, filename in [('3.12-possession-v1', 'lesson-3-8-have-and-has'),
                               ('3.13-possession-retrieval-v1', 'lesson-3-9-unit-3-review'),
                               ('3.14-possession-retrieval-v1', 'lesson-3-10-introduction-mission')]:
            self.assertEqual(compose_lesson(read(f'docs/product/content-plans/{name}.plan.json')),
                             read(f'backend/lessons/unit_3/{filename}.yaml'))
        self.assertEqual(Counter(c['stage'] for c in self.lesson['cards']),
                         {'Learn': 7, 'Recognize': 9, 'Listen': 10, 'Speak': 8, 'Use': 8})

    def test_learn_context_and_translations_are_exact(self):
        learn = [c for c in self.lesson['cards'] if c['stage'] == 'Learn']
        self.assertEqual([c['prompt'] for c in learn], ['He has', 'They have', 'She has', 'We have',
                         'This is mine', 'This is yours', 'That is ours'])
        targets = set(self.lesson['vocabulary'])
        self.assertEqual(targets, {'have', 'has', 'mine', 'yours', 'ours'})
        for card in learn:
            self.assertEqual(len(set(re.findall(r'[a-z]+', card['prompt'].lower())) & targets), 1)
            self.assertTrue(card['spanish_translation'])
            self.assertEqual(card['learn_translation_preview_ms'], 2000)
        groups = self.lesson['learn_context_groups']
        known = {'he', 'they', 'she', 'we', 'this', 'that', 'is'}
        allowed, errors = learn_context_groups(self.lesson['cards'], groups,
                                               self.lesson['vocabulary'], known, targets)
        self.assertFalse(errors)
        self.assertEqual(allowed, {c['slide_id'] for c in learn})
        changed = json.loads(json.dumps(self.lesson['cards']))
        changed[0]['audio_text'] = 'He has a helicopter.'
        self.assertTrue(learn_context_groups(changed, groups, self.lesson['vocabulary'], known, targets)[1])

    def test_assessments_use_complete_specific_sentences(self):
        heard = set()
        for card in self.lesson['cards']:
            if card['stage'] == 'Learn':
                continue
            texts = [card.get(k) for k in ('audio_text', 'answer_audio_text')]
            if card['stage'] in {'Recognize', 'Listen'}:
                texts += [o.get('label') for o in card['options']]
            for text in filter(None, texts):
                self.assertNotRegex(text, r'^(?:Have|Has|Mine|Yours|Ours)[.!]?$')
                self.assertNotRegex(text, r'\b(?:It|This|That) is (?:mine|yours|ours)\b')
            if card['stage'] == 'Listen':
                heard.add(card['audio_text'])
        self.assertTrue({'We have books.', 'This car is mine.', 'This book is yours.'} <= heard)
        use = [c for c in self.lesson['cards'] if c['stage'] == 'Use']
        self.assertEqual([c['interaction_type'] for c in use], ['complete2']*4 + ['complete-sentence']*4)
        self.assertTrue(all(len(c['correct_option_ids']) == 2 for c in use[:4]))

    def test_review_and_mission_retrieve_ours_and_explicit_phone(self):
        review = read('backend/lessons/unit_3/lesson-3-9-unit-3-review.yaml')
        mission = read('backend/lessons/unit_3/lesson-3-10-introduction-mission.yaml')
        self.assertEqual(len(review['cards']), 54)
        self.assertEqual(len(mission['cards']), 14)
        self.assertEqual(sum(c.get('mission_game', {}).get('kind') == 'voice-gate' for c in mission['cards']), 5)
        for lesson in [review, mission]:
            text = json.dumps(lesson['cards'])
            self.assertIn('ours.', text)
            self.assertIn('Is this phone yours?', text)
            self.assertIn('Yes, this phone is mine.', text)
            self.assertNotIn('Is it yours?', text)
            self.assertNotIn('Yes, it is mine.', text)
            for card in lesson['cards']:
                if card['stage'] == 'Learn':
                    continue
                for field in ('prompt', 'audio_text', 'answer_audio_text'):
                    self.assertNotRegex((card.get(field) or '').lower(),
                        r'^(?:have|has|mine|yours|ours)[.!]?$|\b(?:it|this|that) is (?:mine|yours|ours)\b')


if __name__ == '__main__':
    unittest.main()
