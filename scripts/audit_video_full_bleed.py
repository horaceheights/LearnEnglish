"""Decode mapped lesson videos to detect baked-in solid bands in client framing.

This catches encoded padding that CSS/native cover cannot remove. Visual review
is still required for blurred panels, scene continuity, and teaching semantics.
Run with imageio-ffmpeg installed, or supply --ffmpeg explicitly.
"""
import argparse
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 300, 200


def solid_bands(rgb: bytes, width: int, height: int) -> list[str]:
    if len(rgb) != width * height * 3:
        raise ValueError("Incomplete decoded RGB frame")
    bands = []
    # Ignore isolated decoder-edge pixels, but detect even narrow padded panels.
    thickness = max(3, min(width, height) // 40)
    regions = {
        "left": (range(thickness), range(height)),
        "right": (range(width - thickness, width), range(height)),
        "top": (range(width), range(thickness)),
        "bottom": (range(width), range(height - thickness, height)),
    }
    for edge, (xs, ys) in regions.items():
        pixels = [rgb[(y * width + x) * 3:(y * width + x) * 3 + 3]
                  for y in ys for x in xs]
        center = tuple(sorted(p[c] for p in pixels)[len(pixels) // 2] for c in range(3))
        uniform = sum(max(abs(p[c] - center[c]) for c in range(3)) <= 6 for p in pixels)
        if uniform / len(pixels) >= 0.98:
            bands.append(edge)
    return bands


def audit(root: Path, ffmpeg: str) -> list[str]:
    source = (root / "mobile/src/actionVideos.ts").read_text(encoding="utf-8")
    filenames = sorted({Path(name).name for name in re.findall(r"'([^']+\.mp4)'", source)})
    if not filenames:
        raise ValueError("No mapped action videos found")
    failures = []
    for filename in filenames:
        web = root / "frontend/public/lesson-assets" / filename
        native = root / "mobile/assets/lesson-videos" / filename
        if not web.is_file():
            failures.append(f"{filename}: missing web export")
            continue
        if native.exists() and native.read_bytes() != web.read_bytes():
            failures.append(f"{filename}: web/native byte mismatch")
        # The last-frame sample uses EOF rather than assuming a clip duration.
        for label, seek in (("first", ["-ss", "0"]), ("middle", ["-ss", "1"]),
                            ("last", ["-sseof", "-0.1"])):
            result = subprocess.run([
                ffmpeg, "-v", "error", *seek, "-i", str(web), "-frames:v", "1",
                "-vf", "scale=308:206:force_original_aspect_ratio=increase,crop=300:200",
                "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
            ], capture_output=True, check=True)
            edges = solid_bands(result.stdout, WIDTH, HEIGHT)
            if edges:
                failures.append(f"{filename} ({label}): solid {', '.join(edges)} band")
    print(f"Decoded {len(filenames)} mapped clips at first, middle, and last frames.")
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--ffmpeg")
    args = parser.parse_args()
    ffmpeg = args.ffmpeg
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    failures = audit(args.root, ffmpeg)
    for failure in failures:
        print(f"FAIL: {failure}")
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
