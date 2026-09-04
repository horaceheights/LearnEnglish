import json
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi import HTTPException
import yaml

from backend.app import main
from backend.app.course_audio_profile import NEUTRAL_SPEAKER_ROLES
from backend.app.course_audio_registry import load_approved_take_registry
from backend.app.persistent_audio_assets import (
    CATALOG_PATH,
    LEGACY_AUDIO_DIR,
    LEGACY_MANIFEST_PATH,
    asset_index,
    elevenlabs_storage_dir,
    read_asset,
    seed_static_assets,
    storage_status,
)


ROOT = Path(__file__).resolve().parents[2]
PREVIEW_AUDIO_COMMIT = "02719023db8b737bb0695aa7c6ff303f2257d4f6"


class PersistentAudioCompatibilityTests(unittest.TestCase):
    def test_catalog_is_the_complete_published_preview_contract(self):
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

        self.assertEqual(PREVIEW_AUDIO_COMMIT, catalog["source_commit"])
        self.assertEqual(70, catalog["lesson_count"])
        self.assertEqual(4923, catalog["asset_count"])
        self.assertEqual(3916, catalog["registry_asset_count"])
        self.assertEqual(1007, catalog["legacy_manifest_asset_count"])
        self.assertEqual(catalog["asset_count"], len(asset_index()))

        hello = asset_index()[
            "lesson-3-1-greetings-and-names-c001-prompt-ac3a343d313d0ea983c8"
        ]
        self.assertEqual("Hello.", hello.text)
        self.assertEqual("ana", hello.speaker_role)
        self.assertEqual(2, hello.revision)
        self.assertEqual(
            "/lesson-assets/a1_scene_hello-ana-speaker_591cb45.webp",
            hello.image_ref,
        )

    def test_every_catalog_asset_has_reviewed_repository_audio(self):
        registry = load_approved_take_registry()
        manifest = json.loads(LEGACY_MANIFEST_PATH.read_text(encoding="utf-8"))
        unavailable = []

        for asset in asset_index().values():
            if asset.id in registry["bindings"]:
                continue
            key = "\n".join([asset.text, asset.mode, "en-US", asset.variant])
            source_name = manifest.get(key)
            source = LEGACY_AUDIO_DIR / source_name if isinstance(source_name, str) else None
            if (
                asset.speaker_role not in NEUTRAL_SPEAKER_ROLES
                or asset.variant == "completion-prompt"
                or source is None
                or not source.is_file()
                or source.stat().st_size <= 0
            ):
                unavailable.append(asset.id)

        self.assertEqual([], unavailable)

    def test_seed_is_idempotent_for_registry_and_legacy_assets(self):
        registry = load_approved_take_registry()
        indexed = asset_index()
        registry_asset = next(
            asset
            for asset in indexed.values()
            if asset.id in registry["bindings"] and asset.speaker_role not in NEUTRAL_SPEAKER_ROLES
        )
        legacy_asset = next(asset for asset in indexed.values() if asset.id not in registry["bindings"])
        sample = {asset.id: asset for asset in (registry_asset, legacy_asset)}

        with TemporaryDirectory() as directory, patch.dict(
            os.environ, {"COURSE_AUDIO_STORAGE_DIR": directory}
        ), patch(
            "backend.app.persistent_audio_assets.asset_index", return_value=sample
        ):
            first = seed_static_assets()
            second = seed_static_assets()
            inventory = storage_status()
            response = read_asset(registry_asset.id)

        self.assertEqual(2, first["copied"])
        self.assertEqual(0, first["missing"])
        self.assertEqual(0, first["invalid"])
        self.assertEqual([], first["registry_errors"])
        self.assertEqual(2, second["present"])
        self.assertEqual(2, inventory["available"])
        self.assertEqual("audio/mpeg", response.media_type)
        self.assertEqual(
            "public, max-age=31536000, immutable",
            response.headers["cache-control"],
        )

    def test_missing_asset_fails_closed_without_provider_generation(self):
        asset_id = next(iter(asset_index()))
        with TemporaryDirectory() as directory, patch.dict(
            os.environ, {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            with self.assertRaises(HTTPException) as raised:
                read_asset(asset_id)
        self.assertEqual(503, raised.exception.status_code)

    def test_shared_backend_exposes_persistent_and_legacy_production_routes(self):
        paths = {route.path for route in main.app.routes}
        self.assertIn("/api/audio/assets/{asset_id}.mp3", paths)
        self.assertIn("/api/audio/assets-v2/{asset_id}.mp3", paths)
        self.assertIn("/api/audio/course.mp3", paths)
        self.assertIn("/api/audio/course-completion.mp3", paths)

    def test_render_blueprint_mounts_one_gigabyte_audio_disk(self):
        blueprint = yaml.safe_load((ROOT / "render.yaml").read_text(encoding="utf-8"))
        service = blueprint["services"][0]
        self.assertEqual("main", service["branch"])
        self.assertEqual("/var/data/course-audio", service["disk"]["mountPath"])
        self.assertEqual(1, service["disk"]["sizeGB"])
        env = {item["key"]: item.get("value") for item in service["envVars"]}
        self.assertEqual("production", env["APP_ENVIRONMENT"])
        self.assertEqual("/var/data/course-audio", env["COURSE_AUDIO_STORAGE_DIR"])

    def test_elevenlabs_assets_use_a_cache_busted_subdirectory(self):
        with patch.dict(os.environ, {"COURSE_AUDIO_STORAGE_DIR": "/var/data/course-audio"}):
            self.assertEqual(
                Path("/var/data/course-audio/elevenlabs-v2"),
                elevenlabs_storage_dir(),
            )


if __name__ == "__main__":
    unittest.main()
