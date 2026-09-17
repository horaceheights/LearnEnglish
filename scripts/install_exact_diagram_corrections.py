"""Rebind three directly inspected precise cues without altering original pixels."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS,digest,read_lesson,validate_exact_diagram_plan

CASES=[
 ('5.7','U6','price','a1_scene_it-is-five-dollars_fb6615f.webp','a1_scene_milk-2_6c36e21.webp',
  'It is two dollars.',
  'A cup of coffee is accompanied by a clearly printed $5 price, not the two dollars required by this sentence.',
  'A milk container is accompanied by a clearly printed $2 price. This supplies the exact generic two-dollar statement without changing the sentence.'),
 ('6.4','U6','distance','a1_scene_near_d8c4668.webp','a1_scene_far-from_e6f6b5c.webp',
  'It is far from the park.',
  'A store and park are separated by a short horizontal distance bar, explicitly depicting near rather than far.',
  'A station is far to the left of the park, separated by a long distance bar. The diagram makes the far-from-park spatial relationship explicit.'),
 ('6.8','U7','schedule','a1_scene_the-bus-leaves-at-eight_d18bc2f.webp','a1_scene_the-bus-leaves-at-six-in-the-morning_376cbdd.webp',
  'The bus leaves at six in the morning.',
  'A bus departure arrow and bus shelter are accompanied by an 8:00 clock display, contradicting the six-in-the-morning sentence.',
  'A bus departure arrow and bus shelter are accompanied by an explicit 6:00 AM display and sun. All departure and morning-time cues appear together.')
]

def main():
    files={d['sub_lesson_id']:(p,d) for p in (ROOT/'backend/lessons').glob('unit_*/*.yaml') if (d:=read_lesson(p))}
    evidence='docs/qa/course-exact-diagram-reuse-v1.json';records=[];plans=[];changed=[]
    for number,slide,relation,old,new,answer,old_obs,new_obs in CASES:
        path,lesson=files[number];card=next(c for c in lesson['cards'] if c['slide_id']==slide)
        if (card.get('answer_audio_text') or card.get('audio_text'))!=answer:raise ValueError('Sentence drift.')
        source=ROOT/IMAGE_ROOTS[0]/new;sha=digest(source)
        for folder in IMAGE_ROOTS:
            target=ROOT/folder/new
            if target.exists() and digest(target)!=sha:raise ValueError('Different existing diagram copy.')
            if not target.exists():target.write_bytes(source.read_bytes())
        row={'lesson_id':lesson['id'],'slide_id':slide,'old_filename':old,'candidate_filename':new,'old_sha256':digest(ROOT/IMAGE_ROOTS[0]/old),
             'new_sha256':sha,'answer_text':answer,'relationship':relation,'old_observation':old_obs,'new_observation':new_obs,
             'pointer':f"/cards/{lesson['cards'].index(card)}/prompt_image_url",'crop_review':'inspected-full-use-prompt','human_approval':'pending'}
        records.append(row)
        plans.append({'lesson_id':lesson['id'],'old_filename':old,'new_filename':new,'old_sha256':row['old_sha256'],
                      'issue':'reviewed-exact-diagram-binding','issue_detail':old_obs,'evidence_file':evidence})
        changed.append((path,lesson,card,old,new))
    proof={'schema_version':1,'status':'agent-inspected-human-pending','assets':records}
    (ROOT/evidence).write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
    current={d['id']:d for _,d in files.values()}
    plan_path=ROOT/'docs/product/course-media-change-plans.json';document=json.loads(plan_path.read_text(encoding='utf-8'))
    for plan in plans:
        validate_exact_diagram_plan(plan,current,ROOT)
        prior=[p for p in document['changes'] if (p['lesson_id'],p['old_filename'])==(plan['lesson_id'],plan['old_filename'])]
        if prior and prior!=[plan]:raise ValueError('Different existing diagram correction.')
        if not prior:document['changes'].append(plan)
    for path,lesson,card,old,new in changed:
        card['prompt_image_url']=card['prompt_image_url'].replace(old,new)
        path.write_text(json.dumps(lesson,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    plan_path.write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Rebound three exact Use diagrams; unchanged sentences and original files.')

if __name__=='__main__':main()
