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

    def test_speech_reuses_approved_bilingual_tutor_and_transcription(self):
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
                self.assertEqual('Sulafat', call.args[1]['voice'])
                self.assertEqual('google/gemini-3.8-flash-tts', call.args[1]['model'])
                self.assertEqual(tutor.TUTOR_SPEECH_INSTRUCTIONS, call.args[1]['instructions'])
                self.assertEqual('pcm', call.args[1]['response_format'])
            self.assertEqual(2, sum(len(hits) for hits in tutor._hits.values()))
        with patch.object(practice, 'validate_recording'), patch.object(tutor,'provider_request',new_callable=AsyncMock,
                          return_value={'text':'He is a boy.'}) as voice:
            response=self.post('transcribe',audio=base64.b64encode(b'audio').decode(),format='webm')
            self.assertEqual({'text':'He is a boy.'},response.json())
            self.assertEqual('audio/transcriptions',voice.call_args.args[0])

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
