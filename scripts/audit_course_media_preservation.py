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
import sys
from types import SimpleNamespace

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


USE_IMAGE_ISSUE = "use-image-contradicts-sentence"


def use_prompt_image_contradicts(lesson: dict, card: dict, filename: str) -> bool:
    """Ask the Use sentence/image check whether ``filename`` fails ``card``'s sentence."""
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    from scripts.validate_lesson_cards import find_use_prompt_image_mismatches

    sentence = card.get("answer_audio_text") or card.get("audio_text") or ""
    probe = SimpleNamespace(stage="Use", slide_id=card.get("slide_id"), prompt_image_url=filename,
                            answer_audio_text=sentence, audio_text=sentence)
    scope = {lesson["id"]: SimpleNamespace(sub_lesson_id=lesson["sub_lesson_id"], cards=[probe])}
    mismatches, _ = find_use_prompt_image_mismatches(scope)
    return bool(mismatches)


def use_prompt_image_has_course_evidence(filename: str) -> bool:
    """Ask whether an authored description or a teaching card vouches for ``filename``."""
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    from scripts.validate_lesson_cards import use_prompt_image_has_course_evidence as has_evidence

    return has_evidence(filename)


def validate_use_image_plan(plan: dict, lesson: dict, image_contradicts,
                            image_has_evidence=use_prompt_image_has_course_evidence) -> None:
    cards = [card for card in lesson.get("cards", [])
             if card.get("stage") == "Use" and card.get("slide_id") == plan.get("slide_id")]
    if len(cards) != 1:
        raise ValueError("A Use-image exception must name exactly one Use card.")
    if Path(str(cards[0].get("prompt_image_url") or "").split("?", 1)[0]).name != plan["new_filename"]:
        raise ValueError("The named Use card must show the replacement image.")
    if image_contradicts(lesson, cards[0], plan["new_filename"]):
        raise ValueError("The replacement image also contradicts this Use sentence.")
    if image_contradicts(lesson, cards[0], plan["old_filename"]):
        return
    # An untaught placeholder with no authored description gives the check
    # nothing to contradict, so a recorded visual review must stand in for it.
    if image_has_evidence(plan["old_filename"]):
        raise ValueError("The original image does not contradict this Use sentence.")
    if len(str(plan.get("original_shows") or "").strip()) < 12:
        raise ValueError("Retiring an untaught placeholder needs a recorded review of what it shows.")


def validate_plan(plan: dict, baseline: dict, current: dict, root: Path,
                  image_contradicts=use_prompt_image_contradicts,
                  image_has_evidence=use_prompt_image_has_course_evidence) -> None:
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
    if plan.get("issue") == USE_IMAGE_ISSUE:
        validate_use_image_plan(plan, current[lesson_id], image_contradicts, image_has_evidence)
        return
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


def audit(root: Path, baseline: dict, plans: list[dict],
          image_contradicts=use_prompt_image_contradicts,
          image_has_evidence=use_prompt_image_has_course_evidence) -> list[str]:
    errors = []
    current = lessons(root)
    allowed = set()
    for plan in plans:
        try:
            validate_plan(plan, baseline, current, root, image_contradicts, image_has_evidence)
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
