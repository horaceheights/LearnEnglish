from __future__ import annotations

"""Build crop-safe Lesson 5.6 breakfast/lunch four-card variants.

The original 3:2 masters distinguish breakfast from lunch with a temporal icon
at the far-left edge. The mobile four-option tile displays the centered 4:5 crop
of that master (approximately x=358..1178), which removes both icons and leaves
two indistinguishable plates. These deterministic siblings keep the complete
time cue, the exact two eggs, and the count inside the shared safe area while
leaving the canonical landscape teaching images untouched.
"""

import hashlib
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

try:
    from scripts.build_a1_units3_5_semantic_repairs import GOLD, INK, badge, egg
except ModuleNotFoundError:  # Direct `python scripts/...` execution.
    from build_a1_units3_5_semantic_repairs import GOLD, INK, badge, egg


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
SIZE = (1536, 1024)
SAFE_LEFT = 358
SAFE_RIGHT = 1178
CREAM = "#f8f2e7"

TARGETS = {
    "breakfast": "a1_scene_two-eggs-for-breakfast_a51ebe1.webp",
    "lunch": "a1_scene_two-eggs-for-lunch_8e8ae04.webp",
}


def font(size: int) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    )
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def canvas(accent: str) -> Image.Image:
    image = Image.new("RGB", SIZE, CREAM)
    glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-280, -420, 920, 730), fill=accent + "45")
    draw.ellipse((760, 370, 1790, 1370), fill="#72b8a23a")
    glow = glow.filter(ImageFilter.GaussianBlur(88))
    image.paste(glow, (0, 0), glow)
    return image


def centered_text(
    draw: ImageDraw.ImageDraw,
    center: tuple[int, int],
    text: str,
    size: int,
    fill: str,
) -> None:
    text_font = font(size)
    box = draw.textbbox((0, 0), text, font=text_font)
    draw.text(
        (center[0] - (box[2] - box[0]) / 2, center[1] - (box[3] - box[1]) / 2),
        text,
        font=text_font,
        fill=fill,
    )


def two_eggs_for_meal(*, breakfast: bool) -> Image.Image:
    image = canvas("#f0c982" if breakfast else "#8fc9df")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((388, 45, 1148, 979), radius=62, fill="#fffaf0", outline=INK, width=9)

    # Every answer-critical bound stays inside the centered mobile crop.
    icon_box = (438, 92, 668, 342)
    draw.rounded_rectangle(
        icon_box,
        radius=32,
        fill="#dcecf2" if breakfast else "#cdebf6",
        outline=INK,
        width=7,
    )
    if breakfast:
        # A rising half-sun at 8 AM is deliberately different from the full,
        # overhead noon sun used for lunch.
        draw.ellipse((485, 172, 621, 308), fill=GOLD, outline="#a86f20", width=7)
        draw.rectangle((453, 255, 653, 320), fill="#efc98e")
        draw.line((453, 255, 653, 255), fill="#b56f38", width=9)
        for line in (
            (553, 145, 553, 112),
            (488, 165, 462, 140),
            (618, 165, 644, 140),
        ):
            draw.line(line, fill=GOLD, width=11)
        time_text = "8:00 AM"
    else:
        draw.ellipse((493, 137, 613, 257), fill=GOLD, outline="#a86f20", width=7)
        for degrees in range(0, 360, 45):
            angle = math.radians(degrees)
            draw.line(
                (
                    553 + int(79 * math.cos(angle)),
                    197 + int(79 * math.sin(angle)),
                    553 + int(105 * math.cos(angle)),
                    197 + int(105 * math.sin(angle)),
                ),
                fill=GOLD,
                width=11,
            )
        time_text = "12:00 PM"

    time_box = (700, 118, 1098, 310)
    draw.rounded_rectangle(time_box, radius=36, fill="#243740", outline=INK, width=6)
    centered_text(draw, (899, 204), time_text, 62, "#ffffff")

    draw.ellipse((460, 410, 1076, 844), fill="#e8edf0", outline="#667980", width=12)
    egg(draw, 655, 625, 1.40)
    egg(draw, 881, 625, 1.40)
    badge(draw, 768, 904, "2", GOLD, 140)
    return image


def output_name(source_name: str) -> str:
    return source_name.removesuffix(".webp") + "_four-card.webp"


def save(image: Image.Image, source_name: str) -> Path:
    output = ASSET_ROOT / output_name(source_name)
    image.convert("RGB").save(output, "WEBP", quality=94, method=6)
    with Image.open(output) as opened:
        if opened.size != SIZE or opened.format != "WEBP":
            raise RuntimeError(f"Invalid four-card meal repair: {output.name} ({opened.format}, {opened.size})")
    return output


def main() -> None:
    if not (SAFE_LEFT <= 438 and 1098 <= SAFE_RIGHT):
        raise RuntimeError("Lesson 5.6 critical artwork escaped the centered four-card safe area")
    rendered = {
        "breakfast": two_eggs_for_meal(breakfast=True),
        "lunch": two_eggs_for_meal(breakfast=False),
    }
    if set(rendered) != set(TARGETS):
        raise RuntimeError(f"Meal repair registry drift: rendered={sorted(rendered)} targets={sorted(TARGETS)}")
    for key, image in rendered.items():
        output = save(image, TARGETS[key])
        digest = hashlib.sha256(output.read_bytes()).hexdigest()[:12]
        print(f"{output.name}\t{digest}")
    print(f"Rebuilt {len(TARGETS)} crop-safe Lesson 5.6 four-card assets.")


if __name__ == "__main__":
    main()
