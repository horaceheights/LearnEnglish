import hashlib
import json
import unittest
from unittest.mock import patch, MagicMock
import httpx
from fastapi import HTTPException
from backend.app import cloudflare_media as media, main
from backend.app.persistent_audio_assets import asset_index
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take
from backend.app.course_audio_receipts import build_receipt
from scripts.verify_cloudflare_media import verify_media_object


class CloudflareMediaTests(unittest.TestCase):
    def setUp(self):
        registry = load_approved_take_registry()
        self.asset = next(a for a in asset_index().values() if a.id in registry['bindings'])
        self.take = resolve_approved_take(self.asset, registry)
        self.receipt = build_receipt(self.asset, self.take.payload, self.take.provenance)
        self.receipt_bytes = json.dumps(self.receipt).encode()
        def descriptor(payload):
            return {'sha256':hashlib.sha256(payload).hexdigest(), 'bytes':len(payload),
                    'etag':hashlib.md5(payload, usedforsecurity=False).hexdigest()}
        self.entry = {'key':f'course-audio/elevenlabs-v2/{self.asset.id}.mp3',
                      'audio':descriptor(self.take.payload), 'receipt':descriptor(self.receipt_bytes)}
        self.inventory = {'assets':{self.asset.id:self.entry}, 'historical_objects':{}}

    def test_receipt_rejects_wrong_card_image_voice_and_checksum(self):
        media.validate_receipt(self.asset, self.receipt, self.entry['audio'])
        for field, value in [('image_ref','/lesson-assets/other.webp'), ('voice_id','wrong'),
                             ('audio_sha256','0'*64), ('source','legacy-static-manifest')]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                media.validate_receipt(self.asset, {**self.receipt, field:value}, self.entry['audio'])

    def test_runtime_and_full_verification_fail_closed_on_changed_object(self):
        def response(method, url):
            receipt = url.endswith('.json')
            payload = self.receipt_bytes if receipt else self.take.payload
            desc = self.entry['receipt' if receipt else 'audio']
            return httpx.Response(200, headers={'ETag':'"'+desc['etag']+'"', 'Content-Length':str(len(payload))},
                                  content=payload, request=httpx.Request(method, url))
        client = MagicMock()
        client.__enter__.return_value = client
        client.get.side_effect = lambda url: response('GET',url)
        client.head.side_effect = lambda url: response('HEAD',url)
        with patch.object(media,'asset_index',return_value={self.asset.id:self.asset}), patch.object(media,'inventory',return_value=self.inventory), patch.object(media.httpx,'Client',return_value=client):
            self.assertTrue(media.verify_inventory()['ready'])
            self.assertTrue(media.verify_inventory(full=True)['ready'])
            client.head.side_effect = lambda url: httpx.Response(200, headers={'ETag':'"'+('0'*32)+'"','Content-Length':str(len(self.take.payload))}, request=httpx.Request('HEAD',url))
            result = media.verify_inventory()
            self.assertFalse(result['ready'])
            self.assertEqual(1,result['invalid'])
            with self.assertRaises(HTTPException) as error:
                media.read_asset(self.asset.id)
            self.assertEqual(503,error.exception.status_code)

    def test_v1_and_v2_routes_preserve_different_original_recordings(self):
        legacy_key = f'course-audio/{self.asset.id}.mp3'
        self.inventory['historical_objects'][legacy_key] = {'sha256':'0'*64}
        with patch.object(media,'inventory',return_value=self.inventory), patch.object(media,'_available',{self.asset.id}):
            original = main.read_course_audio_asset(self.asset.id)
            current = main.read_course_audio_asset_v2(self.asset.id)
            self.assertEqual(307, original.status_code)
            self.assertEqual(307, current.status_code)
            self.assertEqual(media.object_url(legacy_key), original.headers['location'])
            self.assertEqual(media.object_url(self.entry['key']), current.headers['location'])
            self.assertNotEqual(original.headers['location'], current.headers['location'])

    def test_runtime_and_full_inventory_recover_transient_reads(self):
        for full in (False, True):
            for failure in ('timeout', 'disconnect', 'gateway'):
                with self.subTest(full=full, failure=failure):
                    calls = []
                    def respond(request):
                        calls.append(request)
                        if len(calls) == 1:
                            if failure == 'timeout':
                                raise httpx.ReadTimeout('temporary timeout', request=request)
                            if failure == 'disconnect':
                                raise httpx.RemoteProtocolError('temporary disconnect', request=request)
                            return httpx.Response(502, request=request)
                        receipt = request.url.path.endswith('.json')
                        payload = self.receipt_bytes if receipt else self.take.payload
                        descriptor = self.entry['receipt' if receipt else 'audio']
                        return httpx.Response(200, headers={'ETag':descriptor['etag'], 'Content-Length':str(len(payload))}, content=payload)
                    client = httpx.Client(transport=httpx.MockTransport(respond))
                    with patch.object(media, 'asset_index', return_value={self.asset.id:self.asset}), patch.object(media, 'inventory', return_value=self.inventory), patch.object(media.httpx, 'Client', return_value=client), patch.object(media.time, 'sleep') as wait:
                        result = media.verify_inventory(full=full)
                    self.assertTrue(result['ready'])
                    self.assertEqual([], result['errors'])
                    self.assertEqual(3, len(calls))
                    wait.assert_called_once_with(0.5)

    def test_transient_reads_stop_after_three_attempts_and_leave_inventory_unready(self):
        request = httpx.Request('GET', media.object_url(self.entry['key']))
        client = MagicMock()
        client.__enter__.return_value = client
        client.get.side_effect = httpx.ReadTimeout('still unavailable', request=request)
        with patch.object(media, 'asset_index', return_value={self.asset.id:self.asset}), patch.object(media, 'inventory', return_value=self.inventory), patch.object(media.httpx, 'Client', return_value=client), patch.object(media.time, 'sleep') as wait:
            result = media.verify_inventory(full=True)
        self.assertFalse(result['ready'])
        self.assertEqual(1, result['invalid'])
        self.assertEqual(3, client.get.call_count)
        self.assertEqual([0.5, 1.0], [call.args[0] for call in wait.call_args_list])

    def test_http_retries_are_limited_to_transient_statuses(self):
        request = httpx.Request('GET', 'https://cdn.learnspanglish.app/asset')
        for status in (429, 500, 502, 503, 504, 400, 401, 403, 404):
            with self.subTest(status=status):
                operation = MagicMock(side_effect=httpx.HTTPStatusError('unavailable', request=request, response=httpx.Response(status, request=request)))
                with patch.object(media.time, 'sleep'), self.assertRaises(httpx.HTTPStatusError):
                    media.retry_transient_cdn_read(operation)
                self.assertEqual(3 if status in (429, 500, 502, 503, 504) else 1, operation.call_count)
        operation = MagicMock(side_effect=ValueError('checksum/size mismatch'))
        with self.assertRaises(ValueError):
            media.retry_transient_cdn_read(operation)
        self.assertEqual(1, operation.call_count)

    def test_stream_retry_discards_partial_bytes_and_revalidates_complete_media(self):
        payload = b'complete media bytes'
        descriptor = {'bytes':len(payload), 'sha256':hashlib.sha256(payload).hexdigest()}
        class InterruptedStream(httpx.SyncByteStream):
            def __iter__(self):
                yield b'partial'
                raise httpx.ReadError('stream disconnected')
        calls = []
        def respond(request):
            calls.append(request)
            if len(calls) == 1:
                return httpx.Response(200, stream=InterruptedStream())
            return httpx.Response(200, content=payload)
        with httpx.Client(transport=httpx.MockTransport(respond)) as client, patch.object(media.time, 'sleep'):
            verify_media_object(client, 'lesson-assets/test.webp', descriptor)
        self.assertEqual(2, len(calls))

    def test_corrupt_or_missing_media_is_not_retried(self):
        for status, payload in ((200, b'bad bytes'), (404, b'')):
            with self.subTest(status=status):
                requests = []
                def respond(request):
                    requests.append(request)
                    return httpx.Response(status, content=payload)
                with httpx.Client(transport=httpx.MockTransport(respond)) as client, patch.object(media.time, 'sleep') as wait:
                    with self.assertRaises((ValueError, httpx.HTTPStatusError)):
                        verify_media_object(client, 'lesson-assets/test.webp', {'bytes':10, 'sha256':'0'*64})
                self.assertEqual(1, len(requests))
                wait.assert_not_called()

    def test_missing_v1_recording_does_not_rebind_to_existing_v2(self):
        with patch.object(media,'inventory',return_value=self.inventory), patch.object(media,'_available',{self.asset.id}):
            with self.assertRaises(HTTPException) as error:
                main.read_course_audio_asset(self.asset.id)
            self.assertEqual(404, error.exception.status_code)
            self.assertEqual(307, main.read_course_audio_asset_v2(self.asset.id).status_code)

    def test_legacy_miss_cannot_generate_paid_audio(self):
        with patch.object(media,'inventory',return_value=self.inventory), patch('backend.app.course_audio._provider_audio') as provider:
            with self.assertRaises(HTTPException) as error:
                media.legacy_course_audio('Unknown sentence.', 'prompt', 'en-US','prompt','openai','female-teacher')
            self.assertEqual(503,error.exception.status_code)
            provider.assert_not_called()

    def test_media_redirect_rejects_traversal(self):
        with self.assertRaises(HTTPException):
            main.legacy_lesson_media('../private.env')
        result = main.legacy_lesson_media('boy.webp')
        self.assertEqual('https://cdn.learnspanglish.app/lesson-assets/boy.webp',result.headers['location'])

    def test_committed_inventory_covers_exact_catalog(self):
        media.inventory.cache_clear()
        data = media.inventory()
        self.assertEqual(set(asset_index()),set(data['assets']))

    def test_release_workflows_require_full_cdn_verification_before_expo(self):
        for name in ('publish-preview.yml','publish-production.yml'):
            source = (media.ROOT / '.github/workflows' / name).read_text(encoding='utf8')
            self.assertLess(source.index('python scripts/verify_cloudflare_media.py'),source.index('uses: expo/expo-github-action'))
        guard = (media.ROOT / 'mobile/scripts/release-guard.ps1').read_text(encoding='utf8')
        self.assertIn("$audio.storage_provider -ceq 'cloudflare-r2'",guard)
        self.assertIn("$audio.base_url -ceq 'https://cdn.learnspanglish.app'",guard)

if __name__ == '__main__':
    unittest.main()
