from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter


WIDTH = 1536
HEIGHT = 1024


def resampling() -> int:
    return getattr(Image, "Resampling", Image).LANCZOS


def normalize(source: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        image = opened.convert("RGB")

    target_ratio = WIDTH / HEIGHT
    source_ratio = image.width / image.height
    if abs(source_ratio - target_ratio) < 0.001:
        final = image.resize((WIDTH, HEIGHT), resampling())
    else:
        # Full-bleed 3:2 center crop without blurred side fill or thumbnail inset
        if source_ratio > target_ratio:
            # Source is wider than 3:2: crop left/right
            crop_width = round(image.height * target_ratio)
            left = (image.width - crop_width) // 2
            cropped = image.crop((left, 0, left + crop_width, image.height))
        else:
            # Source is taller than 3:2: crop top/bottom
            crop_height = round(image.width / target_ratio)
            top = (image.height - crop_height) // 2
            cropped = image.crop((0, top, image.width, top + crop_height))
        final = cropped.resize((WIDTH, HEIGHT), resampling())

    destination.parent.mkdir(parents=True, exist_ok=True)
    final.save(destination, format="WEBP", quality=90, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize one A1 still to the shared 1536x1024 course canvas."
    )
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    normalize(args.source.resolve(), args.destination.resolve())
    print(args.destination.resolve())


if __name__ == "__main__":
    main()
