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


def read_lesson(path: Path) -> dict:
    text = path.read_text(encoding="utf-8-sig")
    # Most authored lessons use JSON syntax inside .yaml files. Parse those
    # directly without changing their data or caching possibly edited files.
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return yaml.load(text, Loader=getattr(yaml, 'CSafeLoader', yaml.SafeLoader))


def lessons(root: Path) -> dict:
    return {data["id"]: data for path in (root / "backend/lessons").glob("unit_*/*.yaml")
            if (data := read_lesson(path))}


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


def validate_dialogue_poster_plan(plan: dict, current: dict, root: Path) -> None:
    """A dialogue may start on its own existing first-turn photograph."""
    evidence='docs/qa/course-dialogue-poster-reuse-v1.json'
    if plan.get('evidence_file')!=evidence:raise ValueError('Dialogue poster requires exact inspection evidence.')
    rows=json.loads((root/evidence).read_text(encoding='utf-8'))['assets']
    matches=[r for r in rows if (r['lesson_id'],r['old_filename'],r['candidate_filename'],r['old_sha256'])==
             (plan['lesson_id'],plan['old_filename'],plan['new_filename'],plan['old_sha256'])]
    if len(matches)!=1:raise ValueError('Missing exact dialogue poster pair.')
    row=matches[0];lesson=current[row['lesson_id']]
    if int(lesson['sub_lesson_id'].split('.')[1])==10:raise ValueError('Not a mission-scene exception.')
    if row.get('crop_review')!='inspected-complete-3x2-dialogue' or len(row.get('new_observation',''))<35:
        raise ValueError('Dialogue framing has not been inspected.')
    for entry in row['cards']:
        card=next(c for c in lesson['cards'] if c['slide_id']==entry['slide_id'])
        turns=card.get('audio_turns',[])
        if card.get('stage') not in {'Learn','Speak'} or len(card.get('options',[]))!=1 or not turns:
            raise ValueError('Only a single non-selectable model image may follow its dialogue.')
        if card.get('audio_text')!=entry['audio_text'] or turns!=entry['audio_turns']:
            raise ValueError('Dialogue changed since inspection.')
        if Path(turns[0].get('image_url','')).name!=row['candidate_filename'] or Path(card['options'][0]['image_url']).name not in {row['old_filename'],row['candidate_filename']}:
            raise ValueError('Poster must match this exact card first dialogue turn.')
    for folder in IMAGE_ROOTS:
        if digest(root/folder/row['candidate_filename'])!=row['new_sha256']:raise ValueError('Dialogue source pixels changed.')
    if not row['cards']:raise ValueError('No exact dialogue cards.')
    for other in current.values():
        if tuple(map(int,other['sub_lesson_id'].split('.')))>=tuple(map(int,lesson['sub_lesson_id'].split('.'))):continue
        if lesson['sub_lesson_id'].endswith('.9') and row['candidate_filename'] in images(other):
            raise ValueError('Review poster must not import an earlier lesson image.')


def validate_exact_diagram_plan(plan: dict, current: dict, root: Path) -> None:
    """Pixel-reviewed numeric/spatial contradiction; no blanket photo exemption."""
    evidence='docs/qa/course-exact-diagram-reuse-v1.json'
    if plan.get('evidence_file')!=evidence:
        raise ValueError('Exact diagram correction requires versioned pixel evidence.')
    proof=json.loads((root/evidence).read_text(encoding='utf-8'))
    matches=[r for r in proof['assets'] if (r['lesson_id'],r['old_filename'],r['candidate_filename'],r['old_sha256'])==
             (plan['lesson_id'],plan['old_filename'],plan['new_filename'],plan['old_sha256'])]
    if len(matches)!=1:raise ValueError('Missing exact diagram pair.')
    row=matches[0];lesson=current[plan['lesson_id']]
    if int(lesson['sub_lesson_id'].split('.')[1])>=9:
        raise ValueError('Existing diagrams cannot replace fresh review or mission media.')
    if row.get('relationship') not in {'price','distance','schedule'} or row.get('crop_review')!='inspected-full-use-prompt':
        raise ValueError('Unsupported precision diagram or uninspected framing.')
    if any(len(row.get(k,''))<35 for k in ('old_observation','new_observation')):
        raise ValueError('Both diagram pixel observations are required.')
    card=next((c for c in lesson['cards'] if c['slide_id']==row['slide_id']),None)
    if not card or card.get('stage')!='Use' or (card.get('answer_audio_text') or card.get('audio_text'))!=row['answer_text']:
        raise ValueError('Exact diagram correction is bound to a single unchanged Use sentence.')
    expected=f"/cards/{lesson['cards'].index(card)}/prompt_image_url"
    if row.get('pointer')!=expected or Path(card.get('prompt_image_url','')).name not in {plan['old_filename'],plan['new_filename']}:
        raise ValueError('Exact diagram binding scope changed.')
    if digest(root/IMAGE_ROOTS[0]/plan['old_filename'])!=row['old_sha256']:
        raise ValueError('Old diagram pixels changed.')
    for folder in IMAGE_ROOTS:
        path=root/folder/plan['new_filename']
        if not path.is_file() or digest(path)!=row['new_sha256']:
            raise ValueError('Inspected replacement diagram pixels changed.')


def validate_mission_still_plan(plan: dict, current: dict, root: Path) -> None:
    """Exact non-selectable voice still only; never a hotspot-scene exception."""
    if plan.get('evidence_file')!='docs/qa/course-mission-still-reuse-v1.json':
        raise ValueError('Mission still needs its exact versioned inspection evidence.')
    proof=json.loads((root/plan['evidence_file']).read_text(encoding='utf-8'))
    matches=[r for r in proof['assets'] if (r['lesson_id'],r['old_filename'],r['candidate_filename'],r['old_sha256'])==
             (plan['lesson_id'],plan['old_filename'],plan['new_filename'],plan['old_sha256'])]
    if len(matches)!=1:raise ValueError('Missing exact mission still pixel pair.')
    record=matches[0];lesson=current[plan['lesson_id']]
    if not lesson['sub_lesson_id'].endswith('.10') or record.get('crop_review')!='inspected-complete-3x2-voice-scene':
        raise ValueError('Mission voice still scope or framing is invalid.')
    card=next((c for c in lesson['cards'] if c['slide_id']==record['slide_id']),None)
    if not card or card.get('stage')!='Speak' or card.get('mission_game',{}).get('kind')!='voice-gate' or len(card.get('options',[]))!=1:
        raise ValueError('This exception cannot replace selectable mission scene targets.')
    if card.get('audio_text')!=record['answer_text'] or len(record.get('new_observation',''))<35:
        raise ValueError('Voice still meaning changed since inspection.')
    for folder in IMAGE_ROOTS:
        path=root/folder/plan['new_filename']
        if not path.is_file() or digest(path)!=record['new_sha256']:raise ValueError('Mission still pixels changed.')
    from scripts.install_course_photo_reuse import pointer_parent
    for scope in record['scopes']:
        parts=scope['pointer'].strip('/').split('/')
        if len(parts)!=5 or parts[0]!='cards' or parts[2] not in {'options','audio_turns'} or parts[4]!='image_url' or lesson['cards'][int(parts[1])] is not card:
            raise ValueError('Mission still scope extends beyond its named voice card.')
        parent,key=pointer_parent(lesson,scope['pointer'])
        if Path(parent[key]).name not in {plan['old_filename'],plan['new_filename']}:raise ValueError('Mission still binding drift.')
    if not record['scopes']:raise ValueError('Mission still has no inspected fields.')
    for other in current.values():
        if other['id']==lesson['id']:continue
        for name in images(other):
            path=root/IMAGE_ROOTS[0]/name
            if path.is_file() and digest(path)==record['new_sha256']:
                raise ValueError('A mission still must not reuse another lesson image.')


def validate_mission_rebuild_plan(plan: dict, current: dict, root: Path) -> None:
    """Retire an inspected mission scene only when a rebuilt mission replaces it.

    The old file stays byte-for-byte on disk. The evidence names the concrete
    defect, and the replacement must be a mission-only still that this same
    rebuild installed and actually binds.
    """
    import re
    lesson = current[plan['lesson_id']]
    if not lesson['sub_lesson_id'].endswith('.10') or lesson.get('experience_type') != 'mission':
        raise ValueError('Mission rebuild exceptions apply only to Lesson 10 missions.')
    evidence = str(plan.get('evidence_file', ''))
    if not re.fullmatch(r'docs/qa/unit-[2-7]-mission-media-v[1-9][0-9]*\.json', evidence) or not (root / evidence).is_file():
        raise ValueError('Mission rebuild needs its versioned installation evidence.')
    proof = json.loads((root / evidence).read_text(encoding='utf-8'))
    matches = [r for r in proof.get('retired_scenes', []) if (r.get('lesson_id'), r.get('old_filename'), r.get('old_sha256'))
               == (plan['lesson_id'], plan['old_filename'], plan['old_sha256'])]
    if len(matches) != 1 or len(matches[0].get('issue', '').strip()) < 35 or len(matches[0].get('observation', '').strip()) < 35:
        raise ValueError('Retired mission scene needs an exact inspected pixel record.')
    bound = images(lesson)
    if plan['old_filename'] in bound:
        raise ValueError('A retired mission scene must no longer be bound by the rebuilt mission.')
    installed = [a for a in proof.get('assets', []) if a.get('runtime_filename') == plan['new_filename']]
    if len(installed) != 1 or plan['new_filename'] not in bound:
        raise ValueError('The replacement must be a still installed and bound by this mission rebuild.')
    for folder in IMAGE_ROOTS:
        path = root / folder / plan['new_filename']
        if not path.is_file() or digest(path) != installed[0].get('runtime_sha256'):
            raise ValueError('Rebuilt mission pixels differ from their installation record.')
    for other in current.values():
        if other['id'] != lesson['id'] and plan['new_filename'] in images(other):
            raise ValueError('A mission still must stay mission-only.')


def validate_photo_reuse_plan(plan: dict, current: dict, root: Path) -> None:
    """A bounded inspected-reference exception, never a blanket style override."""
    evidence = 'docs/qa/course-photo-reuse-v1.json'
    if plan.get('evidence_file') != evidence:
        raise ValueError('Photo reuse needs the versioned inspection evidence.')
    proof = json.loads((root / evidence).read_text(encoding='utf-8'))
    expected_names={plan['new_filename'],*plan.get('alternative_filenames',[])}
    matching = [r for r in proof['assets'] if r['old_filename'] == plan['old_filename']
                and r['candidate_filename'] in expected_names and r['old_sha256'] == plan['old_sha256']]
    if len(matching) != len(expected_names):
        raise ValueError('Missing exact inspected old/new photo pair.')
    for record in matching:
        validate_photo_reuse_record(record,plan,current,root)


def validate_photo_reuse_record(record: dict, plan: dict, current: dict, root: Path) -> None:
    new_filename=record['candidate_filename']
    if record.get('kind') not in {'illustration-or-inset-retirement', 'user-selected-opening-cast'}:
        raise ValueError('Unreviewed photo replacement category.')
    if (record.get('crop_review') != 'inspected-3x2-and-centered-4x5'
            or len(record.get('old_observation', '')) < 35 or len(record.get('new_observation', '')) < 35):
        raise ValueError('Photo reuse requires actual pixel and crop inspection.')
    lesson = current[plan['lesson_id']]
    number=int(lesson['sub_lesson_id'].split('.')[1])
    if number == 10 or (number == 9 and not record.get('generation')):
        raise ValueError('Foundation photo reuse must not replace fresh review/mission scenes.')
    if number == 9:
        generation=record['generation']; source=root/generation['source_path'];receipt=generation['receipt']
        if not source.is_file() or digest(source)!=receipt.get('sha256') or receipt.get('status')!='image_saved':
            raise ValueError('Fresh review photo needs its immutable generation source and receipt.')
        for other in current.values():
            if other['id']==plan['lesson_id']:
                continue
            if tuple(map(int,other['sub_lesson_id'].split('.'))) <= tuple(map(int,lesson['sub_lesson_id'].split('.'))):
                for name in images(other):
                    path=root/IMAGE_ROOTS[0]/name
                    if path.is_file() and digest(path)==record['new_sha256']:
                        raise ValueError('A generated review image reuses earlier lesson pixels.')
    scopes = [s for s in record['scopes'] if s['lesson_id'] == plan['lesson_id']]
    if not scopes:
        raise ValueError('Photo evidence does not cover this lesson.')
    for folder in IMAGE_ROOTS:
        path = root / folder / new_filename
        if not path.is_file() or digest(path) != record['new_sha256']:
            raise ValueError('Replacement pixels differ from the inspected photo.')
    from scripts.install_course_photo_reuse import pointer_parent
    for scope in scopes:
        parent, key = pointer_parent(lesson, scope['pointer'])
        if Path(str(parent[key]).split('?', 1)[0]).name not in {plan['old_filename'], new_filename}:
            raise ValueError('Photo binding changed outside its inspected scope.')


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
    if plan.get('issue') == 'reviewed-legacy-photo-binding':
        validate_photo_reuse_plan(plan, current, root)
        return
    if plan.get('issue') == 'reviewed-mission-still-binding':
        validate_mission_still_plan(plan,current,root)
        return
    if plan.get('issue') == 'reviewed-exact-diagram-binding':
        validate_exact_diagram_plan(plan,current,root)
        return
    if plan.get('issue') == 'reviewed-existing-dialogue-poster':
        validate_dialogue_poster_plan(plan,current,root)
        return
    if plan.get('issue') == 'reviewed-mission-photo-edit':
        from scripts.mission_photo_edit_contract import validate_plan as validate_mission_edit
        validate_mission_edit(plan,current,root)
        return
    if plan.get('issue') == 'mission-rebuild-retires-scene':
        validate_mission_rebuild_plan(plan, current, root)
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
            replacement_names={plan['new_filename'],*plan.get('alternative_filenames',[])}
            if plan["old_filename"] not in images(current[plan["lesson_id"]]) and not replacement_names.intersection(images(current[plan["lesson_id"]])):
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
