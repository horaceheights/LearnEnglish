from __future__ import annotations

"""Focused pixel and binding checks for the final critical four-card repairs."""

from collections import deque
import hashlib
import inspect
from pathlib import Path
import re
import sys
import tempfile
import unittest

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_a1_four_card_critical_repairs as repairs  # noqa: E402
import build_a1_units_2_7 as course_builder  # noqa: E402


def rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(int(hex_color[index : index + 2], 16) for index in (1, 3, 5))


def color_count(image: Image.Image, hex_color: str) -> int:
    expected = rgb(hex_color)
    data = image.convert("RGB").tobytes()
    red, green, blue = expected
    return sum(
        data[offset] == red and data[offset + 1] == green and data[offset + 2] == blue
        for offset in range(0, len(data), 3)
    )


def color_bbox(image: Image.Image, hex_color: str) -> tuple[int, int, int, int]:
    expected = rgb(hex_color)
    converted = image.convert("RGB")
    pixels = converted.load()
    matches = [(x, y) for y in range(converted.height) for x in range(converted.width) if pixels[x, y] == expected]
    if not matches:
        raise AssertionError(f"No pixels found for {hex_color}")
    xs = [point[0] for point in matches]
    ys = [point[1] for point in matches]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def component_count(image: Image.Image, hex_color: str, *, minimum_area: int) -> int:
    expected = rgb(hex_color)
    width, height = image.size
    pixels = image.convert("RGB").load()
    points = {(x, y) for y in range(height) for x in range(width) if pixels[x, y] == expected}
    components = 0
    while points:
        start = points.pop()
        queue = deque([start])
        area = 1
        while queue:
            x, y = queue.popleft()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in points:
                    points.remove(neighbor)
                    queue.append(neighbor)
                    area += 1
        if area >= minimum_area:
            components += 1
    return components


class CriticalFourCardRepairsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.paths = {
            concept: repairs.CANONICAL_ROOT / repairs.variant_filename(base)
            for concept, base in repairs.BASE_FILENAMES.items()
        }

    def crop(self, concept: str) -> Image.Image:
        with Image.open(self.paths[concept]) as opened:
            return repairs.crop_4x5(opened.convert("RGB"))

    def test_all_sources_bind_to_dedicated_four_card_variants(self) -> None:
        self.assertEqual(set(repairs.BASE_FILENAMES), set(repairs.CRITICAL_BOUNDS))
        for base_filename in repairs.BASE_FILENAMES.values():
            self.assertIn(base_filename, course_builder.FOUR_CARD_REFRAMES)

    def test_outputs_are_exact_webp_and_byte_identical_in_all_three_roots(self) -> None:
        for concept, canonical in self.paths.items():
            self.assertTrue(canonical.is_file(), concept)
            with Image.open(canonical) as opened:
                self.assertEqual(opened.format, "WEBP", concept)
                self.assertEqual(opened.size, repairs.SIZE, concept)
            expected = canonical.read_bytes()
            for mirror_root in repairs.RUNTIME_ROOTS:
                mirror = mirror_root / canonical.name
                self.assertTrue(mirror.is_file(), f"{concept}: missing {mirror}")
                self.assertEqual(mirror.read_bytes(), expected, f"{concept}: mirror bytes drift")

    def test_builder_is_deterministic_and_reproduces_canonical_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            first_paths = repairs.write_assets(Path(first))
            second_paths = repairs.write_assets(Path(second))
            for first_path, second_path in zip(first_paths, second_paths, strict=True):
                first_digest = hashlib.sha256(first_path.read_bytes()).digest()
                second_digest = hashlib.sha256(second_path.read_bytes()).digest()
                canonical_digest = hashlib.sha256((repairs.CANONICAL_ROOT / first_path.name).read_bytes()).digest()
                self.assertEqual(first_digest, second_digest, first_path.name)
                self.assertEqual(first_digest, canonical_digest, first_path.name)

    def test_every_answer_critical_bound_fits_the_exact_center_crop(self) -> None:
        repairs.validate_safe_bounds()
        for concept, path in self.paths.items():
            with Image.open(path) as opened:
                crop = repairs.crop_4x5(opened)
            self.assertEqual(crop.size, (round(repairs.SIZE[1] * 4 / 5), repairs.SIZE[1]), concept)
            left, top, right, bottom = repairs.CRITICAL_BOUNDS[concept]
            self.assertGreaterEqual(left, repairs.SAFE_LEFT, concept)
            self.assertLessEqual(right, repairs.SAFE_RIGHT, concept)
            self.assertGreaterEqual(top, 0, concept)
            self.assertLessEqual(bottom, repairs.SIZE[1], concept)

    def test_three_green_books_are_three_separate_complete_crop_objects(self) -> None:
        crop = self.crop("three-green-books")
        self.assertEqual(component_count(crop, repairs.GREEN, minimum_area=4_000), 3)

    def test_music_and_possession_cues_survive_the_crop(self) -> None:
        music = self.crop("invites-music")
        self.assertGreater(color_count(music, repairs.GUITAR), 8_000)
        self.assertGreater(color_count(music, units_shirt("Sofia")), 1_000)
        self.assertGreater(color_count(music, units_shirt("Luis")), 1_000)
        self.assertGreater(color_count(music, repairs.TEAL), 300)

        possession = self.crop("i-have-book")
        self.assertGreater(color_count(possession, repairs.PURPLE), 1_000)
        self.assertGreater(color_count(possession, repairs.BLUE), 4_000)
        self.assertGreater(color_count(possession, repairs.TEAL), 1_000)
        left, top, right, bottom = color_bbox(possession, repairs.BLUE)
        self.assertLess(right - left, 180, "the single book must remain one localized object")
        self.assertGreater(bottom - top, 140, "the single book must remain fully visible")

    def test_each_profession_crop_contains_its_literal_action_signature(self) -> None:
        signatures = {
            "cook-sofia": ((repairs.STOVE, 4_000), (repairs.RED, 300), (repairs.GREEN, 300)),
            "doctor-diego": ((repairs.PATIENT_SHIRT, 4_000), (repairs.RED, 2_000), (units_shirt("Diego"), 1_000)),
            "driver-luis": ((repairs.BUS, 20_000), (units_shirt("Luis"), 500), (repairs.INK, 8_000)),
            "farmer-ana": ((repairs.FIELD, 20_000), (repairs.WATERING_CAN, 3_000), (repairs.GREEN, 2_000)),
            "nurse-sofia": ((repairs.PATIENT_SHIRT, 4_000), (repairs.BLUE, 300), (units_shirt("Sofia"), 1_000)),
            "teacher-ana": ((repairs.BOARD, 20_000), (repairs.BLUE, 1_000), (units_shirt("Ana"), 1_000)),
        }
        for concept, required in signatures.items():
            crop = self.crop(concept)
            for color, minimum in required:
                if minimum:
                    self.assertGreater(color_count(crop, color), minimum, f"{concept}: missing {color}")

    def test_assessment_variants_do_not_draw_profession_answer_words(self) -> None:
        source = Path(repairs.__file__).read_text(encoding="utf-8")
        answer_word_draw = re.compile(
            r"(?:badge|centered_text|draw\.text)\([^\n]*(?:COOK|DOCTOR|DRIVER|FARMER|NURSE|TEACHER)",
            re.IGNORECASE,
        )
        self.assertIsNone(answer_word_draw.search(source))

        profession_renderers = (
            repairs.cook_sofia_scene,
            repairs.doctor_diego_scene,
            repairs.driver_luis_scene,
            repairs.farmer_ana_scene,
            repairs.nurse_sofia_scene,
            repairs.teacher_ana_scene,
        )
        for renderer in profession_renderers:
            renderer_source = inspect.getsource(renderer)
            self.assertNotIn("units35.badge", renderer_source, renderer.__name__)
            for call in re.findall(r"units35\.person\([^\n]+", renderer_source):
                self.assertTrue(call.rstrip().endswith("False)"), f"{renderer.__name__}: person badge enabled")


def units_shirt(name: str) -> str:
    return str(repairs.units35.PERSON[name]["shirt"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
