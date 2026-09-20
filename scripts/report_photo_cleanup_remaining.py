"""Read-only remaining bindings against the immutable visually inspected inventory."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons
from scripts.install_course_photo_reuse import pointer_parent

def remaining():
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets']
    triage=json.loads((ROOT/'docs/qa/course-photo-style-triage-2026-09-17.json').read_text())
    selected=set()
    for key,value in triage.items():
        if 'indices' in key and not key.startswith('precision_diagram'):selected.update(value)
    selected.update(x['index'] for x in triage['additional_semantic_issues'])
    current=lessons(ROOT);planned={}
    for path in (ROOT/'docs/product').glob('course-photo-sweep-*-v1.json'):
        pack=json.loads(path.read_text())
        for asset in pack['assets']:
            for control in asset['change_control'].get('replacements',[asset['change_control']]):
                for scope in control.get('scopes',[]):planned[(scope['lesson_id'],scope['pointer'])]=asset['id']
    rows=[]
    for index in sorted(selected):
        old=inventory[index-1];scopes=[]
        for s in old['authored_bindings']:
            lesson=current[s['lesson_id']];parent,key=pointer_parent(lesson,s['pointer'])
            if Path(parent[key].split('?',1)[0]).name!=old['filename']:continue
            if (s['lesson_id'],s['pointer']) in planned:continue
            card=lesson['cards'][int(s['pointer'].split('/')[2])] if s['pointer'].startswith('/cards/') else {}
            option=card['options'][int(s['pointer'].split('/')[4])] if '/options/' in s['pointer'] else {}
            scopes.append({**s,'stage':card.get('stage'),'slide_id':card.get('slide_id'),'prompt':card.get('prompt'),
                'audio_text':card.get('audio_text'),'answer_audio_text':card.get('answer_audio_text'),'option':option})
        if scopes:rows.append({'index':index,'filename':old['filename'],'scopes':scopes,'descriptions':old['descriptions']})
    return rows

if __name__=='__main__':
    rows=remaining();out=ROOT/'output/qa/photo-cleanup-remaining.json'
    out.write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
    print('Remaining unplanned image groups:',len(rows))
    for row in rows:
        contexts=set(f"{s['lesson']} {s['stage']} {s['answer_audio_text'] or s['audio_text'] or s['prompt']}" for s in row['scopes'])
        print(row['index'],row['filename'], ' | '.join(sorted(contexts)))
