import copy
import hashlib
import json
import re
import unittest
from pathlib import Path

from scripts.content_engine.author import BriefError, propose_lesson
from scripts.content_engine.catalog import load_standards
from scripts.content_engine.plan import compose_lesson
from scripts.content_engine.practice import learn_context

ROOT = Path(__file__).resolve().parents[2]
BRIEF = ROOT / 'docs/product/content-briefs/unit-3/3.3-am-is-and-are.json'
QUESTIONS = ['What are you doing?', 'What is she doing?', 'What is he doing?', 'What are they doing?']
RECOGNIZE_ANSWERS = ['I am reading.', 'She is cooking.', 'He is sleeping.', 'They are running.']


def recognition_target(card):
    if card['interaction_type'].startswith('t2i'):
        return card['prompt']
    return next(option['label'] for option in card['options']
                if option['id'] == card['correct_option_id'])


class ActionQuestionSequenceTests(unittest.TestCase):
    def setUp(self):
        self.brief = json.loads(BRIEF.read_text('utf-8'))
        self.standards = load_standards(ROOT, 'a1')
        self.lesson = compose_lesson(propose_lesson(self.brief, self.standards)[0])

    def test_each_stage_preserves_perspective_order_and_all_familiar_actions(self):
        actions = set()
        for stage in ('Learn', 'Recognize', 'Listen', 'Speak', 'Use'):
            cards = [card for card in self.lesson['cards'] if card['stage'] == stage]
            self.assertEqual(len(cards), 8)
            for index, question in enumerate(QUESTIONS):
                q, answer = cards[index * 2:index * 2 + 2]
                if stage == 'Recognize':
                    self.assertEqual(recognition_target(q), question)
                    line = recognition_target(answer)
                    self.assertEqual(line, RECOGNIZE_ANSWERS[index])
                else:
                    self.assertEqual(q['audio_text'], question)
                    line = (answer.get('audio_turns') or [{}])[-1].get('text') or answer.get('answer_audio_text') or answer['audio_text']
                subject = ['I am', 'She is', 'He is', 'They are'][index]
                self.assertRegex(line, '^' + subject + r' \w+ing\.$')
                actions.add(line.split()[-1].rstrip('.'))
                self.assertNotEqual(q['audio_text'], 'Doing')
            if stage != 'Learn':
                self.assertGreaterEqual(len({(recognition_target(c) if stage == 'Recognize'
                                               else c.get('answer_audio_text') or c['audio_text']).split()[-1]
                                              for c in cards[1::2]}), 4)
        self.assertEqual(actions, set('writing reading eating playing cooking sleeping running drinking working talking swimming studying sitting'.split()))

    def test_only_listen_uses_heard_question_discrimination(self):
        for card in self.lesson['cards']:
            if card['stage'] != 'Listen' or int(re.sub(r'\D', '', card['slide_id'])) % 2 == 0:
                continue
            self.assertTrue(card['interaction_type'].startswith('a2t'))
            self.assertEqual(card['prompt'], 'Listen and choose.')
            self.assertIsNone(card['answer_audio_text'])
            self.assertTrue(all(not option['image_url'] for option in card['options']))

    def test_recognize_keeps_questions_and_replies_in_the_two_existing_formats(self):
        cards = [c for c in self.lesson['cards'] if c['stage'] == 'Recognize']
        self.assertTrue(any(c['interaction_type'].startswith('t2i') for c in cards))
        self.assertTrue(any(c['interaction_type'].startswith('i2t') for c in cards))
        for card in cards:
            with self.subTest(slide=card['slide_id']):
                self.assertFalse(card.get('audio_turns'))
                self.assertIsNone(card.get('prompt_presentation'))
                if card['interaction_type'].startswith('t2i'):
                    self.assertNotIn('\n', card['prompt'])
                    self.assertEqual(card['audio_text'], card['prompt'])
                    self.assertFalse(card['prompt_image_url'])
                    self.assertTrue(all(o['image_url'] and not o.get('label') for o in card['options']))
                else:
                    self.assertTrue(card['interaction_type'].startswith('i2t'))
                    self.assertEqual(card['prompt'], '')
                    self.assertFalse(card['audio_text'])
                    self.assertTrue(card['prompt_image_url'])
                    self.assertEqual(card['answer_audio_text'], recognition_target(card))

    def test_listening_reply_is_not_rewritten_to_compensate_for_removed_recognize_questions(self):
        card = next(c for c in self.lesson['cards'] if c['slide_id'] == 'A2')
        self.assertEqual(card['interaction_type'], 'a2i2')
        self.assertEqual(card['audio_text'], 'I am cooking.')
        self.assertEqual(card['audio_speaker'], 'luis')
        self.assertFalse(card.get('audio_turns'))
        self.assertEqual(card['prompt_image_url'], '')
        self.assertEqual(card['prompt'], 'Listen and choose.')

    def test_format_repair_preserves_all_other_stages_exactly(self):
        # Snapshot of the full canonical stage cards at 1d6a51df, before the
        # Reconoce changes. No runtime git dependency or lossy target-only check:
        # prompts, options, speakers, media and stage order are all preserved.
        expected = {
            'Learn': '18d8d6f18e09dc6cdecce79a8bd1c318047ddb8101d6f8420d4bb2858202afbd',
            'Listen': '4849373d28f81ff404b43bf4ff90c1f4f349af488b9bbd75dc099cc42d7c9b92',
            'Speak': '51764e08424c4843e4ae6d0114d7337d48eb90cf479b2d3e91350a4aab447eb4',
            'Use': '7298cd1183be5880825257436dbca7d09498e3483c234ec548e8c001076bc913',
        }
        lesson = json.loads((ROOT / 'backend/lessons/unit_3/lesson-3-3-am-is-and-are.yaml').read_text('utf-8'))
        for stage, digest in expected.items():
            cards = [card for card in lesson['cards'] if card['stage'] == stage]
            serialized = json.dumps(cards, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
            with self.subTest(stage=stage):
                self.assertEqual(hashlib.sha256(serialized.encode()).hexdigest(), digest)

    def test_reused_stills_do_not_activate_legacy_videos_with_blurred_side_panels(self):
        from scripts.audit_action_video_bindings import video_map
        for source in ('frontend/components/LessonPlayer.js', 'mobile/src/actionVideos.ts'):
            mapping = video_map((ROOT / source).read_text('utf-8'))
            for key in ('boy_is_drinking', 'boy_is_sleeping', 'girl_is_drinking'):
                self.assertNotIn(key, mapping, source)

    def test_explicit_sequence_rejects_unknown_or_ineligible_items(self):
        changed = copy.deepcopy(self.brief)
        changed['stage_sequences']['Learn'][0] = 'missing'
        with self.assertRaisesRegex(BriefError, 'Unknown item'):
            propose_lesson(changed, self.standards)
        changed = copy.deepcopy(self.brief)
        changed['items'][0]['use'] = False
        changed['stage_sequences']['Use'][0] = changed['items'][0]['id']
        with self.assertRaisesRegex(BriefError, 'ineligible'):
            propose_lesson(changed, self.standards)

    def test_context_is_exact_adjacent_and_cannot_smuggle_new_answer_words(self):
        cards = self.lesson['cards']
        pairs = self.lesson['learn_context_pairs']
        known = set('what are you is she he they i am writing reading eating playing'.split())
        allowed, errors = learn_context(cards, pairs, self.lesson['vocabulary'], known)
        self.assertEqual(errors, [])
        self.assertEqual(allowed, {f'L{i}' for i in range(1, 9)})
        for change in ('reorder', 'word', 'stale'):
            altered = copy.deepcopy(cards)
            metadata = copy.deepcopy(pairs)
            if change == 'reorder':
                altered[1], altered[2] = altered[2], altered[1]
            elif change == 'word':
                altered[1]['prompt'] = metadata[0]['answer'] = 'I am juggling.'
            else:
                metadata[0]['question'] = 'What is it?'
            allowed, errors = learn_context(altered, metadata, self.lesson['vocabulary'], known)
            self.assertTrue(errors, change)
            self.assertNotIn('L2', allowed)


if __name__ == '__main__':
    unittest.main()
