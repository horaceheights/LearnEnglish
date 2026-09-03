import hashlib
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import main
from backend.app.persistent_audio_assets import (
    CATALOG_PATH,
    asset_index,
    elevenlabs_release_status,
)


class ReleaseStatusTests(unittest.TestCase):
    def test_audio_release_status_binds_readiness_to_exact_catalog(self):
        expected_assets = len(asset_index())
        with patch(
            "backend.app.persistent_audio_assets.elevenlabs_seed_status",
            return_value={
                "present": expected_assets,
                "copied": 0,
                "generated": 0,
                "missing": 0,
                "invalid": 0,
                "total": expected_assets,
                "errors": [],
            },
        ):
            status = elevenlabs_release_status()

        self.assertTrue(status["ready"])
        self.assertEqual(expected_assets, status["catalog_asset_count"])
        self.assertEqual(expected_assets, status["available"])
        self.assertEqual(
            hashlib.sha256(
                CATALOG_PATH.read_bytes().replace(b"\r\n", b"\n")
            ).hexdigest(),
            status["catalog_sha256"],
        )

    def test_audio_release_status_fails_closed_on_incomplete_seed(self):
        expected_assets = len(asset_index())
        with patch(
            "backend.app.persistent_audio_assets.elevenlabs_seed_status",
            return_value={
                "present": expected_assets - 1,
                "copied": 0,
                "generated": 0,
                "missing": 1,
                "invalid": 0,
                "total": expected_assets,
                "errors": ["one asset is missing"],
            },
        ):
            status = elevenlabs_release_status()

        self.assertFalse(status["ready"])
        self.assertEqual(1, status["missing"])
        self.assertEqual(1, status["error_count"])

    def test_api_publicly_reports_production_render_identity(self):
        ready_audio = {
            "ready": True,
            "catalog_sha256": "a" * 64,
            "catalog_asset_count": 4915,
            "profile_id": "a1-elevenlabs-character-cast-v1",
            "available": 4915,
            "missing": 0,
            "invalid": 0,
            "error_count": 0,
        }
        render_environment = {
            "APP_ENVIRONMENT": "production",
            "RENDER_GIT_BRANCH": "main",
            "RENDER_GIT_COMMIT": "b" * 40,
            "RENDER_SERVICE_NAME": "learnenglish",
        }
        with TestClient(main.app) as client, patch.object(
            main, "APP_API_KEY", "preview-app-key"
        ), patch.dict(os.environ, render_environment, clear=False), patch.object(
            main, "persistent_elevenlabs_release_status", return_value=ready_audio
        ):
            response = client.get("/api/release/status")

        self.assertEqual(200, response.status_code)
        self.assertEqual("production", response.json()["environment"])
        self.assertEqual("main", response.json()["git_branch"])
        self.assertEqual("b" * 40, response.json()["git_commit"])
        self.assertEqual(ready_audio, response.json()["audio"])


if __name__ == "__main__":
    unittest.main()
