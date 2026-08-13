"""Provider-independent pedagogical interpretation of pronunciation evidence."""

from __future__ import annotations

import math
import re
from statistics import fmean
from typing import Any

from .pronunciation_config import (
    ExerciseType,
    LearnerLevel,
    PronunciationPolicy,
    infer_exercise_type,
    normalize_learner_level,
    policy_for,
)
from .pronunciation_types import ParsedAssessment, PronunciationAssessmentResult


AZURE_TICKS_PER_MILLISECOND = 10_000
FEEDBACK_MESSAGES: dict[str, dict[str, str]] = {
    "CLEAR_AND_SMOOTH": {
        "en": "Great! Clear and smooth.",
        "es": "¡Muy bien! Claro y fluido.",
    },
    "CLEAR_BUT_SLOW": {
        "en": "Good pronunciation. Now connect it a little more smoothly.",
        "es": "Buena pronunciación. Ahora une los sonidos con un poco más de fluidez.",
    },
    "GOOD_SOUNDS_TRY_SMOOTHER": {
        "en": "The sounds are good. Try saying it in one smooth motion.",
        "es": "Los sonidos están bien. Intenta decirlo de forma más continua.",
    },
    "MISSING_PART": {
        "en": "Almost. One part was missing. Listen and try again.",
        "es": "Casi. Faltó una parte. Escucha e inténtalo de nuevo.",
    },
    "RETRY_TARGET_SOUND": {
        "en": "Almost. Try this part again: {target}.",
        "es": "Casi. Intenta esta parte otra vez: {target}.",
    },
    "RECORDING_UNCLEAR": {
        "en": "I couldn't hear that clearly. Try again a little closer to the microphone.",
        "es": "No pude escucharte con claridad. Inténtalo de nuevo un poco más cerca del micrófono.",
    },
    "NO_SPEECH": {
        "en": "I didn't hear a response. Tap the microphone and try again.",
        "es": "No escuché una respuesta. Toca el micrófono e inténtalo de nuevo.",
    },
    "SYSTEM_UNCERTAIN": {
        "en": "That may have been correct, but I couldn't grade it confidently. Try once more.",
        "es": "Puede haber sido correcto, pero no pude evaluarlo con seguridad. Inténtalo una vez más.",
    },
}


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def azure_ticks_to_ms(value: Any) -> int | None:
    ticks = _number(value)
    if ticks is None:
        return None
    return max(0, round(ticks / AZURE_TICKS_PER_MILLISECOND))


def _assessment(node: dict[str, Any]) -> dict[str, Any]:
    nested = node.get("PronunciationAssessment")
    return nested if isinstance(nested, dict) else node


def _timed_segment(node: dict[str, Any], label_keys: tuple[str, ...], output_key: str) -> dict[str, Any]:
    details = _assessment(node)
    label = next((node.get(key) for key in label_keys if node.get(key) is not None), None)
    return {
        output_key: str(label) if label is not None else None,
        "accuracyScore": _number(details.get("AccuracyScore")),
        "offsetMs": azure_ticks_to_ms(node.get("Offset")),
        "durationMs": azure_ticks_to_ms(node.get("Duration")),
    }


def parse_azure_assessment(payload: dict[str, Any], expected_text: str) -> ParsedAssessment:
    """Parse Azure JSON without making pass/fail decisions."""
    best_options = payload.get("NBest")
    best = best_options[0] if isinstance(best_options, list) and best_options else {}
    if not isinstance(best, dict):
        best = {}
    overall = _assessment(best)
    words: list[dict[str, Any]] = []
    for item in best.get("Words") or []:
        if not isinstance(item, dict):
            continue
        details = _assessment(item)
        syllables = [
            _timed_segment(segment, ("Grapheme", "Syllable"), "syllable")
            for segment in item.get("Syllables") or []
            if isinstance(segment, dict)
        ]
        phonemes = [
            _timed_segment(segment, ("Phoneme",), "phoneme")
            for segment in item.get("Phonemes") or []
            if isinstance(segment, dict)
        ]
        words.append({
            "word": item.get("Word"),
            "accuracyScore": _number(details.get("AccuracyScore")),
            "errorType": details.get("ErrorType"),
            "offsetMs": azure_ticks_to_ms(item.get("Offset")),
            "durationMs": azure_ticks_to_ms(item.get("Duration")),
            "syllables": syllables,
            "phonemes": phonemes,
            "feedback": details.get("Feedback") or item.get("Feedback"),
        })

    recognition_status = payload.get("RecognitionStatus")
    return {  # type: ignore[return-value]
        "expectedText": expected_text,
        "recognizedText": payload.get("DisplayText") or best.get("Display") or best.get("Lexical"),
        "recognitionStatus": recognition_status,
        "recognitionConfidence": _number(best.get("Confidence")),
        "snr": (
            _number(payload.get("SNR"))
            if _number(payload.get("SNR")) is not None
            else _number(best.get("SNR"))
        ),
        "audioOffsetMs": azure_ticks_to_ms(payload.get("Offset")),
        "audioDurationMs": azure_ticks_to_ms(payload.get("Duration")),
        "raw": {
            "accuracyScore": _number(overall.get("AccuracyScore")),
            "fluencyScore": _number(overall.get("FluencyScore")),
            "completenessScore": _number(overall.get("CompletenessScore")),
            "prosodyScore": _number(overall.get("ProsodyScore")),
            "pronScore": _number(overall.get("PronScore")),
        },
        "words": words,
    }


def _scores(items: list[dict[str, Any]], key: str) -> list[float]:
    values = [_number(item.get(key)) for item in items]
    return [value for value in values if value is not None]


def _mean(values: list[float]) -> float | None:
    return fmean(values) if values else None


def _speech_words(text: str | None) -> list[str]:
    return re.findall(r"[a-z]+(?:'[a-z]+)?", (text or "").lower().replace("’", "'"))


def _segment_gaps(words: list[dict[str, Any]]) -> list[int]:
    gaps: list[int] = []

    def add_adjacent_gaps(segments: list[dict[str, Any]]) -> None:
        timed = [
            segment for segment in segments
            if isinstance(segment.get("offsetMs"), int) and isinstance(segment.get("durationMs"), int)
        ]
        timed.sort(key=lambda segment: segment["offsetMs"])
        for current, following in zip(timed, timed[1:]):
            gap = following["offsetMs"] - (current["offsetMs"] + current["durationMs"])
            if gap > 0:
                gaps.append(gap)

    for word in words:
        syllables = word.get("syllables") or []
        phonemes = word.get("phonemes") or []
        add_adjacent_gaps(syllables if len(syllables) > 1 else phonemes)
    add_adjacent_gaps(words)
    return gaps


def _prosody_break_counts(words: list[dict[str, Any]]) -> tuple[int, int]:
    unexpected = 0
    missing = 0
    for word in words:
        error_type = str(word.get("errorType") or "").lower()
        unexpected += int(error_type == "unexpectedbreak")
        missing += int(error_type == "missingbreak")
        feedback = word.get("feedback")
        if not isinstance(feedback, dict):
            continue
        break_feedback = feedback.get("Break")
        if not isinstance(break_feedback, dict):
            continue
        unexpected_value = break_feedback.get("UnexpectedBreak") or break_feedback.get("UnexpectedBreakConfidence")
        missing_value = break_feedback.get("MissingBreak") or break_feedback.get("MissingBreakConfidence")
        unexpected_confidence = _number(
            unexpected_value.get("Confidence") if isinstance(unexpected_value, dict) else unexpected_value
        )
        missing_confidence = _number(
            missing_value.get("Confidence") if isinstance(missing_value, dict) else missing_value
        )
        unexpected += int(unexpected_confidence is not None and unexpected_confidence >= 0.75)
        missing += int(missing_confidence is not None and missing_confidence >= 0.75)
    return unexpected, missing


def _weighted_score(values: dict[str, float | None], policy: PronunciationPolicy) -> float:
    weights = {
        "accuracy": policy.weights.accuracy,
        "completeness": policy.weights.completeness,
        "fluency": policy.weights.fluency,
        "prosody": policy.weights.prosody,
    }
    available_weight = sum(weights[key] for key, value in values.items() if value is not None)
    if available_weight <= 0:
        return 0.0
    return sum((values[key] or 0) * weights[key] for key in values if values[key] is not None) / available_weight


def _feedback(code: str, target: str | None = None) -> dict[str, Any]:
    messages = {
        locale: message.format(target=target or "")
        for locale, message in FEEDBACK_MESSAGES[code].items()
    }
    return {"code": code, "target": target, "messages": messages}


def interpret_assessment(
    assessment: ParsedAssessment,
    *,
    level: str | None = None,
    exercise_type: str | None = None,
) -> PronunciationAssessmentResult:
    """Turn provider evidence into one encouraging, actionable teacher result."""
    learner_level: LearnerLevel = normalize_learner_level(level)
    mode: ExerciseType = infer_exercise_type(assessment["expectedText"], exercise_type)
    policy = policy_for(learner_level, mode)
    raw = assessment["raw"]
    words = assessment["words"]
    expected_words = _speech_words(assessment["expectedText"])
    observed_words = _speech_words(assessment.get("recognizedText"))

    syllables = [segment for word in words for segment in word.get("syllables") or []]
    phonemes = [segment for word in words for segment in word.get("phonemes") or []]
    syllable_accuracy = _mean(_scores(syllables, "accuracyScore"))
    phoneme_accuracy = _mean(_scores(phonemes, "accuracyScore"))
    word_accuracy = _mean(_scores(words, "accuracyScore"))
    segment_accuracy = syllable_accuracy if syllable_accuracy is not None else phoneme_accuracy
    accuracy_candidates = [
        value for value in (raw.get("accuracyScore"), segment_accuracy, word_accuracy)
        if value is not None
    ]
    # Azure's aggregate can be dragged down by timing. A complete set of strong
    # syllable/phoneme scores is direct evidence that the sounds were produced.
    sound_accuracy = max(accuracy_candidates) if accuracy_candidates else 0.0

    omissions = [word for word in words if str(word.get("errorType") or "").lower() == "omission"]
    insertions = [word for word in words if str(word.get("errorType") or "").lower() == "insertion"]
    pronounced_words = [word for word in words if word not in omissions and word not in insertions]
    completeness = raw.get("completenessScore")
    fallback_used = False
    if completeness is None:
        fallback_used = True
        if expected_words:
            completeness = min(100.0, 100.0 * len(pronounced_words) / len(expected_words))
        else:
            completeness = 0.0

    gaps = _segment_gaps(words)
    longest_pause = max(gaps) if gaps else None
    unexpected_breaks, missing_breaks = _prosody_break_counts(words)
    weak_words = [
        str(word.get("word")) for word in words
        if _number(word.get("accuracyScore")) is not None
        and float(word["accuracyScore"]) < policy.weak_segment_score
        and str(word.get("errorType") or "").lower() not in {"insertion", "omission"}
    ]
    weak_phonemes = sorted(
        [
            {"phoneme": str(segment.get("phoneme")), "score": float(segment["accuracyScore"])}
            for segment in phonemes
            if segment.get("phoneme") and _number(segment.get("accuracyScore")) is not None
            and float(segment["accuracyScore"]) < policy.weak_segment_score
        ],
        key=lambda item: item["score"],
    )

    final_segments = []
    for word in pronounced_words:
        segments = word.get("phonemes") or word.get("syllables") or []
        if segments:
            final_segments.append((word, segments[-1]))
    missing_final_words = [
        str(word.get("word"))
        for word, segment in final_segments
        if _number(segment.get("accuracyScore")) is not None
        and float(segment["accuracyScore"]) < policy.missing_final_segment_score
        and (_number(word.get("accuracyScore")) or 0) < 60
    ]

    recognition_status = str(assessment.get("recognitionStatus") or "Success").lower()
    no_speech = recognition_status not in {"success", "0"} and not words and not observed_words
    has_segment_evidence = len(_scores(syllables, "accuracyScore")) + len(_scores(phonemes, "accuracyScore")) > 0
    recognition_confidence = assessment.get("recognitionConfidence")
    snr = assessment.get("snr")
    noisy = (
        _number(snr) is not None
        and float(snr) < policy.noisy_snr_db
        and (_number(recognition_confidence) or 0) < policy.low_recognition_confidence
    )
    usable = not no_speech and bool(words or accuracy_candidates)

    if has_segment_evidence and completeness >= policy.minimum_completeness:
        confidence = "HIGH" if (_number(recognition_confidence) or 0) >= 0.55 else "MEDIUM"
    elif usable:
        confidence = "MEDIUM" if (_number(recognition_confidence) or 0) >= policy.low_recognition_confidence else "LOW"
    else:
        confidence = "LOW"

    dimensions = {
        "accuracy": sound_accuracy,
        "completeness": completeness,
        "fluency": raw.get("fluencyScore"),
        "prosody": raw.get("prosodyScore"),
    }
    pedagogical_score = _weighted_score(dimensions, policy)
    content_complete = completeness >= policy.minimum_completeness and not omissions and not missing_final_words
    sound_gate = sound_accuracy >= policy.minimum_sound_accuracy
    base_pass = usable and not noisy and sound_gate and content_complete
    if mode == "WORD":
        passed = base_pass
    elif mode == "SHORT_PHRASE":
        strong_sounds_override_fluency = (
            sound_accuracy >= policy.strong_sound_accuracy
            and completeness >= min(100, policy.minimum_completeness + 5)
        )
        passed = base_pass and (
            pedagogical_score >= policy.minimum_pedagogical_score or strong_sounds_override_fluency
        )
    else:
        passed = base_pass and pedagogical_score >= policy.minimum_pedagogical_score

    slow = (
        (raw.get("fluencyScore") is not None and raw["fluencyScore"] < policy.fluent_score)
        or unexpected_breaks > 0
        or (longest_pause is not None and longest_pause > policy.pause_tolerance_ms)
    )
    target = missing_final_words[0] if missing_final_words else (weak_words[0] if weak_words else None)
    if no_speech:
        feedback_code = "NO_SPEECH"
        passed = False
    elif noisy:
        feedback_code = "RECORDING_UNCLEAR"
        passed = False
    elif not usable or not accuracy_candidates:
        feedback_code = "SYSTEM_UNCERTAIN"
        passed = False
    elif not content_complete:
        feedback_code = "RETRY_TARGET_SOUND" if target and confidence != "LOW" else "MISSING_PART"
        passed = False
    elif not sound_gate:
        feedback_code = "RETRY_TARGET_SOUND" if target and confidence != "LOW" else "SYSTEM_UNCERTAIN"
        passed = False
    elif passed and slow:
        feedback_code = (
            "CLEAR_BUT_SLOW"
            if longest_pause is None or longest_pause <= policy.pause_tolerance_ms
            else "GOOD_SOUNDS_TRY_SMOOTHER"
        )
    elif passed:
        feedback_code = "CLEAR_AND_SMOOTH"
    else:
        feedback_code = "GOOD_SOUNDS_TRY_SMOOTHER" if sound_accuracy >= policy.strong_sound_accuracy else "RETRY_TARGET_SOUND"

    diagnostics = {
        "longestPauseMs": longest_pause,
        "pauseToleranceMs": policy.pause_tolerance_ms,
        "unexpectedBreaks": unexpected_breaks,
        "missingBreaks": missing_breaks,
        "missingWords": [str(word.get("word")) for word in omissions],
        "weakWords": weak_words,
        "weakPhonemes": weak_phonemes,
        "missingFinalWords": missing_final_words,
        "recognitionConfidence": recognition_confidence,
        "snr": snr,
        "fallbackUsed": fallback_used or not gaps,
    }
    interpreted = {
        "level": learner_level,
        "exerciseType": mode,
        "soundAccuracy": round(sound_accuracy, 1),
        "completeness": round(completeness, 1),
        "smoothness": round(raw["fluencyScore"], 1) if raw.get("fluencyScore") is not None else None,
        "prosody": round(raw["prosodyScore"], 1) if raw.get("prosodyScore") is not None else None,
        "pedagogicalScore": round(pedagogical_score, 1),
        "passed": passed,
        "confidence": confidence,
        "feedbackCode": feedback_code,
    }
    return {  # type: ignore[return-value]
        **assessment,
        "interpreted": interpreted,
        "diagnostics": diagnostics,
        "feedback": _feedback(feedback_code, target),
    }


def legacy_text_score(result: dict[str, Any]) -> dict[str, Any]:
    """Keep older web/mobile clients working while they adopt the typed result."""
    raw = result["raw"]
    interpreted = result["interpreted"]
    return {
        "quality_score": interpreted["pedagogicalScore"],
        "word_score_list": [
            {
                "word": word.get("word"),
                "quality_score": word.get("accuracyScore"),
                "error_type": word.get("errorType"),
                "offset_ms": word.get("offsetMs"),
                "duration_ms": word.get("durationMs"),
                "syllable_score_list": [
                    {
                        "letters": segment.get("syllable"),
                        "quality_score": segment.get("accuracyScore"),
                        "offset_ms": segment.get("offsetMs"),
                        "duration_ms": segment.get("durationMs"),
                    }
                    for segment in word.get("syllables") or []
                ],
                "phone_score_list": [
                    {
                        "phone": segment.get("phoneme"),
                        "quality_score": segment.get("accuracyScore"),
                        "offset_ms": segment.get("offsetMs"),
                        "duration_ms": segment.get("durationMs"),
                    }
                    for segment in word.get("phonemes") or []
                ],
            }
            for word in result["words"]
        ],
        "azure_scores": {
            "accuracy": raw.get("accuracyScore"),
            "fluency": raw.get("fluencyScore"),
            "completeness": raw.get("completenessScore"),
            "prosody": raw.get("prosodyScore"),
            "pronunciation": raw.get("pronScore"),
        },
    }
