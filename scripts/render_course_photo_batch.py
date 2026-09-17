"""Serial orchestration of the installed CLI through existing receipt controls.

No new API client, automatic retry, fallback, concurrent charge or content write.
An already saved image is skipped only after its exact receipt is verified.
"""
import argparse
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.render_course_stills import load_pack,pack_output_directory,digest,main as render_one

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pack',type=Path,required=True);p.add_argument('--cli',type=Path,required=True)
    p.add_argument('--execute',action='store_true');p.add_argument('--max-cost-usd',required=True)
    p.add_argument('--text-only',action='store_true',help='Do not send any existing image: skip every asset with reference inputs.')
    args=p.parse_args();pack=load_pack(args.pack);out=pack_output_directory(pack)
    for asset in pack['assets']:
        if args.text_only and (asset.get('reference') or asset.get('reference_file')):
            print('HELD: existing-image upload requires approval: '+asset['id'],flush=True)
            continue
        image=out/(asset['id']+'.png');receipt=image.with_suffix('.receipt.json')
        if image.exists() or receipt.exists():
            record=json.loads(receipt.read_text(encoding='utf-8')) if receipt.exists() else {}
            if not image.is_file() or record.get('status')!='image_saved' or record.get('sha256')!=digest(image) or record.get('pack_sha256')!=digest(args.pack):
                raise ValueError('Existing uncertain/failed attempt; stop and reconcile, never automatically retry.')
            print('Verified saved image, no new charge: '+asset['id'],flush=True)
            continue
        sys.argv=['render_course_stills.py','--pack',str(args.pack),'--asset-id',asset['id'],'--cli',str(args.cli),
            '--max-cost-usd',args.max_cost_usd,'--request-reserve-usd','0.12']+(['--execute'] if args.execute else [])
        result=render_one()
        if result:raise RuntimeError('Generation stopped; no automatic retry.')

if __name__=='__main__':main()
