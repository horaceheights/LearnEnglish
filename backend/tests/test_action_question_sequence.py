import copy
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


class ActionQuestionSequenceTests(unittest.TestCase):
    def setUp(self):
        self.brief = json.loads(BRIEF.read_text('utf-8'))
        self.standards = load_standards(ROOT, 'a1')
        self.lesson = compose_lesson(propose_lesson(self.brief, self.standards)[0])

    def test_each_stage_preserves_four_adjacent_exchanges_and_all_familiar_actions(self):
        actions = set()
        for stage in ('Learn', 'Recognize', 'Listen', 'Speak', 'Use'):
            cards = [card for card in self.lesson['cards'] if card['stage'] == stage]
            self.assertEqual(len(cards), 8)
            for index, question in enumerate(QUESTIONS):
                q, answer = cards[index * 2:index * 2 + 2]
                self.assertEqual(q['audio_text'], question)
                line = answer.get('answer_audio_text') or answer['audio_text']
                subject = ['I am', 'She is', 'He is', 'They are'][index]
                self.assertRegex(line, '^' + subject + r' \w+ing\.$')
                actions.add(line.split()[-1].rstrip('.'))
                self.assertNotEqual(q['audio_text'], 'Doing')
            if stage != 'Learn':
                self.assertGreaterEqual(len({(c.get('answer_audio_text') or c['audio_text']).split()[-1]
                                              for c in cards[1::2]}), 4)
        self.assertEqual(actions, set('writing reading eating playing cooking sleeping running drinking working talking swimming studying sitting'.split()))

    def test_questions_are_heard_without_written_answer_leakage(self):
        for card in self.lesson['cards']:
            if card['stage'] not in ('Recognize', 'Listen') or int(re.sub(r'\D', '', card['slide_id'])) % 2 == 0:
                continue
            self.assertTrue(card['interaction_type'].startswith('a2t'))
            self.assertEqual(card['prompt'], 'Listen and choose.')
            self.assertIsNone(card['answer_audio_text'])
            self.assertTrue(all(not option['image_url'] for option in card['options']))

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
