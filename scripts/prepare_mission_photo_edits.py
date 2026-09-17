"""Freeze the 13 explicitly approved existing-photo edits; never call an API."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.audit_course_media_preservation import digest, read_lesson
from scripts.render_course_stills import MODEL

# Observations below come from actual full-resolution inspection, not filenames.
EDITS = [
    ('3.10', 'M03', 'a1_u3_scene_03_photo_mother.webp',
     'Real brown-haired woman in a cream sweater and blue lanyard at a family dinner, inside a square inset with blurred margins. Her badge does not visibly establish a doctor.',
     'Preserve the smiling brown-haired woman, cream cable-knit sweater, blue lanyard, family dinner and warm lighting. Add a recognizable real stethoscope around her neck, hanging over the sweater; replace her badge with a small medical cross and her existing portrait, no words. Keep her the clear main subject. Expand the actual dining room naturally to all edges.'),
    ('4.10', 'M01', 'a1_u4_scene_01_living_room.webp',
     'Inset living-room photo: mother cleaning shelves left, elderly couple on cream sofa middle-right, girl reading right, large right window. No lamp is visible for the lamp clue.',
     'Preserve all four people, faces, clothes and actions. Extend this same room to fill the entire landscape. Add one clearly visible floor lamp in the newly revealed far-left floor area, separate from the cleaning mother. Retain elderly couple seated together, reading girl and large right window. Keep the lamp, mother, pair and window in distinct nonoverlapping selectable regions.'),
    ('4.10', 'M02', 'a1_u4_scene_02_kitchen_dining.webp',
     'Photographic kitchen inset with blurred margins: father cooking left, striped-shirt boy drinking center-right, dining table right. More than two dining-chair backs are visible despite the two-chair clue.',
     'Preserve father cooking and boy drinking, their faces, clothing, positions and kitchen. Extend real kitchen pixels to all edges. At the dining table on the right show EXACTLY TWO complete dining chairs, one dark wooden chair and one white chair, and remove any additional chair backs. Keep the boy step stool visibly distinct from the chairs. Tabletop and the two chairs must be readable and separately selectable.'),
    ('4.10', 'M03', 'a1_u4_scene_03_bedroom.webp',
     'Inset bedroom photo with girl writing at left desk and child reading on right bed. The computer clue has no computer; the authored central door target points toward a window.',
     'Preserve both children, faces and clothes, girl working at left desk, child reading on right bed and the same room. Extend room to full landscape. Place one open laptop visibly on the left desk without covering the girl. Reveal a distinct open bedroom door at the far-left edge, with its full handle and frame visible. Keep central window. Girl, laptop, bed and door must each be clearly visible and separately selectable.'),
    ('5.10', 'M01', 'a1_u5_scene_01_market_stall.webp',
     'Inset market photograph: man holding bread left, girl reaching for apples right, oranges in front-left crates and bananas front-right. Baked-in blurred side and top/bottom margins.',
     'Preserve exact man holding bread, girl reaching for apples, faces, clothing and market setting. Expand the real market naturally into all blurred margins. Preserve visibly distinct orange crates at front-left and banana bunches at front-right, the apples by the girl and complete loaf in the man hands. No new people in the foreground or repeated foreground fruit groups.'),
    ('5.10', 'M02', 'a1_u5_scene_02_register.webp',
     'Inset checkout photo with brown-bob woman holding water, gray-haired man holding a tea tin, food basket and orange/purple juice bottles. Blurred margins and tiny unreadable product labels.',
     'Preserve exact woman with clear water bottle, older man with tea tin, food basket and juice bottles, same faces and outfits and checkout. Extend real setting edge-to-edge. Make the tin plainly a tea container by showing real tea leaves and two tea bags next to it, not printed answer words. Keep food basket and juice bottles separate. Remove gibberish product labels; no answer captions.'),
    ('5.10', 'M03', 'a1_u5_scene_03_cafe_counter.webp',
     'Inset cafe photograph with smiling male barista, espresso equipment and gibberish chalk menu. No visible five-dollar price for the spoken price answer.',
     'Preserve exact smiling barista, gray apron, face, brick cafe and counter. Extend real cafe to every edge. Remove gibberish menu writing. Place one complete white coffee cup and saucer at center foreground with a large simple physical price card immediately beside it reading exactly "$5". That is the only visible price; no answer sentence or other menu text. Cup and price card unobstructed and large enough for a phone.'),
    ('6.10', 'M01', 'a1_u6_scene_01_plaza.webp',
     'Inset plaza: floral-dress woman left by shop, grandfather crossing on zebra stripes, checked-shirt man waiting by bench, curly-haired boy reading seated at right. Large blurred margins.',
     'Preserve exact four people, their faces, clothing, gestures and positions in this same plaza. Extend the actual plaza edge-to-edge. Make the left storefront visibly a grocery with produce in its doorway; the woman is walking toward it. Retain grandfather on zebra crossing, father waiting next to bench and boy seated by tree-planted park space. No new foreground people or text.'),
    ('6.10', 'M02', 'a1_u6_scene_02_school.webp',
     'Inset school street with schoolgirl left, walking parents middle, older woman beside flower display, bus right. No readable 8:00 arrival clue, and grandmother faces away from the store.',
     'Preserve exact girl with red backpack, walking parents, grandmother, school building, flower storefront and bus in the same scene. Expand to full landscape, complete bus visible. Turn grandmother gaze toward the flower storefront she stands next to. Add a real bus-stop display immediately beside the bus with a bus pictogram and large exact digits "8:00". No other digits or route text. Preserve open-book school emblem, remove gibberish building and street labels. Four targets remain separate.'),
    ('6.10', 'M03', 'a1_u6_scene_03_corner_checkpoint.webp',
     'Inset street photograph: brick bank with visible ATM directly adjacent to produce shop under green-striped awning; adult couple walking right. Blurred surrounding margins.',
     'Preserve exact adjacent bank facade and its ATM, produce shop and green striped awning, adult couple and daylight. Expand real street to all edges. Keep the bank and shop directly side by side and the ATM large and recognizable. No printed BANK or STORE answer labels, no new buildings between them.'),
    ('7.10', 'M01', 'a1_u7_scene_01_courtyard.webp',
     'Inset garden celebration: two women conversing left, father helping little girl with hanging ribbon center, boy writing front center, grandmother reading right. Blurred margins hide scene width.',
     'Preserve all six people exactly: left two women talking, center father helping girl reach ribbon, boy writing at table, grandmother reading right. Preserve faces, clothes, books, pencil, flowers, garden celebration and their spatial order. Expand the actual courtyard to all edges, no added people. Keep the four activity groups visibly separated with space above heads for game markers added by the app, not drawn into photo.'),
    ('7.10', 'M02', 'a1_u7_scene_02_entrance_hall.webp',
     'Inset festive hall with seated grandfather left, smiling parents center-left, girl with arms out center-right, boy biting apple right. Baked-in blurred margins.',
     'Preserve all five people, exact faces, clothes, positions and festive hall. Expand the real hall to full landscape. Preserve grandfather on chair, smiling parents together and boy clearly biting his red apple. Make the little girl visibly playing by giving her one small colorful toy ball in her open hands; no extra person. Keep all four target regions separate and all heads and feet visible.'),
    ('7.10', 'M03', 'a1_u7_scene_03_stage_podium.webp',
     'Inset celebration photo: smiling brown-haired woman in teal dress behind wooden podium with sunflowers, happy guests behind, drapery and lights. Large blurred margins.',
     'Preserve exact happy woman in teal dress, welcoming open-arm gesture, wooden podium, sunflowers, guests, drapery and lights. Extend actual room naturally to every image edge. Same face and joyful expression, no text, labels, invented guests or artificial border.'),
]


def main():
    files = [(p, read_lesson(p)) for p in (ROOT/'backend/lessons').glob('unit_*/*.yaml')]
    assets = []
    for number, slide, old, observation, prompt in EDITS:
        path, lesson = next((p, d) for p, d in files if d['sub_lesson_id'] == number)
        card = next(c for c in lesson['cards'] if c['slide_id'] == slide)
        assets.append({
            'id': f"u{number.split('.')[0]}-{slide.lower()}-full-frame",
            'runtime_filename': old.replace('.webp', '_fullframe_v2.webp'),
            'prompt': prompt,
            'expected_description': prompt,
            'reference_file': {'path': f'Lessons/Lesson1/images/{old}', 'sha256': digest(ROOT/'Lessons/Lesson1/images'/old), 'observed_description': observation},
            'change_control': {'kind': 'inspected-mission-photo-edit', 'lesson_id': lesson['id'], 'lesson_path': path.relative_to(ROOT).as_posix(), 'slide_id': slide, 'old_filename': old,
                               'old_sha256': digest(ROOT/'Lessons/Lesson1/images'/old), 'old_observation': observation, 'original_card': card},
        })
    pack = {'schema_version': 1, 'output_namespace': 'course-photo-sweep-v9',
            'image_settings': {'model': MODEL, 'size':'1536x1024','quality':'high','output_format':'png','n':1},
            'production': {'initial_batch_ceiling_usd':'1.30','no_automatic_retries':True,
                           'authorization':'User explicitly approved uploading these 13 existing mission photos plus 2 Ana photos for targeted edits, total cap USD 1.50. Ana edits are separately limited to USD 0.20.'},
            'shared_prompt': 'Use case: identity-preserve. Image 1 is the exact existing course photo to edit, NOT a style suggestion. Produce one full-bleed photorealistic 1536x1024 landscape photo. Remove the entire artificial blurred border by naturally extending the depicted real environment. No inset, square within landscape, mirrored borders, blur fill or collage. Preserve existing faces, identities, ages, clothes, lighting, setting, object relationships and relative positions except the explicitly requested corrections. Do not zoom in or crop away any target. Full 3:2 canvas is visible in the game, so use its width. Clear natural photographic detail and anatomy. No UI markers, pointers, answer captions, watermarks, new story elements or text except explicitly requested physical clues.',
            'assets': assets}
    destination = ROOT/'docs/product/course-photo-sweep-mission-edits-v1.json'
    with destination.open('x', encoding='utf-8') as stream:
        json.dump(pack,stream,ensure_ascii=False,indent=2);stream.write('\n')
    print(f'Frozen {len(assets)} exact existing-photo edits; no API calls.')

if __name__ == '__main__': main()
