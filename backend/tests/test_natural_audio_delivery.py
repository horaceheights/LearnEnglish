import copy
import hashlib
import json
import unittest

from backend.app.card_audio_assets import assets_for_card, bind_lesson_audio_assets
from backend.app.course_audio_profile import natural_delivery_text
from backend.app.course_audio_receipts import validate_provenance
from backend.app.course_audio_registry import load_approved_take_registry
from backend.app.schemas import CourseAudioTurn, Lesson, LessonCard, MissionLessonCard
from scripts.render_course_audio_assets import RenderJob, take_metadata_matches


def asset_for(delivery=None):
    card = LessonCard(stage='Listen', prompt='The bus leaves at nine.',
                      audio_text='The bus leaves at nine.', correct_option_id='nine',
                      options=[{'id': 'nine', 'label': 'Nine.'}],
                      audio_turns=[CourseAudioTurn(text='The bus leaves at nine.',
                          speaker_role='male-character', image_url='bus.webp', delivery=delivery)])
    return next(a for a in assets_for_card('delivery-test', 0, card)
                if a.purpose == 'prompt-turn-1')


class NaturalAudioDeliveryTests(unittest.TestCase):
    def test_single_mission_cue_fallback_keeps_exact_delivery(self):
        card = MissionLessonCard(slide_id='M1', stage='Listen',
            interaction_type='mission-game', mission_chapter_id='route',
            prompt='Go straight.', audio_text='Go straight.', correct_option_id='a',
            options=[{'id': 'a', 'label': 'Go straight.'}],
            audio_turns=[CourseAudioTurn(text='Go straight.', speaker_role='ana',
                                        image_url='guide.webp', delivery='clear')],
            mission_game={'kind': 'guided-search', 'instruction_es': 'Escucha.',
                'validation': 'single', 'cue_audio_text': 'Go straight.',
                'targets': [{'id': 'a', 'label_es': 'Guía', 'accepted_option_ids': ['a'],
                             'rect': {'x': .1, 'y': .1, 'width': .8, 'height': .8}}],
                'cues': [{'id': 'cue', 'text': 'Go straight.', 'answer_text': 'Go straight.',
                         'target_id': 'a', 'option_id': 'a', 'delivery': 'clear'}]})
        lesson = Lesson(id='delivery-test', title='Test', level='A1', unit_id='unit-test',
            unit_title='Test', lesson_id='test', lesson_title='Test', sub_lesson_id='test',
            sub_lesson_title='Test', goal='Test', vocabulary=[], content_revision=1, cards=[card])
        bind_lesson_audio_assets(lesson)
        fallback = next(a for a in card.audio_assets if a.purpose == 'mission-cue')
        turn = next(a for a in card.audio_assets if a.purpose == 'prompt-turn-1')
        self.assertEqual((turn.speaker_role, turn.delivery, turn.mode, turn.variant),
                         (fallback.speaker_role, fallback.delivery, fallback.mode, fallback.variant))

    def test_ordinary_turn_keeps_legacy_serialization_and_exact_identity(self):
        asset = asset_for()
        self.assertNotIn('delivery', asset.model_dump())
        self.assertNotIn('delivery', CourseAudioTurn(text='Hello.', speaker_role='ana',
                                                   image_url='ana.webp').model_dump())
        contract = {k: getattr(asset, k) for k in ['profile_id', 'purpose', 'text', 'mode',
                    'variant', 'image_ref', 'semantic_role', 'speaker_role', 'revision']}
        contract.update(lesson_id='delivery-test', card_index=0)
        digest = hashlib.sha256(json.dumps(contract, ensure_ascii=False, sort_keys=True,
                                separators=(',', ':')).encode()).hexdigest()[:20]
        self.assertEqual('delivery-test-c001-prompt-turn-1-' + digest, asset.id)

    def test_delivery_is_immutable_but_never_changes_learner_words_or_voice_settings(self):
        assets = [asset_for(d) for d in [None, 'quick', 'clear']]
        self.assertEqual(3, len({a.id for a in assets}))
        self.assertEqual({'The bus leaves at nine.'}, {a.text for a in assets})
        for asset in assets:
            job = RenderJob(kind='ordinary', assets=[asset], text=asset.text)
            request = natural_delivery_text(asset.text, asset.delivery)
            self.assertEqual([(request, 'eleven_v4')], job.request_fragments())
            self.assertEqual(len(request), job.estimated_character_cost())
            self.assertEqual({'stability': .55, 'similarity_boost': .8},
                             job.profile.as_provenance_contract()['settings'])
        with self.assertRaisesRegex(ValueError, 'one exact delivery'):
            RenderJob(kind='ordinary', assets=assets, text=assets[0].text).request_fragments()
        with self.assertRaisesRegex(ValueError, 'native v4'):
            RenderJob(kind='ordinary', model_id='eleven_multilingual_v2',
                      assets=[assets[1]], text=assets[1].text).request_fragments()

    def test_reuse_and_provenance_cannot_swap_quick_clear_or_unmarked_takes(self):
        asset = asset_for('quick')
        job = RenderJob(kind='ordinary', assets=[asset], text=asset.text)
        registry = load_approved_take_registry()
        provenance = copy.deepcopy(next(t['provenance'] for t in registry['takes'].values()
                                       if t['provenance'].get('model_id') == 'eleven_v4'))
        provenance['generation_delivery'] = 'clear'
        with self.assertRaisesRegex(ValueError, 'delivery does not match'):
            validate_provenance(asset, provenance, audio_sha256='0'*64)
        provenance['generation_delivery'] = 'quick'
        provenance['provider_requests'] = [{'text': asset.text, 'model_id': 'eleven_v4'}]
        with self.assertRaisesRegex(ValueError, 'exact native provider request'):
            validate_provenance(asset, provenance, audio_sha256='0'*64)
        take = {'text': asset.text, 'kind': 'ordinary',
                'provenance': {**job.profile.as_provenance_contract(), 'generation_delivery': 'clear'}}
        self.assertFalse(take_metadata_matches(take, job))


if __name__ == '__main__':
    unittest.main()
