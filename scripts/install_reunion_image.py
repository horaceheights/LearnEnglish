"""Install one generated Unit 1 reunion still as synchronized 3:2 WebP assets."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

from PIL import Image


CANVAS = (1536, 1024)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("filename")
    args = parser.parse_args()

    if not args.filename.startswith("a1_u1_reunion_") or not args.filename.endswith(".webp"):
        raise SystemExit("filename must match a1_u1_reunion_*.webp")

    root = Path(__file__).resolve().parents[1]
    destinations = (
        root / "Lessons" / "Lesson1" / "images" / args.filename,
        root / "frontend" / "public" / "lesson-assets" / args.filename,
        root / "mobile" / "assets" / "lesson-assets" / args.filename,
    )
    existing = next((path for path in destinations if path.exists()), None)
    if existing:
        payload = existing.read_bytes()
        if any(path.exists() and path.read_bytes() != payload for path in destinations):
            raise SystemExit(f"refusing to reconcile different reunion assets: {args.filename}")
    else:
        with Image.open(args.source) as opened:
            image = opened.convert("RGB")
            width, height = image.size
            if width * 2 != height * 3:
                raise SystemExit(f"source must already be exactly 3:2, found {width}x{height}")
            if image.size != CANVAS:
                image = image.resize(CANVAS, Image.Resampling.LANCZOS)
            destinations[0].parent.mkdir(parents=True, exist_ok=True)
            image.save(destinations[0], "WEBP", quality=90, method=6)
        payload = destinations[0].read_bytes()

    for destination in destinations:
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            destination.write_bytes(payload)

    if len({sha256(path) for path in destinations}) != 1:
        raise SystemExit("canonical/frontend/mobile reunion asset copies differ")

    print(f"Installed {args.filename} ({sha256(destinations[0])})")


if __name__ == "__main__":
    main()
