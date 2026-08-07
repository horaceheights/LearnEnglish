from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "mobile/assets/mascots/serious/listening-frames"
OUTPUT_DIR = ROOT / "mobile/assets/mascots/serious/listening-frames-normalized"
PREVIEW_PATH = ROOT / "mobile/assets/mascots/serious/listening-preview.gif"
CANVAS_SIZE = 512
TARGET_HEIGHT = 470
BOTTOM_MARGIN = 8


def largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    largest: list[tuple[int, int]] = []

    for y, x in zip(*np.nonzero(mask & ~visited)):
        if visited[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        visited[y, x] = True
        component: list[tuple[int, int]] = []

        while queue:
            cy, cx = queue.popleft()
            component.append((cy, cx))
            for ny in range(max(0, cy - 1), min(height, cy + 2)):
                for nx in range(max(0, cx - 1), min(width, cx + 2)):
                    if mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((ny, nx))

        if len(component) > len(largest):
            largest = component

    result = np.zeros_like(mask, dtype=bool)
    if largest:
        ys, xs = zip(*largest)
        result[np.array(ys), np.array(xs)] = True
    return result


def normalize(path: Path, destination: Path) -> None:
    image = Image.open(path).convert("RGBA")
    pixels = np.array(image)
    alpha = pixels[:, :, 3]
    component = largest_component(alpha > 12)
    pixels[~component, 3] = 0
    cleaned = Image.fromarray(pixels, "RGBA")

    bbox = cleaned.getbbox()
    if bbox is None:
        raise ValueError(f"No visible mascot found in {path}")

    subject = cleaned.crop(bbox)
    scale = TARGET_HEIGHT / subject.height
    width = max(1, round(subject.width * scale))
    subject = subject.resize((width, TARGET_HEIGHT), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x = (CANVAS_SIZE - width) // 2
    y = CANVAS_SIZE - BOTTOM_MARGIN - TARGET_HEIGHT
    canvas.alpha_composite(subject, (x, y))
    canvas.save(destination)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    normalized: list[Image.Image] = []
    for source in sorted(SOURCE_DIR.glob("listening-*.png")):
        destination = OUTPUT_DIR / source.name
        normalize(source, destination)
        normalized.append(Image.open(destination).convert("RGBA"))
        print(f"Normalized {source.name}")

    preview_frames: list[Image.Image] = []
    for frame in normalized:
        background = Image.new("RGBA", frame.size, (250, 246, 238, 255))
        background.alpha_composite(frame)
        preview_frames.append(background.convert("P", palette=Image.Palette.ADAPTIVE))

    if preview_frames:
        preview_frames[0].save(
            PREVIEW_PATH,
            save_all=True,
            append_images=preview_frames[1:],
            duration=[180, 130, 120, 110, 110, 1400],
            loop=0,
            disposal=2,
        )
        print(f"Wrote preview {PREVIEW_PATH.name}")


if __name__ == "__main__":
    main()
