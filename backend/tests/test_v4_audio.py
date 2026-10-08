import copy
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from backend.app.card_audio_assets import asset_index, assets_for_card
from backend.app.course_audio_profile import generation_profile_for, render_profile_for
from backend.app.course_audio_receipts import validate_provenance
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take
from backend.app.data import LESSONS
from backend.app.schemas import ChoiceOption, LessonCard
from scripts.render_course_audio_assets import RenderJob, add_generated_take, approve_reviewed_take, generate_take, main

ROOT = Path(__file__).resolve().parents[2]
DIGEST = 'c72c28830d479b4cd42478e9d9d6dc70fb70954a82913d98b3d1b5fe64b503d3'


class V4AudioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.assets = [a for a in asset_index(LESSONS).values()
                      if a.id.startswith('lesson-5-3-food-quantities-') and a.text == 'Some']
        cls.payload = (ROOT/f'backend/approved-course-audio/takes/{DIGEST}.mp3').read_bytes()

    def test_exact_audition_covers_only_the_two_revisioned_some_bindings(self):
        self.assertEqual(2, len(self.assets))
        registry = load_approved_take_registry()
        self.assertEqual({a.id for a in self.assets}, {a for a,b in registry['bindings'].items() if b['take_id'] == DIGEST})
        for asset in self.assets:
            self.assertEqual(2, asset.revision)
            take = resolve_approved_take(asset, registry)
            self.assertEqual(self.payload, take.payload)
            self.assertEqual('eleven_v4', take.provenance['model_id'])
            self.assertEqual('user-listening-approved', take.provenance['review']['status'])

    def test_v4_uses_only_supported_controls_while_legacy_profile_is_frozen(self):
        profile = generation_profile_for('teacher', 'prompt')
        self.assertEqual('eleven_v4', profile.model_id)
        self.assertEqual({'stability': .55, 'similarity_boost': .8}, profile.as_provenance_contract()['settings'])
        legacy = render_profile_for('teacher', 'prompt')
        self.assertEqual('eleven_multilingual_v2', legacy.model_id)
        self.assertEqual(.70, legacy.speed)
        job = RenderJob(kind='completion', assets=self.assets, text='It is a man.',
                        visual_prompt='It is a ___.', blank_text='man')
        for text, model in job.request_fragments():
            self.assertEqual('eleven_v4', model)
            self.assertNotIn('<phoneme', text)

    def test_listening_review_rejects_missing_approval_and_different_bytes(self):
        provenance = load_approved_take_registry()['takes'][DIGEST]['provenance']
        for change in ({'review': {}}, {'review': {'status': 'approved-profile-render'}},
                       {'review': ['user-listening-approved']}, {'review': True},
                       {'approved_at': None},
                       {'source':'deterministic-completion-silence', 'review': {}}):
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, 'listening approval'):
                validate_provenance(self.assets[0], {**provenance, **change}, audio_sha256=DIGEST)
        with self.assertRaisesRegex(ValueError, 'listening approval'):
            validate_provenance(self.assets[0], provenance, audio_sha256='0'*64)
        invalid = copy.deepcopy(provenance)
        invalid['settings']['speed'] = .75
        with self.assertRaises(ValueError):
            validate_provenance(self.assets[0], invalid, audio_sha256=DIGEST)

    def test_render_saves_original_bytes_and_requires_explicit_review_before_binding(self):
        job = RenderJob(kind='ordinary', assets=self.assets, text='Some')
        calls = []
        def post(*args, **kwargs):
            calls.append(kwargs['json'])
            return SimpleNamespace(content=self.payload, headers={'character-cost': '4'},
                                   raise_for_status=lambda: None)
        with TemporaryDirectory() as directory:
            folder = Path(directory)
            with patch('scripts.render_course_audio_assets.approved_audio_dir', return_value=folder):
                payload, provenance = generate_take(SimpleNamespace(post=post), job, 'unused', 4)
                self.assertEqual(payload, self.payload)
                self.assertIsNone(provenance['approved_at'])
                self.assertEqual('pending-listening-review', provenance['review']['status'])
                registry = {'schema_version': 1, 'takes': {}, 'bindings': {}}
                self.assertEqual(DIGEST, add_generated_take(registry, job, payload, provenance))
                self.assertEqual({}, registry['bindings'])
                with self.assertRaisesRegex(ValueError, 'listening approval'):
                    validate_provenance(self.assets[0], provenance, audio_sha256=DIGEST)
                with patch('scripts.render_course_audio_assets.resolve_approved_take',
                           side_effect=lambda asset, reg: resolve_approved_take(asset, reg, folder)):
                    approve_reviewed_take(registry, [job], DIGEST)
                self.assertEqual(2, len(registry['bindings']))
                self.assertEqual(self.payload, resolve_approved_take(self.assets[0], registry, folder).payload)
        self.assertEqual(1, len(calls))
        self.assertEqual('eleven_v4', calls[0]['model_id'])
        self.assertEqual({'stability': .55, 'similarity_boost': .8}, calls[0]['voice_settings'])

    def test_local_blank_only_silence_can_be_promoted_without_provider_access(self):
        card = LessonCard(stage='Use', interaction_type='complete2', prompt='___.',
                          audio_text='___.', answer_audio_text='Some.', correct_option_id='some',
                          options=[ChoiceOption(id='some', label='Some')])
        asset = next(a for a in assets_for_card('v4-local-silence-test', 0, card)
                     if a.variant == 'completion-prompt')
        job = RenderJob(kind='completion', assets=[asset], text=asset.text,
                        visual_prompt=card.prompt, blank_text='Some')
        args = SimpleNamespace(env_file=None, legacy_backend_base_url=None,
                               reviewed_take=[], execute=True, promote=True, max_character_cost=1)
        registry = {'schema_version': 1, 'takes': {}, 'bindings': {}}
        with TemporaryDirectory() as directory:
            folder = Path(directory)
            with patch('scripts.render_course_audio_assets.parse_args', return_value=args), \
                 patch('scripts.render_course_audio_assets.render_jobs', return_value=[job]), \
                 patch('scripts.render_course_audio_assets.load_approved_take_registry', return_value=registry), \
                 patch('scripts.render_course_audio_assets.approved_audio_dir', return_value=folder), \
                 patch('scripts.render_course_audio_assets.os.getenv', return_value=''), \
                 patch('scripts.render_course_audio_assets.httpx.Client') as client, \
                 patch('scripts.render_course_audio_assets.write_registry') as write:
                self.assertEqual(0, main())
                client.return_value.__enter__.return_value.post.assert_not_called()
                write.assert_called_once_with(registry)
            take = resolve_approved_take(asset, registry, folder)
            self.assertEqual('deterministic-completion-silence', take.provenance['source'])
            self.assertEqual('eleven_multilingual_v2', take.provenance['model_id'])
            self.assertEqual(0, take.provenance['character_cost'])
            self.assertEqual([], take.provenance['provider_requests'])

    def test_direct_v4_speech_cannot_generate_and_promote_without_listening(self):
        job = RenderJob(kind='ordinary', assets=self.assets, text='Some')
        args = SimpleNamespace(env_file=None, legacy_backend_base_url=None,
                               reviewed_take=[], execute=True, promote=True, max_character_cost=4)
        registry = {'schema_version': 1, 'takes': {}, 'bindings': {}}
        with patch('scripts.render_course_audio_assets.parse_args', return_value=args), \
             patch('scripts.render_course_audio_assets.render_jobs', return_value=[job]), \
             patch('scripts.render_course_audio_assets.load_approved_take_registry', return_value=registry), \
             patch('scripts.render_course_audio_assets.httpx.Client') as client, \
             patch('scripts.render_course_audio_assets.write_registry') as write:
            self.assertEqual(1, main())
            client.assert_not_called()
            write.assert_not_called()
            self.assertEqual({}, registry['takes'])
            self.assertEqual({}, registry['bindings'])


if __name__ == '__main__':
    unittest.main()
