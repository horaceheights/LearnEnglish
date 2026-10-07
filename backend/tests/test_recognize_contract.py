import copy
import unittest

from scripts.recognize_contract import recognize_errors
from scripts.content_engine.recipes import choice
from scripts.content_engine.author import BriefError, _choice


class RecognizeContractTests(unittest.TestCase):
    def lesson(self):
        return {'id': 'example', 'cards': [{
            'slide_id': 'R1', 'stage': 'Recognize', 'interaction_type': 'i2t2',
            'prompt': 'What is she doing?', 'audio_text': 'What is she doing?',
            'prompt_image_url': 'reading.webp', 'correct_option_id': 'reading',
            'options': [{'id': 'reading', 'label': 'She is reading.', 'image_url': ''},
                        {'id': 'cooking', 'label': 'She is cooking.', 'image_url': ''}],
        }]}

    def test_content_question_is_allowed_but_upfront_answer_is_not(self):
        lesson = self.lesson()
        self.assertEqual(recognize_errors(lesson), [])
        for field in ('prompt', 'audio_text'):
            changed = copy.deepcopy(lesson)
            changed['cards'][0][field] += ' She is reading.'
            self.assertTrue(any('reveals' in e for e in recognize_errors(changed)))
        lesson['cards'][0]['audio_turns'] = [{'text': 'She is reading.'}]
        self.assertTrue(any('audio_turns reveals' in e for e in recognize_errors(lesson)))

    def test_decorative_picture_does_not_turn_listening_into_recognition(self):
        lesson = self.lesson()
        card = lesson['cards'][0]
        card.update(interaction_type='a2t2', prompt='¡Escucha y elige!', audio_text='She is reading.')
        self.assertTrue(any('audio-only' in e for e in recognize_errors(lesson)))
        card['prompt_image_url'] = ''
        self.assertTrue(any('one image' in e for e in recognize_errors(lesson)))

    def test_one_visible_phrase_can_select_photos(self):
        lesson = self.lesson()
        card = lesson['cards'][0]
        card.update(interaction_type='t2i2', prompt='She is reading.', prompt_image_url='')
        for option in card['options']:
            option['image_url'] = option['id'] + '.webp'
            option['label'] = None
        self.assertEqual(recognize_errors(lesson), [])
        card['prompt'] = '¡Escucha y elige!'
        self.assertTrue(recognize_errors(lesson))

    def test_corrected_sections_reuse_the_lesson_1_1_template(self):
        from backend.app.data import LESSONS
        scope = {
            'lesson-3-3-am-is-and-are': {'R1','R2','R3','R4','R5','R6','R7','R8'},
            'lesson-4-do-you-questions': {'R1','R2','R3','R4','R5','R6','R9','R10'},
            'lesson-4-9-unit-4-review': {'R7','R8','R9','R10'},
            'lesson-4-what-time-is-it': {'R1'},
            'lesson-5-drinks': {'R9'},
        }
        for lesson_id, slides in scope.items():
            cards = [c.model_dump(mode='json') for c in LESSONS[lesson_id].cards if c.slide_id in slides]
            self.assertEqual(len(cards), len(slides))
            for card in cards:
                with self.subTest(lesson=lesson_id, slide=card['slide_id']):
                    self.assertIsNone(card.get('prompt_presentation'))
                    self.assertFalse(card.get('audio_turns'))
                    if card['interaction_type'].startswith('t2i'):
                        self.assertNotIn('?', card['prompt'])
                        self.assertNotIn('\n', card['prompt'])
                        self.assertEqual(card['audio_text'], card['prompt'])
                        self.assertFalse(card.get('prompt_image_url'))
                        self.assertTrue(all(o['image_url'] and not o.get('label') for o in card['options']))
                    else:
                        self.assertEqual(card['prompt'], '')
                        self.assertFalse(card['audio_text'])
                        self.assertTrue(card['prompt_image_url'])
                        answer = next(o['label'] for o in card['options'] if o['id'] == card['correct_option_id'])
                        self.assertEqual(card['answer_audio_text'], answer)

    def test_mission_metadata_keeps_its_separate_contract(self):
        lesson = self.lesson()
        lesson['experience_type'] = 'mission'
        lesson['cards'][0]['prompt_image_url'] = ''
        self.assertEqual(recognize_errors(lesson), [])

    def test_author_and_recipe_reject_the_old_audio_exception(self):
        with self.assertRaisesRegex(BriefError, 'image/text matching'):
            _choice('R1', 'Recognize', {'choice_input': 'audio'}, [], 2, image=False, instructions={})
        spec = dict(self.lesson()['cards'][0], input_modality='audio')
        with self.assertRaisesRegex(ValueError, 'image/text matching'):
            choice(spec)
        spec['stage'] = 'Listen'
        self.assertEqual(choice(spec)['interaction_type'], 'a2t2')

    def test_every_canonical_standard_card_obeys_the_contract(self):
        from backend.app.data import LESSONS
        for lesson in LESSONS.values():
            with self.subTest(lesson=lesson.id):
                self.assertEqual(recognize_errors(lesson.model_dump(mode='json')), [])


if __name__ == '__main__':
    unittest.main()
