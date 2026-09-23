"""The course's expected shape, from the versioned release-integrity manifest.

`mobile/release-integrity.json` is the fail-closed release contract: it pins
the exact catalog plus its lesson and unit counts, and changes only in a
deliberate curriculum release. Tests and scripts read the expected course size
here instead of assuming 70 lessons or ten lessons per unit (unit size follows
content, approved 2026-09-23).

A lesson's role comes from its data, never its position: a mission declares
`experience_type: mission`, and a review is a non-mission lesson that declares
no new vocabulary.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path("mobile/release-integrity.json")


def release_catalog(root: Path = ROOT) -> dict:
    return json.loads((root / MANIFEST).read_text(encoding="utf-8"))["catalog"]


def expected_lesson_count(root: Path = ROOT) -> int:
    return int(release_catalog(root)["lessonCount"])


def expected_lessons_by_unit(root: Path = ROOT) -> dict[str, int]:
    return {unit: int(count) for unit, count in release_catalog(root)["lessonsByUnit"].items()}


def _value(lesson, key, default=None):
    return lesson.get(key, default) if isinstance(lesson, dict) else getattr(lesson, key, default)


def is_mission(lesson) -> bool:
    return _value(lesson, "experience_type") == "mission"


def is_review(lesson) -> bool:
    return not is_mission(lesson) and not _value(lesson, "vocabulary")


def is_foundation(lesson) -> bool:
    """A forward-building lesson: neither the unit review nor its mission."""
    return not is_mission(lesson) and not is_review(lesson)
