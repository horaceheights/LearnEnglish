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
# The 2026-09-25 Unit 3 rebuild re-authored every Unit 3 card from engine briefs, so its
# 3.3 R7 forced-neutral field and 3.6 R6/U5 recasts are history with nothing left to pin.
# The 2026-09-26 Unit 4 rebuild did the same for 4.5 L1/L4/L5, 4.6 L3 and the 4.7 recasts,
# and the 2026-09-27 Unit 6 rebuild for the ten 6.7 fields: its briefs voice the woman asking
# for help and the man she asks.
# The 2026-09-27 Unit 7 rebuild re-authored 7.1-7.8 from briefs that name every speaker, so the
# 21 forced-neutral fields of 7.6-7.8 and the 7.5 and 7.6 recasts are history; the review and
# mission fields below keep their pins.
FORCED_NEUTRAL_GROUPS = {
    "lesson-7-9-complete-a1-review": [
        ("audio_speaker", "A4 S6"),
        ("answer_audio_speaker", "R8"),
    ],
    "lesson-7-10-a1-final-mission": [("answer_audio_speaker", "R8 U8")],
}

# The old role is retained here as audit evidence; the final role is what must
# appear in both the validator map and canonical lesson YAML.
EXACT_ROLE_CHANGES = {
    ("lesson-7-9-complete-a1-review", "R7", "answer_audio_speaker"): (
        "female-character",
        "male-character",
    ),
    # 2026-09-18 gender-matched voice review: the recorded picture shows a woman or the
    # asker rather than the voiced man. None means the field is removed and the answer
    # inherits the card's prompt speaker. (The 4.7 recasts left with the Unit 4 rebuild.)
    # The 2026-09-18 recast of 4.9 U6 to Ana is history: the 2026-09-21 parity rebuild
    # re-authored that card over a fresh photograph of a man walking to work, so the line
    # is spoken by the pictured man again and has no recast left to pin. The 6.7 U7 removal left
    # with the 2026-09-27 Unit 6 rebuild, whose briefs name every speaker.
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
# The Unit 7 rebuild updates 7.9 explicit speakers (-2 net).
# The Unit 7 quality fix gives 7.9 U7's "I like music." its pictured man's voice (+2).
# The Unit 1 rebuild trims five Who questions from Lesson 1.9, two speaker fields each (-10).
# The 2026-09-25 Unit 3 rebuild authors every Unit 3 speaker from engine briefs: each line
# Ana, Luis, Sofia, Diego or a pictured person says keeps that voice, and neutral narration
# alternates the teacher and the co-teacher (+232 net across 14 lessons).
# The 2026-09-26 Unit 4 rebuild does the same for its ten teaching lessons, and the review's
# pictured people and alternating narrators keep their voices (+261 net).
# The 2026-09-26 Unit 5 rebuild does the same for its ten teaching lessons (Ana, Luis, the
# servers and every pictured customer keep their voices) and the six new review cards (+321 net).
# The 2026-09-29 action-question correction adds four explicit assignments in 3.3.
# The 2026-10-05 4.9 Reconoce correction adds ten post-correct neutral narrator
# assignments, alternating teacher and co-teacher. The follow-up restores ten
# matching upfront prompt-speaker assignments beside the preserved written cues.
EXPECTED_EXPLICIT_ASSIGNMENT_COUNT = 1877
EXPECTED_FINAL_ASSIGNMENTS_SHA256 = (
    "439bcbb5b80e0df4211490fc574222f1057d671d14d987ec67588f20816fbfd8"
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

        self.assertEqual(5, len(neutral))
        self.assertEqual(1, len(EXACT_ROLE_CHANGES))
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
