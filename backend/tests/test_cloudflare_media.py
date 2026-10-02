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

    def test_current_and_shipped_immutable_routes_redirect_to_same_r2_clip(self):
        with patch.object(media,'inventory',return_value=self.inventory), patch.object(media,'_available',{self.asset.id}):
            for route in (main.read_course_audio_asset, main.read_course_audio_asset_v2):
                result = route(self.asset.id)
                self.assertEqual(307,result.status_code)
                self.assertEqual(media.object_url(self.entry['key']),result.headers['location'])

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
