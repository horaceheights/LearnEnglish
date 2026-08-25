from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
LESSON_ASSET_DIR = ROOT / "Lessons" / "Lesson1" / "images"
PUBLIC_ASSET_DIR = ROOT / "frontend" / "public" / "lesson-assets"
CARD_SIZE = (1536, 1024)


PREVIEW_SOURCES = {
    "bag": "bag.png",
    "black": "black.png",
    "blue": "blue.png",
    "book": "book.png",
    "chair": "chair.png",
    "far-bag": "far-bag.png",
    "far-book": "far-book.png",
    "far-chair": "far-chair.png",
    "far-phone": "far-phone.png",
    "four-yellow-pens": "four-yellow-pens.png",
    "green": "green.png",
    "hospital": "hospital.png",
    "n1": "n1.png",
    "n2": "n2.png",
    "n3": "n3.png",
    "n4": "n4.png",
    "n5": "n5.png",
    "n6": "n6.png",
    "n7": "n7.png",
    "n8": "n8.png",
    "n9": "n9.png",
    "n10": "n10.png",
    "near-bag": "near-bag.png",
    "near-book": "near-book.png",
    "near-chair": "near-chair.png",
    "near-phone": "near-phone.png",
    "one-red-car": "one-red-car.png",
    "pen": "pen.png",
    "phone": "phone.png",
    "red": "red.png",
    "restaurant": "restaurant.png",
    "table": "table.png",
    "three-green-books": "three-green-books.png",
    "two-blue-cars": "two-blue-cars.png",
    "white": "white.png",
    "yellow": "yellow.png",
}


MISSION_CROPS = {
    "mission-park": (0, 200, 540, 560),
    "mission-bus": (480, 330, 810, 550),
    "mission-book-near": (0, 600, 590, 994),
    "mission-bag-far": (1200, 380, 1530, 600),
    "mission-two-blue-cars": (830, 370, 1160, 590),
    "mission-three-green-books": (950, 650, 1500, 1017),
    "mission-four-yellow-pens": (580, 670, 970, 930),
    "mission-school": (600, 170, 1200, 570),
    "mission-store": (1080, 260, 1530, 560),
}


def card_image(source: Path) -> Image.Image:
    with Image.open(source) as opened:
        rgb = opened.convert("RGB")
        return ImageOps.fit(rgb, CARD_SIZE, method=Image.Resampling.LANCZOS)


def save_asset(image: Image.Image, key: str) -> None:
    filename = f"unit2_{key.replace('-', '_')}.webp"
    for output_dir in (LESSON_ASSET_DIR, PUBLIC_ASSET_DIR):
        output_dir.mkdir(parents=True, exist_ok=True)
        image.save(output_dir / filename, "WEBP", quality=88, method=6)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare reviewed Unit 2 artwork for backend and web lesson assets."
    )
    parser.add_argument("--preview-dir", required=True, type=Path)
    parser.add_argument("--five-black-phones", required=True, type=Path)
    parser.add_argument("--six-white-bags", required=True, type=Path)
    parser.add_argument("--near-red-book", required=True, type=Path)
    parser.add_argument("--far-blue-bag", required=True, type=Path)
    parser.add_argument("--mission-master", required=True, type=Path)
    args = parser.parse_args()

    source_map = {
        key: args.preview_dir / filename
        for key, filename in PREVIEW_SOURCES.items()
    }
    source_map.update(
        {
            "five-black-phones": args.five_black_phones,
            "six-white-bags": args.six_white_bags,
            "near-red-book": args.near_red_book,
            "far-blue-bag": args.far_blue_bag,
        }
    )

    missing = [str(path) for path in source_map.values() if not path.is_file()]
    if not args.mission_master.is_file():
        missing.append(str(args.mission_master))
    if missing:
        raise SystemExit("Missing Unit 2 image sources:\n- " + "\n- ".join(missing))

    for key, source in source_map.items():
        save_asset(card_image(source), key)

    master = card_image(args.mission_master)
    save_asset(master, "mission-master")
    for key, crop_box in MISSION_CROPS.items():
        crop = master.crop(crop_box)
        crop = ImageOps.fit(crop, CARD_SIZE, method=Image.Resampling.LANCZOS)
        save_asset(crop, key)

    print(
        f"Prepared {len(source_map) + len(MISSION_CROPS) + 1} Unit 2 images "
        f"in {LESSON_ASSET_DIR} and {PUBLIC_ASSET_DIR}."
    )


if __name__ == "__main__":
    main()
