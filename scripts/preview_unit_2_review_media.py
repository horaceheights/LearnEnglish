"""Render diagnostic phone-size crops, not an app screenshot or human approval.

Reads installed review images only; never modifies source or runtime media.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    lesson = json.loads((ROOT / "backend/lessons/unit_2/lesson-2-9-unit-2-review.yaml").read_text(encoding="utf-8"))
    out = ROOT / "output/imagegen/unit-2-review-v1"
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    seen = set()
    for card in lesson["cards"]:
        options = [option for option in card["options"] if option.get("image_url")]
        if len(options) not in (2, 4):
            continue
        names = tuple(Path(option["image_url"]).name for option in options)
        shape = (180, 225) if len(options) == 4 else (180, 120)
        if (names, shape) not in seen:
            seen.add((names, shape))
            rows.append((card, names, shape))
    font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 17)
    height = sum(shape[1] + 72 for _, _, shape in rows) + 55
    sheet = Image.new("RGB", (820, height), "#fffaf1")
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 10), "Diagnostic crops at 180px wide — not end-to-end app QA", font=font, fill="#222222")
    evidence = []
    y = 50
    for card, names, shape in rows:
        draw.text((12, y), f"{card['slide_id']} | {card.get('audio_text') or card.get('prompt')} | {shape[0]}x{shape[1]}", font=font, fill="#222222")
        for i, name in enumerate(names):
            path = ROOT / "Lessons/Lesson1/images" / name
            with Image.open(path) as photo:
                crop = ImageOps.fit(photo.convert("RGB"), shape, Image.Resampling.LANCZOS, centering=(0.5, 0.5))
            x = 12 + i * 202
            sheet.paste(crop, (x, y + 29))
            draw.text((x, y + shape[1] + 33), name.removeprefix("a1_u2_review_v1_").removesuffix(".webp"), font=font, fill="#222222")
            evidence.append({"slide_id": card["slide_id"], "filename": name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "viewport": shape, "fit": "center-cover", "human_approval": "pending"})
        y += shape[1] + 72
    sheet.save(out / "phone-size-crops.png")
    (out / "phone-size-crops.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(out / "phone-size-crops.png")


if __name__ == "__main__":
    main()
