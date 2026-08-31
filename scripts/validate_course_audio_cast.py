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
# excludes narration, object-only art, unknown questioners, and any clip that
# contains more than one speaker. Ranges are inclusive and use canonical
# slide IDs, for example L1-L6.
ASSIGNMENT_GROUPS: dict[str, list[tuple[str, str, str]]] = {
    "lesson-3-1-greetings-and-names": [
        ("audio_speaker", "ana", "L1 L3 L6 R1 R3 N1 N2 S1 S2 S5 U4"),
        ("audio_speaker", "luis", "L2 L4 L5 R2 N3 N5 S3 S4 U3"),
        ("answer_audio_speaker", "ana", "R4 U1"),
        ("answer_audio_speaker", "luis", "R5 U2 U5"),
    ],
    "lesson-3-2-i-you-and-we": [
        ("audio_speaker", "ana", "L1-L6 R1-R5 N1-N3 N6 S1-S6 U1-U6 U8"),
        ("audio_speaker", "luis", "R7"),
        ("answer_audio_speaker", "ana", "R6 R7 U7"),
        ("answer_audio_speaker", "luis", "R8"),
    ],
    "lesson-3-3-am-is-and-are": [
        ("audio_speaker", "ana", "L1-L3 R1-R2 N6 S1-S3 U1 U2 U6"),
        ("answer_audio_speaker", "ana", "R7 U8"),
    ],
    "lesson-3-4-age": [
        ("audio_speaker", "luis", "L11 U4 U7"),
        ("audio_speaker", "ana", "L12 N5 U5 U6 U8"),
        ("answer_audio_speaker", "ana", "R7"),
    ],
    "lesson-3-5-countries-and-nationalities": [
        ("audio_speaker", "ana", "L5 L6 R6 R8 S1 S2 U2 U3 U5"),
        ("audio_speaker", "luis", "L7 L9 S3 S4 U8"),
        ("audio_speaker", "diego", "L10 N4 U6"),
        ("audio_speaker", "sofia", "N3"),
        ("answer_audio_speaker", "ana", "R5 R7"),
        ("answer_audio_speaker", "sofia", "R6 U5"),
        ("answer_audio_speaker", "luis", "R8"),
    ],
    "lesson-3-6-professions": [
        ("audio_speaker", "luis", "L7 R7"),
        ("audio_speaker", "ana", "N1 S1 U1 U4 U5 U6"),
        ("answer_audio_speaker", "sofia", "R6"),
        ("answer_audio_speaker", "ana", "R7"),
        ("answer_audio_speaker", "luis", "R8 U5"),
    ],
    "lesson-3-7-my-your-his-and-her": [
        ("audio_speaker", "ana", "L1 L2 L4-L6 R1 R2 R4 R8 N1 N2 S1-S4 U1 U2 U4 U5 U8"),
        ("audio_speaker", "sofia", "L3 R3 U3"),
        ("answer_audio_speaker", "ana", "R5 R7"),
        ("answer_audio_speaker", "sofia", "R8 U8"),
    ],
    "lesson-3-8-have-and-has": [
        ("audio_speaker", "ana", "L1-L3 R1-R3 N1 N2 S1-S3 U1-U3"),
        ("answer_audio_speaker", "ana", "R7"),
    ],
    "lesson-3-9-unit-3-review": [
        ("audio_speaker", "ana", "L1-L4 R5 N3 S1-S5 U5 U7"),
        ("audio_speaker", "luis", "R3 N2 N4 U2-U4"),
        ("answer_audio_speaker", "ana", "R1 R3 R7 R8"),
        ("answer_audio_speaker", "luis", "R2 R4"),
    ],
    "lesson-3-10-introduction-mission": [
        ("audio_speaker", "ana", "L1-L4 R5 N2 N4 S1-S5 U1-U5"),
        ("audio_speaker", "luis", "R3 N3"),
        ("answer_audio_speaker", "ana", "R1-R4"),
    ],
    "lesson-4-1-rooms-at-home": [
        ("audio_speaker", "ana", "U5"),
    ],
    "lesson-4-5-morning-routine": [
        ("audio_speaker", "ana", "L1-L8 R1-R5 N1-N5 S1-S6 U1-U5"),
        ("answer_audio_speaker", "ana", "R6"),
    ],
    "lesson-4-6-everyday-verbs": [
        ("audio_speaker", "ana", "L1 L3 L5-L8 R1 R3 R5 N1 N3 N5 N6 S1 S3 S5 S6 U1 U3-U5"),
        ("audio_speaker", "luis", "L2 L4 R2 R4 N2 N4 S2 S4 U2"),
        ("answer_audio_speaker", "ana", "R6-R8"),
    ],
    "lesson-4-7-simple-present": [
        ("audio_speaker", "ana", "L1 L2 R1 R2 N1 N2 S1 S2 U1 U2"),
        ("audio_speaker", "female-character", "L5 S5 U5"),
        ("audio_speaker", "male-character", "L6 S6 U6"),
        ("answer_audio_speaker", "female-character", "R5"),
        ("answer_audio_speaker", "male-character", "R6"),
    ],
    "lesson-4-8-days-and-time": [
        ("audio_speaker", "ana", "L10 L12 S5 U6"),
        ("answer_audio_speaker", "ana", "R7 R8"),
    ],
    "lesson-4-9-unit-4-review": [
        ("audio_speaker", "ana", "R5 R6 N3 N4 S4 U4"),
        ("audio_speaker", "female-character", "L3 S5 U5"),
        ("audio_speaker", "male-character", "U6"),
    ],
    "lesson-4-10-my-day-mission": [
        ("audio_speaker", "male-character", "L3 S3"),
        ("audio_speaker", "female-character", "N4 S6"),
        ("answer_audio_speaker", "male-character", "R7"),
    ],
    "lesson-6-2-transportation": [
        ("audio_speaker", "female-character", "L8 S6"),
        ("answer_audio_speaker", "female-character", "R6"),
    ],
    "lesson-6-7-simple-requests": [
        ("audio_speaker", "female-character", "L1 L4 R3 A2 S1 S4 U2"),
        ("audio_speaker", "male-character", "L2 L3 R1 R4 R7 A1 A3 S2 S3"),
        ("answer_audio_speaker", "male-character", "R5 R8 U3"),
        ("answer_audio_speaker", "female-character", "U1 U7"),
    ],
    "lesson-6-9-unit-6-review": [
        ("audio_speaker", "female-character", "S5 U5"),
        ("answer_audio_speaker", "male-character", "R7"),
    ],
    "lesson-6-10-town-mission": [
        ("audio_speaker", "male-character", "L3"),
        ("audio_speaker", "female-character", "S5 U6"),
        ("answer_audio_speaker", "male-character", "R7"),
    ],
    "lesson-7-1-the-body": [
        ("audio_speaker", "male-character", "L1-L8 R1-R4 A1-A5 S1-S6 U1-U6"),
        ("answer_audio_speaker", "male-character", "R5-R8"),
    ],
    "lesson-7-2-feelings-and-needs": [
        ("audio_speaker", "male-character", "L6 S1"),
        ("audio_speaker", "female-character", "L7 L8 A5 S2-S6 U1-U5"),
        ("answer_audio_speaker", "male-character", "R8"),
        ("answer_audio_speaker", "female-character", "R5 R6 U6"),
    ],
    "lesson-7-5-clothes-for-the-weather": [
        ("audio_speaker", "female-character", "L3 L6 R3 A3 S3 S5"),
        ("audio_speaker", "male-character", "L7 R7 S6"),
        ("answer_audio_speaker", "female-character", "R6"),
    ],
    "lesson-7-6-hobbies-and-free-time": [
        ("audio_speaker", "male-character", "L5 A3 S5 U1 U2 U5 U6"),
        ("audio_speaker", "female-character", "L6 R8 A5 S6 U3"),
        ("answer_audio_speaker", "male-character", "R6 U8"),
        ("answer_audio_speaker", "female-character", "U7"),
    ],
    "lesson-7-7-invitations-and-responses": [
        ("audio_speaker", "male-character", "L2 S2 S6 U6"),
        ("audio_speaker", "female-character", "L4 R4 S4"),
        ("answer_audio_speaker", "male-character", "R6 U3 U7"),
        ("answer_audio_speaker", "female-character", "R7 U4 U8"),
    ],
    "lesson-7-8-help-and-important-phrases": [
        ("audio_speaker", "female-character", "L1-L6 R3 R4 A3 S1-S5 U1 U4"),
        ("audio_speaker", "male-character", "R2 A2 U2"),
        ("answer_audio_speaker", "female-character", "R5-R7 U5 U6"),
    ],
    "lesson-7-9-complete-a1-review": [
        ("audio_speaker", "ana", "A3 S2 U3"),
        ("audio_speaker", "female-character", "A4 S3 S6"),
        ("answer_audio_speaker", "female-character", "R7 R8 U8"),
    ],
    "lesson-7-10-a1-final-mission": [
        ("audio_speaker", "ana", "S1 S2 S6 U1 U2"),
        ("answer_audio_speaker", "ana", "R2"),
        ("answer_audio_speaker", "female-character", "R4 R5 R8 U8"),
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
