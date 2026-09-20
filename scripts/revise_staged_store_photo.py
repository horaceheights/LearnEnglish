"""Reuse the inspected word-free store for unpublished sign-leaking candidates."""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS,digest,read_lesson
from scripts.install_course_photo_reuse import pointer_parent

def main():
    path=ROOT/'docs/qa/course-photo-reuse-v1.json';proof=json.loads(path.read_text(encoding='utf-8'))
    old_candidate='a1_store.webp';new='a1_photo_u6_store_v1.webp'
    donor=next(r for r in proof['assets'] if r['candidate_filename']==new)
    for folder in IMAGE_ROOTS:
        if digest(ROOT/folder/new)!=donor['new_sha256']:raise ValueError('Word-free store pixels changed.')
    docs={};count=0
    previous=[r for r in proof['assets'] if r['candidate_filename']==old_candidate]
    for old in previous:
        if any(int(s['lesson'].split('.')[1])>=9 for s in old['scopes']):raise ValueError('Never reuse foundation imagery in review or mission.')
        for folder in IMAGE_ROOTS:
            if digest(ROOT/folder/old_candidate)!=old['new_sha256']:raise ValueError('Old candidate changed.')
        for scope in old['scopes']:
            p=ROOT/scope['path'];lesson=docs.setdefault(p,read_lesson(p));parent,key=pointer_parent(lesson,scope['pointer'])
            if Path(parent[key]).name!=old_candidate:raise ValueError('Staged store binding drift.')
            parent[key]=parent[key].replace(old_candidate,new);count+=1
        target=next((r for r in proof['assets'] if r['old_filename']==old['old_filename'] and r['candidate_filename']==new),None)
        if target is None:
            target={**copy.deepcopy(old),'candidate_filename':new,'new_sha256':donor['new_sha256'],
                    'new_observation':donor['new_observation'],'generation':copy.deepcopy(donor['generation'])}
            proof['assets'].append(target)
        else:
            target['scopes'].extend(s for s in old['scopes'] if s not in target['scopes'])
        target.setdefault('superseded_staged_candidates',[]).append({'issue':'The directly inspected earlier store photograph has a GROCERY sign spelling out the location; use the already-reviewed word-free doorway instead.','record':copy.deepcopy(old)})
        proof['assets'].remove(old)
    plans_path=ROOT/'docs/product/course-media-change-plans.json';plans=json.loads(plans_path.read_text(encoding='utf-8'))
    for plan in plans['changes']:
        if plan.get('issue')!='reviewed-legacy-photo-binding':continue
        names=sorted({r['candidate_filename'] for r in proof['assets'] if r['old_filename']==plan['old_filename'] and any(s['lesson_id']==plan['lesson_id'] for s in r['scopes'])})
        if not names:raise ValueError('Missing scoped preservation evidence.')
        plan['new_filename']=names[0]
        if len(names)>1:plan['alternative_filenames']=names[1:]
        else:plan.pop('alternative_filenames',None)
    for p,lesson in docs.items():p.write_text(json.dumps(lesson,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    path.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    plans_path.write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Reused word-free store in',count,'staged fields, no generation; earlier candidate evidence preserved.')
if __name__=='__main__':main()
