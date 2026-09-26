from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
LESSONS_ROOT = ROOT / "backend" / "lessons"
SPEAKER_FIELDS = ("audio_speaker", "answer_audio_speaker")

# This is the reviewed, provider-neutral character cast. It deliberately
# excludes narration, object-only art, unknown questioners, and aggregate
# multi-speaker fields. Ordered conversation turns carry their own reviewed
# speaker roles and are validated independently. Ranges are inclusive and use
# canonical slide IDs, for example L1-L6.
ASSIGNMENT_GROUPS: dict[str, list[tuple[str, str, str]]] = {
    # Trimmed to 42 cards on 2026-09-23: the dropped question slides lose their pins.
    "lesson-8-who": [
        ("audio_speaker", "male-character", "L1 L3 L5 L7 L9 R1 R3 R5 R7 R9 A1 A3 A5 A9 S1 S3 S5 U5 U7 U9"),
        ("answer_audio_speaker", "male-character", "L1 L3 L5 L7 L9 R1 R3 R5 R7 R9 A1 A3 A5 A9 S1 S3 S5 U5 U7 U9"),
    ],
    # Unit 3 was rebuilt through the content engine on 2026-09-25: each brief names who says
    # every line, neutral narration alternates the teacher and the male-teacher narrator,
    # and these pins are regenerated from the installed lessons.
    # Unit 3 was rebuilt through the content engine on 2026-09-25: each brief names who says
    # every line, neutral narration alternates the teacher and the male-teacher narrator,
    # and these pins are regenerated from the installed lessons.
    "lesson-3-1-greetings-and-names": [
        ("audio_speaker", "ana", "L1 L2 L5 R1 R2 R10 R11 A1 A2 A4 A6 A10 S1 S2 U2 U5"),
        ("audio_speaker", "luis", "L3 L4 R3 R5 R7 A3 A5 A7 S3 S4 S5 U1 U3 U4 U6"),
        ("answer_audio_speaker", "ana", "R4 R6 U2 U5"),
        ("answer_audio_speaker", "luis", "R12 U1 U3 U4 U6"),
    ],
    "lesson-3-2-i-you-and-we": [
        ("audio_speaker", "ana", "L1 L2 L3 L4 R1 R3 R5 R7 R9 R11 A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 S1 S2 S3 S4 S5 S6 S7 S8 U1 U2 U3 U4 U5 U6"),
        ("answer_audio_speaker", "ana", "R2 R4 R6 R8 R10 R12 U1 U2 U3 U4 U5 U6"),
    ],
    "lesson-3-3-am-is-and-are": [
        ("audio_speaker", "ana", "R3 R4 A3 S4 U2"),
        ("audio_speaker", "luis", "L1 A4 S1 S5 U1 U3"),
        ("audio_speaker", "male-teacher", "R5 R7 R9 R11 A5 A7 A9 S6 S8 U4 U6 U8"),
        ("answer_audio_speaker", "ana", "U2"),
        ("answer_audio_speaker", "luis", "R4 U1 U3"),
        ("answer_audio_speaker", "male-teacher", "U4 U6 U8"),
    ],
    "lesson-3-yes-no-questions": [
        ("audio_speaker", "ana", "L1 R1 A1 U8"),
        ("audio_speaker", "luis", "L2 A2 U7"),
        ("audio_speaker", "male-teacher", "A4 A6 A8 S2 S4 S6 U2 U4 U6"),
        ("answer_audio_speaker", "ana", "U8"),
        ("answer_audio_speaker", "luis", "R2 U7"),
        ("answer_audio_speaker", "male-teacher", "R4 R6 R8 R12 U2 U4 U6"),
    ],
    "lesson-3-4-age": [
        ("audio_speaker", "female-character", "R11 U4 U5"),
        ("audio_speaker", "luis", "L6 S1 U1"),
        ("audio_speaker", "male-character", "A10 U6"),
        ("audio_speaker", "male-teacher", "L2 L4 L7 R4 R6 R8 R10 A1 A3 A5 A7 A9 S3 S5 S7 U3"),
        ("answer_audio_speaker", "female-character", "R10 U4 U5"),
        ("answer_audio_speaker", "luis", "U1"),
        ("answer_audio_speaker", "male-character", "R12 U6"),
        ("answer_audio_speaker", "male-teacher", "R2 R4 R6 R8 U3"),
    ],
    "lesson-3-age-16-20": [
        ("audio_speaker", "ana", "A9 S5 U5"),
        ("audio_speaker", "luis", "R10 R11 A10 S6 U6"),
        ("audio_speaker", "male-teacher", "L2 L4 R1 R3 R5 R7 R9 A1 A3 A5 A7 S1 S3 S7 U2 U4"),
        ("answer_audio_speaker", "ana", "R10 U5"),
        ("answer_audio_speaker", "luis", "U6"),
        ("answer_audio_speaker", "male-teacher", "U2 U4"),
    ],
    "lesson-3-5-countries-and-nationalities": [
        ("audio_speaker", "ana", "R5 R7 A4 A6 S3 S5 U3"),
        ("audio_speaker", "female-character", "R6 R8"),
        ("audio_speaker", "luis", "L5 R12 A5 A7 S2 S4 S6 U2 U4 U5"),
        ("audio_speaker", "male-teacher", "L2 L4 A1 A3 A9 S1 U1 U7"),
        ("answer_audio_speaker", "ana", "R12 U3"),
        ("answer_audio_speaker", "luis", "R6 R8 U2 U4 U5"),
        ("answer_audio_speaker", "male-teacher", "R2 R4 R10 U1 U7"),
    ],
    "lesson-3-canada-and-spain": [
        ("audio_speaker", "diego", "R7 A7 S4 U2"),
        ("audio_speaker", "male-teacher", "L2 L4 R8 A2 A8 A10 S6 S8 U4 U6"),
        ("audio_speaker", "sofia", "A6 S3 U1"),
        ("answer_audio_speaker", "diego", "U2"),
        ("answer_audio_speaker", "male-teacher", "R2 R8 R10 R12 U4 U6"),
        ("answer_audio_speaker", "sofia", "R6 U1"),
    ],
    "lesson-3-6-professions": [
        ("audio_speaker", "luis", "L7 S4 U1"),
        ("audio_speaker", "male-teacher", "L2 L4 L6 R2 R4 A2 A6 A8 S1 S3 S7 U3 U5"),
        ("answer_audio_speaker", "luis", "U1"),
        ("answer_audio_speaker", "male-teacher", "R8 R10 R12 U3 U5"),
    ],
    "lesson-3-7-my-your-his-and-her": [
        ("audio_speaker", "ana", "L1 L2 R1 R5 R9 A1 A2 A3 A4 A6 A7 A8 S1 S2 S4 S5 S6 U1 U2 U4 U5"),
        ("audio_speaker", "male-teacher", "L4 A10 S8 U7"),
        ("audio_speaker", "sofia", "R7 A5 S3 U3"),
        ("answer_audio_speaker", "ana", "R2 R6 R8 R10 U1 U2 U4 U5"),
        ("answer_audio_speaker", "male-teacher", "R4 R12 U7"),
        ("answer_audio_speaker", "sofia", "U3"),
    ],
    "lesson-3-our-their": [
        ("audio_speaker", "female-character", "L1 R1 R5 A1 A3 A4 S1 S2 U1 U2"),
        ("audio_speaker", "male-teacher", "L3 R3 R7 R9 R11 A5 A7 A9 S3 S5 S7 U3 U5 U7"),
        ("answer_audio_speaker", "female-character", "R4 R12 U1 U2"),
        ("answer_audio_speaker", "male-teacher", "U3 U5 U7"),
    ],
    "lesson-3-8-have-and-has": [
        ("audio_speaker", "ana", "L4 R3 R5 A3 A4 A5 A10 S1 S2 S7 U1 U2 U7"),
        ("audio_speaker", "luis", "L3 R11 A2 A9 S6 U6"),
        ("audio_speaker", "male-teacher", "L2 R9 A1 A7 S3 S5 U4"),
        ("answer_audio_speaker", "ana", "R4 R6 R12 U1 U2 U7"),
        ("answer_audio_speaker", "luis", "R2 U6"),
        ("answer_audio_speaker", "male-teacher", "R7 U4"),
    ],
    "lesson-3-9-unit-3-review": [
        ("audio_speaker", "ana", "L3 L5 L6 L7 S2 U6"),
        ("audio_speaker", "female-character", "L4 U7"),
        ("audio_speaker", "luis", "L8 S3 U5 U8"),
        ("audio_speaker", "male-character", "L1 L2 R1 R3 R4 R10 N1 N2 S1 U1"),
        ("audio_speaker", "male-teacher", "R5 N4 N6 N8 N10 N12 N14 N16 N18 N20 S6"),
        ("audio_speaker", "sofia", "S4"),
        ("answer_audio_speaker", "ana", "R1 R8 U6"),
        ("answer_audio_speaker", "female-character", "R7 U7"),
        ("answer_audio_speaker", "luis", "R2 U5 U8"),
        ("answer_audio_speaker", "male-teacher", "R9"),
        ("answer_audio_speaker", "sofia", "R3"),
    ],
    "lesson-4-1-rooms-at-home": [
        ("audio_speaker", "ana", "U5"),
    ],
    "lesson-4-5-morning-routine": [
        ("audio_speaker", "ana", "L2 L3 L6-L8 R1-R5 N1-N5 S1-S6 U1-U5"),
        ("answer_audio_speaker", "ana", "R6"),
    ],
    "lesson-4-6-everyday-verbs": [
        ("audio_speaker", "ana", "L1 L5-L8 R1 R3 R5 N1 N3 N5 N6 S1 S3 S5 S6 U1 U2 U4 U5"),
        ("audio_speaker", "luis", "L2 L4 R2 R4 N2 N4 S2 S4 U3"),
        ("answer_audio_speaker", "ana", "R6-R8 U2"),
        ("answer_audio_speaker", "luis", "U3"),
    ],
    "lesson-4-7-simple-present": [
        ("audio_speaker", "ana", "L1 L2 L6 R1 R2 N1 N2 S1 S2 S6 U2 U4 U7"),
        ("audio_speaker", "female-character", "L5 S5"),
        ("answer_audio_speaker", "ana", "R6 U7"),
        ("answer_audio_speaker", "female-character", "R5"),
    ],
    "lesson-4-8-days-and-time": [
        ("audio_speaker", "ana", "L11 L12 S5 U3"),
        ("answer_audio_speaker", "ana", "R7 R8 U3"),
    ],
    "lesson-4-9-unit-4-review": [
        # Rebuilt review: every spoken first-person line matches the person in its picture,
        # and the picture-free listening banks alternate two ordinary voices.
        ("audio_speaker", "female-character", "L5 R5 R6 N9 N11 N13 N15 N16 N17 N18 S4 S5 U4 U8"),
        ("audio_speaker", "male-character", "L6 L7 N10 N12 N14 U5 U6"),
        ("answer_audio_speaker", "female-character", "U8"),
        ("answer_audio_speaker", "male-character", "U5 U6"),
    ],
    "lesson-5-4-likes-and-dislikes": [
        ("audio_speaker", "male-character", "L6 A5 S6 U3 U6"),
        ("answer_audio_speaker", "male-character", "R6"),
    ],
    "lesson-5-5-wants-and-needs": [
        ("audio_speaker", "male-character", "L2 R2 A2 S2 U3"),
    ],
    "lesson-5-6-meals": [
        ("audio_speaker", "male-character", "U5"),
    ],
    "lesson-5-8-ordering-politely": [
        ("audio_speaker", "male-character", "L5 L7 R1 A3 A5 S2 S4 S6 U2 U6 U8"),
        ("answer_audio_speaker", "male-character", "R6"),
    ],
    "lesson-5-9-unit-5-review": [
        # Rebuilt review: every spoken first-person or café line matches the person in its
        # picture, and the picture-free listening banks alternate two ordinary voices.
        ("audio_speaker", "female-character", "L5 R5 N3 N6 N9 N11 N15 N18 S3 S4 S6 U5"),
        ("audio_speaker", "male-character", "L6 N5 N14 N17 S2 S5 U6 U8"),
        ("answer_audio_speaker", "female-character", "U5"),
        ("answer_audio_speaker", "male-character", "R4 U8"),
    ],
    "lesson-6-2-transportation": [
        ("audio_speaker", "female-character", "L8 S6"),
        ("audio_speaker", "male-character", "L4 L6 R4 R7 S2 S4 U1-U3"),
        ("answer_audio_speaker", "female-character", "R6"),
    ],
    "lesson-6-6-can-and-cannot": [
        ("audio_speaker", "male-character", "L2 R2 A2 S2 U2"),
    ],
    "lesson-6-7-simple-requests": [
        ("audio_speaker", "female-character", "L4 S4"),
        ("audio_speaker", "male-character", "L3 R1 R4 A1 A3 S3 U7"),
        ("answer_audio_speaker", "male-character", "R8"),
    ],
    "lesson-6-9-unit-6-review": [
        # Rebuilt review: every spoken first-person or exchange line matches the person in its
        # picture, and the picture-free listening banks alternate two ordinary voices.
        ("audio_speaker", "female-character", "N2 N6 N10 N13 S5 U1 U4"),
        ("audio_speaker", "male-character", "N9 N14 S1 S4 U6"),
        ("answer_audio_speaker", "male-character", "R2 R7 U6"),
    ],
    "lesson-7-1-the-body": [
        ("audio_speaker", "male-character", "L1-L8 R1-R4 A1-A5 S1-S6 U1-U6"),
        ("answer_audio_speaker", "male-character", "R5-R8"),
    ],
    "lesson-7-2-feelings-and-needs": [
        ("audio_speaker", "female-character", "L7 L8 A5 S2-S6 U1-U6"),
        ("audio_speaker", "male-character", "L6 S1"),
        ("answer_audio_speaker", "female-character", "R5 R6 U6"),
        ("answer_audio_speaker", "male-character", "R8"),
    ],
    "lesson-7-5-clothes-for-the-weather": [
        ("audio_speaker", "female-character", "L6 S5"),
        ("audio_speaker", "male-character", "L3 L5 L7 R3 R7 A3 A6 S3 S6 U3 U4"),
        ("answer_audio_speaker", "female-character", "R6"),
        ("answer_audio_speaker", "male-character", "R5"),
    ],
    "lesson-7-6-hobbies-and-free-time": [
        ("audio_speaker", "male-character", "U2"),
        ("audio_speaker", "female-character", "L5 L6 R8 A3 A5 S5 S6 U1 U3 U5 U7"),
        ("answer_audio_speaker", "female-character", "R6 U7"),
    ],
    "lesson-7-7-invitations-and-responses": [
        ("audio_speaker", "female-character", "L4 S4"),
        ("audio_speaker", "male-character", "L2 R4 R6 R8 A5 S2 S6 U2 U3 U6"),
        ("answer_audio_speaker", "female-character", "R7 U4"),
    ],
    "lesson-7-8-help-and-important-phrases": [
        ("audio_speaker", "male-character", "L3 L8 R2 A2 S2 U3 U5 U8"),
        ("answer_audio_speaker", "male-character", "R6"),
    ],
    "lesson-7-9-complete-a1-review": [
        ("audio_speaker", "male-character", "N2 N7 U5 U7"),
        ("answer_audio_speaker", "male-character", "R7 U5 U7"),
    ],
}


def expand_slides(specification: str) -> list[str]:
    slides: list[str] = []
    for token in specification.split():
        match = re.fullmatch(r"([A-Z]+)(\d+)-(?:(?:([A-Z]+))?)(\d+)", token)
        if not match:
            slides.append(token)
            continue
        start_prefix, start_number, end_prefix, end_number = match.groups()
        end_prefix = end_prefix or start_prefix
        if end_prefix != start_prefix:
            raise ValueError(f"Cross-prefix slide range is not supported: {token}")
        slides.extend(
            f"{start_prefix}{number}"
            for number in range(int(start_number), int(end_number) + 1)
        )
    return slides


def expected_assignments() -> dict[str, dict[str, dict[str, str]]]:
    expected: dict[str, dict[str, dict[str, str]]] = {}
    for lesson_id, groups in ASSIGNMENT_GROUPS.items():
        lesson_expected = expected.setdefault(lesson_id, {})
        for field, speaker, specification in groups:
            if field not in SPEAKER_FIELDS:
                raise ValueError(f"Unknown course-audio speaker field: {field}")
            for slide_id in expand_slides(specification):
                card_expected = lesson_expected.setdefault(slide_id, {})
                existing = card_expected.get(field)
                if existing and existing != speaker:
                    raise ValueError(
                        f"Conflicting {field} assignments for {lesson_id} {slide_id}: "
                        f"{existing} and {speaker}"
                    )
                card_expected[field] = speaker
    return expected


def lesson_files() -> dict[str, Path]:
    files: dict[str, Path] = {}
    for path in sorted(LESSONS_ROOT.rglob("*.yaml")):
        lesson = yaml.safe_load(path.read_text(encoding="utf-8"))
        lesson_id = lesson["id"]
        if lesson_id in files:
            raise ValueError(f"Duplicate lesson ID: {lesson_id}")
        files[lesson_id] = path
    return files


def apply_assignments() -> int:
    expected = expected_assignments()
    files = lesson_files()
    changed = 0
    for lesson_id, path in files.items():
        lesson = yaml.safe_load(path.read_text(encoding="utf-8"))
        lesson_expected = expected.get(lesson_id, {})
        seen_slides: set[str] = set()
        dirty = False
        for card in lesson["cards"]:
            slide_id = card.get("slide_id")
            if slide_id:
                if slide_id in seen_slides:
                    raise ValueError(f"Duplicate slide ID in {lesson_id}: {slide_id}")
                seen_slides.add(slide_id)
            card_expected = lesson_expected.get(slide_id, {})
            for field in SPEAKER_FIELDS:
                desired = card_expected.get(field)
                if desired is None:
                    if field in card:
                        card.pop(field)
                        dirty = True
                elif card.get(field) != desired:
                    card[field] = desired
                    dirty = True
        missing_slides = sorted(set(lesson_expected) - seen_slides)
        if missing_slides:
            raise ValueError(f"Missing slides in {lesson_id}: {', '.join(missing_slides)}")
        if dirty:
            path.write_text(
                json.dumps(lesson, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            changed += 1
    missing_lessons = sorted(set(expected) - set(files))
    if missing_lessons:
        raise ValueError(f"Missing lessons: {', '.join(missing_lessons)}")
    return changed


def validate_assignments() -> list[str]:
    expected = expected_assignments()
    errors: list[str] = []
    files = lesson_files()
    for lesson_id, path in files.items():
        lesson = yaml.safe_load(path.read_text(encoding="utf-8"))
        lesson_expected = expected.get(lesson_id, {})
        seen_slides: set[str] = set()
        for card in lesson["cards"]:
            slide_id = card.get("slide_id")
            if slide_id:
                seen_slides.add(slide_id)
            card_expected = lesson_expected.get(slide_id, {})
            for field in SPEAKER_FIELDS:
                actual = card.get(field)
                desired = card_expected.get(field)
                if actual != desired:
                    errors.append(
                        f"{lesson_id} {slide_id or '<no-slide-id>'} {field}: "
                        f"expected {desired!r}, found {actual!r}"
                    )
        for missing_slide in sorted(set(lesson_expected) - seen_slides):
            errors.append(f"{lesson_id}: expected slide is missing: {missing_slide}")
    for missing_lesson in sorted(set(expected) - set(files)):
        errors.append(f"Expected lesson is missing: {missing_lesson}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate the reviewed provider-neutral course-audio cast.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the reviewed speaker assignments to the canonical lesson files.",
    )
    args = parser.parse_args()
    if args.apply:
        print(f"Updated {apply_assignments()} lesson files.")
    errors = validate_assignments()
    if errors:
        raise SystemExit("Course-audio cast validation failed:\n- " + "\n- ".join(errors))
    print("Course-audio cast validation passed.")


if __name__ == "__main__":
    main()
