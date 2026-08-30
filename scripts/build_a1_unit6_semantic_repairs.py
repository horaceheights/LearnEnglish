from __future__ import annotations

import argparse
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
SIZE = (1536, 1024)

BUS_SOURCE = "a1_scene_bus_32c70ce.webp"
TRAIN_SOURCE = "a1_scene_train_94efdd6.webp"
TAXI_SOURCE = "a1_scene_a-taxi_2b8a98d.webp"
STATION_SOURCE = "a1_scene_a-station_bdca78a.webp"
BANK_SOURCE = "a1_scene_a-bank_decb678.webp"
STORE_SOURCE = "a1_scene_a-store_e91614f.webp"
HOSPITAL_SOURCE = "a1_scene_a-hospital_dfbc6e9.webp"
LIBRARY_SOURCE = "a1_scene_a-library_985e108.webp"
PARK_SOURCE = "a1_scene_park_ce4151f.webp"

PLACE_SOURCES = {
    "bank": BANK_SOURCE,
    "hospital": HOSPITAL_SOURCE,
    "library": LIBRARY_SOURCE,
    "park": PARK_SOURCE,
    "station": STATION_SOURCE,
    "store": STORE_SOURCE,
}

HELP_COPIES = {
    "a1_scene_asks-for-town-help_3f8f57a.webp": "a1_scene_can-you-help-me_eb476e5.webp",
    "a1_scene_asks-for-help_bdae1c7.webp": "a1_scene_excuse-me-can-you-help-me_dab207f.webp",
}

CROSSWALK_TARGETS = {
    "a1_scene_cross_ac4280b.webp": ("#2f6fae", 0),
    "a1_scene_cross-the-street_3534a85.webp": ("#7a4fa3", 1),
    "a1_scene_crosses-street_bd655a1.webp": ("#2f8a70", 2),
    "a1_scene_street_d3a9fb0.webp": ("#d46a45", 3),
    "a1_scene_boy-crosses-at-green_4befcaf.webp": ("#2f6fae", 4),
    "a1_scene_crossing-allowed_363778b.webp": ("#3f8b5b", 5),
    "a1_scene_you-can-cross-the-street_15d25f7.webp": ("#3767a8", 6),
}

SPATIAL_TARGETS = {
    "a1_scene_book-next-to-table_11e545b.webp": "book-next-to-table",
    "a1_scene_phone-on-bag_4af0b00.webp": "phone-on-bag",
    "a1_scene_in_af10ef2.webp": "phone-in-bag-blue",
    "a1_scene_it-is-in-the-bag_d8697e6.webp": "phone-in-bag-gold",
}

TRANSPORT_TARGETS = {
    # filename: (vehicle, exact visible people, access allowed)
    "a1_scene_by_4081586.webp": ("bus", 1, True),
    "a1_scene_go_1ec558a.webp": ("bus", 2, True),
    "a1_scene_goes_dda18e1.webp": ("train", 1, True),
    "a1_scene_one-person-can-go-by-bus_7eed7a1.webp": ("bus", 1, True),
    "a1_scene_pair-can-go-by-bus_69469a0.webp": ("bus", 2, True),
    "a1_scene_pair-can-go-by-train_67f6004.webp": ("train", 2, True),
    "a1_scene_pair-cannot-go-by-bus_547b3cc.webp": ("bus", 2, False),
    "a1_scene_pair-boards-train_b176ea8.webp": ("train", 2, True),
    "a1_scene_pair-cannot-enter-train-station_dfedc03.webp": ("station", 2, False),
    "a1_scene_i-can-go-by-bus_a4c83d2.webp": ("bus", 1, True),
    "a1_scene_we-can-go-by-bus_07c410b.webp": ("bus", 2, True),
    "a1_scene_they-go-by-bus_065c355.webp": ("bus", 2, True),
    "a1_scene_they-cannot-go-by-train_54c88ac.webp": ("station", 2, False),
}

ROUTE_TARGETS = {
    "a1_scene_straight-cross-bank_aa58b87.webp": (True, "bank", False),
    "a1_scene_straight-cross-station_10c8af0.webp": (True, "station", False),
    "a1_scene_straight-no-cross-station_351bf7a.webp": (False, "station", False),
    "a1_scene_turn-right-cross-station_338607c.webp": (True, "station", True),
    "a1_scene_go-straight-turn-right-stop-at-the-bank_e9e4bfe.webp": (True, "bank", True),
}

ORDERED_COLLAGE_TARGETS = {
    "a1_scene_bus-train-taxi_f10f9ee.webp": (BUS_SOURCE, TRAIN_SOURCE, TAXI_SOURCE),
    "a1_scene_store-bank-bus-train_7ae1547.webp": (STORE_SOURCE, BANK_SOURCE, BUS_SOURCE, TRAIN_SOURCE),
}

WALK_ROUTE_TARGETS = {
    "a1_scene_i-can-walk-there_716a3c1.webp": True,
    "a1_scene_i-cannot-walk-there_4e028b8.webp": False,
}

PLACE_RELATION_TARGETS = {
    # filename: (subject, named reference, relation)
    "a1_scene_it-is-far-from-the-park_6ffa714.webp": ("station", "park", "far"),
    "a1_scene_it-is-near-the-bank_bbd8eb4.webp": ("hospital", "bank", "near"),
    "a1_scene_it-is-next-to-the-bank_3377ff2.webp": ("station", "bank", "next"),
    "a1_scene_it-is-next-to-the-hospital_ef2b898.webp": ("store", "hospital", "next"),
    "a1_scene_it-is-next-to-the-park_7c2e29b.webp": ("library", "park", "next"),
    "a1_scene_it-is-next-to-the-store_b207d1a.webp": ("bank", "store", "next"),
}

PAIRED_PLACE_TARGETS = {
    # filename: (screen-left place, screen-right place, highlighted place)
    "a1_scene_the-bank-is-on-the-left_2974b35.webp": ("bank", "hospital", "bank"),
    "a1_scene_the-hospital-is-on-the-right_d55f74c.webp": ("bank", "hospital", "hospital"),
}


def source(name: str) -> Image.Image:
    path = ASSET_ROOT / name
    if not path.is_file():
        raise FileNotFoundError(f"Missing reviewed source: {path}")
    with Image.open(path) as opened:
        return opened.convert("RGB")


def save_webp(image: Image.Image, filename: str, output_dir: Path) -> Path:
    if image.size != SIZE:
        raise ValueError(f"{filename} has {image.size}; expected {SIZE}")
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / filename
    image.save(destination, format="WEBP", quality=94, method=6, exact=True)
    with Image.open(destination) as written:
        if written.size != SIZE or written.format != "WEBP":
            raise ValueError(f"Invalid rendered asset: {destination}")
    return destination


def arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    color: str,
    width: int = 34,
    head: int = 58,
) -> None:
    draw.line((start, end), fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    left = (
        end[0] - head * math.cos(angle) + head * 0.7 * math.sin(angle),
        end[1] - head * math.sin(angle) - head * 0.7 * math.cos(angle),
    )
    right = (
        end[0] - head * math.cos(angle) - head * 0.7 * math.sin(angle),
        end[1] - head * math.sin(angle) + head * 0.7 * math.cos(angle),
    )
    draw.polygon((end, left, right), fill=color)


def person(
    draw: ImageDraw.ImageDraw,
    x: int,
    feet_y: int,
    scale: float,
    shirt: str,
    stride: bool = True,
) -> None:
    outline = "#20343c"
    skin = "#bd7a54"
    head_r = int(35 * scale)
    head_y = feet_y - int(255 * scale)
    draw.ellipse(
        (x - head_r, head_y - head_r, x + head_r, head_y + head_r),
        fill=skin,
        outline=outline,
        width=max(3, int(7 * scale)),
    )
    shoulder_y = head_y + int(48 * scale)
    hip_y = feet_y - int(105 * scale)
    shoulder = int(45 * scale)
    draw.polygon(
        (
            (x - shoulder, shoulder_y),
            (x + shoulder, shoulder_y),
            (x + int(32 * scale), hip_y),
            (x - int(32 * scale), hip_y),
        ),
        fill=shirt,
        outline=outline,
    )
    limb = max(6, int(12 * scale))
    draw.line(
        (x - shoulder + 4, shoulder_y + 8, x - int(72 * scale), hip_y - int(18 * scale)),
        fill=outline,
        width=limb,
    )
    draw.line(
        (x + shoulder - 4, shoulder_y + 8, x + int(78 * scale), hip_y - int(50 * scale)),
        fill=outline,
        width=limb,
    )
    if stride:
        left_foot = (x - int(62 * scale), feet_y)
        right_foot = (x + int(70 * scale), feet_y - int(12 * scale))
    else:
        left_foot = (x - int(34 * scale), feet_y)
        right_foot = (x + int(34 * scale), feet_y)
    draw.line((x - int(20 * scale), hip_y, *left_foot), fill=outline, width=limb)
    draw.line((x + int(20 * scale), hip_y, *right_foot), fill=outline, width=limb)


def paste_photo_card(
    canvas: Image.Image,
    filename: str,
    box: tuple[int, int, int, int],
    *,
    highlighted: bool = False,
    radius: int = 42,
) -> None:
    """Paste one reviewed place/object source as a rounded, borderless semantic card."""

    x0, y0, x1, y1 = box
    size = (x1 - x0, y1 - y0)
    fitted = ImageOps.fit(source(filename), size, method=Image.Resampling.LANCZOS)
    card_mask = Image.new("L", size, 0)
    ImageDraw.Draw(card_mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    canvas.paste(fitted, (x0, y0), card_mask)
    draw = ImageDraw.Draw(canvas)
    if highlighted:
        draw.rounded_rectangle(
            (x0 - 18, y0 - 18, x1 + 18, y1 + 18),
            radius=radius + 14,
            outline="#efb93d",
            width=18,
        )
    draw.rounded_rectangle(box, radius=radius, outline="#20343c", width=8)


def ordered_photo_collage(sources: tuple[str, ...]) -> Image.Image:
    """Render an exact left-to-right retrieval sequence without answer text."""

    count = len(sources)
    if count not in {3, 4}:
        raise ValueError(f"Unsupported collage count: {count}")
    canvas = Image.new("RGB", SIZE, "#f5efe3")
    draw = ImageDraw.Draw(canvas)
    margin = 55
    gap = 28
    width = (SIZE[0] - 2 * margin - gap * (count - 1)) // count
    y0, y1 = (165, 855) if count == 3 else (195, 830)
    for index, filename in enumerate(sources):
        x0 = margin + index * (width + gap)
        x1 = x0 + width
        draw.rounded_rectangle((x0 - 10, y0 - 10, x1 + 10, y1 + 10), radius=50, fill="#fffaf0")
        paste_photo_card(canvas, filename, (x0, y0, x1, y1), radius=40)
        if index < count - 1:
            arrow(draw, (x1 + 5, 895), (x1 + gap - 5, 895), "#278b70", width=12, head=22)
    return canvas


def walk_route_scene(allowed: bool) -> Image.Image:
    """Show the same learner and park with either an open or physically blocked walk."""

    canvas = Image.new("RGB", SIZE, "#cce5ef")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 560, 1536, 1024), fill="#75aa6e")
    # A single continuous sidewalk leads from the learner to the visible park.
    draw.polygon(((80, 970), (515, 970), (1280, 495), (1110, 445)), fill="#ddd7c9", outline="#9f9787")
    draw.line((145, 915, 1170, 500), fill="#f7f3e9", width=18)
    paste_photo_card(canvas, PARK_SOURCE, (1100, 105, 1460, 455), highlighted=True, radius=34)
    person(draw, 285, 840, 1.25, "#2f6fae", stride=True)

    if allowed:
        draw.line((410, 820, 1015, 535), fill="#278b70", width=36)
        arrow(draw, (805, 635), (1040, 515), "#278b70", width=36, head=58)
        draw.ellipse((92, 105, 257, 270), fill="#eef9f1", outline="#20343c", width=8)
        draw.line((130, 188, 168, 226, 227, 145), fill="#278b70", width=23)
    else:
        # Construction barrier sits across the sidewalk; the route visibly stops at it.
        draw.line((410, 820, 690, 688), fill="#d6453f", width=32)
        draw.rounded_rectangle((665, 565, 865, 755), radius=18, fill="#f0b33d", outline="#7c4c14", width=8)
        for y in (605, 675):
            draw.line((685, y, 845, y), fill="#fff7dd", width=24)
        draw.line((685, 580, 845, 735), fill="#d33f3f", width=30)
        draw.line((845, 580, 685, 735), fill="#d33f3f", width=30)
        draw.line((700, 750, 660, 885), fill="#7c4c14", width=18)
        draw.line((830, 750, 875, 885), fill="#7c4c14", width=18)
        draw.ellipse((92, 105, 257, 270), fill="#fff1ef", outline="#20343c", width=8)
        draw.line((128, 140, 225, 235), fill="#d33f3f", width=23)
        draw.line((225, 140, 128, 235), fill="#d33f3f", width=23)
    return canvas


def place_relation_scene(subject: str, reference: str, relation: str) -> Image.Image:
    """Show both named places in one fixed-scale strip with the subject highlighted."""

    canvas = Image.new("RGB", SIZE, "#dce9df")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((45, 70, 1491, 930), radius=64, fill="#f8f3e8", outline="#20343c", width=10)
    draw.rectangle((70, 790, 1466, 900), fill="#777f82")
    draw.line((95, 845, 1440, 845), fill="#f4d65d", width=10)

    if relation == "next":
        subject_box = (95, 205, 750, 785)
        reference_box = (786, 205, 1441, 785)
        draw.line((756, 475, 780, 475), fill="#278b70", width=20)
        draw.ellipse((746, 465, 766, 485), fill="#278b70")
        draw.ellipse((770, 465, 790, 485), fill="#278b70")
    elif relation == "near":
        subject_box = (90, 235, 655, 775)
        reference_box = (881, 235, 1446, 775)
        # One cross street/block separates the two locations; they are close but not adjacent.
        draw.rectangle((684, 105, 852, 900), fill="#727d82")
        for y in range(135, 885, 85):
            draw.rounded_rectangle((754, y, 782, y + 48), radius=6, fill="#f5e6a5")
        arrow(draw, (665, 485), (735, 485), "#278b70", width=16, head=28)
        arrow(draw, (871, 525), (801, 525), "#278b70", width=16, head=28)
    elif relation == "far":
        subject_box = (75, 245, 535, 765)
        reference_box = (1001, 245, 1461, 765)
        # Long map-scale route makes the endpoint separation explicit.
        for x in range(565, 970, 80):
            draw.rounded_rectangle((x, 492, x + 43, 512), radius=7, fill="#278b70")
        arrow(draw, (555, 450), (690, 450), "#278b70", width=16, head=30)
        arrow(draw, (981, 550), (846, 550), "#278b70", width=16, head=30)
    else:
        raise ValueError(f"Unsupported place relation: {relation}")

    paste_photo_card(canvas, PLACE_SOURCES[subject], subject_box, highlighted=True, radius=36)
    paste_photo_card(canvas, PLACE_SOURCES[reference], reference_box, radius=36)
    return canvas


def paired_place_scene(left: str, right: str, highlighted: str) -> Image.Image:
    """Fixed two-place reference view used by the left/right contrast pair."""

    canvas = Image.new("RGB", SIZE, "#e8eee8")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((55, 85, 1481, 925), radius=62, fill="#faf6ec", outline="#20343c", width=10)
    paste_photo_card(canvas, PLACE_SOURCES[left], (95, 225, 745, 810), highlighted=highlighted == left)
    paste_photo_card(canvas, PLACE_SOURCES[right], (791, 225, 1441, 810), highlighted=highlighted == right)
    draw.line((768, 185, 768, 855), fill="#9fa9a8", width=8)
    if highlighted == left:
        arrow(draw, (700, 145), (330, 145), "#2f6fae", width=24, head=45)
    else:
        arrow(draw, (836, 145), (1206, 145), "#2f6fae", width=24, head=45)
    return canvas


def station_left_scene(*, gratitude: bool) -> Image.Image:
    """Show the station screen-left of a human reference; optionally add a gratitude beat."""

    canvas = Image.new("RGB", SIZE, "#dce9e5")
    draw = ImageDraw.Draw(canvas)
    if gratitude:
        draw.rounded_rectangle((45, 75, 885, 949), radius=58, fill="#faf6ec", outline="#20343c", width=9)
        draw.rounded_rectangle((915, 75, 1491, 949), radius=58, fill="#fff8ea", outline="#20343c", width=9)
        paste_photo_card(canvas, STATION_SOURCE, (75, 155, 630, 650), highlighted=True, radius=34)
        person(draw, 760, 835, .88, "#d46a45", stride=False)
        arrow(draw, (720, 570), (590, 505), "#2f6fae", width=22, head=42)
        person(draw, 1075, 820, .75, "#2f6fae", stride=False)
        person(draw, 1330, 820, .75, "#7a4fa3", stride=False)
        # A shared heart is a language-free gratitude/positive-response cue.
        draw.polygon(((1200, 310), (1148, 255), (1090, 285), (1095, 350), (1200, 455), (1305, 350), (1310, 285), (1252, 255)), fill="#d95a70", outline="#8f3043")
    else:
        draw.rounded_rectangle((55, 75, 1481, 949), radius=60, fill="#faf6ec", outline="#20343c", width=9)
        paste_photo_card(canvas, STATION_SOURCE, (90, 180, 800, 820), highlighted=True)
        person(draw, 1165, 830, 1.12, "#2f6fae", stride=False)
        arrow(draw, (1080, 455), (830, 455), "#2f6fae", width=28, head=52)
    return canvas


def walks_scene() -> Image.Image:
    """A literal active walker on an outdoor pedestrian path."""

    canvas = Image.new("RGB", SIZE, "#c7e3ef")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 535, 1536, 1024), fill="#79ad70")
    draw.polygon(((80, 1000), (610, 1000), (1300, 480), (1080, 430)), fill="#ded8ca", outline="#9d9588")
    for x in (150, 1180, 1390):
        draw.rectangle((x, 250, x + 24, 580), fill="#6f5139")
        draw.ellipse((x - 100, 115, x + 125, 360), fill="#4c9362", outline="#2d6540", width=6)
    person(draw, 650, 845, 1.38, "#2f6fae", stride=True)
    arrow(draw, (820, 750), (1040, 600), "#278b70", width=30, head=52)
    return canvas


def transport_scene(vehicle: str, people: int, allowed: bool) -> Image.Image:
    source_name = {
        "bus": BUS_SOURCE,
        "train": TRAIN_SOURCE,
        "station": STATION_SOURCE,
    }[vehicle]
    base = ImageOps.fit(source(source_name), SIZE, method=Image.Resampling.LANCZOS)
    canvas = base.convert("RGBA")

    # A single integrated transit scene: the translucent area makes the exact
    # learner count legible without separating the vehicle into another panel.
    shade = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade)
    shade_draw.rounded_rectangle(
        (-110, 80, 720, 970), radius=100, fill=(250, 246, 234, 224), outline=(32, 52, 60, 238), width=9
    )
    shade_draw.rectangle((0, 760, 1536, 1024), fill=(217, 211, 197, 205))
    canvas.alpha_composite(shade)
    draw = ImageDraw.Draw(canvas)

    if people == 1:
        positions = ((320, "#2f6fae"),)
    elif people == 2:
        positions = ((245, "#2f6fae"), (445, "#7a4fa3"))
    else:
        raise ValueError(f"Unsupported person count: {people}")
    for index, (x, shirt) in enumerate(positions):
        person(draw, x, 842 - index * 8, 1.15, shirt, stride=allowed)

    if allowed:
        arrow(draw, (525, 645), (815, 645), "#278b70", width=38, head=62)
        draw.ellipse((76, 90, 246, 260), fill="#eef9f1", outline="#20343c", width=8)
        draw.line((115, 177, 153, 215, 216, 132), fill="#278b70", width=25, joint="curve")
    else:
        # The barrier sits between the exact pair and the vehicle entrance.
        draw.rounded_rectangle((570, 360, 625, 860), radius=22, fill="#d33f3f", outline="#7c2020", width=7)
        draw.line((505, 450, 690, 720), fill="#d33f3f", width=42)
        draw.line((690, 450, 505, 720), fill="#d33f3f", width=42)
        draw.ellipse((76, 90, 246, 260), fill="#fff1ef", outline="#20343c", width=8)
        draw.line((115, 132, 212, 218), fill="#d33f3f", width=25)
        draw.line((212, 132, 115, 218), fill="#d33f3f", width=25)

    return canvas.convert("RGB")


def top_down_car(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: str) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=28, fill=color, outline="#20343c", width=8)
    inset = 32
    draw.rounded_rectangle(
        (x0 + inset, y0 + inset, x1 - inset, y1 - inset),
        radius=18,
        fill="#bfe0eb",
        outline="#20343c",
        width=6,
    )
    draw.line((x0 + 8, (y0 + y1) // 2, x1 - 8, (y0 + y1) // 2), fill="#20343c", width=6)


def crosswalk_scene(shirt: str, variant: int) -> Image.Image:
    canvas = Image.new("RGB", SIZE, "#d8e9df")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1536, 250), fill="#d7e9d1")
    draw.rectangle((0, 250, 1536, 774), fill="#596871")
    draw.rectangle((0, 774, 1536, 1024), fill="#ddd7c9")
    draw.line((0, 250, 1536, 250), fill="#f3ead5", width=22)
    draw.line((0, 774, 1536, 774), fill="#f3ead5", width=22)

    # Zebra stripes span the road from one sidewalk to the other.
    for x in range(590, 970, 76):
        draw.rounded_rectangle((x, 270, x + 42, 754), radius=8, fill="#f8f5ec")
    draw.line((520, 250, 520, 774), fill="#f4cf59", width=13)
    draw.line((1015, 250, 1015, 774), fill="#f4cf59", width=13)

    top_down_car(draw, (105, 335, 430, 520), "#4c83bb")
    top_down_car(draw, (1100, 548, 1430, 733), "#d5684a")
    draw.line((450, 270, 450, 754), fill="#f4f0e5", width=17)
    draw.line((1085, 270, 1085, 754), fill="#f4f0e5", width=17)

    x = 775 + (variant - 1) * 18
    feet_y = 654 - variant * 18
    person(draw, x, feet_y, 1.08, shirt, stride=True)
    arrow(draw, (1155, 720), (1155, 340), "#2c9a62", width=38, head=65)

    # Green walk signal is a cue, never answer text.
    draw.rounded_rectangle((1235, 60, 1425, 235), radius=35, fill="#20343c")
    draw.ellipse((1290, 92, 1370, 172), fill="#39b66f", outline="#edf7ef", width=5)
    draw.line((1330, 171, 1330, 211), fill="#edf7ef", width=12)
    draw.line((1330, 185, 1304, 224), fill="#edf7ef", width=10)
    draw.line((1330, 185, 1359, 222), fill="#edf7ef", width=10)
    return canvas


def spatial_scene(kind: str) -> Image.Image:
    background = "#e8f0e7" if kind.endswith("blue") else "#f4eedf"
    canvas = Image.new("RGB", SIZE, background)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((80, 70, 1456, 954), radius=70, fill="#faf7ee", outline="#20343c", width=12)

    if kind == "book-next-to-table":
        # The book is wholly beyond the table footprint, separated by a clear gap.
        draw.rounded_rectangle((300, 330, 1030, 475), radius=28, fill="#9b693f", outline="#20343c", width=10)
        draw.line((360, 470, 315, 855), fill="#20343c", width=28)
        draw.line((970, 470, 1015, 855), fill="#20343c", width=28)
        draw.rounded_rectangle((1160, 560, 1375, 720), radius=18, fill="#3974b8", outline="#20343c", width=10)
        draw.line((1192, 575, 1192, 704), fill="#f5f3ed", width=9)
        draw.line((1045, 640, 1135, 640), fill="#2c8a70", width=24)
        draw.ellipse((1030, 625, 1060, 655), fill="#2c8a70")
        draw.ellipse((1120, 625, 1150, 655), fill="#2c8a70")
        return canvas

    bag_color = "#4b82b8" if kind.endswith("blue") else "#d89a41"
    # One open bag. Its full outer boundary is visible so containment is literal.
    draw.arc((535, 185, 1000, 585), 185, 355, fill="#20343c", width=28)
    draw.rounded_rectangle((430, 360, 1100, 835), radius=62, fill=bag_color, outline="#20343c", width=12)

    if kind == "phone-on-bag":
        # A closed top flap prevents the phone from reading as partly inside.
        # The horizontal phone is wholly outside and visibly supported by the bag.
        draw.rounded_rectangle((500, 355, 1030, 505), radius=35, fill="#edbd62", outline="#20343c", width=10)
        draw.ellipse((610, 325, 930, 390), fill="#8b663a")
        draw.rounded_rectangle((595, 145, 945, 355), radius=32, fill="#d8eef0", outline="#20343c", width=12)
        draw.ellipse((752, 317, 788, 353), fill="#20343c")
        return canvas

    # Cutaway opening: the phone remains completely inside the bag outline while
    # enough of it stays visible to identify the object and verify containment.
    draw.ellipse((520, 330, 1010, 500), fill="#6f522f", outline="#20343c", width=10)
    phone_x = 650 if kind.endswith("blue") else 720
    phone_color = "#d89a41" if kind.endswith("blue") else "#3974b8"
    draw.rounded_rectangle((phone_x, 410, phone_x + 210, 725), radius=30, fill=phone_color, outline="#20343c", width=12)
    draw.rounded_rectangle((phone_x + 25, 450, phone_x + 185, 650), radius=15, fill="#d8eef0")
    draw.ellipse((phone_x + 90, 675, phone_x + 120, 705), fill="#20343c")
    # Repaint the bag front over the lower phone: visual occlusion proves "in."
    draw.rounded_rectangle((442, 570, 1088, 823), radius=50, fill=bag_color, outline="#20343c", width=10)
    return canvas


def destination_thumbnail(name: str, size: tuple[int, int]) -> Image.Image:
    source_name = BANK_SOURCE if name == "bank" else STATION_SOURCE
    return ImageOps.fit(source(source_name), size, method=Image.Resampling.LANCZOS)


def route_scene(crosses: bool, destination: str, turn_right: bool) -> Image.Image:
    canvas = Image.new("RGB", SIZE, "#dce9df")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 390, 1536, 620), fill="#596871")
    draw.rectangle((615, 0, 915, 1024), fill="#68777d")
    draw.rectangle((0, 0, 600, 375), fill="#d9cfb8")
    draw.rectangle((930, 0, 1536, 375), fill="#d9cfb8")
    draw.rectangle((0, 640, 600, 1024), fill="#d9cfb8")
    draw.rectangle((930, 640, 1536, 1024), fill="#d9cfb8")

    # The marked crossing is intentionally prominent in all four matched routes.
    for y in range(405, 610, 43):
        draw.rounded_rectangle((640, y, 890, y + 24), radius=5, fill="#f7f4ec")
    for x, y in ((120, 100), (1380, 100), (120, 885), (1380, 885)):
        draw.ellipse((x - 52, y - 52, x + 52, y + 52), fill="#4f9863", outline="#2d6540", width=7)

    start = (765, 920) if crosses else (1120, 940)
    draw.ellipse((start[0] - 38, start[1] - 38, start[0] + 38, start[1] + 38), fill="#d64c42", outline="#20343c", width=8)

    thumb_size = (390, 246)
    if not crosses:
        # Station is straight ahead on the start side; the route never reaches
        # the marked crossing. This keeps both "straight" and "no cross" literal.
        thumb = destination_thumbnail(destination, (300, 190))
        canvas.paste(thumb, (970, 650))
        draw.rounded_rectangle((960, 640, 1280, 850), radius=30, outline="#20343c", width=10)
        arrow(draw, start, (1120, 870), "#278b70", width=38, head=50)
        draw.line((650, 430, 880, 590), fill="#d33f3f", width=38)
        draw.line((880, 430, 650, 590), fill="#d33f3f", width=38)
        return canvas

    if turn_right:
        thumb = destination_thumbnail(destination, thumb_size)
        canvas.paste(thumb, (1080, 70))
        draw.rounded_rectangle((1070, 60, 1480, 326), radius=35, outline="#20343c", width=10)
        draw.line((765, 920, 765, 250, 1050, 250), fill="#278b70", width=38, joint="curve")
        arrow(draw, (765, 300), (1050, 250), "#278b70", width=38, head=58)
    else:
        thumb = destination_thumbnail(destination, thumb_size)
        canvas.paste(thumb, (570, 55))
        draw.rounded_rectangle((560, 45, 970, 311), radius=35, outline="#20343c", width=10)
        arrow(draw, start, (765, 335), "#278b70", width=38, head=58)
    return canvas


def find_station_scene() -> Image.Image:
    canvas = Image.new("RGB", SIZE, "#d9cfb8")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 390, 1536, 620), fill="#596871")
    draw.rectangle((615, 0, 915, 1024), fill="#68777d")
    for y in range(405, 610, 43):
        draw.rounded_rectangle((640, y, 890, y + 24), radius=5, fill="#f7f4ec")
    for x, y in ((120, 100), (1380, 100), (120, 885), (1380, 885)):
        draw.ellipse((x - 52, y - 52, x + 52, y + 52), fill="#4f9863", outline="#2d6540", width=7)

    # Start and destination are explicit, but no route is drawn yet.
    person(draw, 270, 865, 0.92, "#2f6fae", stride=False)
    draw.ellipse((215, 870, 325, 980), fill="#d64c42", outline="#20343c", width=9)
    thumb = destination_thumbnail("station", (430, 270))
    canvas.paste(thumb, (1030, 60))
    draw.rounded_rectangle((1018, 48, 1472, 342), radius=38, outline="#278b70", width=18)
    draw.ellipse((990, 20, 1500, 370), outline="#65b788", width=12)
    return canvas


def copy_help_scene(source_name: str, target_name: str, output_dir: Path) -> Path:
    source_path = ASSET_ROOT / source_name
    if not source_path.is_file():
        raise FileNotFoundError(f"Missing reviewed source: {source_path}")
    with Image.open(source_path) as opened:
        if opened.size != SIZE or opened.format != "WEBP":
            raise ValueError(f"Help source is not an exact 1536x1024 WebP: {source_path}")
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / target_name
    shutil.copyfile(source_path, destination)
    return destination


def build(output_dir: Path) -> list[Path]:
    written: list[Path] = []
    for target_name, source_name in HELP_COPIES.items():
        written.append(copy_help_scene(source_name, target_name, output_dir))
    for target_name, (shirt, variant) in CROSSWALK_TARGETS.items():
        written.append(save_webp(crosswalk_scene(shirt, variant), target_name, output_dir))
    for target_name, kind in SPATIAL_TARGETS.items():
        written.append(save_webp(spatial_scene(kind), target_name, output_dir))
    for target_name, (vehicle, people, allowed) in TRANSPORT_TARGETS.items():
        written.append(save_webp(transport_scene(vehicle, people, allowed), target_name, output_dir))
    for target_name, (crosses, destination, turn_right) in ROUTE_TARGETS.items():
        written.append(save_webp(route_scene(crosses, destination, turn_right), target_name, output_dir))
    written.append(save_webp(find_station_scene(), "a1_scene_find-the-station_2ffd5ff.webp", output_dir))
    for target_name, ordered_sources in ORDERED_COLLAGE_TARGETS.items():
        written.append(save_webp(ordered_photo_collage(ordered_sources), target_name, output_dir))
    for target_name, allowed in WALK_ROUTE_TARGETS.items():
        written.append(save_webp(walk_route_scene(allowed), target_name, output_dir))
    for target_name, (subject, reference, relation) in PLACE_RELATION_TARGETS.items():
        written.append(save_webp(place_relation_scene(subject, reference, relation), target_name, output_dir))
    for target_name, (left, right, highlighted) in PAIRED_PLACE_TARGETS.items():
        written.append(save_webp(paired_place_scene(left, right, highlighted), target_name, output_dir))
    written.append(save_webp(station_left_scene(gratitude=False), "a1_scene_it-is-on-the-left_f11a126.webp", output_dir))
    written.append(
        save_webp(station_left_scene(gratitude=True), "a1_scene_it-is-on-the-left-thank-you_fc1f140.webp", output_dir)
    )
    written.append(save_webp(walks_scene(), "a1_scene_walks_125feda.webp", output_dir))
    return written


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build deterministic Unit 6 repairs for exact crossing, help, transit, route, "
            "walking, place-relation, and ordered-retrieval contracts."
        )
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ASSET_ROOT,
        help="Destination directory (defaults to the canonical lesson image directory).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    written = build(output_dir)
    for path in written:
        print(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)
    print(f"Built {len(written)} exact 1536x1024 WebP semantic repairs.")


if __name__ == "__main__":
    main()
