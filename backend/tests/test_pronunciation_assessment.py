import io
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from backend.app.azure_pronunciation import (
    azure_assessment_config,
    normalize_azure_result,
    score_with_azure,
)
from backend.app.pronunciation_scoring import azure_ticks_to_ms


def ticks(milliseconds: int) -> int:
    return milliseconds * 10_000


def segment(label: str, score: float, offset_ms: int, duration_ms: int, *, phoneme: bool = False):
    return {
        "Phoneme" if phoneme else "Syllable": label,
        "Offset": ticks(offset_ms),
        "Duration": ticks(duration_ms),
        "PronunciationAssessment": {"AccuracyScore": score},
    }


def word(
    text: str,
    score: float,
    offset_ms: int,
    duration_ms: int,
    *,
    syllables=None,
    phonemes=None,
    error_type="None",
):
    return {
        "Word": text,
        "Offset": ticks(offset_ms),
        "Duration": ticks(duration_ms),
        "PronunciationAssessment": {"AccuracyScore": score, "ErrorType": error_type},
        "Syllables": syllables or [],
        "Phonemes": phonemes or [],
    }


def payload(
    expected: str,
    *,
    accuracy=90,
    fluency=90,
    completeness=100,
    prosody=85,
    confidence=0.9,
    words=None,
    status="Success",
    snr=30,
):
    assessment = {
        "AccuracyScore": accuracy,
        "FluencyScore": fluency,
        "CompletenessScore": completeness,
        "ProsodyScore": prosody,
        "PronScore": min(accuracy, fluency),
    }
    return {
        "RecognitionStatus": status,
        "DisplayText": expected,
        "SNR": snr,
        "NBest": [{
            "Confidence": confidence,
            "Display": expected,
            "PronunciationAssessment": assessment,
            "Words": words or [],
        }],
    }


class PronunciationInterpretationTests(unittest.TestCase):
    def assess(self, azure_payload, text="studying", level="PRE_A1", exercise_type=None):
        return normalize_azure_result(
            azure_payload,
            text=text,
            level=level,
            exercise_type=exercise_type,
        )

    def test_correct_fluent_word_is_clear_and_smooth(self):
        result = self.assess(payload("studying", words=[word(
            "studying", 94, 100, 700,
            syllables=[segment("stʌ", 92, 100, 300), segment("diɪŋ", 96, 410, 390)],
        )]))
        self.assertTrue(result["interpreted"]["passed"])
        self.assertEqual("CLEAR_AND_SMOOTH", result["interpreted"]["feedbackCode"])

    def test_correct_segmented_word_passes_with_smoothness_coaching(self):
        result = self.assess(payload("studying", fluency=35, words=[word(
            "studying", 91, 100, 1500,
            syllables=[segment("stʌ", 90, 100, 320), segment("diɪŋ", 93, 1120, 480)],
            error_type="UnexpectedBreak",
        )]))
        self.assertTrue(result["interpreted"]["passed"])
        self.assertIn(result["interpreted"]["feedbackCode"], {"CLEAR_BUT_SLOW", "GOOD_SOUNDS_TRY_SMOOTHER"})
        self.assertEqual(700, result["diagnostics"]["longestPauseMs"])

    def test_prosody_break_confidence_is_coaching_not_failure(self):
        assessed_word = word(
            "studying", 91, 100, 900,
            syllables=[segment("stʌ", 90, 100, 300), segment("diɪŋ", 93, 650, 350)],
        )
        assessed_word["PronunciationAssessment"]["Feedback"] = {
            "Break": {"UnexpectedBreak": {"Confidence": 0.9}}
        }
        result = self.assess(payload("studying", fluency=58, words=[assessed_word]))
        self.assertTrue(result["interpreted"]["passed"])
        self.assertEqual(1, result["diagnostics"]["unexpectedBreaks"])

    def test_stop_ping_within_pre_a1_tolerance_passes(self):
        result = self.assess(payload("stopping", fluency=28, words=[word(
            "stopping", 90, 0, 1700,
            syllables=[segment("stɑp", 92, 0, 430), segment("ɪŋ", 89, 1280, 420)],
            error_type="UnexpectedBreak",
        )]), text="stopping")
        self.assertTrue(result["interpreted"]["passed"])
        self.assertEqual("CLEAR_BUT_SLOW", result["interpreted"]["feedbackCode"])
        self.assertLessEqual(result["diagnostics"]["longestPauseMs"], 1200)

    def test_missing_final_sound_does_not_pass(self):
        result = self.assess(payload("studying", accuracy=72, words=[word(
            "studying", 52, 0, 700,
            syllables=[segment("stʌ", 90, 0, 300), segment("diɪŋ", 45, 310, 390)],
            phonemes=[
                segment("s", 85, 0, 100, phoneme=True),
                segment("t", 82, 100, 100, phoneme=True),
                segment("ŋ", 5, 650, 50, phoneme=True),
            ],
        )]))
        self.assertFalse(result["interpreted"]["passed"])
        self.assertEqual("RETRY_TARGET_SOUND", result["interpreted"]["feedbackCode"])
        self.assertEqual(["studying"], result["diagnostics"]["missingFinalWords"])

    def test_wrong_word_does_not_pass_because_it_is_fluent(self):
        result = self.assess(payload("studying", accuracy=22, fluency=98, words=[word(
            "studying", 20, 0, 500,
            phonemes=[segment("s", 18, 0, 100, phoneme=True), segment("t", 24, 110, 100, phoneme=True)],
            error_type="Mispronunciation",
        )]))
        self.assertFalse(result["interpreted"]["passed"])
        self.assertLess(result["interpreted"]["soundAccuracy"], 58)

    def test_correct_sounds_with_very_long_pause_still_pass_word_policy(self):
        result = self.assess(payload("stopping", fluency=15, words=[word(
            "stopping", 88, 0, 3000,
            syllables=[segment("stɑp", 90, 0, 400), segment("ɪŋ", 86, 2500, 500)],
        )]), text="stopping")
        self.assertTrue(result["interpreted"]["passed"])
        self.assertEqual("GOOD_SOUNDS_TRY_SMOOTHER", result["interpreted"]["feedbackCode"])

    def test_empty_recording_returns_no_speech(self):
        result = self.assess({"RecognitionStatus": "NoMatch", "NBest": []})
        self.assertFalse(result["interpreted"]["passed"])
        self.assertEqual("NO_SPEECH", result["interpreted"]["feedbackCode"])

    def test_noise_returns_recording_unclear_without_accusing_learner(self):
        result = self.assess(payload(
            "studying",
            confidence=0.15,
            snr=3,
            words=[word("studying", 82, 0, 600, syllables=[segment("stʌdiɪŋ", 84, 0, 600)])],
        ))
        self.assertFalse(result["interpreted"]["passed"])
        self.assertEqual("RECORDING_UNCLEAR", result["interpreted"]["feedbackCode"])

    def test_missing_azure_fields_use_safe_fallback(self):
        result = self.assess({
            "RecognitionStatus": "Success",
            "DisplayText": "studying",
            "NBest": [{"Words": [word("studying", 80, 0, 600)]}],
        })
        self.assertTrue(result["diagnostics"]["fallbackUsed"])
        self.assertEqual(100, result["interpreted"]["completeness"])
        self.assertNotIn("_provider_response", result)

    def test_assessment_mode_changes_miscue_and_enables_en_us_prosody(self):
        word_config = azure_assessment_config(text="studying", locale="en-US", level="PRE_A1")
        sentence_config = azure_assessment_config(
            text="The girl is studying in the library.", locale="en-US", level="A1"
        )
        self.assertFalse(word_config["EnableMiscue"])
        self.assertTrue(sentence_config["EnableMiscue"])
        self.assertTrue(word_config["EnableProsodyAssessment"])
        self.assertEqual("Phoneme", word_config["Granularity"])

    def test_azure_timestamp_units_are_converted_to_milliseconds(self):
        self.assertEqual(1200, azure_ticks_to_ms(12_000_000))


class AzureFailureTests(unittest.IsolatedAsyncioTestCase):
    async def test_request_failure_returns_recoverable_error(self):
        upload = UploadFile(
            file=io.BytesIO(b"RIFF-not-a-real-wav-but-not-read-by-the-mock"),
            filename="pronunciation.wav",
            headers=Headers({"content-type": "audio/wav"}),
        )
        request = httpx.Request("POST", "https://example.invalid")
        mock_client = AsyncMock()
        mock_client.post.side_effect = httpx.ConnectError("offline", request=request)
        with patch.dict("os.environ", {"AZURE_SPEECH_KEY": "secret", "AZURE_SPEECH_REGION": "test"}), patch(
            "backend.app.azure_pronunciation.azure_client", return_value=mock_client
        ):
            with self.assertRaises(HTTPException) as raised:
                await score_with_azure(text="studying", audio_file=upload, level="PRE_A1")
        self.assertEqual(502, raised.exception.status_code)
        self.assertTrue(raised.exception.detail["recoverable"])
        self.assertNotIn("secret", str(raised.exception.detail))


class ClientCredentialSafetyTests(unittest.TestCase):
    def test_azure_key_name_is_not_present_in_client_source(self):
        repository = Path(__file__).resolve().parents[2]
        client_roots = (
            repository / "frontend" / "app",
            repository / "frontend" / "components",
            repository / "frontend" / "lib",
            repository / "mobile" / "src",
            repository / "mobile" / "modules" / "spanglish-speech" / "src",
            repository / "mobile" / "modules" / "spanglish-speech" / "android" / "src",
        )
        for folder in client_roots:
            for source in folder.rglob("*"):
                if source.is_file() and source.suffix.lower() in {".js", ".ts", ".tsx", ".kt"}:
                    self.assertNotIn("AZURE_SPEECH_KEY", source.read_text(encoding="utf-8", errors="ignore"))


if __name__ == "__main__":
    unittest.main()
