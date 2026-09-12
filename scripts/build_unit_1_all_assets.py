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

# Canonical Character Anchors
CHAR_FATHER = "established Latino father in his late 30s, dark wavy hair, neat short beard/stubble, blue collared shirt"
CHAR_MOTHER = "established Latina mother in her mid 30s, long wavy dark brown hair, warm smiling expression, coral terracotta blouse"
CHAR_BOY = "established Latino boy around 8-9 years old, lively friendly smile, short neat dark hair, blue short-sleeve collared shirt"
CHAR_GIRL = "established Latina girl around 7 years old, dark brown hair in a neat ponytail, lavender purple t-shirt"
CHAR_BABY = "healthy 10-month-old Latino infant baby, soft dark curls, chubby cheeks, light-yellow cotton onesie"
CHAR_GF = "established Latino grandfather in his late 60s, silver-gray wavy hair, neat wire-rim glasses, olive-green cardigan sweater over a white shirt"
CHAR_GM = "established Latina grandmother in her mid 60s, soft curled silver-gray hair, warm loving smile, cream-colored knit cardigan over a pastel blouse"
CHAR_MAN = "handsome Latino adult man in his early 30s, short neat dark hair, clean-shaven, dark blue shirt"
CHAR_WOMAN = "attractive Latina adult woman in her early 30s, shoulder-length dark brown hair, casual olive-green blouse"

ASSETS_TO_GENERATE = {
    # Baseline Individuals
    "girl.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of a young Latina girl ({CHAR_GIRL}). "
        "She is standing outdoors in a sunlit garden, smiling happily towards the camera. "
        "Full upper body and head clearly centered in frame with natural breathing room. High realism, clean lighting, no text, no borders."
    ),
    "man.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of a handsome Latino adult man ({CHAR_MAN}). "
        "He stands in a bright living room patio, looking toward the camera with a calm, friendly expression. "
        "Waist-up portrait centered in frame. Clean lighting, natural colors, no text, no borders."
    ),
    "woman.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of an attractive Latina adult woman ({CHAR_WOMAN}). "
        "She stands in a bright home interior with natural window light, smiling warmly at the camera. "
        "Waist-up portrait centered in frame. Photorealistic, clean lighting, no text, no borders."
    ),
    "boy.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of a cheerful Latino boy ({CHAR_BOY}). "
        "He stands in a sunlit home courtyard, smiling warmly toward the camera. "
        "Waist-up portrait centered in frame with good headroom. Clean natural lighting, no text, no borders."
    ),

    # Core Family Members
    "family_father.webp": (
        f"Photorealistic 1536x1024 3:2 landscape portrait of the {CHAR_FATHER}. "
        "He is standing in a brightly lit modern living room doorway, looking at the camera with a warm, proud smile. "
        "Waist-up portrait centered with comfortable headroom. Natural daylight, realistic textures, no text, no borders."
    ),
    "family_mother.webp": (
        f"Photorealistic 1536x1024 3:2 landscape portrait of the {CHAR_MOTHER}. "
        "She stands inside a sunlit home kitchen with wooden cabinets, hands resting naturally. "
        "Waist-up portrait centered in frame. Natural daylight, realistic textures, no text, no borders."
    ),
    "family_grandfather.webp": (
        f"Photorealistic 1536x1024 3:2 landscape portrait of the {CHAR_GF}. "
        "He sits comfortably in a well-lit living room armchair, looking at the camera with a kind smile. "
        "Waist-up view centered in frame. Natural indoor lighting, no text, no borders."
    ),
    "family_grandmother.webp": (
        f"Photorealistic 1536x1024 3:2 landscape portrait of the {CHAR_GM}. "
        "She sits in a sunlit dining area with natural plants in the background, facing the camera. "
        "Waist-up view centered in frame. Natural lighting, no text, no borders."
    ),
    "family_baby.webp": (
        f"Photorealistic 1536x1024 3:2 landscape photo of the {CHAR_BABY}. "
        "The baby sits safely on a soft cream rug in a bright nursery, smiling happily towards the camera. "
        "Entire baby centered in frame. Warm gentle lighting, no text, no borders."
    ),
    "family_babies.webp": (
        "Photorealistic 1536x1024 3:2 landscape photo of two adorable infant babies, around 9-11 months old, "
        "sitting safely side-by-side on a soft quilt in a brightly lit playroom with gentle toys around. "
        "Both babies have cheerful expressions and comfortable infant clothing. Both babies completely visible and centered. Natural soft lighting, no text, no borders."
    ),

    # Family Pairings and Groups
    "family_parents.webp": (
        f"Photorealistic 1536x1024 3:2 landscape portrait of the {CHAR_FATHER} and the {CHAR_MOTHER} "
        "standing together warmly side-by-side in their sunlit home living room, smiling at the camera. "
        "Waist-up view of both parents, natural spacing, believable couple portrait. Natural daylight, no text, no borders."
    ),
    "family_grandparents.webp": (
        f"Photorealistic 1536x1024 3:2 landscape portrait of the {CHAR_GF} and the {CHAR_GM} "
        "sitting together on a comfortable sofa in their cozy living room, smiling warmly toward the camera. "
        "Waist-up view of both grandparents centered. Warm domestic lighting, no text, no borders."
    ),
    "family_children.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "standing together smiling cheerfully in a sunlit home garden patio. "
        "Both children fully visible from waist up, natural sibling posture, smiling toward camera. Natural daylight, no text, no borders."
    ),
    "family_brothers.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of two Latino brothers (the {CHAR_BOY} and his older brother around 12 years old in a maroon tee) "
        "sitting together on a patio bench, smiling naturally at the camera. "
        "Waist-up framing, both boys clearly visible and centered. Natural daylight, no text, no borders."
    ),
    "family_sisters.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of two Latina sisters (the {CHAR_GIRL} and her older sister around 10 years old with dark hair in a teal top) "
        "sitting together on a sunny outdoor porch bench, smiling toward camera. "
        "Waist-up framing, both girls clearly visible. Natural daylight, no text, no borders."
    ),
    "family_adults.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of four adult family members (the {CHAR_FATHER}, the {CHAR_MOTHER}, and two adult relatives) "
        "standing together comfortably in a bright home dining room, smiling toward the camera. "
        "Group of four adults from waist up. Natural indoor lighting, no text, no borders."
    ),
    "family_all_members.webp": (
        f"Photorealistic 1536x1024 3:2 landscape photo of the multi-generational Latino family gathered together for a portrait in a sunlit living room: "
        f"the {CHAR_GF} and {CHAR_GM} sitting on the sofa, the {CHAR_FATHER} and {CHAR_MOTHER} standing behind them, "
        f"and the {CHAR_BOY} and {CHAR_GIRL} smiling in front. All family members clearly visible, smiling warmly. Natural home lighting, no text, no borders."
    ),
    "they_boy_girl.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "standing side by side in a bright park walkway, looking directly toward the camera with friendly smiles. "
        "Waist-up framing, centered with comfortable margins. Natural outdoor sunlight, no text, no borders."
    ),

    # Individual Actions
    "boy_is_eating.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} "
        "sitting at a sunlit wooden kitchen table, actively eating a healthy sandwich. "
        "He is holding the sandwich with both hands near his mouth, taking a bite with a happy expression. "
        "Clear focus on the eating action. Daylight from window, no text, no borders."
    ),
    "boy_is_swimming.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} "
        "actively swimming in a sparkling outdoor swimming pool on a sunny day. "
        "His head and shoulders are above the clear blue water, arms mid-stroke creating gentle splashes. "
        "High realism, water reflections, no text, no borders."
    ),
    "girl_is_reading.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_GIRL} "
        "sitting comfortably on a soft sofa, engrossed in reading an open colorful children's picture book. "
        "Her hands hold the book open, eyes looking down at the pages with a focused, happy expression. Natural soft indoor light, no text on UI, no borders."
    ),
    "girl_is_sleeping.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_GIRL} "
        "peacefully asleep in her cozy bed. She lies on a soft pillow with light-colored duvet covering her shoulders, head turned sideways, eyes gently closed in restful sleep. "
        "Soft warm bedroom lighting, calm peaceful atmosphere, no text, no borders."
    ),
    "girl_is_writing.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_GIRL} "
        "sitting at a small wooden desk, actively writing with a pencil in a notebook. "
        "Her right hand grips the pencil making writing strokes on the lined paper, her left hand holds the notebook flat. Focused expression. Natural daylight, no text on UI, no borders."
    ),
    "man_is_drinking.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the handsome Latino adult man ({CHAR_MAN}) "
        "sitting at a bright kitchen island, raising a clear glass of water to his mouth and taking a refreshing sip. "
        "Glass tilted to lips, hand holding glass clearly visible. Bright morning light, clean background, no text, no borders."
    ),
    "man_is_sitting.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the Latino adult man ({CHAR_MAN}) "
        "sitting comfortably in a modern armchair in a bright living room, relaxed posture with arms on armrests, legs visible, looking forward with a relaxed smile. "
        "Full sitting posture unmistakable. Clean daylight, no text, no borders."
    ),
    "woman_is_writing.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the Latina adult woman ({CHAR_WOMAN}) "
        "sitting at a wooden dining table with a notebook and pen, actively writing notes. "
        "Her hand is guiding the pen across the page with focused attention. Warm natural light from a window, no text on UI, no borders."
    ),

    # Pair Actions
    "they_boy_girl_are_eating.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "sitting together at a wooden dining table, both actively eating afternoon snacks (apples and sandwiches). "
        "Both children clearly visible, both actively eating and smiling. Bright kitchen setting, no text, no borders."
    ),
    "they_boy_girl_are_reading.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "sitting together on a comfortable rug in a sunlit living room, both holding and reading books attentively. "
        "Both faces and reading actions clearly visible. Natural light, no text on UI, no borders."
    ),
    "they_boy_girl_are_running.webp": (
        f"Photorealistic 1536x1024 3:2 landscape action shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "running side-by-side along a paved pathway in a sunny green city park. "
        "Dynamic running poses with bent elbows and airborne strides, happy energetic expressions. Full bodies visible, lush trees and grass in background. Natural sunlight, no text, no borders."
    ),
    "they_boy_girl_are_writing.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "sitting side-by-side at a study desk, both holding pencils and actively writing in their notebooks. "
        "Focused, cooperative homework scene. Bright daylight, clear view of hands writing, no text on UI, no borders."
    ),

    # Family Actions
    "family_brother_studying.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the older brother (approx 11-12 years old Latino boy in a blue shirt) "
        "sitting at a desk with open textbooks, notebook, and pen. He is studying intently, reading a textbook while taking notes with a pen. "
        "Desk lamp and window light, studious atmosphere, no text on UI, no borders."
    ),
    "family_children_playing.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "playing together with wooden building blocks on a soft living room carpet. "
        "They are happily stacking colorful blocks together with lively hand gestures and laughter. Natural living room daylight, no text, no borders."
    ),
    "family_father_working.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_FATHER} "
        "working in a home office workshop, measuring a wooden board with a tape measure and pencil, focused on his project. "
        "Clear focus on the working activity. Workshop tools neatly arranged in background, no text, no borders."
    ),
    "family_mother_cooking.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_MOTHER} "
        "standing at a modern stove in a bright kitchen, actively stirring vegetables in a stainless steel skillet with a wooden spoon. "
        "Fresh ingredients on the counter beside her. Warm kitchen ambiance, natural daylight, no text, no borders."
    ),
    "family_parents_talking.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_FATHER} and the {CHAR_MOTHER} "
        "sitting across from each other at a kitchen table with coffee mugs, engaged in an animated, happy conversation. "
        "Both gesturing gently with their hands, smiling and making eye contact. Natural morning daylight, no text, no borders."
    ),
    "family_baby_sleeping.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BABY} "
        "sleeping peacefully in a white wooden crib. The baby lies on a soft mattress with head turned to the side, breathing gently with relaxed hands, wearing a light yellow onesie. "
        "Soft warm nursery lighting, calm tranquil atmosphere, no text, no borders."
    ),
    "family_grandparents_sitting.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_GF} and the {CHAR_GM} "
        "sitting comfortably side-by-side on their cozy sofa, relaxed posture with hands resting on their laps, smiling warmly toward the room. "
        "Full sitting posture clearly visible. Warm living room lighting, no text, no borders."
    ),
    "family_grandparents_talking.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_GF} and the {CHAR_GM} "
        "sitting together on their sofa, actively talking to each other. "
        "The grandfather gestures with his hand as he speaks, and the grandmother listens with a warm, affectionate smile. Warm cozy domestic setting, no text, no borders."
    ),
    "family_father_talking.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_FATHER} "
        "sitting at the family table, actively talking with open-handed conversational gesture and an engaged smile, addressing family members off-camera. "
        "Natural home dining room lighting, no text, no borders."
    ),
    "family_sister_playing.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_GIRL} "
        "happily playing with toy figurines on the living room rug, smiling and moving the toys with animated gestures. "
        "Cheerful playroom atmosphere, natural daylight, no text, no borders."
    ),
    "man_is_standing.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of a handsome Latino adult man ({CHAR_MAN}). "
        "He stands naturally on both feet in a bright modern living room, looking toward the camera with a calm, friendly posture. "
        "Medium full standing shot centered in frame with head, torso, and legs visible. Natural daylight, no text, no borders."
    ),
    "family_children_studying.webp": (
        f"Photorealistic 1536x1024 3:2 landscape shot of the {CHAR_BOY} and the {CHAR_GIRL} "
        "sitting side-by-side at a clean wooden desk in a bright sunlit study room. Both children are studying intently, "
        "with open textbooks and notebooks on the desk. Focused, cooperative atmosphere, natural daylight, no text, no borders."
    ),
}


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
            print(f"  Attempt {attempt + 1} failed: {e}", flush=True)
            time.sleep(3)
    raise RuntimeError(f"Failed after {retries} attempts.")


def save_to_all_targets(image: Image.Image, filename: str):
    for d in TARGET_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        target = d / filename
        image.save(target, format="WEBP", quality=90, method=6)
        print(f"  -> Saved {target} ({target.stat().st_size} bytes)", flush=True)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate Unit 1 Gemini assets")
    parser.add_argument("--only", type=str, help="Specific filename to generate")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of files to generate")
    parser.add_argument("--skip-existing", action="store_true", help="Skip files that already exist in mobile/assets/lesson-assets")
    args = parser.parse_args()

    items = list(ASSETS_TO_GENERATE.items())
    if args.only:
        items = [(k, v) for k, v in items if k == args.only]
        if not items:
            print(f"Error: {args.only} not found in ASSETS_TO_GENERATE")
            sys.exit(1)
    elif args.limit > 0:
        items = items[:args.limit]

    total = len(items)
    print(f"Targeting {total} Unit 1 photorealistic Gemini assets...")
    for idx, (filename, prompt) in enumerate(items, 1):
        print(f"\n[{idx}/{total}] Generating {filename}...", flush=True)
        try:
            img = generate_gemini_image(prompt)
            save_to_all_targets(img, filename)
        except Exception as err:
            print(f"FAILED to generate {filename}: {err}", flush=True)
            sys.exit(1)
        time.sleep(1)

    print("\nAll targeted Unit 1 assets generated successfully!", flush=True)


if __name__ == "__main__":
    main()
