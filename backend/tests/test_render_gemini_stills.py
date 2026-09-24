import base64
import io
import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from PIL import Image

from scripts.render_gemini_stills import cost_from_usage, load_pack, render

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "docs/product/unit-2-reuse-photos-v1.json"
USAGE = {"promptTokenCount": 400, "candidatesTokenCount": 1120, "thoughtsTokenCount": 0,
         "candidatesTokensDetails": [{"modality": "IMAGE", "tokenCount": 1120}]}


def png() -> str:
    buffer = io.BytesIO()
    Image.new("RGB", (48, 32), "white").save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


class FakeProvider:
    def __init__(self, status=200):
        self.calls, self.status = [], status

    def __call__(self, body, key):
        self.calls.append(json.loads(body))
        if self.status != 200:
            return self.status, {}, {"error": {"status": "RESOURCE_EXHAUSTED", "code": 429, "message": key}}
        return 200, {}, {"responseId": "r1", "usageMetadata": USAGE,
                         "candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "image/png", "data": png()}}]}}]}


class GeminiStillsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        pack = json.loads(PACK.read_text(encoding="utf-8"))
        pack["authorization"] = "Approved by the user for this test."
        self.pack = self.root / "pack.json"
        self.pack.write_text(json.dumps(pack), encoding="utf-8")

    def tearDown(self):
        self.directory.cleanup()

    def run_asset(self, asset_id, provider, ceiling="4.00"):
        return render(self.pack, asset_id, execute=True, ceiling=Decimal(ceiling), key="test-key",
                      transport=provider, root=self.root)

    def test_a_pack_without_the_users_approval_sends_nothing(self):
        load_pack(PACK)
        pending = json.loads(self.pack.read_text(encoding="utf-8"))
        pending["authorization"] = "PENDING USER APPROVAL."
        self.pack.write_text(json.dumps(pending), encoding="utf-8")
        provider = FakeProvider()
        with self.assertRaisesRegex(ValueError, "no recorded user approval"):
            self.run_asset("seven-chairs", provider)
        self.assertEqual(provider.calls, [])

    def test_dry_run_sends_nothing_and_shows_the_complete_prompt(self):
        provider = FakeProvider()
        result = render(self.pack, "seven-chairs", execute=False, ceiling=None, transport=provider, root=self.root)
        self.assertEqual(provider.calls, [])
        self.assertIn("SEVEN chairs, exactly 7", result["prompt"])
        self.assertIn("No letters, words, logos", result["prompt"])

    def test_one_paid_attempt_per_asset_with_a_receipt_and_cost(self):
        provider = FakeProvider()
        record = self.run_asset("seven-chairs", provider)
        self.assertEqual(record["status"], "image_saved")
        self.assertEqual(Decimal(record["cost"]["usd"]), Decimal("0.134800"))
        body = provider.calls[0]
        self.assertEqual(body["generationConfig"]["imageConfig"], {"aspectRatio": "3:2", "imageSize": "2K"})
        with self.assertRaisesRegex(ValueError, "already attempted"):
            self.run_asset("seven-chairs", provider)
        self.assertEqual(len(provider.calls), 1)

    def test_a_rejected_request_blocks_the_batch_until_reconciled(self):
        with self.assertRaisesRegex(RuntimeError, "do not retry"):
            self.run_asset("seven-chairs", FakeProvider(status=429))
        receipt = json.loads((self.root / "output/imagegen/unit-2-lesson-v5/seven-chairs.receipt.json")
                             .read_text(encoding="utf-8"))
        self.assertEqual(receipt["status"], "failed_no_retry")
        self.assertNotIn("test-key", json.dumps(receipt))
        with self.assertRaisesRegex(ValueError, "reconcile"):
            self.run_asset("eight-books", FakeProvider())

    def test_the_ceiling_counts_every_earlier_charge(self):
        self.run_asset("seven-chairs", FakeProvider())
        with self.assertRaisesRegex(ValueError, "exceeds batch ceiling"):
            self.run_asset("eight-books", FakeProvider(), ceiling="0.30")

    def test_an_edit_needs_its_inspected_base_image(self):
        self.run_asset("these-books", FakeProvider())
        with self.assertRaisesRegex(ValueError, "visual inspection"):
            self.run_asset("those-books", FakeProvider())
        base = self.root / "output/imagegen/unit-2-lesson-v5/these-books.png"
        from scripts.render_course_stills import digest
        (base.parent / "agent-reviews.json").write_text(json.dumps(
            {"these-books": {"disposition": "usable", "sha256": digest(base)}}), encoding="utf-8")
        provider = FakeProvider()
        self.run_asset("those-books", provider)
        parts = provider.calls[0]["contents"][0]["parts"]
        self.assertIn("inlineData", parts[0])
        self.assertTrue(parts[1]["text"].startswith("THOSE state"))

    def test_unknown_usage_is_never_guessed(self):
        self.assertIsNone(cost_from_usage(None)["usd"])
        self.assertIsNone(cost_from_usage({"promptTokenCount": 3})["usd"])


if __name__ == "__main__":
    unittest.main()
