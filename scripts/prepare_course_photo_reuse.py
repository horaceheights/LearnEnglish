"""Freeze inspected reuse proposals and render real 4:5 crops; never edit lessons."""
from __future__ import annotations
import hashlib
import argparse
import json
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.plan_course_photo_reuse import EXPLICIT
from scripts.audit_course_photo_style import authored_refs
from scripts.audit_course_media_preservation import lessons

# Only actual viewed photographic candidates, not all same-stem alternatives.
PHOTO_VARIANTS = {88,91,93,98,214,234,244,261,276,325,381,487,547,555,596,599,623,634,687}
# These need a different crop/scene or semantic repair; keep out of this reuse batch.
EXCLUDE = {314,583,625,631}
OBSERVATIONS = {
    88: 'A woman entering her home through its open doorway with her bag.',
    91: 'A woman arriving outside a school carrying her study materials.',
    93: 'A woman identifying herself with a Mexican flag at a social introduction.',
    98: 'A woman waking in bed in a daylight bedroom.',
    214: 'An adult cook in chef clothing preparing food in a working kitchen; the option tests profession, not Sofia or gender.',
    234: 'An adult man holding a Spanish flag card and indicating himself.',
    244: 'A male doctor using a stethoscope to examine a patient.',
    250: 'An older woman expressing dislike and pushing away a plate of fish.',
    253: 'An older man rejecting a bowl of rice with a clear negative expression.',
    261: 'A male bus driver seated at the steering wheel of a bus.',
    276: 'An older female farmer harvesting peppers among crop plants.',
    325: 'A man with his car and its keys, visibly indicating possession.',
    348: 'A sweating man drinking water outdoors beneath cloudy skies.',
    381: 'A woman pointing to herself while holding her book.',
    487: 'A man indicating himself and holding a United States flag.',
    547: 'A female nurse in a healthcare setting treating a patient.',
    555: 'One person boarding an open city bus.',
    596: 'A man putting on waterproof boots at a doorway beside wet weather outside.',
    599: 'A woman opening an umbrella at a doorway overlooking a rainy street.',
    623: 'A woman holding her bicycle beside a companion.',
    634: 'A woman indicating herself and holding a Canadian flag.',
    687: 'A female teacher standing before students with teaching pictures and a book.'
}

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--freeze-reviewed',action='store_true')
    args=parser.parse_args()
    inventory = json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets']
    candidates = json.loads((ROOT/'output/qa/course-photo-reuse/candidates.json').read_text())
    explicit_ids = {i for ids in EXPLICIT.values() for i in ids} - EXCLUDE
    accepted = explicit_ids | PHOTO_VARIANTS
    current = lessons(ROOT)
    records=[]
    for candidate in candidates:
        i=candidate['index']
        if i not in accepted:
            continue
        old=inventory[i-1]
        target=candidate['candidate_filename']
        target_path=ROOT/'Lessons/Lesson1/images'/target
        scopes=[]
        for binding in old['authored_bindings']:
            # No old-image reuse in a review or a mission; those require fresh scenes.
            if int(binding['lesson'].split('.')[1]) >= 9:
                continue
            pointer=binding['pointer']
            if pointer.startswith('/cards/'):
                card=current[binding['lesson_id']]['cards'][int(pointer.split('/')[2])]
                # Do not trade a full human-action/sentence cue for a generic object.
                if card.get('stage')=='Use' and i not in range(14,23):
                    continue
                if i in {360,482,714,760,789} and len(card.get('options',[]))==4:
                    # Inspected crops lose the water glass or the TV viewer's face.
                    continue
            scopes.append(binding)
        if not scopes:
            continue
        records.append({**candidate, 'new_sha256':hashlib.sha256(target_path.read_bytes()).hexdigest(),
            'kind':'user-selected-opening-cast' if i in range(14,23) else 'illustration-or-inset-retirement',
            'old_observation': ('Older alternate photographic cast, explicitly superseded by the user-selected opening portraits.'
                if i in range(14,23) else 'Legacy illustrated or inset/composite version observed in the full course contact-sheet inspection.'),
            'new_observation': OBSERVATIONS.get(i, 'Existing full-frame photograph of '+target.removesuffix('.webp').replace('a1_', '').replace('_',' ')+', visually inspected in the reuse contact sheet.'),
            'scopes':scopes, 'crop_review':'inspected-3x2-and-centered-4x5' if args.freeze_reviewed else 'pending',
            'human_approval':'pending'})
    out=ROOT/'output/qa/course-photo-reuse'
    write(out/'selected.json', records)
    if args.freeze_reviewed:
        write(ROOT/'docs/qa/course-photo-reuse-v1.json', {
            'schema_version':1, 'authorization':'2026-09-17 user requested retirement of remaining legacy illustrations/insets and reuse of the newer opening cast; preserve original bytes and healthy existing photographs.',
            'inventory_sha256':hashlib.sha256((ROOT/'output/qa/course-photo-style/inventory.json').read_bytes()).hexdigest(),
            'human_approval':'pending', 'assets':records})
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',15)
    for start in range(0,len(records),16):
        sheet=Image.new('RGB',(1280,4*415),'#faf8f2'); draw=ImageDraw.Draw(sheet)
        for j,r in enumerate(records[start:start+16]):
            x,y=j%4*320,j//4*415
            with Image.open(ROOT/'Lessons/Lesson1/images'/r['candidate_filename']) as im:
                sheet.paste(ImageOps.fit(im.convert('RGB'),(240,300),centering=(.5,.5)),(x+40,y))
            draw.text((x+5,y+305),f"{r['index']} {r['candidate_filename'][:36]}",font=font,fill='black')
            import textwrap
            for n,line in enumerate(textwrap.wrap(r['new_observation'],39)[:4]):
                draw.text((x+5,y+327+n*18),line,font=font,fill='black')
        sheet.save(out/f'crop-{start//16+1:02d}.jpg',quality=94)
    print(f'{len(records)} selected existing images; no course changes or generation.')

if __name__=='__main__':
    main()
