"""Build a read-only, hash-bound visual inventory; never infer style from filenames.

Includes authored references and client-resolved still/poster/crop variants.
Contact sheets are triage aids, not semantic or human approval.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import sys
import textwrap

import yaml
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.a1_media_runtime_contracts import card_media_usages, course_browser_media_usages


def authored_refs(value, pointer=""):
    if isinstance(value, dict):
        for key, child in value.items():
            location = f"{pointer}/{key}"
            if key in {"image_url", "prompt_image_url", "title_image_url"} and isinstance(child, str) and child:
                yield Path(child.split("?", 1)[0]).name, location
            else:
                yield from authored_refs(child, location)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from authored_refs(child, f"{pointer}/{index}")


def build_inventory(root=ROOT):
    files = defaultdict(lambda: {"authored_bindings": [], "runtime_contexts": [], "descriptions": []})
    lessons = []
    for path in sorted((root / "backend/lessons").glob("unit_*/*.yaml")):
        lesson = yaml.safe_load(path.read_text(encoding="utf-8-sig"))
        lessons.append(lesson)
        for filename, pointer in authored_refs(lesson):
            files[filename]["authored_bindings"].append({"lesson_id": lesson["id"], "lesson": lesson["sub_lesson_id"],
                "path": path.relative_to(root).as_posix(), "pointer": pointer})
        for card in lesson["cards"]:
            for usage in card_media_usages(lesson, card):
                files[usage["rendered_filename"]]["runtime_contexts"].append(usage["context"])
    for usage in course_browser_media_usages(lessons):
        files[usage["rendered_filename"]]["runtime_contexts"].append(usage["context"])
    manifest = json.loads((root / "docs/product/a1-media-manifest.json").read_text(encoding="utf-8"))
    for row in manifest["assets"]:
        if row["filename"] in files:
            files[row["filename"]]["descriptions"].append({"concept": row["concept"], "description": row["description"]})
    baseline = json.loads((root / "docs/qa/course-media-preservation-baseline.json").read_text(encoding="utf-8"))["assets"]
    registered = set(json.loads((root / "docs/product/a1-reviewed-photoreal-media.json").read_text(encoding="utf-8"))["files"])
    rows = []
    for index, (filename, entry) in enumerate(sorted(files.items()), 1):
        path = root / "Lessons/Lesson1/images" / filename
        entry.update(index=index, filename=filename, exists=path.is_file(), registered_photo=filename in registered,
                     provenance=baseline.get(filename, {}).get("provenance", "not-in-preservation-baseline"))
        if path.is_file():
            entry.update(sha256=hashlib.sha256(path.read_bytes()).hexdigest(), byte_count=path.stat().st_size)
            with Image.open(path) as image:
                entry["dimensions"] = list(image.size)
        rows.append(entry)
    return rows


def render_sheets(rows, output, root=ROOT, page_size=20):
    font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 15)
    for start in range(0, len(rows), page_size):
        page = rows[start:start + page_size]
        sheet = Image.new("RGB", (1536, ((len(page) + 3) // 4) * 282), "#f8f5ef")
        draw = ImageDraw.Draw(sheet)
        for offset, row in enumerate(page):
            x, y = offset % 4 * 384, offset // 4 * 282
            if row["exists"]:
                with Image.open(root / "Lessons/Lesson1/images" / row["filename"]) as image:
                    thumb = ImageOps.contain(image.convert("RGB"), (374, 210))
                    sheet.paste(thumb, (x + (384 - thumb.width) // 2, y))
            label = f"{row['index']:04d} {row['filename']}"
            for line_no, line in enumerate(textwrap.wrap(label, 45)[:2]):
                draw.text((x + 5, y + 212 + line_no * 18), line, font=font, fill="#101010")
            concepts = list(dict.fromkeys(d["concept"] for d in row["descriptions"]))
            draw.text((x + 5, y + 252), " | ".join(concepts)[:46], font=font, fill="#303030")
        destination = output / f"style-{start // page_size + 1:03d}.jpg"
        sheet.save(destination, quality=92)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "output/qa/course-photo-style")
    parser.add_argument("--sheets", action="store_true")
    args = parser.parse_args()
    rows = build_inventory()
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "inventory.json").write_text(json.dumps({"schema_version": 1, "assets": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.sheets:
        render_sheets(rows, args.output)
    print(json.dumps({"files": len(rows), "missing": [r["filename"] for r in rows if not r["exists"]],
                      "registered_photos": sum(r["registered_photo"] for r in rows), "output": str(args.output)}))


if __name__ == "__main__":
    main()
