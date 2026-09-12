from __future__ import annotations

import base64
import io
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

env_path = ROOT / "backend" / ".env"
env = dict(re.findall(r"^([A-Z_]+)=(.*)$", env_path.read_text(encoding="utf-8"), re.M))
GEMINI_KEY = env.get("GEMINI_API_KEY", "").strip()

if not GEMINI_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY in backend/.env")

IMAGE_GEN_MODEL = "gemini-3.1-flash-image"

TARGET_DIRS = [
    ROOT / "Lessons" / "Lesson1" / "images",
    ROOT / "mobile" / "assets" / "lesson-assets",
    ROOT / "frontend" / "public" / "lesson-assets",
]

CARD_SIZE = (1536, 1024)

NEW_ASSETS = [
    {
        "filename": "unit2_l26_one_book.webp",
        "prompt": "A single closed hardcover book with a dark brown leather cover resting on a clean light-wood table. Studio still life, warm natural window light, minimalist, centered, 3:2 landscape.",
    },
    {
        "filename": "unit2_l26_one_phone.webp",
        "prompt": "A modern touchscreen smartphone with silver edges lying flat on an empty white desk. Soft reflections, crisp macro product photography, centered, 3:2 landscape.",
    },
    {
        "filename": "unit2_l26_one_bag.webp",
        "prompt": "A single dark grey canvas messenger bag sitting neatly on a wooden floor against a plain wall. Clean modern design, soft daylight, centered, 3:2 landscape.",
    },
    {
        "filename": "unit2_l26_one_chair.webp",
        "prompt": "A single elegant modern wooden armchair placed in an open bright room with sunlight casting soft shadows. Architectural interior photography, centered, 3:2 landscape.",
    },
    {
        "filename": "unit2_l27_red_contrast.webp",
        "prompt": "A striking still life featuring a bright red ceramic coffee mug on a white marble table in morning light. Rich vibrant red color focus, minimalist, centered, 3:2 landscape.",
    },
    {
        "filename": "unit2_l27_green_contrast.webp",
        "prompt": "A striking still life featuring a vibrant green ceramic bowl on a clean wooden tabletop in soft sunlight. Rich emerald green focus, minimalist, centered, 3:2 landscape.",
    },
    {
        "filename": "unit2_l27_black_contrast.webp",
        "prompt": "A striking still life featuring a matte black ceramic vase and black leather journal on a light concrete surface. Pure black color emphasis, minimalist, centered, 3:2 landscape.",
    },
    {
        "filename": "unit2_l27_white_contrast.webp",
        "prompt": "A striking still life featuring a clean, elegant pure white ceramic pitcher on a wooden kitchen counter. Pure white color emphasis, soft natural daylight, centered, 3:2 landscape.",
    },
]

def generate_gemini_image(prompt: str, retries: int = 3) -> Image.Image:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{IMAGE_GEN_MODEL}:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {
                "aspectRatio": "3:2"
            }
        }
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if not candidates:
                    raise RuntimeError(f"No candidates returned: {result}")
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    if "inlineData" in part:
                        img_bytes = base64.b64decode(part["inlineData"]["data"])
                        raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                        fitted = ImageOps.fit(raw_img, CARD_SIZE, method=Image.Resampling.LANCZOS)
                        return fitted
                raise RuntimeError(f"No inlineData found in response: {result}")
        except Exception as e:
            print(f"  Attempt {attempt + 1} failed: {e}")
            time.sleep(3)
    raise RuntimeError(f"Failed after {retries} attempts.")

def save_to_all_targets(image: Image.Image, filename: str):
    for d in TARGET_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        dest = d / filename
        image.save(dest, format="WEBP", quality=90, method=6)
        print(f"Saved {filename} to {d.relative_to(ROOT)} ({dest.stat().st_size} bytes)")

def main():
    print(f"Generating {len(NEW_ASSETS)} images with {IMAGE_GEN_MODEL}...")
    for idx, item in enumerate(NEW_ASSETS, 1):
        fn = item["filename"]
        # Skip if already exists in frontend
        if (ROOT / "frontend" / "public" / "lesson-assets" / fn).is_file():
            print(f"[{idx}/{len(NEW_ASSETS)}] Already exists: {fn}")
            continue
        print(f"[{idx}/{len(NEW_ASSETS)}] Generating {fn}...")
        img = generate_gemini_image(item["prompt"])
        save_to_all_targets(img, fn)
        time.sleep(1)
    print("Done generating assets.")

if __name__ == "__main__":
    main()
