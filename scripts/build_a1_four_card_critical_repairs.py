from __future__ import annotations

"""Build the answer-critical four-card repairs found in the final visual audit.

The mobile four-option tile displays the exact centered 4:5 crop of a 1536x1024
master (x=358..1177).  These sibling variants keep every answer-critical count,
speaker cue, action, and relationship inside that safe area.  The shared wide
teaching masters stay untouched, including the profession labels that are valid
only on Learn cards.

The builder is intentionally narrow and deterministic.  It writes the canonical
assets and, by default, byte-identical mobile and frontend mirrors.
"""

import argparse
import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

import build_a1_four_card_repairs_b as repairs_b
import build_a1_units3_5_semantic_repairs as units35
from lesson_asset_sync import copy_lesson_image_if_changed


ROOT = Path(__file__).resolve().parents[1]
CANONICAL_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
RUNTIME_ROOTS = (
    ROOT / "mobile" / "assets" / "lesson-assets",
    ROOT / "frontend" / "public" / "lesson-assets",
)
SIZE = (1536, 1024)
SAFE_LEFT = 358
SAFE_RIGHT = 1177

INK = units35.INK
TEAL = units35.TEAL
BLUE = units35.BLUE
GOLD = units35.GOLD
RED = units35.RED
GREEN = units35.GREEN
PURPLE = units35.PURPLE

GUITAR = "#bd7435"
BUS = "#4f91bd"
BOARD = "#426d59"
FIELD = "#74a854"
WATERING_CAN = "#5d91a8"
STOVE = "#65747c"
PATIENT_SHIRT = "#76a9c8"


BASE_FILENAMES = {
    "three-green-books": "a1_three-green-books.webp",
    "invites-music": "a1_scene_invites-music_0c739d4.webp",
    "i-have-book": "a1_scene_i-have-book_25eacad.webp",
    "cook-sofia": "a1_scene_cook-sofia_ecb7eca.webp",
    "doctor-diego": "a1_scene_doctor-diego_1c7ef5a.webp",
    "driver-luis": "a1_scene_driver-luis_111aa43.webp",
    "farmer-ana": "a1_scene_farmer-ana_f823cb6.webp",
    "nurse-sofia": "a1_scene_nurse-sofia_63f2a9c.webp",
    "teacher-ana": "a1_scene_teacher-ana_0e983a0.webp",
}

# Bounds cover every answer-critical object, person, and cue.  Decorative side
# scenery may sit outside the fixed crop, but these rectangles may not.
CRITICAL_BOUNDS = {
    "three-green-books": (430, 385, 1105, 670),
    "invites-music": (370, 125, 1165, 920),
    "i-have-book": (390, 105, 1110, 920),
    "cook-sofia": (370, 195, 1165, 930),
    "doctor-diego": (370, 155, 1150, 930),
    "driver-luis": (390, 185, 1145, 930),
    "farmer-ana": (370, 185, 1150, 930),
    "nurse-sofia": (370, 155, 1150, 930),
    "teacher-ana": (360, 135, 1150, 930),
}


def variant_filename(base_filename: str) -> str:
    path = Path(base_filename)
    return f"{path.stem}_four-card{path.suffix}"


def scene(top: str, bottom: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = repairs_b.full_bleed(top, bottom)
    return image, ImageDraw.Draw(image)


def note(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    stem = int(115 * scale)
    width = max(10, int(19 * scale))
    radius = int(34 * scale)
    draw.line((x, y - stem, x, y), fill=INK, width=width)
    draw.line((x, y - stem, x + int(82 * scale), y - int(92 * scale)), fill=INK, width=width)
    draw.ellipse((x - radius, y - radius // 2, x + radius, y + radius), fill=INK)


def three_green_books_scene() -> Image.Image:
    image, draw = scene("#e8dfc6", "#dbe9df")
    # Three separate upright books are fully inside the exact portrait crop.
    for x in (525, 768, 1011):
        units35.book(draw, x, 525, 1.06, GREEN)
        draw.line((x - 52, 445, x + 55, 445), fill="#dcebd8", width=8)
    return image


def guitar(draw: ImageDraw.ImageDraw) -> None:
    # A large, literal guitar is readable even in a 220x275 review thumbnail.
    draw.rounded_rectangle((665, 560, 905, 625), radius=20, fill=GUITAR, outline=INK, width=9)
    draw.polygon(((650, 550), (705, 555), (705, 640), (650, 650)), fill="#8b552e", outline=INK)
    draw.ellipse((845, 510, 1085, 750), fill=GUITAR, outline=INK, width=11)
    draw.ellipse((885, 545, 1045, 715), fill=GUITAR, outline=INK, width=8)
    draw.ellipse((920, 585, 985, 655), fill=INK, outline="#f3d28d", width=6)
    for offset in (-14, 0, 14):
        draw.line((680, 590 + offset, 955, 615 + offset), fill="#f5e8cf", width=3)


def invites_music_scene() -> Image.Image:
    image, draw = scene("#f1dfcf", "#d8e8df")
    units35.person(draw, 500, 920, "Sofia", 0.78, "point-right", True)
    units35.person(draw, 985, 920, "Luis", 0.78, "hold", True)
    guitar(draw)
    # The invitation gesture and music cue are both explicit inside the crop.
    repairs_b.arrow(draw, (690, 690), (760, 645), TEAL, width=22, head=34)
    note(draw, 780, 275, 0.68)
    note(draw, 950, 220, 0.82)
    return image


def speech_i(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((405, 100, 625, 280), radius=55, fill="#fffdf8", outline=PURPLE, width=11)
    draw.polygon(((505, 275), (565, 275), (545, 345)), fill="#fffdf8", outline=PURPLE)
    units35.centered_text(draw, (515, 182), "I", 105, PURPLE)


def i_have_book_scene() -> Image.Image:
    image, draw = scene("#ead9c7", "#dbe8df")
    speech_i(draw)
    marks = units35.person(draw, 740, 920, "Ana", 0.84, "self", True)
    units35.book(draw, 990, 655, 0.86, BLUE)
    # A short possession link joins Ana's free hand to the single complete book.
    draw.line((marks["left_hand"], (900, 665)), fill=GOLD, width=18)
    draw.ellipse((885, 650, 915, 680), fill=GOLD, outline=INK, width=5)
    return image


def cook_sofia_scene() -> Image.Image:
    image, draw = scene("#f0dec3", "#dbe7df")
    draw.rectangle((390, 650, 1145, 900), fill="#a86f43", outline=INK, width=10)
    draw.rounded_rectangle((790, 640, 1110, 815), radius=24, fill=STOVE, outline=INK, width=9)
    for x in (860, 1035):
        draw.ellipse((x - 48, 680, x + 48, 745), fill="#313b40", outline=INK, width=6)
    units35.person(draw, 505, 925, "Sofia", 0.77, "point-right", False)
    # Sofia actively cooks food in a pan; no answer word is drawn.
    draw.ellipse((795, 495, 1015, 625), fill="#30383d", outline=INK, width=9)
    draw.ellipse((820, 515, 990, 602), fill="#d8d4c9", outline=INK, width=6)
    draw.ellipse((855, 535, 895, 570), fill=RED)
    draw.ellipse((915, 545, 955, 580), fill=GREEN)
    draw.line((1000, 555, 1135, 500), fill=INK, width=24)
    draw.line((690, 660, 820, 555), fill="#d4d9db", width=17)
    draw.ellipse((675, 642, 705, 672), fill="#d4d9db", outline=INK, width=4)
    return image


def patient_on_bed(draw: ImageDraw.ImageDraw) -> tuple[int, int]:
    draw.rounded_rectangle((755, 665, 1135, 835), radius=35, fill="#f8f5ed", outline=INK, width=9)
    draw.line((790, 830, 775, 915), fill=INK, width=17)
    draw.line((1100, 830, 1115, 915), fill=INK, width=17)
    draw.ellipse((965, 515, 1095, 645), fill="#b97251", outline=INK, width=8)
    draw.arc((995, 555, 1060, 600), 15, 165, fill=INK, width=5)
    draw.rounded_rectangle((785, 585, 990, 735), radius=40, fill=PATIENT_SHIRT, outline=INK, width=8)
    return 880, 640


def medical_cross(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.rounded_rectangle((x - 90, y - 90, x + 90, y + 90), radius=30, fill="#fffdf8", outline="#d6e6e8", width=7)
    draw.rectangle((x - 22, y - 65, x + 22, y + 65), fill=RED)
    draw.rectangle((x - 65, y - 22, x + 65, y + 22), fill=RED)


def doctor_diego_scene() -> Image.Image:
    image, draw = scene("#ddecf0", "#e8eee7")
    medical_cross(draw, 1010, 245)
    patient_chest = patient_on_bed(draw)
    marks = units35.person(draw, 515, 925, "Diego", 0.76, "point-right", False)
    # Earpieces, tubing, and chest piece make the examination literal.
    draw.arc((455, 455, 585, 610), 0, 180, fill=INK, width=13)
    draw.line((475, 520, 520, 650, 650, 745, patient_chest[0], patient_chest[1]), fill=INK, width=13, joint="curve")
    draw.ellipse((patient_chest[0] - 28, patient_chest[1] - 28, patient_chest[0] + 28, patient_chest[1] + 28), fill="#d5dadc", outline=INK, width=7)
    draw.line((marks["right_hand"], (650, 742)), fill=units35.PERSON["Diego"]["skin"], width=18)
    return image


def driver_luis_scene() -> Image.Image:
    image, draw = scene("#dce8e9", "#d7e2dc")
    # A complete bus cabin, windshield, dashboard, and wheel surround seated Luis.
    draw.rounded_rectangle((395, 210, 1140, 900), radius=90, fill=BUS, outline=INK, width=12)
    draw.rounded_rectangle((455, 275, 1080, 650), radius=45, fill="#d8eef1", outline=INK, width=10)
    draw.line((780, 285, 780, 640), fill=INK, width=10)
    units35.person(draw, 665, 835, "Luis", 0.62, "neutral", False)
    draw.rectangle((440, 680, 1095, 850), fill="#315e75", outline=INK, width=9)
    draw.ellipse((810, 520, 995, 705), outline=INK, width=19)
    draw.ellipse((872, 582, 933, 643), fill=INK)
    draw.line((840, 570, 900, 610, 965, 565), fill=INK, width=13)
    draw.line((720, 640, 840, 580), fill=units35.PERSON["Luis"]["skin"], width=20)
    for x in (520, 1010):
        draw.ellipse((x - 80, 820, x + 80, 980), fill="#29343a", outline=INK, width=9)
        draw.ellipse((x - 35, 865, x + 35, 935), fill="#c7ced0", outline=INK, width=6)
    return image


def crop_plant(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.line((x, y + 70, x, y - 25), fill="#386b3c", width=13)
    draw.ellipse((x - 65, y - 35, x, y + 15), fill=GREEN, outline=INK, width=5)
    draw.ellipse((x, y - 70, x + 65, y - 15), fill=GREEN, outline=INK, width=5)


def farmer_ana_scene() -> Image.Image:
    image, draw = scene("#d8e8df", "#d8c594")
    draw.rectangle((360, 500, 1170, 1024), fill=FIELD)
    for start in (560, 720, 880):
        draw.line((start, 1024, start + 160, 540), fill="#5b7f37", width=16)
    for x, y in ((845, 685), (1015, 625), (925, 825), (1085, 790)):
        crop_plant(draw, x, y)
    units35.person(draw, 500, 925, "Ana", 0.77, "point-right", False)
    # Watering can, spout, and falling droplets show Ana actively tending crops.
    draw.rounded_rectangle((690, 600, 835, 735), radius=24, fill=WATERING_CAN, outline=INK, width=8)
    draw.arc((705, 525, 825, 650), 180, 360, fill=INK, width=12)
    draw.polygon(((825, 625), (955, 675), (940, 720), (820, 685)), fill=WATERING_CAN, outline=INK)
    for x, y in ((965, 725), (1000, 755), (1035, 785)):
        draw.ellipse((x - 9, y - 16, x + 9, y + 16), fill="#6db4d0", outline=BLUE, width=3)
    return image


def nurse_sofia_scene() -> Image.Image:
    image, draw = scene("#e1eef0", "#e8eee7")
    medical_cross(draw, 1025, 235)
    patient_on_bed(draw)
    units35.person(draw, 500, 925, "Sofia", 0.76, "point-right", False)
    # The chart and bed-bound patient distinguish this care task from doctor.
    draw.rounded_rectangle((655, 505, 835, 735), radius=20, fill="#fffdf8", outline=INK, width=9)
    draw.rectangle((710, 475, 780, 530), fill="#c7ced0", outline=INK, width=6)
    for y in (565, 615, 665):
        draw.line((690, y, 800, y), fill=BLUE, width=8)
    draw.line((680, 575, 650, 625), fill=units35.PERSON["Sofia"]["skin"], width=19)
    return image


def student(draw: ImageDraw.ImageDraw, x: int, y: int, shirt: str) -> None:
    draw.ellipse((x - 45, y - 115, x + 45, y - 25), fill="#b97251", outline=INK, width=6)
    draw.arc((x - 34, y - 87, x + 34, y - 45), 15, 165, fill=INK, width=4)
    draw.rounded_rectangle((x - 65, y - 25, x + 65, y + 95), radius=25, fill=shirt, outline=INK, width=6)
    draw.rounded_rectangle((x - 95, y + 70, x + 95, y + 125), radius=12, fill="#a9794d", outline=INK, width=7)


def teacher_ana_scene() -> Image.Image:
    image, draw = scene("#e9ddc8", "#d9e7de")
    draw.rounded_rectangle((625, 135, 1145, 545), radius=28, fill=BOARD, outline=INK, width=11)
    units35.centered_text(draw, (885, 260), "ABC", 86, "#fff7df")
    draw.ellipse((750, 355, 835, 440), outline="#f2c75b", width=10)
    draw.polygon(((950, 435), (1000, 345), (1050, 435)), outline="#d9eef0")
    units35.person(draw, 475, 925, "Ana", 0.74, "point-right", False)
    repairs_b.arrow(draw, (650, 655), (760, 470), TEAL, width=19, head=30)
    for x, shirt in ((745, BLUE), (915, "#a6465d"), (1080, GOLD)):
        student(draw, x, 775, shirt)
    return image


def build_scenes() -> dict[str, Image.Image]:
    scenes = {
        "three-green-books": three_green_books_scene(),
        "invites-music": invites_music_scene(),
        "i-have-book": i_have_book_scene(),
        "cook-sofia": cook_sofia_scene(),
        "doctor-diego": doctor_diego_scene(),
        "driver-luis": driver_luis_scene(),
        "farmer-ana": farmer_ana_scene(),
        "nurse-sofia": nurse_sofia_scene(),
        "teacher-ana": teacher_ana_scene(),
    }
    if set(scenes) != set(BASE_FILENAMES):
        raise RuntimeError("Critical four-card repair registry drift.")
    validate_safe_bounds()
    return scenes


def validate_safe_bounds() -> None:
    if set(CRITICAL_BOUNDS) != set(BASE_FILENAMES):
        raise RuntimeError("Critical-bound registry drift.")
    for concept, (left, top, right, bottom) in CRITICAL_BOUNDS.items():
        if left < SAFE_LEFT or right > SAFE_RIGHT or top < 0 or bottom > SIZE[1]:
            raise RuntimeError(f"{concept}: critical bounds escape centered 4:5 crop")


def save_webp(image: Image.Image, filename: str, output_dir: Path) -> Path:
    if image.size != SIZE:
        raise ValueError(f"{filename}: expected {SIZE}, got {image.size}")
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / filename
    image.convert("RGB").save(path, "WEBP", lossless=True, method=6, exact=True)
    with Image.open(path) as opened:
        if opened.size != SIZE or opened.format != "WEBP":
            raise RuntimeError(f"Invalid critical four-card asset: {path}")
    return path


def write_assets(output_dir: Path) -> list[Path]:
    scenes = build_scenes()
    return [
        save_webp(scenes[concept], variant_filename(base_filename), output_dir)
        for concept, base_filename in BASE_FILENAMES.items()
    ]


def sync_runtime_mirrors(paths: list[Path]) -> None:
    for source in paths:
        for runtime_root in RUNTIME_ROOTS:
            runtime_root.mkdir(parents=True, exist_ok=True)
            copy_lesson_image_if_changed(source, runtime_root / source.name)


def crop_4x5(image: Image.Image) -> Image.Image:
    width = round(image.height * 4 / 5)
    left = (image.width - width) // 2
    return image.crop((left, 0, left + width, image.height))


def render_audit_sheet(paths: list[Path], destination: Path) -> Path:
    columns = 3
    tile_w, tile_h = 286, 402
    rows = math.ceil(len(paths) / columns)
    sheet = Image.new("RGB", (columns * tile_w, rows * tile_h), "#efe9df")
    draw = ImageDraw.Draw(sheet)
    label_font = units35.font(18, False)
    for index, path in enumerate(paths):
        with Image.open(path) as opened:
            crop = crop_4x5(opened.convert("RGB"))
            thumb = ImageOps.fit(crop, (250, 312), method=Image.Resampling.LANCZOS)
        x = index % columns * tile_w + 18
        y = index // columns * tile_h + 12
        sheet.paste(thumb, (x, y))
        draw.rounded_rectangle((x, y, x + 250, y + 312), radius=12, outline=INK, width=4)
        concept = next(key for key, base in BASE_FILENAMES.items() if variant_filename(base) == path.name)
        draw.text((x, y + 325), concept, fill=INK, font=label_font)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "PNG", optimize=True)
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build nine final answer-critical four-card repair assets.")
    parser.add_argument("--output-dir", type=Path, default=CANONICAL_ROOT)
    parser.add_argument("--no-sync", action="store_true", help="Do not mirror canonical output to mobile/frontend.")
    parser.add_argument("--audit-sheet", type=Path, help="Render the exact centered 4:5 crops for review.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    paths = write_assets(output_dir)
    if not args.no_sync:
        if output_dir != CANONICAL_ROOT.resolve():
            raise SystemExit("Runtime sync is allowed only when --output-dir is the canonical asset root; use --no-sync.")
        sync_runtime_mirrors(paths)
    for path in paths:
        print(f"{path.name}\t{hashlib.sha256(path.read_bytes()).hexdigest()[:12]}")
    if args.audit_sheet:
        destination = args.audit_sheet if args.audit_sheet.is_absolute() else ROOT / args.audit_sheet
        print(f"Centered 4:5 audit sheet: {render_audit_sheet(paths, destination)}")
    print(f"Built {len(paths)} deterministic 1536x1024 critical four-card variants.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
