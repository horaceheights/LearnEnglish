from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"


def font(size: int) -> ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts/segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def unit_number(item: dict[str, object]) -> int | None:
    for context in item.get("review_contexts", []):
        if not isinstance(context, dict):
            continue
        match = str(context.get("unit_id") or "").split("-")[-1]
        if match.isdigit():
            return int(match)
    for ref in item.get("card_refs", []):
        prefix = str(ref).split(".", 1)[0]
        if prefix.isdigit():
            return int(prefix)
    return None


def pages(items: list[dict[str, object]], page_size: int) -> list[list[dict[str, object]]]:
    return [items[index:index + page_size] for index in range(0, len(items), page_size)]


def browser_crop_items(
    assets: list[dict[str, object]], unit: int
) -> list[dict[str, object]]:
    crops: list[dict[str, object]] = []
    for asset in assets:
        for context in asset.get("review_contexts", []):
            if not isinstance(context, dict) or context.get("context_type") != "course_browser":
                continue
            if str(context.get("unit_id")) != f"unit-{unit}":
                continue
            crops.append(
                {
                    "concept": (
                        f"{context['media_role']} | {context['surface_label']} | "
                        f"{context['prompt']}"
                    ),
                    "filename": context["rendered_filename"],
                    "viewport_width": context["viewport_width"],
                    "viewport_height": context["viewport_height"],
                }
            )
    return sorted(crops, key=lambda item: (str(item["concept"]), str(item["filename"])))


def render_page(
    items: list[dict[str, object]],
    destination: Path,
    columns: int,
) -> None:
    tile = (384, 310)
    rows = math.ceil(len(items) / columns)
    sheet = Image.new("RGB", (columns * tile[0], rows * tile[1]), "#f3eee5")
    draw = ImageDraw.Draw(sheet)
    for index, item in enumerate(items):
        source = ASSET_ROOT / str(item["filename"])
        viewport_width = item.get("viewport_width")
        viewport_height = item.get("viewport_height")
        if isinstance(viewport_width, int) and isinstance(viewport_height, int):
            scale = min(360 / viewport_width, 240 / viewport_height)
            display_size = (
                max(1, round(viewport_width * scale)),
                max(1, round(viewport_height * scale)),
            )
        else:
            display_size = (360, 240)
        with Image.open(source) as image:
            thumb = ImageOps.fit(image.convert("RGB"), display_size, Image.Resampling.LANCZOS)
        x = (index % columns) * tile[0] + 12
        y = (index // columns) * tile[1] + 8
        sheet.paste(thumb, (x + (360 - display_size[0]) // 2, y + (240 - display_size[1]) // 2))
        concept = str(item["concept"])
        filename = str(item["filename"])
        draw.text((x, y + 244), concept[:48], fill="#202020", font=font(17))
        draw.text((x, y + 269), filename[:52], fill="#5c5148", font=font(13))
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, quality=92)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build exhaustive, labeled contact sheets for human A1 media review."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "artifacts" / "a1-media-audit",
    )
    parser.add_argument("--units", type=int, nargs="+", default=list(range(1, 8)))
    parser.add_argument("--page-size", type=int, default=24)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument(
        "--profiles",
        nargs="+",
        help="Only render contracts that contain one of these runtime render profiles.",
    )
    args = parser.parse_args()

    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    eligible_assets = payload["assets"]
    if args.profiles:
        requested_profiles = set(args.profiles)
        eligible_assets = [
            item
            for item in eligible_assets
            if any(
                isinstance(context, dict)
                and context.get("render_profile") in requested_profiles
                for context in item.get("review_contexts", [])
            )
        ]
    for unit in args.units:
        assets = sorted(
            (item for item in eligible_assets if unit_number(item) == unit),
            key=lambda item: (str(item["concept"]), str(item["filename"])),
        )
        unit_pages = pages(assets, args.page_size)
        for page_number, page_items in enumerate(unit_pages, 1):
            destination = args.output / f"unit-{unit}-page-{page_number:02d}.jpg"
            render_page(page_items, destination, args.columns)
            print(destination)
        print(f"Unit {unit}: rendered {len(assets)} assets across {len(unit_pages)} pages.")

        crops = browser_crop_items(eligible_assets, unit)
        crop_pages = pages(crops, args.page_size)
        for page_number, page_items in enumerate(crop_pages, 1):
            destination = args.output / f"unit-{unit}-browser-crops-{page_number:02d}.jpg"
            render_page(page_items, destination, args.columns)
            print(destination)
        print(
            f"Unit {unit}: rendered {len(crops)} real browser crops across "
            f"{len(crop_pages)} pages."
        )


if __name__ == "__main__":
    main()
