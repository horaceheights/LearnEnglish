from __future__ import annotations

"""Build deterministic, literal repairs for the reviewed Unit 7 media failures.

This module is intentionally separate from the generic media compositor.  Every
entry below was selected after a visual review found that keyword-based source
selection had dropped a relationship, state, color, count, or scene context.
The output is always a complete 1536x1024 WebP teaching scene.
"""

import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"
SIZE = (1536, 1024)

INK = "#233943"
TEAL = "#2f8f83"
BLUE = "#3974b8"
GREEN = "#3f8b5b"
RED = "#c83a36"
YELLOW = "#efbf3d"
SKIN = "#b86f4c"
HAIR = "#29201d"
WARM = "#f8f2e8"
PANEL = "#fffaf1"


TARGETS = {
    "a-boy-a-book-a-park": "a1_scene_a-boy-a-book-a-park_b812e12.webp",
    "a-jacket": "a1_scene_a-jacket_0fcbf0b.webp",
    "a-shirt": "a1_scene_a-shirt_7a7157d.webp",
    "invite-listen-music": "a1_scene_do-you-want-to-listen-to-music_e280002.webp",
    "invite-read": "a1_scene_do-you-want-to-read_2214c2e.webp",
    "invite-tv": "a1_scene_do-you-want-to-watch-tv_b863d46.webp",
    "food-bank-sunny": "a1_scene_food-the-bank-it-is-sunny_6a1f116.webp",
    "her-name-ana": "a1_scene_her-name-is-ana_b0f00a0.webp",
    "my-name-ana-mexico": "a1_scene_my-name-is-ana-i-am-from-mexico_0ddbe00.webp",
    "tired-needs-help": "a1_scene_i-am-tired-i-need-help_788b204.webp",
    "confused-slowly": "a1_scene_i-do-not-understand-please-speak-slowly_b5d07ee.webp",
    "likes-apples-water": "a1_scene_i-like-apples-water-please_0c2bcf0.webp",
    "in-the-morning": "a1_scene_in-the-morning_9ab0437.webp",
    "am-yawns": "a1_scene_am_96e8155.webp",
    "asks-bank": "a1_scene_asks-bank_0295ac7.webp",
    "asks-bathroom": "a1_scene_asks-bathroom_03032c0.webp",
    "asks-hospital": "a1_scene_asks-hospital_fd7a80d.webp",
    "asks-station": "a1_scene_asks-station_745494e.webp",
    "asks-slowly": "a1_scene_asks-to-slow-down_dafb5f0.webp",
    "eggs-breakfast": "a1_scene_eggs-breakfast_90d8f97.webp",
    "eggs-dinner": "a1_scene_eggs-dinner_923e23b.webp",
    "invites-playing": "a1_scene_invites-playing_6417df5.webp",
    "invites-reading": "a1_scene_invites-reading_89bcb16.webp",
    "invites-swimming": "a1_scene_invites-swimming_6b99e37.webp",
    "needs-help": "a1_scene_needs-help_bd54960.webp",
    "playing": "a1_scene_playing_5863973.webp",
    "rain-boots": "a1_scene_rain-boots_c3ee514.webp",
    "rain-hat": "a1_scene_rain-hat_6acb335.webp",
    "rain-umbrella": "a1_scene_rain-umbrella_60133ed.webp",
    "read": "a1_scene_read_a7afddb.webp",
    "understand": "a1_scene_understand_8e73840.webp",
    "wakes-morning": "a1_scene_wakes-in-morning_3e2ca34.webp",
    "sleeps-night": "a1_scene_sleeps-at-night_62c7b85.webp",
    "where-bathroom": "a1_scene_where-is-the-bathroom_d2f8f81.webp",
    "woman-hungry": "a1_scene_woman-hungry_bc03241.webp",
    "woman-thirsty": "a1_scene_woman-thirsty_caae35f.webp",
    "woman-tired": "a1_scene_woman-tired_82a4165.webp",
    "woman-reading": "a1_scene_woman-reading_6702805.webp",
    "woman-writing": "a1_scene_woman-writing_ffec6b1.webp",
    "black-shoes": "a1_scene_the-shoes-are-black_69f56f0.webp",
    "my-feet": "a1_scene_my-feet_6eae67d.webp",
    "feet": "a1_scene_feet_67c0fcc.webp",
    "feet-highlighted": "a1_scene_feet-highlighted_fed314f.webp",
    "hot": "a1_scene_hot_4bd8edd.webp",
    "it-is-hot": "a1_scene_it-is-hot_14659ab.webp",
    "hot-cloudy": "a1_scene_hot-and-cloudy_801561e.webp",
    "hot-rainy": "a1_scene_hot-and-rainy_5f74e06.webp",
    "hot-sunny": "a1_scene_hot-and-sunny_c88d51f.webp",
    "hot-jacket": "a1_scene_hot-jacket_586235b.webp",
    "hot-shirt": "a1_scene_hot-shirt_78da229.webp",
    "cold-sunny": "a1_scene_cold-and-sunny_e290276.webp",
    "cold-chooses-jacket": "a1_scene_cold-chooses-jacket_33da5e7.webp",
    "cold-chooses-shirt": "a1_scene_cold-chooses-shirt_2d8dfbc.webp",
    "rainy-chooses-hat": "a1_scene_rainy-chooses-hat_8a5b28d.webp",
    "rainy-chooses-umbrella": "a1_scene_rainy-chooses-umbrella_fd31bb6.webp",
    "cold-needs-jacket": "a1_scene_it-is-cold-i-need-a-jacket_181fae6.webp",
    "three-green-apples": "a1_scene_three-green-apples_bbdca60.webp",
    "socks": "a1_scene_socks_c9da8a6.webp",
    "meet-ana": "a1_scene_meet-ana_b81da74.webp",
    "who-parents": "a1_scene_who-are-they-they-are-the-parents_b4973e6.webp",
}


def font(size: int) -> ImageFont.ImageFont:
    for path in (Path("C:/Windows/Fonts/segoeuib.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")):
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def canvas(accent: str = "#efd9b2") -> Image.Image:
    image = Image.new("RGB", SIZE, WARM)
    glow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.ellipse((-260, -430, 920, 710), fill=accent + "4b")
    draw.ellipse((790, 380, 1770, 1370), fill="#75b7a33d")
    glow = glow.filter(ImageFilter.GaussianBlur(85))
    image.paste(glow, (0, 0), glow)
    return image


def mask(size: tuple[int, int], radius: int = 55) -> Image.Image:
    result = Image.new("L", size, 0)
    ImageDraw.Draw(result).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return result


def source_panel(filename: str, size: tuple[int, int], *, contain: bool = False) -> Image.Image:
    path = ASSET_ROOT / filename
    if not path.is_file():
        raise FileNotFoundError(f"Required Unit 7 repair source is missing: {path}")
    with Image.open(path) as opened:
        source = opened.convert("RGB")
        if contain:
            fitted = ImageOps.contain(source, size, Image.Resampling.LANCZOS)
            result = Image.new("RGB", size, "#eee9df")
            result.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
        else:
            result = ImageOps.fit(source, size, Image.Resampling.LANCZOS)
    result.putalpha(mask(size))
    return result


def panel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str = PANEL) -> None:
    draw.rounded_rectangle(box, radius=55, fill=fill, outline="#d8c9af", width=6)


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str = TEAL, width: int = 24) -> None:
    draw.line((start, end), fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    for offset in (2.55, -2.55):
        point = (int(end[0] + 52 * math.cos(angle + offset)), int(end[1] + 52 * math.sin(angle + offset)))
        draw.line((end, point), fill=color, width=width)


def question(draw: ImageDraw.ImageDraw, x: int, y: int, size: int = 108) -> None:
    draw.ellipse((x - 12, y - 12, x + size + 12, y + size + 12), fill="#fff7dd", outline=YELLOW, width=8)
    draw.text((x + 23, y - 10), "?", font=font(size), fill=INK)


def check(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    radius = int(62 * scale)
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#e8f7ed", outline=GREEN, width=max(5, int(9 * scale)))
    draw.line((x - int(30 * scale), y, x - int(5 * scale), y + int(27 * scale)), fill=GREEN, width=max(7, int(14 * scale)))
    draw.line((x - int(5 * scale), y + int(27 * scale), x + int(38 * scale), y - int(31 * scale)), fill=GREEN, width=max(7, int(14 * scale)))


def ana_badge(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    """Small continuity badge; identity is the only contract that permits this text."""

    width = int(165 * scale)
    height = int(78 * scale)
    draw.rounded_rectangle(
        (x - width // 2, y - height // 2, x + width // 2, y + height // 2),
        radius=max(12, int(18 * scale)),
        fill="#fffdf7",
        outline=INK,
        width=max(3, int(6 * scale)),
    )
    label_font = font(max(18, int(43 * scale)))
    bounds = draw.textbbox((0, 0), "ANA", font=label_font)
    draw.text((x - (bounds[2] - bounds[0]) // 2, y - (bounds[3] - bounds[1]) // 2 - bounds[1]), "ANA", font=label_font, fill=INK)


def draw_person(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    scale: float = 1.0,
    *,
    shirt: str = TEAL,
    mood: str = "neutral",
    hair: str = HAIR,
    pants: str = "#334653",
    arms: str = "down",
    eyes_closed: bool = False,
) -> None:
    s = scale
    head_r = int(76 * s)
    head_y = int(y - 320 * s)
    body_top = int(y - 235 * s)
    body_bottom = int(y + 45 * s)
    leg_bottom = int(y + 330 * s)
    # Legs and shoes.
    draw.rounded_rectangle((x - int(82*s), body_bottom - 6, x - int(10*s), leg_bottom), radius=int(28*s), fill=pants, outline=INK, width=max(3, int(6*s)))
    draw.rounded_rectangle((x + int(10*s), body_bottom - 6, x + int(82*s), leg_bottom), radius=int(28*s), fill=pants, outline=INK, width=max(3, int(6*s)))
    draw.ellipse((x - int(105*s), leg_bottom - int(18*s), x - int(5*s), leg_bottom + int(35*s)), fill="#f4f0e6", outline=INK, width=max(3, int(6*s)))
    draw.ellipse((x + int(5*s), leg_bottom - int(18*s), x + int(105*s), leg_bottom + int(35*s)), fill="#f4f0e6", outline=INK, width=max(3, int(6*s)))
    # Torso.
    draw.rounded_rectangle((x - int(142*s), body_top, x + int(142*s), body_bottom + int(30*s)), radius=int(55*s), fill=shirt, outline=INK, width=max(3, int(7*s)))
    # Arms/gestures.
    if arms == "offer-left":
        draw.line((x - int(120*s), body_top + int(65*s), x - int(290*s), body_top + int(15*s)), fill=SKIN, width=max(10, int(38*s)))
        draw.ellipse((x - int(320*s), body_top - int(12*s), x - int(270*s), body_top + int(38*s)), fill=SKIN, outline=INK, width=max(2, int(4*s)))
        draw.line((x + int(115*s), body_top + int(60*s), x + int(135*s), body_bottom - int(20*s)), fill=SKIN, width=max(10, int(38*s)))
    elif arms == "offer-right":
        draw.line((x + int(120*s), body_top + int(65*s), x + int(290*s), body_top + int(15*s)), fill=SKIN, width=max(10, int(38*s)))
        draw.ellipse((x + int(270*s), body_top - int(12*s), x + int(320*s), body_top + int(38*s)), fill=SKIN, outline=INK, width=max(2, int(4*s)))
        draw.line((x - int(115*s), body_top + int(60*s), x - int(135*s), body_bottom - int(20*s)), fill=SKIN, width=max(10, int(38*s)))
    elif arms == "raised":
        draw.line((x - int(115*s), body_top + int(80*s), x - int(220*s), body_top - int(110*s)), fill=SKIN, width=max(10, int(38*s)))
        draw.line((x + int(115*s), body_top + int(80*s), x + int(220*s), body_top - int(110*s)), fill=SKIN, width=max(10, int(38*s)))
        draw.ellipse((x - int(245*s), body_top - int(145*s), x - int(195*s), body_top - int(95*s)), fill=SKIN, outline=INK, width=max(2, int(4*s)))
        draw.ellipse((x + int(195*s), body_top - int(145*s), x + int(245*s), body_top - int(95*s)), fill=SKIN, outline=INK, width=max(2, int(4*s)))
    elif arms == "stomach":
        draw.arc((x - int(170*s), body_top + int(60*s), x + int(10*s), body_bottom), 10, 155, fill=SKIN, width=max(10, int(38*s)))
        draw.arc((x - int(10*s), body_top + int(60*s), x + int(170*s), body_bottom), 25, 170, fill=SKIN, width=max(10, int(38*s)))
    elif arms == "yawn":
        draw.line((x - int(112*s), body_top + int(80*s), x - int(132*s), body_bottom - int(15*s)), fill=SKIN, width=max(10, int(38*s)))
        draw.line((x + int(110*s), body_top + int(55*s), x + int(40*s), head_y + int(35*s)), fill=SKIN, width=max(10, int(38*s)))
        draw.ellipse((x + int(10*s), head_y + int(8*s), x + int(65*s), head_y + int(63*s)), fill=SKIN, outline=INK, width=max(2, int(4*s)))
    else:
        draw.line((x - int(115*s), body_top + int(75*s), x - int(135*s), body_bottom - int(15*s)), fill=SKIN, width=max(10, int(38*s)))
        draw.line((x + int(115*s), body_top + int(75*s), x + int(135*s), body_bottom - int(15*s)), fill=SKIN, width=max(10, int(38*s)))
    # Hair behind face, then face.
    draw.ellipse((x - head_r - int(18*s), head_y - head_r - int(20*s), x + head_r + int(18*s), head_y + head_r + int(45*s)), fill=hair, outline=INK, width=max(3, int(6*s)))
    draw.ellipse((x - head_r, head_y - head_r, x + head_r, head_y + head_r), fill=SKIN, outline=INK, width=max(3, int(6*s)))
    eye_y = head_y - int(13*s)
    if eyes_closed or mood == "tired":
        draw.arc((x - int(49*s), eye_y - int(8*s), x - int(9*s), eye_y + int(18*s)), 5, 175, fill=INK, width=max(2, int(5*s)))
        draw.arc((x + int(9*s), eye_y - int(8*s), x + int(49*s), eye_y + int(18*s)), 5, 175, fill=INK, width=max(2, int(5*s)))
    else:
        draw.ellipse((x - int(40*s), eye_y, x - int(20*s), eye_y + int(20*s)), fill=INK)
        draw.ellipse((x + int(20*s), eye_y, x + int(40*s), eye_y + int(20*s)), fill=INK)
    if mood == "happy":
        draw.arc((x - int(42*s), head_y + int(15*s), x + int(42*s), head_y + int(65*s)), 5, 175, fill=INK, width=max(3, int(7*s)))
    elif mood in {"sad", "hungry", "confused"}:
        draw.arc((x - int(40*s), head_y + int(36*s), x + int(40*s), head_y + int(78*s)), 190, 350, fill=INK, width=max(3, int(7*s)))
    elif mood == "tired":
        draw.ellipse((x - int(20*s), head_y + int(28*s), x + int(20*s), head_y + int(70*s)), fill="#6f3530", outline=INK, width=max(2, int(4*s)))
    else:
        draw.line((x - int(25*s), head_y + int(48*s), x + int(25*s), head_y + int(48*s)), fill=INK, width=max(3, int(6*s)))


def draw_book(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, color: str = BLUE, *, open_book: bool = False) -> None:
    s = scale
    if open_book:
        draw.polygon([(x, y), (x-int(150*s), y-int(50*s)), (x-int(150*s), y+int(130*s)), (x, y+int(180*s))], fill="#f7f1df", outline=INK)
        draw.polygon([(x, y), (x+int(150*s), y-int(50*s)), (x+int(150*s), y+int(130*s)), (x, y+int(180*s))], fill="#f7f1df", outline=INK)
        draw.line((x, y, x, y+int(180*s)), fill=INK, width=max(3, int(6*s)))
        return
    draw.rounded_rectangle((x-int(120*s), y-int(150*s), x+int(120*s), y+int(150*s)), radius=int(16*s), fill=color, outline=INK, width=max(3, int(7*s)))
    draw.line((x-int(87*s), y-int(142*s), x-int(87*s), y+int(142*s)), fill="#dbeaf1", width=max(3, int(9*s)))


def draw_apple(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, color: str = RED) -> None:
    r = int(58 * scale)
    draw.ellipse((x-r, y-r, x+r, y+r), fill=color, outline=INK, width=max(3, int(6*scale)))
    draw.line((x, y-r+5, x+int(10*scale), y-r-int(34*scale)), fill="#74492c", width=max(3, int(8*scale)))
    draw.ellipse((x+int(5*scale), y-r-int(42*scale), x+int(48*scale), y-r-int(12*scale)), fill=GREEN, outline=INK, width=max(2, int(4*scale)))


def draw_glass(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(110*scale), int(190*scale)
    draw.polygon([(x-w//2, y-h//2), (x+w//2, y-h//2), (x+int(w*.38), y+h//2), (x-int(w*.38), y+h//2)], fill="#dff3f5", outline=INK)
    draw.polygon([(x-int(w*.45), y), (x+int(w*.45), y), (x+int(w*.35), y+h//2-int(8*scale)), (x-int(w*.35), y+h//2-int(8*scale))], fill="#83c9de")


def draw_headphones(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    s = scale
    draw.arc((x-int(130*s), y-int(130*s), x+int(130*s), y+int(130*s)), 190, 350, fill=BLUE, width=max(8, int(30*s)))
    draw.rounded_rectangle((x-int(145*s), y-int(5*s), x-int(85*s), y+int(115*s)), radius=int(22*s), fill=BLUE, outline=INK, width=max(3, int(6*s)))
    draw.rounded_rectangle((x+int(85*s), y-int(5*s), x+int(145*s), y+int(115*s)), radius=int(22*s), fill=BLUE, outline=INK, width=max(3, int(6*s)))
    for dx, dy in ((180,-80),(230,-130),(245,15)):
        draw.ellipse((x+int(dx*s), y+int(dy*s), x+int((dx+22)*s), y+int((dy+22)*s)), fill=YELLOW)


def draw_tv(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    w, h = int(300*scale), int(190*scale)
    draw.rounded_rectangle((x-w//2, y-h//2, x+w//2, y+h//2), radius=int(18*scale), fill="#25394a", outline=INK, width=max(4, int(9*scale)))
    draw.rectangle((x-w//2+int(20*scale), y-h//2+int(20*scale), x+w//2-int(20*scale), y+h//2-int(20*scale)), fill="#80bfc9")
    draw.polygon([(x-int(105*scale),y+int(30*scale)),(x-int(35*scale),y-int(45*scale)),(x+int(25*scale),y+int(22*scale)),(x+int(105*scale),y-int(50*scale)),(x+int(105*scale),y+int(50*scale)),(x-int(105*scale),y+int(50*scale))], fill="#f0c16a")
    draw.line((x-int(70*scale), y+h//2, x-int(100*scale), y+h//2+int(55*scale)), fill=INK, width=max(4, int(9*scale)))
    draw.line((x+int(70*scale), y+h//2, x+int(100*scale), y+h//2+int(55*scale)), fill=INK, width=max(4, int(9*scale)))


def draw_ball(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    r = int(76 * scale)
    draw.ellipse((x-r, y-r, x+r, y+r), fill="#f6f3e9", outline=INK, width=max(3, int(7*scale)))
    draw.regular_polygon((x, y, int(27*scale)), n_sides=5, fill=INK)
    for angle in range(0, 360, 72):
        px = x + int(math.cos(math.radians(angle)) * r * .67)
        py = y + int(math.sin(math.radians(angle)) * r * .67)
        draw.line((x, y, px, py), fill=INK, width=max(2, int(5*scale)))


def draw_thermometer(draw: ImageDraw.ImageDraw, x: int, y: int, *, hot: bool) -> None:
    color = RED if hot else BLUE
    draw.rounded_rectangle((x-35, y-185, x+35, y+110), radius=35, fill="#f8fbfb", outline=INK, width=8)
    draw.rectangle((x-13, y-135 if hot else y+10, x+13, y+95), fill=color)
    draw.ellipse((x-66, y+65, x+66, y+197), fill=color, outline=INK, width=8)
    for dy in (-120, -45, 30):
        draw.line((x+45, y+dy, x+83, y+dy), fill=INK, width=7)


def draw_sun(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    r = int(72*scale)
    draw.ellipse((x-r, y-r, x+r, y+r), fill=YELLOW, outline="#a66e10", width=max(4, int(8*scale)))
    for angle in range(0, 360, 45):
        a = math.radians(angle)
        draw.line((x+int(math.cos(a)*r*1.3),y+int(math.sin(a)*r*1.3),x+int(math.cos(a)*r*1.8),y+int(math.sin(a)*r*1.8)), fill=YELLOW, width=max(4, int(10*scale)))


def draw_cloud(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0, *, rain: bool = False) -> None:
    s = scale
    cloud = "#9eacb7"
    draw.ellipse((x-int(150*s),y-int(50*s),x-int(15*s),y+int(75*s)),fill=cloud,outline=INK,width=max(3,int(6*s)))
    draw.ellipse((x-int(55*s),y-int(105*s),x+int(90*s),y+int(75*s)),fill=cloud,outline=INK,width=max(3,int(6*s)))
    draw.ellipse((x+int(40*s),y-int(40*s),x+int(165*s),y+int(75*s)),fill=cloud,outline=INK,width=max(3,int(6*s)))
    draw.rectangle((x-int(105*s),y+int(10*s),x+int(110*s),y+int(75*s)),fill=cloud)
    if rain:
        for dx in (-105,-35,35,105):
            draw.line((x+int(dx*s),y+int(105*s),x+int((dx-18)*s),y+int(165*s)),fill=BLUE,width=max(4,int(9*s)))


def draw_item(draw: ImageDraw.ImageDraw, kind: str, x: int, y: int, scale: float = 1.0, *, color: str = BLUE) -> None:
    s = scale
    if kind == "jacket":
        draw.polygon([(x-int(90*s),y-int(150*s)),(x-int(175*s),y-int(75*s)),(x-int(125*s),y+int(40*s)),(x-int(90*s),y),(x-int(90*s),y+int(170*s)),(x-8,y+int(170*s)),(x-8,y-int(95*s))],fill=color,outline=INK)
        draw.polygon([(x+int(90*s),y-int(150*s)),(x+int(175*s),y-int(75*s)),(x+int(125*s),y+int(40*s)),(x+int(90*s),y),(x+int(90*s),y+int(170*s)),(x+8,y+int(170*s)),(x+8,y-int(95*s))],fill=color,outline=INK)
        draw.polygon([(x-int(90*s),y-int(150*s)),(x,y-int(80*s)),(x+int(90*s),y-int(150*s)),(x+int(32*s),y-int(170*s)),(x,y-int(105*s)),(x-int(32*s),y-int(170*s))],fill="#eef2f0",outline=INK)
    elif kind == "shirt":
        draw.polygon([(x-int(75*s),y-int(145*s)),(x-int(185*s),y-int(60*s)),(x-int(125*s),y+int(15*s)),(x-int(80*s),y-int(20*s)),(x-int(80*s),y+int(170*s)),(x+int(80*s),y+int(170*s)),(x+int(80*s),y-int(20*s)),(x+int(125*s),y+int(15*s)),(x+int(185*s),y-int(60*s)),(x+int(75*s),y-int(145*s)),(x+int(28*s),y-int(165*s)),(x,y-int(115*s)),(x-int(28*s),y-int(165*s))],fill=color,outline=INK)
    elif kind == "hat":
        draw.ellipse((x-int(180*s),y+int(20*s),x+int(180*s),y+int(105*s)),fill=YELLOW,outline=INK,width=max(3,int(7*s)))
        draw.pieslice((x-int(105*s),y-int(130*s),x+int(105*s),y+int(95*s)),180,360,fill=YELLOW,outline=INK,width=max(3,int(7*s)))
    elif kind == "umbrella":
        draw.pieslice((x-int(190*s),y-int(160*s),x+int(190*s),y+int(165*s)),180,360,fill=BLUE,outline=INK,width=max(3,int(7*s)))
        draw.line((x,y,x,y+int(190*s)),fill=INK,width=max(4,int(10*s)))
        draw.arc((x-int(50*s),y+int(135*s),x+int(50*s),y+int(235*s)),0,180,fill=INK,width=max(4,int(10*s)))
    elif kind == "boots":
        for dx in (-70, 70):
            draw.rounded_rectangle((x+int((dx-52)*s),y-int(150*s),x+int((dx+48)*s),y+int(95*s)),radius=int(25*s),fill="#31526a",outline=INK,width=max(3,int(7*s)))
            draw.rounded_rectangle((x+int((dx-52)*s),y+int(40*s),x+int((dx+100)*s),y+int(120*s)),radius=int(30*s),fill="#31526a",outline=INK,width=max(3,int(7*s)))
    elif kind == "shoes":
        for dx in (-92, 92):
            draw.rounded_rectangle((x+int((dx-95)*s),y-int(20*s),x+int((dx+95)*s),y+int(85*s)),radius=int(38*s),fill=color,outline=INK,width=max(3,int(7*s)))
            for lx in (-45,-10,25):
                draw.line((x+int((dx+lx)*s),y,x+int((dx+lx+35)*s),y+int(35*s)),fill="#dad8d1",width=max(2,int(5*s)))
    elif kind == "socks":
        for dx in (-70, 70):
            draw.polygon([(x+int((dx-50)*s),y-int(95*s)),(x+int((dx+45)*s),y-int(95*s)),(x+int((dx+45)*s),y+int(30*s)),(x+int((dx+105)*s),y+int(70*s)),(x+int((dx+95)*s),y+int(125*s)),(x+int((dx-15)*s),y+int(105*s)),(x+int((dx-50)*s),y+int(50*s))],fill="#6f7e86",outline=INK)


def save(image: Image.Image, filename: str) -> None:
    if image.size != SIZE:
        raise ValueError(f"Unit 7 repair has wrong dimensions for {filename}: {image.size}")
    output = ASSET_ROOT / filename
    image.convert("RGB").save(output, "WEBP", quality=92, method=6)


def ordered_collage(sources: list[str]) -> Image.Image:
    image = canvas("#eed39d")
    draw = ImageDraw.Draw(image)
    width, gap, top, height = 410, 45, 170, 684
    left = (SIZE[0] - (3*width + 2*gap)) // 2
    for index, filename in enumerate(sources):
        x = left + index * (width + gap)
        draw.rounded_rectangle((x-10, top-10, x+width+10, top+height+10), radius=58, fill="#fffaf2", outline="#d5c4a9", width=6)
        item = source_panel(filename, (width, height), contain=False)
        image.paste(item, (x, top), item)
    return image


def invitation(kind: str, *, compact: bool = False) -> Image.Image:
    image = canvas("#f1d399")
    draw = ImageDraw.Draw(image)
    panel(draw, (105, 105, 1431, 919))
    draw_person(draw, 425, 540, .74, shirt=BLUE, mood="happy", arms="offer-right")
    draw_person(draw, 1120, 540, .74, shirt="#d66d57", mood="happy")
    question(draw, 690, 160, 95)
    arrow(draw, (680, 440), (920, 440), width=18)
    if kind == "music":
        draw_headphones(draw, 760, 620, .72)
    elif kind == "read":
        draw_book(draw, 760, 620, .72, open_book=False)
    elif kind == "tv":
        draw_tv(draw, 760, 640, .70)
    elif kind == "play":
        draw_ball(draw, 760, 640, .82)
    elif kind == "swim":
        # Pool lane and swimmer cue.
        draw.rounded_rectangle((600, 565, 925, 780), radius=45, fill="#65c4de", outline=INK, width=7)
        draw.arc((650, 590, 865, 760), 185, 340, fill="#f7f0df", width=30)
        draw.ellipse((760, 585, 825, 650), fill=SKIN, outline=INK, width=5)
        for yy in (610, 680, 750):
            draw.arc((620, yy, 905, yy+40), 0, 180, fill="#dff7fb", width=7)
    return image


def isolated_clothing(kind: str) -> Image.Image:
    image = canvas("#dfe6e3")
    draw = ImageDraw.Draw(image)
    panel(draw, (155, 80, 1381, 944))
    if kind == "jacket":
        # Open front, full-length sleeves, lapels, cuffs, and pockets distinguish
        # this jacket from both the short-sleeve shirt and a closed coat.
        draw.polygon([(700,270),(535,325),(500,790),(735,790),(735,405)],fill=BLUE,outline=INK)
        draw.polygon([(836,270),(1001,325),(1036,790),(801,790),(801,405)],fill=BLUE,outline=INK)
        draw.polygon([(545,330),(405,355),(285,770),(430,805),(570,490)],fill=BLUE,outline=INK)
        draw.polygon([(991,330),(1131,355),(1251,770),(1106,805),(966,490)],fill=BLUE,outline=INK)
        draw.rectangle((300,735,450,815),fill="#315f91",outline=INK,width=7)
        draw.rectangle((1086,735,1236,815),fill="#315f91",outline=INK,width=7)
        draw.polygon([(700,270),(768,415),(735,520),(612,320)],fill="#edf1ef",outline=INK)
        draw.polygon([(836,270),(768,415),(801,520),(924,320)],fill="#edf1ef",outline=INK)
        draw.line((768,415,768,790),fill=INK,width=9)
        draw.line((545,635,675,635,675,735,535,735),fill="#315f91",width=8)
        draw.line((991,635,861,635,861,735,1001,735),fill="#315f91",width=8)
    elif kind == "shirt":
        # The helper's sleeves stop near the shoulder: an unmistakable short-sleeve shirt.
        draw_item(draw, "shirt", 768, 510, 1.55, color="#f1eee5")
    else:
        raise ValueError(f"Unsupported isolated clothing item: {kind}")
    return image


def ana_identity(*, narrator: bool, meet: bool = False) -> Image.Image:
    image = canvas("#f1d39d" if meet else "#d7ebdf")
    draw = ImageDraw.Draw(image)
    panel(draw, (65, 65, 1471, 959))
    # Reuse the established photographic Ana: same face, teal blouse, Mexico flag,
    # and visible ANA badge as every other identity introduction.
    established = source_panel("a1_ana.webp", (925, 820), contain=False)
    image.paste(established, (500, 102), established)
    draw.rounded_rectangle((500, 102, 1425, 922), radius=55, outline=INK, width=8)
    if narrator:
        draw_person(draw, 280, 560, .68, shirt="#8b5b7a", mood="happy", arms="offer-right", hair="#6b402e")
        arrow(draw, (420, 405), (570, 405), color=TEAL, width=18)
    if meet:
        draw.ellipse((110, 115, 290, 295), fill="#fff1ca", outline=YELLOW, width=8)
        draw.line((200, 247, 170, 175), fill=SKIN, width=18)
        for angle in (-55, -20, 15, 50):
            a = math.radians(angle)
            draw.line((170, 175, 170 + int(math.cos(a) * 58), 175 + int(math.sin(a) * 58)), fill=SKIN, width=13)
    return image


def exact_ana_source(*, meet: bool = False) -> Image.Image:
    image = canvas("#d7ebdf" if meet else "#efd7a5")
    panel_image = source_panel("a1_ana.webp", (1260, 840), contain=False)
    image.paste(panel_image, (138, 92), panel_image)
    draw = ImageDraw.Draw(image)
    if meet:
        # Friendly meeting/wave cue, outside the source image.
        draw.ellipse((1165, 115, 1370, 320), fill="#fff1ca", outline=YELLOW, width=8)
        draw.line((1265, 252, 1230, 168), fill=SKIN, width=20)
        for angle in (-55,-25,5,35,65):
            a = math.radians(angle)
            draw.line((1230,168,1230+int(math.cos(a)*72),168+int(math.sin(a)*72)),fill=SKIN,width=15)
    return image


def tired_help_scene() -> Image.Image:
    image = canvas("#d6e6eb")
    draw = ImageDraw.Draw(image)
    panel(draw, (95, 90, 1441, 934))
    draw_person(draw, 520, 545, .82, shirt="#176875", mood="tired", arms="yawn", eyes_closed=True)
    draw_person(draw, 1120, 550, .76, shirt="#d66d57", mood="happy", arms="offer-left")
    question(draw, 705, 165, 90)
    draw.line((790, 520, 1000, 520), fill=TEAL, width=18)
    arrow(draw, (805, 520), (990, 520), width=18)
    draw.ellipse((690, 665, 820, 795), fill="#f0b43b", outline="#713f12", width=7)
    draw.text((733, 652), "!", font=font(112), fill="#713f12")
    return image


def speech_scene(*, understood: bool, slow: bool, ana: bool = False) -> Image.Image:
    image = canvas("#d8ebef")
    draw = ImageDraw.Draw(image)
    panel(draw, (95, 90, 1441, 934))
    draw_person(draw, 390, 555, .74, shirt=BLUE, mood="happy", arms="offer-right", hair="#6b402e")
    draw_person(draw, 1110, 555, .74, shirt="#176875" if ana else "#d66d57", mood="happy" if understood else "confused", arms="down")
    # Speech waves travel left-to-right. Widely spaced waves communicate slow speech.
    xs = (600, 720, 840) if slow else (580, 650, 720, 790, 860)
    for index, x in enumerate(xs):
        height = 44 + (index % 2) * 35
        draw.arc((x-26, 400-height, x+26, 400+height), 290, 70, fill=BLUE, width=10)
    if understood:
        check(draw, 1110, 185, 1.05)
    else:
        question(draw, 1055, 135, 105)
        # Palms-down braking gesture for "slowly", not a cyclist/road scene.
        if slow:
            draw.line((1000, 650, 870, 700), fill=SKIN, width=30)
            draw.line((1160, 650, 1290, 700), fill=SKIN, width=30)
            draw.line((840, 700, 930, 700), fill=INK, width=9)
            draw.line((1230, 700, 1320, 700), fill=INK, width=9)
    return image


def likes_apples_water() -> Image.Image:
    image = canvas("#f1d39d")
    draw = ImageDraw.Draw(image)
    panel(draw, (95, 95, 730, 929))
    panel(draw, (806, 95, 1441, 929))
    draw_person(draw, 350, 555, .64, shirt="#176875", mood="happy")
    draw_apple(draw, 570, 560, 1.12)
    draw.text((525, 200), "♥", font=font(135), fill="#c94762", stroke_width=5, stroke_fill="#ffffff")
    draw_person(draw, 1050, 565, .62, shirt="#176875", mood="happy", arms="offer-right")
    draw_glass(draw, 1290, 610, .92)
    draw.line((820, 780, 1420, 780), fill="#a47a52", width=34)
    return image


def morning_scene() -> Image.Image:
    image = canvas("#f2d28e")
    draw = ImageDraw.Draw(image)
    panel(draw, (85, 75, 1451, 949))
    draw.rectangle((105, 100, 520, 470), fill="#bde3ef", outline=INK, width=8)
    draw_sun(draw, 305, 260, .80)
    draw.line((312, 100, 312, 470), fill="#f8f2e8", width=18)
    draw.line((105, 285, 520, 285), fill="#f8f2e8", width=18)
    draw_person(draw, 790, 555, .75, shirt="#176875", mood="happy", arms="raised")
    # Clock at seven, breakfast plate, and clothes ready form one coherent morning routine.
    draw.ellipse((1080, 120, 1320, 360), fill="#fffaf1", outline=INK, width=8)
    draw.line((1200, 240, 1200, 150), fill=INK, width=10)
    draw.line((1200, 240, 1125, 240), fill=INK, width=10)
    draw.ellipse((1045, 615, 1375, 790), fill="#fefcf7", outline=INK, width=7)
    draw.ellipse((1120, 650, 1220, 750), fill="#f6f0d7", outline=INK, width=5)
    draw.ellipse((1195, 650, 1295, 750), fill="#f6f0d7", outline=INK, width=5)
    draw_item(draw, "shirt", 360, 720, .60, color="#e8e1cf")
    return image


def ana_yawns() -> Image.Image:
    image = canvas("#d8eaf0")
    draw = ImageDraw.Draw(image)
    panel(draw, (150, 75, 1386, 949))
    # Established teal blouse, long dark hair, Mexico cue, and small ANA badge
    # preserve identity while the closed eyes/open mouth/raised hand show yawning.
    draw.rectangle((235, 150, 320, 370), fill=GREEN)
    draw.rectangle((320, 150, 405, 370), fill="#fffdf7")
    draw.rectangle((405, 150, 490, 370), fill=RED)
    draw.ellipse((352, 240, 378, 266), fill="#a67c26")
    draw_person(draw, 768, 555, 1.0, shirt="#176875", mood="tired", arms="yawn", eyes_closed=True)
    ana_badge(draw, 768, 610, .82)
    # Small zzz-like bubbles without words.
    for i, radius in enumerate((16, 25, 36)):
        x, y = 1010 + i*72, 160 - i*35
        draw.ellipse((x-radius,y-radius,x+radius,y+radius),fill="#c8dce7",outline=BLUE,width=5)
    return image


def draw_building(draw: ImageDraw.ImageDraw, kind: str, box: tuple[int, int, int, int], *, highlighted: bool = False) -> None:
    x1, y1, x2, y2 = box
    if highlighted:
        draw.rounded_rectangle((x1-25,y1-25,x2+25,y2+25),radius=38,fill="#fff3c9",outline=YELLOW,width=12)
    draw.rounded_rectangle(box, radius=24, fill="#e6dfd3", outline=INK, width=7)
    if kind == "bank":
        draw.polygon([(x1+25,y1+80),((x1+x2)//2,y1+10),(x2-25,y1+80)],fill="#8ca6af",outline=INK)
        for cx in range(x1+65,x2-25,75):
            draw.rectangle((cx,y1+95,cx+25,y2-55),fill="#f5f0e7",outline=INK,width=4)
        # ATM interaction cue.
        draw.rounded_rectangle((x2-105,y2-155,x2-35,y2-45),radius=8,fill=BLUE,outline=INK,width=5)
        draw.rectangle((x2-90,y2-137,x2-50,y2-105),fill="#bfe4e8")
    elif kind == "bathroom":
        draw.ellipse((x1+65,y1+80,x1+200,y1+165),fill="#f8fbfb",outline=INK,width=6)
        draw.rounded_rectangle((x1+82,y1+140,x1+184,y2-45),radius=30,fill="#f8fbfb",outline=INK,width=6)
        draw.line((x1+255,y1+85,x1+255,y2-55),fill=BLUE,width=18)
        draw.arc((x1+215,y1+60,x1+310,y1+145),180,355,fill=BLUE,width=14)
    elif kind == "hospital":
        draw.rectangle((x1+80,y1+80,x2-80,y2-60),fill="#f8fbfb",outline="#8ca6af",width=5)
        draw.rectangle(((x1+x2)//2-25,y1+105,(x1+x2)//2+25,y2-105),fill=RED)
        draw.rectangle((x1+120,(y1+y2)//2-25,x2-120,(y1+y2)//2+25),fill=RED)
    elif kind == "station":
        draw.polygon([(x1+20,y1+100),((x1+x2)//2,y1+20),(x2-20,y1+100)],fill="#6d8791",outline=INK)
        draw.rectangle((x1+45,y1+105,x2-45,y2-55),fill="#f5f0e7",outline=INK,width=5)
        draw.rounded_rectangle((x1+75,y1+165,x2-75,y2-95),radius=32,fill=BLUE,outline=INK,width=6)
        draw.rectangle((x1+100,y1+185,x2-100,y1+250),fill="#bfe4e8")


def map_question(kind: str) -> Image.Image:
    image = canvas("#d8e9e6")
    draw = ImageDraw.Draw(image)
    panel(draw, (75, 70, 1461, 954), fill="#eef4ec")
    # Simple streets and one highlighted target among the same four known services.
    draw.rectangle((650, 115, 790, 910), fill="#c8c8bf")
    draw.rectangle((110, 440, 1425, 580), fill="#c8c8bf")
    positions = {
        "bathroom": (145, 120, 510, 400),
        "bank": (940, 120, 1390, 400),
        "hospital": (145, 635, 510, 900),
        "station": (940, 635, 1390, 900),
    }
    for name, box in positions.items():
        draw_building(draw, name, box, highlighted=name == kind)
    # Learner stands at the crossing and asks where; arrow is intentionally absent.
    draw_person(draw, 720, 535, .25, shirt="#176875", mood="confused")
    target = positions[kind]
    question(draw, target[2]-75, target[1]+20, 86)
    return image


def eggs_meal(*, breakfast: bool) -> Image.Image:
    image = canvas("#f2d89f" if breakfast else "#c8d4e8")
    draw = ImageDraw.Draw(image)
    panel(draw, (95, 85, 1441, 939))
    if breakfast:
        draw_sun(draw, 250, 220, .80)
    else:
        draw.ellipse((175, 125, 340, 290),fill="#f5edc7",outline="#ad9f6a",width=7)
        draw.ellipse((260, 90, 380, 260),fill="#c8d4e8")
        for x,y in ((430,150),(520,230),(360,310)):
            draw.ellipse((x-8,y-8,x+8,y+8),fill="#fff8d9")
    draw_person(draw, 1180, 555, .65, shirt="#176875", mood="happy", arms="offer-left")
    draw.ellipse((350, 535, 925, 845),fill="#fffdf7",outline=INK,width=9)
    for x in (520, 730):
        draw.ellipse((x-105,610,x+105,820),fill="#faf7e9",outline="#bdac8e",width=6)
        draw.ellipse((x-44,670,x+44,758),fill=YELLOW,outline="#ae7717",width=5)
    draw.line((185, 850, 1040, 850),fill="#a47a52",width=36)
    return image


def help_map_scene() -> Image.Image:
    image = canvas("#d8e8e4")
    draw = ImageDraw.Draw(image)
    panel(draw, (95, 90, 1441, 934))
    draw_person(draw, 355, 575, .68, shirt="#176875", mood="confused", arms="offer-right")
    draw_person(draw, 1190, 575, .68, shirt="#d66d57", mood="happy", arms="offer-left")
    # A recognizable folded town map: crossed streets, three service buildings,
    # a location pin, and a route. This cannot read as a café order or line chart.
    draw.polygon(((555, 270), (755, 225), (955, 275), (1110, 220), (1110, 755), (925, 805), (740, 755), (555, 810)), fill="#e9f2dc", outline=INK)
    draw.line((755, 225, 740, 755), fill="#a8b797", width=8)
    draw.line((955, 275, 925, 805), fill="#a8b797", width=8)
    draw.line((600, 500, 1065, 500), fill="#b8b9b2", width=52)
    draw.line((825, 265, 805, 770), fill="#b8b9b2", width=52)
    draw.line((610, 500, 1060, 500), fill="#fff7dc", width=8)
    draw.line((825, 280, 805, 755), fill="#fff7dc", width=8)
    # Bank icon (left), hospital cross (top-right), and station/rail icon (bottom-right).
    draw.polygon(((590, 405), (655, 345), (720, 405)), fill="#829ba5", outline=INK)
    draw.rectangle((600, 405, 710, 475), fill="#f8f3e8", outline=INK, width=4)
    for x in (620, 650, 680):
        draw.line((x, 415, x, 465), fill=INK, width=5)
    draw.rounded_rectangle((925, 325, 1055, 450), radius=15, fill="#f8fbfb", outline=INK, width=5)
    draw.rectangle((974, 345, 1006, 430), fill=RED)
    draw.rectangle((945, 372, 1035, 404), fill=RED)
    draw.rounded_rectangle((890, 625, 1045, 720), radius=16, fill="#6e91b5", outline=INK, width=5)
    draw.rectangle((915, 645, 1020, 680), fill="#c8e3ea")
    draw.line((900, 730, 1035, 730), fill=INK, width=7)
    draw.line((920, 742, 1015, 742), fill=INK, width=7)
    # Route begins at a red map pin and ends at the station.
    draw.ellipse((650, 610, 710, 670), fill=RED, outline=INK, width=5)
    draw.polygon(((680, 700), (654, 652), (706, 652)), fill=RED, outline=INK)
    draw.line((690, 655, 800, 590, 875, 675, 905, 675), fill=TEAL, width=14, joint="curve")
    arrow(draw, (845, 650), (910, 680), color=TEAL, width=14)
    question(draw, 435, 145, 96)
    check(draw, 1190, 175, .75)
    return image


def playing_scene() -> Image.Image:
    image = canvas("#cde8d3")
    draw = ImageDraw.Draw(image)
    # Grass/sky keeps ball game unmistakable.
    draw.rectangle((0,0,1536,610),fill="#bfe0f2")
    draw.rectangle((0,610,1536,1024),fill="#8ec47f")
    draw.ellipse((1250,90,1415,255),fill=YELLOW,outline="#a66e10",width=7)
    draw_person(draw, 440, 570, .74, shirt=BLUE, mood="happy", arms="offer-right")
    draw_person(draw, 1095, 570, .74, shirt="#d66d57", mood="happy", arms="offer-left")
    draw_ball(draw, 768, 775, .95)
    arrow(draw,(590,700),(690,750),color=TEAL,width=16)
    arrow(draw,(945,700),(845,750),color=TEAL,width=16)
    return image


def weather_choice(weather: str, item: str, *, choosing: bool, missing: bool = False) -> Image.Image:
    image = canvas("#d5e8ed" if weather in {"rain", "cold"} else "#f2d89f")
    draw = ImageDraw.Draw(image)
    panel(draw, (70, 65, 1466, 959), fill="#edf2ee" if weather in {"rain", "cold"} else "#fff5dd")
    if weather == "rain":
        draw_cloud(draw, 270, 190, .86, rain=True)
        for x in range(120,1420,120):
            draw.arc((x,790,x+120,880),0,180,fill=BLUE,width=7)
    elif weather == "cold":
        draw_cloud(draw, 260, 170, .75, rain=False)
        draw_thermometer(draw, 260, 475, hot=False)
    else:
        draw_sun(draw, 260, 205, .88)
        draw_thermometer(draw, 255, 505, hot=True)
    # Learner wears boots in rainy hat/umbrella choices; rain-boots shows socked feet.
    pants = "#334653"
    draw_person(draw, 720, 565, .72, shirt="#176875", mood="happy" if not missing else "confused", arms="offer-right" if choosing or missing else "down", pants=pants)
    if weather == "rain" and item != "boots":
        draw_item(draw,"boots",720,835,.36)
    elif weather == "rain" and item == "boots":
        draw_item(draw,"socks",720,830,.38)
        draw_item(draw,"umbrella",700,225,.42)
    draw_item(draw,item,1135,560,.95,color=BLUE if item!="shirt" else "#efe7d8")
    if choosing or missing:
        arrow(draw,(880,545),(1010,545),color=TEAL,width=20)
        check(draw,1260,220,.82)
    return image


def routine_scene(*, waking: bool) -> Image.Image:
    image = canvas("#f1d594" if waking else "#c8d2e6")
    draw = ImageDraw.Draw(image)
    panel(draw,(80,65,1456,959),fill="#fff7e7" if waking else "#e7eaf1")
    # Bed is part of the same scene, not a disconnected keyword panel.
    draw.rounded_rectangle((270,555,1250,850),radius=55,fill="#d8c4a8",outline=INK,width=8)
    draw.rounded_rectangle((300,505,700,650),radius=50,fill="#f8f3e8",outline=INK,width=6)
    draw.rectangle((315,650,1200,820),fill="#8ea9c2" if not waking else "#e6c998")
    if waking:
        draw_sun(draw,1200,195,.82)
        draw_person(draw,790,465,.58,shirt="#916b92",mood="happy",arms="raised")
        draw.ellipse((1050,150,1285,385),fill="#fffaf1",outline=INK,width=7)
        draw.line((1167,268,1167,182),fill=INK,width=9)
        draw.line((1167,268,1095,268),fill=INK,width=9)
    else:
        draw.ellipse((1130,115,1330,315),fill="#f6edc7",outline="#a79b6e",width=7)
        draw.ellipse((1210,80,1360,290),fill="#e7eaf1")
        draw_person(draw,750,490,.48,shirt="#916b92",mood="tired",eyes_closed=True)
        for index,r in enumerate((14,24,36)):
            x,y=930+index*70,340-index*38
            draw.ellipse((x-r,y-r,x+r,y+r),fill="#d1d9e7",outline=BLUE,width=5)
    return image


def parents_family_scene() -> Image.Image:
    """A family scene in which the two adults, not the child, are highlighted."""

    image = canvas("#ecd9b8")
    draw = ImageDraw.Draw(image)
    panel(draw, (85, 70, 1451, 954), fill="#fff6e7")
    # Living-room context keeps the group coherent as one family.
    draw.rectangle((145, 140, 470, 410), fill="#bfe1ec", outline=INK, width=7)
    draw.line((307, 140, 307, 410), fill="#f8f2e8", width=15)
    draw.line((145, 275, 470, 275), fill="#f8f2e8", width=15)
    draw.rounded_rectangle((210, 725, 1325, 900), radius=55, fill="#b98058", outline=INK, width=8)
    # Identical gold halos/brackets explicitly select the two adult parents.
    draw.rounded_rectangle((270, 150, 685, 840), radius=120, fill="#fff0bd", outline=YELLOW, width=14)
    draw.rounded_rectangle((850, 150, 1265, 840), radius=120, fill="#fff0bd", outline=YELLOW, width=14)
    draw_person(draw, 480, 545, .77, shirt=BLUE, mood="happy", arms="offer-right", hair="#6b402e")
    draw_person(draw, 1055, 545, .77, shirt="#d66d57", mood="happy", arms="offer-left", hair=HAIR)
    # Smaller child stands between and in front of the adults, with no highlight.
    draw_person(draw, 768, 655, .50, shirt=GREEN, mood="happy", arms="raised", hair="#4b3227")
    draw.line((420, 120, 420, 95, 1115, 95, 1115, 120), fill="#d79d22", width=16)
    draw.ellipse((710, 85, 826, 201), fill="#f9d879", outline="#a97912", width=7)
    draw.polygon(((768, 180), (725, 137), (682, 159), (686, 205), (768, 284), (850, 205), (854, 159), (811, 137)), fill="#d95a70", outline="#8f3043")
    return image


def woman_state(kind: str) -> Image.Image:
    image = canvas("#efd7ac")
    draw = ImageDraw.Draw(image)
    panel(draw,(100,75,1436,949))
    mood = "happy"
    arms = "down"
    if kind == "hungry":
        mood, arms = "hungry", "stomach"
    elif kind == "thirsty":
        mood, arms = "neutral", "offer-right"
    elif kind == "tired":
        mood, arms = "tired", "yawn"
    person_x = 768 if kind == "reading" else 650
    draw_person(draw,person_x,555,.92,shirt="#d66d57",mood=mood,arms=arms,eyes_closed=kind=="tired")
    if kind == "hungry":
        draw.ellipse((1000,590,1335,790),fill="#fffdf7",outline=INK,width=8)
        draw.ellipse((1110,665,1225,780),fill="#f6f0d7",outline=INK,width=5)
    elif kind == "thirsty":
        draw_glass(draw,1110,610,1.25)
        arrow(draw,(845,555),(995,555),width=18)
    elif kind == "tired":
        draw.ellipse((1090,155,1285,350),fill="#f4ebc3",outline="#9e936b",width=7)
        draw.ellipse((1170,120,1320,320),fill=WARM)
    elif kind == "reading":
        # The same woman actively holds the book with both hands and looks down.
        draw_book(draw, 768, 465, .92, open_book=True)
        draw.line((650,430,665,600),fill=SKIN,width=34)
        draw.line((886,430,871,600),fill=SKIN,width=34)
        draw.ellipse((640,575,690,625),fill=SKIN,outline=INK,width=4)
        draw.ellipse((846,575,896,625),fill=SKIN,outline=INK,width=4)
        # Repaint the established forward eyes as downward reading gaze.
        draw.ellipse((716,238,754,273),fill=SKIN)
        draw.ellipse((782,238,820,273),fill=SKIN)
        draw.arc((716,240,754,278),195,340,fill=INK,width=5)
        draw.arc((782,240,820,278),200,345,fill=INK,width=5)
    elif kind == "writing":
        # Desk, paper, connected writing arm, hand, and pen form one active pose.
        draw.rectangle((430,650,1340,825),fill="#a97b50",outline=INK,width=8)
        draw.rounded_rectangle((770,545,1215,755),radius=20,fill="#fdfbf3",outline=INK,width=7)
        for y in (590,640,690):
            draw.line((850,y,1140,y),fill="#9fb1b4",width=6)
        draw.line((765,430,900,625),fill=SKIN,width=38)
        draw.ellipse((875,600,930,655),fill=SKIN,outline=INK,width=4)
        draw.line((900,625,1065,570),fill=BLUE,width=17)
        draw.polygon(((1065,570),(1095,550),(1078,585)),fill=INK)
        # The same face now looks at the page rather than at the viewer.
        draw.ellipse((598,238,636,273),fill=SKIN)
        draw.ellipse((664,238,702,273),fill=SKIN)
        draw.arc((598,240,636,278),195,340,fill=INK,width=5)
        draw.arc((664,240,702,278),200,345,fill=INK,width=5)
    return image


def black_shoes() -> Image.Image:
    image = canvas("#dfe4e6")
    draw = ImageDraw.Draw(image)
    panel(draw,(115,85,1421,939))
    source_path = ASSET_ROOT / "a1_shoes.webp"
    if not source_path.is_file():
        raise FileNotFoundError(f"Required Unit 7 repair source is missing: {source_path}")
    with Image.open(source_path) as opened:
        gray = ImageOps.grayscale(opened.convert("RGB"))
        recolored = ImageOps.colorize(gray, black="#06090b", white="#9ba2a5")
        fitted = ImageOps.contain(recolored, (1120, 720), Image.Resampling.LANCZOS)
    fitted.putalpha(mask(fitted.size, 45))
    image.paste(fitted, ((SIZE[0]-fitted.width)//2, (SIZE[1]-fitted.height)//2), fitted)
    # No quantity badge: plural is communicated by the visible pair itself.
    return image


def bare_feet(*, highlight: bool) -> Image.Image:
    image = canvas("#e9d2b4")
    draw = ImageDraw.Draw(image)
    panel(draw,(165,65,1371,959))
    # Full lower legs and both bare feet, with five visible toes on each foot.
    for center in (570, 955):
        draw.rounded_rectangle((center-85,145,center+85,690),radius=70,fill=SKIN,outline=INK,width=8)
        draw.ellipse((center-110,620,center+150,865),fill=SKIN,outline=INK,width=8)
        for index in range(5):
            tx=center+112-index*40
            ty=760+abs(index-2)*8
            radius=26-index*2
            draw.ellipse((tx-radius,ty-radius,tx+radius,ty+radius),fill=SKIN,outline=INK,width=4)
        if highlight:
            # Outline-only halo keeps the bare foot and every toe visible.
            draw.ellipse((center-135,585,center+175,900),outline="#d97818",width=14)
    return image


def hot_scene(condition: str, *, item: str | None = None, variant: int = 0) -> Image.Image:
    image = canvas("#f2cc91")
    draw = ImageDraw.Draw(image)
    panel(draw,(65,60,1471,964),fill="#fff2d4")
    if condition == "sunny":
        draw_sun(draw,255,190,.90)
    elif condition == "cloudy":
        draw_cloud(draw,255,190,.82)
    elif condition == "rainy":
        draw_cloud(draw,255,190,.82,rain=True)
    else:
        draw_sun(draw,280,185,.70)
    draw_thermometer(draw,265,520,hot=True)
    draw_person(draw,700 if item else 825,560,.76,shirt="#f1eee1",mood="tired",arms="yawn")
    # Sweat drops and fanning lines make heat explicit regardless of sky.
    for dx,dy in ((-80,-340),(95,-290),(140,-200)):
        x=(700 if item else 825)+dx
        y=560+dy
        draw.ellipse((x-13,y-30,x+13,y+30),fill="#5eb2d1",outline=BLUE,width=4)
    for offset in (0,55,110):
        draw.arc((900+offset,390-offset//3,1015+offset,520-offset//3),90,270,fill=RED,width=9)
    if item:
        draw_item(draw,item,1170,565,.92,color=BLUE if item=="jacket" else "#efe7d8")
        arrow(draw,(880,560),(1010,560),width=18)
    if variant:
        draw.ellipse((1210,130,1350,270),fill="#fff1ca",outline=YELLOW,width=7)
        draw.line((1250,215,1310,155),fill=RED,width=12)
    return image


def cold_sunny() -> Image.Image:
    image = canvas("#dceaf1")
    draw = ImageDraw.Draw(image)
    panel(draw,(65,60,1471,964),fill="#edf4f5")
    draw_sun(draw,260,190,.85)
    draw_thermometer(draw,265,520,hot=False)
    draw_person(draw,830,560,.80,shirt=BLUE,mood="sad",arms="stomach")
    # Visible breath and shiver marks keep temperature separate from sunny weather.
    for i in range(3):
        draw.ellipse((1030+i*55,300-i*18,1075+i*55,330-i*18),fill="#d7eef4",outline=BLUE,width=4)
    for x in (580,1080):
        draw.line((x,470,x-35,510,x+25,550,x-20,590),fill=BLUE,width=9)
    return image


def three_green_apples() -> Image.Image:
    image = canvas("#d8ebdf")
    draw = ImageDraw.Draw(image)
    panel(draw,(95,70,1441,954))
    # Established Ana styling and identity badge; the basket is visibly supported
    # by both arms rather than sitting on a counter.
    draw_person(draw,540,555,.82,shirt="#176875",mood="happy",arms="down")
    # Keep the identity badge above the holding arms so ANA remains fully legible.
    ana_badge(draw,540,405,.62)
    draw.arc((760,430,1305,820),185,355,fill="#8e6238",width=26)
    draw.rounded_rectangle((760,580,1305,825),radius=55,fill="#c99558",outline=INK,width=9)
    # Exactly three separate, fully visible green apples in Ana's held basket.
    positions=((850,545),(1032,515),(1215,545))
    for x,y in positions:
        draw_apple(draw,x,y,1.05,color=GREEN)
    draw.line((785,590,1280,590),fill="#8e6238",width=18)
    draw.line((440,445,785,680),fill=SKIN,width=36)
    draw.line((650,445,785,735),fill=SKIN,width=36)
    draw.ellipse((760,655,810,705),fill=SKIN,outline=INK,width=4)
    draw.ellipse((760,710,810,760),fill=SKIN,outline=INK,width=4)
    return image


def ankle_socks() -> Image.Image:
    image = canvas("#e1e6e6")
    draw = ImageDraw.Draw(image)
    panel(draw,(135,85,1401,939))
    # Deliberately short ankle cuffs with ribbing, heels, and rounded toes.
    for x, mirror in ((340, False), (840, True)):
        points = [
            (x, 410), (x+190, 410), (x+190, 535),
            (x+350, 600), (x+340, 720), (x+115, 720), (x, 600),
        ]
        if mirror:
            cx = x + 175
            points = [(2*cx-px, py) for px, py in points]
        draw.polygon(points, fill="#687a82", outline=INK)
        cuff_left, cuff_right = (x, x+190) if not mirror else (x+160, x+350)
        draw.rounded_rectangle((cuff_left, 405, cuff_right, 485), radius=20, fill="#52666f", outline=INK, width=7)
        for yy in (430, 455, 478):
            draw.line((cuff_left+18, yy, cuff_right-18, yy), fill="#94a3a8", width=5)
        heel_x = x+120 if not mirror else x+230
        draw.ellipse((heel_x-55, 525, heel_x+55, 640), fill="#53666e", outline=INK, width=5)
        toe_x = x+300 if not mirror else x+50
        draw.ellipse((toe_x-70, 620, toe_x+70, 720), fill="#53666e", outline=INK, width=5)
    return image


def build_all() -> dict[str, Image.Image]:
    return {
        "a-boy-a-book-a-park": ordered_collage(["boy.webp", "a1_book.webp", "place_park.webp"]),
        "a-jacket": isolated_clothing("jacket"),
        "a-shirt": isolated_clothing("shirt"),
        "invite-listen-music": invitation("music"),
        "invite-read": invitation("read"),
        "invite-tv": invitation("tv"),
        "food-bank-sunny": ordered_collage(["a1_apple.webp", "a1_bank.webp", "a1_sunny.webp"]),
        "her-name-ana": ana_identity(narrator=True),
        "my-name-ana-mexico": exact_ana_source(),
        "tired-needs-help": tired_help_scene(),
        "confused-slowly": speech_scene(understood=False, slow=True, ana=True),
        "likes-apples-water": likes_apples_water(),
        "in-the-morning": morning_scene(),
        "am-yawns": ana_yawns(),
        "asks-bank": map_question("bank"),
        "asks-bathroom": map_question("bathroom"),
        "asks-hospital": map_question("hospital"),
        "asks-station": map_question("station"),
        "asks-slowly": speech_scene(understood=False, slow=True),
        "eggs-breakfast": eggs_meal(breakfast=True),
        "eggs-dinner": eggs_meal(breakfast=False),
        "invites-playing": invitation("play"),
        "invites-reading": invitation("read", compact=True),
        "invites-swimming": invitation("swim"),
        "needs-help": help_map_scene(),
        "playing": playing_scene(),
        "rain-boots": weather_choice("rain", "boots", choosing=True),
        "rain-hat": weather_choice("rain", "hat", choosing=False),
        "rain-umbrella": weather_choice("rain", "umbrella", choosing=False),
        "read": invitation("read", compact=True),
        "understand": speech_scene(understood=True, slow=False),
        "wakes-morning": routine_scene(waking=True),
        "sleeps-night": routine_scene(waking=False),
        "where-bathroom": map_question("bathroom"),
        "woman-hungry": woman_state("hungry"),
        "woman-thirsty": woman_state("thirsty"),
        "woman-tired": woman_state("tired"),
        "woman-reading": woman_state("reading"),
        "woman-writing": woman_state("writing"),
        "black-shoes": black_shoes(),
        "my-feet": bare_feet(highlight=True),
        "feet": bare_feet(highlight=False),
        "feet-highlighted": bare_feet(highlight=True),
        "hot": hot_scene("neutral"),
        "it-is-hot": hot_scene("neutral", variant=1),
        "hot-cloudy": hot_scene("cloudy"),
        "hot-rainy": hot_scene("rainy"),
        "hot-sunny": hot_scene("sunny"),
        "hot-jacket": hot_scene("neutral", item="jacket"),
        "hot-shirt": hot_scene("neutral", item="shirt"),
        "cold-sunny": cold_sunny(),
        "cold-chooses-jacket": weather_choice("cold", "jacket", choosing=True),
        "cold-chooses-shirt": weather_choice("cold", "shirt", choosing=True),
        "rainy-chooses-hat": weather_choice("rain", "hat", choosing=True),
        "rainy-chooses-umbrella": weather_choice("rain", "umbrella", choosing=True),
        "cold-needs-jacket": weather_choice("cold", "jacket", choosing=True, missing=True),
        "three-green-apples": three_green_apples(),
        "socks": ankle_socks(),
        "meet-ana": exact_ana_source(meet=True),
        "who-parents": parents_family_scene(),
    }


def validate_target_registry() -> None:
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest_files = {asset["filename"] for asset in payload["assets"]}
    missing = sorted(set(TARGETS.values()) - manifest_files)
    if missing:
        raise RuntimeError(f"Unit 7 repair targets missing from manifest: {missing}")
    if len(TARGETS) != len(set(TARGETS.values())):
        raise RuntimeError("Unit 7 repair target filenames must be unique")


def main() -> None:
    validate_target_registry()
    rendered = build_all()
    if set(rendered) != set(TARGETS):
        missing = sorted(set(TARGETS) - set(rendered))
        extra = sorted(set(rendered) - set(TARGETS))
        raise RuntimeError(f"Unit 7 repair registry drift: missing={missing}, extra={extra}")
    for key, image in rendered.items():
        save(image, TARGETS[key])
    for filename in TARGETS.values():
        path = ASSET_ROOT / filename
        with Image.open(path) as image:
            if image.size != SIZE or image.format != "WEBP":
                raise RuntimeError(f"Invalid Unit 7 repair output: {filename} ({image.format}, {image.size})")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        print(f"{filename}\t{digest}")
    print(f"Rebuilt {len(TARGETS)} reviewed Unit 7 semantic assets.")


if __name__ == "__main__":
    main()
