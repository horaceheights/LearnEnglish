import json
import hashlib
import unittest
from pathlib import Path

from PIL import Image

from backend.app.schemas import LessonCard
from scripts.content_engine.plan import compose_lesson
from scripts.content_engine.practice import card_evidence, card_language

ROOT = Path(__file__).resolve().parents[2]
LESSON_PATH = ROOT / 'backend/lessons/unit_4/lesson-4-what-time-is-it.yaml'
IMAGE_FOLDERS = (
    'Lessons/Lesson1/images',
    'frontend/public/lesson-assets',
    'mobile/assets/lesson-assets',
)
DAY_PARTS = ('morning', 'afternoon', 'evening', 'night')


def successful_image_names(card):
    correct = {card.get('correct_option_id'), *(card.get('correct_option_ids') or [])}
    images = [card.get('prompt_image_url')]
    images.extend(option.get('image_url') for option in card['options'] if option['id'] in correct)
    for field in ('audio_turns', 'answer_audio_turns'):
        images.extend(turn.get('image_url') for turn in card.get(field) or [])
    return {Path(image).name for image in images if image}


class TimeLessonContractTests(unittest.TestCase):
    def test_teaching_clock_photographs_keep_the_inspected_source_and_identical_copies(self):
        report = json.loads((ROOT / 'docs/product/time-photograph-assets-v4.json').read_text(encoding='utf-8'))
        source = report['source']
        self.assertEqual(source['license'], 'CC0-1.0')
        self.assertEqual(hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest(), source['sha256'])
        self.assertEqual({a['hour'] for a in report['assets']}, set(range(1, 13)))
        for asset in report['assets']:
            for folder in IMAGE_FOLDERS:
                payload = (ROOT / folder / asset['filename']).read_bytes()
                self.assertEqual(len(payload), asset['bytes'])
                self.assertEqual(hashlib.sha256(payload).hexdigest(), asset['sha256'])

    def test_day_parts_have_separate_foundations_before_clock_exchanges(self):
        lesson = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        learns = [card for card in lesson['cards'] if card['stage'] == 'Learn']
        self.assertGreater(len(learns), len(DAY_PARTS))
        image_hashes = set()
        for part, card in zip(DAY_PARTS, learns[:len(DAY_PARTS)]):
            with self.subTest(part=part):
                self.assertEqual(card['audio_text'], f'It is {part}.')
                filename = f'a1_photo_u4_day_{part}_v1.webp'
                self.assertEqual(successful_image_names(card), {filename})
                copies = [(ROOT / folder / filename).read_bytes() for folder in IMAGE_FOLDERS]
                self.assertEqual(copies[0], copies[1])
                self.assertEqual(copies[0], copies[2])
                image_hashes.add(hashlib.sha256(copies[0]).hexdigest())
                with Image.open(ROOT / IMAGE_FOLDERS[0] / filename) as image:
                    self.assertEqual(image.width * 2, image.height * 3)
        self.assertEqual(len(image_hashes), len(DAY_PARTS), 'Each part of the day needs its own scene.')

        manifest = json.loads((ROOT / 'docs/product/time-day-context-assets-v1.json').read_text(encoding='utf-8'))
        self.assertEqual({row['day_part'] for row in manifest['assets']}, set(DAY_PARTS))
        for row in manifest['assets']:
            source = row['source']
            self.assertEqual(hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest(), source['sha256'])
            for folder in IMAGE_FOLDERS:
                self.assertEqual(hashlib.sha256((ROOT / folder / row['filename']).read_bytes()).hexdigest(), row['sha256'])

        for stage in ('Recognize', 'Listen', 'Speak', 'Use'):
            stage_cards = [card for card in lesson['cards'] if card['stage'] == stage]
            self.assertGreater(len(stage_cards), len(DAY_PARTS))
            for index, part in enumerate(DAY_PARTS):
                with self.subTest(stage=stage, part=part):
                    frame = f'it is {part}.'
                    self.assertIn(
                        frame, card_evidence(stage_cards[index]),
                        f'{stage} must practise the day part independently before combining it with an hour.',
                    )

    def test_contextual_clocks_keep_their_day_period_on_the_successful_path(self):
        lesson = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        contexts = {
            'a1_scene_morning_45a21e4.webp': (
                "it is seven o'clock in the morning.", 'it is seven a.m.',
            ),
            'a1_scene_afternoon_7a10f39.webp': (
                "it is three o'clock in the afternoon.", 'it is three p.m.',
            ),
            'a1_scene_night_1be2a44.webp': (
                "it is nine o'clock at night.", 'it is nine p.m.',
            ),
        }
        for filename, answers in contexts.items():
            with self.subTest(image=filename):
                uses = [card for card in lesson['cards'] if filename in successful_image_names(card)]
                self.assertTrue(uses, f'The useful contextual clock {filename} must remain in teaching.')
                self.assertTrue(any(answers[0] in card_evidence(card) for card in uses))
                self.assertTrue(all(
                    any(answer in card_evidence(card) for answer in answers)
                    for card in uses
                ))

    def test_approved_plan_teaches_time_in_complete_exchanges_and_preserves_identity(self):
        plan = json.loads((ROOT / 'docs/product/content-plans/4.10-time-exchanges-v1.plan.json').read_text(encoding='utf-8'))
        lesson = compose_lesson(plan)
        canonical = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        self.assertEqual(lesson, canonical)
        self.assertEqual(lesson['id'], 'lesson-4-what-time-is-it')
        learns = [c for c in lesson['cards'] if c['stage'] == 'Learn'][len(DAY_PARTS):]
        self.assertTrue(learns)
        self.assertEqual(len(learns) % 2, 0)
        for question, answer in zip(learns[::2], learns[1::2]):
            self.assertEqual(question['audio_text'], 'What time is it?')
            self.assertTrue(answer['audio_text'].startswith('It is '))
            self.assertNotEqual(question['audio_speaker'], answer['audio_speaker'])

        successful = ' '.join(card_evidence(card) for card in lesson['cards'])
        practice = ' '.join(card_evidence(card) for card in lesson['cards']
                            if card['stage'] in ('Recognize', 'Listen'))
        for hour in ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve']:
            self.assertRegex(practice, rf'\b{hour}\b')
        for period in ['in the morning','in the afternoon','in the evening','at night','a.m.','p.m.']:
            self.assertIn(period, successful)

    def test_all_learner_language_stays_with_day_parts_and_time(self):
        lesson = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        for card in lesson['cards']:
            with self.subTest(slide=card['slide_id']):
                self.assertNotRegex(
                    card_language(card),
                    r'\b(?:wake|study|work|school|breakfast|run|eat|sleep|routine|activities)\b',
                )
                for field in ('prompt', 'audio_text', 'answer_audio_text'):
                    self.assertNotEqual((card.get(field) or '').lower().strip('. '), "o'clock")
                if card['stage'] != 'Use':
                    for option in card['options']:
                        self.assertNotEqual((option.get('label') or '').lower().strip('. '), "o'clock")

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
