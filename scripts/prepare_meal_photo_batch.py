"""Freeze literal food/meal scenes with visible time and food contrasts."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons
from scripts.install_course_photo_reuse import pointer_parent

MORNING='Morning breakfast table, soft early daylight through window and a real digital kitchen clock immediately below the plate clearly reading 7:00 AM.'
LUNCH='Lunchtime table, bright midday daylight through window and a real digital kitchen clock immediately below the plate clearly reading 1:00 PM.'
DINNER='Evening dinner table with dark night visible through window, warm indoor lighting and a real digital kitchen clock immediately below the plate clearly reading 7:00 PM.'
RECIPES={
 'eggs-breakfast':([162,264,374], 'One adult eating exactly two fried eggs on a small plate with a fork. Both eggs and face visible. '+MORNING),
 'eggs-dinner':([265], 'One adult eating exactly two fried eggs on a small plate with a fork. Both eggs and face visible. '+DINNER),
 'one-egg-breakfast':([552], 'One adult eating exactly ONE fried egg on a small plate. Exactly one complete white and one yellow yolk, no other food. '+MORNING),
 'two-eggs-breakfast':([743], 'One adult eating exactly TWO separate fried eggs on a small plate. Exactly two complete egg whites and two yellow yolks separated by a gap, no other food. '+MORNING),
 'three-eggs-breakfast':([719], 'One adult eating exactly THREE separate fried eggs on a small plate. Exactly three complete egg whites and three yolks with gaps, no other food. '+MORNING),
 'two-eggs-lunch':([744], 'One adult eating exactly TWO separate fried eggs on a small plate. Exactly two complete whites and two yolks with a gap, no other food. '+LUNCH),
 'tea-breakfast':([373,680,681], 'One adult drinking amber TEA from a clear glass mug, a tea bag and its string visibly steeping in the mug. Both face and tea cup large and central. '+MORNING),
 'tea-lunch':([683], 'One adult drinking amber TEA from a clear glass mug, a tea bag and its string visibly steeping in the mug. Both face and tea cup large and central. '+LUNCH),
 'tea-dinner':([682], 'One adult drinking amber TEA from a clear glass mug, a tea bag and its string visibly steeping in the mug. Both face and tea cup large and central. '+DINNER),
 'coffee-breakfast':([202,204], 'One adult drinking dark black COFFEE from a clear glass cup, with a small recognizable coffee pot immediately beside it. No tea bag. '+MORNING),
 'juice-dinner':([443], 'One adult drinking orange JUICE from a transparent glass, unmistakably bright orange juice, no milk or tea. '+DINNER),
 'chicken-lunch':([192], 'Exactly two adults sitting close together eating pieces from a whole roast CHICKEN on a shared platter beneath their faces. Clear roast chicken shape, no rice. '+LUNCH),
 'chicken-dinner':([237], 'Exactly two adults sitting close together eating pieces from a whole roast CHICKEN on a shared platter beneath their faces. Clear roast chicken shape, no rice. '+DINNER),
 'rice-lunch':([494,609,610,766], 'Exactly two adults sitting close together eating white RICE with spoons from two small rice bowls beneath their faces. White rice grains visible, no chicken. '+LUNCH),
 'rice-dinner':([608], 'Exactly two adults sitting close together eating white RICE with spoons from two small rice bowls beneath their faces. White rice grains visible, no chicken. '+DINNER),
 'request-coffee':([203], 'A customer at a small cafe counter politely reaching toward a freshly served cup of dark black COFFEE. A friendly server hand offers the cup. Customer face, requesting open hand and coffee cup all close together in center. Small real coffee pot behind cup, no tea bag.'),
 'request-tea':([684], 'A customer at a small cafe counter politely reaching toward a freshly served clear mug of amber TEA. A tea bag with string visible in the mug. Friendly server hand offers the mug. Customer face, open requesting hand and tea mug all close together in center.'),
 'request-water':([335], 'A cafe customer smiles and politely reaches for a clear glass of WATER offered by a friendly server. Both adults faces and serving hands close together above the transparent water glass. A clear water pitcher next to glass, no juice, coffee or food.'),
 'food':([291], 'Real food arranged compactly on a kitchen counter: a small bread loaf, one bowl of white rice, a small roast chicken and a whole cooked fish on separate small dishes. Elevated view, all recognizable food close together, no people or drinks.'),
 'fruit':([298], 'A real fruit bowl on a kitchen counter with recognizable red apple, green pear, yellow banana, orange, red strawberries and a small bunch of purple grapes. No people, packaged products or other food. Elevated view shows all kinds of fruit.'),
 'drinks':([259], 'A compact arrangement of real drinks on a cafe tray: clear glass of water, orange juice, white milk, clear mug of amber tea with tea bag, and dark coffee in a cup. Distinct transparent vessels, no people or food. Elevated view shows all drinks.'),
 'food-and-drinks':([289], 'A compact cafe lunch tray containing a bread roll, small bowl of white rice, an apple, a glass of orange juice and clear water glass. Real edible food and real drinks, no people, labels or icons. Elevated view.'),
 'rice':([610,636], 'One small ceramic bowl of cooked white rice on a new dark wooden kitchen table. White grains clearly visible, no people or other food. Fresh review composition, elevated oblique angle.'),
 'water':([763], 'One clear glass full of transparent water on a blue cafe table, no other food or drinks. Fresh review composition, oblique eye-level view, complete glass central.'),
 'hospital':([56], 'A real small community hospital entrance with a large clear physical HOSPITAL sign and blue medical cross directly above the central doors, an ambulance beside entrance. Fresh review scene, distinct architecture and oblique street viewpoint.'),
 'library':([467], 'A real neighborhood library entrance with a large physical LIBRARY sign directly above central open doors and clearly visible bookshelves inside. Fresh review scene, oblique street viewpoint.'),
 'store':([658], 'A real neighborhood grocery store entrance with produce and shelves visible, a large physical STORE sign directly above central doors. Fresh review scene, oblique street viewpoint. Not a library.'),
 'bedroom':([135], 'A real bright bedroom with one clearly visible single bed, pillow, bedside table and wardrobe. Fresh review room with blue wall, oblique view. Bed centered and unmistakable, no dining chairs or computer.'),
 'computer':([212], 'One real open laptop on a compact desk against a blue wall, screen and keyboard centered and fully visible. Fresh review angle, no other screens.'),
}

def main():
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets'];current=lessons(ROOT);groups={}
    for recipe,(indices,prompt) in RECIPES.items():
        for index in indices:
            old=inventory[index-1]
            for scope in old['authored_bindings']:
                lesson=current[scope['lesson_id']];parent,key=pointer_parent(lesson,scope['pointer'])
                if Path(parent[key].split('?',1)[0]).name!=old['filename']:continue
                unit,number=map(int,lesson['sub_lesson_id'].split('.'))
                if number==10:continue
                card=lesson['cards'][int(scope['pointer'].split('/')[2])] if scope['pointer'].startswith('/cards/') else {}
                if index in {56,135,212,467,636,658,763} and number!=9:continue
                if index==610:
                    if (number==9)!=(recipe=='rice'):continue
                actual=recipe
                if index==204 and card.get('answer_audio_text')=='Coffee, please. Thank you.':actual='request-coffee'
                key=(unit,number if number==9 else 0,actual)
                record=groups.setdefault(key,{}).setdefault(old['filename'],{'inventory_index':index,'old_filename':old['filename'],'old_sha256':old['sha256'],
                    'old_observation':'Directly inspected legacy drawing or inset/composite with symbolic food, room or place; replace with an unmistakable real full-frame scene preserving the complete task meaning.','scopes':[]})
                record['scopes'].append(scope)
    assets=[]
    for (unit,review,recipe),replacements in sorted(groups.items()):
        aid=f'u{unit}'+('-review' if review else '')+'-'+recipe
        assets.append({'id':aid,'runtime_filename':'a1_photo_'+aid.replace('-','_')+'_v1.webp',
            'prompt':RECIPES[recipe][1]+(' This is fresh review: different people, furniture and camera angle from the teaching scene.' if review else ''),
            'expected_description':RECIPES[recipe][1], 'change_control':{'kind':'inspected-legacy-photo-group','replacements':list(replacements.values())}})
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v4',
        'image_settings':{'model':'gpt-image-2.5-sunburst-2026-09-08','size':'1536x1024','quality':'high','output_format':'png','n':1},
        'production':{'initial_batch_ceiling_usd':'2.00','expected_cost_usd':f'{len(assets)*.044:.2f}','no_automatic_retries':True},
        'shared_prompt':'Use case: photorealistic-natural. One exceptionally lifelike photograph for a beginner English course. Real skin texture, natural anatomy, authentic food, natural lighting, real setting. No cartoon, illustration, vector, CGI, inset, collage, border, floating icons, arrows or caption. Landscape 3:2 full bleed. Very important: the phone also shows a centered narrow 4:5 crop. Arrange ALL required faces, hands, food items and any required real clock vertically and compactly in the middle HALF of the landscape width. Leave abundant expendable scene background on both left and right. Faces above food; clock immediately below or above food, never far off to a side. Use a slightly elevated viewpoint for food counts and a clear sufficiently large clock display where requested. All answer-critical elements must remain immediately recognizable on a phone. Never invent extra people or duplicate counted foods. Physical clock or storefront text is allowed only when explicitly requested; otherwise no text.',
        'assets':assets}
    path=ROOT/'docs/product/course-photo-sweep-meals-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:raise ValueError('Production pack is frozen.')
    path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'assets':len(assets),'expected_usd':pack['production']['expected_cost_usd'],'ceiling_usd':'2.00'}))

if __name__=='__main__':main()
