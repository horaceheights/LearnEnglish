from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "docs" / "product" / "a1-course-canvas.json"


def extract_json_constant(source: str, name: str, next_name: str) -> Any:
    pattern = rf"const\s+{re.escape(name)}\s*=\s*(.*?);\s*const\s+{re.escape(next_name)}\s*="
    match = re.search(pattern, source, flags=re.DOTALL)
    if match is None:
        raise ValueError(f"Could not find static JSON constant {name!r}.")
    return json.loads(match.group(1))


def normalized_sections(lesson: dict[str, Any]) -> dict[str, list[list[Any]]]:
    sections = lesson.get("stages") or lesson.get("sections")
    if not isinstance(sections, dict):
        raise ValueError(f"Lesson {lesson.get('id')} has no stage sections.")
    expected = ["Learn", "Recognize", "Listen", "Speak", "Use"]
    if list(sections) != expected:
        raise ValueError(
            f"Lesson {lesson.get('id')} has invalid stage order: {list(sections)}"
        )
    return sections


def import_canvas(source_path: Path) -> dict[str, Any]:
    raw_bytes = source_path.read_bytes()
    source = html.unescape(raw_bytes.decode("utf-8"))

    course = extract_json_constant(source, "plannedCourseDetails", "planCorrections")
    corrections = extract_json_constant(source, "planCorrections", "planMetadataCorrections")
    metadata_corrections = extract_json_constant(
        source, "planMetadataCorrections", "planSceneCorrections"
    )
    scene_corrections = extract_json_constant(
        source, "planSceneCorrections", "planPurposefulReview"
    )

    purpose_match = re.search(
        r"const\s+planPurposefulReview\s*=\s*(.*?);\s*const\s+",
        source,
        flags=re.DOTALL,
    )
    purposeful_review = json.loads(purpose_match.group(1)) if purpose_match else {}

    for unit in course:
        for lesson in unit.get("lessons", []):
            lesson_id = str(lesson["id"])
            sections = normalized_sections(lesson)
            for stage, rows in sections.items():
                for index, row in enumerate(rows):
                    correction_key = f"{lesson_id}|{stage}|{row[0]}"
                    if correction_key in corrections:
                        rows[index] = corrections[correction_key]

            if lesson_id in scene_corrections:
                lesson["scene_contract"] = scene_corrections[lesson_id]

            metadata = metadata_corrections.get(lesson_id, {})
            if "purposefulReview" in metadata:
                lesson["purposeful_review_slides"] = metadata["purposefulReview"]
            elif lesson_id in purposeful_review:
                lesson["purposeful_review_slides"] = purposeful_review[lesson_id]

            lesson["stages"] = sections
            lesson.pop("sections", None)

    return {
        "schema_version": 1,
        "source": {
            "filename": source_path.name,
            "sha256": hashlib.sha256(raw_bytes).hexdigest(),
            "imported_on": date.today().isoformat(),
            "trust": "Static JSON extracted from an untrusted HTML attachment; no attachment code executed.",
        },
        "units": course,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Safely import the approved A1 course canvas as static JSON."
    )
    parser.add_argument("canvas", type=Path, help="Path to the course canvas HTML attachment.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    payload = import_canvas(args.canvas.resolve())
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(output)


if __name__ == "__main__":
    main()
