"""Install the reviewed outputs of a Gemini still pack as course images.

Only an output with a successful receipt for the frozen pack and prompt, and a
current hash-bound visual review marked usable, is installed. Each becomes an
exact 1536x1024 WebP (centered 3:2 crop of the 2K output) in every course image
root, its source PNG and receipt are kept under course-photoreal-sources, and its
runtime filename joins the reviewed-photoreal registry. Existing pixels are never
overwritten. This changes no lesson; lessons bind the new filenames separately.
"""
from __future__ import annotations

import argparse
import io
import json
from pathlib import Path
import shutil
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS  # noqa: E402
from scripts.render_course_stills import digest, pack_output_directory  # noqa: E402
from scripts.render_gemini_stills import full_prompt, load_pack  # noqa: E402

REGISTRY = ROOT / "docs/product/a1-reviewed-photoreal-media.json"
SOURCES = ROOT / "Lessons/Lesson1/images/course-photoreal-sources"
RUNTIME = (1536, 1024)


def runtime_webp(source: Path) -> bytes:
    with Image.open(source) as image:
        image = image.convert("RGB")
        width, height = image.size
        if width * 2 > height * 3:  # wider than 3:2: trim the sides equally
            crop = round(height * 3 / 2)
            box = ((width - crop) // 2, 0, (width - crop) // 2 + crop, height)
        else:
            crop = round(width * 2 / 3)
            box = (0, (height - crop) // 2, width, (height - crop) // 2 + crop)
        if min(box[2] - box[0], box[3] - box[1]) < RUNTIME[1]:
            raise ValueError(f"{source.name} is smaller than the runtime size.")
        buffer = io.BytesIO()
        image.crop(box).resize(RUNTIME, Image.LANCZOS).save(buffer, "WEBP", quality=92, method=6)
    return buffer.getvalue()


def install(pack_path: Path, asset_ids: list[str], root: Path = ROOT) -> list[str]:
    pack = load_pack(pack_path)
    output = pack_output_directory(pack) if root == ROOT else root / "output/imagegen" / pack["output_namespace"]
    reviews = json.loads((output / "agent-reviews.json").read_text(encoding="utf-8"))
    by_id = {asset["id"]: asset for asset in pack["assets"]}
    registry_path = root / REGISTRY.relative_to(ROOT)
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    installed, writes = [], {}
    for asset_id in asset_ids:
        asset = by_id[asset_id]
        source = output / f"{asset_id}.png"
        receipt = json.loads(source.with_suffix(".receipt.json").read_text(encoding="utf-8"))
        if receipt.get("status") != "image_saved" or receipt.get("sha256") != digest(source):
            raise ValueError(f"{asset_id}: missing or stale generation receipt.")
        if receipt.get("pack_sha256") != digest(pack_path) or receipt["request"]["prompt"] != full_prompt(pack, asset):
            raise ValueError(f"{asset_id}: generated from a different pack or prompt.")
        review = reviews.get(asset_id, {})
        if (review.get("sha256") != digest(source) or review.get("disposition") != "usable"
                or review.get("crop_review") != "inspected-3x2-and-centered-4x5"
                or len(review.get("observed_description", "")) < 35):
            raise ValueError(f"{asset_id}: a current usable visual review is required.")
        pixels = runtime_webp(source)
        for folder in IMAGE_ROOTS:
            path = root / folder / asset["runtime_filename"]
            if path.exists() and path.read_bytes() != pixels:
                raise ValueError(f"Refusing to overwrite existing pixels at {path}.")
            writes[path] = pixels
        kept = root / SOURCES.relative_to(ROOT) / pack["output_namespace"]
        writes[kept / f"{asset_id}.png"] = source.read_bytes()
        writes[kept / f"{asset_id}.receipt.json"] = source.with_suffix(".receipt.json").read_bytes()
        installed.append(asset["runtime_filename"])
    for path, data in writes.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    registry["files"] = sorted(set(registry["files"]) | set(installed))
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    reviews_kept = root / SOURCES.relative_to(ROOT) / pack["output_namespace"] / "agent-reviews.json"
    shutil.copyfile(output / "agent-reviews.json", reviews_kept)
    return installed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", type=Path, required=True)
    parser.add_argument("--asset-id", action="append", required=True)
    args = parser.parse_args()
    for name in install(args.pack.resolve(), args.asset_id):
        print("installed", name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
