"""Explicit remaining full-sentence reuse candidates; separate inspection/install."""
import argparse
import json
from pathlib import Path
import sys
from PIL import Image,ImageOps,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons,digest
from scripts.install_course_photo_reuse import pointer_parent
from scripts.plan_course_photo_reuse import EXPLICIT
SAFE={54,61,65,80,81,106,127,134,135,158,211,212,235,257,315,322,347,356,362,388,405,447,449,485,549,550,587,602,616,636,648,658,675,725,780}
EXTRA={'a1_home.webp':[344],'a1_egg.webp':[553],
       'a1_scene_ana-study-english_a45ba91.webp':[707],
       'boy_is_swimming.webp':[676], 'family_parents_talking_3x2.webp':[677],
       'a1_bathroom.webp':[111,772], 'a1_photo_u6_book_on_table_v1.webp':[773],
       'a1_photo_u6_phone_in_bag_v1.webp':[774,775], 'a1_station.webp':[776]}

def main():
    p=argparse.ArgumentParser();p.add_argument('--install-reviewed',action='store_true')
    p.add_argument('--output',type=Path,default=ROOT/'output/qa/additional-photo-reuse');args=p.parse_args()
    old=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets'];current=lessons(ROOT)
    mapping={i:n for n,ids in EXPLICIT.items() for i in ids if i in SAFE}
    mapping.update({i:n for n,ids in EXTRA.items() for i in ids})
    rows=[]
    for index,new in sorted(mapping.items()):
        source=old[index-1];scopes=[]
        for s in source['authored_bindings']:
            lesson=current[s['lesson_id']]
            if int(lesson['sub_lesson_id'].split('.')[1])>=9:continue
            parent,key=pointer_parent(lesson,s['pointer'])
            if Path(parent[key].split('?',1)[0]).name==source['filename']:scopes.append(s)
        if scopes:rows.append({'index':index,'old_filename':source['filename'],'old_sha256':source['sha256'],'candidate_filename':new,'new_sha256':digest(ROOT/'Lessons/Lesson1/images'/new),'scopes':scopes})
    out=args.output;out.mkdir(parents=True,exist_ok=True)
    if not args.install_reviewed:
        font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16)
        for start in range(0,len(rows),6):
            batch=rows[start:start+6];sheet=Image.new('RGB',(1000,len(batch)*300),'#faf8f2');draw=ImageDraw.Draw(sheet)
            for j,r in enumerate(batch):
                with Image.open(ROOT/'Lessons/Lesson1/images'/r['candidate_filename']) as im:
                    sheet.paste(ImageOps.contain(im.convert('RGB'),(440,270)),(0,j*300))
                    sheet.paste(ImageOps.fit(im.convert('RGB'),(208,260)),(500,j*300))
                draw.text((0,j*300+274),f"{r['index']} {r['candidate_filename']}",font=font,fill='black')
            sheet.save(out/f'review-{start//6+1:02d}.jpg',quality=92)
        (out/'candidates.json').write_text(json.dumps(rows,indent=2)+'\n')
        print(len(rows),'candidates, no references changed');return
    reviews=json.loads((out/'manual-observations.json').read_text())
    proof_path=ROOT/'docs/qa/course-photo-reuse-v1.json';proof=json.loads(proof_path.read_text())
    for row in rows:
        review=reviews[str(row['index'])]
        if review['sha256']!=row['new_sha256'] or len(review['observation'])<35:raise ValueError('Uninspected candidate.')
        prior=next((r for r in proof['assets'] if r['old_filename']==row['old_filename'] and r['candidate_filename']==row['candidate_filename']),None)
        if prior:
            prior['scopes'].extend(s for s in row['scopes'] if s not in prior['scopes'])
        else:
            proof['assets'].append({**row,'exists':True,'disposition':'agent-reviewed','kind':'illustration-or-inset-retirement',
                'old_observation':'Legacy illustration or inset/composite scene inspected in the full style inventory; suitable full-frame photo already exists.',
                'new_observation':review['observation'],'crop_review':'inspected-3x2-and-centered-4x5','human_approval':'pending'})
    proof_path.write_text(json.dumps(proof,indent=2,ensure_ascii=False)+'\n')
    from scripts.install_course_photo_reuse import main as install
    sys.argv=['install_course_photo_reuse.py','--apply'];install()

if __name__=='__main__':main()
