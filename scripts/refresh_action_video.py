"""Submit one planned Veo request, or resume its saved operation without resubmission.

No automatic paid retries or provider fallback. Raw outputs are retained separately
from reviewed lesson exports. This operator tool is never called by the app.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path

from google import genai
from google.genai import types

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / 'docs/product/action-video-refresh-2026-09-17.json'
RECEIPTS = ROOT / 'docs/qa/action-video-refresh-receipts'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def client(env_file):
    key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not key and env_file:
        for line in Path(env_file).read_text(encoding='utf-8').splitlines():
            name, sep, value = line.partition('=')
            if sep and name.strip() in {'GEMINI_API_KEY', 'GOOGLE_API_KEY'}:
                key = value.strip().strip('\"').strip("'")
                break
    if not key:
        raise ValueError('Gemini credentials are not configured.')
    return genai.Client(api_key=key, http_options=types.HttpOptions(
        retry_options=types.HttpRetryOptions(attempts=1)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['submit', 'poll'])
    parser.add_argument('scene')
    parser.add_argument('--env-file', type=Path)
    args = parser.parse_args()
    plan = json.loads(PLAN.read_text(encoding='utf-8'))
    job = next(j for j in plan['scenes'] if j['id'] == args.scene)
    receipt_path = RECEIPTS / (job['id'] + '.json')
    source = ROOT / 'frontend/public/lesson-assets' / job['source']
    if digest(source) != job['source_sha256']:
        raise ValueError('Source image changed after planning; review and re-plan before generation.')
    api = client(args.env_file)
    if args.action == 'submit':
        if receipt_path.exists():
            raise ValueError('Request already recorded. Poll its operation; never resubmit an uncertain request.')
        reserved = sum(json.loads(p.read_text())['estimated_cost_usd'] for p in RECEIPTS.glob('*.json')) if RECEIPTS.exists() else 0
        estimate = plan['duration_seconds'] * plan['usd_per_second']
        if reserved + estimate > plan['cost_ceiling_usd'] + 1e-9:
            raise ValueError('Declared cost ceiling exceeded.')
        receipt = dict(scene=job['id'], model=plan['model'], source=job['source'],
                       source_sha256=job['source_sha256'], prompt=job['prompt'],
                       settings={k: plan[k] for k in ['duration_seconds','resolution','aspect_ratio']},
                       estimated_cost_usd=estimate, status='submitting',
                       requested_at=datetime.now(timezone.utc).isoformat())
        # Reserve the request before crossing the paid API boundary. Even an
        # interrupted response must not permit an implicit second submission.
        save(receipt_path, receipt)
        operation = api.models.generate_videos(
            model=plan['model'],
            source=types.GenerateVideosSource(prompt=job['prompt'], image=types.Image.from_file(location=str(source))),
            config=types.GenerateVideosConfig(duration_seconds=plan['duration_seconds'],
                resolution=plan['resolution'], aspect_ratio=plan['aspect_ratio'], number_of_videos=1))
        receipt.update(operation=operation.name, status='submitted')
        save(receipt_path, receipt)
        print(json.dumps({'scene':job['id'], 'status':receipt['status'], 'operation':operation.name}))
        return
    receipt = json.loads(receipt_path.read_text())
    if receipt['status'] == 'downloaded':
        raw = ROOT / receipt['raw_path']
        if digest(raw) != receipt['raw_sha256']:
            raise ValueError('Saved raw video changed.')
        print(json.dumps({'scene':job['id'], 'status':'downloaded'}))
        return
    if not receipt.get('operation'):
        raise ValueError('Uncertain submission has no operation ID; do not resubmit.')
    operation = api.operations.get(types.GenerateVideosOperation(name=receipt['operation']))
    if not operation.done:
        print(json.dumps({'scene':job['id'], 'status':'running'}))
        return
    if operation.error:
        receipt.update(status='failed', error=operation.error)
        save(receipt_path, receipt)
        raise RuntimeError(str(operation.error))
    response = operation.response
    if not response or not response.generated_videos:
        receipt.update(status='no-video', provider_response=operation.model_dump(mode='json', exclude_none=True))
        save(receipt_path, receipt)
        raise RuntimeError('Provider returned no video. Inspect the receipt; do not retry automatically.')
    raw = ROOT / 'Lessons/Lesson1/video-sources' / (job['id'] + '-photo-v3-raw.mp4')
    raw.parent.mkdir(parents=True, exist_ok=True)
    raw.write_bytes(api.files.download(file=response.generated_videos[0].video))
    receipt.update(status='downloaded', raw_path=raw.relative_to(ROOT).as_posix(), raw_sha256=digest(raw),
                   completed_at=datetime.now(timezone.utc).isoformat(),
                   cost_note='Duration-based list-price estimate, not a billing invoice. No automatic retries.')
    save(receipt_path, receipt)
    print(json.dumps({'scene':job['id'], 'status':'downloaded', 'raw_path':receipt['raw_path']}))


if __name__ == '__main__':
    main()
