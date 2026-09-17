"""Install only independently inspected, exact-scope mission photo edits."""
import argparse,copy,io,json,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS,digest,read_lesson
from scripts.mission_photo_edit_contract import EVIDENCE,repoint,validate_record
from scripts.render_course_stills import load_pack,pack_output_directory

def main():
    p=argparse.ArgumentParser();p.add_argument('--reviews',type=Path,required=True);a=p.parse_args()
    pack_path=ROOT/'docs/product/course-photo-sweep-mission-edits-v1.json';pack=load_pack(pack_path);out=pack_output_directory(pack)
    reviews=json.loads(a.reviews.read_text(encoding='utf-8'))
    if set(reviews)!={r['id'] for r in pack['assets']}:raise ValueError('Every approved edit must be reviewed before install.')
    records=[];docs={};copies={}
    for asset in pack['assets']:
        review=reviews[asset['id']];control=asset['change_control'];source=out/(asset['id']+'.png')
        receipt=json.loads(source.with_suffix('.receipt.json').read_text())
        if review.get('sha256')!=digest(source) or review.get('disposition')!='usable':raise ValueError('Unreviewed or rejected source.')
        if receipt.get('status')!='image_saved' or receipt.get('sha256')!=digest(source) or receipt.get('pack_sha256')!=digest(pack_path):raise ValueError('Stale receipt.')
        if receipt['request']['prompt']!=pack['shared_prompt']+'\n\n'+asset['prompt']:raise ValueError('Prompt drift.')
        if any(receipt['request'].get(k)!=v for k,v in pack['image_settings'].items()):raise ValueError('Settings drift.')
        path=ROOT/control['lesson_path'];lesson=docs.setdefault(path,read_lesson(path))
        idx=next(i for i,c in enumerate(lesson['cards']) if c['slide_id']==control['slide_id'])
        expected=repoint(control['original_card'],control['old_filename'],asset['runtime_filename'])
        expected['mission_game']['targets']=review['targets']
        if lesson['cards'][idx] not in (control['original_card'],expected):raise ValueError('Canonical card drift.')
        lesson['cards'][idx]=expected
        buf=io.BytesIO()
        with Image.open(source) as image:
            if image.size!=(1536,1024):raise ValueError('Unexpected image size.')
            image.convert('RGB').save(buf,'WEBP',quality=92,method=6)
        for folder in IMAGE_ROOTS:copies[ROOT/folder/asset['runtime_filename']]=buf.getvalue()
        archive=ROOT/IMAGE_ROOTS[0]/'course-photoreal-sources'/out.name/source.name;copies[archive]=source.read_bytes()
        import hashlib
        records.append({'lesson_id':control['lesson_id'],'slide_id':control['slide_id'],'old_filename':control['old_filename'],
            'candidate_filename':asset['runtime_filename'],'old_sha256':control['old_sha256'],'new_sha256':hashlib.sha256(buf.getvalue()).hexdigest(),
            'old_observation':control['old_observation'],'new_observation':review['observation'],'original_card':control['original_card'],
            'reviewed_targets':review['targets'],'target_observations':review['target_observations'],'framing_review':'inspected-full-3x2-and-targets',
            'uploaded_reference':receipt['references'][0],'generation':{'source_path':archive.relative_to(ROOT).as_posix(),'receipt':receipt},'human_approval':'pending'})
    for path,data in copies.items():
        if path.exists() and path.read_bytes()!=data:raise ValueError('Never overwrite existing image bytes.')
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    from scripts.audit_course_media_preservation import lessons
    current=lessons(ROOT);current.update({d['id']:d for d in docs.values()})
    for record in records:validate_record(record,current,ROOT)
    for path,data in docs.items():path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/EVIDENCE).write_text(json.dumps({'schema_version':1,'assets':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    plans_path=ROOT/'docs/product/course-media-change-plans.json';plans=json.loads(plans_path.read_text(encoding='utf-8'))
    for r in records:
        plan={'lesson_id':r['lesson_id'],'old_filename':r['old_filename'],'new_filename':r['candidate_filename'],'old_sha256':r['old_sha256'],
              'issue':'reviewed-mission-photo-edit','issue_detail':r['old_observation'],'evidence_file':EVIDENCE}
        existing=[p for p in plans['changes'] if (p['lesson_id'],p['old_filename'])==(plan['lesson_id'],plan['old_filename'])]
        if existing and existing!=[plan]:raise ValueError('Conflicting mission preservation plan.')
        if not existing:plans['changes'].append(plan)
    plans_path.write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    registry_path=ROOT/'docs/product/a1-reviewed-photoreal-media.json';registry=json.loads(registry_path.read_text())
    registry['files']=sorted(set(registry['files'])|{r['candidate_filename'] for r in records})
    registry_path.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Installed',len(records),'mission edits with exact target evidence; human approval pending.')

if __name__=='__main__':main()
