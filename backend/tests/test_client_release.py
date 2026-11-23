import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from backend.app import main, tracking


class ClientReleaseTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.addCleanup(engine.dispose)
        self.engine_patch = patch.object(tracking, "engine", engine)
        self.engine_patch.start()
        self.addCleanup(self.engine_patch.stop)
        tracking.init_db()
        for name, value in (("APP_API_KEY", "test-app"), ("ADMIN_API_KEY", "test-admin")):
            patcher = patch.object(main, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.client = TestClient(main.app, headers={"X-App-Key": "test-app"})
        self.addCleanup(self.client.close)

    def report(self, commit="abc1234", version="1.6.0"):
        return {"X-App-Version": version, "X-Release-Commit": commit}

    def learner(self):
        response = self.client.get("/api/admin/summary", headers={"X-Admin-Key": "test-admin"})
        self.assertEqual(200, response.status_code)
        return response.json()["learners"][0]

    def test_running_client_release_reaches_admin_on_login_restore_and_practice(self):
        response = self.client.post("/api/users", json={"display_name": "Ana"}, headers=self.report())
        self.assertEqual(200, response.status_code)
        user_id = response.json()["id"]
        self.assertEqual("abc1234", self.learner()["release_commit"])

        # Existing installations use a saved profile and load course progress.
        response = self.client.get(f"/api/users/{user_id}/lesson-progress", headers=self.report("def5678"))
        self.assertEqual(200, response.status_code)
        self.assertEqual("def5678", self.learner()["release_commit"])

        response = self.client.get("/api/users/by-name/Ana", headers=self.report("aabbccd", "0.1.0"))
        self.assertEqual(200, response.status_code)
        self.assertEqual("0.1.0", self.learner()["app_version"])
        self.assertEqual("aabbccd", self.learner()["release_commit"])

        session = self.client.post("/api/sessions", headers=self.report(), json={
            "user_id": user_id, "lesson_id": "lesson-1-people-actions", "total_cards": 10,
        })
        self.assertEqual(200, session.status_code)
        self.assertEqual("abc1234", self.learner()["release_commit"])
        session_id = session.json()["id"]
        response = self.client.patch(f"/api/sessions/{session_id}/finish", headers=self.report("1122334"),
                                     json={"score": 8, "total_cards": 10})
        self.assertEqual(200, response.status_code)
        learner = self.learner()
        self.assertEqual("1122334", learner["release_commit"])
        self.assertEqual(1, learner["completed_sessions"])

    def test_legacy_clients_still_work_and_release_reports_respect_access_control(self):
        response = self.client.post("/api/users", json={"display_name": "Legacy"})
        self.assertEqual(200, response.status_code)
        user_id = response.json()["id"]
        self.assertIsNone(self.learner()["app_version"])
        self.assertIsNone(self.learner()["release_commit"])
        response = self.client.get(f"/api/users/{user_id}/lesson-progress", headers={
            **self.report(), "X-App-Key": "wrong-key",
        })
        self.assertEqual(401, response.status_code)
        self.assertIsNone(self.learner()["release_commit"])


if __name__ == "__main__":
    unittest.main()
