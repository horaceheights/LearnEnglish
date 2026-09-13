"""Read-only media preservation gate; explicit capture creates a new baseline only.

Generation scripts are association evidence, NOT verified provider receipts.
Unknown and Gemini-associated assets receive the same fail-closed protection.
This gate never approves pixels, deletes files, or runs a generation script.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess

import yaml

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "docs/qa/course-media-preservation-baseline.json"
PLANS = ROOT / "docs/product/course-media-change-plans.json"
IMAGE_ROOTS = ("Lessons/Lesson1/images", "mobile/assets/lesson-assets", "frontend/public/lesson-assets")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def images(value) -> set[str]:
    if isinstance(value, dict):
        own = {Path(v.split("?", 1)[0]).name for k, v in value.items()
               if k in ("image_url", "prompt_image_url", "title_image_url") and isinstance(v, str) and v}
        return own | set().union(*(images(v) for v in value.values()), set())
    if isinstance(value, list):
        return set().union(*(images(v) for v in value), set())
    return set()


def lessons(root: Path) -> dict:
    return {data["id"]: data for path in (root / "backend/lessons").glob("unit_*/*.yaml")
            if (data := yaml.safe_load(path.read_text(encoding="utf-8-sig")))}


def gemini_associations(root: Path) -> dict:
    associations = {}
    for name in ("build_unit_1_all_assets.py", "build_unit_2_all_assets.py",
                 "build_unit_2_mission_assets.py", "generate_unit_2_review_assets.py"):
        path = root / "scripts" / name
        tree = ast.parse(path.read_text(encoding="utf-8-sig"))
        for node in ast.walk(tree):
            # Parse literal filenames without importing a script that reads keys.
            if not isinstance(node, ast.Constant) or not isinstance(node.value, str):
                continue
            filename = node.value
            if filename.endswith(".webp") and Path(filename).name == filename:
                associations.setdefault(filename, []).append(f"scripts/{name}")
    return {name: sorted(set(evidence)) for name, evidence in associations.items()}


def capture(root: Path) -> dict:
    refs = {key: sorted(images(value)) for key, value in lessons(root).items()}
    evidence = gemini_associations(root)
    names = set().union(*(set(v) for v in refs.values()))
    records = {}
    for name in sorted(names):
        copies = {folder: digest(path) for folder in IMAGE_ROOTS if (path := root / folder / name).is_file()}
        if copies:
            records[name] = {"copies": copies, "provenance": "gemini-script-associated" if name in evidence else "unknown-protected",
                             "evidence": evidence.get(name, [])}
    return {"schema_version": 1, "source_commit": subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
        "note": "Association is not a verified provider receipt. Unknown assets are protected equally. No semantic approval.",
        "assets": records, "lesson_bindings": refs}


def validate_plan(plan: dict, baseline: dict, current: dict, root: Path) -> None:
    lesson_id, old, new = plan.get("lesson_id"), plan.get("old_filename"), plan.get("new_filename")
    if lesson_id not in current or old not in baseline["lesson_bindings"].get(lesson_id, []):
        raise ValueError("Replacement is not bound to an existing lesson/image use.")
    record = baseline["assets"].get(old, {})
    old_hash = record.get("copies", {}).get(IMAGE_ROOTS[0])
    if plan.get("old_sha256") != old_hash or not old_hash:
        raise ValueError("Replacement evidence is not bound to the original pixels.")
    if not isinstance(new, str) or not new.endswith(".webp") or Path(new).name != new or new == old:
        raise ValueError("Replacement needs a distinct safe versioned runtime filename.")
    if len(plan.get("issue_detail", "").strip()) < 35:
        raise ValueError("A concrete issue description is required; style preference is not sufficient.")
    if plan.get("issue") != "review-reuses-earlier-image":
        raise ValueError("Unreviewed exception type: record and implement its evidence check first.")
    number = tuple(map(int, current[lesson_id]["sub_lesson_id"].split(".")))
    if number[1] != 9:
        raise ValueError("Fresh-review exception is restricted to Lesson 9.")
    earlier = [key for key, lesson in current.items()
               if tuple(map(int, lesson["sub_lesson_id"].split("."))) < number]
    earlier_hashes = {baseline["assets"].get(name, {}).get("copies", {}).get(IMAGE_ROOTS[0])
                      for key in earlier for name in baseline["lesson_bindings"].get(key, [])}
    if old_hash not in earlier_hashes:
        raise ValueError("No earlier exact-image reuse supports this exception.")


def audit(root: Path, baseline: dict, plans: list[dict]) -> list[str]:
    errors = []
    current = lessons(root)
    allowed = set()
    for plan in plans:
        try:
            validate_plan(plan, baseline, current, root)
            key = (plan["lesson_id"], plan["old_filename"])
            if key in allowed:
                raise ValueError("Duplicate replacement scope.")
            allowed.add(key)
            if plan["old_filename"] not in images(current[plan["lesson_id"]]) and plan["new_filename"] not in images(current[plan["lesson_id"]]):
                errors.append(f"Replacement missing from scoped lesson: {key}")
        except ValueError as exc:
            errors.append(str(exc))
    for name, record in baseline["assets"].items():
        for folder, sha in record["copies"].items():
            path = root / folder / name
            if not path.is_file() or digest(path) != sha:
                errors.append(f"Original media changed or missing: {folder}/{name}")
    for key, names in baseline["lesson_bindings"].items():
        for name in set(names) - images(current.get(key, {})):
            if (key, name) not in allowed:
                errors.append(f"Unplanned removal/replacement: {key}: {name}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture", action="store_true")
    args = parser.parse_args()
    if args.capture:
        # Never silently reset the baseline after changing course images.
        with BASELINE.open("x", encoding="utf-8") as stream:
            json.dump(capture(ROOT), stream, ensure_ascii=False, indent=2)
            stream.write("\n")
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
    errors = audit(ROOT, baseline, plans)
    print(json.dumps({"protected_assets": len(baseline["assets"]), "planned_exceptions": len(plans), "errors": errors}, indent=2))
    return int(bool(errors))


if __name__ == "__main__":
    raise SystemExit(main())
