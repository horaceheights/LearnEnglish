from contextlib import redirect_stdout
from io import StringIO
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from backend.app.data import LESSONS
from scripts import build_frontend_audio_manifest
from scripts.audit_course_audio_transcripts import selected_use_audio
from scripts.build_frontend_audio_manifest import (
    expected_audio_items,
    has_visual_completion_placeholder,
)


class AudioManifestGuardTests(unittest.TestCase):
    def test_ordinary_manifest_excludes_completion_prompts_but_keeps_full_answers(self):
        items = expected_audio_items()
        spoken_items = {(text, mode, lang, variant) for text, mode, lang, variant in items}

        self.assertFalse(
            any(has_visual_completion_placeholder(text) for text, _mode, _lang, _variant in items)
        )

        completion_answers = []
        for lesson in LESSONS.values():
            for card in lesson.cards:
                raw_prompt = card.audio_text if card.audio_text is not None else card.prompt
                if not (
                    has_visual_completion_placeholder(card.prompt)
                    or has_visual_completion_placeholder(raw_prompt)
                ):
                    continue
                self.assertTrue(card.answer_audio_text)
                completion_answers.append(card.answer_audio_text.strip())

        self.assertTrue(completion_answers)
        for answer in completion_answers:
            with self.subTest(answer=answer):
                self.assertIn((answer, "prompt", "en-US", "answer"), spoken_items)

    def test_transcript_audit_excludes_masked_prompts_but_keeps_full_answers(self):
        lesson_ids = set(LESSONS)
        audited = selected_use_audio(lesson_ids)
        audited_items = {(text, variant) for text, variant, _source in audited}

        self.assertFalse(
            any(has_visual_completion_placeholder(text) for text, _variant, _source in audited)
        )

        completion_answers = {
            card.answer_audio_text.strip()
            for lesson in LESSONS.values()
            for card in lesson.cards
            if card.stage == "Use"
            and has_visual_completion_placeholder(card.prompt)
            and card.answer_audio_text
        }
        self.assertTrue(completion_answers)
        self.assertTrue(
            all((answer, "answer") in audited_items for answer in completion_answers)
        )

    def test_missing_audio_prunes_only_forbidden_entries_and_orphaned_files(self):
        with TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            frontend_cache = root / "frontend" / "public" / "audio-cache"
            frontend_cache.mkdir(parents=True)
            manifest_path = root / "frontend" / "lib" / "courseAudioManifest.json"
            manifest_path.parent.mkdir(parents=True)

            retained_key = "Known good\nprompt\nen-US\nprompt"
            placeholder_key = "It is ...\nprompt\nen-US\nprompt"
            shared_placeholder_key = "They ___ reading.\nprompt\nen-US\nprompt"
            manifest_path.write_text(
                json.dumps(
                    {
                        retained_key: "shared.mp3",
                        placeholder_key: "placeholder-only.mp3",
                        shared_placeholder_key: "shared.mp3",
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            shared_audio = frontend_cache / "shared.mp3"
            placeholder_audio = frontend_cache / "placeholder-only.mp3"
            shared_audio.write_bytes(b"known-good-audio")
            placeholder_audio.write_bytes(b"forbidden-placeholder-audio")

            with (
                patch.object(build_frontend_audio_manifest, "ROOT", root),
                patch.object(
                    build_frontend_audio_manifest,
                    "expected_audio_items",
                    return_value={("Missing", "prompt", "en-US", "prompt")},
                ),
                patch.object(
                    build_frontend_audio_manifest,
                    "cache_path_for",
                    return_value=root / "backend" / "storage" / "audio-cache" / "missing.mp3",
                ),
                redirect_stdout(StringIO()) as output,
            ):
                self.assertEqual(1, build_frontend_audio_manifest.main())

            self.assertEqual({retained_key: "shared.mp3"}, json.loads(manifest_path.read_text()))
            self.assertEqual(b"known-good-audio", shared_audio.read_bytes())
            self.assertFalse(placeholder_audio.exists())
            result = json.loads(output.getvalue())
            self.assertEqual(2, result["pruned_placeholder_entries"])
            self.assertEqual(1, result["pruned_placeholder_files"])


if __name__ == "__main__":
    unittest.main()
