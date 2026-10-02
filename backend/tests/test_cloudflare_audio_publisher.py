import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import MagicMock

from scripts.sync_course_audio_to_r2 import restore_published_pair


class CloudflareAudioPublisherTests(unittest.TestCase):
    def setUp(self):
        self.audio = b'preserved recording bytes'
        self.receipt = b'preserved immutable receipt'
        def descriptor(payload):
            return {'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()}
        self.entry = {'key':'course-audio/elevenlabs-v2/immutable-id.mp3',
                      'audio':descriptor(self.audio),'receipt':descriptor(self.receipt)}

    def test_interrupted_recovery_fetches_only_missing_receipt(self):
        with TemporaryDirectory() as directory:
            path = Path(directory)/'immutable-id.mp3'
            path.write_bytes(self.audio)
            client = MagicMock()
            client.download_file.side_effect = lambda bucket,key,dest: Path(dest).write_bytes(self.receipt)
            restore_published_pair(client,'bucket',path,self.entry)
            client.download_file.assert_called_once_with('bucket','course-audio/elevenlabs-v2/immutable-id.json',str(path.with_suffix('.json')))
            self.assertEqual(self.audio,path.read_bytes())

    def test_changed_remote_pair_cannot_redefine_immutable_ownership(self):
        with TemporaryDirectory() as directory:
            path = Path(directory)/'immutable-id.mp3'
            client = MagicMock()
            client.download_file.side_effect = lambda bucket,key,dest: Path(dest).write_bytes(b'changed remote bytes')
            with self.assertRaisesRegex(RuntimeError,'checksum mismatch'):
                restore_published_pair(client,'bucket',path,self.entry)

    def test_valid_existing_pair_is_never_downloaded_or_overwritten(self):
        with TemporaryDirectory() as directory:
            path = Path(directory)/'immutable-id.mp3'
            path.write_bytes(self.audio)
            path.with_suffix('.json').write_bytes(self.receipt)
            client = MagicMock()
            restore_published_pair(client,'bucket',path,self.entry)
            client.download_file.assert_not_called()

if __name__ == '__main__':
    unittest.main()
