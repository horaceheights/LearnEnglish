#!/usr/bin/env python3
"""Publish approved immutable audio and receipts to Cloudflare; never render.

Supply the preserved Render archive directory during initial migration. Later
publication recovers already-published assets by their pinned inventory and
installs only newly approved repository takes. Missing provenance fails closed.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.persistent_audio_assets import asset_index, install_asset_once
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take
from backend.app.course_audio_receipts import validate_stored_asset, sha256_file
from backend.app.cloudflare_media import MEDIA_BASE_URL, MANIFEST_PATH, catalog_sha256
from backend.app.course_audio_profile import COURSE_AUDIO_PROFILE_ID
from scripts.sync_media_to_r2 import load_env, content_type_for, CACHE_CONTROL


def descriptor(path):
    digest = hashlib.md5(usedforsecurity=False)
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1048576), b''):
            digest.update(chunk)
    return {'sha256': sha256_file(path), 'bytes': path.stat().st_size, 'etag': digest.hexdigest()}


def restore_published_pair(client, bucket, path, entry):
    """Resume missing files only and verify the previously committed ownership."""
    for suffix, kind in (('.mp3', 'audio'), ('.json', 'receipt')):
        target = path.with_suffix(suffix)
        if not target.exists():
            client.download_file(bucket, entry['key'].removesuffix('.mp3') + suffix, str(target))
        expected = entry[kind]
        if target.stat().st_size != expected['bytes'] or sha256_file(target) != expected['sha256']:
            raise RuntimeError(f'Published immutable {kind} checksum mismatch: {path.stem}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--env-file', type=Path, default=ROOT / 'backend/.env')
    parser.add_argument('--source', type=Path, default=ROOT / 'output/cloudflare-course-audio')
    parser.add_argument('--compatibility-cache', type=Path)
    parser.add_argument('--workers', type=int, default=16)
    args = parser.parse_args()
    if not 1 <= args.workers <= 64:
        parser.error('--workers must be between 1 and 64')
    env = load_env(args.env_file)
    if env.get('MEDIA_BASE_URL', MEDIA_BASE_URL).rstrip('/') != MEDIA_BASE_URL:
        raise ValueError('Publication must target the approved Cloudflare hostname')
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
    client = boto3.client('s3', endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                          aws_access_key_id=env['R2_ACCESS_KEY_ID'], aws_secret_access_key=env['R2_SECRET_ACCESS_KEY'],
                          config=Config(signature_version='s3v4', region_name='auto', max_pool_connections=args.workers))
    previous = json.loads(MANIFEST_PATH.read_text(encoding='utf-8')) if MANIFEST_PATH.exists() else {}
    registry = load_approved_take_registry()
    indexed = asset_index()
    destination = args.source / 'elevenlabs-v2'
    destination.mkdir(parents=True, exist_ok=True)
    recovered = installed = 0
    recoveries = []
    for asset in indexed.values():
        path = destination / f'{asset.id}.mp3'
        prior = previous.get('assets', {}).get(asset.id)
        if not path.exists() or not path.with_suffix('.json').exists():
            if prior:
                recoveries.append((path, prior))
                recovered += 1
            else:
                take = resolve_approved_take(asset, registry)
                if take is None:
                    raise RuntimeError(f'No verified recording for {asset.id}; offline approval required')
                install_asset_once(asset, take.payload, take.provenance, destination=destination)
                installed += 1
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        list(pool.map(lambda item: restore_published_pair(client, env['R2_BUCKET'], *item), recoveries))
    for asset in indexed.values():
        path = destination / f'{asset.id}.mp3'
        prior = previous.get('assets', {}).get(asset.id)
        if prior:
            restore_published_pair(client, env['R2_BUCKET'], path, prior)
        valid, reason, _ = validate_stored_asset(asset, path)
        if not valid:
            raise RuntimeError(f'{asset.id}: {reason}; immutable audio cannot be replaced')

    items = []
    for path in sorted(args.source.rglob('*')):
        if path.is_file() and path.suffix in ('.mp3', '.json'):
            items.append((path, f'course-audio/{path.relative_to(args.source).as_posix()}'))
    if args.compatibility_cache:
        items.extend((p, f'course-audio/compatibility-cache/{p.name}') for p in sorted(args.compatibility_cache.glob('*.mp3')))
    print(f'{len(indexed)} verified contracts; {installed} reviewed takes installed; {recovered} existing assets recovered.', flush=True)
    print(f'{len(items)} objects; mode={"apply" if args.apply else "dry-run"}', flush=True)
    def upload(item):
        path, key = item
        expected = descriptor(path)
        try:
            head = client.head_object(Bucket=env['R2_BUCKET'], Key=key)
            if (head.get('Metadata', {}).get('sha256') != expected['sha256']
                    or head['ContentLength'] != expected['bytes']
                    or head['ETag'].strip('"') != expected['etag']):
                raise RuntimeError(f'Immutable R2 object conflict: {key}')
            return key, expected, 'present'
        except ClientError as error:
            if error.response['Error']['Code'] not in ('404','NoSuchKey','NotFound'):
                raise
        if args.apply:
            with path.open('rb') as stream:
                client.put_object(Bucket=env['R2_BUCKET'], Key=key, Body=stream,
                                  ContentType=content_type_for(path), CacheControl=CACHE_CONTROL,
                                  Metadata={'sha256':expected['sha256']}, IfNoneMatch='*')
            head = client.head_object(Bucket=env['R2_BUCKET'], Key=key)
            if head['ContentLength'] != expected['bytes'] or head['ETag'].strip('"') != expected['etag']:
                raise RuntimeError(f'R2 upload verification failed: {key}')
        return key, expected, 'uploaded' if args.apply else 'would-upload'
    objects = dict(previous.get('historical_objects', {}))
    counts = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for i, (key, expected, state) in enumerate(pool.map(upload, items), 1):
            objects[key] = expected
            counts[state] = counts.get(state, 0) + 1
            if i % 500 == 0:
                print(f'{i}/{len(items)} checked', flush=True)
    assets = {}
    for asset_id in indexed:
        key = f'course-audio/elevenlabs-v2/{asset_id}.mp3'
        assets[asset_id] = {'key': key, 'audio': objects[key], 'receipt': objects[key.removesuffix('.mp3')+'.json']}
    manifest = {'schema_version':1, 'base_url':MEDIA_BASE_URL, 'bucket':env['R2_BUCKET'],
                'catalog_sha256':catalog_sha256(), 'profile_id':COURSE_AUDIO_PROFILE_ID,
                'assets':assets, 'historical_objects':objects}
    if args.apply:
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(counts), flush=True)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
