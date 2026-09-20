import hashlib
from pathlib import Path
import tempfile
import unittest

from scripts.audit_action_video_bindings import check_binding


class ActionVideoBindingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.binding = dict(source='source.webp', video='clip-v3.mp4', poster='poster-v3.webp', bundled=True)
        for kind in ('source', 'video', 'poster'):
            data = ('reviewed-' + kind).encode()
            self.binding[kind + '_sha256'] = hashlib.sha256(data).hexdigest()
            folders = ['frontend/public/lesson-assets', 'mobile/assets/lesson-videos'] if kind == 'video' else [
                'frontend/public/lesson-assets', 'mobile/assets/lesson-assets', 'Lessons/Lesson1/images']
            for folder in folders:
                path = self.root / folder / self.binding[kind]
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)

    def check(self, **overrides):
        values = dict(mapped_video=self.binding['video'], source_name=self.binding['source'], poster_name=self.binding['poster'])
        return check_binding(self.root, 'scene', self.binding, **(values | overrides))

    def test_unchanged_reviewed_pair_passes(self):
        self.assertEqual(self.check(), [])

    def test_refreshing_photo_cannot_leave_old_video(self):
        (self.root / 'frontend/public/lesson-assets/source.webp').write_bytes(b'new-photo')
        self.assertTrue(any('source changed' in error for error in self.check()))

    def test_replacing_clip_cannot_reuse_old_review(self):
        (self.root / 'frontend/public/lesson-assets/clip-v3.mp4').write_bytes(b'new-video')
        self.assertTrue(any('video changed' in error for error in self.check()))

    def test_independent_poster_refresh_is_rejected(self):
        (self.root / 'Lessons/Lesson1/images/poster-v3.webp').write_bytes(b'new-poster')
        self.assertTrue(any('poster changed' in error for error in self.check()))

    def test_stale_mobile_video_is_rejected(self):
        (self.root / 'mobile/assets/lesson-videos/clip-v3.mp4').write_bytes(b'old-video')
        self.assertTrue(any('mobile/assets/lesson-videos' in error for error in self.check()))

    def test_video_mapping_change_requires_review(self):
        self.assertTrue(any('mapping changed' in error for error in self.check(mapped_video='old-clip.mp4')))

    def test_removed_poster_mapping_requires_review(self):
        self.assertTrue(any('poster mapping changed' in error for error in self.check(poster_name=None)))


if __name__ == '__main__':
    unittest.main()
