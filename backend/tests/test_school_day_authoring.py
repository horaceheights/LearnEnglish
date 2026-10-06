"""Grammar introductions must retain exact reviewed models and prior language."""
from copy import deepcopy
import unittest
from scripts.content_engine.practice import learn_context_groups
ANCHORS = {'first', 'then', 'Do you...?', 'Yes, I do.'}

def card(slide, text):
    return {'slide_id': slide, 'stage': 'Learn', 'prompt': text, 'audio_text': text, 'options': [{'id': slide, 'label': text}]}

def sequence():
    cards = [card('L1', 'First, I eat.'), card('L2', 'Then, I wash.')]
    groups = [{'kind': 'sequence', 'targets': ['first', 'then'], 'models': [{'slide_id': c['slide_id'], 'text': c['prompt']} for c in cards]}]
    return (cards, groups, ['first', 'then'], {'i', 'eat', 'wash'})

def result(values):
    return learn_context_groups(*values, ANCHORS)

class ContextualGrammarIntroductionTests(unittest.TestCase):

    def test_exact_reviewed_sequence_retrieves_only_known_context(self):
        allowed, errors = result(sequence())
        assert allowed == {'L1', 'L2'}
        assert not errors

    def test_coupled_question_action_and_reply_introduce_declared_new_language(self):
        cards = [card('L1', 'Do you work?'), card('L2', 'Yes, I do.')]
        groups = [{'kind': 'exchange', 'targets': ['Do you...?', 'work', 'Yes, I do.'], 'models': [{'slide_id': c['slide_id'], 'text': c['prompt']} for c in cards]}]
        allowed, errors = result((cards, groups, ['Do you...?', 'work', 'Yes, I do.'], {'i', 'you'}))
        assert allowed == {'L1', 'L2'} and (not errors)

    def test_changed_visible_or_audible_model_cannot_inherit_review(self):
        for field in ['prompt', 'audio_text']:
            values = sequence()
            values[0][0][field] = 'First, I wash.'
            allowed, errors = result(values)
            assert not allowed and errors

    def test_unintroduced_context_is_rejected_even_when_metadata_matches(self):
        cards, groups, vocabulary, known = sequence()
        cards[0] = card('L1', 'First, I drive.')
        groups[0]['models'][0]['text'] = cards[0]['prompt']
        assert result((cards, groups, vocabulary, known))[1]

    def test_arbitrary_new_noun_does_not_unlock_sentence_learn(self):
        cards = [card('L1', 'This is a book.')]
        groups = [{'kind': 'sequence', 'targets': ['book'], 'models': [{'slide_id': 'L1', 'text': 'This is a book.'}]}]
        allowed, errors = result((cards, groups, ['book'], {'this', 'is', 'a'}))
        assert not allowed and errors

    def test_claimed_new_target_requires_real_model(self):
        cards, groups, vocabulary, known = sequence()
        groups[0]['targets'].append('finally')
        vocabulary.append('finally')
        allowed, errors = result((cards, groups, vocabulary, known))
        assert not allowed and errors

    def test_reordering_or_overlapping_bindings_is_rejected(self):
        cards, groups, vocabulary, known = sequence()
        cards.reverse()
        assert result((cards, groups, vocabulary, known))[1]
        cards.reverse()
        groups.append(deepcopy(groups[0]))
        assert result((cards, groups, vocabulary, known))[1]

    def test_extra_known_audio_turn_cannot_silently_change_model(self):
        values = sequence()
        values[0][0]['audio_turns'] = [{'text': 'Then, I wash.', 'speaker_role': 'teacher'}]
        assert result(values)[1]

    def test_exact_contrast_sequence_can_explicitly_retrieve_a_known_support_target(self):
        cards = [card('L1', 'It is morning.'), card('L2', 'It is afternoon.')]
        groups = [{'kind': 'sequence', 'targets': ['afternoon'], 'support_targets': ['morning'],
                   'models': [{'slide_id': c['slide_id'], 'text': c['prompt']} for c in cards]}]
        allowed, errors = learn_context_groups(cards, groups, ['afternoon'], {'it', 'is', 'morning'}, {'afternoon'})
        assert allowed == {'L1', 'L2'} and not errors

    def test_known_support_requires_exact_declared_binding_and_prior_teaching(self):
        cards = [card('L1', 'It is morning.'), card('L2', 'It is afternoon.')]
        group = {'kind': 'sequence', 'targets': ['afternoon'], 'support_targets': ['morning'],
                 'models': [{'slide_id': c['slide_id'], 'text': c['prompt']} for c in cards]}
        for support, known in [([], {'it', 'is', 'morning'}), (['morning'], {'it', 'is'}),
                               (['night'], {'it', 'is', 'morning', 'night'})]:
            changed = {**group, 'support_targets': support}
            assert learn_context_groups(cards, [changed], ['afternoon'], known, {'afternoon'})[1]

    def test_support_targets_cannot_authorize_known_only_groups_or_question_exchanges(self):
        cards = [card('L1', 'It is morning.')]
        group = {'kind': 'sequence', 'targets': [], 'support_targets': ['morning'],
                 'models': [{'slide_id': 'L1', 'text': 'It is morning.'}]}
        assert learn_context_groups(cards, [group], [], {'it', 'is', 'morning'}, {'afternoon'})[1]
        values = sequence()
        values[1][0]['kind'] = 'exchange'
        values[1][0]['support_targets'] = ['eat']
        assert result(values)[1]
