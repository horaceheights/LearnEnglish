"""Supported single-blank completions round-trip through shared authoring."""
import unittest

from scripts.content_engine.plan import compose_card, import_card
from scripts.content_engine.recipes import complete


class CompletionRecipeTests(unittest.TestCase):
    def test_single_blank_preserves_a_nonfirst_correct_choice_without_construction_order(self):
        card = {
            'slide_id': 'U1', 'stage': 'Use', 'interaction_type': 'complete',
            'prompt': 'It is ___.', 'options': [
                {'id': 'night', 'label': 'night'}, {'id': 'morning', 'label': 'morning'}],
            'correct_option_id': 'morning', 'audio_text': 'It is morning.',
            'answer_audio_text': 'It is morning.',
        }
        plan = import_card(card)
        self.assertEqual(plan['recipe'], 'complete')
        self.assertEqual(compose_card(plan), card)
        self.assertNotIn('correct_option_ids', compose_card(plan))

    def test_authored_single_blank_and_ordered_construction_keep_their_own_correct_identity(self):
        spec = {'options': [{'id': 'one'}, {'id': 'two'}],
                'correct_option_id': 'two', 'answer_audio_text': 'Two.'}
        self.assertEqual(complete(spec)['correct_option_id'], 'two')
        self.assertEqual(complete({**spec, 'correct_option_ids': ['one', 'two']})['correct_option_id'], 'one')
