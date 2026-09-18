"""Exact pixel/target/lesson contract for the approved existing mission edits."""
import copy, hashlib, json
from pathlib import Path

EVIDENCE='docs/qa/course-mission-photo-edits-v1.json'
IMAGE_KEYS={'image_url','prompt_image_url','title_image_url'}
GEOMETRY={'rect','head_anchors','group_chest_anchor','subject_kind'}

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def repoint(value, old, new):
    if isinstance(value,dict):
        return {k:(v.replace(old,new) if k in IMAGE_KEYS and isinstance(v,str) and Path(v).name==old else repoint(v,old,new)) for k,v in value.items()}
    if isinstance(value,list): return [repoint(v,old,new) for v in value]
    return value

def language_contract(card):
    result=copy.deepcopy(card)
    for target in result.get('mission_game',{}).get('targets',[]):
        for key in GEOMETRY: target.pop(key,None)
    return result

def validate_record(record, current, root):
    lesson=current.get(record['lesson_id'],{})
    if not lesson.get('sub_lesson_id','').endswith('.10'): raise ValueError('Mission edit cannot escape its lesson.')
    card=next((c for c in lesson['cards'] if c['slide_id']==record['slide_id']),None)
    old=record['old_filename'];new=record['candidate_filename']
    if not card or language_contract(repoint(card,new,old))!=language_contract(record['original_card']):
        raise ValueError('Mission photo edit changed teaching language, options or game behavior.')
    if card['mission_game']['targets']!=record['reviewed_targets']:
        raise ValueError('Mission markers differ from their exact pixel review.')
    if any(len(record.get(k,''))<35 for k in ('old_observation','new_observation')) or record.get('framing_review')!='inspected-full-3x2-and-targets':
        raise ValueError('Both existing-photo and new target inspections are required.')
    generation=record['generation'];receipt=generation['receipt']
    source=root/generation['source_path']
    if receipt.get('status')!='image_saved' or not source.is_file() or sha(source)!=receipt.get('sha256'):
        raise ValueError('Mission edit source or provider receipt changed.')
    if receipt.get('references')!=[record['uploaded_reference']]:
        raise ValueError('Mission edit input differs from the explicitly approved photo.')
    reference=record['uploaded_reference']
    if reference.get('filename')!=old or reference.get('sha256')!=record['old_sha256']:
        raise ValueError('Mission edit did not use the exact authorized original.')
    from scripts.audit_course_media_preservation import IMAGE_ROOTS,images
    if old in images(card) or new not in images(card):raise ValueError('Mission photo binding incomplete.')
    for folder in IMAGE_ROOTS:
        if sha(root/folder/old)!=record['old_sha256'] or sha(root/folder/new)!=record['new_sha256']:
            raise ValueError('Mission source or reviewed output pixels changed.')
    observations=record.get('target_observations',{})
    if set(observations)!={t['id'] for t in record['reviewed_targets']} or any(len(v)<20 for v in observations.values()):
        raise ValueError('Every target needs a concrete observed referent.')
    for target in record['reviewed_targets']:
        r=target['rect']
        if not (0<=r['x']<1 and 0<=r['y']<1 and r['width']>0 and r['height']>0 and r['x']+r['width']<=1 and r['y']+r['height']<=1):
            raise ValueError('Mission target outside source canvas.')
        if card['mission_game']['kind']!='voice-gate' and not target.get('head_anchors'):
            raise ValueError('Every selectable target needs inspected pointer endpoints.')
        for a in target.get('head_anchors',[]):
            if not (0<=a['x']<=1 and 0<=a['y']<=1):raise ValueError('Mission endpoint outside source canvas.')
    for other in current.values():
        if other['id']==lesson['id']:continue
        for name in images(other):
            path=root/IMAGE_ROOTS[0]/name
            if path.is_file() and sha(path)==record['new_sha256']:raise ValueError('Mission scene reused in another lesson.')

SUPERSEDED='docs/qa/course-mission-photo-edits-superseded-v1.json'

def superseding_row(record, current, root):
    """Return the parity-rebuild row that retires this edited card, or None.

    A rebuilt Units 3-7 mission may retire an earlier edit only with its own
    installation evidence naming the exact retired original. The edited file
    stays byte-for-byte on disk; it merely stops being bound.
    """
    import re
    path=root/SUPERSEDED
    if not path.is_file():return None
    rows=[r for r in json.loads(path.read_text(encoding='utf-8'))['superseded']
          if (r['lesson_id'],r['slide_id'],r['candidate_filename'])==(record['lesson_id'],record['slide_id'],record['candidate_filename'])]
    if not rows:return None
    row=rows[0]
    evidence=row.get('superseded_by','')
    if len(rows)!=1 or not re.fullmatch(r'docs/qa/unit-[3-7]-mission-media-v[1-9][0-9]*\.json',evidence) or not (root/evidence).is_file():
        raise ValueError('Superseded mission edit needs its exact rebuild evidence.')
    proof=json.loads((root/evidence).read_text(encoding='utf-8'))
    if not any((r['lesson_id'],r['old_filename'],r['old_sha256'])==(record['lesson_id'],record['old_filename'],record['old_sha256'])
               for r in proof.get('retired_scenes',[])):
        raise ValueError('Rebuild evidence does not retire this edited mission scene.')
    from scripts.audit_course_media_preservation import IMAGE_ROOTS,images
    lesson=current.get(record['lesson_id'],{})
    if record['candidate_filename'] in images(lesson) or len(row.get('reason','').strip())<35:
        raise ValueError('A superseded edit must be unbound and explained.')
    for folder in IMAGE_ROOTS:
        if sha(root/folder/record['candidate_filename'])!=record['new_sha256']:
            raise ValueError('Superseded edit pixels must stay preserved.')
    return row

def validate_plan(plan,current,root):
    if plan.get('evidence_file')!=EVIDENCE:raise ValueError('Missing exact mission-edit evidence file.')
    rows=json.loads((root/EVIDENCE).read_text(encoding='utf-8'))['assets']
    found=[r for r in rows if (r['lesson_id'],r['old_filename'],r['candidate_filename'],r['old_sha256'])==
           (plan['lesson_id'],plan['old_filename'],plan['new_filename'],plan['old_sha256'])]
    if len(found)!=1:raise ValueError('Mission edit has no unique inspected old/new pair.')
    validate_record(found[0],current,root)
