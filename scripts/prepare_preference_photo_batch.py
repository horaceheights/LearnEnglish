"""Create the explicit first paid batch from inspected legacy preference scenes."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SPECS={
 385:('likes-eggs','A smiling young adult woman at a small cafe table clearly delighted by a white plate of exactly TWO fried eggs, both bright yellow yolks completely visible. She gives a natural thumbs-up beside the plate with one hand and looks happily at the eggs. The eggs and her face are vertically aligned at the center. No other food.','A photographic adult showing clear pleasure at a plate of two eggs.'),
 288:('likes-five-strawberries','An adult woman seated at her kitchen table smiling approvingly at exactly FIVE separate ripe red strawberries on a small white plate. Arrange them as two at the back and three at the front with gaps so all five can be counted, no hidden strawberries. She gives a small natural thumbs-up with her hand beside the plate. Her face and the entire plate are in the center. No other fruit.','A smiling adult approving exactly five separately countable strawberries.'),
 391:('likes-three-oranges','An adult man at his dining table smiling appreciatively at exactly THREE whole oranges on a small plain plate, arranged in a shallow triangle, each orange fully separate and visible. His relaxed approving thumb and face make enjoyment clear. Face and all three oranges in the central vertical area. No other food.','A pleased adult approving exactly three separately countable oranges.'),
 468:('likes-apples','A smiling adult woman in a bright kitchen at a table enjoying the sight of red apples in a small shallow bowl. Her free hand makes a relaxed thumbs-up beside the bowl and she looks warmly at the apples. Keep her face, approving gesture and apples together in the central vertical area. No other foods.','A smiling adult with apples and an unmistakable approving gesture.'),
 478:('likes-three-red-apples','An adult man seated at a light wooden table pleased with exactly THREE RED apples on one small white plate. Arrange the three complete apples in a shallow triangle with gaps; all three must be separately countable. His smiling face and one natural thumbs-up beside the plate show approval. No green apples, other food or additional apples. Keep face, gesture and all three apples inside the center half width.','A pleased adult approving exactly three red apples.'),
 480:('likes-two-green-apples','An adult woman at a cafe table smiling warmly at exactly TWO GREEN apples, side by side with a visible gap on a small plain plate. Her natural thumbs-up beside the plate clearly indicates approval. No red apples or other food. Keep her face, gesture and both complete apples inside the center half width.','A pleased adult approving exactly two green apples.'),
 481:('likes-two-red-apples','An adult man at a cafe table smiling warmly at exactly TWO RED apples side by side with a clear gap on a small plain plate. His natural thumbs-up beside the plate indicates approval. No green apples or other food. Keep his face, gesture and both complete apples inside the center half width.','A pleased adult approving exactly two red apples.'),
 254:('dislikes-two-red-apples','An adult woman at a cafe table clearly declining exactly TWO RED apples side by side with a visible gap on a small plain plate. She frowns mildly and holds an open palm toward the plate in a clear no-thank-you gesture, leaning back slightly. No green apples or other food. Keep face, rejecting hand and both complete apples inside the center half width.','An adult rejecting exactly two red apples with a clear negative expression and gesture.'),
 250:('dislikes-fish-crop','An older adult woman at a dining table clearly declining a white plate containing one whole cooked fish, including its recognizable head and tail. She has a mild grimace and holds an open palm beside the plate, leaning back from it. No rice, meat, salad, extra plates or other food. Her face, rejecting hand and the entire fish plate must fit inside the center half width in a compact vertical arrangement.','An older woman clearly rejecting a recognizable cooked fish; fish and negative gesture remain in the phone crop.'),
 253:('dislikes-rice-crop','An older adult man at a dining table clearly declining a small white bowl containing only cooked white rice. He has a mild grimace and one open palm facing the bowl in a no-thank-you gesture. No fish, meat, fruit, salad, extra plates or other food. His face, rejecting hand and complete rice bowl must fit inside the center half width in a compact vertical arrangement.','An older man clearly rejecting a bowl of white rice; rice and negative gesture remain in the phone crop.')
}

def main():
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets']
    assets=[]
    for index,(name,prompt,description) in SPECS.items():
        row=inventory[index-1]
        assets.append({'id':name,'runtime_filename':'a1_photo_'+name.replace('-','_')+'_v1.webp',
            'prompt':prompt,'expected_description':description,'inventory_index':index,
            'change_control':{'kind':'inspected-legacy-photo-scene','old_filename':row['filename'],'old_sha256':row['sha256'],
                'old_observation':'The active scene depicts a flat drawn person and symbolic food or an illustrated four-choice reframe, not a real person expressing a preference.',
                'scopes':[s for s in row['authored_bindings'] if int(s['lesson'].split('.')[1])<9]}})
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v1',
        'image_settings':{'model':'gpt-image-2.5-sunburst-2026-09-08','size':'1536x1024','quality':'high','output_format':'png','n':1},
        'production':{'initial_batch_ceiling_usd':'0.80','expected_cost_usd':'0.44','fx_mxn_per_usd':'16.9707','no_automatic_retries':True},
        'shared_prompt':'Use case: photorealistic-natural. Create one exceptionally lifelike documentary photograph for a beginner English course, not an illustration. Real natural skin texture, plausible hands and anatomy, realistic food, soft natural window light, subtle everyday imperfections, clear instructional meaning. Landscape 3:2 photograph, full bleed, no borders, no collage, no icons, no hearts, no arrows, no text, no watermark. Important composition: the app also displays a centered 4:5 crop; every answer-critical face, hand and food item must remain comfortably inside the central 50 percent of the landscape width, with spare space at the sides. Place the face above the food in a compact vertical composition. Food must be large and unmistakable at phone size. Camera slightly elevated to show all food on the plate. This is a stand-alone everyday preference scene, not an identity test; use a natural adult in a new setting.',
        'assets':assets}
    path=ROOT/'docs/product/course-photo-sweep-preferences-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:
        raise ValueError('Do not overwrite a frozen production pack.')
    path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(assets)} explicit scenes, ceiling $0.80; no requests sent.')

if __name__=='__main__':main()
