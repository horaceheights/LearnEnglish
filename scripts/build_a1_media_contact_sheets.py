from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"
OUTPUT_ROOT = Path(
    "C:/Users/gorre/.codex/visualizations/2026/08/23/"
    "01a02c4f-f228-7852-b51c-4ad44ef9a37c"
)


def font(size: int) -> ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts/segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def sample_evenly(items: list[dict[str, object]], count: int) -> list[dict[str, object]]:
    if len(items) <= count:
        return items
    return [items[round(index * (len(items) - 1) / (count - 1))] for index in range(count)]


def main() -> None:
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for unit in range(2, 8):
        assets = [
            item for item in payload["assets"]
            if any(str(ref).startswith(f"{unit}.") for ref in item["card_refs"])
        ]
        selected = sample_evenly(assets, 30)
        columns = 5
        tile = (320, 250)
        rows = math.ceil(len(selected) / columns)
        sheet = Image.new("RGB", (columns * tile[0], rows * tile[1]), "#f3eee5")
        draw = ImageDraw.Draw(sheet)
        for index, item in enumerate(selected):
            source = ASSET_ROOT / str(item["filename"])
            with Image.open(source) as image:
                thumb = ImageOps.fit(image.convert("RGB"), (300, 200), Image.Resampling.LANCZOS)
            x = (index % columns) * tile[0] + 10
            y = (index // columns) * tile[1] + 8
            sheet.paste(thumb, (x, y))
            label = str(item["concept"])[:41]
            draw.text((x, y + 205), label, fill="#242424", font=font(17))
        path = OUTPUT_ROOT / f"unit-{unit}-media-contact-sheet-current.jpg"
        sheet.save(path, quality=90)
        print(path)


if __name__ == "__main__":
    main()
