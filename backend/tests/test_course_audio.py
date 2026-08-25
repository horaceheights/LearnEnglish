import base64
import re
import json
import unittest
from array import array
from contextlib import redirect_stdout
from io import StringIO
import math
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException

from backend.app.course_audio import (
    AUDIO_PROFILE_VERSION,
    COMPLETION_PLACEHOLDER_PATTERN,
    COMPLETION_PLACEHOLDER_SILENCE_SECONDS,
    COMPLETION_PROMPT_AUDIO_PROFILE_VERSION,
    COMPLETION_TRAILING_SILENCE_SECONDS,
    COURSE_SYLLABLES,
    ING_PRONUNCIATION_NOTES,
    NORMALIZATION_SAMPLE_RATE,
    _decoded_mono_samples,
    _encode_mp3,
    _generate_elevenlabs_aligned_audio,
    audio_instructions,
    _median_fundamental_hz,
    _normalize_pitch,
    cache_path_for,
    completion_prompt_cache_path,
    completion_prompt_contract,
    get_course_audio,
    get_course_completion_audio,
    mask_completion_answer_samples,
    normalized_provider,
    premium_voice_for_narrator,
    pronunciation_notes,
    sanitize_course_audio_text,
    syllable_count,
    target_active_seconds,
    target_syllables_per_minute,
    voice_for_variant,
)
from backend.app.data import LESSONS
from scripts import build_frontend_audio_manifest
from scripts.build_frontend_audio_manifest import expected_audio_items


class CourseAudioProfileTests(unittest.TestCase):
    def test_every_canonical_completion_card_has_one_exact_full_text_contract(self):
        completion_cards = []
        for lesson in LESSONS.values():
            for card in lesson.cards:
                if not COMPLETION_PLACEHOLDER_PATTERN.search(card.prompt):
                    continue
                correct_option = next(
                    option for option in card.options if option.id == card.correct_option_id
                )
                contract = completion_prompt_contract(
                    card.prompt,
                    card.answer_audio_text or "",
                    correct_option.label or "",
                )
                self.assertEqual(
                    card.answer_audio_text,
                    f"{contract.prefix}{contract.blank_text}{contract.suffix}",
                )
                completion_cards.append((lesson.id, card.prompt))

        self.assertEqual(428, len(completion_cards))

    def test_completion_contract_is_exact_and_requires_one_placeholder(self):
        contract = completion_prompt_contract(
            "Who ___ they?",
            "Who are they?",
            "are",
        )
        self.assertEqual(4, contract.answer_start)
        self.assertEqual(7, contract.answer_end)
        self.assertFalse(contract.ending_blank)
        self.assertTrue(
            completion_prompt_contract(
                "They are the [blank].",
                "They are the parents.",
                "parents",
            ).ending_blank
        )
        with self.assertRaises(ValueError):
            completion_prompt_contract("___ and ___", "one and two", "one")
        with self.assertRaises(ValueError):
            completion_prompt_contract("They are ___.", "They are children.", "family")

    def test_completion_cache_uses_a_dedicated_profile(self):
        path = completion_prompt_cache_path(
            "It is a ___.",
            "It is a park.",
            "park",
            "prompt",
            "en-US",
            "prompt",
            "elevenlabs-premium",
            "model",
            "voice",
        )
        import hashlib

        expected = hashlib.sha256(
            "\n".join(
                [
                    AUDIO_PROFILE_VERSION,
                    COMPLETION_PROMPT_AUDIO_PROFILE_VERSION,
                    "It is a ___.",
                    "It is a park.",
                    "park",
                    "prompt",
                    "en-US",
                    "prompt",
                    "elevenlabs-premium",
                    "model",
                    "voice",
                    "mp3",
                ]
            ).encode("utf-8")
        ).hexdigest()
        self.assertEqual(f"{expected}.mp3", path.name)

    def test_completion_answer_masking_handles_beginning_middle_and_end(self):
        samples = array("h", [9000]) * NORMALIZATION_SAMPLE_RATE
        starts = (0.10, 0.30, 0.60)
        ends = (0.20, 0.40, 0.72)
        minimum_pause = round(
            COMPLETION_PLACEHOLDER_SILENCE_SECONDS * NORMALIZATION_SAMPLE_RATE
        )
        trailing_silence = round(
            COMPLETION_TRAILING_SILENCE_SECONDS * NORMALIZATION_SAMPLE_RATE
        )

        beginning = mask_completion_answer_samples(
            samples,
            starts,
            ends,
            0,
            1,
            ending_blank=False,
        )
        beginning_start = round(0.10 * NORMALIZATION_SAMPLE_RATE)
        self.assertEqual({0}, set(beginning[beginning_start:beginning_start + minimum_pause]))
        self.assertIn(9000, beginning[beginning_start + minimum_pause:])
        self.assertEqual({0}, set(beginning[-trailing_silence:]))

        middle = mask_completion_answer_samples(
            samples,
            starts,
            ends,
            1,
            2,
            ending_blank=False,
        )
        middle_start = round(0.30 * NORMALIZATION_SAMPLE_RATE)
        self.assertEqual({0}, set(middle[middle_start:middle_start + minimum_pause]))
        self.assertEqual(9000, middle[middle_start - 1])
        self.assertIn(9000, middle[middle_start + minimum_pause:])
        self.assertEqual({0}, set(middle[-trailing_silence:]))

        ending = mask_completion_answer_samples(
            samples,
            starts,
            ends,
            2,
            3,
            ending_blank=True,
        )
        ending_start = round(0.60 * NORMALIZATION_SAMPLE_RATE)
        self.assertEqual(9000, ending[ending_start - 1])
        self.assertEqual({0}, set(ending[ending_start:]))

    def test_shared_audio_sanitizer_rejects_every_visual_placeholder(self):
        self.assertEqual(
            "The boy is running.",
            sanitize_course_audio_text("  The   boy is running.  "),
        )
        for text in (
            "The boy is ___.",
            "They ___ reading.",
            "I am [blank].",
            "Please [pause].",
            "It is a {blank}.",
            "It is a ...",
            "It is a …",
        ):
            with self.subTest(text=text), self.assertRaises(ValueError):
                sanitize_course_audio_text(text)

    def test_static_audio_manifest_excludes_incomplete_completion_prompts(self):
        expected = expected_audio_items()
        self.assertFalse(any("_" in text for text, _mode, _lang, _variant in expected))
        self.assertFalse(any("..." in text for text, _mode, _lang, _variant in expected))

    def test_checked_in_manifest_has_no_legacy_visual_placeholders(self):
        root = Path(__file__).resolve().parents[2]
        manifest = json.loads(
            (root / "frontend" / "lib" / "courseAudioManifest.json").read_text(encoding="utf-8")
        )
        spoken_texts = [key.split("\n", 1)[0] for key in manifest]
        self.assertFalse(
            any(COMPLETION_PLACEHOLDER_PATTERN.search(text) for text in spoken_texts)
        )

    def test_unit_2_use_audio_is_sanitized_and_bundled(self):
        root = Path(__file__).resolve().parents[2]
        manifest = json.loads(
            (root / "frontend" / "lib" / "courseAudioManifest.json").read_text(encoding="utf-8")
        )
        static_cache = root / "frontend" / "public" / "audio-cache"
        use_cards = [
            (lesson.id, card)
            for lesson in LESSONS.values()
            if lesson.unit_id == "unit-2"
            for card in lesson.cards
            if card.stage == "Use"
            and (
                COMPLETION_PLACEHOLDER_PATTERN.search(card.prompt)
                or COMPLETION_PLACEHOLDER_PATTERN.search(card.audio_text or "")
            )
        ]
        self.assertTrue(use_cards)
        self.assertTrue(any("_" in card.prompt for _lesson_id, card in use_cards))
        for lesson_id, card in use_cards:
            raw_prompt = card.audio_text if card.audio_text is not None else card.prompt
            self.assertTrue(
                COMPLETION_PLACEHOLDER_PATTERN.search(card.prompt)
                or COMPLETION_PLACEHOLDER_PATTERN.search(raw_prompt)
            )
            items = []
            if card.answer_audio_text:
                items.append((sanitize_course_audio_text(card.answer_audio_text), "answer"))
            for spoken_text, variant in items:
                with self.subTest(lesson=lesson_id, text=spoken_text, variant=variant):
                    self.assertNotIn("_", spoken_text)
                    key = "\n".join([spoken_text, "prompt", "en-US", variant])
                    self.assertIn(key, manifest)
                    self.assertTrue((static_cache / manifest[key]).is_file())

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
            "The man is standing.",
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
        self.assertIn("exactly once", instructions)
        self.assertIn("Stop immediately after the final requested word", instructions)
        self.assertNotIn(
            "voiced TH in 'the'",
            audio_instructions("They are reading.", "prompt", "en-US", "default"),
        )
        self.assertIn("never make it sound like 'boss'", pronunciation_notes("It is a bus."))
        self.assertIn("crisp CH onset", pronunciation_notes("A chair"))
        self.assertIn("final /ks/ cluster", pronunciation_notes("green books"))

    def test_audio_profile_version_changes_the_cache_key(self):
        current = cache_path_for("The boy", "prompt", "en-US", "default", "model", "voice", "mp3")
        # The digest should not be the legacy key that omitted the profile version.
        import hashlib

        legacy = hashlib.sha256(
            "\n".join(["The boy", "prompt", "en-US", "default", "model", "voice", "mp3"]).encode("utf-8")
        ).hexdigest()
        self.assertNotEqual(f"{legacy}.mp3", current.name)
        self.assertEqual("a1-elevenlabs-cast-v14", AUDIO_PROFILE_VERSION)

    def test_normal_audio_cache_uses_only_the_current_audio_profile(self):
        current = cache_path_for(
            "It is a park.", "prompt", "en-US", "prompt", "model", "voice", "mp3"
        )
        import hashlib

        expected = hashlib.sha256(
            "\n".join(
                [
                    AUDIO_PROFILE_VERSION,
                    "It is a park.",
                    "prompt",
                    "en-US",
                    "prompt",
                    "model",
                    "voice",
                    "mp3",
                ]
            ).encode("utf-8")
        ).hexdigest()
        self.assertEqual(f"{expected}.mp3", current.name)

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


class CompletionPromptProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_elevenlabs_request_contains_only_the_full_sentence(self):
        full_text = "They are the parents."
        alignment = {
            "characters": list(full_text),
            "character_start_times_seconds": [index * 0.05 for index in range(len(full_text))],
            "character_end_times_seconds": [(index + 1) * 0.05 for index in range(len(full_text))],
        }
        response = Mock(status_code=200)
        response.json.return_value = {
            "audio_base64": base64.b64encode(b"complete-sentence-mp3").decode("ascii"),
            "alignment": alignment,
        }
        client = AsyncMock()
        client.post.return_value = response

        with patch("backend.app.course_audio.elevenlabs_api_key", return_value="test-key"):
            audio, starts, ends = await _generate_elevenlabs_aligned_audio(
                client,
                full_text,
                "eleven_multilingual_v2",
                "teacher-voice",
                premium=True,
                mode="prompt",
            )

        self.assertEqual(b"complete-sentence-mp3", audio)
        self.assertEqual(len(full_text), len(starts))
        self.assertEqual(len(full_text), len(ends))
        request = client.post.await_args
        self.assertTrue(request.args[0].endswith("/teacher-voice/with-timestamps"))
        self.assertEqual(full_text, request.kwargs["json"]["text"])
        self.assertNotIn("visual_prompt", request.kwargs["json"])
        self.assertNotIn("_", request.kwargs["json"]["text"])
        self.assertEqual("application/json", request.kwargs["headers"]["Accept"])

    async def test_invalid_alignment_fails_silent_without_fragment_fallback(self):
        with (
            TemporaryDirectory() as temp_dir,
            patch("backend.app.course_audio.CACHE_DIR", Path(temp_dir)),
            patch(
                "backend.app.course_audio._generate_elevenlabs_aligned_audio",
                new=AsyncMock(side_effect=ValueError("mismatched alignment")),
            ) as generate,
        ):
            response = await get_course_completion_audio(
                visual_prompt="They are a ___.",
                full_text="They are a family.",
                blank_text="family",
            )

        self.assertEqual("true", response.headers["X-Audio-Fail-Silent"])
        self.assertEqual("invalid-audio-or-alignment", response.headers["X-Audio-Fail-Silent-Reason"])
        self.assertEqual("no-store", response.headers["Cache-Control"])
        self.assertEqual(1, generate.await_count)
        self.assertTrue(generate.await_args.kwargs["premium"])
        decoded = _decoded_mono_samples(response.body)
        self.assertTrue(decoded)
        self.assertEqual({0}, set(decoded))

    async def test_unsupported_provider_fails_silent_without_synthesis(self):
        with patch(
            "backend.app.course_audio._generate_elevenlabs_aligned_audio",
            new=AsyncMock(),
        ) as generate:
            response = await get_course_completion_audio(
                visual_prompt="Who ___ they?",
                full_text="Who are they?",
                blank_text="are",
                provider="azure",
            )

        self.assertEqual("true", response.headers["X-Audio-Fail-Silent"])
        self.assertEqual("unsupported-provider", response.headers["X-Audio-Fail-Silent-Reason"])
        generate.assert_not_awaited()

    async def test_ordinary_course_endpoint_rejects_every_visual_placeholder(self):
        with patch(
            "backend.app.course_audio._provider_audio",
            new=AsyncMock(),
        ) as generate:
            for text in (
                "It is a ___.",
                "Who [blank] they?",
                "Who [pause] they?",
                "It is a {blank}.",
                "It is a ...",
                "It is a …",
            ):
                with self.subTest(text=text), self.assertRaisesRegex(
                    HTTPException,
                    "course-completion",
                ):
                    await get_course_audio(
                        text=text,
                        mode="prompt",
                        lang="en-US",
                        variant="prompt",
                    )

        generate.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
