"""Regression evidence for the approved Unit 7 sequence, not course-size caps."""
import json
import unittest
from pathlib import Path

from scripts.content_engine.plan import compose_lesson
from scripts.content_engine.practice import card_evidence, term_pattern

ROOT = Path(__file__).resolve().parents[2]
PLANS = ROOT / 'docs/product/content-plans/unit7-approved-2026-10-19'
LESSONS = {d['sub_lesson_id']: d for p in (ROOT / 'backend/lessons/unit_7').glob('*.yaml')
           for d in [json.loads(p.read_text(encoding='utf-8'))]}


class Unit7ApprovedProgressionTests(unittest.TestCase):
    def test_complete_approved_allocation_is_reproducible_and_versioned(self):
        allocations = [55, 49, 42, 44, 45, 54, 42, 48, 74, 19]
        self.assertEqual(set(LESSONS), {f'7.{n}' for n in range(1, 11)})
        for n, count in enumerate(allocations, 1):
            lesson = LESSONS[f'7.{n}']
            plan = json.loads((PLANS / f'7.{n}.plan.json').read_text(encoding='utf-8'))
            with self.subTest(lesson=f'7.{n}'):
                self.assertFalse(plan['draft'])
                self.assertEqual(compose_lesson(plan), lesson)
                self.assertEqual(len(lesson['cards']), count)
                self.assertGreaterEqual(lesson['content_revision'], 4 if n == 6 else 3)

    def test_unit_practices_sixty_targets_and_review_retrieves_each(self):
        review = LESSONS['7.9']
        self.assertEqual(len(review['review_vocabulary']), 60)
        for term in review['review_vocabulary']:
            pattern = term_pattern(term)
            practiced = [c for lesson in LESSONS.values() for c in lesson['cards']
                         if pattern.search(card_evidence(c))]
            with self.subTest(target=term):
                self.assertTrue(any(pattern.search(card_evidence(c)) for c in review['cards']))
                self.assertGreaterEqual(len(practiced), 5)
                stages = {c['stage'] for c in practiced}
                self.assertGreaterEqual(len(stages), 4)
                self.assertLessEqual({'Listen', 'Speak'}, stages)

    def test_body_progresses_head_to_toes_and_drawing_uses_corrected_perspective(self):
        self.assertEqual(LESSONS['7.1']['vocabulary'],
                         ['head', 'eyes', 'ears', 'nose', 'mouth', 'arms', 'hands', 'fingers', 'legs', 'feet', 'toes'])
        drawing = [c for c in LESSONS['7.6']['cards'] if 'i like to draw' in card_evidence(c)]
        self.assertEqual({c['stage'] for c in drawing}, {'Learn','Recognize','Listen','Speak','Use'})
        for card in drawing:
            self.assertIn('a1_photo_u7_approved_draw_v2.webp', json.dumps(card))
            self.assertNotIn('a1_photo_u7_approved_draw_v1.webp', json.dumps(card))

    def test_communication_repair_has_distinct_native_quick_and_clear_turns(self):
        cards = {c['slide_id']: c for c in LESSONS['7.8']['cards']}
        quick = cards['L4']['audio_turns'][0]
        clear = cards['L5']['audio_turns'][1]
        self.assertEqual(quick['text'], clear['text'])
        self.assertEqual(quick['speaker_role'], clear['speaker_role'])
        self.assertEqual((quick['delivery'], clear['delivery']), ('quick','clear'))
        self.assertIn('you speak fast.', card_evidence(cards['L4']))
        self.assertIn('please speak slowly', card_evidence(cards['L5']))

    def test_mission_preserves_story_order_and_unscored_outcomes(self):
        cards = LESSONS['7.10']['cards']
        listening = [c for c in cards if c['mission_game']['kind'] != 'voice-gate']
        gates = [c for c in cards if c['mission_game']['kind'] == 'voice-gate']
        self.assertEqual((len(listening), len(gates)), (15, 4))
        self.assertEqual(sum(len(c['mission_game']['cues']) for c in listening), 38)
        self.assertEqual([c['slide_id'] for c in cards], [f'M{n:02}' for n in range(1,20)])
        self.assertEqual([c['slide_id'] for c in cards if c['mission_game'].get('completion_scene')], ['M10','M14'])
        for card in listening:
            if card['slide_id'] != 'M02':
                self.assertEqual(card['mission_game']['cue_order'], 'authored')
        for card in gates:
            self.assertNotIn('completion_scene', card['mission_game'])
            self.assertNotEqual(card['audio_turns'][0]['image_url'], card['options'][0]['image_url'])

    def test_visible_listening_setups_do_not_translate_the_assessed_contrast(self):
        # These banks assess repair, transport or destination. Spanish setup
        # may locate the encounter, but must not answer the listening task.
        cases = [
            ('7.8', 'A2', r'repit|repet|despacio|lentamente'),
            ('7.8', 'A3', r'museo|hospital'),
            ('7.9', 'A22', r'autob[uú]s|tren'),
            ('7.9', 'A28', r'parque|estaci[oó]n'),
            ('7.10', 'M10', r'despacio|r[aá]pido|izquierda|derecha'),
        ]
        for number, slide, answer_cues in cases:
            card = next(c for c in LESSONS[number]['cards'] if c['slide_id'] == slide)
            with self.subTest(lesson=number, slide=slide):
                self.assertTrue(card['context_es'].strip())
                self.assertNotRegex(card['context_es'].lower(), answer_cues)


if __name__ == '__main__':
    unittest.main()
