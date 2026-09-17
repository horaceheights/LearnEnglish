"""Prepare inspected object/count/spatial repairs, with separate fresh review scenes."""
from __future__ import annotations
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons
from scripts.install_course_photo_reuse import pointer_parent

# Each recipe is literal and has been matched to the old scene's complete card
# contract. No paid request is issued by this planner.
RECIPES={
 'three-apples':([107,716], 'Exactly THREE separate whole red apples on a clean kitchen counter, in a compact triangle with visible gaps. No other fruit.'),
 'two-apples':([740], 'Exactly TWO separate whole red apples side by side with a clear gap on a clean kitchen counter. No other fruit.'),
 'two-red-apples':([748], 'Exactly TWO red apples side by side on a small wooden board. Clearly RED skins, a gap between them, no other fruit.'),
 'three-red-apples':([722], 'Exactly THREE red apples in a shallow triangle on a small white plate. Clearly RED skins, gaps between each fruit, no other fruit.'),
 'four-red-apples':([297], 'Exactly FOUR red apples arranged in two clear rows of two on a small wooden board. All four complete and separate, no other fruit.'),
 'two-green-apples':([746], 'Exactly TWO bright green apples side by side on a small plate. Clear gap between the complete apples, no red apples or other fruit.'),
 'green-apple':([316], 'One single whole GREEN apple on a neutral tabletop, clearly green skin, no red or yellow fruit.'),
 'two-oranges':([747], 'Exactly TWO whole oranges side by side with a gap on a kitchen counter. No other fruit.'),
 'three-oranges':([721], 'Exactly THREE whole oranges in a triangle with clear gaps on a kitchen counter. No other fruit.'),
 'four-oranges':([293,294], 'Exactly FOUR whole oranges, arranged as two rows of two with clear gaps on a kitchen counter. No other fruit.'),
 'five-oranges':([285,286], 'Exactly FIVE whole oranges, arranged as two at the back and three at the front with clear gaps on a kitchen counter. No other fruit.'),
 'two-strawberries':([749], 'Exactly TWO whole ripe red strawberries side by side on a small white plate. Separate complete fruit, no other berries.'),
 'three-strawberries':([724], 'Exactly THREE whole ripe red strawberries in a shallow triangle on a small white plate, separate complete fruit, no other berries.'),
 'four-strawberries':([296], 'Exactly FOUR whole ripe red strawberries in two rows of two on a small white plate, all separate, no other berries.'),
 'five-strawberries':([287], 'Exactly FIVE whole ripe red strawberries in two rows: two behind three, on a small white plate, all separate, no other berries.'),
 'two-eggs':([266,745], 'Exactly TWO whole unbroken white chicken eggs side by side with a clear gap on a small plate. Both eggs fully visible, no carton or other food.'),
 'three-eggs':([720], 'Exactly THREE whole unbroken white chicken eggs in a shallow triangle with visible gaps on a small plate. All fully visible, no carton or other food.'),
 'black-jacket':([136], 'One plain BLACK casual zip-up jacket hanging against a softly lit neutral wall. Complete collar, zipper and sleeves visible; realistic fabric, no person, no logo.'),
 'blue-jacket':([139], 'One plain vivid BLUE casual zip-up jacket hanging against a softly lit neutral wall. Complete collar, zipper and sleeves visible; realistic fabric, no person, no logo.'),
 'green-jacket':([317], 'One plain GREEN casual zip-up jacket hanging against a softly lit neutral wall. Complete collar, zipper and sleeves visible; realistic fabric, no person, no logo.'),
 'red-jacket':([605], 'One plain RED casual zip-up jacket hanging against a softly lit neutral wall. Complete collar, zipper and sleeves visible; realistic fabric, no person, no logo.'),
 'red-shirt':([625,699], 'One plain RED short-sleeved shirt displayed on a wooden hanger against a neutral wall. Complete shirt with collar and both sleeves visible. Unmistakably red, not white, no jacket, logo or person.'),
 'white-socks':([631], 'One PAIR of clean WHITE cotton socks, laid side by side with a small gap on a neutral beige surface. Exactly two socks, both complete from toes to cuffs. White, not grey or black.'),
 'book-in-bag':([140], 'One blue hardback book visibly INSIDE an open canvas school bag on a small table. The lower two thirds of the book is enclosed by the bag, the top of the book remains visible through the opening. The bag walls clearly surround the book. No other books.'),
 'book-in-table-compartment':([141], 'One blue book visibly INSIDE the open built-in drawer of a small wooden table. The drawer is pulled open enough to see the book enclosed by its bottom and sides. Tabletop above the book, no book on top or on the floor. Use a slightly elevated close viewpoint so being INSIDE is unmistakable.'),
 'book-next-to-table':([143], 'One blue book standing upright on the floor immediately BESIDE a small wooden side table, clearly outside its legs and not under the tabletop. Show all table legs and the complete book side by side in the center. No other books.'),
 'book-on-table':([144,145,548,423], 'One blue hardback book resting flat ON TOP of a small wooden side table. Clear tabletop support beneath the book, empty space under the table. Show the whole book, the tabletop and table legs. No other books.'),
 'book-under-table':([146,147,434], 'One blue hardback book lying on the floor directly UNDER a small wooden side table, centered between its visible legs. The tabletop above is empty. Show the full table and the book, with clear air between the book and tabletop.'),
 'lamp-next-to-sofa':([448,554], 'One floor lamp standing immediately NEXT TO a compact two-seat sofa in a real living room. Clearly one lamp and one sofa, neither overlaps or hides the other. Frame them as a compact pair in the center. No other lamps.'),
 'computer-in-living-room':([551], 'A single open laptop computer on the central coffee table of a real living room, with a sofa clearly visible behind it. Exactly one computer, no additional screens. The complete computer and living room context must remain clear in the centered crop.'),
 'phone-in-bag':([588,414], 'One smartphone visibly INSIDE an open canvas shoulder bag on a small table. Most of the phone is enclosed within the bag and its top and screen remain visible through the opening. The bag surrounds the phone. No other phones or bags.'),
 'phone-on-bag':([589], 'One smartphone resting ON TOP of a closed canvas shoulder bag on a small table. The complete phone lies flat on the bag exterior, not inside any opening. Show the closed bag clearly beneath it. No other phones.'),
 'phone-on-bed':([590], 'One smartphone lying ON a neatly made bed. Show the full phone prominently on the bedspread with a pillow and headboard visibly establishing the bed. No other phones or objects on the bed.'),
 'apple-under-chair':([433], 'One red apple lying on the floor directly UNDER a simple wooden chair, between its legs. The chair seat is empty. Show the complete apple and the chair seat and legs, with clear air above the apple.'),
 'three-books-on-table':([718], 'Exactly THREE distinct books on top of one small table, each fully visible and separate, arranged compactly with gaps, not stacked. Floor under table is empty. No other books.'),
 'two-bags-under-table':([741], 'Exactly TWO canvas school bags resting on the floor directly UNDER a small wooden table, between its visible legs. Two bags side by side with a clear gap. Empty tabletop. Both bags and their location under the table must remain visible in the central crop.'),
 'two-chairs-in-dining-room':([742], 'Exactly TWO complete dining chairs beside a small dining table in a real dining room. One chair either side, compact arrangement so both full chairs and table remain in the central portrait crop. No extra chairs, reflections or partly hidden seats.'),
 'three-blue-chairs':([717], 'Exactly THREE BLUE chairs standing separately on the floor of a community room in a shallow triangle. All seats, backs and their separate outlines visible with gaps. No extra furniture that resembles a chair.'),
 'four-blue-chairs':([292], 'Exactly FOUR BLUE chairs standing separately on the floor of a community room in two staggered rows of two. All four backs and seats visible without occlusion. Clear gaps, no extra chairs.'),
 'four-red-chairs':([295], 'Exactly FOUR RED chairs standing separately on the floor of a community room in two staggered rows of two. All four backs and seats visible without occlusion. Clear gaps, no extra chairs.'),
 'three-red-books':([723], 'Exactly THREE books with plain RED covers lying separately on a small light wooden table in a shallow triangle. All three books fully visible with gaps, not stacked, no other books and no readable text.')
}
OVERRIDES={
 'There are two bags under the table.':'two-bags-under-table',
 'The book is on the table.':'book-on-table',
 'There are three books on the table.':'three-books-on-table',
}

def main():
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets']
    current=lessons(ROOT);groups={}
    for recipe,(indices,prompt) in RECIPES.items():
        for index in indices:
            old=inventory[index-1]
            for scope in old['authored_bindings']:
                lesson=current[scope['lesson_id']];parent,key=pointer_parent(lesson,scope['pointer'])
                if Path(parent[key].split('?',1)[0]).name!=old['filename']:continue
                unit,number=map(int,lesson['sub_lesson_id'].split('.'))
                if number==10:continue
                actual_recipe=recipe
                if scope['pointer'].startswith('/cards/'):
                    card=lesson['cards'][int(scope['pointer'].split('/')[2])]
                    if card['stage']=='Use':
                        actual_recipe=OVERRIDES.get(card.get('answer_audio_text'),recipe)
                group_key=(unit,number if number==9 else 0,actual_recipe)
                group=groups.setdefault(group_key,{})
                record=group.setdefault(old['filename'],{'old_filename':old['filename'],'old_sha256':old['sha256'],
                    'old_observation':'Legacy drawn object/count/spatial scene or obsolete inset remains active; replace it with a literal photograph preserving every exact count, color and relation.',
                    'scopes':[],'inventory_index':index})
                record['scopes'].append(scope)
    assets=[]
    for (unit,review,recipe),replacements in sorted(groups.items()):
        aid=f'u{unit}'+('-review' if review else '')+'-'+recipe
        assets.append({'id':aid,'runtime_filename':'a1_photo_'+aid.replace('-','_')+'_v1.webp',
            'prompt':RECIPES[recipe][1]+(' This is a fresh review photograph: use a distinct setting and an elevated oblique camera angle, never copy another course image.' if review else ''),
            'expected_description':RECIPES[recipe][1],
            'change_control':{'kind':'inspected-legacy-photo-group','replacements':list(replacements.values())}})
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v2',
        'image_settings':{'model':'gpt-image-2.5-sunburst-2026-09-08','size':'1536x1024','quality':'high','output_format':'png','n':1},
        'production':{'initial_batch_ceiling_usd':'3.00','expected_cost_usd':f'{len(assets)*.043:.2f}','no_automatic_retries':True},
        'shared_prompt':'Use case: photorealistic-natural. One exceptionally lifelike photograph for beginner English learning. Real materials, natural light, authentic texture, sharp subject, no illustration, no cartoon, no vector art, no CGI, no icons, arrows, labels, numeral overlays or watermark. Full-bleed landscape 3:2, no border or inset. The app also displays a centered 4:5 crop: keep ALL answer-critical objects and their entire count/color/spatial relationship inside the central 50 percent of the landscape width, with spare room at both sides. Use a compact arrangement and enough depth of field for every target to be unmistakable on a phone. Exact count and physical relationship are mandatory. Do not add decorative copies, mirrors or background duplicates of a counted object.',
        'assets':assets}
    path=ROOT/'docs/product/course-photo-sweep-objects-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:raise ValueError('Production pack is frozen.')
    path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'assets':len(assets),'estimate_usd':pack['production']['expected_cost_usd'],'ceiling_usd':'3.00'}))

if __name__=='__main__':main()
