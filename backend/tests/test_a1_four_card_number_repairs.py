from __future__ import annotations

from collections import deque
import hashlib
import importlib.util
from pathlib import Path
import unittest

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
BUILDER_PATH = ROOT / "scripts" / "build_a1_four_card_number_repairs.py"
SPEC = importlib.util.spec_from_file_location("build_a1_four_card_number_repairs", BUILDER_PATH)
assert SPEC and SPEC.loader
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)

CANONICAL_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MOBILE_ROOT = ROOT / "mobile" / "assets" / "lesson-assets"
FRONTEND_ROOT = ROOT / "frontend" / "public" / "lesson-assets"

TARGETS = {
    "a1_scene_n13_e92ef3e_four-card.webp": 13,
    "a1_scene_n14_f713285_four-card.webp": 14,
    "a1_scene_n15_35e4ec4_four-card.webp": 15,
    "a1_scene_n16_e4aa4eb_four-card.webp": 16,
    "a1_scene_n17_9b96027_four-card.webp": 17,
    "a1_scene_n18_bdd888e_four-card.webp": 18,
}

SAFE_LEFT = 358
SAFE_RIGHT = 1178
MIN_DOT_AREA = 1_000
MAX_DOT_AREA = 6_000


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def is_gold_fill(pixel: tuple[int, ...]) -> bool:
    red, green, blue = pixel[:3]
    return (
        150 <= red <= 235
        and 95 <= green <= 195
        and blue <= 105
        and red >= green + 20
        and green >= blue + 35
    )


def gold_components(image: Image.Image) -> list[tuple[int, tuple[int, int, int, int]]]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    mask = bytearray(width * height)
    for y in range(height):
        row_offset = y * width
        for x in range(width):
            if is_gold_fill(pixels[x, y]):
                mask[row_offset + x] = 1

    components: list[tuple[int, tuple[int, int, int, int]]] = []
    for y in range(height):
        row_offset = y * width
        for x in range(width):
            start = row_offset + x
            if not mask[start]:
                continue
            mask[start] = 0
            queue = deque([(x, y)])
            area = 0
            left = right = x
            top = bottom = y
            while queue:
                current_x, current_y = queue.popleft()
                area += 1
                left = min(left, current_x)
                right = max(right, current_x)
                top = min(top, current_y)
                bottom = max(bottom, current_y)
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    index = next_y * width + next_x
                    if mask[index]:
                        mask[index] = 0
                        queue.append((next_x, next_y))
            if MIN_DOT_AREA <= area <= MAX_DOT_AREA:
                components.append((area, (left, top, right + 1, bottom + 1)))
    return components


class A1FourCardNumberRepairTests(unittest.TestCase):
    def test_builder_is_scoped_to_exactly_thirteen_through_eighteen(self) -> None:
        self.assertEqual(BUILDER.TARGETS, TARGETS)
        self.assertEqual(set(BUILDER.TARGETS.values()), set(range(13, 19)))
        self.assertFalse(any(filename.startswith("a1_n") for filename in BUILDER.TARGETS))

    def test_committed_variants_keep_every_dot_inside_the_four_card_crop(self) -> None:
        for filename, expected_count in TARGETS.items():
            with self.subTest(filename=filename):
                path = CANONICAL_ROOT / filename
                with Image.open(path) as opened:
                    self.assertEqual(opened.format, "WEBP")
                    self.assertEqual(opened.size, (1536, 1024))
                    components = gold_components(opened)
                self.assertEqual(
                    len(components),
                    expected_count,
                    f"{filename} must visibly contain exactly {expected_count} separate gold dots",
                )
                for area, (left, _top, right, _bottom) in components:
                    self.assertGreaterEqual(area, MIN_DOT_AREA)
                    self.assertGreaterEqual(left, SAFE_LEFT)
                    self.assertLessEqual(right, SAFE_RIGHT)

    def test_canonical_mobile_and_frontend_copies_are_byte_identical(self) -> None:
        for filename in TARGETS:
            with self.subTest(filename=filename):
                canonical_hash = sha256(CANONICAL_ROOT / filename)
                self.assertEqual(sha256(MOBILE_ROOT / filename), canonical_hash)
                self.assertEqual(sha256(FRONTEND_ROOT / filename), canonical_hash)


if __name__ == "__main__":
    unittest.main()
