"""Apply only hash-bound, individually reviewed existing-photo references."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys
import yaml

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS, digest, read_lesson

PROOF='docs/qa/course-photo-reuse-v1.json'

def pointer_parent(value,pointer):
    parts=pointer.strip('/').split('/')
    for part in parts[:-1]:
        value=value[int(part)] if isinstance(value,list) else value[part]
    return value,int(parts[-1]) if isinstance(value,list) else parts[-1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    proof=json.loads((ROOT/PROOF).read_text(encoding='utf-8'))
    baseline=json.loads((ROOT/'docs/qa/course-media-preservation-baseline.json').read_text(encoding='utf-8'))
    plans_path=ROOT/'docs/product/course-media-change-plans.json'
    plans=json.loads(plans_path.read_text(encoding='utf-8'))
    docs={}; changes=0; missing_copies={}
    for record in proof['assets']:
        if record['crop_review']!='inspected-3x2-and-centered-4x5':
            raise ValueError('Unreviewed crop.')
        old,new=record['old_filename'],record['candidate_filename']
        for folder in IMAGE_ROOTS:
            for filename,sha in [(old,record['old_sha256']),(new,record['new_sha256'])]:
                target=ROOT/folder/filename
                if not target.is_file() and filename==new:
                    missing_copies[target]=ROOT/IMAGE_ROOTS[0]/new
                    continue
                if digest(target)!=sha:
                    raise ValueError('Image bytes changed: '+filename)
        for scope in record['scopes']:
            path=ROOT/scope['path']
            if path not in docs:
                docs[path]=read_lesson(path)
            data=docs[path]
            number=int(data['sub_lesson_id'].split('.')[1])
            if data['id']!=scope['lesson_id'] or number==10 or (number==9 and not record.get('generation')):
                raise ValueError('Unexpected lesson scope.')
            parent,key=pointer_parent(data,scope['pointer'])
            value=parent[key]
            filename=Path(value.split('?',1)[0]).name
            if filename not in {old,new}:
                raise ValueError('Concurrent binding change: '+scope['pointer'])
            if filename==old:
                parent[key]=value.replace(old,new)
                changes+=1
            # Preserve an earlier semantic repair's original evidence while its
            # provisional replacement receives the newly inspected photograph.
            for prior in plans['changes']:
                if prior['lesson_id']==data['id'] and prior['new_filename']==old and prior.get('issue')=='use-image-contradicts-sentence':
                    target=next(c for c in data['cards'] if c['slide_id']==prior['slide_id'] and c['stage']=='Use')
                    if Path(target.get('prompt_image_url','')).name==new:
                        prior['new_filename']=new
            if old in baseline['lesson_bindings'].get(data['id'],[]):
                existing=[p for p in plans['changes'] if p['lesson_id']==data['id'] and p['old_filename']==old]
                if not existing:
                    plans['changes'].append({'lesson_id':data['id'],'old_filename':old,'new_filename':new,
                        'old_sha256':record['old_sha256'],'issue':'reviewed-legacy-photo-binding',
                        'issue_detail':record['old_observation']+' Reuse the inspected existing photograph without changing any preserved source bytes.',
                        'evidence_file':PROOF})
                elif existing[0]['new_filename']!=new:
                    if existing[0].get('issue')=='reviewed-legacy-photo-binding':
                        existing[0]['alternative_filenames']=sorted(set(existing[0].get('alternative_filenames',[])) | {new})
                    elif existing[0].get('issue')!='use-image-contradicts-sentence':
                        raise ValueError('An existing preservation plan conflicts with this replacement.')
    # A staged replay must not redirect an earlier Use repair when only another
    # stage's binding changed. Bind its plan to its exact current named card.
    by_id={data['id']:data for data in docs.values()}
    for prior in plans['changes']:
        if prior.get('issue')=='use-image-contradicts-sentence' and prior['lesson_id'] in by_id:
            card=next(c for c in by_id[prior['lesson_id']]['cards'] if c['slide_id']==prior['slide_id'] and c['stage']=='Use')
            prior['new_filename']=Path(card['prompt_image_url'].split('?',1)[0]).name
    # Fail if reusing a photo collapses two image choices to identical bytes.
    for data in docs.values():
        for card in data.get('cards',[]):
            filenames=[Path(o['image_url'].split('?',1)[0]).name for o in card.get('options',[]) if o.get('image_url')]
            hashes=[digest(ROOT/IMAGE_ROOTS[0]/f) for f in filenames]
            if len(hashes)!=len(set(hashes)):
                raise ValueError(f"Duplicate photo options: {data['id']} {card.get('slide_id')}")
    if args.apply:
        for target,source in missing_copies.items():
            target.write_bytes(source.read_bytes())
        for path,data in docs.items():
            # Mechanical reference update only: retain hand-authored YAML formatting.
            text=path.read_text(encoding='utf-8-sig')
            old_data=json.loads(text) if text.lstrip().startswith('{') else yaml.safe_load(text)
            if old_data==data:
                continue
            if text.lstrip().startswith('{'):
                text=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
            else:
                # Unit 1.1 contains no skipped/review-scoped occurrences.
                for record in proof['assets']:
                    scopes=[s for s in record['scopes'] if ROOT/s['path']==path]
                    if scopes:
                        text=text.replace(record['old_filename'],record['candidate_filename'])
                if yaml.safe_load(text)!=data:
                    raise ValueError('YAML replacement changed more than the exact approved references.')
            path.write_text(text,encoding='utf-8')
        plans_path.write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        registry_path=ROOT/'docs/product/a1-reviewed-photoreal-media.json'
        registry=json.loads(registry_path.read_text(encoding='utf-8'))
        registry['files']=sorted(set(registry['files']) | {r['candidate_filename'] for r in proof['assets']})
        registry_path.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'changed_references':changes,'lessons':len(docs),'applied':args.apply}))

if __name__=='__main__':
    main()
