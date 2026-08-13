from typing import Literal, NotRequired, TypedDict


FeedbackCode = Literal[
    "CLEAR_AND_SMOOTH",
    "CLEAR_BUT_SLOW",
    "GOOD_SOUNDS_TRY_SMOOTHER",
    "MISSING_PART",
    "RETRY_TARGET_SOUND",
    "RECORDING_UNCLEAR",
    "NO_SPEECH",
    "SYSTEM_UNCERTAIN",
]


class RawScores(TypedDict):
    accuracyScore: float | None
    fluencyScore: float | None
    completenessScore: float | None
    prosodyScore: float | None
    pronScore: float | None


class SegmentResult(TypedDict):
    accuracyScore: float | None
    offsetMs: int | None
    durationMs: int | None
    syllable: NotRequired[str | None]
    phoneme: NotRequired[str | None]


class WordResult(TypedDict):
    word: str | None
    accuracyScore: float | None
    errorType: object
    offsetMs: int | None
    durationMs: int | None
    syllables: list[SegmentResult]
    phonemes: list[SegmentResult]
    feedback: object


class InterpretedResult(TypedDict):
    level: Literal["PRE_A1", "A1", "A2_PLUS"]
    exerciseType: Literal["WORD", "SHORT_PHRASE", "SENTENCE"]
    soundAccuracy: float
    completeness: float
    smoothness: float | None
    prosody: float | None
    pedagogicalScore: float
    passed: bool
    confidence: Literal["HIGH", "MEDIUM", "LOW"]
    feedbackCode: FeedbackCode


class ParsedAssessment(TypedDict):
    expectedText: str
    recognizedText: object
    recognitionStatus: object
    recognitionConfidence: float | None
    snr: float | None
    audioOffsetMs: int | None
    audioDurationMs: int | None
    raw: RawScores
    words: list[WordResult]


class PronunciationAssessmentResult(ParsedAssessment):
    interpreted: InterpretedResult
    diagnostics: dict[str, object]
    feedback: dict[str, object]
