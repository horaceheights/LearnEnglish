"""Bind explicitly supplied agent observations to seen source pixels.

This records staging inspection only, never human semantic/crop approval.
It cannot infer an assessment or populate observations from a generation prompt.
"""
import argparse,json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import digest
from scripts.render_course_stills import pack_output_directory

def main():
    p=argparse.ArgumentParser();p.add_argument('--pack',type=Path);p.add_argument('--observations',type=Path,required=True)
    p.add_argument('--reuse-candidates',type=Path);args=p.parse_args()
    observations=json.loads(args.observations.read_text())
    if args.reuse_candidates:
        candidates=json.loads(args.reuse_candidates.read_text());out=args.reuse_candidates.parent/'manual-observations.json'
        records={}
        for item in candidates:
            text=observations[str(item['index'])]
            if len(text)<35:raise ValueError('Concrete observation required.')
            records[str(item['index'])]={'sha256':digest(ROOT/'Lessons/Lesson1/images'/item['candidate_filename']),'observation':text}
    else:
        pack=json.loads(args.pack.read_text());folder=pack_output_directory(pack);out=folder/'agent-reviews.json'
        records=json.loads(out.read_text()) if out.exists() else {}
        ids={a['id'] for a in pack['assets']}
        for aid,item in observations.items():
            if aid not in ids:raise ValueError('Unknown observed image.')
            text=item['observation'];disposition=item['disposition']
            if len(text)<35 or disposition not in ('usable','rejected'):raise ValueError('Explicit assessment required.')
            record={'sha256':digest(folder/(aid+'.png')),'disposition':disposition,
                'observed_description':text,'crop_review':'inspected-3x2-and-centered-4x5','human_approval':'pending'}
            if aid in records and records[aid]!=record:raise ValueError('Existing review differs; reconcile explicitly.')
            records[aid]=record
    out.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
    print('Recorded staging observations; human approvals remain pending:',len(records))

if __name__=='__main__':main()
