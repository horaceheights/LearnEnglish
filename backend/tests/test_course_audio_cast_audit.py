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
# neutral teacher rather than infer a speaker from a pictured person.
FORCED_NEUTRAL_GROUPS = {
    "lesson-3-2-i-you-and-we": [("answer_audio_speaker", "R8")],
    "lesson-3-3-am-is-and-are": [("answer_audio_speaker", "R7")],
    "lesson-4-5-morning-routine": [("audio_speaker", "L1 L4 L5")],
    "lesson-4-6-everyday-verbs": [("audio_speaker", "L3")],
    "lesson-6-7-simple-requests": [
        ("audio_speaker", "A1-A3 L1 L2 R1 R3 R4 R7 S1 S2 U2"),
        ("answer_audio_speaker", "R5 U1"),
    ],
    "lesson-6-9-unit-6-review": [
        ("audio_speaker", "S5 U5"),
        ("answer_audio_speaker", "R7"),
    ],
    "lesson-6-10-town-mission": [
        ("audio_speaker", "L3 S5 U6"),
        ("answer_audio_speaker", "R7"),
    ],
    "lesson-7-2-feelings-and-needs": [
        ("audio_speaker", "L6 S1"),
        ("answer_audio_speaker", "R8"),
    ],
    "lesson-7-5-clothes-for-the-weather": [("audio_speaker", "R7")],
    "lesson-7-6-hobbies-and-free-time": [
        ("audio_speaker", "U6"),
        ("answer_audio_speaker", "U8"),
    ],
    "lesson-7-7-invitations-and-responses": [
        ("audio_speaker", "L2 R4 S2 S6 U6"),
        ("answer_audio_speaker", "R6 U3 U7"),
    ],
    "lesson-7-8-help-and-important-phrases": [
        ("audio_speaker", "A2 A3 L1-L6 R2-R4 S1-S5 U1 U2 U4"),
        ("answer_audio_speaker", "R5-R7 U5 U6"),
    ],
    "lesson-7-9-complete-a1-review": [
        ("audio_speaker", "A4 S6"),
        ("answer_audio_speaker", "R8 U8"),
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
    ("lesson-7-10-a1-final-mission", "R5", "answer_audio_speaker"): (
        "female-character",
        "male-character",
    ),
}

EXPECTED_EXPLICIT_ASSIGNMENT_COUNT = 402
EXPECTED_FINAL_ASSIGNMENTS_SHA256 = (
    "d4f1a10878f85a93dfa9f7cc10f273a5371c953e58a0f0042b44c37c0dd0e02a"
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

        self.assertEqual(71, len(neutral))
        self.assertEqual(7, len(EXACT_ROLE_CHANGES))
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
            "The reviewed 402-field validator assignment set changed.",
        )
        self.assertEqual(
            EXPECTED_FINAL_ASSIGNMENTS_SHA256,
            assignment_digest(lessons),
            "The reviewed 402-field lesson assignment set changed.",
        )


if __name__ == "__main__":
    unittest.main()
