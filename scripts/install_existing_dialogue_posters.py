"""Remove cartoon placeholder posters while retaining their own real dialogue."""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS,digest,read_lesson,validate_dialogue_poster_plan

def main():
    files={d['sub_lesson_id']:(p,d) for p in (ROOT/'backend/lessons').glob('unit_*/*.yaml') if (d:=read_lesson(p))}
    cases=[('6.7','a1_scene_it-is-on-the-left-thank-you_fc1f140.webp','a1_scene_town-male-left-answer_a00c3ac.webp',['L6','S6'],
            'A cartoon two-panel scene represents pointing left and gratitude, but the same card already contains its real, continuous traveler/helper dialogue frames.',
            'The established female traveler and male helper look at her map while he points; the existing second turn shows her thanking him. Retain both exact dialogue frames, people, voices and sequence. The single full 3:2 model poster now matches the first turn instead of flashing a cartoon.'),
           ('6.9','a1_scene_can-you-help-me-the-bus-leaves-at-eight_b2daa8d.webp','a1_scene_bus-female-help-question_571febf.webp',['L4'],
            'Two stick figures and a bus-time icon form the old poster even though the card already has two full photographic dialogue frames with the same people.',
            'A woman holding a paper map asks a male helper beside a bus shelter with a visible 8:00 timetable. The existing second frame shows him answering and pointing to that same time. Both complete 3:2 dialogue frames have been inspected; neither is used in an earlier lesson.')]
    evidence='docs/qa/course-dialogue-poster-reuse-v1.json';records=[];plans=[];edits=[]
    for number,old,new,slides,oldobs,newobs in cases:
        path,lesson=files[number]
        cards=[c for c in lesson['cards'] if c['slide_id'] in slides]
        if len(cards)!=len(slides):raise ValueError('Dialogue slide IDs changed.')
        record={'lesson_id':lesson['id'],'old_filename':old,'candidate_filename':new,'old_sha256':digest(ROOT/IMAGE_ROOTS[0]/old),'new_sha256':digest(ROOT/IMAGE_ROOTS[0]/new),
                'old_observation':oldobs,'new_observation':newobs,'crop_review':'inspected-complete-3x2-dialogue','human_approval':'pending',
                'cards':[{'slide_id':c['slide_id'],'audio_text':c['audio_text'],'audio_turns':copy.deepcopy(c['audio_turns'])} for c in cards]}
        records.append(record);edits.append((path,lesson,cards,old,new))
        plans.append({'lesson_id':lesson['id'],'old_filename':old,'new_filename':new,'old_sha256':record['old_sha256'],
                      'issue':'reviewed-existing-dialogue-poster','issue_detail':oldobs,'evidence_file':evidence})
    (ROOT/evidence).write_text(json.dumps({'schema_version':1,'assets':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    current={d['id']:d for _,d in files.values()}
    for plan in plans:validate_dialogue_poster_plan(plan,current,ROOT)
    plan_path=ROOT/'docs/product/course-media-change-plans.json';document=json.loads(plan_path.read_text(encoding='utf-8'))
    for plan in plans:
        previous=[p for p in document['changes'] if (p['lesson_id'],p['old_filename'])==(plan['lesson_id'],plan['old_filename'])]
        if previous and previous!=[plan]:raise ValueError('Conflicting poster plan.')
        if not previous:document['changes'].append(plan)
    for path,lesson,cards,old,new in edits:
        for card in cards:card['options'][0]['image_url']=card['options'][0]['image_url'].replace(old,new)
        path.write_text(json.dumps(lesson,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    plan_path.write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Three cartoon placeholder posters now use their own established dialogue photos; no audio turns, cast or text changed.')
if __name__=='__main__':main()
