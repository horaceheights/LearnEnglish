from __future__ import annotations

"""Build deterministic centered-4:5 repairs for the first A1 audit batch.

The lesson UI fills a fixed portrait 4:5 tile from a landscape 3:2 master.  The
files in this batch were semantically correct (or already repaired) at 3:2 but
lost an answer-critical cue in that centered crop.  Each output below is a new
``*_four-card.webp`` sibling; canonical wide assets are deliberately untouched.

This builder uses the project's editable Pillow scene primitives.  Counts,
colors, times, arrows, object relations, and nationality cues are all literal
geometry rather than generated-image guesses.
"""

import argparse
import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

import build_a1_unit7_semantic_repairs as unit7
import build_a1_units3_5_semantic_repairs as units3_5


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
SIZE = (1536, 1024)

# A centered 4:5 crop of a 1536x1024 master retains x=358.4..1177.6.  Critical
# geometry is kept a little farther in than that to tolerate integer rounding.
SAFE_LEFT = 370
SAFE_RIGHT = 1166

INK = units3_5.INK
TEAL = units3_5.TEAL
BLUE = units3_5.BLUE
GOLD = units3_5.GOLD
RED = units3_5.RED
GREEN = units3_5.GREEN


BASE_FILENAMES = (
    "a1_scene_afternoon_7a10f39.webp",
    "a1_scene_ana-mexican_1fca9cc.webp",
    "a1_scene_asks-hospital_fd7a80d.webp",
    "a1_scene_book-next-to-table_11e545b.webp",
    "a1_scene_book-on-table_493a24c.webp",
    "a1_scene_book-under-table_3882341.webp",
    "a1_scene_boy-wants-chicken_33caa20.webp",
    "a1_scene_boy-wants-two-eggs_e6f44b3.webp",
    "a1_scene_bus-arrives-8-00-night_ac2fbb8.webp",
    "a1_scene_bus-arrives-8-night_aa53495.webp",
    "a1_scene_bus-leaves-6-night_59526f5.webp",
    "a1_scene_bus-leaves-7-night_937441f.webp",
    "a1_scene_bus-leaves-8-00-night_4e10422.webp",
    "a1_scene_bus-leaves-8-night_094ebc0.webp",
    "a1_scene_coffee-for-breakfast_54853c5.webp",
    "a1_scene_cold-and-sunny_e290276.webp",
    "a1_scene_diego-spanish_5d1c02d.webp",
    "a1_scene_does-not-like-fish_6232056.webp",
    "a1_scene_does-not-like-rice_90d5dff.webp",
    "a1_scene_five-oranges_c241081.webp",
    "a1_scene_five-strawberries_858ca75.webp",
    "a1_scene_four-blue-chairs_f3183f0.webp",
    "a1_scene_four-oranges_9e38f8c.webp",
    "a1_scene_four-red-chairs_0275a9d.webp",
    "a1_scene_four-strawberries_f01534e.webp",
    "a1_scene_four-yellow-bananas_d84c53d.webp",
    "a1_scene_hot-and-cloudy_801561e.webp",
    "a1_scene_hot-and-sunny_c88d51f.webp",
)


def four_card_filename(base_filename: str) -> str:
    return base_filename.removesuffix(".webp") + "_four-card.webp"


def scene(accent: str = "#d8b06f", panel_fill: str = "#fffaf1") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = units3_5.canvas(accent)
    draw = ImageDraw.Draw(image)
    # The panel extends beyond the portrait crop.  It is scene background, not
    # letterbox padding, and keeps every tile visually consistent with the A1 set.
    draw.rounded_rectangle((120, 45, 1416, 979), radius=76, fill=panel_fill, outline=INK, width=10)
    return image, draw


def draw_afternoon() -> Image.Image:
    image, draw = scene("#e6bc67", "#fff3cf")
    # 3:00 plus a still-bright, descending sun gives an unambiguous afternoon
    # cue without relying on the outer edges of the landscape composition.
    units3_5.clock(draw, 650, 475, 3, True, 0.92)
    unit7.draw_sun(draw, 980, 270, 0.82)
    draw.arc((865, 210, 1115, 650), 270, 80, fill=GOLD, width=13)
    for x, y in ((1060, 520), (1000, 620), (920, 700)):
        draw.ellipse((x - 10, y - 10, x + 10, y + 10), fill=GOLD)
    return image


def draw_nationality(name: str, country: str) -> Image.Image:
    image, draw = scene("#d8abc4", "#fff5ef")
    person_x = 575
    units3_5.person(draw, person_x, 900, name, 0.82, "self", True)
    flag_x = 980
    units3_5.flag(draw, flag_x, 345, country, 0.84)
    units3_5.badge(draw, flag_x, 555, country.upper(), GOLD, 330)
    units3_5.speech_marker(draw, 905, 155, TEAL, False)
    return image


def draw_asks_hospital() -> Image.Image:
    image, draw = scene("#c6dfdc", "#eef4ec")
    # Keep one complete, recognizable hospital and the asker together inside the
    # exact centered 4:5 crop.  A speech-bubble tail points back to the confused
    # person; there is intentionally no route arrow because this scene means ASK.
    draw.rounded_rectangle((395, 755, 1145, 820), radius=28, fill="#c8c8bf")
    draw.line((420, 787, 1120, 787), fill="#f7f0d7", width=9)

    unit7.draw_person(draw, 535, 575, 0.43, shirt="#176875", mood="confused")
    draw.rounded_rectangle((470, 135, 735, 325), radius=58, fill="#fff7dd", outline=GOLD, width=10)
    draw.polygon(((540, 318), (565, 395), (625, 320)), fill="#fff7dd", outline=GOLD)
    draw.text((550, 130), "?", font=units3_5.font(150), fill=INK)

    # A full facade, roofline, entrance, windows, and large medical cross make
    # the venue unmistakable even after the portrait crop and phone downscaling.
    draw.rounded_rectangle((760, 300, 1150, 775), radius=30, fill="#e9e2d5", outline=INK, width=10)
    draw.polygon(((740, 345), (955, 245), (1170, 345)), fill="#8ca6af", outline=INK)
    draw.line((780, 345, 1130, 345), fill=INK, width=10)

    draw.rounded_rectangle((865, 375, 1045, 545), radius=28, fill="#fffdf7", outline=RED, width=9)
    draw.rectangle((930, 400, 980, 520), fill=RED)
    draw.rectangle((895, 435, 1015, 485), fill=RED)

    for x0 in (805, 1050):
        draw.rounded_rectangle((x0, 575, x0 + 60, 665), radius=10, fill="#bfe4e8", outline=INK, width=6)
        draw.line((x0 + 30, 580, x0 + 30, 660), fill="#f7fbfb", width=5)
    draw.rounded_rectangle((900, 570, 1010, 775), radius=18, fill="#bfe4e8", outline=INK, width=8)
    draw.line((955, 580, 955, 770), fill="#f7fbfb", width=7)
    draw.ellipse((970, 670, 984, 684), fill=GOLD, outline=INK, width=3)
    return image


def draw_table(draw: ImageDraw.ImageDraw, *, left: int = 485, right: int = 1051, top: int = 430) -> None:
    draw.rounded_rectangle((left, top, right, top + 100), radius=26, fill="#a66d3f", outline=INK, width=10)
    draw.line((left + 65, top + 95, left + 25, 875), fill=INK, width=27)
    draw.line((right - 65, top + 95, right - 25, 875), fill=INK, width=27)


def draw_horizontal_book(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=20, fill=BLUE, outline=INK, width=10)
    draw.line((x0 + 28, y0 + 15, x0 + 28, y1 - 15), fill="#eaf0ec", width=9)
    draw.line((x0 + 42, y1 - 18, x1 - 18, y1 - 18), fill="#f4e9cf", width=7)


def draw_book_relation(relation: str) -> Image.Image:
    image, draw = scene("#d8c08e", "#fffaf0")
    if relation == "next-to":
        draw_table(draw, left=420, right=790, top=380)
        # The book is wholly outside the table footprint with a visible gap.
        draw_horizontal_book(draw, (925, 575, 1095, 790))
        draw.line((815, 675, 885, 675), fill=TEAL, width=18)
        draw.ellipse((803, 663, 827, 687), fill=TEAL)
        draw.ellipse((873, 663, 897, 687), fill=TEAL)
    elif relation == "on":
        draw_table(draw, top=485)
        # The book's lower edge visibly rests on the tabletop's upper edge.
        draw_horizontal_book(draw, (625, 355, 911, 485))
        draw.line((650, 475, 886, 475), fill="#f4e9cf", width=7)
    elif relation == "under":
        draw_table(draw, top=300)
        # Clear air separates the tabletop from the fully visible book below it.
        draw_horizontal_book(draw, (650, 625, 886, 785))
        draw.line((768, 555, 768, 600), fill=TEAL, width=18)
        draw.polygon(((740, 585), (796, 585), (768, 615)), fill=TEAL)
    else:
        raise ValueError(f"Unsupported book relation: {relation}")
    return image


def draw_want(item: str, count: int = 1) -> Image.Image:
    image, draw = scene("#9fcbae", "#eef7ec")
    marks = units3_5.person(draw, 540, 900, "Boy", 0.72, "point-right", False)
    if count == 1:
        units3_5.food(draw, item, 975, 565, 1.02)
    else:
        for x in (900, 1050):
            units3_5.food(draw, item, x, 585, 0.82)
        units3_5.badge(draw, 975, 265, str(count), GOLD, 145)
    units3_5.arrow(draw, (marks["right_hand"][0] + 24, marks["right_hand"][1] - 6), (825, 575), TEAL)
    draw.arc((838, 500, 925, 590), 115, 245, fill=TEAL, width=10)
    return image


def draw_station(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    draw.polygon(((x0 + 5, y0 + 115), ((x0 + x1) // 2, y0 + 20), (x1 - 5, y0 + 115)), fill=GOLD, outline=INK)
    draw.rectangle((x0 + 25, y0 + 115, x1 - 25, y1), fill="#f2eadc", outline=INK, width=8)
    draw.rounded_rectangle((x0 + 62, y0 + 185, x1 - 62, y1 - 35), radius=22, fill=BLUE, outline=INK, width=7)
    draw.rectangle((x0 + 82, y0 + 205, x1 - 82, y0 + 265), fill="#bfe4e8")
    draw.ellipse((x1 - 30, y0 + 85, x1 + 35, y0 + 150), fill=TEAL, outline=INK, width=6)
    draw.line((x1 + 3, y0 + 145, x1 + 3, y1), fill=INK, width=8)


def paste_rounded(image: Image.Image, source: Image.Image, box: tuple[int, int, int, int], radius: int = 35) -> None:
    x0, y0, x1, y1 = box
    fitted = ImageOps.fit(source.convert("RGB"), (x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    mask = Image.new("L", fitted.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, fitted.width - 1, fitted.height - 1), radius=radius, fill=255)
    image.paste(fitted, (x0, y0), mask)


def draw_night_bus(*, hour: int, action: str) -> Image.Image:
    image = Image.new("RGB", SIZE, "#24324d")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 760, 1536, 1024), fill="#4b5960")
    draw.rectangle((0, 810, 1536, 850), fill="#f4d45f")
    # Stable star locations avoid any random build output.
    for x, y, r in ((430, 120, 7), (520, 220, 5), (830, 110, 6), (1110, 260, 5), (750, 270, 4)):
        draw.ellipse((x - r, y - r, x + r, y + r), fill="#fff4c2")
    # Moon and exact PM time are both fully inside the crop.
    draw.ellipse((990, 105, 1100, 215), fill="#f6e9ad", outline="#ad9b63", width=6)
    draw.ellipse((1028, 80, 1115, 188), fill="#24324d")
    units3_5.badge(draw, 680, 165, f"{hour}:00 PM", TEAL, 330)

    with Image.open(ASSET_ROOT / "a1_scene_bus_32c70ce.webp") as opened:
        paste_rounded(image, opened, (420, 365, 745, 650), 35)
    draw.rounded_rectangle((410, 355, 755, 660), radius=42, outline="#f4f0e6", width=9)
    draw_station(draw, (915, 350, 1135, 680))

    if action == "arrives":
        units3_5.arrow(draw, (770, 585), (885, 585), GREEN)
    elif action == "leaves":
        units3_5.arrow(draw, (885, 585), (770, 585), RED)
    else:
        raise ValueError(f"Unsupported bus action: {action}")
    return image


def draw_coffee_breakfast() -> Image.Image:
    image, draw = scene("#e8c272", "#fff2d5")
    units3_5.badge(draw, 768, 155, "BREAKFAST", GOLD, 420)
    unit7.draw_sun(draw, 1010, 205, 0.60)
    units3_5.person(draw, 535, 900, "Woman", 0.68, "point-right", False)
    draw.rounded_rectangle((760, 690, 1115, 775), radius=20, fill="#a66d3f", outline=INK, width=9)
    draw.line((815, 770, 790, 925), fill=INK, width=22)
    draw.line((1060, 770, 1085, 925), fill=INK, width=22)
    # The cup's lower edge meets the tabletop; it cannot read as floating.
    units3_5.food(draw, "coffee", 930, 630, 0.84)
    return image


def draw_weather(*, temperature: str, sky: str) -> Image.Image:
    cold = temperature == "cold"
    image, draw = scene("#cfe2ec" if cold else "#f2cc91", "#edf5f5" if cold else "#fff2d4")
    unit7.draw_thermometer(draw, 480, 535, hot=not cold)
    if sky == "sunny":
        unit7.draw_sun(draw, 1010, 225, 0.72)
    elif sky == "cloudy":
        unit7.draw_cloud(draw, 1010, 225, 0.68)
    else:
        raise ValueError(f"Unsupported sky: {sky}")
    unit7.draw_person(
        draw,
        765,
        560,
        0.68,
        shirt=BLUE if cold else "#f1eee1",
        mood="sad" if cold else "tired",
        arms="stomach" if cold else "yawn",
    )
    if cold:
        for x in (585, 960):
            draw.line((x, 465, x - 28, 500, x + 20, 535, x - 15, 570), fill=BLUE, width=8)
        for i in range(3):
            draw.ellipse((900 + i * 48, 365 - i * 15, 940 + i * 48, 390 - i * 15), fill="#d7eef4", outline=BLUE, width=4)
    else:
        for x, y in ((700, 225), (825, 260), (900, 335)):
            draw.ellipse((x - 11, y - 26, x + 11, y + 26), fill="#5eb2d1", outline=BLUE, width=4)
        for offset in (0, 50, 100):
            draw.arc((900 + offset, 430 - offset // 3, 1000 + offset, 545 - offset // 3), 90, 270, fill=RED, width=9)
    return image


def draw_dislike(item: str) -> Image.Image:
    image, draw = scene("#d6abc0", "#fff1f0")
    units3_5.person(draw, 530, 900, "Woman", 0.70, "point-right", False)
    units3_5.food(draw, item, 930, 590, 1.08)
    # The crossed circle is adjacent to, not over, the food so the object remains
    # identifiable while the negative preference is unmistakable.
    units3_5.heart(draw, 1025, 245, False)
    draw.line((760, 620, 830, 600), fill=RED, width=15)
    draw.line((830, 600, 800, 575), fill=RED, width=15)
    return image


def draw_chair(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float, color: str) -> None:
    s = scale
    draw.rounded_rectangle((x - int(72 * s), y - int(135 * s), x + int(72 * s), y - int(25 * s)), radius=int(14 * s), fill=color, outline=INK, width=max(5, int(8 * s)))
    draw.rounded_rectangle((x - int(88 * s), y - int(25 * s), x + int(88 * s), y + int(58 * s)), radius=int(15 * s), fill=color, outline=INK, width=max(5, int(8 * s)))
    draw.line((x - int(66 * s), y + int(50 * s), x - int(78 * s), y + int(150 * s)), fill=INK, width=max(7, int(12 * s)))
    draw.line((x + int(66 * s), y + int(50 * s), x + int(78 * s), y + int(150 * s)), fill=INK, width=max(7, int(12 * s)))


def draw_exact_count(kind: str, count: int, *, color: str | None = None) -> Image.Image:
    image, draw = scene("#e3c477", "#fffaf0")
    units3_5.badge(draw, 768, 150, str(count), GOLD, 150)
    if count == 5:
        positions = ((610, 410), (926, 410), (505, 705), (768, 705), (1031, 705))
    elif count == 4:
        positions = ((620, 430), (916, 430), (620, 720), (916, 720))
    else:
        raise ValueError(f"Unsupported count: {count}")

    for x, y in positions:
        if kind == "chair":
            draw_chair(draw, x, y, 0.70, color or BLUE)
        elif kind == "banana":
            units3_5.banana(draw, x, y, 0.55)
        else:
            units3_5.food(draw, kind, x, y, 0.84, color)
    return image


def build_registry() -> dict[str, Image.Image]:
    return {
        "a1_scene_afternoon_7a10f39.webp": draw_afternoon(),
        "a1_scene_ana-mexican_1fca9cc.webp": draw_nationality("Ana", "mexico"),
        "a1_scene_asks-hospital_fd7a80d.webp": draw_asks_hospital(),
        "a1_scene_book-next-to-table_11e545b.webp": draw_book_relation("next-to"),
        "a1_scene_book-on-table_493a24c.webp": draw_book_relation("on"),
        "a1_scene_book-under-table_3882341.webp": draw_book_relation("under"),
        "a1_scene_boy-wants-chicken_33caa20.webp": draw_want("chicken"),
        "a1_scene_boy-wants-two-eggs_e6f44b3.webp": draw_want("egg", 2),
        "a1_scene_bus-arrives-8-00-night_ac2fbb8.webp": draw_night_bus(hour=8, action="arrives"),
        "a1_scene_bus-arrives-8-night_aa53495.webp": draw_night_bus(hour=8, action="arrives"),
        "a1_scene_bus-leaves-6-night_59526f5.webp": draw_night_bus(hour=6, action="leaves"),
        "a1_scene_bus-leaves-7-night_937441f.webp": draw_night_bus(hour=7, action="leaves"),
        "a1_scene_bus-leaves-8-00-night_4e10422.webp": draw_night_bus(hour=8, action="leaves"),
        "a1_scene_bus-leaves-8-night_094ebc0.webp": draw_night_bus(hour=8, action="leaves"),
        "a1_scene_coffee-for-breakfast_54853c5.webp": draw_coffee_breakfast(),
        "a1_scene_cold-and-sunny_e290276.webp": draw_weather(temperature="cold", sky="sunny"),
        "a1_scene_diego-spanish_5d1c02d.webp": draw_nationality("Diego", "spain"),
        "a1_scene_does-not-like-fish_6232056.webp": draw_dislike("fish"),
        "a1_scene_does-not-like-rice_90d5dff.webp": draw_dislike("rice"),
        "a1_scene_five-oranges_c241081.webp": draw_exact_count("orange", 5),
        "a1_scene_five-strawberries_858ca75.webp": draw_exact_count("strawberry", 5),
        "a1_scene_four-blue-chairs_f3183f0.webp": draw_exact_count("chair", 4, color=BLUE),
        "a1_scene_four-oranges_9e38f8c.webp": draw_exact_count("orange", 4),
        "a1_scene_four-red-chairs_0275a9d.webp": draw_exact_count("chair", 4, color=RED),
        "a1_scene_four-strawberries_f01534e.webp": draw_exact_count("strawberry", 4),
        "a1_scene_four-yellow-bananas_d84c53d.webp": draw_exact_count("banana", 4),
        "a1_scene_hot-and-cloudy_801561e.webp": draw_weather(temperature="hot", sky="cloudy"),
        "a1_scene_hot-and-sunny_c88d51f.webp": draw_weather(temperature="hot", sky="sunny"),
    }


def save_outputs(rendered: dict[str, Image.Image], output_dir: Path) -> list[Path]:
    expected = set(BASE_FILENAMES)
    if set(rendered) != expected:
        missing = sorted(expected - set(rendered))
        extra = sorted(set(rendered) - expected)
        raise RuntimeError(f"Four-card repair registry drift: missing={missing}, extra={extra}")

    output_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for base_filename in BASE_FILENAMES:
        image = rendered[base_filename]
        if image.size != SIZE:
            raise ValueError(f"{base_filename}: rendered {image.size}, expected {SIZE}")
        destination = output_dir / four_card_filename(base_filename)
        image.save(destination, "WEBP", quality=92, method=6)
        with Image.open(destination) as written:
            if written.size != SIZE or written.format != "WEBP":
                raise ValueError(f"{destination.name}: wrote {written.format} at {written.size}")
        paths.append(destination)
    return paths


def render_contact_sheet(paths: list[Path], destination: Path) -> Path:
    tile_w, tile_h = 260, 325
    label_h = 72
    columns = 4
    rows = math.ceil(len(paths) / columns)
    sheet = Image.new("RGB", (columns * tile_w, rows * (tile_h + label_h)), "#f5f0e6")
    draw = ImageDraw.Draw(sheet)
    label_font = units3_5.font(18, False)
    for index, path in enumerate(paths):
        column = index % columns
        row = index // columns
        x = column * tile_w
        y = row * (tile_h + label_h)
        with Image.open(path) as opened:
            # ImageOps.fit here exactly models the centered 4:5 fill used by the app.
            crop = ImageOps.fit(opened.convert("RGB"), (tile_w - 20, tile_h - 25), Image.Resampling.LANCZOS)
        sheet.paste(crop, (x + 10, y + 10))
        draw.rounded_rectangle((x + 8, y + 8, x + tile_w - 8, y + tile_h - 7), radius=18, outline=INK, width=4)
        short_name = path.name.removeprefix("a1_scene_").removesuffix("_four-card.webp")
        draw.text((x + 10, y + tile_h + 1), short_name[:34], fill=INK, font=label_font)
        if len(short_name) > 34:
            draw.text((x + 10, y + tile_h + 24), short_name[34:68], fill=INK, font=label_font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "PNG", optimize=True)
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the first deterministic A1 four-card crop-repair batch.")
    parser.add_argument("--output-dir", type=Path, default=ASSET_ROOT)
    parser.add_argument("--contact-sheet", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paths = save_outputs(build_registry(), args.output_dir)
    for path in paths:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        print(f"{path.name}\t{digest}")
    if args.contact_sheet:
        print(f"contact-sheet\t{render_contact_sheet(paths, args.contact_sheet)}")
    print(f"Built {len(paths)} deterministic 1536x1024 four-card repair assets.")


if __name__ == "__main__":
    main()
