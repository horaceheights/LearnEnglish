"""Explicitly revised rejected compositions plus inspected remaining literal scenes.

This is a new bounded operator-reviewed pack, never an automatic retry. Earlier
failed crop outputs and all original assets remain immutable evidence.
"""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons,digest
from scripts.install_course_photo_reuse import pointer_parent

REPAIRS={
 'u4-two-chairs-in-dining-room':'Exactly TWO complete wooden dining chairs in a small dining room, arranged one behind the other diagonally near a tiny round pedestal dining table. Photograph from far enough back that the complete chair backs, seats and legs and entire little table all occupy the central 40 percent of the landscape width. Large empty room margins. No additional chairs.',
 'u4-review-two-chairs-in-dining-room':'Exactly TWO complete white wooden dining chairs in a different dining room with green wall, one behind the other diagonally near a tiny round white pedestal dining table. Far-back view; complete two chair backs, seats, legs and table within central 40 percent width. No additional chairs. Distinct fresh review scene.',
 'u5-five-oranges':'Exactly FIVE whole oranges laid out vertically in a compact 2-1-2 formation, like five dots on a die, on a long narrow wooden serving board. Top-down photograph. All five complete fruits and gaps between them occupy the middle 40 percent of the landscape width. Vast empty countertop left and right, no other fruit.',
 'u5-review-five-oranges':'Exactly FIVE whole oranges arranged 1-2-2 down a narrow blue oval tray, seen directly from above on a different pale stone table. All five complete fruits separated by gaps inside middle 40 percent width. Vast empty table left and right. Fresh review photograph.',
 'u7-review-four-blue-chairs':'Exactly FOUR whole blue chairs arranged in two rows of two, very close together in a classroom. Camera FAR BACK: the entire group is at most 40 percent of image width, no chair larger than 16 percent width. All four backs, seats and legs visible, no occlusions, no other chairs. Large empty room background all around.',
 'u7-review-four-red-chairs':'Exactly FOUR whole red chairs arranged in two rows of two, very close together in a classroom. Camera FAR BACK: the entire group is at most 40 percent of image width, no chair larger than 16 percent width. All four backs, seats and legs visible, no occlusions, no other chairs. Large empty room background all around.',
 'u7-review-three-blue-chairs':'Exactly THREE whole blue chairs arranged in a compact narrow triangular cluster, one back and two front, in a classroom. Camera FAR BACK: entire group no wider than 40 percent of landscape frame. All three backs, seats and legs visible and separated, no other chairs. Large empty room margins.',
 'u6-pair-cannot-board-bus':'A man and woman stand shoulder-to-shoulder directly facing a locked closed bus door immediately behind them. A physical waist-high red-white maintenance barrier blocks that door, directly below their faces. Both frustrated adults, bus door and barrier occupy the central 40 percent of landscape width. Bus visible behind them, no third person, no writing, symbols or signs. Farther-back front view, never spread subjects across the frame.',
 'u7-dislikes-reading':'One woman sits at a table, a large complete open book centered immediately below her face. She frowns at the book, pushes it away with one hand and raises the other palm to reject it. Full book, face and hands all stacked vertically in the center 40 percent width. No television or headphones. Wider view with abundant background margins.',
 'u7-likes-tv':'One smiling woman enjoys watching a television showing a nature documentary. Compose the small television directly BEHIND AND JUST ABOVE her right shoulder, almost touching her head in the image, so her full face and the ENTIRE recognizable TV screen fit within central 40 percent width. She holds a remote immediately below her chin. Natural living room, camera far back, huge empty room margins. Her eyes look toward the television, not the camera.',
 'u7-rejects-tv':'One frowning woman refuses to watch a television. The entire small TV screen is directly BEHIND AND JUST ABOVE her right shoulder, nearly touching her head in the image; she turns away from it and holds up a rejecting palm. Face, palm and COMPLETE TV screen all fit central 40 percent width. Natural living room, far-back view, no books, no headphones.',
}
RECIPES={
 'book-next-to-phone':([142],'A real blue book lies immediately beside a black smartphone on the same wooden table, not touching or overlapping. Both complete objects centered very close together, elevated oblique view. No extra books or phones.'),
 'black-shoes':([700],'A pair of unmistakably BLACK real leather shoes with black laces on a pale wooden floor. Both complete shoes side by side, centered. Neutral daylight, not brown leather.'),
 'likes-and-needs':([386],'A thirsty smiling woman at a cafe table reaches for a clear glass of water with one hand and gives a thumbs-up toward a red apple on a small plate with the other. Face, both gestures, whole apple and water glass stacked compactly at center. No other food, icons or writing.'),
 'station':([776],'A real railway station seen from the platform, with a complete passenger train locomotive centrally behind a small station canopy and railway tracks in foreground. Building, platform and train all recognizable in the middle of frame. No words, letters, signs or captions. Distinct fresh review scene.'),
 'store':([777],'A real small grocery store entrance with crates of fruit and shelves of packaged food clearly visible immediately around the doorway. No signage, words, letters, branding or price tags. Full storefront composition centered. No bank or ATM.'),
 'study-monday':([672],'Preserve the exact woman Ana, her olive overshirt, white top, face and hairstyle from the reference photograph. Show her actively studying an open English workbook and writing with a pencil at a desk. A physical desk calendar immediately below her face and above the workbook clearly reads MONDAY. Face, hands, workbook and calendar compactly centered, same natural classroom. No infographic or floating text.'),
 'you-have-phone':([805],'Preserve Ana and Luis exactly from the reference: same faces, hair, olive overshirt and navy shirt. Reframe them standing very close shoulder-to-shoulder in the same fair. Luis holds up his phone directly below his face; Ana gestures toward that phone. Both faces, gesture and complete phone inside center 40 percent width, surrounded by ample fair background. Remove name badges and unnecessary printed words.'),
}

def main():
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets'];current=lessons(ROOT);assets=[]
    for kind,namespace in [('objects','v2'),('actions','v3')]:
        pack=json.loads((ROOT/f'docs/product/course-photo-sweep-{kind}-v1.json').read_text())
        reviews=json.loads((ROOT/f'output/imagegen/course-photo-sweep-{namespace}/agent-reviews.json').read_text())
        for old in pack['assets']:
            review=reviews.get(old['id'],{})
            if review.get('disposition')!='rejected':continue
            if old['id'] not in REPAIRS:raise ValueError('A rejected output needs an explicit revised composition.')
            a=copy.deepcopy(old);a['id']+='-reframed';a['runtime_filename']=a['runtime_filename'].replace('_v1.webp','_v2.webp')
            a['prompt']=REPAIRS[old['id']];a['expected_description']=a['prompt'];a['supersedes_rejected_output']={'path':f'output/imagegen/course-photo-sweep-{namespace}/{old["id"]}.png','sha256':review['sha256'],'reason':review['observed_description']};assets.append(a)
    for recipe,(indices,prompt) in RECIPES.items():
        groups={}
        for index in indices:
            old=inventory[index-1]
            for scope in old['authored_bindings']:
                lesson=current[scope['lesson_id']];parent,key=pointer_parent(lesson,scope['pointer'])
                if Path(parent[key]).name!=old['filename']:continue
                unit,number=map(int,lesson['sub_lesson_id'].split('.'))
                if number==10 or (recipe=='station' and number!=9):continue
                control=groups.setdefault((unit,number==9),{}).setdefault(old['filename'],{'inventory_index':index,'old_filename':old['filename'],'old_sha256':old['sha256'],'old_observation':'Directly inspected legacy drawing, inset or unsafe narrow image; replacement preserves the literal question, subject and answer context.','scopes':[]})
                control['scopes'].append(scope)
        for (unit,review),controls in sorted(groups.items()):
            aid=f'u{unit}'+('-review' if review else '')+'-'+recipe
            a={'id':aid,'runtime_filename':'a1_photo_'+aid.replace('-','_')+'_v1.webp','prompt':prompt,'expected_description':prompt,'change_control':{'kind':'inspected-legacy-photo-group','replacements':list(controls.values())}}
            if recipe in ('study-monday','you-have-phone'):
                name='a1_scene_ana-study-english_a45ba91.webp' if recipe=='study-monday' else 'a1_scene_you-have-phone_6017478.webp'
                path=ROOT/'Lessons/Lesson1/images'/name
                a['reference_file']={'path':path.relative_to(ROOT).as_posix(),'sha256':digest(path),'observed_description':'Inspected full photograph: Ana has long black hair and olive overshirt over white top; Luis in the phone scene has short curly black hair and navy shirt. Preserve the depicted person identities while improving scene composition.'}
            assets.append(a)
    shared='One exceptionally realistic natural photograph, authentic textures and anatomy, full bleed 1536x1024 landscape. No cartoon, inset, collage, padding, captions, icons or artificial blur borders. The portrait phone crops away the OUTER QUARTER ON EACH SIDE: keep every answer-critical person, gesture and object within the middle 40 percent of width with large natural background margins. Do not fill the frame with subjects. Back the camera away sufficiently. No writing except a real calendar explicitly requested. All counted items complete, distinct and visible.'
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v5','image_settings':{'model':'gpt-image-2.5-sunburst-2026-09-08','size':'1536x1024','quality':'high','output_format':'png','n':1},'production':{'initial_batch_ceiling_usd':'1.50','expected_cost_usd':f'{len(assets)*.045:.2f}','no_automatic_retries':True},'shared_prompt':shared,'assets':assets}
    path=ROOT/'docs/product/course-photo-sweep-final-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:raise ValueError('Pack is already frozen.')
    path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(len(assets),'assets',pack['production'])

if __name__=='__main__':main()
