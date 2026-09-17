"""Record explicit inspected cover replacements and render actual menu crops."""
import json
from pathlib import Path
import sys
from PIL import Image,ImageOps,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import digest,IMAGE_ROOTS
REPLACEMENTS=[
 ('lesson-1-people-actions','a1_l1_people_together.webp','man.webp','The user-selected opening man portrait replaces the obsolete alternate-cast cover.'),
 ('lesson-3-two-people','a1_title_1_3_two_people.webp','they_boy_girl.webp','Two children standing together on a park path, a full natural scene instead of a padded inset.'),
 ('lesson-4-children-siblings','a1_title_1_4_children_siblings.webp','family_children_3x2.webp','Boy and girl standing together in a garden, full-frame photograph of the established younger children.'),
 ('lesson-5-parents-grandparents','a1_title_1_5_parents_grandparents.webp','family_grandparents_3x2.webp','Elderly grandmother and grandfather together on their sofa, full photographic living-room scene.'),
 ('lesson-6-family-actions','a1_title_1_6_family_actions.webp','family_children_playing_3x2.webp','Two children visibly building with colorful blocks together in a living room.'),
 ('lesson-7-is-are-not','a1_title_1_7_is_are_not.webp','family_parents_talking_3x2.webp','Parents talking face to face across a kitchen table, full natural scene rather than blurred inset.'),
 ('lesson-8-who','a1_title_1_8_who.webp','a1_who_answer_parents.webp','Established parent answer portrait, both smiling faces beside one another on a patio.'),
 ('lesson-10-family-mission','a1_u1_album_01_locked.webp','a1_u1_reunion_01_people_path.webp','The actual celebration mission opening, with boy, man, woman and girl preparing the courtyard; no album.'),
 ('lesson-2-2-streets-and-transportation','a1_scene_street_d3a9fb0.webp','place_street_3x2.webp','Real tree-lined street with crossing, shops, cars and pedestrians, replacing the vector street.'),
 ('unit-1','a1_title_unit_1.webp','family_all_members_3x2.webp','Three generations together in a full-frame living-room family portrait, no baked-in blurred padding.')
]

def main():
    rows=[];font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16)
    sheet=Image.new('RGB',(1000,len(REPLACEMENTS)*210),'#faf8f2');draw=ImageDraw.Draw(sheet)
    for j,(scope,old,new,observed) in enumerate(REPLACEMENTS):
        source=ROOT/IMAGE_ROOTS[0]/new;sha=digest(source)
        for folder in IMAGE_ROOTS[1:]:
            target=ROOT/folder/new
            if not target.exists():target.write_bytes(source.read_bytes())
            if digest(target)!=sha:raise ValueError('Cover copy differs.')
        rows.append({'scope':scope,'old_filename':old,'old_sha256':digest(ROOT/IMAGE_ROOTS[0]/old),
            'candidate_filename':new,'new_sha256':sha,'observation':observed,'human_approval':'pending'})
        with Image.open(source) as im:
            if im.size!=(1536,1024):raise ValueError('Cover must retain 3:2 course canvas.')
            sheet.paste(ImageOps.contain(im.convert('RGB'),(275,184)),(0,j*210))
            for x,ratio in [(300,(68,62)),(510,(94,88)),(720,(122,102))]:
                size=(170,round(170*ratio[1]/ratio[0]));sheet.paste(ImageOps.fit(im.convert('RGB'),size),(x,j*210))
        draw.text((0,j*210+188),scope+' | full, row 68:62, continue 94:88, unit 122:102',font=font,fill='black')
    out=ROOT/'output/qa/photo-browser';out.mkdir(parents=True,exist_ok=True);sheet.save(out/'covers.jpg',quality=94)
    path=ROOT/'docs/qa/course-photo-browser-reuse-v1.json'
    path.write_text(json.dumps({'schema_version':1,'status':'agent-source-inspected-crops-pending','assets':rows},ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
