import re
import unittest
from array import array
from contextlib import redirect_stdout
from io import StringIO
import math
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from backend.app.course_audio import (
    AUDIO_PROFILE_VERSION,
    COURSE_SYLLABLES,
    ING_PRONUNCIATION_NOTES,
    audio_instructions,
    _median_fundamental_hz,
    _normalize_pitch,
    cache_path_for,
    normalized_provider,
    premium_voice_for_narrator,
    syllable_count,
    target_active_seconds,
    target_syllables_per_minute,
    voice_for_variant,
)
from backend.app.data import LESSONS
from scripts import build_frontend_audio_manifest
from scripts.build_frontend_audio_manifest import expected_audio_items


class CourseAudioProfileTests(unittest.TestCase):
    def test_every_current_spoken_word_has_an_audited_syllable_count(self):
        spoken_words: set[str] = set()
        for lesson in LESSONS.values():
            for card in lesson.cards:
                prompt_audio = card.audio_text if card.audio_text is not None else card.prompt
                texts = [prompt_audio, card.answer_audio_text or ""]
                for text in texts:
                    spoken_words.update(re.findall(r"[a-z']+", text.lower()))

        self.assertEqual(set(), spoken_words - COURSE_SYLLABLES.keys())
        self.assertEqual(
            set(),
            {word for word in spoken_words if word.endswith("ing")} - ING_PRONUNCIATION_NOTES.keys(),
        )

    def test_lesson_one_reference_phrases_use_syllable_timing(self):
        self.assertEqual(2, syllable_count("The boy"))
        self.assertEqual(5, syllable_count("The girl is writing."))
        self.assertEqual(8, syllable_count("The boy and the girl are running."))
        self.assertEqual(9, syllable_count("The girl and the woman are writing."))

    def test_new_speak_stage_is_included_in_the_static_audio_manifest(self):
        expected = expected_audio_items()
        phrases = {
            "The boy is running.",
            "The girl is walking.",
            "The man is sitting.",
            "The woman is standing.",
        }

        for phrase in phrases:
            with self.subTest(phrase=phrase):
                self.assertIn((phrase, "pronunciation_slow", "en-US", "split-ing"), expected)

    def test_incomplete_audio_cache_does_not_replace_the_static_bundle(self):
        with TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            static_cache = root / "frontend" / "public" / "audio-cache"
            static_cache.mkdir(parents=True)
            existing_audio = static_cache / "existing.mp3"
            existing_audio.write_bytes(b"known-good-audio")
            manifest_path = root / "frontend" / "lib" / "courseAudioManifest.json"
            manifest_path.parent.mkdir(parents=True)
            manifest_path.write_text('{"existing": "existing.mp3"}\n', encoding="utf-8")

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
                redirect_stdout(StringIO()),
            ):
                self.assertEqual(1, build_frontend_audio_manifest.main())

            self.assertEqual(b"known-good-audio", existing_audio.read_bytes())
            self.assertEqual(
                '{"existing": "existing.mp3"}\n',
                manifest_path.read_text(encoding="utf-8"),
            )

    def test_short_vocabulary_is_slower_than_full_sentence_pacing(self):
        self.assertEqual(120, target_syllables_per_minute("The man", "prompt", "default"))
        self.assertEqual(
            150,
            target_syllables_per_minute("The man is swimming.", "prompt", "default"),
        )
        self.assertEqual(
            125,
            target_syllables_per_minute("The man is swimming.", "pronunciation_slow", "split-ing"),
        )
        self.assertAlmostEqual(
            3.2,
            target_active_seconds("The boy and the girl are running.", "prompt", "default"),
        )
        self.assertAlmostEqual(
            3.6,
            target_active_seconds("The girl and the woman are writing.", "prompt", "default"),
        )

    def test_difficult_words_receive_explicit_pronunciation_direction(self):
        instructions = audio_instructions(
            "The boy and the girl are running.",
            "prompt",
            "en-US",
            "default",
        )
        self.assertIn("one natural diphthong", instructions)
        self.assertIn("R-colored vowel", instructions)
        self.assertIn("'running'", instructions)
        self.assertIn("brief and natural", instructions)
        self.assertIn("never accelerate", instructions)
        self.assertNotIn(
            "voiced TH in 'the'",
            audio_instructions("They are reading.", "prompt", "en-US", "default"),
        )

    def test_audio_profile_version_changes_the_cache_key(self):
        current = cache_path_for("The boy", "prompt", "en-US", "default", "model", "voice", "mp3")
        # The digest should not be the legacy key that omitted the profile version.
        import hashlib

        legacy = hashlib.sha256(
            "\n".join(["The boy", "prompt", "en-US", "default", "model", "voice", "mp3"]).encode("utf-8")
        ).hexdigest()
        self.assertNotEqual(f"{legacy}.mp3", current.name)
        self.assertEqual("a1-elevenlabs-cast-v14", AUDIO_PROFILE_VERSION)

    def test_only_supported_audio_providers_are_accepted(self):
        self.assertEqual("openai", normalized_provider("OpenAI"))
        self.assertEqual("elevenlabs", normalized_provider(" elevenlabs "))
        self.assertEqual("elevenlabs-premium", normalized_provider(" ElevenLabs-Premium "))
        self.assertEqual("azure", normalized_provider(" Azure "))

    def test_premium_cast_has_distinct_male_and_female_narrators(self):
        voices = {
            premium_voice_for_narrator("female-teacher"),
            premium_voice_for_narrator("female-warm"),
            premium_voice_for_narrator("male-warm"),
            premium_voice_for_narrator("male-conversational"),
        }
        self.assertEqual(4, len(voices))

    def test_every_variant_uses_the_same_teacher_voice(self):
        self.assertEqual(voice_for_variant("default"), voice_for_variant("question"))
        self.assertEqual(voice_for_variant("default"), voice_for_variant("answer"))

    def test_pitch_normalization_moves_a_take_toward_the_reference_pitch(self):
        sample_rate = 24_000
        source = array("h", (
            round(12_000 * math.sin(2 * math.pi * 170 * index / sample_rate))
            for index in range(sample_rate)
        ))
        normalized = _normalize_pitch(source)
        self.assertAlmostEqual(170, _median_fundamental_hz(source), delta=6)
        self.assertAlmostEqual(190, _median_fundamental_hz(normalized), delta=7)
        self.assertAlmostEqual(len(source), len(normalized), delta=sample_rate * 0.08)


if __name__ == "__main__":
    unittest.main()
