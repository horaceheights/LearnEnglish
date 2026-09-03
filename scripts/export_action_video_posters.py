"""Export matching 3:2 posters from normalized full-bleed action clips."""
import argparse
from pathlib import Path
import shutil
import subprocess

import imageio_ffmpeg

from a1_media_runtime_contracts import TWO_CARD_ACTION_POSTERS

ROOT = Path(__file__).resolve().parents[1]


def export_poster(image_key: str, video: Path) -> None:
    filename = TWO_CARD_ACTION_POSTERS[image_key]
    canonical = ROOT / "Lessons/Lesson1/images" / filename
    # Match the playing layer's 1.025 center overscan in its 3:2 viewport.
    subprocess.run([
        imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-i", str(video),
        "-frames:v", "1", "-vf",
        "scale=1576:1050:force_original_aspect_ratio=increase,crop=1536:1024",
        "-c:v", "libwebp", "-quality", "92", str(canonical),
    ], check=True)
    for directory in ("mobile/assets/lesson-assets", "frontend/public/lesson-assets"):
        shutil.copy2(canonical, ROOT / directory / filename)
    print(f"Exported matched poster: {filename}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image_key", choices=TWO_CARD_ACTION_POSTERS)
    parser.add_argument("video", type=Path)
    args = parser.parse_args()
    export_poster(args.image_key, args.video)
