from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = ROOT / "backend"
OUTPUT_ROOT = ROOT / "mobile" / "src" / "generated"

sys.path.insert(0, str(BACKEND_ROOT))

from app.data import LESSONS  # noqa: E402


def model_payload(model: object) -> dict[str, object]:
    if hasattr(model, "model_dump"):
        return model.model_dump(mode="json")  # type: ignore[no-any-return, union-attr]
    return json.loads(model.json())  # type: ignore[no-any-return, union-attr]


def export_lesson(lesson_id: str) -> Path:
    lesson = LESSONS.get(lesson_id)
    if lesson is None:
        raise SystemExit(f"Unknown lesson: {lesson_id}")

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT_ROOT / f"{lesson_id}.json"
    destination.write_text(
        json.dumps(model_payload(lesson), ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export reviewed backend lessons for the Expo Preview app."
    )
    parser.add_argument(
        "--lesson-id",
        action="append",
        dest="lesson_ids",
        default=[],
        help="Lesson ID to export. May be supplied more than once.",
    )
    args = parser.parse_args()
    lesson_ids = args.lesson_ids or ["lesson-1-people-actions"]

    for lesson_id in lesson_ids:
        destination = export_lesson(lesson_id)
        print(destination.relative_to(ROOT))


if __name__ == "__main__":
    main()
