"""Scoped PR155 photo repair production using the existing recorded image CLI.

The default command validates only. Paid rendering is explicit, single-attempt,
and never installs an image until its independent pixel review is recorded.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
from decimal import Decimal
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.render_course_stills import RecordedImageClient, digest, finalize_saved_image, validate_budget
from scripts.audit_course_media_preservation import IMAGE_ROOTS

PACK = ROOT / 'docs/product/use-photoreal-repairs-v1.json'
OUTPUT = ROOT / 'output/imagegen/use-photoreal-repairs-v1'
PROOF = ROOT / 'docs/qa/use-photoreal-repairs-v1.json'


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def lesson_path(asset):
    return ROOT / 'backend/lessons' / f"unit_{asset['unit']}" / f"{asset['lesson_id']}.yaml"


def validate_scope(pack):
    if len(pack['assets']) != 4 or len({a['id'] for a in pack['assets']}) != 4:
        raise ValueError('Only the four reviewed PR155 scenes are in scope.')
    for asset in pack['assets']:
        for folder in IMAGE_ROOTS:
            if digest(ROOT / folder / asset['old_filename']) != asset['old_sha256']:
                raise ValueError('Original image changed; reconcile before proceeding.')
        lesson = json.loads(lesson_path(asset).read_text(encoding='utf-8'))
        cards = [c for c in lesson['cards'] if c['slide_id'] == asset['slide_id']]
        if len(cards) != 1 or cards[0]['stage'] != 'Use' or cards[0]['answer_audio_text'] != asset['sentence']:
            raise ValueError('Target card changed; do not overwrite concurrent content.')
        if cards[0]['prompt_image_url'] not in (asset['old_filename'], asset['runtime_filename']):
            raise ValueError('Unexpected image binding.')


def render(pack, asset, cli_path, ceiling):
    if asset.get('reuse_existing_benchmark'):
        raise ValueError('Reuse the saved benchmark; do not charge for it again.')
    declared = Decimal(pack['production']['initial_batch_ceiling_usd'])
    if ceiling is None or ceiling <= 0 or ceiling > declared:
        raise ValueError('An explicit ceiling within the declared budget is required.')
    validate_budget(OUTPUT, ceiling, Decimal('0.15'))
    output = OUTPUT / f"{asset['id']}.png"
    receipt = output.with_suffix('.receipt.json')
    if output.exists() or receipt.exists():
        raise ValueError('Already attempted. No overwrite or paid retry.')
    spec = importlib.util.spec_from_file_location('bundled_imagegen', cli_path)
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)
    client = RecordedImageClient(output, receipt, digest(PACK), asset['id'])
    cli._create_client = lambda: client
    cfg = pack['image_settings']
    sys.argv = [str(cli_path), 'generate', '--model', cfg['model'], '--n', '1', '--size', cfg['size'],
                '--quality', cfg['quality'], '--output-format', cfg['output_format'], '--no-augment',
                '--prompt', asset['prompt'], '--out', str(output)]
    cli.main()
    record = finalize_saved_image(output, receipt)
    print(json.dumps({'asset_id': asset['id'], 'cost': record['cost'], 'output': str(output)}))


def install(pack):
    from PIL import Image
    reviews = json.loads((OUTPUT / 'agent-reviews.json').read_text(encoding='utf-8'))
    records, exports, lessons = [], {}, {}
    for asset in pack['assets']:
        source = OUTPUT / f"{asset['id']}.png"
        receipt = json.loads(source.with_suffix('.receipt.json').read_text(encoding='utf-8'))
        review = reviews[asset['id']]
        if receipt['status'] != 'image_saved' or receipt['sha256'] != digest(source) or receipt['byte_count'] != source.stat().st_size:
            raise ValueError('Missing or stale generation receipt.')
        if any(receipt['request'].get(k) != v for k, v in pack['image_settings'].items()):
            raise ValueError('Unapproved model or settings.')
        if asset.get('reuse_existing_benchmark'):
            if digest(source) != asset['source_sha256']:
                raise ValueError('Benchmark source differs from the inspected sample.')
        elif receipt['request']['prompt'] != asset['prompt'] or receipt['pack_sha256'] != digest(PACK):
            raise ValueError('Source prompt or production plan changed.')
        if review.get('disposition') != 'usable' or review.get('sha256') != digest(source) or not review.get('observed_description'):
            raise ValueError('A current independent pixel review is required.')
        with Image.open(source) as image:
            if image.size != (1536, 1024):
                raise ValueError('Do not crop meaning or stretch pixels into compliance.')
            stream = io.BytesIO()
            image.convert('RGB').save(stream, 'WEBP', quality=92, method=6)
        pixels = stream.getvalue()
        for folder in IMAGE_ROOTS:
            target = ROOT / folder / asset['runtime_filename']
            if target.exists() and target.read_bytes() != pixels:
                raise ValueError('Never overwrite different existing image bytes.')
        exports[asset['runtime_filename']] = pixels
        path = lesson_path(asset)
        lesson = json.loads(path.read_text(encoding='utf-8'))
        card = next(c for c in lesson['cards'] if c['slide_id'] == asset['slide_id'])
        card['prompt_image_url'] = asset['runtime_filename']
        lessons[path] = lesson
        archive = ROOT / IMAGE_ROOTS[0] / 'course-photoreal-sources/use-repairs-v1' / source.name
        if archive.exists() and digest(archive) != digest(source):
            raise ValueError('Archived source must remain immutable.')
        records.append({'asset_id': asset['id'], 'lesson_id': asset['lesson_id'], 'slide_id': asset['slide_id'],
                        'runtime_filename': asset['runtime_filename'], 'runtime_sha256': hashlib.sha256(pixels).hexdigest(),
                        'source_path': archive.relative_to(ROOT).as_posix(), 'receipt': receipt,
                        'agent_review': review, 'human_approval': 'pending'})
    changes_path = ROOT / 'docs/product/course-media-change-plans.json'
    changes = json.loads(changes_path.read_text(encoding='utf-8'))
    for asset in pack['assets']:
        matching = [p for p in changes['changes'] if p['lesson_id'] == asset['lesson_id'] and p.get('slide_id') == asset['slide_id']]
        if len(matching) != 1 or matching[0]['new_filename'] not in (asset['old_filename'], asset['runtime_filename']):
            raise ValueError('Preservation exception changed; reconcile it.')
        matching[0]['new_filename'] = asset['runtime_filename']
    registry_path = ROOT / 'docs/product/a1-reviewed-photoreal-media.json'
    registry = json.loads(registry_path.read_text(encoding='utf-8'))
    registry['files'] = sorted(set(registry['files']) | set(exports))
    # All validations finish before any canonical writes.
    for filename, pixels in exports.items():
        for folder in IMAGE_ROOTS:
            (ROOT / folder / filename).write_bytes(pixels)
    for record in records:
        archive = ROOT / record['source_path']
        archive.parent.mkdir(parents=True, exist_ok=True)
        archive.write_bytes((OUTPUT / f"{record['asset_id']}.png").read_bytes())
    for path, lesson in lessons.items():
        write_json(path, lesson)
    write_json(registry_path, registry)
    write_json(changes_path, changes)
    write_json(PROOF, {'schema_version': 1, 'pack_sha256': digest(PACK), 'human_approval': 'pending', 'assets': records})
    print('Installed four independently inspected photos; old files and all other cards preserved.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--render', choices=['dislikes-juice', 'five-green-pens', 'train-arrives-ten-at-night'])
    action.add_argument('--install', action='store_true')
    parser.add_argument('--cli', type=Path)
    parser.add_argument('--max-cost-usd', type=Decimal)
    args = parser.parse_args()
    pack = json.loads(PACK.read_text(encoding='utf-8'))
    validate_scope(pack)
    if args.render:
        if args.cli is None:
            raise ValueError('Use the installed unmodified imagegen CLI.')
        render(pack, next(a for a in pack['assets'] if a['id'] == args.render), args.cli, args.max_cost_usd)
    elif args.install:
        install(pack)
    else:
        print('Four scoped replacements validated; no generation or content writes.')


if __name__ == '__main__':
    main()
