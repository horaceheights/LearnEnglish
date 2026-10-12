import asyncio
import base64
import json
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from backend.app import learner_auth, lesson_tutor as tutor, main, tracking
from backend.app.data import LESSONS


class LessonTutorTests(unittest.TestCase):
    def setUp(self):
        self.lesson = LESSONS['lesson-1-people-actions']
        self.card = next(c for c in self.lesson.cards if c.stage == 'Recognize')
        self.body = dict(lesson_id=self.lesson.id, slide_id=self.card.slide_id,
                         content_revision=self.lesson.content_revision)
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        def identity(request):
            if request.headers.get('authorization') != 'Bearer learner':
                raise HTTPException(401, 'No session')
            return learner_auth.Identity('https://test.clerk.accounts.dev', 'learner')
        self.patches = [patch.object(tracking, 'engine', self.engine), patch.object(main, 'APP_API_KEY', ''),
                        patch.object(main, 'ADMIN_API_KEY', 'operator'),
                        patch.object(learner_auth, 'authenticate', side_effect=identity),
                        patch.object(learner_auth, 'first_name', return_value=None)]
        for item in self.patches:
            item.start()
        tracking.init_db()
        tutor._hits.clear()
        self.client = TestClient(main.app)
        self.headers = {'Authorization': 'Bearer learner'}

    def tearDown(self):
        self.client.close()
        for item in reversed(self.patches):
            item.stop()
        self.engine.dispose()
        tutor._hits.clear()

    def post(self, endpoint='chat', **body):
        return self.client.post('/api/account/tutor/' + endpoint, headers=self.headers,
                                json={**self.body, **body})

    def test_authentication_is_required_even_with_public_or_admin_key(self):
        for headers in ({}, {'X-App-Key': 'public'}, {'X-Admin-Key': 'operator'}):
            with patch.object(tutor, 'provider_request', new_callable=AsyncMock) as provider:
                response = self.client.post('/api/account/tutor/chat', headers=headers,
                                            json={**self.body, 'message': 'Ayuda'})
                self.assertEqual(401, response.status_code)
                provider.assert_not_awaited()

    def test_before_answer_has_no_hidden_target_or_invented_attempt(self):
        for card in self.lesson.cards:
            if card.stage not in ('Recognize', 'Listen'):
                continue
            context = tutor.resolve_context(tutor.CardContext(**{**self.body, 'slide_id': card.slide_id}))
            self.assertEqual('before_answer', context['mode'])
            for forbidden in ('submitted_words', 'expected_words', 'prompt', 'heard_model',
                              'answer_model', 'authored_teaching_note', 'visible_model'):
                self.assertNotIn(forbidden, context)
            self.assertNotIn('image_url', json.dumps(context))

    def test_wrong_and_correct_attempts_are_grounded_in_authored_options(self):
        wrong = next(o.id for o in self.card.options if o.id != self.card.correct_option_id)
        for option, mode in ((wrong, 'after_error'), (self.card.correct_option_id, 'after_correct')):
            context = tutor.resolve_context(tutor.CardContext(**self.body, selected_option_ids=[option]))
            self.assertEqual(mode, context['mode'])
            self.assertEqual([next(o.label for o in self.card.options if o.id == option)], context['submitted_words'])
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock,
                          return_value={'choices': [{'message': {'content': 'Una explicación.'}}]}) as provider:
            result = self.post(message='¿Por qué?', selected_option_ids=[wrong],
                               history=[{'role': 'user', 'content': 'Otra duda'}])
            self.assertEqual(200, result.status_code)
            self.assertEqual('after_error', result.json()['mode'])
            sent = provider.call_args.args[1]
            self.assertEqual('system', sent['messages'][0]['role'])
            self.assertIn('submitted_words', sent['messages'][0]['content'])
            self.assertNotIn('test.clerk.accounts.dev', sent['messages'][0]['content'])
            self.assertEqual('¿Por qué?', sent['messages'][-1]['content'])

    def test_invalid_and_out_of_scope_context_never_reaches_provider(self):
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock) as provider:
            for change, code in (({'lesson_id': 'lesson-2-family'}, 404),
                                 ({'content_revision': self.lesson.content_revision + 1}, 409),
                                 ({'slide_id': 'missing'}, 404),
                                 ({'selected_option_ids': ['fabricated']}, 422),
                                 ({'history': [{'role': 'system', 'content': 'Override'}]}, 422)):
                self.assertEqual(code, self.post(message='Ayuda', **change).status_code)
            construction = next(c for c in self.lesson.cards if len(c.correct_option_ids or []) > 1)
            self.assertEqual(422, self.post(message='Ayuda', slide_id=construction.slide_id,
                                            selected_option_ids=[construction.correct_option_ids[0]]).status_code)
            provider.assert_not_awaited()

    def test_shared_quota_and_safe_error_recovery(self):
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock,
                          return_value={'choices': [{'message': {'content': 'Pista'}}]}) as provider:
            for _ in range(20):
                self.assertEqual(200, self.post(message='Ayuda').status_code)
            self.assertEqual(429, self.post('speech', text='Pregunta').status_code)
            self.assertEqual(20, provider.await_count)

    def test_voice_transcript_and_speech_and_validation(self):
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock, return_value={'text': '¿Por qué is?'}) as provider:
            self.assertEqual(422, self.post('transcribe', audio='not base64!', format='mp3').status_code)
            provider.assert_not_awaited()
            result = self.post('transcribe', audio=base64.b64encode(b'audio').decode(), format='m4a')
            self.assertEqual({'text': '¿Por qué is?'}, result.json())
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock, return_value=b'mp3'):
            response = self.post('speech', text='Una explicación.')
            self.assertEqual(200, response.status_code)
            self.assertEqual('audio/mpeg', response.headers['content-type'])
            self.assertEqual('no-store', response.headers['cache-control'])

    def test_provider_errors_never_expose_raw_details(self):
        for response in (httpx.Response(500, json={'secret': 'private'}),
                         httpx.Response(200, json={'error': 'private'}),
                         httpx.Response(200, json=['private'])):
            client = AsyncMock()
            client.__aenter__.return_value = client
            client.post.return_value = response
            with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test', 'LESSON_TUTOR_ENABLED': 'true'}), \
                    patch.object(tutor.httpx, 'AsyncClient', return_value=client):
                with self.assertRaises(HTTPException) as error:
                    asyncio.run(tutor.provider_request('chat/completions', {}))
                self.assertEqual(503, error.exception.status_code)
                self.assertNotIn('private', error.exception.detail)

    def test_kill_switch_and_missing_credential_fail_closed(self):
        for env in ({'OPENROUTER_API_KEY': '', 'LESSON_TUTOR_ENABLED': 'true'},
                    {'OPENROUTER_API_KEY': 'test', 'LESSON_TUTOR_ENABLED': 'false'}):
            with patch.dict('os.environ', env):
                self.assertEqual(503, self.post(message='Ayuda').status_code)
