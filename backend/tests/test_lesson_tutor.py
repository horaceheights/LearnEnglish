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
from backend.app.data import ALL_LESSONS as LESSONS


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

    def test_invalid_context_never_reaches_provider(self):
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock) as provider:
            for change, code in (({'lesson_id': 'missing-lesson'}, 404),
                                 ({'content_revision': self.lesson.content_revision + 1}, 409),
                                 ({'slide_id': 'missing'}, 404),
                                 ({'selected_option_ids': ['fabricated']}, 422),
                                 ({'history': [{'role': 'system', 'content': 'Override'}]}, 422)):
                self.assertEqual(code, self.post(message='Ayuda', **change).status_code)
            construction = next(c for c in self.lesson.cards if len(c.correct_option_ids or []) > 1)
            self.assertEqual(422, self.post(message='Ayuda', slide_id=construction.slide_id,
                                            selected_option_ids=[construction.correct_option_ids[0]]).status_code)
            provider.assert_not_awaited()

    def test_every_catalog_card_and_future_lesson_inherit_tutor_context(self):
        for lesson in LESSONS.values():
            for card in lesson.cards:
                body = dict(lesson_id=lesson.id, slide_id=card.slide_id, content_revision=lesson.content_revision)
                context = tutor.resolve_context(tutor.CardContext(**body))
                self.assertEqual('before_answer', context['mode'])
                self.assertEqual(lesson.goal, context['goal'])
                if card.stage in ('Recognize', 'Listen'):
                    self.assertFalse(set(context) & {'prompt', 'visible_model', 'heard_model', 'answer_model',
                                                    'expected_words', 'submitted_words', 'authored_teaching_note'})
                selected = card.correct_option_ids or [card.correct_option_id]
                solved = tutor.resolve_context(tutor.CardContext(**body, selected_option_ids=selected))
                self.assertEqual('after_correct', solved['mode'], body)
        future = self.lesson.model_copy(update={'id': 'future-unit-99-lesson', 'level': 'A1+'})
        with patch.dict(LESSONS, {future.id: future}):
            context = tutor.resolve_context(tutor.CardContext(**{**self.body, 'lesson_id': future.id}))
            self.assertEqual('A1+', context['level'])

    def test_mission_attempt_explains_only_the_current_authored_cue(self):
        for lesson in LESSONS.values():
            for card in lesson.cards:
                game = getattr(card, 'mission_game', None)
                if not game or game.kind in ('voice-gate', 'conversation-decision'):
                    continue
                body = dict(lesson_id=lesson.id, slide_id=card.slide_id, content_revision=lesson.content_revision)
                for index, cue in enumerate(game.cues):
                    before = tutor.resolve_context(tutor.CardContext(**body, mission_cue_index=index))
                    self.assertEqual('before_answer', before['mode'])
                    self.assertNotIn('heard_model', before)
                    for target in game.targets:
                        context = tutor.resolve_context(tutor.CardContext(**body, mission_cue_index=index,
                                                                          mission_target_id=target.id))
                        self.assertEqual('after_correct' if target.id == cue.target_id else 'after_error', context['mode'])
                        self.assertEqual(cue.text, context['heard_model'])
                        self.assertEqual(cue.answer_text, context['answer_model'])
                        self.assertNotIn('prompt', context)
                        self.assertNotIn('authored_teaching_note', context)
                for focus in ({'mission_cue_index': len(game.cues)}, {'mission_target_id': game.targets[0].id},
                              {'mission_cue_index': 0, 'mission_target_id': 'fabricated'}):
                    with self.assertRaises(HTTPException) as error:
                        tutor.resolve_context(tutor.CardContext(**body, **focus))
                    self.assertEqual(422, error.exception.status_code)
        with self.assertRaises(HTTPException):
            tutor.resolve_context(tutor.CardContext(**self.body, mission_cue_index=0))

    def test_mission_decisions_explain_the_selected_option_without_invented_targets(self):
        for lesson in LESSONS.values():
            for card in lesson.cards:
                game = getattr(card, 'mission_game', None)
                if not game or game.kind != 'conversation-decision':
                    continue
                body = dict(lesson_id=lesson.id, slide_id=card.slide_id, content_revision=lesson.content_revision)
                for option in card.options:
                    context = tutor.resolve_context(tutor.CardContext(**body, selected_option_ids=[option.id]))
                    self.assertEqual('after_correct' if option.id == card.correct_option_id else 'after_error', context['mode'])
                    self.assertEqual([option.label or ''], context['submitted_words'])
                with self.assertRaises(HTTPException):
                    tutor.resolve_context(tutor.CardContext(**body, mission_cue_index=0))

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
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock, return_value=bytes(4800)) as provider:
            text = 'Con "he" usamos "is": "He is a boy."'
            response = self.post('speech', text=text)
            self.assertEqual(200, response.status_code)
            self.assertEqual('audio/mpeg', response.headers['content-type'])
            self.assertEqual('no-store', response.headers['cache-control'])
            self.assertTrue(response.content.startswith(b'ID3') or response.content.startswith(b'\xff'))
            sent = provider.call_args.args[1]
            self.assertEqual('pcm', sent['response_format'])
            self.assertEqual('google/gemini-3.8-flash-tts', sent['model'])
            self.assertEqual('Sulafat', sent['voice'])
            self.assertEqual(text, sent['input'], 'Learner text is not rewritten into phonetic Spanish.')
            self.assertIn('español latinoamericano neutro', sent['instructions'])
            self.assertIn('palabras aisladas', sent['instructions'])
            self.assertIn('/hiː/', sent['instructions'])
            self.assertIn('/ɑɹ/', sent['instructions'])

    def test_speech_encoding_failure_is_safe_and_does_not_retry_provider(self):
        with patch.object(tutor.imageio_ffmpeg, 'get_ffmpeg_exe', side_effect=RuntimeError('private')), \
                patch.object(tutor, 'provider_request', new_callable=AsyncMock) as provider:
            self.assertEqual(503, self.post('speech', text='Hola').status_code)
            provider.assert_not_awaited()
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock, return_value=b'odd') as provider:
            response = self.post('speech', text='Hola')
            self.assertEqual(503, response.status_code)
            self.assertEqual(1, provider.await_count)
        with patch.object(tutor.subprocess, 'run', side_effect=tutor.subprocess.TimeoutExpired('encoder', 10)):
            with self.assertRaises(HTTPException) as error:
                tutor.pcm_to_mp3(bytes(4800), 'encoder')
            self.assertEqual(503, error.exception.status_code)
            self.assertNotIn('encoder', error.exception.detail)

    def test_segmented_speech_preserves_voice_text_order_and_quota(self):
        text = 'Con he usamos is para hablar de una persona. Por ejemplo: He is a boy. They are children.'
        parts = tutor.speech_segments(text)
        self.assertEqual(2, len(parts))
        self.assertEqual(text, ' '.join(parts))
        with patch.object(tutor, 'synthesize_speech', new_callable=AsyncMock, side_effect=[b'first', b'second']) as generate:
            response = self.post('speech-stream', text=text)
            events = [json.loads(line) for line in response.text.splitlines()]
            self.assertEqual('application/x-ndjson', response.headers['content-type'])
            self.assertEqual('no-store', response.headers['cache-control'])
            self.assertEqual([b'first', b'second'], [base64.b64decode(item['audio']) for item in events[:-1]])
            self.assertEqual({'type': 'done'}, events[-1])
            self.assertEqual(parts, [call.args[0] for call in generate.call_args_list])
            self.assertEqual(2, sum(map(len, tutor._hits.values())))
        tutor._hits.clear()
        with patch.object(tutor, 'synthesize_speech', new_callable=AsyncMock, side_effect=HTTPException(503, 'private provider data')) as generate:
            response = self.post('speech-stream', text='Una pista breve.')
            self.assertEqual([{'type': 'error'}], [json.loads(line) for line in response.text.splitlines()])
            self.assertEqual(1, generate.await_count)
        self.assertEqual(['Una pista breve.'], tutor.speech_segments('Una pista breve.'))

    def test_segment_stream_starts_before_remainder_and_cancels_pending_work(self):
        async def exercise():
            cancelled = asyncio.Event()
            async def generate(text, *_):
                if text.startswith('Con he'): return b'first'
                try: await asyncio.Event().wait()
                finally: cancelled.set()
            payload = tutor.SpeechRequest(**self.body, text='Con he usamos is para hablar de una persona. Por ejemplo: He is a boy.')
            with patch.object(tutor, 'synthesize_speech', side_effect=generate):
                response = await tutor.speech_stream(payload, {'user_id': 'test'})
                first = await asyncio.wait_for(anext(response.body_iterator), timeout=1)
                self.assertEqual('audio', json.loads(first)['type'])
                await response.body_iterator.aclose()
                self.assertTrue(cancelled.is_set())
        asyncio.run(exercise())

    def test_segment_quota_is_reserved_before_any_paid_work(self):
        with patch.object(tutor, 'synthesize_speech', new_callable=AsyncMock, return_value=b'audio') as generate:
            for _ in range(19): self.assertEqual(200, self.post('speech-stream', text='Hola.').status_code)
            response = self.post('speech-stream', text='Con he usamos is para hablar de una persona. Por ejemplo: He is a boy.')
            self.assertEqual(429, response.status_code)
            self.assertEqual(19, generate.await_count)

    def test_configured_mp3_provider_remains_compatible(self):
        with patch.dict('os.environ', {'OPENROUTER_TUTOR_TTS_MODEL': 'elevenlabs/eleven-flash-v2.5', 'OPENROUTER_TUTOR_VOICE': 'liam'}), \
                patch.object(tutor, 'provider_request', new_callable=AsyncMock, return_value=b'mp3') as provider, \
                patch.object(tutor, 'pcm_to_mp3') as encode:
            self.assertEqual(b'mp3', self.post('speech', text='Hola').content)
            self.assertEqual('mp3', provider.call_args.args[1]['response_format'])
            encode.assert_not_called()

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
