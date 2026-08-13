"""Central, tunable policy for beginner pronunciation assessment.

Azure measures pronunciation accuracy and fluency separately.  These settings
keep that distinction intact so a careful learner is coached about pace without
being told that correctly produced sounds are wrong.
"""

from dataclasses import dataclass
from typing import Literal


LearnerLevel = Literal["PRE_A1", "A1", "A2_PLUS"]
ExerciseType = Literal["WORD", "SHORT_PHRASE", "SENTENCE"]


@dataclass(frozen=True)
class ScoreWeights:
    accuracy: float
    completeness: float
    fluency: float
    prosody: float


@dataclass(frozen=True)
class PronunciationPolicy:
    weights: ScoreWeights
    minimum_sound_accuracy: float
    minimum_completeness: float
    minimum_pedagogical_score: float
    strong_sound_accuracy: float
    fluent_score: float
    pause_tolerance_ms: int
    enable_miscue: bool
    weak_segment_score: float = 45.0
    missing_final_segment_score: float = 22.0
    low_recognition_confidence: float = 0.35
    noisy_snr_db: float = 8.0


# Prototype defaults. Tune these from real learner recordings instead of
# scattering thresholds through provider adapters or UI components.
SCORING_POLICIES: dict[tuple[LearnerLevel, ExerciseType], PronunciationPolicy] = {
    ("PRE_A1", "WORD"): PronunciationPolicy(
        ScoreWeights(0.80, 0.20, 0.00, 0.00), 55, 65, 55, 70, 65, 1200, False
    ),
    ("PRE_A1", "SHORT_PHRASE"): PronunciationPolicy(
        ScoreWeights(0.65, 0.25, 0.10, 0.00), 55, 70, 55, 70, 62, 1200, False
    ),
    ("PRE_A1", "SENTENCE"): PronunciationPolicy(
        ScoreWeights(0.50, 0.30, 0.15, 0.05), 56, 75, 57, 72, 62, 800, True
    ),
    ("A1", "WORD"): PronunciationPolicy(
        ScoreWeights(0.75, 0.20, 0.05, 0.00), 58, 70, 58, 72, 65, 800, False
    ),
    ("A1", "SHORT_PHRASE"): PronunciationPolicy(
        ScoreWeights(0.55, 0.25, 0.15, 0.05), 58, 72, 58, 72, 65, 800, False
    ),
    ("A1", "SENTENCE"): PronunciationPolicy(
        ScoreWeights(0.45, 0.25, 0.20, 0.10), 60, 75, 60, 75, 68, 500, True
    ),
    ("A2_PLUS", "WORD"): PronunciationPolicy(
        ScoreWeights(0.65, 0.20, 0.10, 0.05), 65, 78, 65, 78, 72, 500, False
    ),
    ("A2_PLUS", "SHORT_PHRASE"): PronunciationPolicy(
        ScoreWeights(0.50, 0.25, 0.15, 0.10), 65, 80, 66, 80, 72, 500, True
    ),
    ("A2_PLUS", "SENTENCE"): PronunciationPolicy(
        ScoreWeights(0.40, 0.25, 0.20, 0.15), 68, 82, 68, 82, 75, 500, True
    ),
}


def normalize_learner_level(level: str | None) -> LearnerLevel:
    normalized = (level or "A1").upper().replace("-", "_").replace(" ", "_")
    if "PRE_A1" in normalized or "PREA1" in normalized:
        return "PRE_A1"
    if "A1" in normalized:
        return "A1"
    return "A2_PLUS"


def infer_exercise_type(text: str, requested: str | None = None) -> ExerciseType:
    normalized = (requested or "").strip().upper().replace("-", "_").replace(" ", "_")
    if normalized in {"WORD", "SHORT_PHRASE", "SENTENCE"}:
        return normalized  # type: ignore[return-value]

    word_count = len([part for part in text.replace("’", "'").split() if any(char.isalpha() for char in part)])
    if word_count <= 1:
        return "WORD"
    if word_count <= 4:
        return "SHORT_PHRASE"
    return "SENTENCE"


def policy_for(level: LearnerLevel, exercise_type: ExerciseType) -> PronunciationPolicy:
    return SCORING_POLICIES[(level, exercise_type)]
