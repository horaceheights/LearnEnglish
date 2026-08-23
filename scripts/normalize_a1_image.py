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
        background = image.copy()
        if source_ratio > target_ratio:
            background_height = HEIGHT
            background_width = round(background_height * source_ratio)
        else:
            background_width = WIDTH
            background_height = round(background_width / source_ratio)
        background = background.resize((background_width, background_height), resampling())
        left = (background.width - WIDTH) // 2
        top = (background.height - HEIGHT) // 2
        background = background.crop((left, top, left + WIDTH, top + HEIGHT))
        background = background.filter(ImageFilter.GaussianBlur(radius=32))

        foreground = image.copy()
        foreground.thumbnail((round(WIDTH * 0.9), round(HEIGHT * 0.9)), resampling())
        x = (WIDTH - foreground.width) // 2
        y = (HEIGHT - foreground.height) // 2
        background.paste(foreground, (x, y))
        final = background

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
