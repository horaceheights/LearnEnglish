"""Give every written answer choice its authored Spanish.

User decisions 2026-11-18: every slide where the learner picks written English
(Recognize and Listen text choices, and mission conversation decisions) gets an
on-demand Traducir button that shows each choice's Spanish under its English.
Completa word tiles keep their sentence tap instead. Choices store that Spanish
as `spanish_translation`. This backfill fills it on existing lessons from, in order:

1. the lesson's own content brief (item or pool `es`, matched by exact English);
2. any other content brief;
3. exact authored Spanish for the same English elsewhere in the catalog
   (single-image Learn and Speak models, audio turns, Use answers);
4. the reviewed hand-written tables in docs/qa/*-option-translations-2026-11-18.json.

Run without --write for a report. --write edits the lesson files in place,
keeping each file's existing serialization byte-for-byte apart from the new
values. Rerun scripts/export_mobile_preview_lessons.py afterwards.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
import subprocess
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
LESSON_ROOT = ROOT / "backend" / "lessons"
BRIEF_ROOT = ROOT / "docs" / "product" / "content-briefs"
MANUAL_TABLES = [ROOT / "docs" / "qa" / "recognize-option-translations-2026-11-18.json",
                 ROOT / "docs" / "qa" / "listen-option-translations-2026-11-18.json"]
TRANSLATED_STAGES = {"Recognize", "Listen"}
FALLBACK = "Traducción no disponible todavía."


def qualifies(card: dict) -> bool:
    """A Recognize or Listen card (or mission conversation decision) with written choices."""
    options = card.get("options") or []
    game = card.get("mission_game")
    return (card.get("stage") in TRANSLATED_STAGES
            and (not game or game.get("kind") == "conversation-decision")
            and len(options) >= 2
            and all(not str(option.get("image_url") or "").strip() and str(option.get("label") or "").strip()
                    for option in options))


def load_lessons() -> dict[Path, tuple[str, dict]]:
    lessons = {}
    for path in sorted(LESSON_ROOT.rglob("*.yaml")):
        text = path.read_text(encoding="utf-8")
        data = json.loads(text) if text.lstrip().startswith("{") else yaml.safe_load(text)
        lessons[path] = (text, data)
    return lessons


def load_briefs() -> tuple[dict[str, dict[str, str]], dict[str, collections.Counter]]:
    by_lesson: dict[str, dict[str, str]] = collections.defaultdict(dict)
    anywhere: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for path in sorted(BRIEF_ROOT.rglob("*.json")):
        try:
            brief = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if not isinstance(brief, dict):
            continue
        lesson_id = (brief.get("lesson") or {}).get("id")
        for entry in [*(brief.get("items") or []), *(brief.get("pool") or [])]:
            if not isinstance(entry, dict):
                continue
            english, spanish = str(entry.get("text") or "").strip(), str(entry.get("es") or "").strip()
            if english and spanish:
                anywhere[english][spanish] += 1
                if lesson_id:
                    by_lesson[lesson_id].setdefault(english, spanish)
    return by_lesson, anywhere


def instruction_like(spanish: str) -> bool:
    return spanish.startswith(("Elige", "¡Elige", "Escucha", "¡Escucha", "Mira", "Toca"))


def catalog_translations(lessons) -> dict[str, collections.Counter]:
    found: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)

    def add(english, spanish):
        english, spanish = str(english or "").strip(), str(spanish or "").strip()
        if english and spanish and spanish != FALLBACK and "\n" not in spanish and not instruction_like(spanish):
            found[english][spanish] += 1

    for _, lesson in lessons.values():
        for card in lesson.get("cards") or []:
            for field in ("audio_turns", "answer_audio_turns", "success_audio_turns"):
                for turn in card.get(field) or []:
                    add(turn.get("text"), turn.get("spanish_translation"))
            options = card.get("options") or []
            if card.get("stage") in ("Learn", "Speak") and len(options) == 1 and not card.get("audio_turns"):
                add(options[0].get("label"), card.get("spanish_translation"))
            if card.get("stage") == "Use" and card.get("answer_audio_text") and not card.get("answer_audio_turns"):
                add(card.get("answer_audio_text"), card.get("spanish_translation"))
            # A Listen card's own Spanish translates its spoken line when that line is the answer.
            correct = next((option for option in options if option.get("id") == card.get("correct_option_id")), None)
            if (card.get("stage") == "Listen" and correct and not card.get("audio_turns")
                    and str(card.get("audio_text") or "").strip() == str(correct.get("label") or "").strip()):
                add(card.get("audio_text"), card.get("spanish_translation"))
            for option in options:
                add(option.get("label"), option.get("spanish_translation"))
    return found


def matched_punctuation(english: str, spanish: str) -> str:
    """Brief entries sometimes omit the final period that the card shows."""
    if english.endswith(".") and not re.search(r"[.?!]$", spanish):
        return spanish + "."
    if not re.search(r"[.?!]$", english) and spanish.endswith("."):
        return spanish[:-1]
    return spanish


def resolve(lessons, briefs_by_lesson, briefs_anywhere, catalog, manual):
    plan, sources, gaps, disagreements = {}, collections.Counter(), collections.defaultdict(list), []

    def loose(english):
        return english.rstrip(".").strip().lower()

    loose_briefs = {loose(k): v for k, v in briefs_anywhere.items()}
    loose_catalog = {loose(k): v for k, v in catalog.items()}
    for path, (_, lesson) in lessons.items():
        own = briefs_by_lesson.get(lesson.get("id"), {})
        for card in lesson.get("cards") or []:
            if not qualifies(card):
                continue
            for option in card["options"]:
                english = option["label"].strip()
                existing = str(option.get("spanish_translation") or "").strip()
                if existing:
                    sources["already present"] += 1
                    continue
                if english in manual:
                    spanish, source = manual[english], "manual table"
                elif english in own:
                    spanish, source = own[english], "own brief"
                elif english in briefs_anywhere:
                    spanish, source = briefs_anywhere[english].most_common(1)[0][0], "other brief"
                elif english in catalog:
                    spanish, source = catalog[english].most_common(1)[0][0], "catalog"
                elif loose(english) in loose_briefs:
                    spanish, source = loose_briefs[loose(english)].most_common(1)[0][0], "brief (punctuation)"
                elif loose(english) in loose_catalog:
                    spanish, source = loose_catalog[loose(english)].most_common(1)[0][0], "catalog (punctuation)"
                else:
                    gaps[english].append(f"{lesson.get('id')}:{card.get('slide_id')}")
                    continue
                spanish = matched_punctuation(english, spanish)
                for pool in (briefs_anywhere, catalog):
                    others = {matched_punctuation(english, each) for each in pool.get(english, {})} - {spanish}
                    if others and source != "manual table":
                        disagreements.append((english, spanish, sorted(others)))
                plan[(path, card.get("slide_id"), option["id"])] = spanish
                sources[source] += 1
    return plan, sources, gaps, disagreements


def yaml_scalar(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_yaml(path: Path, text: str, lesson: dict, values: dict[tuple[str, str], str]) -> str:
    """Insert into flow-style option mappings without re-serializing the file."""
    lines, slide, out = text.splitlines(keepends=True), None, []
    for line in lines:
        match = re.match(r"^- slide_id: (.+?)\s*$", line)
        if match:
            slide = yaml.safe_load(match.group(1))
        option = re.match(r"^(\s*- \{id: )([^,]+)(, .*)\}(\r?\n?)$", line)
        if option and (slide, yaml.safe_load(option.group(2))) in values:
            spanish = values[(slide, yaml.safe_load(option.group(2)))]
            line = f"{option.group(1)}{option.group(2)}{option.group(3)}, spanish_translation: {yaml_scalar(spanish)}}}{option.group(4)}"
        out.append(line)
    result = "".join(out)
    expected = json.loads(json.dumps(lesson))
    for card in expected.get("cards") or []:
        for each in card.get("options") or []:
            if (card.get("slide_id"), each["id"]) in values:
                each["spanish_translation"] = values[(card.get("slide_id"), each["id"])]
    if yaml.safe_load(result) != expected:
        raise SystemExit(f"{path}: flow-style insertion did not produce the expected lesson.")
    return result


def apply(lessons, plan) -> int:
    per_file: dict[Path, dict[tuple[str, str], str]] = collections.defaultdict(dict)
    for (path, slide, option_id), spanish in plan.items():
        per_file[path][(slide, option_id)] = spanish
    for path, values in per_file.items():
        text, lesson = lessons[path]
        if text.lstrip().startswith("{"):
            for card in lesson.get("cards") or []:
                for option in card.get("options") or []:
                    if (card.get("slide_id"), option["id"]) in values:
                        option["spanish_translation"] = values[(card.get("slide_id"), option["id"])]
            result = json.dumps(lesson, indent=2, ensure_ascii=False) + "\n"
        else:
            result = write_yaml(path, text, lesson, values)
        path.write_text(result, encoding="utf-8", newline="")
    return len(per_file)


PLAN_ROOT = ROOT / "docs" / "product" / "content-plans"


def sync_plans(lessons) -> int:
    """Stored engine plans must keep composing their installed lessons exactly."""
    installed = {}
    for _, lesson in lessons.values():
        for card in lesson.get("cards") or []:
            for option in card.get("options") or []:
                if option.get("spanish_translation"):
                    installed[(lesson.get("id"), card.get("slide_id"), option["id"])] = option["spanish_translation"]
    changed = 0
    for path in sorted(PLAN_ROOT.rglob("*.json")):
        text = path.read_text(encoding="utf-8")
        try:
            plan = json.loads(text)
        except json.JSONDecodeError:
            continue
        if not isinstance(plan, dict) or not isinstance(plan.get("cards"), list):
            continue
        if json.dumps(plan, indent=2, ensure_ascii=False) + "\n" != text:
            raise SystemExit(f"{path}: plan does not round-trip; refusing to rewrite it.")
        lesson_id, touched = (plan.get("lesson") or {}).get("id"), False
        for spec in plan["cards"]:
            for option in spec.get("options") or []:
                spanish = installed.get((lesson_id, spec.get("slide_id"), option.get("id")))
                if spanish and option.get("spanish_translation") != spanish:
                    option["spanish_translation"] = spanish
                    touched = True
        # A plan that recorded its installed lesson's exact bytes keeps recording them.
        source = plan.get("source") if isinstance(plan.get("source"), dict) else {}
        source_path = ROOT / str(source.get("path") or "")
        if source.get("sha256") and source_path.is_file():
            current = hashlib.sha256(source_path.read_bytes()).hexdigest()
            committed = subprocess.run(["git", "show", f"HEAD:{source['path']}"], cwd=ROOT, capture_output=True)
            was_current = committed.returncode == 0 and hashlib.sha256(committed.stdout).hexdigest() == source["sha256"]
            if was_current and current != source["sha256"]:
                source["sha256"] = current
                touched = True
        if touched:
            path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="")
            changed += 1
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", action="store_true", help="Edit lesson files in place.")
    parser.add_argument("--sync-plans", action="store_true",
                        help="Copy installed choice translations into the stored engine plans.")
    parser.add_argument("--gaps", type=Path, help="Write the untranslated English choices here as JSON.")
    args = parser.parse_args()
    lessons = load_lessons()
    briefs_by_lesson, briefs_anywhere = load_briefs()
    manual = {}
    for table in MANUAL_TABLES:
        if table.exists():
            manual.update(json.loads(table.read_text(encoding="utf-8")).get("translations", {}))
    plan, sources, gaps, disagreements = resolve(
        lessons, briefs_by_lesson, briefs_anywhere, catalog_translations(lessons), manual)
    print("Choices by source:", dict(sources))
    print(f"Distinct English without Spanish: {len(gaps)} ({sum(len(v) for v in gaps.values())} choices)")
    if disagreements:
        print(f"Sources disagree on {len({each[0] for each in disagreements})} English choices (first source kept).")
    if args.gaps:
        args.gaps.write_text(json.dumps({k: v for k, v in sorted(gaps.items())}, indent=2, ensure_ascii=False) + "\n",
                             encoding="utf-8")
    if args.write:
        if gaps:
            raise SystemExit("Refusing to write while choices still lack Spanish; fill the manual table first.")
        print(f"Updated {apply(lessons, plan)} lesson files.")
    if args.sync_plans:
        print(f"Updated {sync_plans(load_lessons())} stored engine plans.")


if __name__ == "__main__":
    main()
