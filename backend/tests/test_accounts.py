import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from backend.app import accounts, learner_auth, main, tracking
from backend.app.data import LESSONS


class AccountIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.patches = [patch.object(tracking, "engine", self.engine), patch.object(main, "APP_API_KEY", ""),
                        patch.object(main, "ADMIN_API_KEY", "operator"),
                        patch.object(learner_auth, "authenticate", side_effect=self.identity)]
        for item in self.patches:
            item.start()
        tracking.init_db()
        self.client = TestClient(main.app)
        self.alice = self.client.get("/api/account", headers={"Authorization": "Bearer alice"}).json()
        self.bob = self.client.get("/api/account", headers={"Authorization": "Bearer bob"}).json()
        self.lesson = LESSONS["lesson-1-people-actions"]

    def tearDown(self):
        self.client.close()
        for item in reversed(self.patches):
            item.stop()
        self.engine.dispose()

    @staticmethod
    def identity(request):
        token = request.headers.get("authorization", "").removeprefix("Bearer ")
        if token not in ("alice", "bob"):
            raise HTTPException(401, "No session")
        return learner_auth.Identity("https://test.clerk.accounts.dev", token)

    def headers(self, person="alice"):
        snapshot = getattr(self, person)
        return {"Authorization": f"Bearer {person}", "X-Progress-Generation": snapshot["generation"]}

    def checkpoint_run(self, session="run-1"):
        return {"sessionId": session, "cardCount": len(self.lesson.cards), "contentRevision": self.lesson.content_revision,
                "cardIndex": 2, "furthestCardIndex": 2, "score": 2, "attemptedCards": [0, 1],
                "completedCards": [0, 1], "wrongCards": [], "completionPending": False}

    def result(self):
        return {"id": "run-1", "userId": self.alice["user"]["id"], "lessonId": self.lesson.id,
                "totalCards": 3, "initialScore": 1, "missedCards": [1, 2], "ungradedCards": [],
                "recoveredCards": [], "completedAt": "2026-10-05T10:00:00Z", "reviewAvailable": True}

    def test_identity_is_stable_and_names_do_not_claim_other_accounts(self):
        again = self.client.get("/api/account", headers=self.headers()).json()
        self.assertEqual(self.alice["user"]["id"], again["user"]["id"])
        self.assertNotEqual(self.alice["user"]["id"], self.bob["user"]["id"])
        legacy = tracking.create_or_update_user(tracking.UserCreate(display_name="Old learner"))
        response = self.client.get(f'/api/users/{legacy["id"]}', headers=self.headers())
        self.assertEqual(403, response.status_code)

    def test_browser_preflight_and_authentication_failure_have_cors_headers(self):
        with patch.object(main, "APP_API_KEY", "application-key"):
            response = self.client.options("/api/account", headers={
                "Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization,x-app-key,x-progress-generation"})
            self.assertEqual(200, response.status_code)
            self.assertEqual("http://localhost:3000", response.headers["access-control-allow-origin"])
            denied = self.client.get("/api/account", headers={"Origin": "http://localhost:3000"})
            self.assertEqual(401, denied.status_code)
            self.assertEqual("http://localhost:3000", denied.headers["access-control-allow-origin"])

    def test_client_key_and_other_identity_cannot_read_or_mutate_owned_data(self):
        user_id = self.alice["user"]["id"]
        for headers in ({}, self.headers("bob")):
            self.assertIn(self.client.get(f"/api/users/{user_id}", headers=headers).status_code, (401, 403))
            self.assertIn(self.client.put(f"/api/users/{user_id}", headers=headers,
                json={"display_name": "Intruder"}).status_code, (401, 403))
        self.assertEqual(401, self.client.get("/api/users/by-name/Student").status_code)
        self.assertEqual(401, self.client.post("/api/users", json={"display_name": "Student"}).status_code)

    def test_profile_compare_and_set_and_server_qa_access(self):
        response = self.client.put("/api/account/profile", headers=self.headers(), json={
            "display_name": "Alice", "profile": {"qaAccess": True, "userId": self.bob["user"]["id"]}, "version": 1})
        self.assertEqual(200, response.status_code)
        self.assertFalse(response.json()["qaAccess"])
        self.assertNotIn("qaAccess", response.json()["user"]["profile"])
        stale = self.client.put("/api/account/profile", headers=self.headers(), json={"display_name": "Old", "version": 1})
        self.assertEqual(409, stale.status_code)

    def test_checkpoint_conflict_and_lost_acknowledgement_retry(self):
        path = f"/api/account/checkpoints/{self.lesson.id}"
        first = self.client.put(path, headers=self.headers(), json={"run": self.checkpoint_run(), "revision": 0})
        self.assertEqual(200, first.status_code, first.text)
        retry = self.client.put(path, headers=self.headers(), json={"run": self.checkpoint_run(), "revision": 0})
        self.assertEqual(1, retry.json()["revision"])
        changed = {**self.checkpoint_run(), "cardIndex": 3, "furthestCardIndex": 3}
        stale = self.client.put(path, headers=self.headers(), json={"run": changed, "revision": 0})
        self.assertEqual(409, stale.status_code)
        self.assertEqual(self.checkpoint_run(), stale.json()["detail"]["run"])
        delete = self.client.put(path, headers=self.headers(), json={"run": None, "revision": 1})
        self.assertEqual(2, delete.json()["revision"])
        self.assertEqual(409, self.client.put(path, headers=self.headers(), json={"run": self.checkpoint_run(), "revision": 1}).status_code)

    def test_checkpoint_revision_validation(self):
        path = f"/api/account/checkpoints/{self.lesson.id}"
        run = {**self.checkpoint_run(), "contentRevision": self.lesson.content_revision - 1}
        self.assertEqual(409, self.client.put(path, headers=self.headers(), json={"run": run, "revision": 0}).status_code)

    def test_results_pull_and_union_keep_initial_attempt(self):
        initial = self.result()
        self.assertEqual(200, self.client.put("/api/lesson-results/run-1", headers=self.headers(), json=initial).status_code)
        for recovered in ([1], [2], [1]):
            response = self.client.put("/api/lesson-results/run-1", headers=self.headers(), json={**initial, "recoveredCards": recovered})
            self.assertEqual(200, response.status_code)
        snapshot = self.client.get("/api/account", headers=self.headers()).json()
        self.assertEqual([1, 2], snapshot["results"][0]["recoveredCards"])
        self.assertEqual(1, snapshot["results"][0]["initialScore"])
        self.assertEqual(403, self.client.put("/api/lesson-results/run-1", headers=self.headers("bob"), json=initial).status_code)

    def test_reset_rejects_stale_queue_inside_write_transaction(self):
        user_id = self.alice["user"]["id"]
        self.assertEqual(200, self.client.delete(f"/api/users/{user_id}/activity", headers={"X-Admin-Key": "operator"}).status_code)
        stale = self.client.put("/api/lesson-results/run-1", headers=self.headers(), json=self.result())
        self.assertEqual(409, stale.status_code)
        response = self.client.post("/api/sessions", headers=self.headers(), json={"id": "old-run", "user_id": user_id, "lesson_id": self.lesson.id, "total_cards": 3})
        self.assertEqual(409, response.status_code)
        self.assertEqual([], self.client.get("/api/account", headers=self.headers()).json()["results"])

    def test_delete_revokes_provider_and_tombstone_blocks_recreation(self):
        with patch.object(learner_auth, "delete_identity") as revoke:
            response = self.client.delete("/api/account", headers=self.headers())
        self.assertEqual(200, response.status_code)
        revoke.assert_called_once()
        self.assertEqual(410, self.client.get("/api/account", headers=self.headers()).status_code)

    def test_signed_provider_deletion_is_idempotent_and_unsigned_requests_fail(self):
        import base64
        import json
        from datetime import datetime, timezone
        from svix.webhooks import Webhook
        secret = 'whsec_' + base64.b64encode(b'test-secret-with-at-least-32-bytes').decode()
        payload = json.dumps({"type": "user.deleted", "data": {"id": "alice"}})
        timestamp = datetime.now(timezone.utc)
        headers = {"svix-id": "msg_test", "svix-timestamp": str(int(timestamp.timestamp())),
                   "svix-signature": Webhook(secret).sign("msg_test", timestamp, payload)}
        with patch.dict(os.environ, {"CLERK_WEBHOOK_SIGNING_SECRET": secret, "CLERK_ISSUER": "https://test.clerk.accounts.dev"}), patch.object(main, "APP_API_KEY", "private-app-key"):
            self.assertEqual(400, self.client.post('/api/webhooks/clerk', content=payload).status_code)
            self.assertEqual(200, self.client.get('/api/account', headers={**self.headers(), "X-App-Key": "private-app-key"}).status_code)
            for _ in range(2):
                response = self.client.post('/api/webhooks/clerk', content=payload, headers=headers)
                self.assertEqual(200, response.status_code, response.text)
            self.assertEqual(410, self.client.get('/api/account', headers={**self.headers(), "X-App-Key": "private-app-key"}).status_code)
        self.assertIsNone(tracking.get_user(self.alice['user']['id']))

    def test_provider_deletion_before_first_login_blocks_late_session(self):
        from backend.app.clerk_webhooks import erase_identity
        erase_identity('https://test.clerk.accounts.dev', 'never-opened')
        with self.assertRaises(HTTPException) as rejected:
            accounts.ensure_account(learner_auth.Identity('https://test.clerk.accounts.dev', 'never-opened'))
        self.assertEqual(410, rejected.exception.status_code)


if __name__ == "__main__":
    unittest.main()
