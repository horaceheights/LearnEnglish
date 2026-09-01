from __future__ import annotations

"""Build the crop-safe four-card repair batch from audit sheets 7-12.

The mobile four-option tile displays the centered 4:5 crop of a 1536x1024
master (approximately x=358..1178).  These deterministic variants keep every
answer-critical person, object, count, direction, and place inside that safe
region while retaining a full-bleed 3:2 master for the responsive web layout.

This builder deliberately writes sibling ``*_four-card.webp`` files.  The
canonical 3:2 teaching images remain untouched and the course builder can bind
these variants only to four-card usages.
"""

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

import build_a1_unit7_semantic_repairs as unit7
import build_a1_units3_5_semantic_repairs as units35


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
SIZE = (1536, 1024)
SAFE_LEFT = 358
SAFE_RIGHT = 1178

INK = "#173640"
CREAM = "#f8f2e7"
TEAL = "#2f9182"
BLUE = "#3974b8"
GOLD = "#e3aa34"
RED = "#c8423d"
GREEN = "#408c5d"


BASE_FILENAMES = {
    "hot-jacket": "a1_scene_hot-jacket_586235b.webp",
    "hot-shirt": "a1_scene_hot-shirt_78da229.webp",
    "juice-for-dinner": "a1_scene_juice-for-dinner_d082ab8.webp",
    "one-egg-for-breakfast": "a1_scene_one-egg-for-breakfast_fad7e29.webp",
    "tea-for-breakfast": "a1_scene_tea-for-breakfast_98a3941.webp",
    "tea-for-lunch": "a1_scene_tea-for-lunch_c98eac2.webp",
    "three-eggs-for-breakfast": "a1_scene_three-eggs-for-breakfast_38c5f42.webp",
    "left-only-hospital": "a1_scene_left-only-hospital_4f9affe.webp",
    "library-right": "a1_scene_library-right_6b435ec.webp",
    "pharmacy-left": "a1_scene_pharmacy-left_1fc90a7.webp",
    "pharmacy-right": "a1_scene_pharmacy-right_99d73fd.webp",
    "right-only-station": "a1_scene_right-only-station_b733a34.webp",
    "straight-left-bank": "a1_scene_straight-left-bank_11f5a88.webp",
    "straight-left-hospital": "a1_scene_straight-left-hospital_d4ea009.webp",
    "straight-left-station": "a1_scene_straight-left-station_7883bc6.webp",
    "straight-right-bank": "a1_scene_straight-right-bank_2dc8386.webp",
    "straight-right-hospital": "a1_scene_straight-right-hospital_9271c5a.webp",
    "straight-right-station": "a1_scene_straight-right-station_6e3de89.webp",
    "library-far-from-bank": "a1_scene_library-far-from-bank_1f22e2f.webp",
    "library-far-from-park": "a1_scene_library-far-from-park_49a2d48.webp",
    "library-near-bank": "a1_scene_library-near-bank_1865f7e.webp",
    "library-near-park": "a1_scene_library-near-park_7111386.webp",
    "library-next-to-park": "a1_scene_library-next-to-park_1233b17.webp",
    "library-next-to-school": "a1_scene_library-next-to-school_e805256.webp",
    "station-far-from-park": "a1_scene_station-far-from-park_d5dce5a.webp",
    "station-near-park": "a1_scene_station-near-park_e8f4e0e.webp",
    "station-next-to-park": "a1_scene_station-next-to-park_e1bf534.webp",
    "store-far-from-park": "a1_scene_store-far-from-park_0ed30ee.webp",
    "store-near-bank": "a1_scene_store-near-bank_dd64fd0.webp",
    "store-next-to-park": "a1_scene_store-next-to-park_eafcb41.webp",
    "man-wants-two-red-apples": "a1_scene_man-wants-two-red-apples_772ff8a.webp",
    "pair-can-go-by-bus": "a1_scene_pair-can-go-by-bus_69469a0.webp",
    "pair-can-go-by-train": "a1_scene_pair-can-go-by-train_67f6004.webp",
    "pair-cannot-go-by-bus": "a1_scene_pair-cannot-go-by-bus_547b3cc.webp",
    "pair-needs-water": "a1_scene_pair-needs-water_0ff58e2.webp",
    "pair-waits-at-red-signal": "a1_scene_pair-waits-at-red-signal_5078634.webp",
    "pair-wants-chicken": "a1_scene_pair-wants-chicken_a4f08a9.webp",
    "pair-wants-fish": "a1_scene_pair-wants-fish_dedf2c8.webp",
    "pair-wants-three-eggs": "a1_scene_pair-wants-three-eggs_00d5e99.webp",
    "pair-wants-two-apples": "a1_scene_pair-wants-two-apples_35e65ce.webp",
    "pair-wants-two-eggs": "a1_scene_pair-wants-two-eggs_0cb7c59.webp",
    "rejects-tv": "a1_scene_rejects-tv_58b4949.webp",
}


PLACE_SOURCES = {
    "bank": "a1_scene_a-bank_decb678.webp",
    "hospital": "a1_scene_a-hospital_dfbc6e9.webp",
    "library": "a1_scene_a-library_985e108.webp",
    "park": "a1_scene_park_ce4151f.webp",
    "pharmacy": "a1_scene_a-pharmacy_26b3b46.webp",
    "school": "a1_scene_school_655f83b.webp",
    "station": "a1_scene_a-station_bdca78a.webp",
    "store": "a1_scene_a-store_e91614f.webp",
}


def variant_filename(base_filename: str) -> str:
    path = Path(base_filename)
    return f"{path.stem}_four-card{path.suffix}"


def font(size: int, *, bold: bool = True) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    )
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def full_bleed(top: str = "#f6ead3", bottom: str = "#dce8df") -> Image.Image:
    """A crisp full-bleed background; no padding, mirroring, or blurred fill."""

    image = Image.new("RGB", SIZE, top)
    draw = ImageDraw.Draw(image)
    for y in range(SIZE[1]):
        t = y / (SIZE[1] - 1)
        first = tuple(int(top[index : index + 2], 16) for index in (1, 3, 5))
        second = tuple(int(bottom[index : index + 2], 16) for index in (1, 3, 5))
        color = tuple(round(first[channel] * (1 - t) + second[channel] * t) for channel in range(3))
        draw.line((0, y, SIZE[0], y), fill=color)
    # Side scenery is decorative and may sit outside the mobile safe region.
    draw.ellipse((-330, -300, 320, 350), fill="#f0c96b")
    draw.ellipse((1285, 770, 1765, 1250), fill="#8ebda0")
    return image


def arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    color: str = TEAL,
    width: int = 30,
    head: int = 58,
) -> None:
    draw.line((start, end), fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    left = (
        end[0] - head * math.cos(angle) + head * 0.65 * math.sin(angle),
        end[1] - head * math.sin(angle) - head * 0.65 * math.cos(angle),
    )
    right = (
        end[0] - head * math.cos(angle) - head * 0.65 * math.sin(angle),
        end[1] - head * math.sin(angle) + head * 0.65 * math.cos(angle),
    )
    draw.polygon((end, left, right), fill=color)


def check(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int = 72) -> None:
    x, y = center
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#eaf7ef", outline=GREEN, width=10)
    draw.line((x - 35, y, x - 7, y + 30, x + 44, y - 38), fill=GREEN, width=20, joint="curve")


def cross(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int = 72) -> None:
    x, y = center
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#fff0ed", outline=RED, width=10)
    draw.line((x - 38, y - 38, x + 38, y + 38), fill=RED, width=20)
    draw.line((x + 38, y - 38, x - 38, y + 38), fill=RED, width=20)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def source_image(filename: str) -> Image.Image:
    path = ASSET_ROOT / filename
    if not path.is_file():
        raise FileNotFoundError(f"Missing deterministic source: {path}")
    with Image.open(path) as opened:
        return opened.convert("RGB")


def photo_card(
    canvas: Image.Image,
    filename: str,
    box: tuple[int, int, int, int],
    *,
    highlighted: bool = False,
    radius: int = 30,
) -> None:
    x0, y0, x1, y1 = box
    size = (x1 - x0, y1 - y0)
    fitted = ImageOps.fit(source_image(filename), size, method=Image.Resampling.LANCZOS)
    mask = rounded_mask(size, radius)
    canvas.paste(fitted, (x0, y0), mask)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(box, radius=radius, outline=GOLD if highlighted else INK, width=14 if highlighted else 8)


def draw_long_sleeved_coat(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    """Draw a winter coat whose long sleeves remain obvious at mobile size."""

    s = scale
    outline_width = max(4, round(8 * s))
    coat = BLUE
    coat_dark = "#285888"
    lining = "#eef2f0"

    # The hood sits behind the collar and distinguishes this from a collared shirt.
    draw.ellipse(
        (x - round(82 * s), y - round(205 * s), x + round(82 * s), y - round(65 * s)),
        fill=coat_dark,
        outline=INK,
        width=outline_width,
    )
    draw.ellipse(
        (x - round(54 * s), y - round(182 * s), x + round(54 * s), y - round(86 * s)),
        fill=lining,
        outline=INK,
        width=outline_width,
    )

    # Long sleeves extend from both shoulders to clearly outlined wrist cuffs.
    left_sleeve = (
        (x - round(92 * s), y - round(135 * s)),
        (x - round(175 * s), y - round(82 * s)),
        (x - round(160 * s), y + round(135 * s)),
        (x - round(98 * s), y + round(135 * s)),
        (x - round(68 * s), y - round(25 * s)),
    )
    right_sleeve = tuple((2 * x - px, py) for px, py in left_sleeve)
    draw.polygon(left_sleeve, fill=coat, outline=INK)
    draw.line((*left_sleeve, left_sleeve[0]), fill=INK, width=outline_width, joint="curve")
    draw.polygon(right_sleeve, fill=coat, outline=INK)
    draw.line((*right_sleeve, right_sleeve[0]), fill=INK, width=outline_width, joint="curve")
    for cuff_x in (x - round(129 * s), x + round(129 * s)):
        draw.rounded_rectangle(
            (
                cuff_x - round(34 * s),
                y + round(105 * s),
                cuff_x + round(34 * s),
                y + round(151 * s),
            ),
            radius=max(3, round(9 * s)),
            fill=coat_dark,
            outline=INK,
            width=outline_width,
        )

    # A thigh-length body, lapels, front closure, belt, and pockets read as a coat.
    body = (
        x - round(105 * s),
        y - round(150 * s),
        x + round(105 * s),
        y + round(215 * s),
    )
    draw.rounded_rectangle(body, radius=max(8, round(22 * s)), fill=coat, outline=INK, width=outline_width)
    draw.polygon(
        (
            (x - round(78 * s), y - round(146 * s)),
            (x - round(12 * s), y - round(68 * s)),
            (x, y - round(112 * s)),
            (x - round(28 * s), y - round(168 * s)),
        ),
        fill=lining,
        outline=INK,
    )
    draw.polygon(
        (
            (x + round(78 * s), y - round(146 * s)),
            (x + round(12 * s), y - round(68 * s)),
            (x, y - round(112 * s)),
            (x + round(28 * s), y - round(168 * s)),
        ),
        fill=lining,
        outline=INK,
    )
    draw.line((x, y - round(68 * s), x, y + round(205 * s)), fill=INK, width=outline_width)
    draw.rounded_rectangle(
        (x - round(103 * s), y + round(38 * s), x + round(103 * s), y + round(73 * s)),
        radius=max(3, round(8 * s)),
        fill=coat_dark,
        outline=INK,
        width=outline_width,
    )
    for button_y in (y - round(32 * s), y + round(105 * s), y + round(166 * s)):
        radius = max(3, round(7 * s))
        draw.ellipse((x - radius, button_y - radius, x + radius, button_y + radius), fill=GOLD, outline=INK)
    for pocket_x in (x - round(61 * s), x + round(61 * s)):
        draw.line(
            (
                pocket_x - round(27 * s),
                y + round(121 * s),
                pocket_x + round(27 * s),
                y + round(108 * s),
            ),
            fill=INK,
            width=outline_width,
        )


def hot_choice(item: str) -> Image.Image:
    image = full_bleed("#ffe4a8", "#f7e8ce")
    draw = ImageDraw.Draw(image)
    # Everything needed to read HOT + the clothing item is inside the 4:5 crop.
    unit7.draw_sun(draw, 475, 175, 0.72)
    unit7.draw_thermometer(draw, 465, 470, hot=True)
    unit7.draw_person(draw, 680, 560, 0.70, shirt="#f3eee0", mood="tired", arms="yawn")
    for x, y in ((620, 180), (750, 205), (800, 275)):
        draw.ellipse((x - 12, y - 25, x + 12, y + 25), fill="#5eb2d1", outline=BLUE, width=3)
    if item == "jacket":
        draw_long_sleeved_coat(draw, 1000, 545, 0.72)
    else:
        unit7.draw_item(draw, item, 1000, 545, 0.72, color="#f5f0e5")
    arrow(draw, (835, 530), (895, 530), width=20, head=38)
    return image


def meal_scene(item: str, meal: str, count: int) -> Image.Image:
    palette = {
        "breakfast": ("#f8cf76", "#f3ead3"),
        "lunch": ("#9ed8df", "#e7f1e7"),
        "dinner": ("#172845", "#34415f"),
    }
    image = full_bleed(*palette[meal])
    draw = ImageDraw.Draw(image)

    if meal == "dinner":
        # Crescent moon and 7:00 clock are both retained by the centered crop.
        draw.ellipse((430, 105, 590, 265), fill="#f5df92", outline=INK, width=7)
        draw.ellipse((485, 75, 620, 220), fill="#172845")
        hour = 7
    elif meal == "breakfast":
        unit7.draw_sun(draw, 500, 180, 0.72)
        draw.arc((375, 120, 625, 355), 200, 340, fill="#d6812c", width=10)
        hour = 7
    else:
        unit7.draw_sun(draw, 500, 160, 0.66)
        hour = 1
    units35.clock(draw, 990, 205, hour, digital=False, scale=0.55)

    # Full-bleed table; no letterbox or blurred side-fill.
    draw.rectangle((0, 700, SIZE[0], SIZE[1]), fill="#a76c3f")
    draw.line((0, 700, SIZE[0], 700), fill=INK, width=10)
    draw.ellipse((515, 515, 1021, 780), fill="#f7f7ef", outline=INK, width=10)
    spacing = 150
    start = 768 - spacing * (count - 1) / 2
    for index in range(count):
        units35.food(draw, item, round(start + index * spacing), 635, 0.64)
    return image


def simple_direction(place: str, direction: str) -> Image.Image:
    image = full_bleed("#e9dfc5", "#d5e2db")
    draw = ImageDraw.Draw(image)
    # A single-place request: the building and requested left/right direction
    # coexist inside the safe crop instead of landing at opposite 3:2 edges.
    photo_card(image, PLACE_SOURCES[place], (520, 160, 1016, 590), highlighted=True, radius=40)
    if direction == "left":
        arrow(draw, (940, 760), (500, 760), BLUE, width=38, head=72)
    else:
        arrow(draw, (596, 760), (1036, 760), BLUE, width=38, head=72)
    return image


def straight_turn(place: str, direction: str) -> Image.Image:
    image = Image.new("RGB", SIZE, "#d9cfb8")
    draw = ImageDraw.Draw(image)
    # Full-bleed town map.  The entire route stays in the 4:5 safe region.
    draw.rectangle((650, 0, 886, 1024), fill="#68777d")
    draw.rectangle((0, 330, 1536, 565), fill="#596871")
    for y in range(20, 1010, 95):
        draw.rounded_rectangle((756, y, 780, y + 55), radius=7, fill="#f3d56a")
    for x in range(20, 1520, 115):
        draw.rounded_rectangle((x, 435, x + 65, 460), radius=7, fill="#f7f4ec")

    left_turn = direction == "left"
    destination_box = (385, 70, 685, 315) if left_turn else (851, 70, 1151, 315)
    photo_card(image, PLACE_SOURCES[place], destination_box, highlighted=True, radius=28)
    destination_x = 700 if left_turn else 836
    points = [(768, 930), (768, 440), (destination_x, 330)]
    draw.line(points, fill=TEAL, width=38, joint="curve")
    arrow(draw, points[-2], points[-1], TEAL, width=38, head=60)
    draw.ellipse((730, 892, 806, 968), fill=RED, outline=INK, width=7)
    return image


def place_relation(subject: str, reference: str, relation: str) -> Image.Image:
    image = full_bleed("#e7ddc5", "#d5e4dc")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 675, SIZE[0], SIZE[1]), fill="#788385")
    draw.line((0, 790, SIZE[0], 790), fill="#f0d35d", width=12)

    if relation == "far":
        left_box, right_box = (380, 250, 650, 610), (886, 250, 1156, 610)
    elif relation == "near":
        left_box, right_box = (405, 250, 705, 610), (831, 250, 1131, 610)
    elif relation == "next":
        left_box, right_box = (370, 250, 755, 610), (781, 250, 1166, 610)
    else:
        raise ValueError(f"Unsupported relation: {relation}")

    photo_card(image, PLACE_SOURCES[subject], left_box, highlighted=True, radius=28)
    photo_card(image, PLACE_SOURCES[reference], right_box, radius=28)
    gap_left, gap_right = left_box[2], right_box[0]
    center_y = 465
    if relation == "next":
        draw.line((gap_left + 4, center_y, gap_right - 4, center_y), fill=TEAL, width=14)
        draw.ellipse((gap_left - 7, center_y - 11, gap_left + 15, center_y + 11), fill=TEAL)
        draw.ellipse((gap_right - 15, center_y - 11, gap_right + 7, center_y + 11), fill=TEAL)
    elif relation == "near":
        arrow(draw, (gap_left + 4, center_y), (gap_left + 50, center_y), TEAL, width=14, head=24)
        arrow(draw, (gap_right - 4, center_y + 45), (gap_right - 50, center_y + 45), TEAL, width=14, head=24)
    else:
        for x in range(gap_left + 15, gap_right - 10, 52):
            draw.ellipse((x - 9, center_y - 9, x + 9, center_y + 9), fill=TEAL)
        arrow(draw, (gap_left + 5, center_y - 48), (gap_left + 70, center_y - 48), TEAL, width=14, head=26)
        arrow(draw, (gap_right - 5, center_y + 48), (gap_right - 70, center_y + 48), TEAL, width=14, head=26)
    return image


def pair_people(draw: ImageDraw.ImageDraw, *, pose: str = "point-right") -> tuple[dict, dict]:
    first = units35.person(draw, 500, 895, "Woman", 0.61, pose, False)
    second = units35.person(draw, 690, 895, "Man", 0.61, pose, False)
    return first, second


def transport_scene(vehicle: str, allowed: bool) -> Image.Image:
    image = full_bleed("#e8e1d0", "#d8e5df")
    draw = ImageDraw.Draw(image)
    pair_people(draw)
    source_name = "a1_scene_bus_32c70ce.webp" if vehicle == "bus" else "a1_scene_train_94efdd6.webp"
    photo_card(image, source_name, (825, 250, 1145, 610), highlighted=True, radius=34)
    if allowed:
        arrow(draw, (740, 540), (815, 540), TEAL, width=28, head=44)
        check(draw, (1005, 765), 65)
    else:
        draw.rounded_rectangle((770, 310, 804, 770), radius=16, fill=RED, outline=INK, width=7)
        draw.line((742, 405, 835, 655), fill=RED, width=34)
        draw.line((835, 405, 742, 655), fill=RED, width=34)
        cross(draw, (1005, 765), 65)
    return image


def need_want_scene(
    subjects: list[str],
    item: str,
    mode: str,
    *,
    count: int = 1,
    color: str | None = None,
) -> Image.Image:
    image = full_bleed("#d8e8d9" if mode == "want" else "#f1d8a5", "#e4ece3")
    draw = ImageDraw.Draw(image)
    if len(subjects) == 2:
        pair_people(draw)
        reaching_x = 760
    else:
        units35.person(draw, 555, 895, subjects[0], 0.68, "point-right", False)
        reaching_x = 740

    spacing = 150
    center = 980
    start = center - spacing * (count - 1) / 2
    for index in range(count):
        units35.food(draw, item, round(start + index * spacing), 540, 0.68, color)
    if mode == "want":
        arrow(draw, (reaching_x, 570), (850, 550), TEAL, width=25, head=42)
        draw.arc((785, 485, 875, 585), 110, 245, fill=TEAL, width=9)
    else:
        draw.ellipse((915, 125, 1065, 275), fill="#f2bb45", outline=INK, width=8)
        exclamation = font(115)
        box = draw.textbbox((0, 0), "!", font=exclamation)
        draw.text((990 - (box[2] - box[0]) / 2, 194 - (box[3] - box[1]) / 2 - box[1]), "!", fill=INK, font=exclamation)
    return image


def red_signal_scene() -> Image.Image:
    image = Image.new("RGB", SIZE, "#dce9df")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 590, SIZE[0], SIZE[1]), fill="#596871")
    for x in range(350, 1200, 150):
        draw.rectangle((x, 690, x + 90, 790), fill="#f7f4ec")
    pair_people(draw, pose="neutral")
    draw.rounded_rectangle((890, 130, 1095, 500), radius=45, fill="#26363d", outline=INK, width=9)
    draw.ellipse((930, 165, 1055, 290), fill="#d8443f", outline="#fff5e8", width=6)
    draw.ellipse((930, 335, 1055, 460), fill="#354f43", outline="#fff5e8", width=6)
    draw.line((992, 500, 992, 650), fill=INK, width=25)
    cross(draw, (810, 455), 62)
    return image


def rejects_tv_scene() -> Image.Image:
    image = full_bleed("#efd8d0", "#e4ece4")
    draw = ImageDraw.Draw(image)
    units35.person(draw, 520, 900, "Woman", 0.68, "point-right", False)
    # Large unmistakable television: dark screen, stand, and twin antennae.
    draw.rounded_rectangle((820, 280, 1135, 625), radius=30, fill="#26343b", outline=INK, width=11)
    draw.rounded_rectangle((850, 310, 1105, 580), radius=18, fill="#98c8d5", outline="#eef8f8", width=7)
    draw.line((925, 280, 860, 185), fill=INK, width=12)
    draw.line((1030, 280, 1095, 185), fill=INK, width=12)
    draw.line((910, 625, 895, 710), fill=INK, width=18)
    draw.line((1045, 625, 1060, 710), fill=INK, width=18)
    cross(draw, (970, 450), 92)
    # Rejection/push-away arrow points from the learner back away from the TV.
    arrow(draw, (790, 620), (690, 620), RED, width=28, head=48)
    return image


def build_scenes() -> dict[str, Image.Image]:
    scenes: dict[str, Image.Image] = {
        "hot-jacket": hot_choice("jacket"),
        "hot-shirt": hot_choice("shirt"),
        "juice-for-dinner": meal_scene("juice", "dinner", 1),
        "one-egg-for-breakfast": meal_scene("egg", "breakfast", 1),
        "tea-for-breakfast": meal_scene("tea", "breakfast", 1),
        "tea-for-lunch": meal_scene("tea", "lunch", 1),
        "three-eggs-for-breakfast": meal_scene("egg", "breakfast", 3),
        "left-only-hospital": simple_direction("hospital", "left"),
        "library-right": simple_direction("library", "right"),
        "pharmacy-left": simple_direction("pharmacy", "left"),
        "pharmacy-right": simple_direction("pharmacy", "right"),
        "right-only-station": simple_direction("station", "right"),
        "straight-left-bank": straight_turn("bank", "left"),
        "straight-left-hospital": straight_turn("hospital", "left"),
        "straight-left-station": straight_turn("station", "left"),
        "straight-right-bank": straight_turn("bank", "right"),
        "straight-right-hospital": straight_turn("hospital", "right"),
        "straight-right-station": straight_turn("station", "right"),
        "library-far-from-bank": place_relation("library", "bank", "far"),
        "library-far-from-park": place_relation("library", "park", "far"),
        "library-near-bank": place_relation("library", "bank", "near"),
        "library-near-park": place_relation("library", "park", "near"),
        "library-next-to-park": place_relation("library", "park", "next"),
        "library-next-to-school": place_relation("library", "school", "next"),
        "station-far-from-park": place_relation("station", "park", "far"),
        "station-near-park": place_relation("station", "park", "near"),
        "station-next-to-park": place_relation("station", "park", "next"),
        "store-far-from-park": place_relation("store", "park", "far"),
        "store-near-bank": place_relation("store", "bank", "near"),
        "store-next-to-park": place_relation("store", "park", "next"),
        "man-wants-two-red-apples": need_want_scene(["Man"], "apple", "want", count=2, color=RED),
        "pair-can-go-by-bus": transport_scene("bus", True),
        "pair-can-go-by-train": transport_scene("train", True),
        "pair-cannot-go-by-bus": transport_scene("bus", False),
        "pair-needs-water": need_want_scene(["Woman", "Man"], "water", "need"),
        "pair-waits-at-red-signal": red_signal_scene(),
        "pair-wants-chicken": need_want_scene(["Woman", "Man"], "chicken", "want"),
        "pair-wants-fish": need_want_scene(["Woman", "Man"], "fish", "want"),
        "pair-wants-three-eggs": need_want_scene(["Woman", "Man"], "egg", "want", count=3),
        "pair-wants-two-apples": need_want_scene(["Woman", "Man"], "apple", "want", count=2, color=RED),
        "pair-wants-two-eggs": need_want_scene(["Woman", "Man"], "egg", "want", count=2),
        "rejects-tv": rejects_tv_scene(),
    }
    if set(scenes) != set(BASE_FILENAMES):
        missing = sorted(set(BASE_FILENAMES).difference(scenes))
        extra = sorted(set(scenes).difference(BASE_FILENAMES))
        raise RuntimeError(f"Repair registry mismatch; missing={missing}, extra={extra}")
    return scenes


def save_webp(image: Image.Image, filename: str, output_dir: Path) -> Path:
    if image.size != SIZE:
        raise ValueError(f"{filename} is {image.size}; expected {SIZE}")
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / filename
    image.convert("RGB").save(path, "WEBP", quality=94, method=6, exact=True)
    with Image.open(path) as written:
        if written.size != SIZE or written.format != "WEBP":
            raise ValueError(f"Invalid four-card repair output: {path}")
    return path


def crop_4x5(image: Image.Image) -> Image.Image:
    width = round(image.height * 4 / 5)
    left = (image.width - width) // 2
    return image.crop((left, 0, left + width, image.height))


def render_audit_sheet(written: list[Path], destination: Path) -> Path:
    columns = 6
    tile_w, tile_h = 245, 370
    rows = math.ceil(len(written) / columns)
    sheet = Image.new("RGB", (columns * tile_w, rows * tile_h), "#efe9df")
    draw = ImageDraw.Draw(sheet)
    label_font = font(16, bold=False)
    for index, path in enumerate(written):
        with Image.open(path) as opened:
            crop = crop_4x5(opened.convert("RGB"))
            thumb = ImageOps.fit(crop, (220, 275), method=Image.Resampling.LANCZOS)
        x = index % columns * tile_w + 12
        y = index // columns * tile_h + 10
        sheet.paste(thumb, (x, y))
        draw.rounded_rectangle((x, y, x + 220, y + 275), radius=12, outline=INK, width=4)
        label = next(concept for concept, base in BASE_FILENAMES.items() if variant_filename(base) == path.name)
        words = label.split("-")
        lines: list[str] = []
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if len(candidate) > 24 and current:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
        for line_index, line in enumerate(lines[:3]):
            draw.text((x, y + 286 + line_index * 20), line, fill=INK, font=label_font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "PNG", optimize=True)
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build 42 crop-safe four-card media variants from audit sheets 7-12.")
    parser.add_argument("--output-dir", type=Path, default=ASSET_ROOT)
    parser.add_argument("--audit-sheet", type=Path, help="Optionally render the exact centered 4:5 crops for review.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    scenes = build_scenes()
    written = [
        save_webp(scenes[concept], variant_filename(base_filename), output_dir)
        for concept, base_filename in BASE_FILENAMES.items()
    ]
    for path in written:
        print(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)
    print(f"Built {len(written)} deterministic 1536x1024 crop-safe four-card variants.")
    if args.audit_sheet:
        destination = args.audit_sheet if args.audit_sheet.is_absolute() else ROOT / args.audit_sheet
        rendered = render_audit_sheet(written, destination)
        print(f"Centered 4:5 audit sheet: {rendered}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
