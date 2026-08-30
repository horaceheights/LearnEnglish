from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"
SIZE = (1536, 1024)

# These are the learner-facing defects confirmed by the final Units 3-5 pixel
# audit.  Keeping the exact basenames here lets the builder repair this review
# batch without touching any other canonical asset.
REPORTED_CONCERN_FILENAMES = {
    "a1_scene_accepts-tea_91500af.webp",
    "a1_scene_accepts_3a1306b.webp",
    "a1_scene_canada-country_3aa8b25.webp",
    "a1_scene_i-wake-daily_acdb17a.webp",
    "a1_scene_i-want-juice_9e02e22.webp",
    "a1_scene_juice-8_437a2f8.webp",
    "a1_scene_man-wants-two-red-apples_772ff8a.webp",
    "a1_scene_milk-4_1e7e795.webp",
    "a1_scene_origin-sofia_83856b9.webp",
    "a1_scene_sofia-canadian_adf798e.webp",
    "a1_scene_tea-8_43e62f6.webp",
    "a1_scene_they-work-daily_d85c6f1.webp",
    "a1_scene_want_b5f23bc.webp",
    "a1_scene_wants-juice_0276b44.webp",
    "a1_scene_woman-wants-three-red-apples_dfcb889.webp",
    "a1_scene_woman-wants-two-green-apples_2751439.webp",
    "a1_scene_woman-wants-two-red-apples_ba4c073.webp",
    "a1_scene_yes-please_ae43854.webp",
}

INK = "#173640"
CREAM = "#f8f2e7"
TEAL = "#2f9182"
BLUE = "#3974b8"
GOLD = "#e3aa34"
RED = "#c8423d"
GREEN = "#408c5d"
PURPLE = "#7754a3"


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def canvas(accent: str = "#e4b34f") -> Image.Image:
    image = Image.new("RGB", SIZE, CREAM)
    glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-280, -380, 900, 740), fill=accent + "38")
    draw.ellipse((760, 390, 1800, 1370), fill="#71b8a032")
    image.paste(glow.filter(ImageFilter.GaussianBlur(85)), (0, 0), glow.filter(ImageFilter.GaussianBlur(85)))
    return image


def centered_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, size: int, fill: str = INK) -> None:
    fnt = font(size)
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text((xy[0] - (box[2] - box[0]) / 2, xy[1] - (box[3] - box[1]) / 2), text, font=fnt, fill=fill)


def badge(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, color: str = GOLD, width: int | None = None) -> None:
    fnt = font(52)
    box = draw.textbbox((0, 0), text, font=fnt)
    w = width or max(210, box[2] - box[0] + 72)
    draw.rounded_rectangle((x - w // 2, y - 52, x + w // 2, y + 52), radius=28, fill="#fffdf7", outline=color, width=9)
    centered_text(draw, (x, y - 4), text, 52, INK)


def speech_marker(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = TEAL, question: bool = False) -> None:
    draw.rounded_rectangle((x - 105, y - 72, x + 105, y + 55), radius=38, fill="#ffffff", outline=color, width=9)
    draw.polygon([(x - 22, y + 55), (x + 12, y + 55), (x - 14, y + 96)], fill="#ffffff", outline=color)
    centered_text(draw, (x, y - 9), "?" if question else "●", 70, color)


PERSON = {
    "Ana": {"shirt": TEAL, "skin": "#b96f4b", "hair": "#29211e", "female": True},
    "Luis": {"shirt": "#24537c", "skin": "#a65f3e", "hair": "#211c19", "female": False},
    "Sofia": {"shirt": "#a6465d", "skin": "#c47c58", "hair": "#3a2420", "female": True},
    "Diego": {"shirt": "#487553", "skin": "#a96648", "hair": "#241c18", "female": False},
    "Boy": {"shirt": BLUE, "skin": "#ba754e", "hair": "#2b211e", "female": False},
    "Woman": {"shirt": "#d06b51", "skin": "#b97251", "hair": "#38251f", "female": True},
    "Man": {"shirt": "#416b56", "skin": "#aa6748", "hair": "#2a211d", "female": False},
}


def person(
    draw: ImageDraw.ImageDraw,
    x: int,
    floor: int,
    name: str,
    scale: float = 1.0,
    pose: str = "neutral",
    show_badge: bool = True,
) -> dict[str, tuple[int, int]]:
    style = PERSON[name]
    s = scale
    head_y = int(floor - 500 * s)
    head_r = int(86 * s)
    shoulder_y = int(floor - 370 * s)
    hip_y = int(floor - 150 * s)
    leg_w = max(13, int(25 * s))
    arm_w = max(13, int(30 * s))
    outline = INK

    if style["female"]:
        draw.ellipse((x - int(112 * s), head_y - int(108 * s), x + int(112 * s), head_y + int(145 * s)), fill=style["hair"], outline=outline, width=max(5, int(8 * s)))
    else:
        draw.ellipse((x - head_r, head_y - head_r, x + head_r, head_y + head_r), fill=style["hair"], outline=outline, width=max(5, int(8 * s)))
    draw.ellipse((x - head_r, head_y - head_r, x + head_r, head_y + head_r), fill=style["skin"], outline=outline, width=max(5, int(8 * s)))
    draw.arc((x - int(36 * s), head_y + int(4 * s), x + int(36 * s), head_y + int(48 * s)), 15, 165, fill=outline, width=max(4, int(7 * s)))
    draw.ellipse((x - int(34 * s), head_y - int(23 * s), x - int(17 * s), head_y - int(6 * s)), fill=outline)
    draw.ellipse((x + int(17 * s), head_y - int(23 * s), x + int(34 * s), head_y - int(6 * s)), fill=outline)
    draw.rounded_rectangle((x - int(112 * s), shoulder_y, x + int(112 * s), hip_y), radius=int(38 * s), fill=style["shirt"], outline=outline, width=max(5, int(8 * s)))

    left_shoulder = (x - int(95 * s), shoulder_y + int(30 * s))
    right_shoulder = (x + int(95 * s), shoulder_y + int(30 * s))
    left_hand = (x - int(145 * s), hip_y - int(8 * s))
    right_hand = (x + int(145 * s), hip_y - int(8 * s))
    if pose == "wave":
        right_hand = (x + int(165 * s), head_y - int(120 * s))
    elif pose == "self":
        right_hand = (x + int(10 * s), shoulder_y + int(92 * s))
    elif pose == "point-left":
        left_hand = (x - int(235 * s), shoulder_y + int(55 * s))
    elif pose == "point-right":
        right_hand = (x + int(235 * s), shoulder_y + int(55 * s))
    elif pose == "hold":
        left_hand = (x - int(72 * s), hip_y - int(20 * s))
        right_hand = (x + int(72 * s), hip_y - int(20 * s))
    draw.line((left_shoulder, left_hand), fill=style["skin"], width=arm_w)
    draw.line((right_shoulder, right_hand), fill=style["skin"], width=arm_w)
    for hx, hy in (left_hand, right_hand):
        draw.ellipse((hx - int(17 * s), hy - int(17 * s), hx + int(17 * s), hy + int(17 * s)), fill=style["skin"], outline=outline, width=max(3, int(5 * s)))
    draw.line((x - int(52 * s), hip_y, x - int(65 * s), floor), fill="#303c49", width=leg_w)
    draw.line((x + int(52 * s), hip_y, x + int(65 * s), floor), fill="#303c49", width=leg_w)
    if show_badge:
        badge(draw, x, shoulder_y + int(95 * s), name.upper(), GOLD, int(170 * s))
    return {"head": (x, head_y), "left_hand": left_hand, "right_hand": right_hand, "chest": (x, shoulder_y + int(95 * s))}


def book(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, color: str = BLUE) -> None:
    w, h = int(155 * scale), int(205 * scale)
    draw.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=int(15 * scale), fill=color, outline=INK, width=max(5, int(8 * scale)))
    draw.line((x - w // 2 + int(28 * scale), y - h // 2 + 4, x - w // 2 + int(28 * scale), y + h // 2 - 4), fill="#f5efdf", width=max(4, int(9 * scale)))


def phone(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(110 * scale), int(190 * scale)
    draw.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=int(22 * scale), fill="#202830", outline=INK, width=max(5, int(8 * scale)))
    draw.rounded_rectangle((x - w // 2 + int(12 * scale), y - h // 2 + int(20 * scale), x + w // 2 - int(12 * scale), y + h // 2 - int(25 * scale)), radius=int(12 * scale), fill="#d7eef0")


def bag(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, color: str = GOLD) -> None:
    w, h = int(190 * scale), int(170 * scale)
    draw.rounded_rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), radius=int(25 * scale), fill=color, outline=INK, width=max(5, int(8 * scale)))
    draw.arc((x - int(60 * scale), y - int(145 * scale), x + int(60 * scale), y - int(10 * scale)), 180, 360, fill=INK, width=max(6, int(11 * scale)))


def apple(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, color: str = RED) -> None:
    r = int(66 * scale)
    draw.ellipse((x - r, y - r, x + r, y + r), fill=color, outline=INK, width=max(4, int(7 * scale)))
    draw.line((x, y - r, x + int(8 * scale), y - r - int(36 * scale)), fill="#5c3a22", width=max(4, int(9 * scale)))
    draw.ellipse((x + int(3 * scale), y - r - int(43 * scale), x + int(48 * scale), y - r - int(15 * scale)), fill=GREEN, outline=INK, width=max(2, int(4 * scale)))


def banana(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(180 * scale), int(95 * scale)
    draw.arc((x - w, y - h, x + w, y + h), 15, 165, fill="#e5bb31", width=max(18, int(44 * scale)))
    draw.arc((x - w, y - h, x + w, y + h), 15, 165, fill=INK, width=max(3, int(5 * scale)))


def egg(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(64 * scale), int(85 * scale)
    draw.ellipse((x - w, y - h, x + w, y + h), fill="#fffdf5", outline=INK, width=max(4, int(7 * scale)))
    draw.ellipse((x - int(25 * scale), y - int(25 * scale), x + int(25 * scale), y + int(25 * scale)), fill="#ecb73c", outline="#b67a22", width=max(3, int(5 * scale)))


def orange(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    r = int(63 * scale)
    draw.ellipse((x - r, y - r, x + r, y + r), fill="#e98d27", outline=INK, width=max(4, int(7 * scale)))


def strawberry(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    r = int(64 * scale)
    draw.polygon([(x - r, y - r // 2), (x + r, y - r // 2), (x, y + r)], fill=RED, outline=INK)
    draw.polygon([(x - r // 2, y - r // 2), (x, y - r), (x + r // 2, y - r // 2)], fill=GREEN, outline=INK)


def food(draw: ImageDraw.ImageDraw, kind: str, x: int, y: int, scale: float = 1.0, color: str | None = None) -> None:
    kind = kind.lower()
    if kind in {"apple", "apples"}:
        apple(draw, x, y, scale, color or RED)
    elif kind in {"egg", "eggs"}:
        egg(draw, x, y, scale)
    elif kind in {"orange", "oranges"}:
        orange(draw, x, y, scale)
    elif kind in {"strawberry", "strawberries"}:
        strawberry(draw, x, y, scale)
    elif kind in {"banana", "bananas"}:
        banana(draw, x, y, scale)
    elif kind in {"pear", "pears"}:
        r = int(62 * scale)
        draw.ellipse((x - r, y - int(20 * scale), x + r, y + int(105 * scale)), fill="#91b83f", outline=INK, width=max(4, int(7 * scale)))
        draw.ellipse((x - int(42 * scale), y - int(85 * scale), x + int(42 * scale), y + int(25 * scale)), fill="#91b83f", outline=INK, width=max(4, int(7 * scale)))
        draw.line((x, y - int(86 * scale), x + int(10 * scale), y - int(125 * scale)), fill="#5c3a22", width=max(4, int(8 * scale)))
    elif kind in {"grape", "grapes"}:
        for row in range(4):
            for col in range(row + 1):
                gx = x + int((col - row / 2) * 45 * scale)
                gy = y - int(65 * scale) + int(row * 45 * scale)
                draw.ellipse((gx - int(25 * scale), gy - int(25 * scale), gx + int(25 * scale), gy + int(25 * scale)), fill="#6e4d8d", outline=INK, width=max(2, int(4 * scale)))
        draw.line((x, y - int(100 * scale), x + int(8 * scale), y - int(145 * scale)), fill=GREEN, width=max(4, int(8 * scale)))
    elif kind == "fish":
        draw.ellipse((x - int(120 * scale), y - int(55 * scale), x + int(75 * scale), y + int(55 * scale)), fill="#d5a166", outline=INK, width=max(4, int(7 * scale)))
        draw.polygon([(x + int(70 * scale), y), (x + int(145 * scale), y - int(70 * scale)), (x + int(145 * scale), y + int(70 * scale))], fill="#d5a166", outline=INK)
    elif kind == "chicken":
        draw.ellipse((x - int(100 * scale), y - int(55 * scale), x + int(80 * scale), y + int(70 * scale)), fill="#d99355", outline=INK, width=max(4, int(7 * scale)))
        draw.line((x + int(55 * scale), y + int(45 * scale), x + int(130 * scale), y + int(90 * scale)), fill="#ead9bb", width=max(10, int(24 * scale)))
    elif kind == "bread":
        draw.rounded_rectangle((x - int(125 * scale), y - int(70 * scale), x + int(125 * scale), y + int(70 * scale)), radius=int(58 * scale), fill="#d99a4d", outline=INK, width=max(4, int(7 * scale)))
    elif kind == "rice":
        draw.ellipse((x - int(110 * scale), y - int(42 * scale), x + int(110 * scale), y + int(72 * scale)), fill="#d9e2e6", outline=INK, width=max(4, int(7 * scale)))
        draw.ellipse((x - int(90 * scale), y - int(70 * scale), x + int(90 * scale), y + int(35 * scale)), fill="#fffdf5", outline=INK, width=max(3, int(5 * scale)))
        grain_w, grain_h = max(5, int(24 * scale)), max(3, int(11 * scale))
        for dx, dy in [(-52, -24), (-18, -38), (22, -30), (52, -8), (-38, 4), (0, -2), (30, 8)]:
            gx, gy = int(x + dx * scale), int(y + dy * scale)
            draw.ellipse((gx - grain_w // 2, gy - grain_h // 2, gx + grain_w // 2, gy + grain_h // 2), fill="#e6dcc5", outline="#bda980", width=max(1, int(1.5 * scale)))
    elif kind in {"water", "milk", "juice"}:
        liquid = {"water": "#d7eef4", "milk": "#f7f5e9", "juice": "#e9a72d"}[kind]
        draw.polygon([(x - int(65 * scale), y - int(100 * scale)), (x + int(65 * scale), y - int(100 * scale)), (x + int(52 * scale), y + int(100 * scale)), (x - int(52 * scale), y + int(100 * scale))], fill="#edf7f8", outline=INK)
        draw.polygon([(x - int(56 * scale), y - int(25 * scale)), (x + int(56 * scale), y - int(25 * scale)), (x + int(47 * scale), y + int(90 * scale)), (x - int(47 * scale), y + int(90 * scale))], fill=liquid)
    elif kind in {"coffee", "tea"}:
        liquid = "#513121" if kind == "coffee" else "#bd7937"
        draw.rounded_rectangle((x - int(100 * scale), y - int(70 * scale), x + int(90 * scale), y + int(70 * scale)), radius=int(35 * scale), fill="#fffdf6", outline=INK, width=max(4, int(7 * scale)))
        draw.ellipse((x - int(88 * scale), y - int(61 * scale), x + int(78 * scale), y - int(20 * scale)), fill=liquid, outline=INK, width=max(3, int(5 * scale)))
        draw.ellipse((x + int(70 * scale), y - int(35 * scale), x + int(150 * scale), y + int(55 * scale)), outline=INK, width=max(7, int(13 * scale)))


def heart(draw: ImageDraw.ImageDraw, x: int, y: int, positive: bool = True) -> None:
    if positive:
        centered_text(draw, (x, y), "♥", 150, "#d44d69")
    else:
        draw.ellipse((x - 65, y - 65, x + 65, y + 65), outline=RED, width=18)
        draw.line((x - 48, y + 48, x + 48, y - 48), fill=RED, width=18)


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str = TEAL) -> None:
    draw.line((start, end), fill=color, width=30)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    for offset in (2.45, -2.45):
        draw.line((end, (int(end[0] + 65 * math.cos(angle + offset)), int(end[1] + 65 * math.sin(angle + offset)))), fill=color, width=30)


def draw_maple_leaf(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    scale: float = 1.0,
    color: str = "#c9363d",
) -> None:
    """Draw a maple leaf as geometry so platform font coverage cannot alter it."""
    points = [
        (0, -78),
        (14, -45),
        (36, -57),
        (29, -28),
        (61, -34),
        (47, -4),
        (73, 12),
        (39, 22),
        (45, 53),
        (13, 39),
        (10, 72),
        (-10, 72),
        (-13, 39),
        (-45, 53),
        (-39, 22),
        (-73, 12),
        (-47, -4),
        (-61, -34),
        (-29, -28),
        (-36, -57),
        (-14, -45),
    ]
    polygon = [(x + int(px * scale), y + int(py * scale)) for px, py in points]
    draw.polygon(polygon, fill=color)
    draw.polygon(
        [
            (x - int(7 * scale), y + int(62 * scale)),
            (x + int(7 * scale), y + int(62 * scale)),
            (x + int(5 * scale), y + int(88 * scale)),
            (x - int(5 * scale), y + int(88 * scale)),
        ],
        fill=color,
    )


def draw_affirmative_check(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    """Draw an affirmative checkmark without relying on a Unicode glyph."""
    radius = int(83 * scale)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=GREEN, outline=INK, width=max(5, int(9 * scale)))
    width = max(10, int(22 * scale))
    draw.line(
        (
            x - int(48 * scale),
            y,
            x - int(12 * scale),
            y + int(38 * scale),
            x + int(58 * scale),
            y - int(47 * scale),
        ),
        fill="#ffffff",
        width=width,
        joint="curve",
    )


def draw_briefcase(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(132 * scale), int(82 * scale)
    stroke = max(3, int(7 * scale))
    draw.rounded_rectangle(
        (x - w // 2, y - h // 2, x + w // 2, y + h // 2),
        radius=max(5, int(13 * scale)),
        fill="#be7d3f",
        outline=INK,
        width=stroke,
    )
    draw.arc(
        (x - int(34 * scale), y - int(69 * scale), x + int(34 * scale), y - int(12 * scale)),
        180,
        360,
        fill=INK,
        width=stroke,
    )
    draw.line((x - w // 2 + stroke, y, x + w // 2 - stroke, y), fill=INK, width=max(2, int(4 * scale)))
    draw.rectangle(
        (x - int(8 * scale), y - int(8 * scale), x + int(8 * scale), y + int(9 * scale)),
        fill=GOLD,
        outline=INK,
        width=max(1, int(3 * scale)),
    )


def draw_wake_icon(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    """Combine a rising sun with an alarm-clock face in a compact cell."""
    radius = int(24 * scale)
    for degrees in range(0, 360, 45):
        angle_radians = math.radians(degrees)
        inner = radius + int(7 * scale)
        outer = radius + int(17 * scale)
        draw.line(
            (
                x + int(inner * math.cos(angle_radians)),
                y + int(inner * math.sin(angle_radians)),
                x + int(outer * math.cos(angle_radians)),
                y + int(outer * math.sin(angle_radians)),
            ),
            fill=GOLD,
            width=max(2, int(4 * scale)),
        )
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#f4bd43", outline=INK, width=max(2, int(4 * scale)))
    draw.line((x, y, x, y - int(13 * scale)), fill=INK, width=max(2, int(4 * scale)))
    draw.line((x, y, x + int(11 * scale), y + int(7 * scale)), fill=INK, width=max(2, int(4 * scale)))
    draw.arc((x - int(31 * scale), y - int(39 * scale), x - int(4 * scale), y - int(13 * scale)), 180, 345, fill=INK, width=max(2, int(4 * scale)))
    draw.arc((x + int(4 * scale), y - int(39 * scale), x + int(31 * scale), y - int(13 * scale)), 195, 360, fill=INK, width=max(2, int(4 * scale)))


def flag(draw: ImageDraw.ImageDraw, x: int, y: int, country: str, scale: float = 1.0) -> None:
    w, h = int(250 * scale), int(150 * scale)
    left, top = x - w // 2, y - h // 2
    country = country.lower()
    draw.rounded_rectangle((left - 5, top - 5, left + w + 5, top + h + 5), radius=15, fill="#ffffff", outline=INK, width=7)
    if country == "mexico":
        draw.rectangle((left, top, left + w // 3, top + h), fill="#1d824d")
        draw.rectangle((left + w // 3, top, left + 2 * w // 3, top + h), fill="#ffffff")
        draw.rectangle((left + 2 * w // 3, top, left + w, top + h), fill="#cf3636")
        draw.ellipse((x - 12, y - 12, x + 12, y + 12), fill="#a87824")
    elif country == "canada":
        draw.rectangle((left, top, left + w // 4, top + h), fill="#c9363d")
        draw.rectangle((left + w // 4, top, left + 3 * w // 4, top + h), fill="#ffffff")
        draw.rectangle((left + 3 * w // 4, top, left + w, top + h), fill="#c9363d")
        draw_maple_leaf(draw, x, y - int(3 * scale), 0.67 * scale)
    elif country == "spain":
        draw.rectangle((left, top, left + w, top + h // 4), fill="#b92f36")
        draw.rectangle((left, top + h // 4, left + w, top + 3 * h // 4), fill="#e1ad2d")
        draw.rectangle((left, top + 3 * h // 4, left + w, top + h), fill="#b92f36")
    else:
        stripe_h = max(1, h // 13)
        for i in range(13):
            draw.rectangle((left, top + i * stripe_h, left + w, top + (i + 1) * stripe_h), fill="#c83e42" if i % 2 == 0 else "#ffffff")
        draw.rectangle((left, top, left + int(w * 0.43), top + int(h * 0.54)), fill="#31548a")
        for row in range(3):
            for col in range(4):
                draw.ellipse((left + 14 + col * 22, top + 12 + row * 20, left + 20 + col * 22, top + 18 + row * 20), fill="#ffffff")


def cake(draw: ImageDraw.ImageDraw, x: int, y: int, number: int) -> None:
    draw.rounded_rectangle((x - 145, y - 35, x + 145, y + 100), radius=25, fill="#f0cf9f", outline=INK, width=8)
    draw.rectangle((x - 135, y + 15, x + 135, y + 40), fill="#f19a86")
    centered_text(draw, (x, y - 78), str(number), 118, RED)
    draw.line((x, y - 32, x, y - 2), fill=INK, width=8)


def car(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, color: str = "#f2f2ee") -> None:
    w = int(310 * scale)
    draw.rounded_rectangle((x - w // 2, y - int(70 * scale), x + w // 2, y + int(70 * scale)), radius=int(44 * scale), fill=color, outline=INK, width=max(5, int(8 * scale)))
    draw.polygon([(x - int(100 * scale), y - int(70 * scale)), (x - int(45 * scale), y - int(150 * scale)), (x + int(90 * scale), y - int(150 * scale)), (x + int(135 * scale), y - int(70 * scale))], fill="#bcdce4", outline=INK)
    for wx in (x - int(100 * scale), x + int(105 * scale)):
        draw.ellipse((wx - int(42 * scale), y + int(35 * scale), wx + int(42 * scale), y + int(118 * scale)), fill="#29323b", outline=INK, width=max(4, int(7 * scale)))


def bike(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    r = int(85 * scale)
    left, right = x - int(120 * scale), x + int(120 * scale)
    for cx in (left, right):
        draw.ellipse((cx - r, y - r, cx + r, y + r), outline=INK, width=max(5, int(9 * scale)))
    draw.line((left, y, x, y - int(105 * scale), right, y, x - int(28 * scale), y, left, y), fill=BLUE, width=max(7, int(13 * scale)))
    draw.line((x, y - int(105 * scale), x + int(82 * scale), y - int(135 * scale)), fill=INK, width=max(5, int(9 * scale)))


def table(draw: ImageDraw.ImageDraw, y: int = 730) -> None:
    draw.rounded_rectangle((300, y, 1236, y + 100), radius=25, fill="#ac6c3d", outline=INK, width=9)
    draw.line((390, y + 95, 350, 940), fill=INK, width=25)
    draw.line((1146, y + 95, 1186, 940), fill=INK, width=25)


def clock(draw: ImageDraw.ImageDraw, x: int, y: int, hour: int, digital: bool = True, scale: float = 1.0) -> None:
    r = int(150 * scale)
    draw.ellipse((x - r, y - r, x + r, y + r), fill="#fffdf7", outline=INK, width=max(7, int(12 * scale)))
    for n in range(12):
        a = math.radians(n * 30 - 90)
        x1, y1 = x + int((r - 24) * math.cos(a)), y + int((r - 24) * math.sin(a))
        x2, y2 = x + int((r - 4) * math.cos(a)), y + int((r - 4) * math.sin(a))
        draw.line((x1, y1, x2, y2), fill=INK, width=max(3, int(6 * scale)))
    angle = math.radians((hour % 12) * 30 - 90)
    draw.line((x, y, x + int(r * 0.62 * math.cos(angle)), y + int(r * 0.62 * math.sin(angle))), fill=TEAL, width=max(7, int(13 * scale)))
    draw.line((x, y, x, y - int(r * 0.8)), fill=INK, width=max(6, int(11 * scale)))
    draw.ellipse((x - 12, y - 12, x + 12, y + 12), fill=INK)
    if digital:
        badge(draw, x, y + r + 95, f"{hour}:00", TEAL, 270)


def week_strip(
    draw: ImageDraw.ImageDraw,
    active: str,
    y: int = 710,
    icon: str | None = None,
    *,
    repeat_icon: bool = True,
    show_monday_word: bool = False,
    highlight_active: bool = True,
) -> None:
    days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    gap, w = 18, 172
    total = 7 * w + 6 * gap
    start = (1536 - total) // 2
    for index, day in enumerate(days):
        left = start + index * (w + gap)
        active_day = highlight_active and day.startswith(active.upper()[:3])
        draw.rounded_rectangle((left, y, left + w, y + 155), radius=25, fill="#f4bd43" if active_day else "#ffffff", outline=GOLD if active_day else INK, width=8)
        centered_text(draw, (left + w // 2, y + 45), day[:3], 40, INK)
        if icon and (repeat_icon or active_day):
            if icon == "SCHOOL":
                center_x = left + w // 2
                draw.rectangle((center_x - 29, y + 103, center_x + 29, y + 139), fill="#d9945d", outline=TEAL, width=4)
                draw.polygon([(center_x - 36, y + 103), (center_x, y + 79), (center_x + 36, y + 103)], fill="#9d5340", outline=TEAL)
                draw.rectangle((center_x - 8, y + 119, center_x + 8, y + 139), fill="#557f91", outline=TEAL, width=3)
            elif icon == "WAKE":
                draw_wake_icon(draw, left + w // 2, y + 112, 0.72)
            elif icon == "WORK":
                draw_briefcase(draw, left + w // 2, y + 113, 0.52)
            else:
                centered_text(draw, (left + w // 2, y + 105), icon, 48, TEAL)
    if show_monday_word:
        centered_text(draw, (768, y - 95), "MONDAY", 78, INK)


def house(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(390 * scale), int(255 * scale)
    draw.rectangle((x - w // 2, y - h // 2, x + w // 2, y + h // 2), fill="#e9e3d5", outline=INK, width=max(6, int(10 * scale)))
    draw.polygon([(x - w // 2 - int(30 * scale), y - h // 2), (x, y - h // 2 - int(180 * scale)), (x + w // 2 + int(30 * scale), y - h // 2)], fill="#a45645", outline=INK)
    draw.rectangle((x - int(55 * scale), y, x + int(55 * scale), y + h // 2), fill="#8d5a3b", outline=INK, width=max(5, int(8 * scale)))


def school(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(430 * scale), int(275 * scale)
    top = y - h // 2
    draw.rectangle((x - w // 2, top, x + w // 2, y + h // 2), fill="#d9945d", outline=INK, width=max(6, int(10 * scale)))
    draw.polygon(
        [
            (x - w // 2 - int(24 * scale), top),
            (x, top - int(145 * scale)),
            (x + w // 2 + int(24 * scale), top),
        ],
        fill="#9d5340",
        outline=INK,
    )
    draw.rectangle((x - int(70 * scale), y - int(5 * scale), x + int(70 * scale), y + h // 2), fill="#557f91", outline=INK, width=max(5, int(8 * scale)))
    draw.ellipse((x + int(42 * scale), y + int(58 * scale), x + int(55 * scale), y + int(71 * scale)), fill="#f4bd43", outline=INK, width=max(2, int(3 * scale)))
    for wx in (-145, 145):
        draw.rectangle((x + int(wx * scale) - int(52 * scale), y - int(62 * scale), x + int(wx * scale) + int(52 * scale), y + int(25 * scale)), fill="#cfe6e8", outline=INK, width=max(4, int(7 * scale)))
        draw.line((x + int(wx * scale), y - int(60 * scale), x + int(wx * scale), y + int(23 * scale)), fill=INK, width=max(3, int(5 * scale)))
        draw.line((x + int((wx - 50) * scale), y - int(18 * scale), x + int((wx + 50) * scale), y - int(18 * scale)), fill=INK, width=max(3, int(5 * scale)))
    # Two pupils with visible backpacks identify the setting without forbidden venue text.
    for px in (x - int(120 * scale), x + int(120 * scale)):
        py = y + h // 2 + int(75 * scale)
        head = int(25 * scale)
        draw.ellipse((px - head, py - int(86 * scale), px + head, py - int(36 * scale)), fill="#b9704d", outline=INK, width=max(3, int(5 * scale)))
        draw.line((px, py - int(30 * scale), px, py + int(38 * scale)), fill=BLUE, width=max(6, int(12 * scale)))
        draw.line((px, py + int(34 * scale), px - int(28 * scale), py + int(75 * scale)), fill=INK, width=max(4, int(8 * scale)))
        draw.line((px, py + int(34 * scale), px + int(28 * scale), py + int(75 * scale)), fill=INK, width=max(4, int(8 * scale)))
        draw.line((px, py - int(10 * scale), px + int(35 * scale), py + int(12 * scale)), fill=INK, width=max(4, int(8 * scale)))
        draw.rounded_rectangle((px - int(43 * scale), py - int(35 * scale), px - int(5 * scale), py + int(25 * scale)), radius=max(4, int(8 * scale)), fill="#c77e36", outline=INK, width=max(3, int(5 * scale)))


def save(image: Image.Image, filename: str) -> None:
    if image.size != SIZE:
        raise ValueError(f"{filename}: wrong image size {image.size}")
    destination = ASSET_ROOT / filename
    image.save(destination, "WEBP", quality=92, method=6)
    with Image.open(destination) as written:
        if written.size != SIZE or written.format != "WEBP":
            raise ValueError(f"{filename}: wrote {written.format} at {written.size}, expected WEBP at {SIZE}")


def draw_count(draw: ImageDraw.ImageDraw, kind: str, count: int, color: str | None = None, y: int = 580) -> None:
    spacing = 190 if count <= 5 else 130
    start = 768 - spacing * (count - 1) / 2
    for i in range(count):
        food(draw, kind, int(start + i * spacing), y, 0.85, color)
    badge(draw, 190, 155, str(count), GOLD, 150)


def render_age(name: str, age: int, dialogue: bool = False) -> Image.Image:
    image = canvas("#d9a0bd")
    draw = ImageDraw.Draw(image)
    if dialogue:
        asker = "Luis" if name == "Ana" else "Ana"
        person(draw, 430, 875, asker, 0.82, "point-right", True)
        person(draw, 1070, 875, name, 0.82, "self", True)
        speech_marker(draw, 650, 190, TEAL, True)
        cake(draw, 1035, 265, age)
    else:
        person(draw, 600, 900, name, 1.03, "self", True)
        cake(draw, 1110, 430, age)
        speech_marker(draw, 1080, 170, TEAL, False)
    return image


def render_named(name: str, *, nationality: str | None = None, speaker: bool = False, self_point: bool = False, observer: str | None = None, you: bool = False) -> Image.Image:
    image = canvas("#d5a7c4")
    draw = ImageDraw.Draw(image)
    if observer:
        person(draw, 390, 895, observer, 0.78, "point-right", True)
        target_x = 1060
    else:
        target_x = 700 if nationality else 768
    person(draw, target_x, 900, name, 1.0, "self" if self_point else "neutral", True)
    if speaker:
        speech_marker(draw, target_x + 250, 170, TEAL, False)
    if nationality:
        flag(draw, 1160, 330, nationality, 1.05)
        # Canada's geometry is deliberately self-identifying; it must not rely
        # on a word label to rescue a broken or generic flag symbol.
        if nationality.lower() != "canada":
            badge(draw, 1160, 540, nationality.upper(), GOLD, 360)
    if you:
        draw.ellipse((target_x - 235, 115, target_x + 235, 930), outline=PURPLE, width=18)
        badge(draw, target_x, 115, "YOU", PURPLE, 220)
    return image


def render_country(country: str) -> Image.Image:
    image = canvas("#9ec7df")
    draw = ImageDraw.Draw(image)
    flag(draw, 500, 500, country, 1.45)
    # A distinct, map-like silhouette beside the flag.
    shapes = {
        "mexico": [(875, 360), (1140, 340), (1280, 460), (1220, 600), (1320, 710), (1170, 720), (1030, 590), (900, 560)],
        "canada": [(800, 410), (845, 340), (910, 355), (955, 295), (1015, 345), (1070, 290), (1130, 350), (1200, 315), (1265, 365), (1325, 350), (1300, 430), (1340, 480), (1295, 535), (1315, 605), (1240, 620), (1190, 690), (1125, 650), (1070, 710), (1010, 650), (945, 690), (905, 625), (835, 640), (790, 565), (830, 500)],
        "spain": [(890, 370), (1240, 390), (1290, 590), (1120, 700), (910, 650), (830, 500)],
        "united states": [(850, 390), (1270, 370), (1320, 560), (1190, 660), (970, 650), (820, 520)],
    }
    draw.polygon(shapes[country], fill="#5a86a1", outline=INK)
    if country == "canada":
        # Northern islands plus an inset maple leaf make the silhouette
        # recognizable without any textual country label.
        for island in [(875, 270, 930, 320), (980, 225, 1040, 280), (1110, 230, 1180, 292), (1220, 260, 1275, 318)]:
            draw.ellipse(island, fill="#5a86a1", outline=INK, width=5)
        draw_maple_leaf(draw, 1060, 505, 1.16, "#f8f2e7")
        # Great Lakes cut-outs add the familiar southeastern shoreline.
        draw.ellipse((1115, 580, 1175, 615), fill=CREAM)
        draw.ellipse((1170, 565, 1228, 602), fill=CREAM)
    else:
        badge(draw, 1060, 800, country.upper(), GOLD, 520)
    return image


def render_possession(subjects: list[str], item: str, pronoun: str, *, speaker: str | None = None) -> Image.Image:
    image = canvas("#d6b578")
    draw = ImageDraw.Draw(image)
    xs = [768] if len(subjects) == 1 else [590, 950]
    for index, (name, x) in enumerate(zip(subjects, xs)):
        person(draw, x, 900, name, 0.9, "hold", True)
        ix = x
        iy = 655
        if item == "book":
            book(draw, ix, iy, 0.72)
        elif item == "phone":
            phone(draw, ix, iy, 0.62)
        elif item == "bag":
            bag(draw, ix, iy, 0.62)
        elif item == "car":
            car(draw, 1120, 735, 0.75)
            draw.ellipse((x + 95, 590, x + 145, 640), fill=GOLD, outline=INK, width=7)
            draw.line((x + 138, 615, x + 200, 650), fill=INK, width=9)
        elif item == "bike":
            bike(draw, 1100, 700, 0.82)
    if speaker:
        speech_marker(draw, 250, 180, TEAL, False)
    badge(draw, 250, 370, pronoun.upper(), PURPLE, 260)
    return image


def render_pronoun(concept: str) -> Image.Image:
    lowered = concept.lower()
    if concept == "i-ana":
        return render_named("Ana", speaker=True, self_point=True)
    if concept == "it-book":
        image = canvas("#9ac4da")
        draw = ImageDraw.Draw(image)
        book(draw, 768, 520, 1.7)
        badge(draw, 768, 820, "IT", PURPLE, 240)
        return image
    if concept in {"her-name-sofia", "his-name-luis", "my-name-ana", "your-name-luis"}:
        if concept == "her-name-sofia":
            return render_named("Sofia", observer="Ana")
        if concept == "his-name-luis":
            return render_named("Luis", observer="Sofia")
        if concept == "my-name-ana":
            return render_named("Ana", speaker=True, self_point=True)
        return render_named("Luis", speaker=False, observer="Ana", you=True)
    if concept == "i-reading":
        image = render_named("Ana", speaker=True, self_point=True)
        draw = ImageDraw.Draw(image)
        book(draw, 768, 690, 0.75)
        badge(draw, 250, 350, "I", PURPLE, 160)
        return image
    if concept == "you-writing":
        image = render_named("Luis", observer="Ana", you=True)
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((890, 670, 1210, 760), radius=18, fill="#ffffff", outline=INK, width=8)
        draw.line((1040, 650, 1140, 710), fill=BLUE, width=15)
        return image
    if concept == "we-ana-luis":
        image = canvas("#b8abd7")
        draw = ImageDraw.Draw(image)
        person(draw, 590, 900, "Ana", 0.9, "self", True)
        person(draw, 950, 900, "Luis", 0.9, "neutral", True)
        draw.ellipse((350, 95, 1190, 930), outline=PURPLE, width=18)
        badge(draw, 768, 130, "WE", PURPLE, 210)
        speech_marker(draw, 330, 230, TEAL, False)
        return image
    if concept == "we-talking":
        image = render_pronoun("we-ana-luis")
        draw = ImageDraw.Draw(image)
        speech_marker(draw, 660, 300, TEAL, False)
        speech_marker(draw, 900, 300, BLUE, False)
        return image
    raise KeyError(concept)


def render_role(name: str, role: str) -> Image.Image:
    image = canvas("#9fc4a7")
    draw = ImageDraw.Draw(image)
    role = role.lower()
    if role == "teacher":
        draw.rounded_rectangle((140, 140, 1396, 690), radius=35, fill="#f4f3ed", outline=INK, width=10)
        draw.line((350, 360, 700, 360), fill=BLUE, width=14)
        draw.line((350, 470, 650, 470), fill=TEAL, width=14)
    elif role in {"doctor", "nurse"}:
        draw.rounded_rectangle((140, 170, 1396, 720), radius=35, fill="#e8f3f5", outline=INK, width=10)
        draw.line((1040, 320, 1160, 320), fill=RED, width=25)
        draw.line((1100, 260, 1100, 380), fill=RED, width=25)
        if role == "nurse":
            draw.rounded_rectangle((990, 480, 1220, 720), radius=20, fill="#ffffff", outline=INK, width=8)
            draw.line((1030, 535, 1180, 535), fill=BLUE, width=9)
    elif role == "cook":
        draw.rectangle((120, 530, 1416, 780), fill="#b37844", outline=INK, width=10)
        draw.ellipse((1000, 460, 1270, 620), fill="#d4d9db", outline=INK, width=8)
        draw.ellipse((1070, 495, 1120, 545), fill=RED)
        draw.ellipse((1150, 485, 1200, 535), fill=GREEN)
    elif role == "driver":
        draw.rounded_rectangle((120, 250, 1416, 830), radius=70, fill="#69a7c6", outline=INK, width=11)
        draw.rectangle((250, 330, 1280, 600), fill="#cfe9ed", outline=INK, width=9)
        draw.ellipse((960, 540, 1220, 800), outline=INK, width=20)
    elif role == "farmer":
        draw.rectangle((0, 620, 1536, 1024), fill="#78a94d")
        for x in range(100, 1500, 150):
            draw.line((x, 620, x - 80, 1024), fill="#5b7f37", width=13)
    person(draw, 620, 900, name, 1.0, "point-right" if role in {"teacher", "doctor", "nurse", "farmer"} else "neutral", True)
    badge(draw, 1120, 180, role.upper(), GOLD, 350)
    return image


def render_greeting(concept: str) -> Image.Image:
    image = canvas("#9ec5d5")
    draw = ImageDraw.Draw(image)
    if concept == "goodbye-luis":
        person(draw, 470, 900, "Ana", 0.86, "wave", True)
        person(draw, 1030, 900, "Luis", 0.86, "wave", True)
        arrow(draw, (970, 260), (1270, 260), RED)
    elif concept == "hello-ana":
        person(draw, 768, 900, "Ana", 1.05, "wave", True)
        centered_text(draw, (768, 140), "HELLO!", 96, TEAL)
    elif concept == "hello-luis":
        person(draw, 500, 900, "Ana", 0.86, "wave", True)
        person(draw, 1030, 900, "Luis", 0.9, "wave", True)
        centered_text(draw, (768, 130), "HELLO!", 88, TEAL)
    elif concept == "meet-ana":
        person(draw, 450, 900, "Luis", 0.86, "point-right", True)
        person(draw, 1050, 900, "Ana", 0.86, "self", True)
        speech_marker(draw, 665, 170, TEAL, True)
        badge(draw, 1050, 210, "ANA", GOLD, 240)
    elif concept == "morning-ana":
        draw.ellipse((110, 80, 330, 300), fill="#efbd41", outline=GOLD, width=9)
        person(draw, 620, 900, "Ana", 1.0, "wave", True)
        clock(draw, 1120, 430, 8, True, 0.75)
    return image


def render_dialogue(kind: str, target: str, value: str | None = None) -> Image.Image:
    image = canvas("#d7b5d2")
    draw = ImageDraw.Draw(image)
    asker = "Luis" if target == "Ana" else "Ana"
    person(draw, 410, 900, asker, 0.82, "point-right", True)
    person(draw, 1080, 900, target, 0.82, "self", True)
    speech_marker(draw, 600, 170, TEAL, True)
    speech_marker(draw, 920, 260, BLUE, False)
    if kind == "name":
        badge(draw, 1080, 500, target.upper(), GOLD, 260)
    elif kind == "job":
        badge(draw, 1080, 500, (value or "").upper(), GOLD, 300)
    elif kind == "origin":
        # Keep the nationality cue in clear space above the answerer; the old
        # placement covered Sofia's face.
        flag(draw, 1230, 260, value or "mexico", 0.72)
    return image


def render_journey(name: str, destination: str, daily: bool = False) -> Image.Image:
    image = canvas("#91c9b3")
    draw = ImageDraw.Draw(image)
    person(draw, 380, 900, name, 0.84, "neutral", True)
    if destination == "home":
        house(draw, 1100, 570, 0.9)
    elif destination == "school":
        school(draw, 1100, 570, 0.9)
        bag(draw, 510, 675, 0.48)
    else:
        draw.rounded_rectangle((890, 350, 1320, 760), radius=35, fill="#c8dfe5", outline=INK, width=10)
        centered_text(draw, (1105, 515), "⚙", 160, TEAL)
        bag(draw, 520, 685, 0.45)
    arrow(draw, (610, 660), (855, 610), TEAL)
    speech_marker(draw, 285, 170, TEAL, False)
    if daily:
        week_strip(draw, "MONDAY", 800, "●")
    return image


def render_sleep() -> Image.Image:
    image = canvas("#7987bd")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1536, 1024), fill="#263552")
    draw.ellipse((1240, 90, 1400, 250), fill="#f3e3a0")
    draw.rounded_rectangle((250, 570, 1286, 900), radius=55, fill="#d7dcef", outline=INK, width=11)
    draw.ellipse((520, 420, 720, 620), fill=PERSON["Ana"]["hair"], outline=INK, width=8)
    draw.ellipse((545, 445, 695, 595), fill=PERSON["Ana"]["skin"], outline=INK, width=7)
    draw.arc((575, 500, 615, 530), 200, 340, fill=INK, width=6)
    draw.arc((625, 500, 665, 530), 200, 340, fill=INK, width=6)
    badge(draw, 505, 305, "ANA", GOLD, 220)
    speech_marker(draw, 900, 330, TEAL, False)
    return image


def render_relation(concept: str) -> Image.Image:
    image = canvas("#a8c9d7")
    draw = ImageDraw.Draw(image)
    if concept in {"lamp-next-sofa", "one-lamp-sofa"}:
        draw.rounded_rectangle((470, 520, 1120, 800), radius=70, fill="#c9c4bd", outline=INK, width=11)
        draw.rectangle((560, 430, 1030, 625), fill="#d8d2ca", outline=INK, width=9)
        draw.line((270, 355, 270, 805), fill=INK, width=18)
        draw.polygon([(160, 350), (380, 350), (330, 225), (210, 225)], fill="#edc05f", outline=INK)
        if concept == "one-lamp-sofa":
            badge(draw, 270, 160, "1", GOLD, 140)
    elif concept == "one-computer-living":
        draw.rounded_rectangle((185, 520, 850, 815), radius=65, fill="#c9c4bd", outline=INK, width=11)
        draw.rectangle((900, 680, 1320, 740), fill="#9c6c42", outline=INK, width=8)
        draw.rounded_rectangle((985, 440, 1235, 665), radius=22, fill="#282e35", outline=INK, width=11)
        draw.polygon([(930, 675), (1285, 675), (1345, 735), (875, 735)], fill="#d7dcde", outline=INK)
        draw.line((960, 710, 1260, 710), fill="#6b757d", width=8)
        badge(draw, 1125, 220, "1", GOLD, 140)
    elif concept == "mission-book-table":
        table(draw, 640)
        book(draw, 768, 520, 0.95)
        draw.line((660, 625, 875, 625), fill="#ffffff", width=9)
    return image


def render_mission_bedroom() -> Image.Image:
    image = canvas("#b4c9d2")
    draw = ImageDraw.Draw(image)
    draw.rectangle((230, 240, 1306, 900), fill="#eee4d6", outline=INK, width=11)
    draw.rounded_rectangle((395, 550, 1140, 825), radius=55, fill="#d5d8e5", outline=INK, width=11)
    draw.rectangle((425, 440, 1110, 615), fill="#f8f5ed", outline=INK, width=9)
    badge(draw, 270, 180, "1", GOLD, 140)
    return image


def render_two_bags_under_table() -> Image.Image:
    image = canvas("#b1cad5")
    draw = ImageDraw.Draw(image)
    table(draw, 430)
    bag(draw, 590, 720, 0.72, "#f4f1e9")
    bag(draw, 945, 720, 0.72, "#f4f1e9")
    badge(draw, 210, 160, "2", GOLD, 140)
    return image


def render_home_cutaway() -> Image.Image:
    image = canvas("#9fc6d4")
    draw = ImageDraw.Draw(image)
    draw.polygon([(190, 270), (768, 70), (1346, 270)], fill="#a75745", outline=INK)
    draw.rectangle((190, 270, 1346, 920), fill="#f5ead7", outline=INK, width=12)
    draw.line((768, 270, 768, 920), fill=INK, width=12)
    draw.line((190, 595, 1346, 595), fill=INK, width=12)
    # Kitchen, bedroom, living, bathroom cues without room-label text.
    draw.rectangle((265, 370, 620, 490), fill="#b27a4d", outline=INK, width=8)
    draw.rectangle((900, 410, 1220, 540), fill="#d8d2ca", outline=INK, width=8)
    draw.rounded_rectangle((260, 730, 610, 850), radius=40, fill="#c9c4bd", outline=INK, width=8)
    draw.ellipse((970, 690, 1210, 880), fill="#edf4f4", outline=INK, width=8)
    return image


def render_daily(concept: str) -> Image.Image:
    image = canvas("#b9abd8")
    draw = ImageDraw.Draw(image)
    if concept == "i-wake-daily":
        person(draw, 350, 785, "Ana", 0.72, "self", True)
        draw.rounded_rectangle((600, 330, 1120, 620), radius=45, fill="#d7dcef", outline=INK, width=10)
        clock(draw, 1210, 390, 7, False, 0.55)
        icon = "WAKE"
    elif concept == "study-monday":
        person(draw, 420, 785, "Ana", 0.72, "hold", True)
        book(draw, 420, 560, 0.62)
        badge(draw, 1040, 340, "ABC", BLUE, 250)
        icon = "ABC"
    elif concept == "we-study-daily":
        person(draw, 330, 780, "Ana", 0.68, "hold", True)
        person(draw, 660, 780, "Luis", 0.68, "hold", True)
        book(draw, 330, 575, 0.48)
        book(draw, 660, 575, 0.48)
        badge(draw, 500, 210, "WE", PURPLE, 220)
        icon = "ABC"
    else:
        person(draw, 300, 780, "Ana", 0.66, "point-right", True)
        person(draw, 600, 780, "Luis", 0.66, "neutral", True)
        badge(draw, 600, 175, "YOU", PURPLE, 220)
        school(draw, 1110, 410, 0.48)
        arrow(draw, (745, 550), (875, 490), TEAL)
        icon = "SCHOOL"
    week_strip(
        draw,
        "MONDAY",
        800,
        icon,
        repeat_icon=concept != "study-monday",
        show_monday_word=False,
        highlight_active=concept == "study-monday",
    )
    return image


def render_work_daily() -> Image.Image:
    image = canvas("#9fc5b7")
    draw = ImageDraw.Draw(image)
    woman = person(draw, 360, 780, "Woman", 0.66, "point-right", False)
    man = person(draw, 680, 780, "Man", 0.66, "point-right", False)
    draw_briefcase(draw, woman["right_hand"][0] + 38, woman["right_hand"][1] + 105, 0.72)
    draw_briefcase(draw, man["right_hand"][0] + 38, man["right_hand"][1] + 105, 0.72)
    # A desk and monitor reinforce work independently of the repeated calendar.
    draw.rounded_rectangle((980, 365, 1295, 560), radius=22, fill="#d9e9eb", outline=INK, width=9)
    draw.rectangle((1118, 560, 1157, 625), fill=INK)
    draw.rounded_rectangle((1020, 620, 1325, 680), radius=16, fill="#a76c3f", outline=INK, width=8)
    week_strip(draw, "MONDAY", 800, "WORK", repeat_icon=True, highlight_active=False)
    return image


def render_clock(hour: int) -> Image.Image:
    image = canvas("#9ec5d5")
    draw = ImageDraw.Draw(image)
    clock(draw, 768, 430, hour, True, 1.3)
    return image


def render_day(day: str) -> Image.Image:
    image = canvas("#e1bd79")
    draw = ImageDraw.Draw(image)
    week_strip(draw, day, 470, show_monday_word=day.upper() == "MONDAY")
    return image


def render_preference(kind: str, item: str, subject: str = "Woman", count: int = 1, color: str | None = None) -> Image.Image:
    image = canvas("#d6abc0" if kind == "dislike" else "#a8cfb4")
    draw = ImageDraw.Draw(image)
    person(draw, 420, 900, subject, 0.86, "point-right", False)
    if count == 1:
        food(draw, item, 1030, 560, 1.35, color)
    else:
        spacing = 180
        start = 1030 - spacing * (count - 1) / 2
        for index in range(count):
            food(draw, item, int(start + index * spacing), 560, 0.78, color)
        badge(draw, 1030, 270, str(count), GOLD, 150)
    heart(draw, 1325, 180, kind == "like")
    return image


def render_need_want(subjects: list[str], item: str, mode: str, count: int = 1, color: str | None = None) -> Image.Image:
    image = canvas("#e1b071" if mode == "need" else "#9fcbae")
    draw = ImageDraw.Draw(image)
    xs = [410] if len(subjects) == 1 else [300, 580]
    reaching_hand = (610, 650)
    for name, x in zip(subjects, xs):
        marks = person(draw, x, 900, name, 0.75, "point-right", False)
        reaching_hand = marks["right_hand"]
    if count == 1:
        food(draw, item, 1080, 570, 1.25, color)
    else:
        spacing = 170
        start = 1080 - spacing * (count - 1) / 2
        for index in range(count):
            food(draw, item, int(start + index * spacing), 570, 0.72, color)
        badge(draw, 1080, 275, str(count), GOLD, 145)
    if mode == "need":
        draw.ellipse((1230, 90, 1420, 280), fill="#f3b944", outline=INK, width=9)
        centered_text(draw, (1325, 178), "!", 130, INK)
    else:
        # WANT is an intentional reach/request toward the object.  A heart is
        # reserved for LIKE and would collapse two different lesson meanings.
        request_end = (850, 585)
        arrow(draw, (reaching_hand[0] + 28, reaching_hand[1] - 8), request_end, TEAL)
        draw.arc((request_end[0] + 24, request_end[1] - 70, request_end[0] + 112, request_end[1] + 20), 115, 245, fill=TEAL, width=10)
    return image


def render_quantity_want(subject: str, count: int, color: str) -> Image.Image:
    """Render a visible person identity, exact count/color, and WANT gesture."""
    image = canvas("#9fcbae")
    draw = ImageDraw.Draw(image)
    marks = person(draw, 350, 900, subject, 0.82, "point-right", False)
    spacing = 185
    start = 1080 - spacing * (count - 1) / 2
    for index in range(count):
        apple(draw, int(start + index * spacing), 590, 0.82, color)
    badge(draw, 1080, 260, str(count), GOLD, 150)
    arrow(draw, (marks["right_hand"][0] + 30, marks["right_hand"][1] - 8), (790, 590), TEAL)
    # Short motion curves make the open reach legible even at option-tile size.
    draw.arc((680, 535, 770, 625), 115, 245, fill=TEAL, width=11)
    return image


def render_priced_drink(kind: str, dollars: int) -> Image.Image:
    """Render visually distinct drink contents/vessels with an exact price."""
    image = canvas("#9fc8d5")
    draw = ImageDraw.Draw(image)
    cx = 690
    if kind == "milk":
        # Opaque white milk bottle with a blue cap.
        draw.rounded_rectangle((515, 345, 865, 760), radius=70, fill="#f8f7ee", outline=INK, width=12)
        draw.rounded_rectangle((595, 245, 785, 390), radius=35, fill="#f8f7ee", outline=INK, width=12)
        draw.rounded_rectangle((580, 225, 800, 285), radius=18, fill=BLUE, outline=INK, width=9)
        draw.ellipse((625, 465, 755, 595), fill="#dcecf2", outline=BLUE, width=8)
        draw.ellipse((668, 495, 712, 560), fill="#ffffff", outline=BLUE, width=5)
    elif kind == "juice":
        # Transparent tumbler, orange contents, slice, and straw.
        draw.polygon([(535, 285), (845, 285), (805, 760), (575, 760)], fill="#edf7f8", outline=INK)
        draw.polygon([(558, 410), (822, 410), (795, 742), (585, 742)], fill="#efa634", outline="#c87322")
        draw.line((745, 400, 815, 180), fill=RED, width=18)
        orange(draw, 835, 330, 0.52)
        draw.line((835, 330, 835, 270), fill="#fff5d7", width=7)
        draw.line((775, 330, 895, 330), fill="#fff5d7", width=7)
    elif kind == "tea":
        # Clear handled cup with amber tea, steam, and a visible teabag/tag.
        draw.rounded_rectangle((510, 330, 875, 735), radius=38, fill="#edf7f8", outline=INK, width=12)
        draw.rectangle((530, 455, 855, 710), fill="#c77b32", outline="#8f5529", width=5)
        draw.ellipse((530, 430, 855, 490), fill="#d28b3c", outline=INK, width=7)
        draw.ellipse((825, 425, 1010, 660), outline=INK, width=17)
        draw.line((635, 355, 635, 565), fill="#6a4a2e", width=7)
        draw.rounded_rectangle((598, 540, 672, 625), radius=9, fill="#e7c16d", outline=INK, width=5)
        for offset in (0, 92):
            draw.arc((565 + offset, 170, 660 + offset, 345), 75, 245, fill="#73888b", width=10)
    else:
        raise ValueError(f"Unsupported priced drink: {kind}")
    badge(draw, 1190, 300, f"${dollars}", GOLD, 290)
    return image


def render_meal(item: str, meal: str, *, count: int = 1, subjects: list[str] | None = None) -> Image.Image:
    image = canvas("#e7c170" if meal == "breakfast" else ("#9fcdd1" if meal == "lunch" else "#7779a8"))
    draw = ImageDraw.Draw(image)
    if meal == "dinner":
        draw.rectangle((0, 0, 1536, 1024), fill="#283451")
        draw.ellipse((1280, 80, 1415, 215), fill="#f2e5aa")
        time = 7
    elif meal == "breakfast":
        draw.ellipse((100, 70, 285, 255), fill="#efbd41", outline=GOLD, width=8)
        time = 7
    else:
        draw.ellipse((100, 70, 285, 255), fill="#f1ca49", outline=GOLD, width=8)
        time = 1
    clock(draw, 1270, 240, time, True, 0.52)
    table(draw, 700)
    draw.ellipse((560, 535, 980, 745), fill="#edf1f1", outline=INK, width=9)
    spacing = 150
    start = 770 - spacing * (count - 1) / 2
    for index in range(count):
        food(draw, item, int(start + index * spacing), 625, 0.52)
    if subjects:
        xs = [390] if len(subjects) == 1 else [320, 1210]
        for name, x in zip(subjects, xs):
            person(draw, x, 690, name, 0.58, "point-right" if x < 768 else "point-left", False)
    badge(draw, 370, 170, meal.upper(), GOLD, 380)
    return image


def render_cafe(action: str, item: str = "water") -> Image.Image:
    image = canvas("#d7b47d")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 680, 1536, 1024), fill="#a56c43")
    person(draw, 380, 810, "Woman", 0.68, "point-right", False)
    person(draw, 1140, 810, "Man", 0.68, "point-left", False)
    food(draw, item, 765, 520, 0.9)
    if action in {"request", "order", "please"}:
        arrow(draw, (520, 470), (700, 500), TEAL)
        speech_marker(draw, 430, 170, TEAL, False)
    elif action in {"handoff", "here", "thank"}:
        arrow(draw, (970, 500), (825, 500), BLUE)
        if action == "thank":
            heart(draw, 440, 170, True)
    elif action in {"accept", "yes"}:
        arrow(draw, (970, 500), (820, 500), GREEN)
        draw_affirmative_check(draw, 500, 180, 0.9)
    elif action in {"decline", "no"}:
        heart(draw, 520, 180, False)
    return image


def render_full_cafe_dialogue() -> Image.Image:
    image = render_cafe("handoff", "water")
    draw = ImageDraw.Draw(image)
    for x, text, color in [(280, "HELLO", TEAL), (610, "PLEASE", BLUE), (925, "HERE", GOLD), (1250, "THANKS", GREEN)]:
        badge(draw, x, 150, text, color, 260)
    return image


def render_drink_menu() -> Image.Image:
    image = canvas("#9fc8d5")
    draw = ImageDraw.Draw(image)
    kinds = ["water", "juice", "milk", "coffee", "tea"]
    for index, kind in enumerate(kinds):
        x = 235 + index * 267
        food(draw, kind, x, 500, 0.72)
        badge(draw, x, 770, kind.upper(), TEAL, 220)
    return image


def render_food_collection(kind: str) -> Image.Image:
    image = canvas("#d7bd7d")
    draw = ImageDraw.Draw(image)
    if kind == "food":
        items = ["bread", "rice", "egg", "chicken", "fish"]
    elif kind == "fruit":
        items = ["apple", "banana", "orange", "grapes", "strawberry", "pear"]
    else:
        items = ["apple", "banana", "bread", "rice", "egg", "chicken", "fish", "water", "milk", "juice", "coffee", "tea"]
    columns = 6 if len(items) > 6 else len(items)
    rows = math.ceil(len(items) / columns)
    for index, item in enumerate(items):
        row, col = divmod(index, columns)
        x = int(180 + col * (1175 / max(1, columns - 1)))
        y = 370 + row * 360
        food(draw, item, x, y, 0.62)
    if kind == "fruit":
        draw.arc((120, 160, 1416, 900), 0, 180, fill="#9b663d", width=28)
        draw.arc((190, 220, 1346, 980), 0, 180, fill="#9b663d", width=22)
    return image


def render_price_question() -> Image.Image:
    image = canvas("#d9b5cb")
    draw = ImageDraw.Draw(image)
    apple(draw, 500, 525, 1.65)
    draw.polygon([(850, 270), (1280, 270), (1390, 520), (1280, 770), (850, 770), (760, 520)], fill="#f2c65e", outline=INK)
    draw.ellipse((850, 475, 900, 525), fill="#ffffff", outline=INK, width=7)
    centered_text(draw, (1090, 515), "?", 250, INK)
    return image


def render_like_need_retrieval() -> Image.Image:
    image = canvas("#b9cdb9")
    draw = ImageDraw.Draw(image)
    draw.line((768, 180, 768, 875), fill=INK, width=10)
    person(draw, 320, 850, "Woman", 0.68, "point-right", False)
    apple(draw, 585, 525, 0.8)
    heart(draw, 320, 170, True)
    person(draw, 970, 850, "Woman", 0.68, "point-right", False)
    food(draw, "water", 1250, 525, 0.8)
    draw.ellipse((1180, 120, 1340, 280), fill="#f1b941", outline=INK, width=8)
    centered_text(draw, (1260, 195), "!", 105, INK)
    return image


def render_some_rice() -> Image.Image:
    image = canvas("#c4d2c6")
    draw = ImageDraw.Draw(image)
    food(draw, "rice", 768, 530, 2.15)
    return image


def render_runner_needs_water() -> Image.Image:
    image = canvas("#ddb77c")
    draw = ImageDraw.Draw(image)
    # Running posture with empty bottle and immediate-need cue.
    draw.ellipse((360, 190, 510, 340), fill=PERSON["Man"]["skin"], outline=INK, width=8)
    draw.line((435, 340, 570, 550), fill=PERSON["Man"]["shirt"], width=76)
    draw.line((505, 420, 700, 340), fill=PERSON["Man"]["skin"], width=30)
    draw.line((510, 540, 350, 780), fill="#303c49", width=33)
    draw.line((535, 540, 760, 690), fill="#303c49", width=33)
    draw.rounded_rectangle((900, 360, 1060, 680), radius=28, fill="#ffffff", outline=INK, width=10)
    draw.line((930, 410, 1030, 410), fill=RED, width=12)
    arrow(draw, (780, 520), (890, 520), TEAL)
    draw.ellipse((1190, 100, 1390, 300), fill="#f1b941", outline=INK, width=9)
    centered_text(draw, (1290, 195), "!", 135, INK)
    return image


def render_consumption(subject: str, item: str, action: str) -> Image.Image:
    image = canvas("#a9cdb8")
    draw = ImageDraw.Draw(image)
    person(draw, 610, 900, subject, 0.95, "point-right", False)
    if action == "drink":
        food(draw, item, 885, 395, 0.62)
        arrow(draw, (835, 470), (720, 430), TEAL)
    else:
        food(draw, item, 890, 420, 0.72)
        arrow(draw, (835, 480), (720, 430), TEAL)
    return image


def render_request_receipt(item: str, steps: int) -> Image.Image:
    image = canvas("#d7b47d")
    draw = ImageDraw.Draw(image)
    positions = [310, 768, 1226] if steps == 3 else [470, 1066]
    for index, x in enumerate(positions, start=1):
        draw.ellipse((x - 55, 90, x + 55, 200), fill=GOLD, outline=INK, width=8)
        centered_text(draw, (x, 142), str(index), 62, INK)
        if index == 1:
            person(draw, x - 80, 875, "Woman", 0.56, "point-right", False)
            food(draw, item, x + 100, 520, 0.55)
            speech_marker(draw, x - 85, 285, TEAL, False)
        else:
            person(draw, x - 90, 875, "Woman", 0.52, "point-right", False)
            person(draw, x + 95, 875, "Man", 0.52, "point-left", False)
            food(draw, item, x, 530, 0.48)
            arrow(draw, (x + 70, 500), (x - 45, 500), BLUE)
            if index == steps:
                heart(draw, x - 95, 270, True)
    return image


def render_food_need() -> Image.Image:
    image = canvas("#ddb578")
    draw = ImageDraw.Draw(image)
    person(draw, 330, 710, "Woman", 0.62, "point-right", False)
    person(draw, 1200, 710, "Man", 0.62, "point-left", False)
    table(draw, 690)
    draw.arc((580, 480, 956, 820), 0, 180, fill="#8d633b", width=24)
    food(draw, "bread", 650, 620, 0.5)
    food(draw, "egg", 790, 620, 0.48)
    apple(draw, 915, 620, 0.48)
    draw.ellipse((680, 110, 860, 290), fill="#f1b941", outline=INK, width=9)
    centered_text(draw, (770, 195), "!", 125, INK)
    return image


def render_simple_count(kind: str, count: int, color: str | None = None) -> Image.Image:
    image = canvas("#dab0bd")
    draw = ImageDraw.Draw(image)
    draw_count(draw, kind, count, color)
    return image


def build(only_filenames: set[str] | None = None) -> list[str]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_concept = {asset["concept"]: asset for asset in manifest["assets"]}
    rendered: dict[str, Image.Image] = {}

    # Unit 3: identity, personal-information, possession, and profession contracts.
    rendered.update({
        "age-ana-20": render_age("Ana", 20),
        "age-luis-18": render_age("Luis", 18),
        "age-question-ana": render_age("Ana", 20, True),
        "age-question-luis": render_age("Luis", 18, True),
        "ana-badge": render_named("Ana", speaker=False, self_point=True),
        "luis-badge": render_named("Luis", speaker=False, self_point=True),
        "ana-mexican": render_named("Ana", nationality="mexico", speaker=True),
        "luis-american": render_named("Luis", nationality="united states", speaker=True),
        "diego-spanish": render_named("Diego", nationality="spain", speaker=True),
        "sofia-canadian": render_named("Sofia", nationality="canada", speaker=True),
        "canada-country": render_country("canada"),
        "mexico-country": render_country("mexico"),
        "spain-country": render_country("spain"),
        "us-country": render_country("united states"),
        "car-luis": render_possession(["Luis"], "car", "HIS"),
        "he-has-car": render_possession(["Luis"], "car", "HE"),
        "her-car-sofia": render_possession(["Sofia"], "car", "HER"),
        "his-bag-luis": render_possession(["Luis"], "bag", "HIS"),
        "she-has-bike": render_possession(["Sofia"], "bike", "SHE"),
        "they-have-bags": render_possession(["Ana", "Luis"], "bag", "THEY"),
        "we-have-books": render_possession(["Ana", "Luis"], "book", "WE", speaker="Ana"),
        "you-have-phone": render_possession(["Luis"], "phone", "YOU", speaker="Ana"),
        "i-have-book": render_possession(["Ana"], "book", "I", speaker="Ana"),
        "my-book-ana": render_possession(["Ana"], "book", "MY", speaker="Ana"),
        "your-phone-luis": render_possession(["Luis"], "phone", "YOUR", speaker="Ana"),
        "i-ana": render_pronoun("i-ana"),
        "i-reading": render_pronoun("i-reading"),
        "it-book": render_pronoun("it-book"),
        "her-name-sofia": render_pronoun("her-name-sofia"),
        "his-name-luis": render_pronoun("his-name-luis"),
        "my-name-ana": render_pronoun("my-name-ana"),
        "your-name-luis": render_pronoun("your-name-luis"),
        "you-luis": render_named("Luis", observer="Ana", you=True),
        "you-writing": render_pronoun("you-writing"),
        "we-ana-luis": render_pronoun("we-ana-luis"),
        "we-talking": render_pronoun("we-talking"),
        "cook-sofia": render_role("Sofia", "cook"),
        "doctor-diego": render_role("Diego", "doctor"),
        "driver-luis": render_role("Luis", "driver"),
        "farmer-ana": render_role("Ana", "farmer"),
        "nurse-sofia": render_role("Sofia", "nurse"),
        "teacher-ana": render_role("Ana", "teacher"),
        "goodbye-luis": render_greeting("goodbye-luis"),
        "hello-ana": render_greeting("hello-ana"),
        "hello-luis": render_greeting("hello-luis"),
        "meet-ana": render_greeting("meet-ana"),
        "morning-ana": render_greeting("morning-ana"),
        "name-dialogue-ana": render_dialogue("name", "Ana"),
        "name-dialogue-luis": render_dialogue("name", "Luis"),
        "job-dialogue-driver": render_dialogue("job", "Luis", "driver"),
        "job-dialogue-teacher": render_dialogue("job", "Ana", "teacher"),
        "origin-sofia": render_dialogue("origin", "Sofia", "canada"),
    })

    # Unit 4: actions, schedule/day meaning, and spatial/room integration.
    rendered.update({
        "ana-come-home": render_journey("Ana", "home"),
        "ana-go-school": render_journey("Ana", "school"),
        "ana-sleep": render_sleep(),
        "sleep-night": render_sleep(),
        "clock3": render_clock(3),
        "clock7": render_clock(7),
        "clock9": render_clock(9),
        "day-mon": render_day("MONDAY"),
        "day-tue": render_day("TUESDAY"),
        "day-wed": render_day("WEDNESDAY"),
        "day-thu": render_day("THURSDAY"),
        "day-fri": render_day("FRIDAY"),
        "day-sat": render_day("SATURDAY"),
        "day-sun": render_day("SUNDAY"),
        "home-cutaway": render_home_cutaway(),
        "i-wake-daily": render_daily("i-wake-daily"),
        "study-monday": render_daily("study-monday"),
        "they-work-daily": render_work_daily(),
        "we-study-daily": render_daily("we-study-daily"),
        "you-go-school-daily": render_daily("you-go-school-daily"),
        "lamp-next-sofa": render_relation("lamp-next-sofa"),
        "one-lamp-sofa": render_relation("one-lamp-sofa"),
        "one-computer-living": render_relation("one-computer-living"),
        "mission-bedroom": render_mission_bedroom(),
        "mission-book-table": render_relation("mission-book-table"),
        "two-bags-table": render_two_bags_under_table(),
        "luis-go-work": render_journey("Luis", "work"),
        "mission-home": render_journey("Ana", "home"),
        "mission-school": render_journey("Ana", "school"),
    })
    work_image = render_role("Luis", "driver")
    rendered["luis-work"] = work_image

    # Full meal scenes replace object-only substitutes.
    rendered.update({
        "Breakfast": render_meal("egg", "breakfast", count=2, subjects=["Woman"]),
        "Dinner": render_meal("rice", "dinner", subjects=["Woman", "Man"]),
        "Lunch": render_meal("rice", "lunch", subjects=["Woman", "Man"]),
        "breakfast-morning": render_meal("egg", "breakfast", subjects=["Ana"]),
        "chicken for lunch": render_meal("chicken", "lunch", subjects=["Woman", "Man"]),
        "coffee for breakfast": render_meal("coffee", "breakfast", subjects=["Woman"]),
        "eggs for breakfast": render_meal("egg", "breakfast", count=2, subjects=["Woman"]),
        "eggs for dinner": render_meal("egg", "dinner", count=2, subjects=["Woman"]),
        "I drink tea for breakfast.": render_meal("tea", "breakfast", subjects=["Woman"]),
        "I eat eggs for breakfast.": render_meal("egg", "breakfast", count=2, subjects=["Woman"]),
        "juice for dinner": render_meal("juice", "dinner", subjects=["Woman"]),
        "rice for dinner": render_meal("rice", "dinner", subjects=["Woman", "Man"]),
        "rice for lunch": render_meal("rice", "lunch", subjects=["Woman", "Man"]),
        "tea for breakfast": render_meal("tea", "breakfast", subjects=["Woman"]),
        "tea for dinner": render_meal("tea", "dinner", subjects=["Woman"]),
        "tea for lunch": render_meal("tea", "lunch", subjects=["Woman"]),
        "We eat rice for lunch.": render_meal("rice", "lunch", subjects=["Woman", "Man"]),
    })

    # Unit 5 quantity errors that remained object-only.
    rendered.update({
        "apples": render_simple_count("apple", 3),
        "are": render_simple_count("orange", 3),
        "eggs": render_simple_count("egg", 3),
        "Food": render_food_collection("food"),
        "Food and drinks": render_food_collection("food-and-drinks"),
        "Fruit": render_food_collection("fruit"),
        "How much is it?": render_price_question(),
        "much": render_price_question(),
        "I like it. I need it.": render_like_need_retrieval(),
        "Some": render_some_rice(),
        "need": render_runner_needs_water(),
        "not": render_preference("dislike", "milk"),
        "juice $8": render_priced_drink("juice", 8),
        "milk $4": render_priced_drink("milk", 4),
        "tea $8": render_priced_drink("tea", 8),
        "man wants two red apples": render_quantity_want("Man", 2, RED),
        "woman wants three red apples": render_quantity_want("Woman", 3, RED),
        "woman wants two green apples": render_quantity_want("Woman", 2, GREEN),
        "woman wants two red apples": render_quantity_want("Woman", 2, RED),
    })

    # Unit 5 polarity, need/want, order, and café exchange contracts.
    for concept, item in {
        "I do not like apples.": "apple",
        "I do not like fish.": "fish",
        "I do not like milk.": "milk",
        "does not like apples": "apple",
        "does not like bananas": "banana",
        "does not like bread": "bread",
        "does not like fish": "fish",
        "does not like rice": "rice",
        "do not like": "fish",
    }.items():
        rendered[concept] = render_preference("dislike", item)
    for concept, item in {
        "I like apples.": "apple",
        "I like bananas.": "banana",
        "I like eggs.": "egg",
        "I like juice.": "juice",
        "I like rice.": "rice",
        "likes apples": "apple",
        "likes bananas": "banana",
        "likes fish": "fish",
        "likes juice": "juice",
        "likes milk": "milk",
        "likes rice": "rice",
        "like": "apple",
    }.items():
        rendered[concept] = render_preference("like", item)

    rendered.update({
        "He wants an apple.": render_need_want(["Man"], "apple", "want"),
        "He wants bread.": render_need_want(["Man"], "bread", "want"),
        "boy wants apple": render_need_want(["Boy"], "apple", "want"),
        "boy wants chicken": render_need_want(["Boy"], "chicken", "want"),
        "girl wants apple": render_need_want(["Ana"], "apple", "want"),
        "I need water.": render_need_want(["Woman"], "water", "need"),
        "I want juice.": render_need_want(["Woman"], "juice", "want"),
        "man needs water": render_need_want(["Man"], "water", "need"),
        "needs water": render_need_want(["Woman"], "water", "need"),
        "need rice": render_need_want(["Woman"], "rice", "need"),
        "pair needs water": render_need_want(["Woman", "Man"], "water", "need"),
        "pair wants chicken": render_need_want(["Woman", "Man"], "chicken", "want"),
        "pair wants fish": render_need_want(["Woman", "Man"], "fish", "want"),
        "She needs milk.": render_need_want(["Woman"], "milk", "need"),
        "They want chicken.": render_need_want(["Woman", "Man"], "chicken", "want"),
        "want": render_need_want(["Woman"], "juice", "want"),
        "want chicken": render_need_want(["Woman", "Man"], "chicken", "want"),
        "wants": render_need_want(["Boy"], "apple", "want"),
        "wants apple": render_need_want(["Boy"], "apple", "want"),
        "wants juice": render_need_want(["Woman"], "juice", "want"),
        "wants water": render_need_want(["Woman"], "water", "want"),
        "woman needs milk": render_need_want(["Woman"], "milk", "need"),
        "We need food.": render_food_need(),
    })

    rendered.update({
        "boy eating bread": render_consumption("Boy", "bread", "eat"),
        "boy eating rice": render_consumption("Boy", "rice", "eat"),
        "woman drinking juice": render_consumption("Woman", "juice", "drink"),
        "woman drinking milk": render_consumption("Woman", "milk", "drink"),
        "woman drinking water": render_consumption("Woman", "water", "drink"),
        "woman eating apple": render_consumption("Woman", "apple", "eat"),
    })

    for concept, action, item in [
        ("Coffee, please.", "please", "coffee"),
        ("Juice, please.", "please", "juice"),
        ("Tea, please.", "please", "tea"),
        ("Water, please.", "please", "water"),
        ("Here you are.", "here", "juice"),
        ("Thank you.", "thank", "juice"),
        ("Yes, please.", "yes", "water"),
        ("No, thank you.", "no", "coffee"),
        ("accepts", "accept", "tea"),
        ("accepts tea", "accept", "tea"),
        ("declines", "decline", "tea"),
        ("declines tea", "decline", "tea"),
        ("handoff", "handoff", "water"),
        ("learner requests drink", "request", "water"),
        ("orders coffee", "order", "coffee"),
        ("orders juice", "order", "juice"),
        ("orders milk", "order", "milk"),
        ("orders tea", "order", "tea"),
        ("orders water", "order", "water"),
        ("please", "please", "water"),
        ("request", "request", "water"),
        ("server hands drink", "handoff", "water"),
    ]:
        rendered[concept] = render_cafe(action, item)
    rendered["Hello. Water, please. Here you are. Thank you."] = render_full_cafe_dialogue()
    rendered["Water, please. Thank you."] = render_request_receipt("water", 2)
    rendered["Juice, please. Thank you."] = render_request_receipt("juice", 3)
    rendered["Water. Juice. Milk. Coffee. Tea."] = render_drink_menu()

    changed: list[str] = []
    missing: list[str] = []
    for concept, image in rendered.items():
        asset = by_concept.get(concept)
        if asset is None:
            missing.append(concept)
            continue
        if only_filenames is not None and asset["filename"] not in only_filenames:
            continue
        save(image, asset["filename"])
        changed.append(asset["filename"])
    if missing:
        raise KeyError(f"Manifest concepts not found: {missing}")
    changed = sorted(set(changed))
    if only_filenames is not None:
        unbuilt = sorted(only_filenames.difference(changed))
        if unbuilt:
            raise KeyError(f"Requested repair filenames were not generated: {unbuilt}")
    return changed


def render_targeted_contact_sheet(filenames: list[str], destination: Path) -> Path:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    concept_by_filename: dict[str, str] = {}
    for asset in manifest["assets"]:
        concept_by_filename.setdefault(asset["filename"], asset["concept"])
    columns = 4
    tile_w, tile_h = 384, 315
    rows = math.ceil(len(filenames) / columns)
    sheet = Image.new("RGB", (columns * tile_w, rows * tile_h), "#f3eee5")
    draw = ImageDraw.Draw(sheet)
    for index, filename in enumerate(filenames):
        with Image.open(ASSET_ROOT / filename) as source:
            thumb = ImageOps.fit(source.convert("RGB"), (360, 240), Image.Resampling.LANCZOS)
        x = index % columns * tile_w + 12
        y = index // columns * tile_h + 8
        sheet.paste(thumb, (x, y))
        draw.text((x, y + 245), concept_by_filename.get(filename, filename)[:47], fill="#202020", font=font(17, False))
        draw.text((x, y + 272), filename[:52], fill="#5c5148", font=font(13, False))
    if not destination.is_absolute():
        destination = ROOT / destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, "JPEG", quality=94)
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description="Build reviewed deterministic semantic repairs for Units 3-5.")
    parser.add_argument("--list", action="store_true", help="Print filenames after generation.")
    parser.add_argument(
        "--reported-concerns",
        action="store_true",
        help="Regenerate only the exact filenames confirmed by the final Units 3-5 pixel audit.",
    )
    parser.add_argument(
        "--targeted-contact-sheet",
        type=Path,
        help="Optionally write a labeled contact sheet containing exactly the regenerated files.",
    )
    args = parser.parse_args()
    only_filenames = REPORTED_CONCERN_FILENAMES if args.reported_concerns else None
    changed = build(only_filenames)
    print(f"Generated {len(changed)} exact 1536x1024 WebP repairs.")
    if args.targeted_contact_sheet:
        destination = render_targeted_contact_sheet(changed, args.targeted_contact_sheet)
        print(f"Targeted contact sheet: {destination}")
    if args.list:
        for filename in changed:
            print(filename)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
