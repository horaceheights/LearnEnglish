import json
import hashlib
import unittest
import copy
import re
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
EXCHANGE_PHOTOS_PATH = ROOT / 'docs/product/time-exchange-photo-assets-v2.json'
# 2026-10-06 approval: the woman asks; the male watch-wearer replies.
# Pin only depicted exchanges, leaving independent clock narration untouched.
EXCHANGE_SPEAKERS = {
    **{f'L{number}': {'audio_speaker': 'female-character' if number % 2 else 'luis'}
       for number in range(1, 15)},
    **{slide: {'audio_speaker': 'female-character', 'answer_audio_speaker': 'luis'}
       for slide in ('R7', 'R9')},
    **{f'S{number}': {'audio_speaker': 'female-character' if number in (1, 3) else 'luis'}
       for number in range(1, 9)},
    **{slide: {'audio_speaker': role, 'answer_audio_speaker': role}
       for role, slides in (
           ('female-character', ('U1', 'U5')),
           ('luis', ('U2', 'U3', 'U6', 'U7')),
       ) for slide in slides},
}


def assert_matching_exchange(question_image, reply_image, assets):
    question, reply = assets[Path(question_image).name], assets[Path(reply_image).name]
    if (question['role'], reply['role']) != ('ask', 'reply'):
        raise ValueError('An exchange needs an asking view followed by its watch close-up.')
    for key in ('hour', 'day_part', 'notation', 'clock_id', 'scene_id', 'pair_id'):
        if question[key] != reply[key]:
            raise ValueError(f'Question and reply disagree on {key}.')


def check_time_image(text, image, meanings):
    """Check target meaning for any model, prompt, choice or individual turn."""
    meaning = meanings[Path(image).name]
    text = text.lower().replace('-', ' ').replace('a.m.', 'am').replace('p.m.', 'pm')
    hours = ('one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve')
    hour = next((i for i, word in enumerate(hours, 1) if re.search(rf'\b{word}\b', text)), None)
    part = next((p for p in DAY_PARTS if re.search(rf'\b{p}\b', text)), None)
    if re.search(r'\bam\b', text) or (part == 'morning' and hour == 3):
        part = 'night' if hour == 3 else 'morning'
    elif re.search(r'\bpm\b', text):
        part = {3: 'afternoon', 7: 'evening', 9: 'night'}.get(hour)
    if hour is not None and meaning.get('hour') != hour:
        raise ValueError(f'{image}: wrong clock hour for {text}')
    if part is not None and meaning.get('day_part') != part:
        raise ValueError(f'{image}: missing or wrong day background for {text}')


def time_image_meanings():
    photos = json.loads(EXCHANGE_PHOTOS_PATH.read_text(encoding='utf-8'))
    meanings = {a['filename']: a for a in photos['assets']}
    neutral = json.loads((ROOT / 'docs/product/time-photograph-assets-v4.json').read_text(encoding='utf-8'))
    meanings.update({a['filename']: {'hour': a['hour'], 'day_part': None} for a in neutral['assets']})
    meanings.update({f'a1_photo_u4_day_{p}_v1.webp': {'day_part': p} for p in DAY_PARTS})
    meanings.update({
        'a1_scene_morning_45a21e4.webp': {'hour': 7, 'day_part': 'morning'},
        'a1_scene_afternoon_7a10f39.webp': {'hour': 3, 'day_part': 'afternoon'},
        'a1_scene_night_1be2a44.webp': {'hour': 9, 'day_part': 'night'},
    })
    return meanings



def successful_image_names(card):
    correct = {card.get('correct_option_id'), *(card.get('correct_option_ids') or [])}
    images = [card.get('prompt_image_url')]
    images.extend(option.get('image_url') for option in card['options'] if option['id'] in correct)
    for field in ('audio_turns', 'answer_audio_turns'):
        images.extend(turn.get('image_url') for turn in card.get(field) or [])
    return {Path(image).name for image in images if image}


class TimeLessonContractTests(unittest.TestCase):
    def test_depicted_time_exchanges_voice_the_female_asker_and_male_watch_wearer(self):
        canonical = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        plan = json.loads((ROOT / 'docs/product/content-plans/4.10-time-exchanges-v1.plan.json').read_text(encoding='utf-8'))
        for source, lesson in [('canonical', canonical), ('source plan', compose_lesson(plan))]:
            cards = {card['slide_id']: card for card in lesson['cards']}
            for slide, expected in EXCHANGE_SPEAKERS.items():
                for field, speaker in expected.items():
                    with self.subTest(source=source, slide=slide, field=field):
                        self.assertEqual(cards[slide].get(field), speaker,
                                         'The recorded voice must match the approved pictured speaker.')
            for number in range(6, 11):
                slide = f'A{number}'
                with self.subTest(source=source, slide=slide, field='audio_turns'):
                    turns = cards[slide].get('audio_turns', [])
                    self.assertEqual(len(turns), 2)
                    self.assertEqual(turns[0]['text'], 'What time is it?')
                    self.assertTrue(turns[1]['text'].startswith('It is '))
                    self.assertEqual([turn['speaker_role'] for turn in turns],
                                     ['female-character', 'luis'])

    def test_time_brief_learn_models_preserve_canonical_words_and_speaker_roles(self):
        canonical = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        brief = json.loads((ROOT / 'docs/product/content-briefs/unit-4/4.10-time-exchanges-v1.json').read_text(encoding='utf-8'))
        learns = {card['slide_id']: card for card in canonical['cards'] if card['stage'] == 'Learn'}
        self.assertEqual({item['id'] for item in brief['items']}, set(learns))
        for item in brief['items']:
            with self.subTest(slide=item['id']):
                card = learns[item['id']]
                self.assertEqual(item['text'], card['audio_text'])
                self.assertEqual(item['speaker'], card['audio_speaker'])

    def test_every_slide_image_and_distractor_matches_its_time_meaning(self):
        lesson = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        meanings = time_image_meanings()
        checked = set()
        checked_images = set()
        for card in lesson['cards']:
            with self.subTest(slide=card['slide_id']):
                target = card.get('answer_audio_text') or card.get('audio_text') or card['prompt']
                if card.get('prompt_image_url'):
                    check_time_image(target, card['prompt_image_url'], meanings)
                    checked_images.add(Path(card['prompt_image_url']).name)
                for option in card['options']:
                    if option.get('image_url'):
                        check_time_image(option.get('label') or option['id'], option['image_url'], meanings)
                        checked_images.add(Path(option['image_url']).name)
                        if card['stage'] == 'Listen' and option['id'] == card['correct_option_id']:
                            check_time_image(target, option['image_url'], meanings)
                for field in ('audio_turns', 'answer_audio_turns'):
                    for turn in card.get(field, []):
                        if turn.get('image_url'):
                            check_time_image(turn['text'], turn['image_url'], meanings)
                            checked_images.add(Path(turn['image_url']).name)
                checked.add(card['slide_id'])
        self.assertEqual(len(checked), 70)
        self.assertEqual({c['stage'] for c in lesson['cards']}, {'Learn', 'Recognize', 'Listen', 'Speak', 'Use'})
        self.assertEqual({name for name in checked_images if name.startswith('a1_photo_time_')},
                         {name for name in meanings if name.startswith('a1_photo_time_')},
                         'The approved v2 manifest must cover exactly the exchange images in use.')

    def test_pm_label_on_gray_wall_does_not_satisfy_evening_background(self):
        with self.assertRaisesRegex(ValueError, 'day background'):
            check_time_image("It is seven o'clock in the evening.", 'a1_time_photo_clock_07_pm_v4.webp', time_image_meanings())

    def test_exchange_views_match_clock_hour_and_day_context(self):
        report = json.loads(EXCHANGE_PHOTOS_PATH.read_text(encoding='utf-8'))
        assets = {row['filename']: row for row in report['assets']}
        lesson = json.loads(LESSON_PATH.read_text(encoding='utf-8'))
        cards = {card['slide_id']: card for card in lesson['cards']}
        learns = [c for c in lesson['cards'] if c['stage'] == 'Learn'][4:]
        for question, reply in zip(learns[::2], learns[1::2]):
            assert_matching_exchange(question['options'][0]['image_url'], reply['options'][0]['image_url'], assets)
        for q, a in [('S1', 'S2'), ('S3', 'S4'), ('U1', 'U2'), ('U5', 'U6')]:
            question, reply = cards[q], cards[a]
            question_image = question.get('prompt_image_url') or question['options'][0]['image_url']
            reply_image = reply.get('prompt_image_url') or reply['options'][0]['image_url']
            assert_matching_exchange(question_image, reply_image, assets)
        for card in lesson['cards']:
            turns = card.get('audio_turns', [])
            if len(turns) == 2 and turns[0]['text'] == 'What time is it?':
                assert_matching_exchange(turns[0]['image_url'], turns[1]['image_url'], assets)
        for q, a in [('L11', 'L12'), ('L9', 'L10')]:
            self.assertEqual(assets[cards[q]['options'][0]['image_url']]['day_part'], 'night')
            self.assertEqual(assets[cards[a]['options'][0]['image_url']]['day_part'], 'night')
        self.assertEqual(assets[cards['L12']['options'][0]['image_url']]['notation'], '3:00 AM')
        self.assertNotIn('a1_photo_u4_what_time_luis_v1.webp', json.dumps(lesson))
        self.assertNotRegex(json.dumps(lesson), r'a1_photo_time_\w+_v1\.webp')

    def test_daytime_question_cannot_be_paired_with_three_am(self):
        report = json.loads(EXCHANGE_PHOTOS_PATH.read_text(encoding='utf-8'))
        assets = {row['filename']: row for row in report['assets']}
        with self.assertRaisesRegex(ValueError, 'day_part'):
            assert_matching_exchange('a1_photo_time_03_pm_ask_v2.webp', 'a1_photo_time_03_am_reply_v2.webp', assets)
        for key, wrong in [('pair_id', 'other-pair'), ('hour', 9), ('notation', '3:00 PM'),
                           ('scene_id', 'different-place'), ('clock_id', 'other-clock')]:
            mutated = copy.deepcopy(assets)
            mutated['a1_photo_time_03_am_ask_v2.webp'][key] = wrong
            with self.assertRaisesRegex(ValueError, key):
                assert_matching_exchange('a1_photo_time_03_am_ask_v2.webp', 'a1_photo_time_03_am_reply_v2.webp', mutated)

    def test_historical_v1_photo_provenance_and_assets_remain_untouched(self):
        path = ROOT / 'docs/product/time-exchange-photo-assets-v1.json'
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),
                         '5615e33743850ba652c60e1580d421f0eb6d5f68b6131b2806f2e8e57a01d281')
        report = json.loads(path.read_text(encoding='utf-8'))
        for source in [*report['sources'], report['recipe']]:
            self.assertEqual(hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest(), source['sha256'])
        for asset in report['assets']:
            for folder in IMAGE_FOLDERS:
                payload = (ROOT / folder / asset['filename']).read_bytes()
                self.assertEqual(len(payload), asset['bytes'])
                self.assertEqual(hashlib.sha256(payload).hexdigest(), asset['sha256'])
            with Image.open(ROOT / IMAGE_FOLDERS[0] / asset['filename']) as photo:
                self.assertEqual(photo.size, (1536, 1024))

    def test_v2_photo_provenance_and_runtime_pixels_match_the_approved_set(self):
        report = json.loads(EXCHANGE_PHOTOS_PATH.read_text(encoding='utf-8'))
        self.assertEqual(report['schema_version'], 2)
        self.assertEqual(report['provider'], 'built-in image_gen')
        self.assertNotIn('recipe', report, 'The generated v2 set has no deterministic compositing recipe.')
        self.assertEqual(report['source_set_review'], {
            'status': 'approved', 'date': '2026-10-06',
            'user_response': 'Yes, apply the complete set',
        })
        expected_pairs = {
            '07': (7, 'morning', '7:00'),
            '07_am': (7, 'morning', '7:00 AM'),
            '03_pm': (3, 'afternoon', '3:00 PM'),
            '07_pm': (7, 'evening', '7:00 PM'),
            '09_pm': (9, 'night', '9:00 PM'),
            '03_am': (3, 'night', '3:00 AM'),
            '09_am': (9, 'morning', '9:00 AM'),
        }
        assets = {asset['filename']: asset for asset in report['assets']}
        self.assertEqual(len(assets), len(report['assets']), 'Asset filenames must be unique.')
        self.assertEqual(set(assets), {
            f'a1_photo_time_{pair}_{role}_v2.webp'
            for pair in expected_pairs
            for role in (('reply',) if pair == '09_am' else ('ask', 'reply'))
        })
        for pair, (hour, day_part, notation) in expected_pairs.items():
            ask, reply = (f'a1_photo_time_{pair}_{role}_v2.webp' for role in ('ask', 'reply'))
            views = [('reply', reply)]
            if pair != '09_am':
                assert_matching_exchange(ask, reply, assets)
                views.insert(0, ('ask', ask))
            for role, filename in views:
                with self.subTest(filename=filename):
                    asset = assets[filename]
                    self.assertEqual((asset['pair_id'], asset['role'], asset['hour'],
                                      asset['day_part'], asset['notation']),
                                     (pair, role, hour, day_part, notation))
                    self.assertTrue(asset['clock_id'])
                    self.assertTrue(asset['scene_id'])
                    self.assertTrue(asset['description'].strip())
                    self.assertEqual(asset['asking_speaker_role'], 'female-character')
                    self.assertEqual(asset['reply_speaker_role'], 'luis')
                    self.assertEqual(asset['watch_owner'], 'luis')
                    # Chat approval covers the source set; phone crop review is separate.
                    self.assertEqual(asset['human_semantic_review']['status'], 'pending')
                    source = asset['source_generation']
                    self.assertEqual(source['provider'], report['provider'])
                    self.assertEqual(Path(source['output_filename']).name, source['output_filename'])
                    self.assertTrue(source['output_filename'].endswith('.png'))
                    self.assertRegex(source['sha256'], r'^[0-9a-f]{64}$')
                    if filename == 'a1_photo_time_03_am_reply_v2.webp':
                        self.assertIsNone(source['prompt'])
                        self.assertIn('not retained', source['prompt_record'])
                        self.assertIn('do not infer', source['prompt_record'])
                    else:
                        self.assertTrue(source['prompt'].strip())
                    source_path = Path(source['path'])
                    self.assertEqual(source_path.name, source['output_filename'])
                    self.assertEqual(source_path.parent.as_posix(),
                                     'docs/product/media-sources/time-exchanges-v2')
                    self.assertEqual(hashlib.sha256((ROOT / source_path).read_bytes()).hexdigest(),
                                     source['sha256'])
                    with Image.open(ROOT / source_path) as generated:
                        self.assertEqual(generated.format, 'PNG')
                        self.assertEqual(generated.size, tuple(asset['dimensions']))
                        source_pixels = generated.convert('RGB').tobytes()
                    encoding = asset['encoding']
                    self.assertEqual(encoding['format'], 'webp')
                    self.assertIs(encoding['lossless'], True)
                    self.assertIs(encoding['source_pixel_parity'], True)
                    self.assertRegex(encoding['decoded_rgb_sha256'], r'^[0-9a-f]{64}$')
                    self.assertEqual(hashlib.sha256(source_pixels).hexdigest(),
                                     encoding['decoded_rgb_sha256'])
                    self.assertEqual(asset['dimensions'], [1536, 1024])
                    self.assertEqual(set(asset['copies']), {
                        f'{folder}/{filename}' for folder in IMAGE_FOLDERS
                    })
                    copies = [(ROOT / folder / filename).read_bytes() for folder in IMAGE_FOLDERS]
                    self.assertEqual(copies[0], copies[1])
                    self.assertEqual(copies[0], copies[2])
                    self.assertEqual(len(copies[0]), asset['bytes'])
                    self.assertEqual(hashlib.sha256(copies[0]).hexdigest(), asset['sha256'])
                    with Image.open(ROOT / IMAGE_FOLDERS[0] / filename) as photo:
                        self.assertEqual(photo.format, 'WEBP')
                        self.assertEqual(photo.size, tuple(asset['dimensions']))
                        runtime_pixels = photo.convert('RGB').tobytes()
                        self.assertTrue(runtime_pixels == source_pixels,
                                        'The lossless runtime image must preserve every source RGB pixel.')
                        self.assertEqual(hashlib.sha256(runtime_pixels).hexdigest(),
                                         encoding['decoded_rgb_sha256'])

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

    def test_contextual_clocks_remain_as_meaningful_practice_references(self):
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
                uses = [card for card in lesson['cards'] if filename in successful_image_names(card)
                        or any(Path(o.get('image_url') or '').name == filename for o in card['options'])]
                self.assertTrue(uses, f'The useful contextual clock {filename} must remain in teaching.')
                for card in uses:
                    if filename in successful_image_names(card):
                        self.assertTrue(any(answer in card_evidence(card) for answer in answers))
                    else:
                        # The original sunrise clock is the meaningful morning
                        # contrast to the evening watch in the listening bank.
                        for option in card['options']:
                            if Path(option.get('image_url') or '').name == filename:
                                check_time_image(option.get('label') or option['id'], filename, time_image_meanings())

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
