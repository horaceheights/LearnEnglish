"""Link the already-created six-o'clock photograph to its exact voice gate."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS,digest,read_lesson,validate_mission_still_plan
from scripts.install_course_photo_reuse import pointer_parent

def main():
    path=ROOT/'backend/lessons/unit_4/lesson-4-10-my-day-mission.yaml';lesson=read_lesson(path)
    old='a1_u4_scene_04_clock_check.webp';new='a1_u4_mission_clock_six_v3.webp'
    source=ROOT/IMAGE_ROOTS[0]/new
    # Pixel observations supplied after directly viewing both full-size sources.
    record={'lesson_id':lesson['id'],'slide_id':'M04','old_filename':old,'candidate_filename':new,
        'old_sha256':digest(ROOT/IMAGE_ROOTS[0]/old),'new_sha256':digest(source),
        'answer_text':"It is six o'clock.",
        'old_observation':'The padded photograph has Roman clock numerals and hands around ten past ten, contradicting the required six-o-clock answer.',
        'new_observation':'The existing full-frame photograph preserves the blue-shirt man checking his watch and clearly shows minute hand at twelve and hour hand at six. The entire 3:2 scene is visible in the mission voice gate.',
        'crop_review':'inspected-complete-3x2-voice-scene','human_approval':'pending',
        'scopes':[{'pointer':'/cards/3/options/0/image_url'},{'pointer':'/cards/3/audio_turns/0/image_url'}]}
    for folder in IMAGE_ROOTS:
        target=ROOT/folder/new
        if target.exists() and digest(target)!=record['new_sha256']:raise ValueError('Existing clock pixels differ.')
        if not target.exists():target.write_bytes(source.read_bytes())
    evidence='docs/qa/course-mission-still-reuse-v1.json'
    proof={'schema_version':1,'status':'agent-inspected-human-pending','assets':[record]}
    (ROOT/evidence).write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
    plan={'lesson_id':lesson['id'],'old_filename':old,'new_filename':new,'old_sha256':record['old_sha256'],
        'issue':'reviewed-mission-still-binding','issue_detail':record['old_observation'], 'evidence_file':evidence}
    validate_mission_still_plan(plan,{lesson['id']:lesson},ROOT)
    for scope in record['scopes']:
        parent,key=pointer_parent(lesson,scope['pointer'])
        parent[key]=parent[key].replace(old,new)
    plans_path=ROOT/'docs/product/course-media-change-plans.json';plans=json.loads(plans_path.read_text(encoding='utf-8'))
    existing=[p for p in plans['changes'] if p['lesson_id']==lesson['id'] and p['old_filename']==old]
    if existing and existing!=[plan]:raise ValueError('An existing mission exception differs.')
    if not existing:plans['changes'].append(plan)
    path.write_text(json.dumps(lesson,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    plans_path.write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    registry_path=ROOT/'docs/product/a1-reviewed-photoreal-media.json';registry=json.loads(registry_path.read_text(encoding='utf-8'))
    registry['files']=sorted(set(registry['files'])|{new});registry_path.write_text(json.dumps(registry,indent=2)+'\n',encoding='utf-8')
    print('Repointed two exact mission voice-gate fields to the existing six-o-clock photo. No new generation.')

if __name__=='__main__':main()
