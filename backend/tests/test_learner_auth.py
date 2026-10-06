import time
import unittest
from unittest.mock import MagicMock, patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from fastapi import HTTPException
from starlette.requests import Request

from backend.app.learner_auth import Identity, authenticate, first_name


class ClerkVerificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.public = cls.private.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()

    def verify(self, claims):
        token = jwt.encode(claims, self.private, algorithm="RS256", headers={"kid": "test-key"})
        request = Request({"type": "http", "method": "GET", "scheme": "https", "path": "/api/account",
                           "server": ("api.example.com", 443), "query_string": b"", "headers": [(b"authorization", f"Bearer {token}".encode())]})
        with patch.dict("os.environ", {"CLERK_SECRET_KEY": "sk_test_fake", "CLERK_JWT_KEY": self.public,
            "CLERK_ISSUER": "https://test.clerk.accounts.dev", "CLERK_AUTHORIZED_PARTIES": "http://localhost:3000"}):
            return authenticate(request)

    def claims(self, **changes):
        now = int(time.time())
        return {"iss": "https://test.clerk.accounts.dev", "sub": "user_alice", "sid": "sess_test",
                "exp": now + 60, "iat": now - 1, "nbf": now - 1, "azp": "http://localhost:3000", **changes}

    def test_web_and_native_session_tokens(self):
        self.assertEqual("user_alice", self.verify(self.claims()).subject)
        native = self.claims(); del native["azp"]
        self.assertEqual("user_alice", self.verify(native).subject)

    def test_wrong_issuer_origin_expiry_and_machine_tokens_are_rejected(self):
        for claims in (self.claims(iss="https://other.clerk.accounts.dev"), self.claims(azp="https://intruder.example"),
                       self.claims(exp=int(time.time()) - 60), self.claims(sid="")):
            with self.subTest(claims=claims), self.assertRaises(HTTPException) as caught:
                self.verify(claims)
            self.assertEqual(401, caught.exception.status_code)

    def test_provider_first_name_uses_verified_subject_and_bounded_optional_lookup(self):
        with patch("clerk_backend_api.Clerk") as sdk, patch.dict("os.environ", {"CLERK_SECRET_KEY": "sk_test_fake"}):
            sdk.return_value.__enter__.return_value.users.get.return_value = MagicMock(first_name=" Horacio ")
            self.assertEqual("Horacio", first_name(Identity("verified-issuer", "verified-subject")))
            sdk.return_value.__enter__.return_value.users.get.assert_called_once_with(
                user_id="verified-subject", timeout_ms=2000, retries=None)

    def test_missing_name_and_provider_failure_keep_course_available(self):
        with patch("clerk_backend_api.Clerk") as sdk, patch.dict("os.environ", {"CLERK_SECRET_KEY": "sk_test_fake"}):
            get = sdk.return_value.__enter__.return_value.users.get
            for value in (None, "", "   "):
                get.return_value = MagicMock(first_name=value)
                self.assertIsNone(first_name(Identity("issuer", "subject")))
            get.side_effect = TimeoutError("Provider unavailable")
            self.assertIsNone(first_name(Identity("issuer", "subject")))


if __name__ == "__main__":
    unittest.main()
