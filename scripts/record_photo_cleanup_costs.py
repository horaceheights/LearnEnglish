"""Archive all cleanup usage receipts, including drafts, without provider calls."""
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    receipts = []
    for path in sorted((ROOT / 'output/imagegen').glob('course-photo-sweep-v*/*.receipt.json')):
        record = json.loads(path.read_text(encoding='utf-8'))
        if record.get('status') != 'image_saved' or not record.get('cost'):
            raise ValueError(f'Unreconciled paid attempt: {path.name}')
        receipts.append({'local_receipt': path.relative_to(ROOT).as_posix(), **record})
    if len(receipts) != 192:
        raise ValueError('Expected all 192 reviewed cleanup responses, including rejected drafts.')
    edits = [r for r in receipts if r.get('references')]
    if len(edits) != 15:
        raise ValueError('The approved existing-photo upload batch must contain exactly 15 requests.')
    total = lambda rows, currency: str(sum((Decimal(r['cost'][currency]) for r in rows), Decimal(0)))
    if Decimal(total(edits, 'usd')) > Decimal('1.50'):
        raise ValueError('Approved existing-photo edit spending ceiling exceeded.')
    ledger = {
        'schema_version': 1,
        'basis': 'Provider-reported tokens at recorded rates; before taxes or discounts, not an invoice.',
        'saved_responses_including_rejected_drafts': len(receipts),
        'total_estimated_usd': total(receipts, 'usd'),
        'total_estimated_mxn': total(receipts, 'mxn'),
        'approved_15_edits_estimated_usd': total(edits, 'usd'),
        'approved_15_edits_ceiling_usd': '1.50',
        'receipts': receipts,
    }
    destination = ROOT / 'docs/qa/course-photo-cleanup-costs-v1.json'
    destination.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in ledger.items() if key != 'receipts'}))


if __name__ == '__main__':
    main()
