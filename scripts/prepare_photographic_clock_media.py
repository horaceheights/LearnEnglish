"""Prepare versioned clock photographs locally from an inspected camera source.

The JSON recipe pins the source bytes, measured dial landmarks, masked original
hands, and exact output times. No network, image provider, or generation API.
Originals are never overwritten. This is an authoring utility, not app behavior.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def prepare(recipe: dict, root: Path = ROOT) -> list[dict]:
    source_path = root / recipe["source"]["path"]
    if hashlib.sha256(source_path.read_bytes()).hexdigest() != recipe["source"]["sha256"]:
        raise ValueError("Photographic source differs from the inspected original.")
    source = Image.open(source_path).convert("RGB")
    clean = None
    if recipe.get("original_hand_masks"):
        detail = source.crop(tuple(recipe["detail_crop"]))
        import cv2
        import numpy as np
        mask = Image.new("L", detail.size)
        draw_mask = ImageDraw.Draw(mask)
        for stroke in recipe["original_hand_masks"]:
            draw_mask.line([tuple(p) for p in stroke["points"]], fill=255, width=stroke["width"])
        # Offline authoring dependencies, never app/native dependencies.
        clean = Image.fromarray(cv2.inpaint(np.array(detail), np.array(mask), 5, cv2.INPAINT_TELEA))
        cx, cy = recipe["center"]
    records = []
    for output in recipe["outputs"]:
        photo = source.copy()
        if clean is not None:
            _draw_clock_face(photo, clean, recipe, output, cx, cy)
        photo = photo.crop(tuple(recipe["output_crop"])).resize((1536, 1024), Image.Resampling.LANCZOS)
        if output.get("notation"):
            d = ImageDraw.Draw(photo)
            box = (578, 852, 958, 959)
            d.rounded_rectangle(box, radius=12, fill=(32, 37, 34), outline=(165, 158, 140), width=4)
            font = ImageFont.truetype(recipe["font_path"], 48)
            d.text((768, 905), output["notation"], font=font, fill=(244, 238, 212), anchor="mm")
        payload = None
        for folder in recipe["destination_roots"]:
            path = root / folder / output["filename"]
            path.parent.mkdir(parents=True, exist_ok=True)
            if payload is None:
                import io
                buffer = io.BytesIO()
                photo.save(buffer, format="WEBP", quality=94, method=6)
                payload = buffer.getvalue()
            if path.exists() and path.read_bytes() != payload:
                raise ValueError(f"Refusing to overwrite different versioned pixels: {path}")
            path.write_bytes(payload)
        records.append({**output, "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload)})
    return records


def _draw_clock_face(photo, clean, recipe, output, cx, cy):
        face = clean.copy()
        d = ImageDraw.Draw(face)
        hour_tip = recipe["hour_landmarks"][str(output["hour"])]
        minute_tip = recipe["hour_landmarks"]["12"]
        for landmark, length, width in ((hour_tip, .64, 13), (minute_tip, .87, 7)):
            tip = (cx + (landmark[0] - cx) * length, cy + (landmark[1] - cy) * length)
            tail = (cx - (tip[0] - cx) * .12, cy - (tip[1] - cy) * .12)
            d.line([tail, tip], fill=(36, 36, 32), width=width)
            d.line([(tail[0] - 1, tail[1] - 1), (tip[0] - 1, tip[1] - 1)], fill=(57, 56, 49), width=max(2, width // 3))
            for x, y in (tail, tip):
                r = width / 2
                d.ellipse((x-r, y-r, x+r, y+r), fill=(36, 36, 32))
        d.ellipse((cx-10, cy-10, cx+10, cy+10), fill=(54, 51, 39))
        d.ellipse((cx-5, cy-5, cx+5, cy+5), fill=(92, 79, 53))
        photo.paste(face.filter(ImageFilter.GaussianBlur(.45)), tuple(recipe["detail_crop"][:2]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recipe", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    recipe = json.loads(args.recipe.read_text(encoding="utf-8"))
    records = prepare(recipe)
    args.report.write_text(json.dumps({"source": recipe["source"], "assets": records}, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(records)} versioned photographic clock assets locally; no provider calls.")
