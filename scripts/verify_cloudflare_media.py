"""Release gate: prove every published course media/audio byte on the CDN."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import sys
import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.cloudflare_media import MEDIA_BASE_URL, object_url, retry_transient_cdn_read, verify_inventory

def verify_media_object(client, key, value):
    def verify():
        # A retry starts a new stream and a new digest; partial bytes are discarded.
        digest = hashlib.sha256()
        count = 0
        with client.stream('GET', object_url(key)) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes():
                digest.update(chunk)
                count += len(chunk)
        if count != value['bytes'] or digest.hexdigest() != value['sha256']:
            raise ValueError('checksum/size mismatch')
    retry_transient_cdn_read(verify)

def main():
    result = verify_inventory(full=True)
    manifest = json.loads((ROOT/'docs/product/media-upload-manifest.json').read_text(encoding='utf-8'))
    if manifest['base_url'] != MEDIA_BASE_URL:
        raise RuntimeError('Unexpected course media origin')
    errors = list(result.pop('errors'))
    with httpx.Client(timeout=60, headers={'Accept-Encoding':'identity'}) as client:
        def check(item):
            key, value = item
            try:
                verify_media_object(client, key, value)
            except Exception as error:
                return f'{key}: {error}'
        with ThreadPoolExecutor(max_workers=16) as pool:
            errors.extend(error for error in pool.map(check, manifest['objects'].items()) if error)
    print(json.dumps({**result, 'media_object_count':manifest['object_count'], 'errors':errors}, indent=2))
    return int(bool(errors) or not result['ready'])

if __name__ == '__main__':
    raise SystemExit(main())
