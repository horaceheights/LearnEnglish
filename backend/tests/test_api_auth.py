import unittest
from pathlib import Path

from backend.app.api_auth import api_request_is_authorized


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def authorized(
    path: str,
    *,
    configured_app_key: str = "",
    configured_admin_key: str = "",
    provided_app_key: str | None = None,
    provided_admin_key: str | None = None,
) -> bool:
    return api_request_is_authorized(
        path,
        configured_app_key=configured_app_key,
        configured_admin_key=configured_admin_key,
        provided_app_key=provided_app_key,
        provided_admin_key=provided_admin_key,
    )


class ApiKeyGuardTests(unittest.TestCase):
    def test_unconfigured_app_key_keeps_legacy_clients_working(self):
        self.assertTrue(authorized("/api/lessons"))

    def test_configured_app_key_rejects_missing_and_wrong_keys(self):
        self.assertFalse(authorized("/api/lessons", configured_app_key="expected-app-key"))
        self.assertFalse(
            authorized(
                "/api/lessons",
                configured_app_key="expected-app-key",
                provided_app_key="wrong-app-key",
            )
        )

    def test_configured_app_key_accepts_header_or_audio_query_key(self):
        self.assertTrue(
            authorized(
                "/api/lessons",
                configured_app_key="expected-app-key",
                provided_app_key="expected-app-key",
            )
        )
        self.assertTrue(
            authorized(
                "/api/audio/course.mp3",
                configured_app_key="expected-app-key",
                provided_app_key="expected-app-key",
            )
        )

    def test_admin_key_can_authorize_server_side_mutations(self):
        self.assertTrue(
            authorized(
                "/api/users/learner-id/activity",
                configured_app_key="expected-app-key",
                configured_admin_key="expected-admin-key",
                provided_admin_key="expected-admin-key",
            )
        )

    def test_admin_routes_fail_closed_and_require_the_admin_key(self):
        self.assertFalse(
            authorized(
                "/api/admin/summary",
                configured_app_key="expected-app-key",
                provided_app_key="expected-app-key",
            )
        )
        self.assertTrue(
            authorized(
                "/api/admin/summary",
                configured_app_key="expected-app-key",
                configured_admin_key="expected-admin-key",
                provided_admin_key="expected-admin-key",
            )
        )


class ApiKeyConfigurationGuardTests(unittest.TestCase):
    def test_deployment_manifest_declares_both_backend_keys_as_secrets(self):
        manifest = (PROJECT_ROOT / "render.yaml").read_text(encoding="utf-8")

        self.assertRegex(manifest, r"- key: APP_API_KEY\s+sync: false")
        self.assertRegex(manifest, r"- key: ADMIN_API_KEY\s+sync: false")

    def test_frontend_admin_key_has_no_source_code_fallback(self):
        source = (PROJECT_ROOT / "frontend" / "lib" / "adminApi.js").read_text(encoding="utf-8")

        self.assertIn("process.env.ADMIN_API_KEY", source)
        self.assertNotRegex(source, r'ADMIN_API_KEY\s*\|\|\s*["\']')


if __name__ == "__main__":
    unittest.main()
