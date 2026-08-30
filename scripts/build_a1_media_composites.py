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

OBJECT_PATTERNS = [
    (r"\bstrawberr(?:y|ies)\b", "strawberry"),
    (r"\bapples?\b", "apple"),
    (r"\boranges?\b", "orange"),
    (r"\beggs?\b", "egg"),
    (r"\bchairs?\b", "chair"),
    (r"\bbooks?\b", "book"),
    (r"\bcars?\b", "car"),
    (r"\bpens?\b", "pen"),
    (r"\bbags?\b", "bag"),
    (r"\bphones?\b", "phone"),
    (r"\bjackets?\b", "jacket"),
    (r"\bshirts?\b", "shirt"),
    (r"\bshoes?\b", "shoes"),
]

DEFAULT_OBJECT_COLORS = {
    "apple": "#c83a36", "strawberry": "#c83a36", "orange": "#e8942f",
    "egg": "#f4eee0", "chair": "#3974b8", "book": "#3974b8",
    "car": "#3974b8", "pen": "#e5bd37", "bag": "#f5f3ed",
    "phone": "#252525", "jacket": "#3974b8", "shirt": "#c83a36",
    "shoes": "#252525",
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


def quantity_count(text: str) -> int:
    lowered = text.lower()
    for word, number in NUMBER_WORDS.items():
        if re.search(rf"\b{word}\b", lowered):
            return number
    match = re.search(r"(?<![:$\d])(\d{1,2})(?![:$\d])\b", lowered)
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
    if "do not" in lowered or "does not" in lowered or "cannot" in lowered or "not allowed" in lowered or "blocked" in lowered:
        draw.line((220, 820, 1320, 200), fill="#c63f3a", width=52)
    if "like" in lowered and "do not" not in lowered and "does not" not in lowered:
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


def object_kind(text: str) -> str | None:
    lowered = text.lower().replace("-", " ")
    return next((kind for pattern, kind in OBJECT_PATTERNS if re.search(pattern, lowered)), None)


def draw_object_icon(
    draw: ImageDraw.ImageDraw,
    kind: str,
    box: tuple[int, int, int, int],
    fill: str,
) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    outline = "#27363b"
    line = max(5, round(min(w, h) * .04))
    if kind == "apple":
        draw.ellipse((x0 + .18*w, y0 + .20*h, x1 - .18*w, y1 - .08*h), fill=fill, outline=outline, width=line)
        draw.line((cx, y0 + .22*h, cx + .04*w, y0 + .05*h), fill=outline, width=line)
        draw.ellipse((cx, y0 + .04*h, cx + .25*w, y0 + .20*h), fill="#4c985a", outline=outline, width=max(3, line // 2))
    elif kind == "strawberry":
        points = ((cx, y1 - .06*h), (x0 + .14*w, y0 + .30*h), (x1 - .14*w, y0 + .30*h))
        draw.polygon(points, fill=fill)
        draw.line((*points, points[0]), fill=outline, width=line, joint="curve")
        draw.polygon(((cx, y0 + .06*h), (cx - .14*w, y0 + .34*h), (cx + .14*w, y0 + .34*h)), fill="#4c985a")
    elif kind in {"orange", "egg"}:
        draw.ellipse((x0 + .16*w, y0 + .12*h, x1 - .16*w, y1 - .10*h), fill=fill, outline=outline, width=line)
        if kind == "egg":
            draw.ellipse((cx - .16*w, cy - .14*h, cx + .16*w, cy + .14*h), fill="#efb735", outline="#9c6815", width=max(3, line // 2))
    elif kind == "chair":
        draw.rounded_rectangle((x0 + .22*w, y0 + .08*h, x1 - .18*w, y0 + .50*h), radius=12, fill=fill, outline=outline, width=line)
        draw.rounded_rectangle((x0 + .14*w, y0 + .45*h, x1 - .12*w, y0 + .66*h), radius=12, fill=fill, outline=outline, width=line)
        draw.line((x0 + .22*w, y0 + .62*h, x0 + .20*w, y1 - .05*h), fill=outline, width=line)
        draw.line((x1 - .20*w, y0 + .62*h, x1 - .16*w, y1 - .05*h), fill=outline, width=line)
    elif kind == "book":
        draw.rounded_rectangle((x0 + .13*w, y0 + .15*h, x1 - .10*w, y1 - .13*h), radius=12, fill=fill, outline=outline, width=line)
        draw.line((x0 + .25*w, y0 + .16*h, x0 + .25*w, y1 - .14*h), fill="#f8f4e9", width=line)
    elif kind == "car":
        draw.rounded_rectangle((x0 + .10*w, y0 + .38*h, x1 - .08*w, y1 - .18*h), radius=18, fill=fill, outline=outline, width=line)
        draw.polygon(((x0 + .28*w, y0 + .38*h), (x0 + .40*w, y0 + .18*h), (x1 - .30*w, y0 + .18*h), (x1 - .16*w, y0 + .38*h)), fill=fill, outline=outline)
        for wheel_x in (x0 + .27*w, x1 - .27*w):
            draw.ellipse((wheel_x - .10*w, y1 - .30*h, wheel_x + .10*w, y1 - .10*h), fill=outline)
    elif kind == "pen":
        draw.rounded_rectangle((x0 + .08*w, cy - .12*h, x1 - .18*w, cy + .12*h), radius=10, fill=fill, outline=outline, width=line)
        draw.polygon(((x1 - .18*w, cy - .12*h), (x1 - .03*w, cy), (x1 - .18*w, cy + .12*h)), fill="#d8dde0", outline=outline)
    elif kind == "bag":
        draw.rounded_rectangle((x0 + .14*w, y0 + .25*h, x1 - .14*w, y1 - .08*h), radius=18, fill=fill, outline=outline, width=line)
        draw.arc((cx - .20*w, y0 + .05*h, cx + .20*w, y0 + .42*h), 180, 360, fill=outline, width=line)
    elif kind == "phone":
        draw.rounded_rectangle((x0 + .28*w, y0 + .06*h, x1 - .28*w, y1 - .06*h), radius=18, fill=fill, outline=outline, width=line)
        draw.rounded_rectangle((x0 + .33*w, y0 + .16*h, x1 - .33*w, y1 - .20*h), radius=8, fill="#c7e2de")
    elif kind in {"jacket", "shirt"}:
        body = ((x0 + .31*w, y0 + .18*h), (x1 - .31*w, y0 + .18*h), (x1 - .23*w, y1 - .06*h), (x0 + .23*w, y1 - .06*h))
        draw.polygon(body, fill=fill)
        draw.line((*body, body[0]), fill=outline, width=line, joint="curve")
        sleeve_y = y0 + (.36 if kind == "shirt" else .68)*h
        draw.polygon(((x0 + .31*w, y0 + .20*h), (x0 + .06*w, sleeve_y), (x0 + .18*w, sleeve_y + .10*h), (x0 + .35*w, y0 + .42*h)), fill=fill, outline=outline)
        draw.polygon(((x1 - .31*w, y0 + .20*h), (x1 - .06*w, sleeve_y), (x1 - .18*w, sleeve_y + .10*h), (x1 - .35*w, y0 + .42*h)), fill=fill, outline=outline)
        if kind == "jacket":
            draw.line((cx, y0 + .20*h, cx, y1 - .08*h), fill="#f5f3ed", width=line)
    elif kind == "shoes":
        for offset in (-.22, .22):
            sx = cx + offset*w
            draw.rounded_rectangle((sx - .18*w, cy - .05*h, sx + .18*w, cy + .22*h), radius=15, fill=fill, outline=outline, width=line)


def draw_quantity_color_scene(final: Image.Image, concept: str, description: str) -> bool:
    kind = object_kind(concept)
    text = concept if kind else description
    kind = kind or object_kind(description)
    if not kind:
        return False
    lowered = text.lower().replace("-", " ")
    normalized_concept = re.sub(r"[^a-z0-9]+", " ", concept.lower()).strip()
    has_quantity = any(re.search(rf"\b{word}\b", lowered) for word in NUMBER_WORDS) or bool(re.search(r"\b\d{1,2}\b", lowered))
    has_color = any(re.search(rf"\b{name}\b", lowered) for name in COLORS)
    if not (has_quantity or has_color):
        return False
    number_words = "|".join(NUMBER_WORDS)
    color_words = "|".join(COLORS)
    object_words = "apples?|strawberr(?:y|ies)|oranges?|eggs?|chairs?|books?|cars?|pens?|bags?|phones?|jackets?|shirts?|shoes?"
    simple_object = bool(re.fullmatch(rf"(?:(?:{number_words})\s+)?(?:(?:{color_words})\s+)?(?:{object_words})", normalized_concept))
    simple_sentence = bool(re.fullmatch(rf"(?:the\s+)?(?:{object_words})\s+(?:is|are)\s+(?:{color_words})", normalized_concept))
    preference = bool(re.search(r"\b(?:like|likes|want|wants)\b", normalized_concept) and re.search(rf"\b(?:{number_words})\b", normalized_concept))
    description_only = normalized_concept in {"red", "green", "two", "four", "five"}
    if not (simple_object or simple_sentence or preference or description_only):
        return False
    count = min(quantity_count(text), 10)
    defaults = {"apple": "#c83a36", "strawberry": "#c83a36", "orange": "#e8942f", "egg": "#f4eee0", "chair": "#3974b8", "book": "#3974b8", "car": "#3974b8", "pen": "#e5bd37", "bag": "#f5f3ed", "phone": "#252525", "jacket": "#3974b8", "shirt": "#c83a36", "shoes": "#252525"}
    color = color_for(text) or defaults[kind]
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((90, 75, 1446, 949), radius=70, fill="#fbf8f1", outline="#29414a", width=12)
    columns, rows = min(5, count), math.ceil(count / min(5, count))
    cell_w, cell_h = min(245, 1160 // columns), min(300, 700 // rows)
    start_x, start_y = (1536 - columns * cell_w) // 2, (1024 - rows * cell_h) // 2 + 25
    for index in range(count):
        col, row = index % columns, index // columns
        margin = max(12, round(min(cell_w, cell_h) * .08))
        box = (start_x + col*cell_w + margin, start_y + row*cell_h + margin, start_x + (col+1)*cell_w - margin, start_y + (row+1)*cell_h - margin)
        draw_object_icon(draw, kind, box, color)
    draw.ellipse((112, 95, 254, 237), fill="#ffffff", outline="#29414a", width=8)
    draw.text((154 if count < 10 else 132, 111), str(count), font=font(82), fill="#29414a")
    semantic_text = f"{concept} {description}".lower()
    people = 2 if re.search(r"\b(pair|learners|they)\b", semantic_text) else 1 if re.search(r"\b(man|woman|boy|girl|avatar|learner)\b", semantic_text) else 0
    for index in range(people):
        px = 1260 + index * 82
        draw.ellipse((px, 105, px + 58, 163), fill="#c58b64", outline="#27363b", width=5)
        draw.line((px + 29, 163, px + 29, 230), fill="#3974b8", width=24)
    if "like" in semantic_text or "want" in semantic_text:
        draw.text((1080, 88), "♥", font=font(105), fill="#c94762", stroke_width=4, stroke_fill="#ffffff")
    if re.search(r"\b(?:does|do) not like\b", semantic_text):
        draw.line((1070, 100, 1200, 225), fill="#c63f3a", width=20)
    return True


def semantic_number(text: str) -> int | None:
    digit = re.search(r"\$(\d+)|\b(\d{1,2})(?::00)?\b", text)
    if digit:
        return int(digit.group(1) or digit.group(2))
    return next((value for word, value in NUMBER_WORDS.items() if re.search(rf"\b{word}\b", text)), None)


def draw_price_scene(final: Image.Image, concept: str, description: str) -> bool:
    text = f"{concept} {description}".lower()
    if "dollar" not in text and not re.search(r"\$\d+", text):
        return False
    amount = semantic_number(text)
    if amount is None:
        return False
    item = next((name for name in ("coffee", "juice", "milk", "bread", "apple", "bag") if re.search(rf"\b{name}\b", text)), "bread")
    panel = placed_source(f"a1_{item}.webp", (820, 650))
    if panel:
        final.paste(panel, (150, 185), panel)
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((1040, 280, 1410, 720), radius=48, fill="#f3d37a", outline="#533b1f", width=12)
    draw.text((1100, 390), f"${amount}", font=font(145 if amount < 10 else 118), fill="#382918")
    return True


def draw_negative_preference_scene(final: Image.Image, concept: str) -> bool:
    lowered = concept.lower().replace("-", " ")
    if not re.search(r"\b(?:do|does) not like\b", lowered) or quantity_count(lowered) != 1:
        return False
    candidates = source_files(concept)
    if not candidates:
        return False
    panel = placed_source(candidates[0], (1000, 720))
    if panel:
        final.paste(panel, (268, 150), panel)
    draw = ImageDraw.Draw(final)
    draw.line((300, 820, 1236, 204), fill="#c63f3a", width=56)
    draw.ellipse((1110, 90, 1390, 370), outline="#c63f3a", width=24)
    draw.line((1160, 320, 1340, 140), fill="#c63f3a", width=24)
    return True


def draw_compound_schedule_scene(final: Image.Image, concept: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", concept.lower()).strip()
    is_help_request = normalized == "can you help me the bus leaves at eight"
    is_route_mission = normalized == "go straight turn right the train leaves at nine"
    if not (is_help_request or is_route_mission):
        return False

    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((55, 65, 1481, 959), radius=68, fill="#fbf8f1", outline="#29414a", width=12)
    draw.line((768, 105, 768, 920), fill="#29414a", width=10)

    if is_help_request:
        # The same learner asks for help and then reads the bus departure card.
        for center_x in (325, 930):
            draw.ellipse((center_x - 62, 250, center_x + 62, 374), fill="#c58b64", outline="#27363b", width=7)
            draw.line((center_x, 375, center_x, 660), fill="#3974b8", width=62)
            draw.line((center_x, 450, center_x - 105, 560), fill="#27363b", width=24)
            draw.line((center_x, 450, center_x + 105, 540), fill="#27363b", width=24)
        draw.rounded_rectangle((430, 170, 690, 370), radius=50, fill="#ffffff", outline="#29414a", width=8)
        draw.text((515, 185), "?", font=font(120), fill="#2f716d")
        draw.polygon(((460, 350), (420, 430), (530, 365)), fill="#ffffff", outline="#29414a")
        draw.rounded_rectangle((115, 710, 650, 860), radius=28, fill="#d8e8df", outline="#29414a", width=8)
        draw.line((170, 790, 580, 790), fill="#64777d", width=15)
        draw_arrow(draw, (195, 790), (520, 790), "#2f716d")
        vehicle = "bus"
        hour = 8
    else:
        # One continuous mission map: straight, right, station, then train departure.
        draw.rectangle((115, 155, 690, 865), fill="#dce7dc", outline="#29414a", width=8)
        draw.line((250, 790, 250, 345), fill="#59666a", width=140)
        draw.line((250, 345, 610, 345), fill="#59666a", width=140)
        draw_arrow(draw, (250, 760), (250, 420), "#2f716d")
        draw_arrow(draw, (310, 345), (570, 345), "#2f716d")
        draw.rounded_rectangle((490, 120, 700, 270), radius=24, fill="#e4a63a", outline="#29414a", width=8)
        draw.polygon(((475, 135), (595, 55), (715, 135)), fill="#e4a63a", outline="#29414a")
        vehicle = "train"
        hour = 9

    panel = placed_source("place_bus.webp" if vehicle == "bus" else "a1_train.webp", (400, 350))
    if panel:
        final.paste(panel, (1030, 510), panel)
    draw.rounded_rectangle((1025, 130, 1405, 310), radius=34, fill="#27363b")
    draw.text((1080, 160), f"{hour}:00", font=font(86), fill="#ffffff")
    draw_arrow(draw, (1270, 460), (1030, 460), "#c34a42")
    return True


def draw_schedule_scene(final: Image.Image, concept: str, description: str) -> bool:
    concept_text = concept.lower().replace("-", " ")
    lowered = f"{concept_text} {description.lower().replace('-', ' ')}"
    vehicle_text = concept_text if re.search(r"\b(?:bus|train)\b", concept_text) else lowered
    movement_text = concept_text if re.search(r"\b(?:arrives?|leaves?)\b", concept_text) else lowered
    time_text = concept_text if semantic_number(concept_text) is not None else lowered
    cue_text = concept_text if re.search(r"\b(?:morning|afternoon|night)\b", concept_text) else lowered
    vehicle = "bus" if re.search(r"\bbus\b", vehicle_text) else "train" if re.search(r"\btrain\b", vehicle_text) else None
    movement = "arrives" if re.search(r"\b(?:arrives?|toward)\b", movement_text) else "leaves" if re.search(r"\b(?:leaves?|departure|away)\b", movement_text) else None
    if not vehicle or not movement or "go straight" in lowered or "help me" in lowered:
        return False
    hour = semantic_number(time_text)
    if hour is None:
        return False
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((80, 70, 1456, 954), radius=72, fill="#f8f5ed", outline="#29414a", width=12)
    panel = placed_source("place_bus.webp" if vehicle == "bus" else "a1_train.webp", (720, 560))
    if panel:
        final.paste(panel, (130, 250), panel)
    draw.rectangle((1100, 360, 1340, 790), fill="#d7ddd9", outline="#29414a", width=10)
    draw.polygon(((1070, 360), (1220, 240), (1370, 360)), fill="#e4a63a", outline="#29414a")
    draw_arrow(draw, (875, 700), (1070, 700), "#2f716d") if movement == "arrives" else draw_arrow(draw, (1070, 700), (875, 700), "#c34a42")
    draw.rounded_rectangle((965, 90, 1415, 245), radius=34, fill="#27363b")
    suffix = " PM" if "night" in cue_text or "afternoon" in cue_text else " AM" if "morning" in cue_text else ""
    draw.text((995 if suffix else 1040, 112), f"{hour}:00{suffix}", font=font(62 if suffix else 84), fill="#ffffff")
    if "night" in cue_text:
        draw.ellipse((130, 90, 260, 220), fill="#f7df8a", outline="#29414a", width=6)
        draw.ellipse((185, 65, 295, 205), fill="#f8f5ed")
    elif "morning" in cue_text or "afternoon" in cue_text:
        draw.ellipse((130, 90, 260, 220), fill="#efb735", outline="#9c6815", width=6)
    return True


def draw_counted_meal_scene(final: Image.Image, concept: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", concept.lower()).strip()
    match = re.fullmatch(r"(one|two|three) eggs? for (breakfast|lunch)", normalized)
    if not match:
        return False
    count, meal = NUMBER_WORDS[match.group(1)], match.group(2)
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((100, 80, 1436, 944), radius=70, fill="#fbf8f1", outline="#29414a", width=12)
    draw.ellipse((330, 225, 1206, 905), fill="#e8edf0", outline="#64777d", width=12)
    columns = min(3, count)
    for index in range(count):
        x = 500 + index * (530 // max(1, columns - 1)) if columns > 1 else 700
        draw_object_icon(draw, "egg", (x, 420, x + 230, 700), "#f4eee0")
    draw.ellipse((145, 115, 275, 245), fill="#efb735", outline="#9c6815", width=7)
    if meal == "breakfast":
        draw.arc((120, 190, 300, 310), 180, 360, fill="#c26c31", width=12)
    else:
        for angle in range(0, 360, 45):
            radians = math.radians(angle)
            draw.line((210 + 80*math.cos(radians), 180 + 80*math.sin(radians), 210 + 115*math.cos(radians), 180 + 115*math.sin(radians)), fill="#d89722", width=10)
    return True


def draw_ana_action_scene(final: Image.Image, concept: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", concept.lower()).strip()
    actions = {
        "ana breakfast": "breakfast", "breakfast morning": "breakfast",
        "mission breakfast": "breakfast", "mission brush": "brush",
        "ana brush teeth": "brush", "ana dressed": "dress",
        "ana study english": "study", "ana wake": "wake",
        "ana wash face": "wash",
    }
    action = actions.get(normalized)
    if not action:
        return False
    draw = ImageDraw.Draw(final)
    room_colors = {"breakfast": "#f4dfb8", "brush": "#d7e9e8", "wash": "#d7e9e8", "dress": "#e8d9cf", "study": "#e5e1c8", "wake": "#d9e2ef"}
    draw.rounded_rectangle((80, 70, 1456, 954), radius=72, fill=room_colors[action], outline="#29414a", width=12)
    # One consistent stylized Ana performs the action in a single scene.
    draw.ellipse((560, 210, 780, 430), fill="#4b2d23", outline="#27363b", width=8)
    draw.ellipse((590, 230, 750, 400), fill="#c98c68", outline="#27363b", width=6)
    draw.ellipse((630, 295, 646, 311), fill="#27363b")
    draw.ellipse((696, 295, 712, 311), fill="#27363b")
    draw.polygon(((575, 420), (765, 420), (830, 760), (510, 760)), fill="#2f8b84", outline="#27363b")
    if action == "breakfast":
        draw.rounded_rectangle((340, 690, 1210, 810), radius=18, fill="#a97442", outline="#27363b", width=10)
        draw.ellipse((745, 580, 1015, 755), fill="#f5f3ed", outline="#64777d", width=8)
        draw_object_icon(draw, "egg", (810, 610, 935, 735), "#f4eee0")
        draw.line((755, 500, 860, 640), fill="#c98c68", width=34)
        draw.ellipse((170, 120, 300, 250), fill="#efb735", outline="#9c6815", width=7)
    elif action == "brush":
        draw.rounded_rectangle((825, 555, 1220, 735), radius=30, fill="#f6f8f7", outline="#64777d", width=9)
        draw.arc((920, 450, 1110, 610), 180, 360, fill="#64777d", width=14)
        draw.line((745, 342, 900, 315), fill="#f5f3ed", width=18)
        draw.rectangle((880, 290, 930, 340), fill="#3974b8")
        draw.line((760, 520, 875, 330), fill="#c98c68", width=34)
    elif action == "wash":
        draw.rounded_rectangle((825, 555, 1220, 735), radius=30, fill="#f6f8f7", outline="#64777d", width=9)
        draw.line((575, 520, 620, 360), fill="#c98c68", width=36)
        draw.line((765, 520, 720, 360), fill="#c98c68", width=36)
        for x, y in ((565, 330), (775, 330), (545, 390), (795, 390)):
            draw.ellipse((x, y, x + 24, y + 38), fill="#4f9bc3")
    elif action == "dress":
        draw_object_icon(draw, "jacket", (790, 270, 1190, 790), "#3974b8")
        draw.line((760, 500, 900, 500), fill="#c98c68", width=36)
    elif action == "study":
        draw.rounded_rectangle((330, 690, 1210, 810), radius=18, fill="#a97442", outline="#27363b", width=10)
        draw.polygon(((750, 560), (950, 610), (1120, 545), (1120, 730), (950, 780), (750, 730)), fill="#f7f4ec", outline="#27363b")
        draw.line((950, 610, 950, 780), fill="#64777d", width=6)
        draw.text((790, 625), "ABC", font=font(52), fill="#3974b8")
        draw.line((755, 510, 840, 620), fill="#c98c68", width=34)
    else:
        draw.rounded_rectangle((330, 600, 1230, 850), radius=45, fill="#e9edf3", outline="#27363b", width=10)
        draw.rectangle((330, 750, 1230, 865), fill="#8b633f", outline="#27363b", width=9)
        draw.rounded_rectangle((1040, 470, 1290, 590), radius=20, fill="#27363b")
        draw.text((1080, 488), "7:00", font=font(58), fill="#7de0bd")
        draw.ellipse((170, 120, 300, 250), fill="#efb735", outline="#9c6815", width=7)
    return True


def draw_sequence_scene(final: Image.Image, concept: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", concept.lower()).strip()
    sequences = {
        "first wake": ("wake", 0), "then breakfast": ("wake", 1),
        "first school": ("school", 0), "then study": ("school", 1),
        "mission sequence school study": ("school", 1),
    }
    spec = sequences.get(normalized)
    if not spec:
        return False
    kind, selected = spec
    draw = ImageDraw.Draw(final)
    for index, x in enumerate((90, 790)):
        draw.rounded_rectangle((x, 120, x + 650, 900), radius=58, fill="#fbf8f1", outline="#e4a63a" if index == selected else "#29414a", width=18 if index == selected else 10)
        draw.ellipse((x + 32, 150, x + 142, 260), fill="#e4a63a" if index == selected else "#d7ddd9", outline="#29414a", width=6)
        draw.text((x + 66, 164), str(index + 1), font=font(58), fill="#29414a")
    if kind == "wake":
        draw.rounded_rectangle((190, 520, 620, 760), radius=35, fill="#d9e2ef", outline="#27363b", width=9)
        draw.ellipse((250, 380, 355, 485), fill="#c58b64", outline="#27363b", width=6)
        draw.ellipse((520, 245, 630, 355), fill="#efb735", outline="#9c6815", width=6)
        draw.rounded_rectangle((900, 585, 1330, 720), radius=20, fill="#a97442", outline="#27363b", width=9)
        draw.ellipse((1000, 470, 1220, 650), fill="#f5f3ed", outline="#64777d", width=7)
        draw_object_icon(draw, "egg", (1050, 500, 1170, 625), "#f4eee0")
    else:
        school = placed_source("a1_school.webp", (500, 470))
        if school:
            final.paste(school, (165, 340), school)
        draw.rounded_rectangle((900, 650, 1320, 770), radius=18, fill="#a97442", outline="#27363b", width=9)
        draw.polygon(((930, 520), (1080, 560), (1250, 510), (1250, 670), (1080, 710), (930, 670)), fill="#f7f4ec", outline="#27363b")
        draw.text((985, 585), "ABC", font=font(52), fill="#3974b8")
    draw_arrow(draw, (690, 500), (770, 500), "#2f716d")
    return True


def draw_count_context_scene(final: Image.Image, concept: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", concept.lower()).strip()
    specs = {
        "three books table": (3, "book", "table"),
        "two bags table": (2, "bag", "table"),
        "two chairs dining": (2, "chair", "dining"),
        "one bed bedroom": (1, "bed", "bedroom"),
        "one lamp sofa": (1, "lamp", "sofa"),
        "one computer living": (1, "computer", "living"),
    }
    spec = specs.get(normalized)
    if not spec:
        return False
    count, kind, context = spec
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((100, 80, 1436, 944), radius=70, fill="#fbf8f1", outline="#29414a", width=12)
    if context == "table":
        draw.rounded_rectangle((380, 510, 1156, 620), radius=18, fill="#a97442", outline="#27363b", width=10)
        draw.line((450, 610, 400, 890), fill="#27363b", width=22)
        draw.line((1086, 610, 1136, 890), fill="#27363b", width=22)
        for index in range(count):
            x = 530 + index * 250
            draw_object_icon(draw, kind, (x, 250, x + 190, 515), "#3974b8" if kind == "book" else "#f5f3ed")
    elif context == "dining":
        draw.rounded_rectangle((570, 350, 970, 510), radius=18, fill="#a97442", outline="#27363b", width=10)
        for x in (300, 1030):
            draw_object_icon(draw, "chair", (x, 300, x + 260, 780), "#3974b8")
    elif context == "bedroom":
        panel = placed_source("a1_bedroom.webp", (1180, 760))
        if panel:
            final.paste(panel, (178, 132), panel)
    elif context == "sofa":
        sofa = placed_source("a1_sofa.webp", (720, 580))
        lamp = placed_source("a1_lamp.webp", (360, 580))
        if sofa:
            final.paste(sofa, (180, 230), sofa)
        if lamp:
            final.paste(lamp, (980, 230), lamp)
    else:
        room = placed_source("a1_living_room.webp", (850, 650))
        computer = placed_source("a1_computer.webp", (390, 430))
        if room:
            final.paste(room, (100, 190), room)
        if computer:
            final.paste(computer, (1030, 300), computer)
    return True


def draw_signal_scene(final: Image.Image, concept: str) -> bool:
    lowered = concept.lower().replace("-", " ")
    explicit_crossing = "street" in lowered or "crossing" in lowered or "at green" in lowered or lowered.strip() == "cross"
    if not ("signal" in lowered or explicit_crossing):
        return False
    blocked = bool(re.search(r"\b(?:red|waits?|cannot|not allowed)\b", lowered))
    allowed = not blocked and bool(re.search(r"\b(?:green|cross(?:es)?|can|allowed)\b", lowered))
    if not (blocked or allowed):
        return False
    draw = ImageDraw.Draw(final)
    draw.rectangle((0, 610, 1536, 1024), fill="#59666a")
    for x in range(90, 1450, 210):
        draw.rectangle((x, 700, x + 120, 820), fill="#f5f3ed")
    draw.rounded_rectangle((1120, 120, 1370, 560), radius=54, fill="#27363b", outline="#10191d", width=10)
    draw.ellipse((1175, 185, 1315, 325), fill="#3ca66b" if allowed else "#522f2f", outline="#f5f3ed", width=6)
    draw.ellipse((1175, 355, 1315, 495), fill="#472f2f" if allowed else "#d6433d", outline="#f5f3ed", width=6)
    people = 2 if "pair" in lowered else 1
    for index in range(people):
        px = 350 + index * 150
        draw.ellipse((px - 52, 225, px + 52, 329), fill="#c58b64", outline="#27363b", width=7)
        draw.line((px, 330, px, 585), fill="#3974b8" if "girl" not in lowered else "#8b5ca8", width=52)
        draw.line((px, 410, px - 90, 510), fill="#27363b", width=22)
        draw.line((px, 410, px + 92, 500), fill="#27363b", width=22)
        draw.line((px, 575, px - 72, 750), fill="#27363b", width=27)
        draw.line((px, 575, px + 92, 710), fill="#27363b", width=27)
    if allowed:
        draw_arrow(draw, (610, 470), (950, 470), "#2f8f62")
    else:
        draw.line((660, 350, 940, 640), fill="#c63f3a", width=34)
        draw.line((940, 350, 660, 640), fill="#c63f3a", width=34)
    return True


def draw_route_choice_scene(final: Image.Image, concept: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", concept.lower()).strip()
    specs = {
        "crosses and passes hospital": (True, "hospital", True),
        "crosses and stops at bank": (True, "bank", False),
        "crosses and stops at hospital": (True, "hospital", False),
        "does not cross and stops at hospital": (False, "hospital", False),
    }
    spec = specs.get(normalized)
    if not spec:
        return False
    crosses, destination, passes = spec
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((55, 55, 1481, 969), radius=65, fill="#dce7dc", outline="#29414a", width=12)
    draw.rectangle((630, 55, 910, 969), fill="#59666a")
    for y in range(90, 940, 150):
        draw.rectangle((715, y, 825, y + 85), fill="#f6f3e9")
    draw.ellipse((230, 760, 310, 840), fill="#c83a36", outline="#27363b", width=7)

    destination_x = 1130 if crosses else 420
    destination_y = 310 if passes else 170
    if crosses:
        points = [(270, 800), (510, 800), (510, 520), (1030, 520), (1030, destination_y + 185)]
    else:
        points = [(270, 800), (420, 680), (420, destination_y + 185)]
    draw.line(points, fill="#2f716d", width=34, joint="curve")
    draw_arrow(draw, points[-2], points[-1], "#2f716d")

    icon_name = "a1_hospital.webp" if destination == "hospital" else "a1_bank.webp"
    icon = placed_source(icon_name, (360, 310))
    if icon:
        final.paste(icon, (destination_x - 180, destination_y), icon)
    if passes:
        draw.line((destination_x, destination_y + 310, destination_x, 780), fill="#2f716d", width=34)
        draw_arrow(draw, (destination_x, 610), (destination_x, 815), "#2f716d")
    if not crosses:
        draw.line((665, 390, 875, 600), fill="#c63f3a", width=28)
        draw.line((875, 390, 665, 600), fill="#c63f3a", width=28)
    return True


def draw_spatial_scene(final: Image.Image, concept: str, description: str) -> bool:
    lowered = f"{concept} {description}".lower().replace("-", " ")
    relation = (
        "under" if re.search(r"\b(?:under|beneath|below)\b", lowered)
        else "next to" if re.search(r"\b(?:next to|beside)\b", lowered)
        else "on" if re.search(r"\b(?:on|atop)\b", lowered)
        else "in" if re.search(r"\b(?:in|inside)\b", lowered)
        else None
    )
    subject = "phone" if "phone" in lowered else "book" if "book" in lowered else "apple" if "apple" in lowered else None
    container = "table" if "table" in lowered else "bag" if "bag" in lowered else "bed" if "bed" in lowered else "chair" if "chair" in lowered else None
    if not relation or not subject or not container:
        return False
    draw = ImageDraw.Draw(final)
    draw.rounded_rectangle((100, 80, 1436, 944), radius=70, fill="#fbf8f1", outline="#29414a", width=12)
    if container == "table":
        draw.rounded_rectangle((470, 455, 1110, 570), radius=20, fill="#a97442", outline="#27363b", width=10)
        draw.line((520, 560, 470, 860), fill="#27363b", width=22)
        draw.line((1060, 560, 1110, 860), fill="#27363b", width=22)
        if "compartment" in lowered:
            draw.rounded_rectangle((610, 570, 970, 850), radius=18, fill="#b98552", outline="#27363b", width=10)
            target = (680, 610, 900, 810)
        else:
            target = (650, 255, 930, 465) if relation == "on" else (650, 620, 930, 835) if relation == "under" else (1130, 520, 1370, 750)
    elif container == "bag":
        draw_object_icon(draw, "bag", (570, 280, 1050, 820), "#d59b4a")
        if relation == "in":
            target = (690, 390, 930, 660)
            draw_object_icon(draw, subject, target, DEFAULT_OBJECT_COLORS.get(subject, "#3974b8"))
            draw.rectangle((570, 570, 1050, 820), fill="#d59b4a", outline="#27363b", width=10)
            draw.arc((650, 480, 970, 660), 0, 180, fill="#27363b", width=12)
            return True
        target = (690, 150, 930, 430) if relation == "on" else (1080, 390, 1320, 680)
    elif container == "bed":
        draw.rounded_rectangle((400, 430, 1136, 770), radius=50, fill="#d9e1e8", outline="#27363b", width=10)
        target = (640, 300, 900, 545)
    else:
        draw_object_icon(draw, "chair", (550, 220, 990, 760), DEFAULT_OBJECT_COLORS["chair"])
        target = (660, 700, 880, 910) if relation == "under" else (1020, 430, 1260, 680)
    draw_object_icon(draw, subject, target, DEFAULT_OBJECT_COLORS.get(subject, "#3974b8"))
    return True


def draw_literal_contract_scene(final: Image.Image, concept: str, description: str) -> bool:
    return (
        draw_price_scene(final, concept, description)
        or draw_negative_preference_scene(final, concept)
        or draw_compound_schedule_scene(final, concept)
        or draw_schedule_scene(final, concept, description)
        or draw_counted_meal_scene(final, concept)
        or draw_ana_action_scene(final, concept)
        or draw_sequence_scene(final, concept)
        or draw_route_choice_scene(final, concept)
        or draw_signal_scene(final, concept)
        or draw_count_context_scene(final, concept)
        or draw_spatial_scene(final, concept, description)
        or draw_quantity_color_scene(final, concept, description)
    )


def has_literal_contract(concept: str, description: str) -> bool:
    probe = background(color_for(f"{concept} {description}") or "#e0a84c")
    return draw_literal_contract_scene(probe, concept, description)


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
    if draw_literal_contract_scene(final, concept, description):
        destination.parent.mkdir(parents=True, exist_ok=True)
        final.save(destination, format="WEBP", quality=88, method=6)
        return
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
        raise RuntimeError(
            f"No literal source or reviewed generated asset exists for {destination.name}: "
            f"{concept!r}. Generic person or object fallbacks are prohibited."
        )
    draw_overlays(final, concept)
    destination.parent.mkdir(parents=True, exist_ok=True)
    final.save(destination, format="WEBP", quality=88, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deterministic 3:2 A1 scene composites.")
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--refresh-semantic-contracts",
        action="store_true",
        help="Rebuild exact quantity, color, price, schedule, and spatial contracts.",
    )
    args = parser.parse_args()
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = payload["assets"]
    if args.refresh_semantic_contracts:
        for item in assets:
            path = ASSET_ROOT / str(item["filename"])
            if (
                item["source"] != "existing"
                and path.is_file()
                and has_literal_contract(str(item["concept"]), str(item["description"]))
            ):
                path.unlink()
    if args.force:
        for item in assets:
            path = ASSET_ROOT / str(item["filename"])
            concept = str(item["concept"])
            description = str(item["description"])
            reproducible_sources = source_files(concept) or source_files(description)
            if item["source"] != "existing" and reproducible_sources and path.is_file():
                path.unlink()
    for item in assets:
        build_asset(item)
    missing = [item["filename"] for item in assets if not (ASSET_ROOT / item["filename"]).is_file()]
    if missing:
        raise SystemExit(f"Missing {len(missing)} media assets: {missing[:10]}")
    print(f"Prepared {len(assets)} media assets at 1536x1024.")


if __name__ == "__main__":
    main()
