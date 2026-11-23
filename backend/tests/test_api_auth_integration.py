import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import main


class ApiKeyMiddlewareIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(main.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_legacy_and_enforced_app_key_modes_reach_real_routes(self):
        with patch.object(main, "APP_API_KEY", ""), patch.object(main, "ADMIN_API_KEY", ""):
            legacy_response = self.client.get("/api/lessons")

        with patch.object(main, "APP_API_KEY", "expected-app-key"), patch.object(main, "ADMIN_API_KEY", ""):
            missing_response = self.client.get("/api/lessons")
            header_response = self.client.get("/api/lessons", headers={"X-App-Key": "expected-app-key"})
            query_response = self.client.get("/api/lessons", params={"key": "expected-app-key"})

        self.assertEqual(200, legacy_response.status_code)
        self.assertEqual(401, missing_response.status_code)
        self.assertEqual(200, header_response.status_code)
        self.assertEqual(200, query_response.status_code)

    def test_admin_key_authorizes_existing_server_side_mutation_route(self):
        with patch.object(main, "APP_API_KEY", "expected-app-key"), patch.object(
            main, "ADMIN_API_KEY", "expected-admin-key"
        ):
            response = self.client.delete(
                "/api/users/missing-learner/activity",
                headers={"X-Admin-Key": "expected-admin-key"},
            )

        self.assertEqual(404, response.status_code)
        self.assertNotEqual("Not authorized.", response.json().get("detail"))

    def test_admin_routes_still_fail_closed_when_admin_key_is_unset(self):
        with patch.object(main, "APP_API_KEY", "expected-app-key"), patch.object(main, "ADMIN_API_KEY", ""):
            response = self.client.get("/api/admin/summary", headers={"X-App-Key": "expected-app-key"})

        self.assertEqual(401, response.status_code)


if __name__ == "__main__":
    unittest.main()
