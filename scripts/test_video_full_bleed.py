import unittest

from audit_video_full_bleed import solid_bands


class FullBleedPixelTests(unittest.TestCase):
    def test_scene_reaches_every_edge(self):
        frame = bytes(c for y in range(80) for x in range(120)
                      for c in ((x * 7) % 256, (y * 9) % 256, (x + y) % 256))
        self.assertEqual(solid_bands(frame, 120, 80), [])

    def test_encoded_neutral_bands_fail_despite_full_size_frame(self):
        frame = bytes(c for y in range(80) for x in range(120)
                      for c in ((242, 235, 222) if x < 15 or x >= 105
                                else ((x * 7) % 256, (y * 9) % 256, (x + y) % 256)))
        self.assertEqual(solid_bands(frame, 120, 80), ["left", "right"])

    def test_truncated_decode_fails_closed(self):
        with self.assertRaises(ValueError):
            solid_bands(b"", 120, 80)


if __name__ == "__main__":
    unittest.main()
