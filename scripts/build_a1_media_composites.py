from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"
SIZE = (1536, 1024)

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}
COLORS = {
    "red": "#c83a36", "blue": "#3974b8", "green": "#3f8b5b",
    "yellow": "#e5bd37", "black": "#252525", "white": "#f5f3ed",
}

KEYWORD_FILES = [
    ("listening to music", "a1_listening_music.webp"),
    ("listen to music", "a1_listening_music.webp"),
    ("watching tv", "a1_watch_tv.webp"), ("watch tv", "a1_watch_tv.webp"),
    ("grandparents", "family_grandparents.webp"), ("parents", "family_parents.webp"),
    ("children", "family_children.webp"), ("boy running", "boy_is_running.webp"),
    ("girl walking", "girl_is_walking.webp"), ("reading", "boy_is_reading.webp"),
    ("writing", "girl_is_writing.webp"), ("running", "boy_is_running.webp"),
    ("walking", "girl_is_walking.webp"), ("sitting", "man_is_sitting.webp"),
    ("standing", "man_is_standing.webp"), ("swimming", "boy_is_swimming.webp"),
    ("sleep", "girl_is_sleeping.webp"), ("eating", "boy_is_eating.webp"),
    ("drinking", "girl_is_drinking.webp"), ("working", "family_father_working.webp"),
    ("cooking", "family_mother_cooking.webp"), ("playing", "family_children_playing.webp"),
    ("talking", "family_parents_talking.webp"),
    ("teacher", "a1_teacher.webp"), ("doctor", "a1_doctor.webp"),
    ("cook", "a1_cook.webp"), ("driver", "a1_driver.webp"),
    ("farmer", "a1_farmer.webp"), ("nurse", "a1_nurse.webp"),
    ("happy", "a1_happy.webp"), ("sad", "a1_sad.webp"),
    ("tired", "a1_tired.webp"), ("hungry", "a1_hungry.webp"),
    ("thirsty", "a1_thirsty.webp"),
    ("sunny", "a1_sunny.webp"), ("rainy", "a1_rainy.webp"),
    ("cloudy", "a1_cloudy.webp"), ("windy", "a1_windy.webp"),
    ("cold", "a1_cold.webp"), ("hot", "a1_hot.webp"),
    ("restaurant", "a1_restaurant.webp"), ("hospital", "a1_hospital.webp"),
    ("pharmacy", "a1_pharmacy.webp"), ("library", "a1_library.webp"),
    ("station", "a1_station.webp"), ("school", "a1_school.webp"),
    ("kitchen", "a1_kitchen.webp"), ("bedroom", "a1_bedroom.webp"),
    ("bathroom", "a1_bathroom.webp"), ("living room", "a1_living_room.webp"),
    ("dining room", "a1_dining_room.webp"), ("store", "a1_store.webp"),
    ("bank", "a1_bank.webp"), ("home", "a1_home.webp"),
    ("house", "place_house.webp"), ("park", "place_park.webp"),
    ("street", "place_street.webp"), ("bridge", "place_bridge.webp"),
    ("train", "a1_train.webp"), ("taxi", "a1_taxi.webp"),
    ("bus", "place_bus.webp"), ("bike", "object_bike.webp"), ("car", "object_car.webp"),
    ("computer", "a1_computer.webp"), ("window", "a1_window.webp"),
    ("door", "a1_door.webp"), ("chair", "a1_chair.webp"),
    ("table", "a1_table.webp"), ("sofa", "a1_sofa.webp"),
    ("lamp", "a1_lamp.webp"), ("bed", "a1_bed.webp"),
    ("umbrella", "a1_umbrella.webp"), ("boots", "a1_boots.webp"),
    ("jacket", "a1_jacket.webp"), ("shirt", "a1_shirt.webp"),
    ("pants", "a1_pants.webp"), ("dress", "a1_dress.webp"),
    ("shoes", "a1_shoes.webp"), ("hat", "a1_hat.webp"),
    ("socks", "a1_socks.webp"), ("skirt", "a1_skirt.webp"),
    ("head", "a1_full_body.webp"), ("eyes", "a1_full_body.webp"),
    ("ears", "a1_full_body.webp"), ("mouth", "a1_full_body.webp"),
    ("arms", "a1_full_body.webp"), ("hands", "a1_full_body.webp"),
    ("legs", "a1_full_body.webp"), ("feet", "a1_full_body.webp"),
    ("phone", "a1_phone.webp"), ("book", "a1_book.webp"),
    ("bag", "a1_bag.webp"), ("pen", "a1_pen.webp"),
    ("strawberry", "a1_strawberry.webp"), ("grapes", "a1_grapes.webp"),
    ("banana", "a1_banana.webp"), ("orange", "a1_orange.webp"),
    ("apple", "a1_apple.webp"), ("pear", "a1_pear.webp"),
    ("chicken", "a1_chicken.webp"), ("fish", "a1_fish.webp"),
    ("bread", "a1_bread.webp"), ("rice", "a1_rice.webp"), ("egg", "a1_egg.webp"),
    ("coffee", "a1_coffee.webp"), ("juice", "a1_juice.webp"),
    ("milk", "a1_milk.webp"), ("tea", "a1_tea.webp"), ("water", "a1_water.webp"),
    ("boy", "boy.webp"), ("girl", "girl.webp"),
    ("man", "man.webp"), ("woman", "woman.webp"),
    ("ana", "a1_ana.webp"), ("luis", "a1_luis.webp"),
    ("sofia", "a1_sofia.webp"), ("diego", "a1_diego.webp"),
]


def font(size: int) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def rounded_mask(size: tuple[int, int], radius: int = 54) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def placed_source(filename: str, box: tuple[int, int]) -> Image.Image | None:
    path = ASSET_ROOT / filename
    if not path.is_file():
        return None
    with Image.open(path) as source:
        source = source.convert("RGB")
        contained = ImageOps.contain(source, box, method=Image.Resampling.LANCZOS)
    panel = Image.new("RGB", box, "#eee9df")
    panel.paste(contained, ((box[0] - contained.width) // 2, (box[1] - contained.height) // 2))
    panel.putalpha(rounded_mask(box))
    return panel


def draw_body_scene(final: Image.Image, concept: str) -> bool:
    lowered = concept.lower()
    body_words = ["head", "eyes", "ears", "mouth", "arms", "hands", "legs", "feet"]
    body_word = next((word for word in body_words if re.search(rf"\b{word}\b", lowered)), None)
    source_path = ASSET_ROOT / "a1_full_body.webp"
    if not body_word or not source_path.is_file():
        return False

    if body_word in {"head", "eyes", "ears", "mouth"}:
        crop_box = (384, 0, 1152, 500)
        regions = {
            "head": [(590, 190, 940, 475)],
            "eyes": [(682, 284, 738, 318), (796, 284, 852, 318)],
            "ears": [(635, 278, 682, 365), (852, 278, 899, 365)],
            "mouth": [(724, 374, 822, 420)],
        }
    elif body_word in {"arms", "hands"}:
        crop_box = (350, 80, 1186, 625)
        regions = {
            "arms": [(515, 355, 665, 835), (870, 355, 1020, 835)],
            "hands": [(505, 730, 650, 890), (884, 730, 1029, 890)],
        }
    else:
        crop_box = (304, 420, 1231, 1024)
        regions = {
            "legs": [(620, 285, 760, 800), (775, 285, 915, 800)],
            "feet": [(570, 745, 760, 915), (775, 745, 965, 915)],
        }

    with Image.open(source_path) as source:
        cropped = source.convert("RGB").crop(crop_box)
        panel = ImageOps.fit(cropped, (1120, 730), Image.Resampling.LANCZOS)
    panel.putalpha(rounded_mask(panel.size))
    final.paste(panel, (208, 147), panel)
    highlight = Image.new("RGBA", final.size, (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    for region in regions[body_word]:
        highlight_draw.ellipse(region, fill=(238, 154, 47, 112), outline=(151, 76, 8, 235), width=9)
    final.paste(highlight, (0, 0), highlight)
    return True


def source_files(text: str) -> list[str]:
    normalized = text.lower().replace("-", " ")
    found: list[str] = []
    for keyword, filename in KEYWORD_FILES:
        plural_suffix = "" if keyword.endswith("s") else r"(?:s|es)?"
        pattern = rf"(?<![a-z]){re.escape(keyword)}{plural_suffix}(?![a-z])"
        if re.search(pattern, normalized) and filename not in found and (ASSET_ROOT / filename).is_file():
            found.append(filename)
    return found[:3]


def detected_count(text: str) -> int:
    lowered = text.lower()
    for word, number in NUMBER_WORDS.items():
        if re.match(rf"^{word}\b", lowered):
            return number
    match = re.match(r"^(\d{1,2})(?![:$])\b", lowered)
    return min(int(match.group(1)), 10) if match else 1


def color_for(text: str) -> str | None:
    lowered = text.lower()
    return next((value for name, value in COLORS.items() if re.search(rf"\b{name}\b", lowered)), None)


def background(accent: str) -> Image.Image:
    base = Image.new("RGB", SIZE, "#f7f1e7")
    glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-180, -420, 900, 720), fill=accent + "36")
    draw.ellipse((760, 420, 1780, 1380), fill="#73b7a633")
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    base.paste(glow, (0, 0), glow)
    return base


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str) -> None:
    draw.line((start, end), fill=color, width=34)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    length = 64
    for offset in (2.5, -2.5):
        point = (int(end[0] + length * math.cos(angle + offset)), int(end[1] + length * math.sin(angle + offset)))
        draw.line((end, point), fill=color, width=34)


def draw_overlays(image: Image.Image, text: str) -> None:
    lowered = text.lower()
    draw = ImageDraw.Draw(image)
    if "do not" in lowered or "cannot" in lowered or "not allowed" in lowered or "blocked" in lowered:
        draw.line((220, 820, 1320, 200), fill="#c63f3a", width=52)
    if "like" in lowered and "do not" not in lowered:
        draw.text((1210, 80), "♥", font=font(150), fill="#c94762", stroke_width=5, stroke_fill="#ffffff")
    if "need" in lowered or "help" in lowered:
        draw.ellipse((1240, 70, 1410, 240), fill="#f0b43b", outline="#713f12", width=8)
        draw.text((1294, 75), "!", font=font(120), fill="#713f12")
    if "left" in lowered:
        draw_arrow(draw, (420, 150), (180, 150), "#2f716d")
    if "right" in lowered:
        draw_arrow(draw, (1110, 150), (1350, 150), "#2f716d")
    if "straight" in lowered:
        draw_arrow(draw, (768, 260), (768, 70), "#2f716d")
    if "far" in lowered:
        draw.line((270, 880, 1260, 880), fill="#305e75", width=12)
        draw.ellipse((245, 855, 295, 905), fill="#305e75")
        draw.ellipse((1235, 855, 1285, 905), fill="#305e75")
    if "near" in lowered or "next to" in lowered:
        draw.line((620, 880, 910, 880), fill="#305e75", width=12)
        draw.ellipse((595, 855, 645, 905), fill="#305e75")
        draw.ellipse((885, 855, 935, 905), fill="#305e75")
    price = re.search(r"\$(\d+)|\b(\d+) dollars?\b", lowered)
    if price:
        amount = price.group(1) or price.group(2)
        draw.rounded_rectangle((1130, 720, 1430, 930), radius=34, fill="#f3d37a", outline="#6d4a1e", width=8)
        draw.text((1185, 750), f"${amount}", font=font(105), fill="#3d2b18")
    if "sunny" in lowered or "hot" in lowered:
        draw.ellipse((100, 80, 220, 200), fill="#efb735", outline="#9c6815", width=7)
        for angle in range(0, 360, 45):
            radians = math.radians(angle)
            draw.line(
                (160 + 82 * math.cos(radians), 140 + 82 * math.sin(radians),
                 160 + 116 * math.cos(radians), 140 + 116 * math.sin(radians)),
                fill="#d89722", width=12,
            )
    elif "rainy" in lowered:
        draw.ellipse((85, 80, 245, 170), fill="#8098a4", outline="#385565", width=6)
        for x in (110, 155, 200):
            draw.line((x, 185, x - 18, 235), fill="#3576a8", width=10)
    elif "cloudy" in lowered:
        draw.ellipse((80, 100, 245, 205), fill="#a7b2b8", outline="#51636d", width=6)
        draw.ellipse((120, 65, 230, 190), fill="#bac3c7", outline="#51636d", width=6)
    elif "windy" in lowered:
        for y, width in ((105, 160), (155, 220), (205, 135)):
            draw.arc((85, y - 30, 85 + width, y + 30), 190, 350, fill="#3f7f88", width=11)
    elif "cold" in lowered:
        draw.line((160, 75, 160, 225), fill="#4c86ae", width=12)
        draw.line((95, 112, 225, 188), fill="#4c86ae", width=12)
        draw.line((95, 188, 225, 112), fill="#4c86ae", width=12)

    body_regions = {
        "head": [(700, 185, 835, 290)],
        "eyes": [(724, 220, 750, 240), (782, 220, 808, 240)],
        "ears": [(694, 218, 717, 262), (817, 218, 840, 262)],
        "mouth": [(741, 254, 793, 276)],
        "arms": [(650, 325, 708, 610), (826, 325, 884, 610)],
        "hands": [(638, 535, 704, 608), (830, 535, 896, 608)],
        "legs": [(700, 545, 765, 845), (770, 545, 835, 845)],
        "feet": [(665, 820, 765, 900), (770, 820, 870, 900)],
    }
    matches = [(lowered.find(word), word) for word in body_regions if lowered.find(word) >= 0]
    if matches:
        _, body_word = min(matches)
        highlight = Image.new("RGBA", image.size, (0, 0, 0, 0))
        highlight_draw = ImageDraw.Draw(highlight)
        for region in body_regions[body_word]:
            highlight_draw.ellipse(region, fill=(238, 154, 47, 118), outline=(151, 76, 8, 230), width=8)
        image.alpha_composite(highlight) if image.mode == "RGBA" else image.paste(highlight, (0, 0), highlight)


def draw_number_scene(final: Image.Image, number: int) -> None:
    draw = ImageDraw.Draw(final)
    number_text = str(number)
    number_font = font(390 if number < 10 else 300)
    box = draw.textbbox((0, 0), number_text, font=number_font, stroke_width=7)
    width = box[2] - box[0]
    draw.text((340 - width // 2, 250), number_text, font=number_font, fill="#aeb5ba", stroke_width=9, stroke_fill="#33383b")
    columns = 5
    radius = 34 if number <= 10 else 25
    for index in range(number):
        x = 720 + (index % columns) * 130
        y = 260 + (index // columns) * 130
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#c99a35", outline="#6f531c", width=6)


def draw_country_flag(final: Image.Image, text: str) -> bool:
    lowered = text.lower()
    draw = ImageDraw.Draw(final)
    box = (360, 220, 1176, 804)
    if "mexico" in lowered or "mexican" in lowered:
        third = (box[2] - box[0]) // 3
        draw.rectangle(box, fill="white", outline="#3c3c3c", width=7)
        draw.rectangle((box[0], box[1], box[0] + third, box[3]), fill="#1d7a4b")
        draw.rectangle((box[2] - third, box[1], box[2], box[3]), fill="#c73832")
        draw.ellipse((730, 450, 806, 526), fill="#9b7730")
        return True
    if "canada" in lowered or "canadian" in lowered:
        draw.rectangle(box, fill="white", outline="#3c3c3c", width=7)
        draw.rectangle((box[0], box[1], 560, box[3]), fill="#c83a36")
        draw.rectangle((976, box[1], box[2], box[3]), fill="#c83a36")
        maple = [(768, 340), (795, 405), (850, 385), (828, 445), (890, 470),
                 (815, 495), (830, 560), (780, 530), (768, 620), (756, 530),
                 (706, 560), (721, 495), (646, 470), (708, 445), (686, 385),
                 (741, 405)]
        draw.polygon(maple, fill="#c83a36")
        return True
    if "spain" in lowered or "spanish" in lowered:
        draw.rectangle(box, fill="#d5a72d", outline="#3c3c3c", width=7)
        draw.rectangle((box[0], box[1], box[2], 350), fill="#aa2728")
        draw.rectangle((box[0], 674, box[2], box[3]), fill="#aa2728")
        return True
    if "united states" in lowered or "american" in lowered:
        draw.rectangle(box, fill="white", outline="#3c3c3c", width=7)
        stripe = (box[3] - box[1]) / 13
        for index in range(0, 13, 2):
            draw.rectangle((box[0], box[1] + index * stripe, box[2], box[1] + (index + 1) * stripe), fill="#b72f34")
        draw.rectangle((box[0], box[1], 760, 535), fill="#2f4d83")
        return True
    return False


def draw_clock_scene(final: Image.Image, concept: str) -> bool:
    match = re.fullmatch(r"(?:mission-)?clock(\d{1,2})", concept.lower())
    if not match:
        return False
    hour = int(match.group(1)) % 12
    draw = ImageDraw.Draw(final)
    center = (768, 510)
    radius = 300
    draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
                 fill="#f7f4ec", outline="#343b3e", width=18)
    for index in range(12):
        angle = math.radians(index * 30 - 90)
        x1 = center[0] + int((radius - 42) * math.cos(angle))
        y1 = center[1] + int((radius - 42) * math.sin(angle))
        x2 = center[0] + int((radius - 76) * math.cos(angle))
        y2 = center[1] + int((radius - 76) * math.sin(angle))
        draw.line((x1, y1, x2, y2), fill="#343b3e", width=12)
    hour_angle = math.radians(hour * 30 - 90)
    draw.line((center, (center[0] + int(160 * math.cos(hour_angle)),
                        center[1] + int(160 * math.sin(hour_angle)))), fill="#2f716d", width=24)
    draw.line((center, (center[0], center[1] - 225)), fill="#343b3e", width=17)
    draw.ellipse((748, 490, 788, 530), fill="#343b3e")
    return True


def draw_day_scene(final: Image.Image, concept: str) -> bool:
    match = re.search(r"(?:day-|(mon|tues|wednes|thurs|fri|satur|sun)day)", concept.lower())
    aliases = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
               "mon": 0, "tues": 1, "wednes": 2, "thurs": 3, "satur": 5}
    index = None
    short = re.search(r"day-(mon|tue|wed|thu|fri|sat|sun)", concept.lower())
    if short:
        index = aliases[short.group(1)]
    elif match and match.group(1):
        index = aliases.get(match.group(1))
    if index is None:
        return False
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((200, 280, 1336, 735), radius=58, fill="#f8f4ea", outline="#4d5558", width=12)
    for day in range(7):
        x = 315 + day * 151
        fill = "#e3a13a" if day == index else "#d8dedc"
        outline = "#8c5718" if day == index else "#707a7d"
        draw.ellipse((x - 52, 455 - 52, x + 52, 455 + 52), fill=fill, outline=outline, width=8)
        if day >= 5:
            draw.ellipse((x - 21, 421, x + 21, 463), fill="#f1c34e")
        else:
            draw.line((x - 18, 432, x + 18, 478), fill="#697d87", width=8)
            draw.line((x + 18, 432, x - 18, 478), fill="#697d87", width=8)
    return True


def build_asset(item: dict[str, object]) -> None:
    destination = ASSET_ROOT / str(item["filename"])
    if destination.is_file():
        return
    concept = str(item["concept"])
    description = str(item["description"])
    text = f"{concept} {description}"
    accent = color_for(text) or "#e0a84c"
    final = background(accent)
    n_scene = re.fullmatch(r"n(\d{1,2})", concept.lower())
    if n_scene:
        draw_number_scene(final, int(n_scene.group(1)))
        destination.parent.mkdir(parents=True, exist_ok=True)
        final.save(destination, format="WEBP", quality=88, method=6)
        return
    exact_number = NUMBER_WORDS.get(concept.lower().strip())
    if exact_number:
        draw_number_scene(final, exact_number)
        destination.parent.mkdir(parents=True, exist_ok=True)
        final.save(destination, format="WEBP", quality=88, method=6)
        return
    if draw_clock_scene(final, concept) or draw_day_scene(final, concept):
        destination.parent.mkdir(parents=True, exist_ok=True)
        final.save(destination, format="WEBP", quality=88, method=6)
        return
    if draw_body_scene(final, concept):
        destination.parent.mkdir(parents=True, exist_ok=True)
        final.save(destination, format="WEBP", quality=88, method=6)
        return
    if draw_country_flag(final, text):
        destination.parent.mkdir(parents=True, exist_ok=True)
        final.save(destination, format="WEBP", quality=88, method=6)
        return
    candidates = source_files(concept)
    if not candidates:
        candidates = source_files(description)
    count = detected_count(concept)

    if candidates and count > 1 and len(candidates) == 1:
        count = min(count, 10)
        columns = min(5, count)
        rows = math.ceil(count / columns)
        panel_w = min(260, 1240 // columns)
        panel_h = min(260, 700 // rows)
        start_x = (SIZE[0] - (columns * panel_w + (columns - 1) * 18)) // 2
        start_y = (SIZE[1] - (rows * panel_h + (rows - 1) * 18)) // 2
        for index in range(count):
            panel = placed_source(candidates[0], (panel_w, panel_h))
            if panel:
                x = start_x + (index % columns) * (panel_w + 18)
                y = start_y + (index // columns) * (panel_h + 18)
                final.paste(panel, (x, y), panel)
    elif candidates:
        count_panels = len(candidates)
        panel_w = 1120 if count_panels == 1 else 620 if count_panels == 2 else 430
        panel_h = 730
        gap = 32
        start_x = (SIZE[0] - (count_panels * panel_w + (count_panels - 1) * gap)) // 2
        for index, filename in enumerate(candidates):
            panel = placed_source(filename, (panel_w, panel_h))
            if panel:
                if "far" in text.lower() and index == 0:
                    panel = panel.resize((round(panel.width * 0.58), round(panel.height * 0.58)), Image.Resampling.LANCZOS)
                final.paste(panel, (start_x + index * (panel_w + gap), 150), panel)
    else:
        fallback_files = ["a1_ana.webp"]
        if any(word in text.lower() for word in ("we", "they", "pair", "people")):
            fallback_files.append("a1_luis.webp")
        panel_w = 620 if len(fallback_files) > 1 else 900
        start_x = (SIZE[0] - (len(fallback_files) * panel_w + (len(fallback_files) - 1) * 30)) // 2
        for index, filename in enumerate(fallback_files):
            panel = placed_source(filename, (panel_w, 730))
            if panel:
                final.paste(panel, (start_x + index * (panel_w + 30), 150), panel)
    draw_overlays(final, concept)
    destination.parent.mkdir(parents=True, exist_ok=True)
    final.save(destination, format="WEBP", quality=88, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deterministic 3:2 A1 scene composites.")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = payload["assets"]
    if args.force:
        for item in assets:
            path = ASSET_ROOT / str(item["filename"])
            if item["source"] != "existing" and path.is_file():
                path.unlink()
    for item in assets:
        build_asset(item)
    missing = [item["filename"] for item in assets if not (ASSET_ROOT / item["filename"]).is_file()]
    if missing:
        raise SystemExit(f"Missing {len(missing)} media assets: {missing[:10]}")
    print(f"Prepared {len(assets)} media assets at 1536x1024.")


if __name__ == "__main__":
    main()
