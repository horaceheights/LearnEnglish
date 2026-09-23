"""Install composed lessons safely.

The install-safety rules that lived only inside the legacy unit builders:
- refuse when a lesson changed after its plan was taken (concurrent edit);
- refuse plans still marked as drafts, such as unmeasured mission geometry;
- compose every lesson before writing any file;
- validate the whole course after writing, and restore every file if it fails.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

from scripts.content_engine.plan import compose_lesson

VALIDATORS = (
    ["scripts/validate_lesson_cards.py", "--semantic-review-policy", "preview"],
    ["scripts/audit_content_practice.py", "--check"],
)


class InstallRefused(RuntimeError):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def lesson_text(lesson: dict) -> str:
    """The canonical lesson file format: JSON with two-space indentation."""
    return json.dumps(lesson, indent=2, ensure_ascii=False) + "\n"


def source_record(root: Path, path: Path) -> dict:
    return {"path": path.relative_to(root).as_posix(), "sha256": digest(path.read_bytes())}


def run_validators(root: Path) -> list[str]:
    failures = []
    for command in VALIDATORS:
        result = subprocess.run([sys.executable, *command], cwd=root, capture_output=True, text=True,
                                encoding="utf-8", errors="replace")
        if result.returncode:
            failures.append(f"{' '.join(command)}\n{(result.stdout + result.stderr)[-4000:]}")
    return failures


def install(root: Path, plans: list[dict], validate=run_validators) -> list[str]:
    """Write every plan's lesson, or none. Returns the paths written."""
    pending: dict[Path, str] = {}
    for plan in plans:
        name = plan.get("lesson", {}).get("id", "?")
        if plan.get("draft"):
            raise InstallRefused(f"{name}: draft plans are never installed.")
        source = plan.get("source") or {}
        if not source.get("path"):
            raise InstallRefused(f"{name}: a plan must name the lesson file it installs to.")
        path = root / source["path"]
        if path in pending:
            raise InstallRefused(f"{name}: two plans install to {source['path']}.")
        expected = source.get("sha256")
        if expected is None:
            if path.exists():
                raise InstallRefused(f"{name}: {source['path']} already exists; import it before replacing it.")
        elif not path.exists() or digest(path.read_bytes()) != expected:
            raise InstallRefused(f"{name}: {source['path']} changed after this plan was taken; re-import it.")
        pending[path] = lesson_text(compose_lesson(plan))

    originals = {path: path.read_bytes() if path.exists() else None for path in pending}
    try:
        for path, text in pending.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8", newline="\n")
        failures = validate(root)
    except BaseException:
        _restore(originals)
        raise
    if failures:
        _restore(originals)
        raise InstallRefused("Course validation failed; every file was restored.\n" + "\n".join(failures))
    return [path.relative_to(root).as_posix() for path in pending]


def _restore(originals: dict[Path, bytes | None]) -> None:
    for path, data in originals.items():
        if data is None:
            path.unlink(missing_ok=True)
        else:
            path.write_bytes(data)
