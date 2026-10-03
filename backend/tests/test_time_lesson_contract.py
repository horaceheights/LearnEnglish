import json
import re
import unittest
from pathlib import Path

from backend.app.schemas import LessonCard
from scripts.content_engine.plan import compose_lesson

ROOT = Path(__file__).resolve().parents[2]


class TimeLessonContractTests(unittest.TestCase):
    def test_approved_plan_teaches_time_in_complete_exchanges_and_preserves_identity(self):
        plan = json.loads((ROOT / 'docs/product/content-plans/4.10-time-exchanges-v1.plan.json').read_text(encoding='utf-8'))
        lesson = compose_lesson(plan)
        canonical = json.loads((ROOT / 'backend/lessons/unit_4/lesson-4-what-time-is-it.yaml').read_text(encoding='utf-8'))
        self.assertEqual(lesson, canonical)
        self.assertEqual(lesson['id'], 'lesson-4-what-time-is-it')
        self.assertEqual(len(lesson['cards']), 50)
        learns = [c for c in lesson['cards'] if c['stage'] == 'Learn']
        self.assertEqual(len(learns) % 2, 0)
        for question, answer in zip(learns[::2], learns[1::2]):
            self.assertEqual(question['audio_text'], 'What time is it?')
            self.assertTrue(answer['audio_text'].startswith('It is '))
            self.assertNotEqual(question['audio_speaker'], answer['audio_speaker'])
        successful = []
        for c in lesson['cards']:
            text = c.get('answer_audio_text') or c.get('audio_text') or c['prompt']
            successful.append(text)
            self.assertNotRegex(text.lower(), r'\b(?:wake|study|work|school|breakfast|run|eat|sleep)\b')
            self.assertNotEqual(text.lower().strip('.'), "o'clock")
        practice = ' '.join(c.get('answer_audio_text') or c.get('audio_text') or ''
                            for c in lesson['cards'] if c['stage'] in ['Recognize', 'Listen'])
        for hour in ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']:
            self.assertRegex(practice, rf'\b{hour}\b')
        for period in ['in the morning','in the afternoon','in the evening','at night','a.m.','p.m.']:
            self.assertIn(period, ' '.join(successful))

    def test_time_abbreviations_are_single_tiles_without_accepting_multiword_tiles(self):
        for notation in ['a.m.', 'p.m.']:
            target = f'It is three {notation}'
            labels = ['It','is','three',notation]
            payload = dict(stage='Use', interaction_type='complete-sentence', prompt='___ ___ ___ ___',
                           options=[dict(id=str(i),label=word) for i,word in enumerate(labels)],
                           correct_option_id='0',correct_option_ids=['0','1','2','3'],
                           audio_text=target,answer_audio_text=target)
            self.assertEqual(LessonCard(**payload).options[-1].label, notation)
            payload['options'][-1]['label']='in the morning'
            with self.assertRaises(ValueError):LessonCard(**payload)
