from __future__ import annotations

"""Build deterministic safe-area repairs found in the final four-card QA pass.

The mobile four-option grid takes the centered 4:5 crop of each 1536x1024
master (approximately x=358..1178).  Every identity, flag, time, direction,
place, action, and signal cue rendered here therefore lives wholly inside a
slightly narrower x=390..1146 working area.
"""

import argparse
import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

try:
    from scripts import build_a1_four_card_repairs_a as batch_a
    from scripts import build_a1_unit6_semantic_repairs as unit6
    from scripts import build_a1_unit7_semantic_repairs as unit7
    from scripts import build_a1_units3_5_semantic_repairs as units3_5
except (ModuleNotFoundError, ImportError):  # Direct ``python scripts/...`` execution.
    import build_a1_four_card_repairs_a as batch_a
    import build_a1_unit6_semantic_repairs as unit6
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
    "a1_scene_luis-american_5a29f49.webp",
    "a1_scene_sofia-canadian_adf798e.webp",
    "a1_scene_bank_bdd240c.webp",
    "a1_scene_bank-right_cad19dd.webp",
    "a1_scene_bus-leaves-9-00_8cee9f4.webp",
    "a1_scene_boy-crosses-at-green_4befcaf.webp",
    "a1_scene_ana-wake_d91086e.webp",
)


def four_card_filename(base_filename: str) -> str:
    return base_filename.removesuffix(".webp") + "_four-card.webp"


def draw_nationality(name: str, country: str, country_label: str) -> Image.Image:
    """Keep the complete named learner, flag, and country cue in one crop."""

    image, draw = batch_a.scene("#d8abc4", "#fff5ef")
    units3_5.person(draw, 575, 910, name, 0.72, "self", True)
    units3_5.flag(draw, 935, 315, country, 0.90)
    # Verbatim country labels prevent a small flag from becoming an identity
    # guessing exercise.  The label itself remains well inside x=358..1178.
    label_width = 390 if country_label == "UNITED STATES" else 300
    units3_5.badge(draw, 935, 535, country_label, GOLD, label_width)
    units3_5.speech_marker(draw, 760, 150, TEAL, False)
    return image


def draw_atm(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    """Draw one complete, explicitly labeled ATM with a visible card slot."""

    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=24, fill="#31526a", outline=INK, width=9)
    draw.rounded_rectangle((x0 + 24, y0 + 54, x1 - 24, y0 + 175), radius=14, fill="#bfe4e8", outline=INK, width=6)
    draw.rectangle((x0 + 55, y0 + 205, x1 - 55, y0 + 224), fill="#e9eef0", outline=INK, width=4)
    draw.rounded_rectangle((x0 + 42, y0 + 250, x1 - 42, y1 - 35), radius=12, fill="#e9eef0", outline=INK, width=5)
    font = units3_5.font(43)
    bounds = draw.textbbox((0, 0), "ATM", font=font)
    draw.text(
        ((x0 + x1 - (bounds[2] - bounds[0])) / 2, y0 + 5),
        "ATM",
        font=font,
        fill="#ffffff",
    )


def draw_bank(*, points_right: bool) -> Image.Image:
    """Render a classical facade plus a human ATM interaction cue."""

    image, draw = batch_a.scene("#d8ded8", "#f8f3e8")

    # The full roofline, columns, entrance, ATM, and customer fit in the fixed
    # portrait crop.  ATM is an object label, not the target venue word BANK.
    draw.polygon(((410, 320), (768, 130), (1126, 320)), fill="#8ca6af", outline=INK)
    draw.rectangle((430, 320, 1106, 835), fill="#e5ddd0", outline=INK, width=10)
    draw.line((455, 350, 1081, 350), fill=INK, width=10)
    for x in (485, 625, 765):
        draw.rounded_rectangle((x, 390, x + 68, 800), radius=14, fill="#f7f1e7", outline=INK, width=7)
    draw.rounded_rectangle((600, 500, 770, 835), radius=20, fill="#bfe4e8", outline=INK, width=8)
    draw.line((685, 510, 685, 825), fill="#f8fbfb", width=8)

    draw_atm(draw, (835, 400, 1075, 795))
    # A complete customer using the machine makes banking literal at thumbnail
    # size instead of relying on generic institutional architecture.
    units3_5.person(draw, 795, 900, "Man", 0.40, "point-right", False)

    if points_right:
        # Use a thick shaft and a closed triangular head so neither half of the
        # direction cue can disappear at the portrait crop boundary.
        draw.line((535, 225, 1010, 225), fill=TEAL, width=40)
        draw.polygon(((1010, 160), (1120, 225), (1010, 290)), fill=TEAL)
    return image


def draw_bus_leaves_nine() -> Image.Image:
    image, draw = batch_a.scene("#e8c272", "#fffaf0")
    units3_5.badge(draw, 768, 155, "9:00", TEAL, 320)

    # Reuse the reviewed bus source inside a compact photo card.  The source
    # already contains the entire bus and the modest fit removes only scenery.
    with Image.open(ASSET_ROOT / "a1_scene_bus_32c70ce.webp") as opened:
        batch_a.paste_rounded(image, opened, (400, 350, 770, 675), 38)
    draw.rounded_rectangle((390, 340, 780, 685), radius=46, outline=INK, width=9)
    batch_a.draw_station(draw, (905, 340, 1135, 685))

    # Departure is station -> bus/away (right to left), unlike arrival.
    units3_5.arrow(draw, (890, 790), (650, 790), RED)
    return image


def draw_walk_signal(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=38, fill=INK, outline="#172126", width=8)
    cx = (x0 + x1) // 2
    cy = y0 + 112
    draw.ellipse((cx - 62, cy - 62, cx + 62, cy + 62), fill="#35b96f", outline="#f0fff3", width=7)
    # White walking figure inside the illuminated green signal.
    draw.ellipse((cx - 15, cy - 37, cx + 15, cy - 7), fill="#ffffff")
    draw.line((cx, cy - 6, cx, cy + 36), fill="#ffffff", width=10)
    draw.line((cx, cy + 2, cx - 28, cy + 24), fill="#ffffff", width=9)
    draw.line((cx, cy + 3, cx + 29, cy + 22), fill="#ffffff", width=9)
    draw.line((cx, cy + 35, cx - 28, cy + 64), fill="#ffffff", width=9)
    draw.line((cx, cy + 35, cx + 31, cy + 63), fill="#ffffff", width=9)
    draw.line((cx, y1, cx, y1 + 155), fill=INK, width=24)
    draw.rounded_rectangle((cx - 75, y1 + 145, cx + 75, y1 + 185), radius=17, fill=INK)


def draw_boy_crosses_at_green() -> Image.Image:
    image = Image.new("RGB", SIZE, "#d5ead5")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 245, 1536, 805), fill="#596871")
    draw.rectangle((0, 805, 1536, 1024), fill="#ded7c9")
    draw.line((0, 245, 1536, 245), fill="#f1e8d5", width=20)
    draw.line((0, 805, 1536, 805), fill="#f1e8d5", width=20)

    # Every zebra stripe, the walking boy, and the illuminated signal are
    # visible together in the exact four-card crop.
    for x in (480, 570, 660, 750, 840):
        draw.rounded_rectangle((x, 280, x + 52, 770), radius=10, fill="#fffdf5")
    # The active stride is itself the crossing cue.  No route arrow is placed
    # over the learner, so the complete head and body remain readable.
    unit6.person(draw, 690, 730, 1.35, BLUE, stride=True)
    draw_walk_signal(draw, (930, 95, 1125, 355))
    return image


def draw_ana_wakes_at_seven() -> Image.Image:
    image, draw = batch_a.scene("#f1d594", "#fff7e7")
    unit7.draw_sun(draw, 500, 190, 0.72)
    units3_5.badge(draw, 990, 205, "7:00", TEAL, 280)

    # Bed, rising Ana, raised arms, identity, and exact time remain in one
    # integrated morning scene.  The foreground blanket occludes the lower legs
    # naturally and avoids the old floating-behind-a-bed composition.
    draw.rounded_rectangle((420, 570, 1116, 880), radius=54, fill="#d7c4a8", outline=INK, width=9)
    draw.rounded_rectangle((450, 520, 700, 650), radius=45, fill="#f8f3e8", outline=INK, width=7)
    unit7.draw_person(draw, 700, 475, 0.58, shirt=TEAL, mood="happy", arms="raised")
    units3_5.badge(draw, 700, 535, "ANA", GOLD, 190)
    draw.rectangle((440, 675, 1096, 850), fill="#e6c998", outline=INK, width=8)
    return image


def build_registry() -> dict[str, Image.Image]:
    return {
        "a1_scene_luis-american_5a29f49.webp": draw_nationality("Luis", "united states", "UNITED STATES"),
        "a1_scene_sofia-canadian_adf798e.webp": draw_nationality("Sofia", "canada", "CANADA"),
        "a1_scene_bank_bdd240c.webp": draw_bank(points_right=False),
        "a1_scene_bank-right_cad19dd.webp": draw_bank(points_right=True),
        "a1_scene_bus-leaves-9-00_8cee9f4.webp": draw_bus_leaves_nine(),
        "a1_scene_boy-crosses-at-green_4befcaf.webp": draw_boy_crosses_at_green(),
        "a1_scene_ana-wake_d91086e.webp": draw_ana_wakes_at_seven(),
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
        image.save(destination, "WEBP", quality=92, method=6, exact=True)
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
    parser = argparse.ArgumentParser(description="Build deterministic final-pass crop-safe four-card media variants.")
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
    print(f"Built {len(paths)} deterministic 1536x1024 four-card repair assets (batch E).")


if __name__ == "__main__":
    main()
