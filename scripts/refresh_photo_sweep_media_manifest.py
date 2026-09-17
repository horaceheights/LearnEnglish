"""Refresh only photo-sweep lessons, preserving unrelated reviewed contracts."""
from __future__ import annotations
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons
from scripts.a1_media_runtime_contracts import card_media_usages, course_browser_media_usages
from scripts.build_a1_units_2_7 import AssetCatalog, REVIEWED_PHOTOREAL_FILENAMES

def key(context):
    return tuple(context.get(k) for k in ('lesson_id','stage','slide_id','media_role','option_id'))

def main():
    proof=json.loads((ROOT/'docs/qa/course-photo-reuse-v1.json').read_text(encoding='utf-8'))
    selected={s['lesson_id'] for a in proof['assets'] for s in a['scopes']}
    observed={a['candidate_filename']:a['new_observation'] for a in proof['assets']}
    edit_proof=ROOT/'docs/qa/course-mission-photo-edits-v1.json'
    if edit_proof.exists():
        for row in json.loads(edit_proof.read_text(encoding='utf-8'))['assets']:
            selected.add(row['lesson_id'])
            observed[row['candidate_filename']]=row['new_observation']
    dialogue_proof=ROOT/'docs/qa/course-dialogue-poster-reuse-v1.json'
    if dialogue_proof.exists():
        for row in json.loads(dialogue_proof.read_text(encoding='utf-8'))['assets']:
            selected.add(row['lesson_id'])
            observed[row['candidate_filename']]=row['new_observation']
    diagram_proof=ROOT/'docs/qa/course-exact-diagram-reuse-v1.json'
    if diagram_proof.exists():
        for row in json.loads(diagram_proof.read_text(encoding='utf-8'))['assets']:
            selected.add(row['lesson_id'])
            observed[row['candidate_filename']]=row['new_observation']
    mission_proof=ROOT/'docs/qa/course-mission-still-reuse-v1.json'
    if mission_proof.exists():
        for row in json.loads(mission_proof.read_text(encoding='utf-8'))['assets']:
            selected.add(row['lesson_id'])
            observed[row['candidate_filename']]=row['new_observation']
    browser_proof=ROOT/'docs/qa/course-photo-browser-reuse-v1.json'
    if browser_proof.exists():
        for row in json.loads(browser_proof.read_text())['assets']:
            selected.add(row['scope'])
            observed[row['candidate_filename']]=row['observation']
    manifest_path=ROOT/'docs/product/a1-media-manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    previous={}; retained=[]
    for row in manifest['assets']:
        for context in row.get('review_contexts',[]):
            previous[key(context)]=row
        contexts=[c for c in row.get('review_contexts',[]) if c.get('lesson_id') not in selected]
        if len(contexts)==len(row.get('review_contexts',[])):
            retained.append(row)
        elif contexts:
            retained.append({**row,'review_contexts':contexts,'card_refs':sorted({'|'.join((str(c.get('sub_lesson_id')),str(c.get('stage')),str(c.get('slide_id') or '<none>'))) for c in contexts})})
    current=lessons(ROOT); catalog=AssetCatalog()
    usages=[]
    for lesson in current.values():
        if lesson['id'] in selected:
            for card in lesson['cards']:
                usages.extend(card_media_usages(lesson,card))
    usages.extend(u for u in course_browser_media_usages(list(current.values())) if u['context'].get('lesson_id') in selected)
    for usage in usages:
        context=usage['context']; filename=usage['rendered_filename']; old=previous.get(key(context),{})
        concept=old.get('concept') or context.get('option_label') or context.get('option_id') or context.get('answer_audio_text') or context.get('audio_text') or context.get('prompt') or Path(filename).stem
        description=observed.get(filename) or old.get('description') or f'Photograph for {concept}; validate the exact bound card meaning.'
        catalog.add_runtime_contract(filename=filename,concept=concept,description=description,context=context,source='photo-sweep-runtime')
    merged={r['asset_id']:r for r in retained}
    for row in catalog.items.values():
        if row['asset_id'] in merged:
            other=merged[row['asset_id']]
            row['review_contexts']=[*other['review_contexts'],*[c for c in row['review_contexts'] if c not in other['review_contexts']]]
            row['card_refs']=sorted(set(other['card_refs']+row['card_refs']))
        merged[row['asset_id']]=row
    manifest['assets']=sorted(merged.values(),key=lambda r:r['asset_id'])
    # Reused photos may also have untouched browser contracts in other lessons.
    # Preserve their independent descriptions, but protect every registered copy
    # from the legacy composite renderer regardless of which lesson owns it.
    for row in manifest['assets']:
        if row['filename'] in REVIEWED_PHOTOREAL_FILENAMES:
            row['source']='reviewed-photoreal'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Refreshed {len(usages)} runtime uses in {len(selected)} scoped lessons; other lessons preserved.')

if __name__=='__main__':main()
