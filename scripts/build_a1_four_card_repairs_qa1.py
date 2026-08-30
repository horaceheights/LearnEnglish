from __future__ import annotations

"""Build deterministic safe-area repairs found in four-card QA sheets 1-6.

The mobile four-option grid center-crops a 3:2 master to a fixed 4:5 window.
These variants keep every answer-critical subject, polarity mark, time label,
transport direction, and identifying object inside that central safe area.
"""

import argparse
import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

import build_a1_four_card_repairs_a as batch_a
import build_a1_unit7_semantic_repairs as unit7
import build_a1_units3_5_semantic_repairs as units3_5


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
SIZE = (1536, 1024)

INK = units3_5.INK
BLUE = units3_5.BLUE
GOLD = units3_5.GOLD
GREEN = units3_5.GREEN
RED = units3_5.RED
TEAL = units3_5.TEAL

BASE_FILENAMES = (
    "a1_scene_ana-come-home_ad0dbb5.webp",
    "a1_scene_ana-go-school_83ace0e.webp",
    "a1_scene_asks-bank_0295ac7.webp",
    "a1_scene_asks-bathroom_03032c0.webp",
    "a1_scene_asks-station_745494e.webp",
    "a1_scene_boy-waits-at-red-signal_bc0177a.webp",
    "a1_scene_girl-waits-at-red-signal_c77147f.webp",
    "a1_scene_does-not-like-two-red-apples_d28d501.webp",
    "a1_scene_does-not-like-music_d5c6ed9.webp",
    "a1_scene_he-has-car_b3fa0ff.webp",
    "a1_scene_bus-arrives-6-morning_62e5453.webp",
    "a1_scene_bus-leaves-6-morning_45cf1bf.webp",
    "a1_scene_bus-leaves-8-00-morning_ffdbcde.webp",
    "a1_scene_bus-leaves-8-morning_ca11581.webp",
)


def four_card_filename(base_filename: str) -> str:
    return base_filename.removesuffix(".webp") + "_four-card.webp"


def draw_ana_journey(destination: str) -> Image.Image:
    image, draw = batch_a.scene("#91c9b3", "#eef5ec")
    units3_5.person(draw, 545, 900, "Ana", 0.68, "neutral", True)
    if destination == "home":
        units3_5.house(draw, 990, 610, 0.72)
    elif destination == "school":
        units3_5.school(draw, 990, 610, 0.72)
        units3_5.bag(draw, 700, 700, 0.42)
    else:
        raise ValueError(f"Unsupported journey destination: {destination}")
    units3_5.arrow(draw, (720, 630), (855, 605), TEAL)
    units3_5.speech_marker(draw, 520, 160, TEAL, False)
    return image


def draw_asks_for_place(kind: str) -> Image.Image:
    image, draw = batch_a.scene("#c6dfdc", "#eef4ec")
    # Keep the asker, question mark, and the complete identifying structure of
    # one target together. There is deliberately no route arrow: this means ASK.
    draw.rectangle((460, 110, 600, 900), fill="#c8c8bf")
    draw.rectangle((380, 625, 1155, 765), fill="#c8c8bf")
    unit7.draw_person(draw, 655, 565, 0.36, shirt="#176875", mood="confused")
    unit7.draw_building(draw, kind, (805, 315, 1135, 615), highlighted=True)
    unit7.question(draw, 1010, 155, 90)
    return image


def draw_waits_at_red_signal(subject: str) -> Image.Image:
    image, draw = batch_a.scene("#d6a1a1", "#fff2f0")

    # A complete, age-matched subject waits on the pavement before the road.
    # Long hair distinguishes the girl from the boy without relying on shirt
    # color alone. Both figures use the same size and pose.
    if "Girl" not in units3_5.PERSON:
        units3_5.PERSON["Girl"] = {
            "shirt": "#8d62ad",
            "skin": "#ba754e",
            "hair": "#2b211e",
            "female": True,
        }
    units3_5.person(draw, 525, 565, subject, 0.50, "neutral", False)

    # The road and all three crosswalk bars are wholly inside x=370..1166,
    # the centered 4:5 safe area of the 1536x1024 master.
    draw.rectangle((390, 595, 1145, 930), fill="#59676d")
    for y in (640, 735, 830):
        draw.rounded_rectangle((675, y, 1010, y + 48), radius=8, fill="#fffdf5")

    # A complete red signal, plus a large no-crossing X, makes polarity clear.
    draw.rounded_rectangle((950, 215, 1115, 520), radius=45, fill=INK, outline="#172126", width=9)
    draw.ellipse((985, 255, 1080, 350), fill="#443739", outline="#f4efe7", width=7)
    draw.ellipse((985, 375, 1080, 470), fill="#df3f3f", outline="#fff4ed", width=7)
    draw.line((745, 655, 935, 860), fill=RED, width=34)
    draw.line((935, 655, 745, 860), fill=RED, width=34)
    return image


def draw_negative_apples() -> Image.Image:
    image, draw = batch_a.scene("#d6abc0", "#fff5f2")
    units3_5.badge(draw, 575, 170, "2", GOLD, 150)
    units3_5.heart(draw, 965, 175, False)
    units3_5.food(draw, "apple", 650, 590, 1.22, RED)
    units3_5.food(draw, "apple", 900, 590, 1.22, RED)
    return image


def draw_music_no_symbol(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.ellipse((x - 120, y - 120, x + 120, y + 120), outline=RED, width=18)
    # A large eighth note remains legible after the 200x250 audit render.
    draw.line((x + 25, y - 65, x + 25, y + 40), fill=INK, width=18)
    draw.line((x + 25, y - 65, x + 88, y - 48), fill=INK, width=18)
    draw.ellipse((x - 35, y + 15, x + 35, y + 73), fill=INK)
    draw.line((x - 82, y + 82, x + 82, y - 82), fill=RED, width=22)


def draw_dislikes_music() -> Image.Image:
    image, draw = batch_a.scene("#d6abc0", "#fff3f0")
    # Preserve the exact reviewed source scene but scale the complete woman,
    # speaker, and man into the safe area instead of center-cropping the speaker.
    with Image.open(ASSET_ROOT / "a1_scene_does-not-like-music_d5c6ed9.webp") as opened:
        batch_a.paste_rounded(image, opened, (400, 185, 1136, 676), 38)
    draw.rounded_rectangle((390, 175, 1146, 686), radius=48, outline=INK, width=9)
    draw_music_no_symbol(draw, 768, 845)
    return image


def draw_he_has_car() -> Image.Image:
    image, draw = batch_a.scene("#d6b578", "#fff7e7")
    units3_5.badge(draw, 535, 165, "HE", units3_5.PURPLE, 210)
    units3_5.person(draw, 595, 900, "Luis", 0.68, "hold", True)
    units3_5.car(draw, 985, 690, 0.66)
    # Key and ring are explicit between Luis and the one complete white car.
    draw.ellipse((755, 565, 820, 630), fill=GOLD, outline=INK, width=8)
    draw.line((815, 600, 885, 645), fill=INK, width=12)
    draw.line((855, 625, 885, 605), fill=INK, width=10)
    return image


def draw_morning_bus(*, hour: int, action: str) -> Image.Image:
    image, draw = batch_a.scene("#e8c272", "#fffaf0")
    units3_5.badge(draw, 690, 155, f"{hour}:00 AM", TEAL, 340)
    unit7.draw_sun(draw, 1030, 165, 0.62)

    with Image.open(ASSET_ROOT / "a1_scene_bus_32c70ce.webp") as opened:
        batch_a.paste_rounded(image, opened, (410, 350, 735, 635), 35)
    draw.rounded_rectangle((400, 340, 745, 645), radius=42, outline="#f4f0e6", width=9)
    batch_a.draw_station(draw, (910, 340, 1130, 670))

    if action == "arrives":
        units3_5.arrow(draw, (760, 570), (895, 570), GREEN)
    elif action == "leaves":
        units3_5.arrow(draw, (895, 570), (760, 570), RED)
    else:
        raise ValueError(f"Unsupported bus action: {action}")
    return image


def build_registry() -> dict[str, Image.Image]:
    return {
        "a1_scene_ana-come-home_ad0dbb5.webp": draw_ana_journey("home"),
        "a1_scene_ana-go-school_83ace0e.webp": draw_ana_journey("school"),
        "a1_scene_asks-bank_0295ac7.webp": draw_asks_for_place("bank"),
        "a1_scene_asks-bathroom_03032c0.webp": draw_asks_for_place("bathroom"),
        "a1_scene_asks-station_745494e.webp": draw_asks_for_place("station"),
        "a1_scene_boy-waits-at-red-signal_bc0177a.webp": draw_waits_at_red_signal("Boy"),
        "a1_scene_girl-waits-at-red-signal_c77147f.webp": draw_waits_at_red_signal("Girl"),
        "a1_scene_does-not-like-two-red-apples_d28d501.webp": draw_negative_apples(),
        "a1_scene_does-not-like-music_d5c6ed9.webp": draw_dislikes_music(),
        "a1_scene_he-has-car_b3fa0ff.webp": draw_he_has_car(),
        "a1_scene_bus-arrives-6-morning_62e5453.webp": draw_morning_bus(hour=6, action="arrives"),
        "a1_scene_bus-leaves-6-morning_45cf1bf.webp": draw_morning_bus(hour=6, action="leaves"),
        "a1_scene_bus-leaves-8-00-morning_ffdbcde.webp": draw_morning_bus(hour=8, action="leaves"),
        "a1_scene_bus-leaves-8-morning_ca11581.webp": draw_morning_bus(hour=8, action="leaves"),
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
    label_h = 60
    columns = 4
    rows = math.ceil(len(paths) / columns)
    sheet = Image.new("RGB", (columns * tile_w, rows * (tile_h + label_h)), "#f5f0e6")
    draw = ImageDraw.Draw(sheet)
    label_font = units3_5.font(17, False)
    for index, path in enumerate(paths):
        column = index % columns
        row = index // columns
        x = column * tile_w
        y = row * (tile_h + label_h)
        with Image.open(path) as opened:
            crop = ImageOps.fit(opened.convert("RGB"), (tile_w - 20, tile_h - 25), Image.Resampling.LANCZOS)
        sheet.paste(crop, (x + 10, y + 10))
        draw.rounded_rectangle((x + 8, y + 8, x + tile_w - 8, y + tile_h - 7), radius=18, outline=INK, width=4)
        short_name = path.name.removeprefix("a1_scene_").removesuffix("_four-card.webp")
        draw.text((x + 10, y + tile_h + 1), short_name[:35], fill=INK, font=label_font)
        if len(short_name) > 35:
            draw.text((x + 10, y + tile_h + 22), short_name[35:70], fill=INK, font=label_font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "PNG", optimize=True)
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build deterministic four-card repairs from QA sheets 1-6.")
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
