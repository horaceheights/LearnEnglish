import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import ModuleType
import unittest
from unittest.mock import Mock, patch

from scripts import sync_media_to_r2 as publisher


class ClientError(Exception):
    def __init__(self, response, operation):
        self.response = response
        super().__init__(operation)


class CreateOnlyMediaPublicationTests(unittest.TestCase):
    def exercise(self, head, upload_error=None):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "image.webp"
            source.write_bytes(b"exact approved bytes")
            client = Mock()
            if isinstance(head, Exception):
                client.head_object.side_effect = head
            else:
                client.head_object.return_value = head
            if upload_error:
                client.put_object.side_effect = upload_error
            manifest = root / "manifest.json"
            env = dict(R2_ACCOUNT_ID="test", R2_ACCESS_KEY_ID="test", R2_SECRET_ACCESS_KEY="test",
                       R2_BUCKET="test", MEDIA_BASE_URL="https://example.test")
            # Publishing dependencies are operator-only; backend CI needs no
            # AWS SDK or real account for this atomic-write regression.
            boto3 = ModuleType("boto3")
            boto3.client = Mock(return_value=client)
            botocore = ModuleType("botocore")
            botocore.__path__ = []
            config = ModuleType("botocore.config")
            config.Config = Mock()
            exceptions = ModuleType("botocore.exceptions")
            exceptions.ClientError = ClientError
            with patch.object(publisher, "ROOT", root), patch.object(publisher, "MANIFEST_PATH", manifest), \
                 patch.object(publisher, "load_env", return_value=env), \
                 patch.object(publisher, "collect", return_value=[(source, "lesson-assets/image.webp")]), \
                 patch.dict("sys.modules", {"boto3": boto3, "botocore": botocore,
                            "botocore.config": config, "botocore.exceptions": exceptions}), \
                 patch("sys.argv", ["publisher", "--apply", "--create-only"]):
                result = publisher.main()
            return result, client, json.loads(manifest.read_text()) if manifest.exists() else None

    def test_existing_different_object_is_never_replaced(self):
        result, client, manifest = self.exercise({"Metadata": {"sha256": "different"}})
        self.assertEqual(result, 1)
        client.put_object.assert_not_called()
        self.assertIsNone(manifest)

    def test_new_object_uses_an_atomic_create_precondition(self):
        missing = ClientError({"Error": {"Code": "404"}}, "HeadObject")
        result, client, manifest = self.exercise(missing)
        self.assertEqual(result, 0)
        self.assertEqual(client.put_object.call_args.kwargs["IfNoneMatch"], "*")
        self.assertEqual(manifest["object_count"], 1)

    def test_competing_writer_cannot_be_overwritten_or_certified(self):
        missing = ClientError({"Error": {"Code": "404"}}, "HeadObject")
        conflict = ClientError({"Error": {"Code": "PreconditionFailed"}}, "PutObject")
        result, client, manifest = self.exercise(missing, conflict)
        self.assertEqual(result, 1)
        self.assertIsNone(manifest)
        self.assertEqual(client.put_object.call_count, 1)
