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
VISION_MODEL = "gemini-3.6-flash"

TARGET_DIRS = [
    ROOT / "Lessons" / "Lesson1" / "images",
    ROOT / "mobile" / "assets" / "lesson-assets",
    ROOT / "frontend" / "public" / "lesson-assets",
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
                        # Perform edge-to-edge crop to exact 1536x1024 without any borders or blur
                        fitted = ImageOps.fit(raw_img, (1536, 1024), method=Image.Resampling.LANCZOS)
                        return fitted
                raise RuntimeError(f"No inlineData found in response: {result}")
        except Exception as e:
            print(f"Image generation attempt {attempt + 1} failed: {e}")
            time.sleep(3)
    raise RuntimeError(f"Failed to generate image after {retries} attempts.")


def audit_and_locate_targets(image: Image.Image, targets_desc: list[dict], scene_name: str) -> dict:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    b64_img = base64.b64encode(buf.getvalue()).decode("utf-8")

    prompt = f"""
You are a computer vision auditor for an educational language learning mobile app.
Analyze this image ({scene_name}) of size 1536x1024.

Examine the image carefully:
1. Verify if there is ANY blurred border, letterboxing, pillarboxing, or artificial frame padding around the image edges. (It must be completely edge-to-edge natural photography).
2. Locate the requested interactive targets in normalized coordinates (0.0 to 1.0, where 0,0 is top-left, 1,1 is bottom-right):
   - For people/characters: provide "crown_head": {{"x": float, "y": float}} which is the EXACT tip/top of their head (where a location pin pointer should point). For non-people objects (bench, book, bus, car), provide "crown_head": {{"x": float, "y": float}} at the top-center edge of the object.
   - For each target: provide "rect": {{"x": float, "y": float, "width": float, "height": float}} where x,y is the top-left corner of the bounding box.
   CRITICAL CONSTRAINTS:
   - width MUST be >= 0.14 and height MUST be >= 0.18 for touch accessibility. If the object is smaller, expand the bounding box symmetrically so it meets these minimums.
   - x, y, width, height must ensure x + width <= 0.99 and y + height <= 0.99 and x >= 0.01, y >= 0.01.

Targets to locate:
{json.dumps(targets_desc, indent=2)}

Respond with ONLY a valid JSON object matching this schema:
{{
  "has_blurred_border": false,
  "all_targets_clearly_visible": true,
  "targets": [
    {{
      "id": "target-id",
      "found": true,
      "crown_head": {{"x": 0.5, "y": 0.3}},
      "rect": {{"x": 0.4, "y": 0.3, "width": 0.2, "height": 0.4}}
    }}
  ]
}}
"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{VISION_MODEL}:generateContent?key={GEMINI_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": b64_img
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)


def save_to_all_targets(image: Image.Image, filename: str):
    for d in TARGET_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        dest = d / filename
        image.save(dest, format="WEBP", quality=90, method=6)
        print(f"Saved {dest} ({dest.stat().st_size} bytes)")


SCENES = [
    {
        "filename": "a1_u2_mission_kickoff.webp",
        "prompt": "A bright, sunny, wide eye-level photo of the welcoming entrance of a green public park in summer. A happy family of four: a father, a mother, a young school-age boy, and a young girl stand together at the park path entrance, smiling warmly. Paved walkway, green grass, tall leafy trees, blue sky. Professional photorealism, natural lighting, full-bleed 3:2 landscape.",
        "targets": []
    },
    {
        "filename": "a1_u2_scene_01_park_path.webp",
        "prompt": "A bright, sunny, wide-angle full-bleed landscape photo of a beautiful green city park. The scene clearly depicts four distinct people spread out naturally across the park without overlapping: 1) On the left lawn: an energetic young boy in a yellow t-shirt running across the green grass. 2) In the center-left: a cheerful young girl in a blue dress playing on the grass with a soccer ball. 3) In the center-right under a shady tree: a mother sitting comfortably on a picnic blanket reading an open book. 4) On the far right: a father in a gray t-shirt walking along the paved stone pathway. Bright daylight, lush green lawn and trees. High quality photorealistic, crystal clear details, full-bleed 3:2 composition.",
        "targets": [
            {"id": "boy-running", "description": "The young boy running on the grass"},
            {"id": "girl-playing", "description": "The young girl playing with a ball on the grass"},
            {"id": "mother-reading", "description": "The mother sitting on a blanket reading a book"},
            {"id": "father-walking", "description": "The father walking along the stone pathway"}
        ]
    },
    {
        "filename": "a1_u2_scene_02_bench.webp",
        "prompt": "A sunny, eye-level medium shot in a park featuring a classic green wooden park bench along a stone path. Sitting on the left side of the green bench is a friendly adult man in casual clothes looking relaxed. Sitting on the right side of the bench is an adult woman holding a modern smartphone to her ear, smiling and talking. Resting distinctly between them on the green wooden seat of the bench is a bright red hardcover book. Behind them are lush green trees and park flowers. Photorealistic, crisp focus, natural lighting, full-bleed 3:2.",
        "targets": [
            {"id": "red-book", "description": "The bright red book resting on the green bench"},
            {"id": "green-bench", "description": "The green wooden park bench"},
            {"id": "man-sitting", "description": "The man sitting on the bench"},
            {"id": "woman-talking", "description": "The woman talking on the smartphone"}
        ]
    },
    {
        "filename": "a1_u2_scene_03_bus_stop.webp",
        "prompt": "A daytime street scene along the edge of a green city park. On the left side of the street by the curb bus stop is a modern bright blue public transit bus. In the traffic lane of the asphalt street next to the bus are two distinct red cars driving along the road. On the sidewalk beside the bus stop sign, a man is standing waiting for the bus. Nearby on the sidewalk, two people (a couple walking together as a pair) are walking along the pathway. Clear daylight, urban park boundary, photorealistic, full-bleed 3:2.",
        "targets": [
            {"id": "blue-bus", "description": "The bright blue transit bus"},
            {"id": "red-cars", "description": "The two red cars driving on the street"},
            {"id": "two-people", "description": "The pair of two people walking together on the sidewalk"},
            {"id": "man-waiting", "description": "The man standing and waiting at the bus stop"}
        ]
    },
    {
        "filename": "a1_u2_scene_04_parents.webp",
        "prompt": "A warm, natural medium full-body group portrait of a family of three standing outdoors in a sunny park with green grass and trees behind them. The father stands on the left in a casual shirt smiling at the camera. The mother stands on the right in a sundress smiling warmly. Between them stands their young daughter (about 7 years old) smiling happily. All three family members are clearly visible and well lit. Photorealistic, sharp focus, natural daylight, full-bleed 3:2.",
        "targets": [
            {"id": "father", "description": "The father standing on the left"},
            {"id": "mother", "description": "The mother standing on the right"},
            {"id": "girl", "description": "The young daughter standing in the middle"},
            {"id": "three-people", "description": "The entire group of three people (father, mother, and daughter)"}
        ]
    },
    {
        "filename": "a1_u2_scene_05_photo_father.webp",
        "prompt": "A handsome father in his mid-30s smiling warmly directly at the camera, standing in a sunny city park with blooming flowers and green trees softly blurred in the background. Medium portrait shot, natural golden hour sunlight, sharp realistic details, authentic expression, full-bleed 3:2.",
        "targets": [
            {"id": "father-park", "description": "The father standing in the park"}
        ]
    }
]


def run_build(scene_index: int | None = None):
    results = {}
    to_run = [SCENES[scene_index]] if scene_index is not None else SCENES
    for s in to_run:
        fn = s["filename"]
        print(f"\n==========================================")
        print(f"Generating image for {fn}...")
        img = generate_gemini_image(s["prompt"])
        print(f"Generated {fn}: size {img.size}")

        if s["targets"]:
            print(f"Auditing targets with Gemini Vision for {fn}...")
            audit = audit_and_locate_targets(img, s["targets"], fn)
            print(f"Audit result for {fn}:")
            print(json.dumps(audit, indent=2))
            results[fn] = audit
        else:
            results[fn] = {"has_blurred_border": False, "targets": []}

        save_to_all_targets(img, fn)
        time.sleep(2)

    cache_file = ROOT / "scripts" / "unit_2_mission_coordinates.json"
    if cache_file.exists():
        existing = json.loads(cache_file.read_text(encoding="utf-8"))
    else:
        existing = {}
    existing.update(results)
    cache_file.write_text(json.dumps(existing, indent=2), encoding="utf-8")
    print(f"\nAll targets saved to {cache_file}")


if __name__ == "__main__":
    idx = int(sys.argv[1]) if len(sys.argv) > 1 else None
    run_build(idx)
