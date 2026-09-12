from __future__ import annotations

import base64
import io
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

env_path = ROOT / "backend" / ".env"
env = dict(re.findall(r"^([A-Z_]+)=(.*)$", env_path.read_text(encoding="utf-8"), re.M))
GEMINI_KEY = env.get("GEMINI_API_KEY", "").strip()

if not GEMINI_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY in backend/.env")

IMAGE_GEN_MODEL = "gemini-3.1-flash-image"

TARGET_DIRS = [
    ROOT / "Lessons" / "Lesson1" / "images",
    ROOT / "mobile" / "assets" / "lesson-assets",
    ROOT / "frontend" / "public" / "lesson-assets",
]

CARD_SIZE = (1536, 1024)


def generate_gemini_image(prompt: str, retries: int = 3) -> Image.Image:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{IMAGE_GEN_MODEL}:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {
                "aspectRatio": "3:2"
            }
        }
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if not candidates:
                    raise RuntimeError(f"No candidates returned: {result}")
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    if "inlineData" in part:
                        img_bytes = base64.b64decode(part["inlineData"]["data"])
                        raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                        fitted = ImageOps.fit(raw_img, CARD_SIZE, method=Image.Resampling.LANCZOS)
                        return fitted
                raise RuntimeError(f"No inlineData found in response: {result}")
        except Exception as e:
            print(f"  Attempt {attempt + 1} failed: {e}")
            time.sleep(3)
    raise RuntimeError(f"Failed after {retries} attempts.")


def save_to_all_targets(image: Image.Image, filename: str, also_four_card: bool = False):
    filenames = [filename]
    if also_four_card:
        stem = filename.removesuffix(".webp")
        filenames.append(f"{stem}_four-card.webp")

    for fn in filenames:
        for d in TARGET_DIRS:
            d.mkdir(parents=True, exist_ok=True)
            dest = d / fn
            image.save(dest, format="WEBP", quality=90, method=6)
            print(f"Saved {fn} to {d.relative_to(ROOT)} ({dest.stat().st_size} bytes)")


# ==============================================================================
# ASSET CATALOG ORGANIZED BY GROUP
# ==============================================================================

GROUP_1_PLACES = [
    {
        "filename": "place_park.webp",
        "prompt": "A beautiful sunny public city park in summer. Green rolling lawn, mature shady trees, colorful flower beds, a curved paved walking path with a wooden bench beside it. Bright natural daylight, inviting, clear landscape photography, sharp focus, 3:2 landscape.",
    },
    {
        "filename": "a1_school.webp",
        "prompt": "A modern, inviting elementary or middle school building exterior. Brick and glass architecture, clean entrance with wide steps, manicured front lawn and flower garden, blue sky with soft white clouds. Professional architectural photography, 3:2 landscape.",
    },
    {
        "filename": "a1_store.webp",
        "prompt": "A charming, modern neighborhood grocery and convenience store exterior on a clean city street. Clear glass front windows displaying fresh fruits, neat storefront awning, welcoming entrance door, sidewalk in front. Natural daylight, commercial street photography, 3:2 landscape.",
    },
    {
        "filename": "place_house.webp",
        "prompt": "A lovely, welcoming two-story residential house in a peaceful suburban neighborhood. Green front yard with flowers, front porch with front door, paved stone pathway leading to steps, warm sunny daylight. Real estate photography, sharp detail, 3:2 landscape.",
    },
    {
        "filename": "a1_restaurant.webp",
        "prompt": "A cozy, charming neighborhood restaurant and bistro exterior. Outdoor sidewalk patio with neat cafe tables and chairs under a striped fabric awning, large glass front windows, chalkboard menu sign, warm daylight. High quality travel photography, 3:2 landscape.",
    },
    {
        "filename": "a1_hospital.webp",
        "prompt": "A clean, modern community hospital building exterior. Glass and steel entrance facade with a clear blue medical cross sign and entrance canopy, ambulance bay in background, landscaped shrubs and walkway. Daytime, professional documentary photography, 3:2 landscape.",
    },
    {
        "filename": "place_street.webp",
        "prompt": "A clean, pleasant city street in a calm residential and shopping neighborhood. Smooth asphalt road with white crosswalk lines, wide sidewalks with green street trees, parked cars along curb, sunlit afternoon. Urban street photography, 3:2 landscape.",
    },
    {
        "filename": "place_bridge.webp",
        "prompt": "A scenic, classic arched stone bridge spanning across a calm river. Pedestrian path on the bridge, green riverbanks with willow trees, reflection on water, clear daylight sky. Landscape photography, 3:2 landscape.",
    },
    {
        "filename": "place_bus.webp",
        "prompt": "A modern city transit passenger bus stopped at a curbside bus stop shelter on a city street. Bright blue and white bus body, clean road and sidewalk, sunny day. Urban transport photography, 3:2 landscape.",
    },
    {
        "filename": "object_car.webp",
        "prompt": "A modern, sleek compact passenger car parked on a quiet residential street by the curb. Clean glossy silver paint, sharp focus on vehicle, sunny day, centered composition, 3:2 landscape.",
    },
    {
        "filename": "object_bike.webp",
        "prompt": "A modern commuter city bicycle parked neatly in a sidewalk bicycle rack. Sleek frame, handlebars, leather seat, and basket, paved ground, sunny day, centered composition, 3:2 landscape.",
    },
    {
        "filename": "boy_is_running.webp",
        "prompt": "An energetic 8-year-old boy in a casual yellow t-shirt and shorts running joyfully across a green park lawn in daylight. Action shot, genuine smile, motion blur in background, centered subject, 3:2 landscape.",
    },
    {
        "filename": "girl_is_walking.webp",
        "prompt": "A friendly 7-year-old girl in a casual summer dress and sneakers walking calmly along a sunny park pathway. Natural smile, warm daylight, green trees in background, centered subject, 3:2 landscape.",
    },
]

GROUP_2_OBJECTS = [
    {
        "filename": "object_book.webp",
        "prompt": "A single beautiful hardcover book with an elegant navy blue cover resting closed on a clean, warm wooden study desk. Soft natural window light, crisp detailed texture, centered composition, 3:2 landscape.",
    },
    {
        "filename": "a1_pen.webp",
        "prompt": "A sleek modern metal and black ballpoint pen resting on top of a clean lined notebook page on a wooden desk. Natural lighting, macro desk still-life photography, centered composition, 3:2 landscape.",
    },
    {
        "filename": "a1_phone.webp",
        "prompt": "A modern sleek black smartphone resting flat on a clean wooden table. The screen is illuminated showing a clean abstract colorful home screen, soft natural reflections, centered composition, 3:2 landscape.",
    },
    {
        "filename": "object_backpack.webp",
        "prompt": "A stylish, sturdy canvas backpack in navy blue and tan leather trim sitting upright on a clean hardwood floor beside a wooden chair. Crisp details, centered composition, 3:2 landscape.",
    },
    {
        "filename": "a1_chair.webp",
        "prompt": "A well-designed modern wooden dining and study chair in a brightly lit room with light wood floors and white walls. Clean Scandinavian design, studio interior photography, centered composition, 3:2 landscape.",
    },
    {
        "filename": "a1_table.webp",
        "prompt": "A beautiful natural light-oak wooden dining and study table in a bright, airy room with light wood floors. Empty clean surface, soft warm daylight, centered composition, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "boy.webp",
        "prompt": "A friendly, happy 8-year-old schoolboy smiling warmly at the camera. Wearing a simple blue t-shirt, indoor portrait with soft natural lighting, centered portrait, 3:2 landscape.",
    },
    {
        "filename": "woman.webp",
        "prompt": "A friendly adult woman in her early 30s smiling warmly at the camera. Wearing a casual cream sweater, indoor portrait with soft natural window light, centered portrait, 3:2 landscape.",
    },
]

GROUP_3_THIS_AND_THAT = [
    {
        "filename": "a1_near-book.webp",
        "prompt": "First-person close-up perspective of a person's hand resting right next to a hardcover book on a wooden desk right in front of them ('This is a book.'). Clear foreground focus, immediate reach, warm lighting, 3:2 landscape.",
    },
    {
        "filename": "a1_far-book.webp",
        "prompt": "Perspective showing a room where a person in the foreground points towards a book resting on a table across the room in the distance ('That is a book.'). Depth of field, clear distance, 3:2 landscape.",
    },
    {
        "filename": "a1_near-bag.webp",
        "prompt": "First-person perspective of a backpack resting directly beside the person on the desk or chair in the immediate foreground ('This is a bag.'). Clear close proximity, warm daylight, 3:2 landscape.",
    },
    {
        "filename": "a1_far-bag.webp",
        "prompt": "Perspective showing a backpack hanging on a coat rack across the room near a far doorway, with a person pointing towards it in the distance ('That is a bag.'). Clear spatial distance, 3:2 landscape.",
    },
    {
        "filename": "a1_near-chair.webp",
        "prompt": "First-person close-up view of a wooden chair standing right beside the viewer in the immediate foreground, within touching distance ('This is a chair.'). Bright room, 3:2 landscape.",
    },
    {
        "filename": "a1_far-chair.webp",
        "prompt": "Perspective showing a wooden chair placed across the room near the far wall and window, with a person in the foreground gesturing towards it ('That is a chair.'). Clear distance, 3:2 landscape.",
    },
    {
        "filename": "a1_near-phone.webp",
        "prompt": "First-person close-up perspective of a smartphone resting right in front of the viewer on a coffee table, right beside their hand ('This is a phone.'). Immediate reach, 3:2 landscape.",
    },
    {
        "filename": "a1_far-phone.webp",
        "prompt": "Perspective showing a smartphone resting on a charging dock on a kitchen counter across the room in the distance, with someone pointing towards it ('That is a phone.'). Clear spatial distance, 3:2 landscape.",
    },
]

GROUP_4_NUMBERS = [
    {
        "filename": "a1_n1.webp",
        "prompt": "Exactly ONE single bright red apple placed in the center of a clean light wooden tabletop. Studio still life, minimalist, sharp focus, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_n2.webp",
        "prompt": "Exactly TWO fresh yellow bananas resting side by side in the center of a clean wooden tabletop. Clear counting view, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_n3.webp",
        "prompt": "Exactly THREE crisp green Granny Smith apples arranged neatly in the center of a clean wooden tabletop. Clear count of three, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_n4.webp",
        "prompt": "Exactly FOUR blue hardcover notebooks stacked or arranged neatly in a row on a clean wooden table. Clear count of four, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_n5.webp",
        "prompt": "Exactly FIVE bright fresh oranges grouped together in the center of a clean kitchen counter. Clear count of five, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_n6.webp",
        "prompt": "Exactly SIX colorful sharpened wooden pencils lined up neatly side by side on a clean desk. Clear count of six, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_n7.webp",
        "prompt": "Exactly SEVEN fresh red ripe strawberries arranged neatly on a wooden board. Clear count of seven, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_n8.webp",
        "prompt": "Exactly EIGHT clean white ceramic mugs arranged in two neat rows of four on a table. Clear count of eight, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_n9.webp",
        "prompt": "Exactly NINE natural wooden building blocks arranged neatly on a table. Clear count of nine, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_n10.webp",
        "prompt": "Exactly TEN colorful ballpoint pens lined up in a neat row on a clean desk. Clear count of ten, centered, 3:2 landscape.",
        "also_four_card": True,
    },
]

GROUP_5_COLORS = [
    {
        "filename": "a1_red.webp",
        "prompt": "A striking still life showcasing the color RED: a vibrant, glossy bright red apple resting on a clean minimalist light surface in natural daylight. Pure red visual emphasis, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_blue.webp",
        "prompt": "A striking still life showcasing the color BLUE: a vibrant, deep royal blue ceramic mug resting on a clean minimalist light surface in natural daylight. Pure blue visual emphasis, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_green.webp",
        "prompt": "A striking still life showcasing the color GREEN: a vibrant, fresh green potted succulent plant in a white pot on a clean minimalist surface. Pure green visual emphasis, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_yellow.webp",
        "prompt": "A striking still life showcasing the color YELLOW: a bright, fresh sunny yellow lemon with leaf resting on a clean minimalist surface in daylight. Pure yellow visual emphasis, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_black.webp",
        "prompt": "A striking still life showcasing the color BLACK: a sleek, matte black vintage camera and black notebook on a clean minimalist surface. Pure black visual emphasis, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_white.webp",
        "prompt": "A striking still life showcasing the color WHITE: a clean, pure white porcelain cup and saucer resting on a light wooden tabletop. Pure white visual emphasis, centered, 3:2 landscape.",
    },
]

GROUP_6_COUNT_DESCRIBE = [
    {
        "filename": "a1_one-red-car.webp",
        "prompt": "Exactly ONE bright red passenger sedan parked alone by the curb on a clean city street. Sunlit, sharp focus on the red car, centered composition, 3:2 landscape.",
    },
    {
        "filename": "a1_two-blue-cars.webp",
        "prompt": "Exactly TWO distinct bright blue passenger cars parked side by side along the curb on a clean city street. Clear count of two blue cars, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_three-green-books.webp",
        "prompt": "Exactly THREE green hardcover books stacked neatly on a wooden desk. Clear count of three green books, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "a1_four-yellow-pens.webp",
        "prompt": "Exactly FOUR bright yellow pens resting together neatly on an open notebook on a desk. Clear count of four yellow pens, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_scene_five-black-phones_734dda6.webp",
        "prompt": "Exactly FIVE modern black smartphones laid out side by side in a neat row on a wooden table. Clear count of five black phones, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "unit2_six_white_bags.webp",
        "prompt": "Exactly SIX clean white canvas tote bags arranged neatly together on a wooden bench or table. Clear count of six white bags, centered, 3:2 landscape.",
        "also_four_card": True,
    },
    {
        "filename": "unit2_near_red_book.webp",
        "prompt": "First-person close-up perspective of a bright red book resting right on the desk in the immediate foreground ('This is a book.'). Clear red color, centered, 3:2 landscape.",
    },
    {
        "filename": "a1_scene_far-blue-bag_601f463.webp",
        "prompt": "Perspective showing a bright blue bag resting on a chair across the room in the distance, with a person pointing towards it ('That is a blue bag.'). Clear distance, centered, 3:2 landscape.",
    },
]

ALL_GROUPS = {
    "1": ("Places & Transportation", GROUP_1_PLACES),
    "2": ("Everyday Objects", GROUP_2_OBJECTS),
    "3": ("This and That (Spatial)", GROUP_3_THIS_AND_THAT),
    "4": ("Numbers 1-10", GROUP_4_NUMBERS),
    "5": ("Basic Colors", GROUP_5_COLORS),
    "6": ("Count and Describe", GROUP_6_COUNT_DESCRIBE),
}


def build_group(group_key: str):
    name, items = ALL_GROUPS[group_key]
    print(f"\n=======================================================")
    print(f"BUILDING GROUP {group_key}: {name} ({len(items)} assets)")
    print(f"=======================================================")
    for idx, item in enumerate(items, 1):
        fn = item["filename"]
        also_4 = item.get("also_four_card", False)
        print(f"\n[{idx}/{len(items)}] Generating {fn}...")
        img = generate_gemini_image(item["prompt"])
        save_to_all_targets(img, fn, also_four_card=also_4)
        time.sleep(1)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_group = sys.argv[1]
        build_group(target_group)
    else:
        for k in sorted(ALL_GROUPS.keys()):
            build_group(k)
