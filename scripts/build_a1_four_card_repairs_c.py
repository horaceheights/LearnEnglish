from __future__ import annotations

import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

try:
    from scripts.build_a1_units3_5_semantic_repairs import (
        GREEN,
        GOLD,
        INK,
        RED,
        TEAL,
        apple,
        arrow,
        badge,
        person,
        phone,
    )
    from scripts.build_a1_unit7_semantic_repairs import draw_person
except ModuleNotFoundError:  # Direct `python scripts/...` execution.
    from build_a1_units3_5_semantic_repairs import (
        GREEN,
        GOLD,
        INK,
        RED,
        TEAL,
        apple,
        arrow,
        badge,
        person,
        phone,
    )
    from build_a1_unit7_semantic_repairs import draw_person


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
SIZE = (1536, 1024)
SAFE_LEFT = 358
SAFE_RIGHT = 1178
CREAM = "#f8f2e7"
BLUE = "#2671c8"


TARGETS = {
    "train-arrives-9": "a1_scene_train-arrives-9-00_e656d46.webp",
    "train-leaves-8-night": "a1_scene_train-leaves-8-00-night_c9b7ada.webp",
    "train-leaves-8": "a1_scene_train-leaves-8-00_4f3f6e6.webp",
    "train-leaves-9": "a1_scene_train-leaves-9-00_499abf3.webp",
    "turn-right-cross-station": "a1_scene_turn-right-cross-station_338607c.webp",
    "woman-happy": "a1_scene_woman-happy_259eb14.webp",
    "woman-wants-three-red-apples": "a1_scene_woman-wants-three-red-apples_dfcb889.webp",
    "woman-wants-two-green-apples": "a1_scene_woman-wants-two-green-apples_2751439.webp",
    "woman-wants-two-red-apples": "a1_scene_woman-wants-two-red-apples_ba4c073.webp",
    "you-have-phone": "a1_scene_you-have-phone_6017478.webp",
    "two-blue-cars": "unit2_mission_two_blue_cars.webp",
}


def font(size: int, *, bold: bool = True) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    )
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def canvas(accent: str = "#e5bc66") -> Image.Image:
    image = Image.new("RGB", SIZE, CREAM)
    glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-280, -420, 920, 730), fill=accent + "45")
    draw.ellipse((760, 370, 1790, 1370), fill="#72b8a23a")
    glow = glow.filter(ImageFilter.GaussianBlur(88))
    image.paste(glow, (0, 0), glow)
    return image


def centered_text(draw: ImageDraw.ImageDraw, center: tuple[int, int], text: str, size: int, fill: str = INK) -> None:
    fnt = font(size)
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text(
        (center[0] - (box[2] - box[0]) / 2, center[1] - (box[3] - box[1]) / 2),
        text,
        font=fnt,
        fill=fill,
    )


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def fit_source(filename: str, size: tuple[int, int], *, crop: tuple[int, int, int, int] | None = None) -> Image.Image:
    path = ASSET_ROOT / filename
    if not path.is_file():
        raise FileNotFoundError(path)
    with Image.open(path) as opened:
        image = opened.convert("RGB")
        if crop is not None:
            image = image.crop(crop)
        return ImageOps.fit(image, size, Image.Resampling.LANCZOS)


def paste_card(base: Image.Image, source: Image.Image, box: tuple[int, int, int, int], radius: int = 34) -> None:
    width, height = box[2] - box[0], box[3] - box[1]
    fitted = ImageOps.fit(source.convert("RGB"), (width, height), Image.Resampling.LANCZOS)
    mask = rounded_mask((width, height), radius)
    base.paste(fitted, (box[0], box[1]), mask)
    ImageDraw.Draw(base).rounded_rectangle(box, radius=radius, outline=INK, width=8)


def station_icon(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = box
    draw.rounded_rectangle(box, radius=22, fill="#f8f5eb", outline=INK, width=8)
    cx = (left + right) // 2
    draw.polygon(((left + 18, top + 62), (cx, top + 10), (right - 18, top + 62)), fill=GOLD, outline=INK)
    draw.rectangle((left + 38, top + 62, right - 38, bottom - 30), fill="#d8e0de", outline=INK, width=7)
    draw.line((left + 22, bottom - 14, right - 22, bottom - 14), fill=INK, width=7)


def moon(draw: ImageDraw.ImageDraw, x: int, y: int, radius: int = 58) -> None:
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#f5d26a", outline=INK, width=6)
    draw.ellipse((x - 10, y - radius - 12, x + radius + 35, y + radius - 8), fill=CREAM)


def train_schedule(source_name: str, *, time_text: str, arrives: bool, night: bool) -> Image.Image:
    image = canvas("#d9c58c" if not night else "#a8b1cf")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((388, 40, 1148, 980), radius=62, fill="#fffaf0", outline=INK, width=10)

    # Keep the exact train photo, time, direction, and station inside the common
    # centered 4:5 safe area used by the mobile four-card grid.
    source = fit_source(source_name, (660, 420), crop=(125, 275, 855, 790))
    paste_card(image, source, (438, 250, 1098, 670), 32)

    if night:
        moon(draw, 474, 145, 58)
        badge_box = (570, 72, 1075, 222)
    else:
        badge_box = (545, 72, 1045, 222)
    draw.rounded_rectangle(badge_box, radius=34, fill="#243740", outline=INK, width=6)
    centered_text(draw, ((badge_box[0] + badge_box[2]) // 2, 137), time_text, 70, "#ffffff")

    station_icon(draw, (875, 720, 1085, 920))
    if arrives:
        arrow(draw, (565, 820), (840, 820), TEAL)
    else:
        arrow(draw, (840, 820), (565, 820), "#cc4f46")
    return image


def turn_right_cross_station() -> Image.Image:
    image = canvas("#d5d1b6")
    draw = ImageDraw.Draw(image)
    # Full-bleed map. The route, crosswalk, turn, and station all live in the
    # shared safe area rather than in the disposable landscape edges.
    draw.rectangle((0, 0, 1536, 1024), fill="#ddd3b9")
    draw.rectangle((625, 0, 915, 1024), fill="#687882")
    draw.rectangle((0, 505, 1536, 705), fill="#687882")
    draw.line((770, 0, 770, 1024), fill="#eef0e8", width=8)
    draw.line((0, 605, 1536, 605), fill="#eef0e8", width=8)
    for index in range(5):
        y = 510 + index * 36
        draw.rounded_rectangle((680, y, 860, y + 21), radius=7, fill="#fbf7e9")

    # Start below the intersection, cross the street, then turn right.
    draw.ellipse((732, 885, 808, 961), fill="#e7594f", outline=INK, width=8)
    draw.line((770, 900, 770, 405), fill=TEAL, width=38)
    draw.line((770, 405, 975, 405), fill=TEAL, width=38)
    draw.polygon(((975, 350), (1080, 405), (975, 460)), fill=TEAL, outline=TEAL)

    station = fit_source("a1_station.webp", (250, 170))
    paste_card(image, station, (875, 105, 1125, 275), 22)
    return image


def woman_happy() -> Image.Image:
    image = canvas("#efd9ad")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((390, 55, 1146, 969), radius=62, fill="#fff8e9", outline=INK, width=9)
    draw_person(draw, 768, 560, 0.88, shirt="#d66d57", mood="happy", arms="raised")
    # Small celebratory rays strengthen the feeling without introducing a
    # second, contradictory identity.
    for degrees in (205, 235, 305, 335):
        angle = math.radians(degrees)
        x1 = 768 + int(310 * math.cos(angle))
        y1 = 430 + int(230 * math.sin(angle))
        x2 = 768 + int(360 * math.cos(angle))
        y2 = 430 + int(280 * math.sin(angle))
        draw.line((x1, y1, x2, y2), fill=GOLD, width=16)
    return image


def woman_wants_apples(count: int, color: str) -> Image.Image:
    image = canvas("#9fcbae")
    draw = ImageDraw.Draw(image)
    marks = person(draw, 555, 900, "Woman", 0.70, "point-right", False)
    if count == 3:
        positions = ((865, 540), (1030, 540), (948, 700))
    elif count == 2:
        positions = ((870, 610), (1040, 610))
    else:
        raise ValueError(count)
    for x, y in positions:
        apple(draw, x, y, 0.76, color)
    badge(draw, 950, 260, str(count), GOLD, 155)
    arrow(draw, (marks["right_hand"][0] + 25, marks["right_hand"][1] - 5), (800, 600), TEAL)
    draw.arc((735, 545, 825, 635), 115, 245, fill=TEAL, width=11)
    return image


def you_have_phone() -> Image.Image:
    image = canvas("#ddc991")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((390, 55, 1146, 969), radius=62, fill="#fff8e9", outline=INK, width=9)
    badge(draw, 768, 170, "YOU", "#7653a3", 300)
    person(draw, 768, 910, "Man", 0.72, "hold", False)
    # Draw the phone over the held-object zone so both hands and the exact
    # singular object remain visible in the fixed crop.
    phone(draw, 768, 735, 0.82)
    return image


def two_blue_cars() -> Image.Image:
    image = canvas("#d5e0ea")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((388, 45, 1148, 979), radius=62, fill="#fffaf0", outline=INK, width=9)
    source_name = "a1_two-blue-cars.webp"
    # Reuse both exact blue cars from the verified object source, but stack the
    # two source halves vertically so neither car is sacrificed by 4:5 cover.
    first = fit_source(source_name, (610, 330), crop=(70, 210, 755, 760))
    second = fit_source(source_name, (610, 330), crop=(780, 210, 1465, 760))
    paste_card(image, first, (463, 175, 1073, 505), 24)
    paste_card(image, second, (463, 535, 1073, 865), 24)
    badge(draw, 768, 925, "2", GOLD, 145)
    return image


def output_name(source_name: str) -> str:
    return source_name.removesuffix(".webp") + "_four-card.webp"


def save(image: Image.Image, source_name: str) -> Path:
    output = ASSET_ROOT / output_name(source_name)
    image.convert("RGB").save(output, "WEBP", quality=94, method=6)
    with Image.open(output) as opened:
        if opened.size != SIZE or opened.format != "WEBP":
            raise RuntimeError(f"Invalid four-card repair output: {output.name} ({opened.format}, {opened.size})")
    return output


def build_all() -> dict[str, Image.Image]:
    return {
        "train-arrives-9": train_schedule(TARGETS["train-arrives-9"], time_text="9:00", arrives=True, night=False),
        "train-leaves-8-night": train_schedule(TARGETS["train-leaves-8-night"], time_text="8:00 PM", arrives=False, night=True),
        "train-leaves-8": train_schedule(TARGETS["train-leaves-8"], time_text="8:00", arrives=False, night=False),
        "train-leaves-9": train_schedule(TARGETS["train-leaves-9"], time_text="9:00", arrives=False, night=False),
        "turn-right-cross-station": turn_right_cross_station(),
        "woman-happy": woman_happy(),
        "woman-wants-three-red-apples": woman_wants_apples(3, RED),
        "woman-wants-two-green-apples": woman_wants_apples(2, GREEN),
        "woman-wants-two-red-apples": woman_wants_apples(2, RED),
        "you-have-phone": you_have_phone(),
        "two-blue-cars": two_blue_cars(),
    }


def main() -> None:
    rendered = build_all()
    if set(rendered) != set(TARGETS):
        raise RuntimeError(f"Four-card repair registry drift: rendered={sorted(rendered)} targets={sorted(TARGETS)}")
    for key, image in rendered.items():
        path = save(image, TARGETS[key])
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        print(f"{path.name}\t{digest}")
    print(f"Rebuilt {len(TARGETS)} crop-safe four-card assets (batch C).")


if __name__ == "__main__":
    main()
