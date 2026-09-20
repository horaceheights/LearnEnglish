"""Fail closed when a reviewed photo/video/poster pair drifts independently.

Hash continuity is an engineering gate, not human semantic approval. Replacing a
photo, video or poster requires inspecting the pair before recording new hashes.
"""
from pathlib import Path
import hashlib
import json
import re
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.a1_media_runtime_contracts import OPTION_MEDIA_VARIANTS, TWO_CARD_ACTION_POSTERS


def digest(path: Path) -> str | None:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def video_map(source: str, name: str = 'LESSON_ACTION_VIDEOS') -> dict[str, str]:
    match = re.search(r'const ' + name + r'(?:\s*:[^=]+)?\s*=\s*\{(.*?)\n\};', source, re.S)
    if not match:
        raise ValueError(f'Missing inspectable map: {name}')
    return dict(re.findall(r'''["']?(\w+)["']?\s*:\s*["']([^"']+\.mp4)["']''', match[1]))


def image_keys(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {'image_url', 'prompt_image_url'} and isinstance(item, str):
                yield Path(item.split('?')[0]).stem
            else:
                yield from image_keys(item)
    elif isinstance(value, list):
        for item in value:
            yield from image_keys(item)


def check_binding(root, key, binding, mapped_video, source_name, poster_name):
    errors = []
    fields = {'source': source_name, 'video': mapped_video, 'poster': poster_name}
    for field, name in fields.items():
        if binding.get(field) != name:
            errors.append(f'{key}: {field} mapping changed without pair review')
        if not name:
            continue
        if field == 'video':
            folders = ['frontend/public/lesson-assets']
            if binding.get('bundled'):
                folders += ['mobile/assets/lesson-videos']
        else:
            folders = ['frontend/public/lesson-assets', 'mobile/assets/lesson-assets', 'Lessons/Lesson1/images']
        expected = binding.get(field + '_sha256')
        if not expected:
            errors.append(f'{key}: missing {field} review hash')
        for folder in folders:
            if digest(root / folder / name) != expected:
                errors.append(f'{key}: {field} changed or missing: {folder}/{name}; review the complete pair')
    return errors


def audit(root=ROOT):
    mobile_source = (root / 'mobile/src/actionVideos.ts').read_text(encoding='utf-8')
    web_source = (root / 'frontend/components/LessonPlayer.js').read_text(encoding='utf-8')
    native = video_map(mobile_source)
    web = video_map(web_source)
    payload = json.loads((root / 'docs/product/action-video-bindings.json').read_text(encoding='utf-8'))
    bindings = payload['bindings']
    required = set()
    for file in (root / 'backend/lessons').glob('unit_*/*.yaml'):
        required.update(set(image_keys(yaml.safe_load(file.read_text(encoding='utf-8')))) & native.keys())
    errors = [f'{key}: missing reviewed photo/video binding' for key in sorted(required - bindings.keys())]
    for key, binding in bindings.items():
        if native.get(key) != web.get(key):
            errors.append(f'{key}: web/native video mappings disagree')
        if not native.get(key):
            errors.append(f'{key}: reviewed video is no longer mapped')
            continue
        source = OPTION_MEDIA_VARIANTS.get(key + '.webp', key + '.webp')
        poster = TWO_CARD_ACTION_POSTERS.get(key)
        errors.extend(check_binding(root, key, binding, native[key], source, poster))
        for label, client_source in [('native', mobile_source), ('web', web_source)]:
            for variant_key, variant_name in video_map(client_source, 'TWO_CARD_ACTION_VIDEOS').items():
                if variant_key == key and variant_name != binding['video']:
                    errors.append(f'{key}: {label} two-choice video bypasses the reviewed binding')
        if binding.get('bundled') and f"require('../assets/lesson-videos/{binding['video']}')" not in mobile_source:
            errors.append(f'{key}: missing literal native video import')
        if poster:
            if f"require('../assets/lesson-assets/{poster}')" not in mobile_source:
                errors.append(f'{key}: native poster does not match the reviewed binding')
            if f'"{key}": "{poster}"' not in web_source:
                errors.append(f'{key}: web poster does not match the reviewed binding')
    print(f'Checked {len(bindings)} reviewed pairs; {len(required)} referenced by current lessons.')
    return errors


if __name__ == '__main__':
    failures = audit()
    for failure in failures:
        print('FAIL:', failure)
    raise SystemExit(bool(failures))
