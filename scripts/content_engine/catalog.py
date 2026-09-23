"""Load one course's canonical lessons in course order with their role."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from scripts.audit_course_media_preservation import read_lesson

STANDARDS = Path("docs/product/content-standards.json")


@dataclass(frozen=True)
class CatalogLesson:
    number: str
    unit: int
    role: str  # standard, review or mission
    data: dict


def load_standards(root: Path, course: str) -> dict:
    standards = json.loads((root / STANDARDS).read_text(encoding="utf-8"))
    try:
        return standards["courses"][course]
    except KeyError as error:
        raise SystemExit(f"No content standards for course {course!r}.") from error


def lesson_role(data: dict) -> str:
    if data.get("experience_type") == "mission":
        return "mission"
    # A review declares no new language of its own.
    return "standard" if data.get("vocabulary") else "review"


def load_catalog(root: Path, standards: dict) -> list[CatalogLesson]:
    lessons = []
    for path in (root / standards["lessons_root"]).glob(standards["lesson_glob"]):
        data = read_lesson(path)
        number = str(data["sub_lesson_id"])
        lessons.append(CatalogLesson(number, int(number.split(".")[0]), lesson_role(data), data))
    return sorted(lessons, key=lambda lesson: tuple(int(part) for part in lesson.number.split(".")))
