from __future__ import annotations

"""Build the crop-safe Lesson 3.4 number variants for thirteen through eighteen.

The ordinary 3:2 number masters place the numeral on the left and the dot array
on the right. The fixed centered 4:5 mobile crop cannot retain both cues, and an
older repair accidentally kept only the numeral. These deterministic siblings
stack the numeral above the complete five-column dot array inside the exact
four-card safe area. The existing one-through-ten art is deliberately outside
this builder's registry and remains byte-for-byte untouched.
"""

import argparse
import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

try:
    from scripts.build_a1_media_composites import background, font
except ModuleNotFoundError:  # Direct `python scripts/...` execution.
    from build_a1_media_composites import background, font


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
SIZE = (1536, 1024)

# A centered 4:5 crop of the 1536x1024 master retains x=358..1178.
SAFE_LEFT = 358
SAFE_RIGHT = 1178
SAFE_TOP = 0
SAFE_BOTTOM = 1024

NUMBER_CENTER_X = 768
NUMBER_TOP = 72
NUMBER_FONT_SIZE = 300

DOT_COLUMNS = 5
DOT_X = (508, 638, 768, 898, 1028)
DOT_START_Y = 500
DOT_SPACING_Y = 125
DOT_RADIUS = 34

DIGIT_FILL = "#aeb5ba"
DIGIT_OUTLINE = "#33383b"
DOT_FILL = "#c99a35"
DOT_OUTLINE = "#6f531c"

TARGETS = {
    "a1_scene_n13_e92ef3e_four-card.webp": 13,
    "a1_scene_n14_f713285_four-card.webp": 14,
    "a1_scene_n15_35e4ec4_four-card.webp": 15,
    "a1_scene_n16_e4aa4eb_four-card.webp": 16,
    "a1_scene_n17_9b96027_four-card.webp": 17,
    "a1_scene_n18_bdd888e_four-card.webp": 18,
}


def dot_centers(number: int) -> tuple[tuple[int, int], ...]:
    if number not in TARGETS.values():
        raise ValueError(f"Unsupported four-card number: {number}")
    return tuple(
        (DOT_X[index % DOT_COLUMNS], DOT_START_Y + (index // DOT_COLUMNS) * DOT_SPACING_Y)
        for index in range(number)
    )


def _assert_safe_bounds(
    number: int,
    numeral_bounds: tuple[int, int, int, int],
    centers: tuple[tuple[int, int], ...],
) -> None:
    left, top, right, bottom = numeral_bounds
    if not (SAFE_LEFT <= left < right <= SAFE_RIGHT and SAFE_TOP <= top < bottom <= SAFE_BOTTOM):
        raise RuntimeError(f"Number {number} numeral escaped the centered four-card crop: {numeral_bounds}")
    if len(centers) != number:
        raise RuntimeError(f"Number {number} rendered {len(centers)} dots")
    for x, y in centers:
        bounds = (x - DOT_RADIUS, y - DOT_RADIUS, x + DOT_RADIUS, y + DOT_RADIUS)
        left, top, right, bottom = bounds
        if not (SAFE_LEFT <= left < right <= SAFE_RIGHT and SAFE_TOP <= top < bottom <= SAFE_BOTTOM):
            raise RuntimeError(f"Number {number} dot escaped the centered four-card crop: {bounds}")


def render_number(number: int) -> Image.Image:
    image = background("#e0a84c")
    draw = ImageDraw.Draw(image)

    numeral = str(number)
    numeral_font = font(NUMBER_FONT_SIZE)
    measured = draw.textbbox((0, 0), numeral, font=numeral_font, stroke_width=9)
    width = measured[2] - measured[0]
    x = NUMBER_CENTER_X - width // 2 - measured[0]
    y = NUMBER_TOP - measured[1]
    draw.text(
        (x, y),
        numeral,
        font=numeral_font,
        fill=DIGIT_FILL,
        stroke_width=9,
        stroke_fill=DIGIT_OUTLINE,
    )
    numeral_bounds = draw.textbbox((x, y), numeral, font=numeral_font, stroke_width=9)

    centers = dot_centers(number)
    for dot_x, dot_y in centers:
        draw.ellipse(
            (
                dot_x - DOT_RADIUS,
                dot_y - DOT_RADIUS,
                dot_x + DOT_RADIUS,
                dot_y + DOT_RADIUS,
            ),
            fill=DOT_FILL,
            outline=DOT_OUTLINE,
            width=6,
        )

    _assert_safe_bounds(number, numeral_bounds, centers)
    return image


def build_registry() -> dict[str, Image.Image]:
    rendered = {filename: render_number(number) for filename, number in TARGETS.items()}
    if set(rendered) != set(TARGETS):
        missing = sorted(set(TARGETS) - set(rendered))
        extra = sorted(set(rendered) - set(TARGETS))
        raise RuntimeError(f"Four-card number registry drift: missing={missing}, extra={extra}")
    return rendered


def save_outputs(rendered: dict[str, Image.Image], output_dir: Path) -> list[Path]:
    if set(rendered) != set(TARGETS):
        missing = sorted(set(TARGETS) - set(rendered))
        extra = sorted(set(rendered) - set(TARGETS))
        raise RuntimeError(f"Four-card number registry drift: missing={missing}, extra={extra}")

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for filename in TARGETS:
        image = rendered[filename]
        if image.size != SIZE:
            raise RuntimeError(f"{filename}: rendered {image.size}, expected {SIZE}")
        destination = output_dir / filename
        image.save(destination, "WEBP", quality=94, method=6, exact=True)
        with Image.open(destination) as written:
            if written.size != SIZE or written.format != "WEBP":
                raise RuntimeError(f"{filename}: wrote {written.format} at {written.size}")
        outputs.append(destination)
    return outputs


def render_contact_sheet(paths: list[Path], destination: Path) -> Path:
    tile_width = 260
    tile_height = 325
    label_height = 44
    columns = 3
    rows = math.ceil(len(paths) / columns)
    sheet = Image.new("RGB", (columns * tile_width, rows * (tile_height + label_height)), "#f5f0e6")
    draw = ImageDraw.Draw(sheet)
    label_font = font(19)
    for index, path in enumerate(paths):
        column = index % columns
        row = index // columns
        x = column * tile_width
        y = row * (tile_height + label_height)
        with Image.open(path) as opened:
            crop = ImageOps.fit(opened.convert("RGB"), (240, 300), Image.Resampling.LANCZOS)
        sheet.paste(crop, (x + 10, y + 10))
        draw.rounded_rectangle((x + 8, y + 8, x + 252, y + 317), radius=18, outline="#33383b", width=4)
        draw.text((x + 10, y + tile_height + 4), path.name.split("_n", 1)[1].split("_", 1)[0], fill="#33383b", font=label_font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "PNG", optimize=True)
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the six crop-safe Lesson 3.4 number variants.")
    parser.add_argument("--output-dir", type=Path, default=ASSET_ROOT)
    parser.add_argument("--contact-sheet", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    paths = save_outputs(build_registry(), args.output_dir)
    for path in paths:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        print(f"{path.name}\t{digest}")
    if args.contact_sheet:
        print(f"contact-sheet\t{render_contact_sheet(paths, args.contact_sheet)}")
    print(f"Built {len(paths)} deterministic 1536x1024 Lesson 3.4 four-card number variants.")


if __name__ == "__main__":
    main()
