import ast
import hashlib
import json
import re
import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
LESSONS_ROOT = ROOT_DIR / "backend" / "lessons"
CAST_VALIDATOR = ROOT_DIR / "scripts" / "validate_course_audio_cast.py"
SPEAKER_FIELDS = ("audio_speaker", "answer_audio_speaker")

# These fields were explicitly removed after the final image-by-image speaker
# audit. Their absence is meaningful: the course-audio resolver must use the
# neutral teacher rather than infer a speaker from a pictured person. The
# 2026-09-18 gender-matched voice review (the pictured person who says a line
# is voiced by a man or a woman to match) recast 23 of the original 71 fields
# after the photo sweep put a clearly speaking man or boy on those cards; the
# rest remain neutral because a woman or an off-camera speaker says them.
FORCED_NEUTRAL_GROUPS = {
    "lesson-3-3-am-is-and-are": [("answer_audio_speaker", "R7")],
    "lesson-4-5-morning-routine": [("audio_speaker", "L1 L4 L5")],
    "lesson-4-6-everyday-verbs": [("audio_speaker", "L3")],
    "lesson-6-7-simple-requests": [
        ("audio_speaker", "A2 L1 L2 R3 R7 S1 S2 U2"),
        ("answer_audio_speaker", "R5 U1"),
    ],
    "lesson-7-6-hobbies-and-free-time": [
        ("audio_speaker", "U6"),
        ("answer_audio_speaker", "U8"),
    ],
    "lesson-7-7-invitations-and-responses": [("answer_audio_speaker", "U7")],
    "lesson-7-8-help-and-important-phrases": [
        ("audio_speaker", "A3 L1 L2 L4-L6 R3 R4 S1 S3-S5 U1 U2 U4"),
        ("answer_audio_speaker", "R5 R7 U6"),
    ],
    "lesson-7-9-complete-a1-review": [
        ("audio_speaker", "A4 S6"),
        ("answer_audio_speaker", "R8"),
    ],
    "lesson-7-10-a1-final-mission": [("answer_audio_speaker", "R8 U8")],
}

# The old role is retained here as audit evidence; the final role is what must
# appear in both the validator map and canonical lesson YAML.
EXACT_ROLE_CHANGES = {
    ("lesson-3-6-professions", "R6", "answer_audio_speaker"): (
        "sofia",
        "female-character",
    ),
    ("lesson-7-5-clothes-for-the-weather", "L3", "audio_speaker"): (
        "female-character",
        "male-character",
    ),
    ("lesson-7-5-clothes-for-the-weather", "R3", "audio_speaker"): (
        "female-character",
        "male-character",
    ),
    ("lesson-7-5-clothes-for-the-weather", "A3", "audio_speaker"): (
        "female-character",
        "male-character",
    ),
    ("lesson-7-5-clothes-for-the-weather", "S3", "audio_speaker"): (
        "female-character",
        "male-character",
    ),
    ("lesson-7-9-complete-a1-review", "R7", "answer_audio_speaker"): (
        "female-character",
        "male-character",
    ),
    # 2026-09-18 gender-matched voice review: the recorded picture shows Ana,
    # a woman, or the asker rather than the voiced man. None means the field is
    # removed and the answer inherits the card's prompt speaker.
    ("lesson-3-6-professions", "U5", "answer_audio_speaker"): ("luis", None),
    ("lesson-4-7-simple-present", "L6", "audio_speaker"): ("male-character", "ana"),
    ("lesson-4-7-simple-present", "R6", "answer_audio_speaker"): ("male-character", "ana"),
    ("lesson-4-7-simple-present", "S6", "audio_speaker"): ("male-character", "ana"),
    ("lesson-4-7-simple-present", "U4", "audio_speaker"): ("luis", "ana"),
    ("lesson-4-7-simple-present", "U4", "answer_audio_speaker"): ("luis", None),
    # The 2026-09-18 recast of 4.9 U6 to Ana is history: the 2026-09-21 parity rebuild
    # re-authored that card over a fresh photograph of a man walking to work, so the line
    # is spoken by the pictured man again and has no recast left to pin.
    ("lesson-6-7-simple-requests", "U7", "answer_audio_speaker"): ("female-character", None),
    ("lesson-7-6-hobbies-and-free-time", "A3", "audio_speaker"): ("male-character", "female-character"),
    ("lesson-7-6-hobbies-and-free-time", "L5", "audio_speaker"): ("male-character", "female-character"),
    ("lesson-7-6-hobbies-and-free-time", "R6", "answer_audio_speaker"): ("male-character", "female-character"),
    ("lesson-7-6-hobbies-and-free-time", "S5", "audio_speaker"): ("male-character", "female-character"),
    ("lesson-7-6-hobbies-and-free-time", "U1", "audio_speaker"): ("male-character", "female-character"),
    ("lesson-7-6-hobbies-and-free-time", "U5", "audio_speaker"): ("male-character", "female-character"),
}

# Lesson 1.8 adds 25 visitor-question cards with prompt and answer speaker fields.
# Completa (Use) sentence standard adds explicit speaker assignments across Units 3, 4, 6, 7.
# The Unit 3 parity rollout adds the 3.3 current-action speakers (+6) and recasts the
# rebuilt 3.9 review from its fresh scenes (-4 net), each speaker pictured on its card.
# The 2026-09-18 gender-matched voice review voices 89 more lines by the pictured man,
# boy, woman or asker who says them (+89 net). The speaking-voice review check found
# Luis asking "How old are you?" over 3.4 U1 and U3 (+2).
# The 2026-09-21 Unit 4 parity rebuild re-authored 4.9: its eight old explicit speakers
# became the 24 first-person lines whose pictured man or woman says them (+14 net).
# Lesson 4.8 introduces Today: 4.8 U6 retired (-1 net).
# The Unit 5 rebuild replaced 5.9's five explicit speakers with the 23 lines its pictured
# people and café customers say (+18 net).
# The Unit 6 rebuild replaces 6.9's three explicit speakers with the fifteen lines its pictured
# people and transport riders say (+12 net).
EXPECTED_EXPLICIT_ASSIGNMENT_COUNT = 575
EXPECTED_FINAL_ASSIGNMENTS_SHA256 = (
    "75d09b4e20bcc529368bc9d82d13f7184ff5ca2cbd534bf5870764cd3f6fb522"
)


def expand_slides(specification: str) -> list[str]:
    slides: list[str] = []
    for token in specification.split():
        match = re.fullmatch(r"([A-Z]+)(\d+)-(?:([A-Z]+)?)(\d+)", token)
        if not match:
            slides.append(token)
            continue
        start_prefix, start_number, end_prefix, end_number = match.groups()
        if end_prefix and end_prefix != start_prefix:
            raise AssertionError(f"Cross-prefix range is unsupported: {token}")
        slides.extend(
            f"{start_prefix}{number}"
            for number in range(int(start_number), int(end_number) + 1)
        )
    return slides


def forced_neutral_targets() -> set[tuple[str, str, str]]:
    return {
        (lesson_id, slide_id, field)
        for lesson_id, groups in FORCED_NEUTRAL_GROUPS.items()
        for field, specification in groups
        for slide_id in expand_slides(specification)
    }


def validator_assignments() -> dict[tuple[str, str, str], str]:
    source = CAST_VALIDATOR.read_text(encoding="utf-8")
    module = ast.parse(source, filename=str(CAST_VALIDATOR))
    groups = next(
        ast.literal_eval(node.value)
        for node in module.body
        if isinstance(node, ast.AnnAssign)
        and isinstance(node.target, ast.Name)
        and node.target.id == "ASSIGNMENT_GROUPS"
    )
    assignments: dict[tuple[str, str, str], str] = {}
    for lesson_id, assignment_groups in groups.items():
        for field, speaker, specification in assignment_groups:
            if field not in SPEAKER_FIELDS:
                raise AssertionError(f"Unknown speaker field in validator map: {field}")
            for slide_id in expand_slides(specification):
                key = (lesson_id, slide_id, field)
                if key in assignments:
                    raise AssertionError(f"Duplicate validator assignment: {key}")
                assignments[key] = speaker
    return assignments


def lesson_assignments() -> dict[tuple[str, str, str], str]:
    assignments: dict[tuple[str, str, str], str] = {}
    for path in sorted(LESSONS_ROOT.rglob("*.yaml")):
        source = path.read_text(encoding="utf-8")
        try:
            lesson = json.loads(source)
        except json.JSONDecodeError:
            # The two original Unit 1 sources remain ordinary YAML and have no
            # reviewed character-cast fields. Fail explicitly if that changes
            # instead of silently omitting an assignment from this audit.
            if any(re.search(rf"^\s*{field}\s*:", source, re.MULTILINE) for field in SPEAKER_FIELDS):
                raise AssertionError(
                    f"{path} adds an explicit cast field outside the JSON audit loader"
                )
            continue
        lesson_id = lesson["id"]
        for card in lesson["cards"]:
            slide_id = card.get("slide_id")
            for field in SPEAKER_FIELDS:
                if field not in card:
                    continue
                key = (lesson_id, slide_id, field)
                if key in assignments:
                    raise AssertionError(f"Duplicate lesson assignment: {key}")
                assignments[key] = card[field]
    return assignments


def assignment_digest(assignments: dict[tuple[str, str, str], str]) -> str:
    canonical = "\n".join(
        "|".join((*key, speaker))
        for key, speaker in sorted(assignments.items())
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class CourseAudioCastAuditTests(unittest.TestCase):
    def test_final_visual_cast_audit_is_pinned_independently(self) -> None:
        validator = validator_assignments()
        lessons = lesson_assignments()
        neutral = forced_neutral_targets()

        self.assertEqual(41, len(neutral))
        self.assertEqual(19, len(EXACT_ROLE_CHANGES))
        self.assertEqual(EXPECTED_EXPLICIT_ASSIGNMENT_COUNT, len(validator))
        self.assertEqual(EXPECTED_EXPLICIT_ASSIGNMENT_COUNT, len(lessons))
        self.assertEqual(validator, lessons)

        for target in sorted(neutral):
            self.assertNotIn(target, validator, f"Forced-neutral target was recast: {target}")
            self.assertNotIn(target, lessons, f"Forced-neutral lesson field returned: {target}")

        for target, (old_role, final_role) in EXACT_ROLE_CHANGES.items():
            self.assertNotEqual(old_role, final_role)
            self.assertEqual(final_role, validator.get(target), f"Validator role drift: {target}")
            self.assertEqual(final_role, lessons.get(target), f"Lesson role drift: {target}")

        self.assertEqual(
            EXPECTED_FINAL_ASSIGNMENTS_SHA256,
            assignment_digest(validator),
            "The reviewed validator assignment set changed.",
        )
        self.assertEqual(
            EXPECTED_FINAL_ASSIGNMENTS_SHA256,
            assignment_digest(lessons),
            "The reviewed lesson assignment set changed.",
        )


if __name__ == "__main__":
    unittest.main()
