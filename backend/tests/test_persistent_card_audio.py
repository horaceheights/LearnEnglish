import asyncio
import unittest
from pathlib import Path
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
import yaml

from backend.app.card_audio_assets import (
    asset_index,
    assets_for_card,
    card_image_ref,
    read_asset,
    seed_static_assets,
    storage_status,
    store_approved_asset,
)
from backend.app.data import LESSONS
from backend.app.schemas import ChoiceOption, LessonCard


class PersistentCardAudioTests(unittest.TestCase):
    def test_every_course_asset_is_unique_and_bound_to_its_card_visual(self):
        assets = [
            asset
            for lesson in LESSONS.values()
            for card in lesson.cards
            for asset in card.audio_assets
        ]
        self.assertGreater(len(assets), 2400)
        self.assertEqual(len(assets), len({asset.id for asset in assets}))
        self.assertTrue(all(asset.image_ref for asset in assets))

    def test_changing_the_image_creates_a_new_asset_id(self):
        card = LessonCard(
            prompt="The boy.",
            stage="Learn",
            correct_option_id="boy",
            options=[ChoiceOption(id="boy", image_url="/lesson-assets/boy.webp", label="The boy.")],
        )
        first = assets_for_card("lesson-test", 0, card)
        card.options[0].image_url = "/lesson-assets/girl.webp"
        second = assets_for_card("lesson-test", 0, card)
        self.assertNotEqual(first[0].id, second[0].id)
        self.assertNotEqual(first[0].image_ref, second[0].image_ref)

    def test_text_only_cards_have_a_stable_rendered_card_binding(self):
        card = LessonCard(
            prompt="Listen.",
            audio_text="The boy.",
            stage="Listen",
            correct_option_id="boy",
            options=[ChoiceOption(id="boy", label="The boy.")],
        )
        self.assertTrue(card_image_ref(card).startswith("text-only:"))
        self.assertEqual(card_image_ref(card), card_image_ref(card))

    def test_missing_asset_fails_closed_without_generation(self):
        asset_id = next(iter(asset_index(LESSONS)))
        with TemporaryDirectory() as directory, patch.dict(
            "os.environ", {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            with self.assertRaises(HTTPException) as raised:
                read_asset(asset_id, LESSONS)
            self.assertEqual(503, raised.exception.status_code)

    def test_startup_seed_only_copies_reviewed_static_files(self):
        with TemporaryDirectory() as directory, patch.dict(
            "os.environ", {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            status = seed_static_assets(LESSONS)
        self.assertEqual(status["total"], status["present"] + status["copied"] + status["missing"])
        self.assertGreater(status["copied"], 0)
        self.assertGreater(status["missing"], 0)

    def test_admin_upload_persists_an_approved_asset_without_tts(self):
        asset_id = next(iter(asset_index(LESSONS)))
        upload = UploadFile(
            filename="approved.mp3",
            file=BytesIO(b"ID3reviewed-audio"),
            headers=Headers({"content-type": "audio/mpeg"}),
        )
        with TemporaryDirectory() as directory, patch.dict(
            "os.environ", {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            result = asyncio.run(store_approved_asset(asset_id, upload, LESSONS))
            status = storage_status(LESSONS)
            self.assertEqual(1, status["available"])
        self.assertTrue(result["stored"])

    def test_render_blueprint_mounts_the_paid_persistent_audio_disk(self):
        root = Path(__file__).resolve().parents[2]
        blueprint = yaml.safe_load((root / "render.yaml").read_text(encoding="utf-8"))
        service = blueprint["services"][0]
        self.assertEqual("/var/data/course-audio", service["disk"]["mountPath"])
        self.assertEqual(1, service["disk"]["sizeGB"])
        env = {item["key"]: item.get("value") for item in service["envVars"]}
        self.assertEqual("/var/data/course-audio", env["COURSE_AUDIO_STORAGE_DIR"])

    def test_legacy_learner_tts_routes_are_gone(self):
        from backend.app.main import read_course_audio, read_course_completion_audio

        with self.assertRaises(HTTPException) as ordinary:
            asyncio.run(read_course_audio("The boy."))
        with self.assertRaises(HTTPException) as completion:
            asyncio.run(read_course_completion_audio("It is a ___.", "It is a park.", "park"))
        self.assertEqual(410, ordinary.exception.status_code)
        self.assertEqual(410, completion.exception.status_code)


if __name__ == "__main__":
    unittest.main()
