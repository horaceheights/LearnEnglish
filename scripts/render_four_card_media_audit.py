from __future__ import annotations

import argparse
import hashlib
import json
import re
import textwrap
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED_ROOT = ROOT / "mobile" / "src" / "generated"
IMAGE_ROOT = ROOT / "mobile" / "assets" / "lesson-assets"
CANONICAL_IMAGE_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
IMAGE_SOURCE_PATH = ROOT / "mobile" / "src" / "lessonImageSources.ts"
DEFAULT_OUTPUT_ROOT = ROOT / "tmp" / "four-card-media-audit"
DEFAULT_REVIEW_MANIFEST = ROOT / "docs" / "product" / "a1-four-card-media-review.json"

TILE_SIZE = (200, 250)
CELL_SIZE = (260, 335)
SHEET_COLUMNS = 5
SHEET_ROWS = 4
SHEET_MARGIN = 20


def image_filename(image_url: str) -> str:
    return Path(str(image_url or "").split("?", 1)[0].split("#", 1)[0]).name


def option_variants() -> dict[str, str]:
    source = IMAGE_SOURCE_PATH.read_text(encoding="utf-8")
    match = re.search(
        r"const OPTION_MEDIA_VARIANTS:[^=]+?=\s*\{(?P<body>.*?)\n\};",
        source,
        re.DOTALL,
    )
    if not match:
        raise SystemExit(f"Unable to read OPTION_MEDIA_VARIANTS from {IMAGE_SOURCE_PATH}")
    return dict(re.findall(r"'([^']+)'\s*:\s*'([^']+)'", match.group("body")))


def four_card_inventory() -> dict[str, list[dict[str, object]]]:
    inventory: dict[str, list[dict[str, object]]] = defaultdict(list)
    for lesson_path in sorted(GENERATED_ROOT.glob("lesson-*.json")):
        lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
        for card_index, card in enumerate(lesson.get("cards", [])):
            options = card.get("options") or []
            if len(options) != 4 or not all(option.get("image_url") for option in options):
                continue
            for option in options:
                filename = image_filename(option["image_url"])
                inventory[filename].append(
                    {
                        "lesson_id": lesson["id"],
                        "lesson_title": lesson.get("title", ""),
                        "card_index": card_index,
                        "slide_id": card.get("slide_id", ""),
                        "stage": card.get("stage", ""),
                        "prompt": card.get("prompt", ""),
                        "option_id": option.get("id", ""),
                        "option_label": option.get("label"),
                        "correct": option.get("id") == card.get("correct_option_id"),
                    }
                )
    return dict(sorted(inventory.items()))


def wrap_label(text: str, width: int = 34, lines: int = 4) -> list[str]:
    wrapped = textwrap.wrap(text, width=width, break_long_words=True, break_on_hyphens=True)
    if len(wrapped) <= lines:
        return wrapped
    clipped = wrapped[:lines]
    clipped[-1] = clipped[-1][:-1] + "…"
    return clipped


def render_contact_sheets(
    inventory: dict[str, list[dict[str, object]]],
    variants: dict[str, str],
    output_root: Path,
) -> list[Path]:
    output_root.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    filenames = list(inventory)
    per_sheet = SHEET_COLUMNS * SHEET_ROWS
    sheet_paths: list[Path] = []
    for sheet_index in range(0, len(filenames), per_sheet):
        page_names = filenames[sheet_index : sheet_index + per_sheet]
        sheet = Image.new(
            "RGB",
            (
                (SHEET_COLUMNS * CELL_SIZE[0]) + (SHEET_MARGIN * 2),
                (SHEET_ROWS * CELL_SIZE[1]) + (SHEET_MARGIN * 2),
            ),
            "#f4efe7",
        )
        draw = ImageDraw.Draw(sheet)
        for page_offset, filename in enumerate(page_names):
            row, column = divmod(page_offset, SHEET_COLUMNS)
            cell_x = SHEET_MARGIN + (column * CELL_SIZE[0])
            cell_y = SHEET_MARGIN + (row * CELL_SIZE[1])
            rendered_name = variants.get(filename, filename)
            source_path = IMAGE_ROOT / rendered_name
            if not source_path.is_file():
                raise SystemExit(f"Missing four-card image: {source_path}")
            with Image.open(source_path) as opened:
                crop = ImageOps.fit(
                    opened.convert("RGB"),
                    TILE_SIZE,
                    method=Image.Resampling.LANCZOS,
                    centering=(0.5, 0.5),
                )
            tile_x = cell_x + ((CELL_SIZE[0] - TILE_SIZE[0]) // 2)
            tile_y = cell_y
            sheet.paste(crop, (tile_x, tile_y))
            draw.rounded_rectangle(
                (tile_x - 2, tile_y - 2, tile_x + TILE_SIZE[0] + 1, tile_y + TILE_SIZE[1] + 1),
                radius=12,
                outline="#173038",
                width=3,
            )
            contexts = inventory[filename]
            first = contexts[0]
            context_label = (
                f"{first['lesson_id']} {first['stage']} {first['slide_id']} "
                f"| {first['prompt']}"
            )
            lines = [filename, *wrap_label(context_label)]
            if len(contexts) > 1:
                lines.append(f"{len(contexts)} four-card uses")
            text_y = tile_y + TILE_SIZE[1] + 8
            for line in lines:
                draw.text((cell_x + 4, text_y), line, fill="#172126", font=font)
                text_y += 14
        page_number = (sheet_index // per_sheet) + 1
        sheet_path = output_root / f"four-card-crops-{page_number:02d}.png"
        sheet.save(sheet_path, "PNG")
        sheet_paths.append(sheet_path)
    return sheet_paths


def write_review_manifest(
    inventory: dict[str, list[dict[str, object]]],
    variants: dict[str, str],
    destination: Path,
) -> None:
    rendered_names = sorted({variants.get(filename, filename) for filename in inventory})
    assets: dict[str, dict[str, object]] = {}
    for filename in rendered_names:
        source_path = CANONICAL_IMAGE_ROOT / filename
        if not source_path.is_file():
            raise SystemExit(f"Missing canonical four-card image: {source_path}")
        assets[filename] = {
            "sha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
            "disposition": (
                "dedicated-four-card-reframe"
                if filename.endswith("_four-card.webp")
                else "center-crop-approved"
            ),
        }
    payload = {
        "schema_version": 1,
        "portrait_viewport": "4:5",
        "master_ratio": "3:2",
        "review_criteria": [
            "A partial window-like crop is acceptable when the concept remains unmistakable.",
            "Numbers, counts, prices, actions, spatial relationships, and other answer-critical cues must remain fully understandable.",
            "Use a dedicated four-card reframe when a centered 4:5 crop changes or hides the answer.",
        ],
        "assets": assets,
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render the centered 4:5 crop used by portrait four-image lesson grids."
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument(
        "--write-review-manifest",
        action="store_true",
        help="Record the visually reviewed effective assets and hashes.",
    )
    parser.add_argument(
        "--review-manifest",
        type=Path,
        default=DEFAULT_REVIEW_MANIFEST,
    )
    args = parser.parse_args()
    if not args.output_dir.is_absolute():
        args.output_dir = (ROOT / args.output_dir).resolve()
    if not args.review_manifest.is_absolute():
        args.review_manifest = (ROOT / args.review_manifest).resolve()

    inventory = four_card_inventory()
    variants = option_variants()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    inventory_path = args.output_dir / "four-card-inventory.json"
    inventory_path.write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    sheets = render_contact_sheets(inventory, variants, args.output_dir)
    if args.write_review_manifest:
        write_review_manifest(inventory, variants, args.review_manifest)
    four_card_uses = sum(len(contexts) for contexts in inventory.values())
    print(
        f"Rendered {len(inventory)} unique assets across {four_card_uses} four-card option uses "
        f"into {len(sheets)} contact sheets."
    )
    print(inventory_path.relative_to(ROOT))
    if args.write_review_manifest:
        print(args.review_manifest.relative_to(ROOT))
    for sheet in sheets:
        print(sheet.relative_to(ROOT))


if __name__ == "__main__":
    main()
