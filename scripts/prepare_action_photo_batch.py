"""Freeze exact inspected human/action repairs; fresh scenes for each review."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons
from scripts.install_course_photo_reuse import pointer_parent

# These refer to directly inspected legacy pixels, not provider guesses.
RECIPES={
 'boy-eating-bread':([150], 'A school-age boy at a kitchen table visibly biting a slice of bread held at his mouth. Only bread on his small plate. No rice.'),
 'boy-eating-rice':([151], 'A school-age boy at a kitchen table visibly eating white rice with a spoon from a bowl. Rice grains clearly visible on spoon and in bowl, no bread.'),
 'girl-eating-fish':([281], 'A school-age girl at a kitchen table eating cooked fish with a fork. A small whole cooked fish with its head and tail is clearly visible on the plate, with one bite lifted on her fork. No chicken.'),
 'man-drinking-juice':([446], 'An adult man visibly drinking orange juice from a clear glass held at his mouth. Bright orange liquid clearly visible in the glass; no milk or water.'),
 'woman-drinking-juice':([781], 'An adult woman visibly drinking orange juice from a clear glass held at her mouth. Bright orange liquid clearly visible; no milk or water.'),
 'woman-drinking-milk':([782], 'An adult woman visibly drinking white milk from a clear glass held at her lips. The opaque white milk is obvious; no orange juice or water.'),
 'woman-drinking-water':([783], 'An adult woman visibly drinking clear water from a clear glass held at her lips. Transparent colorless water; no milk or juice.'),
 'woman-eating-apple':([784], 'An adult woman holding one red apple at her mouth and visibly biting it. A real bite is missing from the apple. No drink.'),
 'boy-wants-apple':([153], 'A school-age boy at a produce counter eagerly pointing at one whole red apple on a small plate immediately in front of him. His empty free hand is open toward the apple. Not eating yet, no other food.'),
 'girl-wants-apple':([301], 'A school-age girl at a produce counter eagerly pointing at one whole red apple on a small plate immediately in front of her. Not eating yet, no other food.'),
 'boy-wants-chicken':([154], 'One school-age boy seated at a restaurant counter eagerly pointing to a whole roast chicken on a platter immediately in front of him. No other people, fish or food.'),
 'man-wants-bread':([328], 'An adult man at a bakery counter eagerly pointing to a loaf of bread immediately in front of him and holding his empty hand open toward it. Not eating yet, no other food.'),
 'man-wants-two-red-apples':([496], 'An adult man at a produce counter pointing to exactly TWO whole RED apples on one small white plate in front of him. Both apples complete, separate with a gap. No other apples or people.'),
 'woman-wants-three-red-apples':([791], 'An adult woman at a produce counter pointing to exactly THREE whole RED apples in a compact triangle on one small white plate in front of her. Clear gaps, all three complete; no other fruit.'),
 'woman-wants-two-green-apples':([792], 'An adult woman at a produce counter pointing to exactly TWO whole GREEN apples side by side on one small white plate in front of her. Clear gap, both complete; no red apples or other fruit.'),
 'woman-wants-two-red-apples':([793,794], 'An adult woman at a produce counter pointing to exactly TWO whole RED apples side by side on one small white plate in front of her. Clear gap, both complete; no green apples or other fruit.'),
 'pair-wants-chicken':([577], 'Exactly TWO adult diners seated shoulder to shoulder at a small restaurant table, BOTH eagerly pointing to the same whole roast chicken on a single platter immediately below their faces. Both faces and chicken fully visible in a compact vertical arrangement. No fish or extra people.'),
 'pair-wants-fish':([578], 'Exactly TWO adult diners seated shoulder to shoulder at a small restaurant table, BOTH eagerly pointing to the same whole cooked fish on a single platter immediately below their faces. Fish head and tail visible, both faces visible. No chicken or extra people.'),
 'pair-needs-water':([575], 'Exactly TWO thirsty adults after a hike, seated close together and both eagerly reaching toward one clear pitcher of water and two clear water glasses centered immediately below their faces. They look hot and thirsty. No food, no extra people.'),
 'boy-wants-two-eggs':([155], 'Exactly ONE school-age boy at a kitchen counter pointing to exactly TWO whole white eggs on one small plate directly below his face. Two eggs complete and separate with a gap. No other people or food.'),
 'pair-wants-two-eggs':([581], 'Exactly TWO adults close together at a kitchen counter BOTH pointing to exactly TWO whole white eggs on one small plate below their faces. Both faces and both separate eggs fully visible. No other people or food.'),
 'pair-wants-three-eggs':([579], 'Exactly TWO adults close together at a kitchen counter BOTH pointing to exactly THREE whole white eggs on one small plate below their faces. Both faces and all three separate eggs fully visible. No other people or food.'),
 'pair-wants-two-apples':([580], 'Exactly TWO adults close together at a kitchen counter BOTH pointing to exactly TWO whole red apples on one small plate below their faces. Both faces and both separate apples fully visible. No other people or food.'),
 'dislikes-bananas':([247], 'An adult woman looking displeased and wrinkling her nose while pushing away a plate with two clearly recognizable yellow bananas. Firm raised palm says no; the bananas and face remain clearly visible. No heart or cross icons.'),
 'boy-crosses-green':([149], 'One school-age boy walking across a zebra crossing beside a clearly illuminated GREEN pedestrian walking-person signal. The signal is on a short pole directly above and beside his head, inside the central crop. Empty safe road, no vehicles, no other people. Show crossing stripes and walking legs. Green signal unmistakable.'),
 'boy-waits-red':([152], 'One school-age boy standing still safely on the sidewalk at the curb BEFORE a zebra crossing. A clearly illuminated RED pedestrian standing-person signal on a short pole directly beside and above his head. No one crossing. Red signal, standing feet behind curb and crossing stripes clearly visible together.'),
 'girl-waits-red':([300], 'One school-age girl standing still safely on the sidewalk at the curb BEFORE a zebra crossing. A clearly illuminated RED pedestrian standing-person signal directly beside and above her head. No one crossing. Red signal, standing feet behind curb and crossing stripes clearly visible together.'),
 'pair-waits-red':([576], 'Exactly TWO adults standing still shoulder to shoulder safely behind the curb BEFORE a zebra crossing. A clearly illuminated RED pedestrian standing-person signal directly above them. No one crossing, no extra people. Both full figures, curb, stripes and red signal visible together.'),
 'pair-boards-bus':([306,571,709], 'Exactly TWO adults boarding a recognizable full-size CITY BUS through its open passenger door, one on the first step and the other immediately behind. Show both complete people, open bus doorway, steps and large bus body/window. Working bus, welcoming driver visible only faintly in background, no taxi or train.'),
 'pair-boards-train':([570,572], 'Exactly TWO adults boarding a recognizable passenger TRAIN through its open door from the station platform, one on the first step and the other immediately behind. Both full people, open train doorway, metal train carriage and visible rails beside platform. No bus.'),
 'pair-cannot-board-train':([573,708], 'Exactly TWO adults standing disappointed before a firmly CLOSED train-station boarding gate with a real locked barrier directly in front of them. A passenger train visible behind the locked gate. Physical barrier clearly blocks BOTH adults; no one boarding. Central compact composition, no text needed.'),
 'pair-cannot-board-bus':([574], 'Exactly TWO adults standing disappointed beside a full-size city bus whose passenger door is firmly CLOSED. A real portable barrier blocks the door; maintenance mechanic and raised rear service hatch in background show the bus cannot carry passengers. Both adults and blocked door central and clear, no one boarding.'),
 'man-boards-bus':([181], 'One adult man boarding a recognizable full-size CITY BUS through its open passenger door. Show his face, body, the doorway, steps and large bus window; real city sidewalk, no train or taxi.'),
 'man-boards-train':([311,312,379,736], 'One adult man boarding a recognizable passenger TRAIN from a station platform. Show his face, body, open train doorway, metal train carriage and rails beside platform. No bus.'),
 'man-boards-taxi':([678], 'One adult man entering the rear passenger seat of a clearly recognizable yellow TAXI car. Open rear car door and physical TAXI roof sign centrally visible with the man. No bus or train.'),
 'cross-street':([671], 'One adult woman walking across a real zebra crossing on an empty safe urban street. Full walking figure and painted crossing stripes clearly visible; no cars near her, no illustrated map.'),
 'cold-sunny':([205], 'A visibly shivering adult woman wearing a warm winter jacket outdoors in bright sunshine under a CLEAR BLUE SKY. Snow on ground and visible cold breath establish cold, sunny weather. Her face, jacket, snow and blue sky all within central portrait crop.'),
 'hot-cloudy':([348], 'A sweating adult man in a light short-sleeved shirt outdoors wiping sweat from his forehead with one hand, fanning himself with the other. Clearly hot, no jacket. A HEAVILY OVERCAST GREY SKY fills background; no sun or rain. His face, sweaty shirt and grey sky central.'),
 'hot-sunny':([350], 'A sweating adult man in a light short-sleeved shirt outdoors wiping sweat from his forehead in bright direct sunshine. CLEAR BLUE SKY, hard sunlit shadows, no clouds, snow or rain. Face, shirt and sky central.'),
 'cold-shirt':([208,210], 'An adult woman visibly shivering outdoors in snowy winter weather, wearing only a thin short-sleeved SHIRT and hugging herself for warmth. No jacket. This intentionally shows the inadequate clothing choice: shirt plus visibly cold weather. Full shirt, face and snow central.'),
 'hot-jacket':([351], 'An adult man sweating heavily in bright hot summer sunshine while wearing a thick winter JACKET zipped up. He fans his face looking uncomfortably hot. This intentionally shows the inadequate clothing choice: heavy jacket in hot weather. Jacket and face central.'),
 'hot-shirt':([352], 'An adult man in hot summer sunshine comfortably wearing a plain light short-sleeved SHIRT, with his hands lightly holding the shirt front to indicate the clothing choice. Bare forearms, warm sunlight, no jacket. Face and whole shirt central.'),
 'rain-hat':([597,600], 'An adult woman standing outdoors in plainly visible rain while holding only a normal brimmed HAT above her head. Rain visibly falls past the ineffective hat, her shoulders wet, puddles below. No umbrella or hood. Hat, face, falling rain and wet shoulders central. This is an intentionally inadequate weather choice.'),
 'rain-boots':([206], 'An adult woman wearing waterproof BOOTS standing at a doorway with her boots in a rain puddle and visible falling rain just outside. Show face and both complete boots with natural rain context, no umbrella. Boots are the primary clothing focus.'),
 'sunny-shoes':([674], 'An adult woman standing in ordinary low SHOES on a dry sunlit pavement, clear sunny weather, no boots or rain. Complete shoes and her face visible in compact full-body photograph.'),
 'cold-jacket':([437], 'An adult woman shivering slightly outdoors in snowy cold weather, putting on a warm JACKET and grasping its front. Complete jacket, her face, white breath and snow visible. No umbrella.'),
 'windy-jacket':([], 'An adult woman outdoors putting on a windproof JACKET during strong wind. Her hair and jacket hem visibly blown sideways, bending grass behind her. No snow or rain. Complete jacket and face central.'),
 'rain-umbrella':([750], 'An adult woman standing beneath an open UMBRELLA in clearly visible falling rain on a wet street. Whole umbrella canopy above her head, face, wet pavement and falling rain visible inside central crop. No hat.'),
 'rejects-tv':([606], 'An adult woman at home showing a clear displeased face and a firm raised no palm toward a small television directly below and beside her. The TV screen and her face both central and fully visible. No book, headphones, symbols or written captions.'),
 'likes-tv':([482,760], 'An adult woman smiling and relaxing while watching a small television in a real living room. Camera sees both her happy face and the visible TV screen immediately beside and below her, compact centered composition. No headphones or book.'),
 'dislikes-reading':([603], 'An adult woman seated in a real reading nook, frowning and pushing a closed book away with her raised other palm signaling no. Clearly dislikes reading; full book and face central, no television or headphones.'),
 'likes-reading':([389,476], 'An adult woman smiling while reading an open book in a cozy real reading nook. Eyes directed at book, both face and open pages visible in center. No television or headphones.'),
 'dislikes-music':([251], 'An adult woman removing over-ear headphones with a visibly displeased frown and one hand signaling no. Headphones held clearly beside her face, no television or book.'),
 'invites-music':([400], 'Two young adults close together in a living room. One smiles and offers a pair of over-ear headphones to the other with an inviting open-hand gesture; the other listens to the invitation. Both faces and headphones centered. No guitar, singing, television or book.'),
 'woman-thirsty':([714,789], 'An adult woman after exercise, visibly hot and thirsty, eagerly reaching for a clear glass of water held immediately below her face. Sweaty forehead, slightly open dry lips, clear water glass centered and fully visible. No food or headphones.'),
 'wakes-morning':([753], 'One adult woman waking up in bed in morning daylight, sitting up beneath a duvet, yawning and stretching her arms. Real bedroom, bright morning window directly behind her. Clearly just waking, not sleeping, studying or greeting anyone.'),
 'parents':([583,778], 'An adult mother and father standing close together behind their school-age child in a real home, warmly resting their hands on the child shoulders. Mother and father in their thirties, visibly parents, not elderly. Both adult faces prominent above child; all three faces remain in central crop.'),
 'grandparents':([314], 'An elderly grandmother and grandfather standing close together behind their school-age grandchild in a real home, warmly resting hands on child shoulders. Both elderly adults clearly grey-haired with natural age lines. Their faces prominent above child; all three faces central.'),
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
                actual=recipe
                if index==603:
                    card=lesson['cards'][int(scope['pointer'].split('/')[2])]
                    actual='dislikes-reading' if card.get('answer_audio_text')=='I do not like reading.' else 'likes-reading'
                if index==437:
                    card=lesson['cards'][int(scope['pointer'].split('/')[2])]
                    actual='windy-jacket' if card.get('answer_audio_text')=='It is windy. I need a jacket.' else 'cold-jacket'
                key=(unit,number if number==9 else 0,actual)
                record=groups.setdefault(key,{}).setdefault(old['filename'],{
                    'inventory_index':index,'old_filename':old['filename'],'old_sha256':old['sha256'],
                    'old_observation':('The old waking-in-morning image shows adults greeting beside a bus, not waking up.' if index==753 else 'Directly inspected legacy drawing, inset or mixed symbolic scene; the learner needs a literal full-frame human action with the required subjects visible.'),'scopes':[]})
                record['scopes'].append(scope)
    assets=[]
    for (unit,review,recipe),replacements in sorted(groups.items()):
        aid=f'u{unit}'+('-review' if review else '')+'-'+recipe
        assets.append({'id':aid,'runtime_filename':'a1_photo_'+aid.replace('-','_')+'_v1.webp',
            'prompt':RECIPES[recipe][1]+(' Fresh review scene: different people, setting and an oblique camera angle, not a copy of any teaching image.' if review else ''),
            'expected_description':RECIPES[recipe][1],
            'change_control':{'kind':'inspected-legacy-photo-group','replacements':list(replacements.values())}})
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v3',
        'image_settings':{'model':'gpt-image-2.5-sunburst-2026-09-08','size':'1536x1024','quality':'high','output_format':'png','n':1},
        'production':{'initial_batch_ceiling_usd':'3.50','expected_cost_usd':f'{len(assets)*.044:.2f}','no_automatic_retries':True},
        'shared_prompt':'Use case: photorealistic-natural. A single exceptionally lifelike photograph for beginner English, authentic human skin texture, realistic anatomy and natural expressions, natural light, real environment. No cartoon, drawing, vector, CGI, icons, arrows, speech bubbles, collage, inset, borders, captions or watermarks. Full-bleed landscape 3:2. The app ALSO shows a centered narrow 4:5 crop: arrange ALL required people, faces, target objects and action cues compactly inside the CENTRAL 50 percent of the landscape width, using depth and a slightly elevated view if helpful, not a long horizontal line. Both side margins are expendable background. Use enough depth of field and a close enough view that the target is obvious on a phone. The exact number of people and objects, color, gesture and positive versus negative action are essential. No background duplicates of counted subjects.',
        'assets':assets}
    path=ROOT/'docs/product/course-photo-sweep-actions-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:raise ValueError('Production pack is frozen.')
    path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'assets':len(assets),'expected_usd':pack['production']['expected_cost_usd'],'ceiling_usd':'3.50'}))

if __name__=='__main__':main()
