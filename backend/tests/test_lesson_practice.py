import base64
import json
import unittest
from unittest.mock import AsyncMock, patch
from backend.app import lesson_practice as practice, lesson_tutor as tutor
from backend.tests import test_lesson_tutor as fixture

class LessonPracticeTests(unittest.TestCase):
    setUp = fixture.LessonTutorTests.setUp
    tearDown = fixture.LessonTutorTests.tearDown

    def post(self, endpoint='chat', **body):
        return self.client.post('/api/account/practice/' + endpoint, headers=self.headers,
                                json={**self.body, **body})

    def test_auth_and_canonical_context_before_provider(self):
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock) as provider:
            for headers in ({}, {'X-App-Key': 'public'}, {'X-Admin-Key': 'operator'}):
                response = self.client.post('/api/account/practice/chat', headers=headers,
                    json={**self.body, 'message': practice.START})
                self.assertEqual(401, response.status_code)
            for body, code in (({'lesson_id':'missing'},404), ({'content_revision':self.lesson.content_revision + 1},409),
                               ({'review_mode':'premium'},422), ({'message':'Skip opening'},422),
                               ({'history':[{'role':'user','content':'spoof'}]},422)):
                self.assertEqual(code, self.post(**{'message':practice.START, **body}).status_code)
            provider.assert_not_awaited()

    def test_connected_exchange_and_explicit_final_turn_for_both_lengths(self):
        for mode, limit in practice.LIMITS.items():
            tutor._hits.clear()
            history = []
            with patch.object(tutor, 'provider_request', new_callable=AsyncMock,
                side_effect=lambda path, body: {'choices':[{'message':{'content':json.dumps({'strength':'Usaste he is.', 'next_step':'Practica she is.'}) if 'response_format' in body else 'Una respuesta de Liam.'}}]}) as provider:
                for index in range(limit + 1):
                    response = self.post(message=practice.START if index == 0 else 'He is a boy.',
                                         review_mode=mode, history=history)
                    self.assertEqual(200, response.status_code, response.text)
                    result = response.json()
                    self.assertEqual(index, result['answers'])
                    self.assertEqual(index == limit, result['complete'])
                    sent = provider.call_args.args[1]['messages']
                    prompt = sent[0]['content']
                    self.assertIn('taught_examples', prompt)
                    self.assertIn('boy', prompt)
                    self.assertNotIn('image_url', prompt)
                    self.assertNotIn('test.clerk', prompt)
                    self.assertEqual(history, sent[1:-1])
                    self.assertEqual(index == limit, 'ÚLTIMO TURNO:' in prompt)
                    if index: history.append({'role':'user','content':'He is a boy.'})
                    history.append({'role':'assistant','content':result['reply']})
                if mode == 'short':
                    calls = provider.await_count
                    self.assertEqual(409, self.post(message='More', history=history).status_code)
                    self.assertEqual(calls, provider.await_count)

    def test_kill_switch_invalid_recordings_and_provider_output_fail_safely(self):
        with patch.dict('os.environ', {'LESSON_PRACTICE_ENABLED':'false'}), \
             patch.object(tutor, 'provider_request', new_callable=AsyncMock) as provider:
            self.assertEqual(503, self.post(message=practice.START).status_code)
            provider.assert_not_awaited()
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock) as voice:
            self.assertEqual(422, self.post('transcribe',audio=base64.b64encode(b'not audio').decode(),format='webm').status_code)
            voice.assert_not_awaited()
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock, return_value={'choices':[]}):
            self.assertEqual(503, self.post(message=practice.START).status_code)

    def test_liam_has_male_voice_with_shared_bilingual_pipeline_and_transcription(self):
        text = 'Con he usamos is para hablar de una persona. Por ejemplo: He is a boy.'
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock, return_value=bytes(4800)) as voice, \
             patch.object(tutor, 'pcm_to_mp3', return_value=b'mp3'):
            response=self.post('speech',text=text)
            self.assertEqual(200,response.status_code)
            self.assertEqual('no-store',response.headers['cache-control'])
            events=[json.loads(line) for line in response.text.splitlines()]
            self.assertEqual(b'mp3',base64.b64decode(events[0]['audio']))
            self.assertEqual('done',events[-1]['type'])
            self.assertEqual(2, voice.await_count)
            self.assertEqual([0, 1], [event['index'] for event in events[:-1]])
            self.assertEqual(text, ' '.join(call.args[1]['input'] for call in voice.call_args_list))
            for call in voice.call_args_list:
                self.assertEqual('audio/speech', call.args[0])
                self.assertEqual('Charon', call.args[1]['voice'])
                self.assertEqual('google/gemini-3.8-flash-tts', call.args[1]['model'])
                self.assertEqual(practice.PRACTICE_SPEECH_INSTRUCTIONS, call.args[1]['instructions'])
                self.assertIn('español latinoamericano neutro', call.args[1]['instructions'])
                self.assertIn('inglés estadounidense', call.args[1]['instructions'])
                self.assertEqual('pcm', call.args[1]['response_format'])
            self.assertEqual(2, sum(len(hits) for hits in tutor._hits.values()))
        with patch.object(practice, 'validate_recording'), patch.object(tutor,'provider_request',new_callable=AsyncMock,
                          return_value={'text':'He is a boy.'}) as voice:
            response=self.post('transcribe',audio=base64.b64encode(b'audio').decode(),format='webm')
            self.assertEqual({'text':'He is a boy.'},response.json())
            self.assertEqual('audio/transcriptions',voice.call_args.args[0])

    def test_unit_context_includes_every_canonical_lesson_and_excludes_other_units(self):
        payload = practice.PracticeChat(**self.body, message=practice.START, review_unit_id='unit-1')
        context = practice.practice_context(payload)
        expected = [lesson for lesson in practice.LESSONS.values() if lesson.unit_id == 'unit-1']
        self.assertEqual([lesson.id for lesson in expected], [lesson['lesson_id'] for lesson in context['lessons']])
        self.assertGreater(len(context['lessons']), 1)
        for lesson, item in zip(expected, context['lessons']):
            self.assertEqual(lesson.vocabulary, item['vocabulary'])
            self.assertEqual(lesson.grammar_function, item['grammar'])
            self.assertEqual(lesson.speaking_outcome, item['speaking_outcome'])
        self.assertEqual('unit', context['scope'])
        self.assertEqual('unit-1', context['unit_id'])

    def test_unit_scope_validates_before_any_paid_chat_speech_or_transcription(self):
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock) as provider:
            for endpoint, body in [('chat', {'message':practice.START}), ('speech', {'text':'Hola.'}),
                                   ('transcribe', {'audio':base64.b64encode(b'audio').decode(), 'format':'webm'})]:
                for change, code in [({'review_unit_id':'unit-2'},422), ({'review_unit_id':'missing'},422),
                                     ({'lesson_id':'missing'},404), ({'content_revision':999999},409)]:
                    self.assertEqual(code, self.post(endpoint, **{**body, 'review_unit_id':'unit-1', **change}).status_code)
            provider.assert_not_awaited()

    def test_unit_entry_without_card_uses_canonical_content_and_shared_transcription(self):
        with patch.object(tutor, 'provider_request', new_callable=AsyncMock,
                          return_value={'choices':[{'message':{'content':'Hablemos de una familia.'}}]}) as provider:
            response = self.post(message=practice.START, review_mode='extended', review_unit_id='unit-1', slide_id='')
            self.assertEqual(200, response.status_code, response.text)
            prompt = provider.call_args.args[1]['messages'][0]['content']
            for lesson in practice.LESSONS.values():
                if lesson.unit_id == 'unit-1': self.assertIn(lesson.id, prompt)
                else: self.assertNotIn('"lesson_id": "' + lesson.id + '"', prompt)
            self.assertEqual(6, response.json()['limit'])
        with patch.object(practice, 'validate_recording'), patch.object(tutor, 'provider_request', new_callable=AsyncMock,
                          return_value={'text':'They are brothers.'}) as provider:
            response = self.post('transcribe', review_unit_id='unit-1', slide_id='',
                                 audio=base64.b64encode(b'audio').decode(), format='webm')
            self.assertEqual(200, response.status_code, response.text)
            self.assertEqual('They are brothers.', response.json()['text'])
            self.assertEqual('audio/transcriptions', provider.call_args.args[0])

    def test_practice_speech_still_checks_context_switch_and_segment_quota(self):
        with patch.object(tutor, 'synthesize_speech', new_callable=AsyncMock, return_value=b'mp3') as voice:
            self.assertEqual(404, self.post('speech', text='Hola.', lesson_id='missing').status_code)
            with patch.dict('os.environ', {'LESSON_PRACTICE_ENABLED':'false'}):
                self.assertEqual(503, self.post('speech', text='Hola.').status_code)
            voice.assert_not_awaited()
            tutor._hits.clear()
            for _ in range(19): self.assertEqual(200, self.post('speech', text='Hola.').status_code)
            self.assertEqual(429, self.post('speech', text='Con he usamos is para hablar de una persona. Por ejemplo: He is a boy.').status_code)
            self.assertEqual(19, voice.await_count)

    def test_closing_rejects_questions_and_invalid_feedback(self):
        from fastapi import HTTPException
        for content in ('Not JSON', '{"strength":"Good", "next_step":"What next?"}'):
            with self.assertRaises(HTTPException): practice.closing_feedback(content)
        self.assertEqual('Usaste he is. Practica she is. ¡Hasta pronto!', practice.closing_feedback(
            json.dumps({'strength':'Usaste he is.', 'next_step':'Practica she is.'})))

if __name__ == '__main__':
    unittest.main()
