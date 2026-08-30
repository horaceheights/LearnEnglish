from __future__ import annotations

"""Build follow-up deterministic four-card repairs from the sheets 7-12 QA.

The mobile four-option tile uses the centered 4:5 crop of a 1536x1024
master (x=358..1178).  These sibling variants keep every answer-critical cue
inside that exact safe area without changing the shared landscape masters.
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

import build_a1_four_card_repairs_b as repairs_b


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"


BASE_FILENAMES = {
    "one-person-can-go-by-bus": "a1_scene_one-person-can-go-by-bus_7eed7a1.webp",
    "rain-boots": "a1_scene_rain-boots_c3ee514.webp",
    "rain-umbrella": "a1_scene_rain-umbrella_60133ed.webp",
    "she-has-bike": "a1_scene_she-has-bike_b6f7660.webp",
    "three-green-pears": "a1_scene_three-green-pears_341c468.webp",
}


def single_transport_scene(vehicle: str) -> Image.Image:
    image = repairs_b.full_bleed("#e8e1d0", "#d8e5df")
    draw = ImageDraw.Draw(image)
    # The learner and vehicle both remain entirely inside the centered 4:5
    # safe area. The landscape master placed the learner outside that crop.
    repairs_b.units35.person(draw, 535, 890, "Man", 0.61, "point-right", False)
    source_name = "a1_scene_bus_32c70ce.webp" if vehicle == "bus" else "a1_scene_train_94efdd6.webp"
    repairs_b.photo_card(image, source_name, (800, 250, 1140, 610), highlighted=True, radius=34)
    repairs_b.arrow(draw, (735, 545), (795, 545), repairs_b.TEAL, width=26, head=40)
    repairs_b.check(draw, (985, 765), 65)
    return image


def rainy_clothing_choice(item: str) -> Image.Image:
    image = repairs_b.full_bleed("#cedbe2", "#dce9e2")
    draw = ImageDraw.Draw(image)
    # Keep the weather cue, learner, relationship arrow, and complete clothing
    # item inside x=358..1178, the exact mobile four-card crop.
    repairs_b.unit7.draw_cloud(draw, 500, 180, 0.58, rain=True)
    repairs_b.unit7.draw_person(draw, 555, 565, 0.60, shirt=repairs_b.TEAL, mood="happy")
    repairs_b.unit7.draw_item(draw, item, 970, 555, 0.72)
    repairs_b.arrow(draw, (760, 555), (835, 555), repairs_b.TEAL, width=24, head=40)
    return image


def she_has_bike_scene() -> Image.Image:
    image = repairs_b.full_bleed("#f0dfd8", "#dce9e2")
    draw = ImageDraw.Draw(image)
    # Pronoun, named learner, possession relation, and complete bicycle are
    # all explicit after the fixed centered crop.
    repairs_b.units35.badge(draw, 525, 150, "SHE", "#7957a8", 230)
    repairs_b.units35.person(draw, 565, 900, "Sofia", 0.63, "point-right", True)
    repairs_b.units35.bike(draw, 980, 560, 0.63)
    repairs_b.arrow(draw, (780, 570), (825, 570), repairs_b.TEAL, width=22, head=34)
    return image


def three_green_pears_scene() -> Image.Image:
    image = repairs_b.full_bleed("#d7e7d9", "#e8eee5")
    draw = ImageDraw.Draw(image)
    # Rebuild the count as clean geometry. The landscape source contains two
    # unexplained glyph-like artifacts above the otherwise correct three pears.
    for x in (550, 768, 986):
        repairs_b.units35.food(draw, "pear", x, 555, 0.83)
    return image


def build_scenes() -> dict[str, Image.Image]:
    return {
        "one-person-can-go-by-bus": single_transport_scene("bus"),
        "rain-boots": rainy_clothing_choice("boots"),
        "rain-umbrella": rainy_clothing_choice("umbrella"),
        "she-has-bike": she_has_bike_scene(),
        "three-green-pears": three_green_pears_scene(),
    }


def render_audit_sheet(written: list[Path], destination: Path) -> Path:
    tile_width, tile_height = 286, 410
    sheet = Image.new("RGB", (len(written) * tile_width, tile_height), "#efe9df")
    draw = ImageDraw.Draw(sheet)
    label_font = repairs_b.font(18, bold=False)
    for index, path in enumerate(written):
        with Image.open(path) as opened:
            crop = repairs_b.crop_4x5(opened.convert("RGB"))
            thumb = ImageOps.fit(crop, (250, 312), method=Image.Resampling.LANCZOS)
        x = index * tile_width + 18
        y = 12
        sheet.paste(thumb, (x, y))
        draw.rounded_rectangle((x, y, x + 250, y + 312), radius=12, outline=repairs_b.INK, width=4)
        concept = next(name for name, base in BASE_FILENAMES.items() if repairs_b.variant_filename(base) == path.name)
        draw.text((x, 337), concept, fill=repairs_b.INK, font=label_font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "PNG", optimize=True)
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build five follow-up crop-safe four-card media variants.")
    parser.add_argument("--output-dir", type=Path, default=ASSET_ROOT)
    parser.add_argument("--audit-sheet", type=Path, help="Optionally render the exact centered 4:5 crops for review.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    scenes = build_scenes()
    if set(scenes) != set(BASE_FILENAMES):
        raise RuntimeError("Follow-up repair registry is out of sync.")
    written = [
        repairs_b.save_webp(scenes[concept], repairs_b.variant_filename(base_filename), output_dir)
        for concept, base_filename in BASE_FILENAMES.items()
    ]
    for path in written:
        print(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)
    print(f"Built {len(written)} deterministic 1536x1024 crop-safe four-card variants (batch D).")
    if args.audit_sheet:
        destination = args.audit_sheet if args.audit_sheet.is_absolute() else ROOT / args.audit_sheet
        print(f"Centered 4:5 audit sheet: {render_audit_sheet(written, destination)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
