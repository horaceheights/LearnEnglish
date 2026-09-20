"""Refresh media contracts for lessons whose card photos were rebound.

Every current still use in the named lessons is re-derived from the lesson
files. A use whose context is unchanged keeps its committed contract and render
signature. A use whose photo changed inherits the concept and description that
the committed contract held for the same card field, so the authored teaching
contract moves to the new pixels instead of becoming a generic description; only
its render signature is computed for the current renderer. A use without a
committed counterpart is an error: this is not a path for authoring new cards.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.a1_media_runtime_contracts import card_media_usages, course_browser_media_usages  # noqa: E402
from scripts.audit_course_media_preservation import lessons  # noqa: E402
from scripts.build_a1_units_2_7 import AssetCatalog, MANIFEST  # noqa: E402

SIGNATURE = "render_signature_sha256"


def field(context: dict) -> tuple:
    return tuple(context.get(k) for k in ("context_type", "lesson_id", "stage", "slide_id", "media_role", "option_id"))


def unsigned(context: dict) -> dict:
    return {k: v for k, v in context.items() if k != SIGNATURE}


def card_refs(contexts: list[dict]) -> list[str]:
    return sorted({"|".join((str(c.get("sub_lesson_id")), str(c.get("stage")), str(c.get("slide_id") or "<none>")))
                   for c in contexts})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson", action="append", required=True, help="Lesson id whose still uses are refreshed.")
    args = parser.parse_args()
    selected = set(args.lesson)
    current = lessons(ROOT)
    if selected - set(current):
        raise ValueError(f"Unknown lessons: {sorted(selected - set(current))}")
    derived = {}
    usages = [usage for lesson_id in sorted(selected) for card in current[lesson_id]["cards"]
              for usage in card_media_usages(current[lesson_id], card)]
    usages += [usage for usage in course_browser_media_usages(list(current.values()))
               if usage["context"].get("lesson_id") in selected]
    for usage in usages:
        key = field(usage["context"])
        if key in derived:
            raise ValueError(f"Two current uses share one card field: {key}")
        derived[key] = usage

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    kept, rebound, seen = [], [], set()
    for row in manifest["assets"]:
        contexts = []
        for context in row.get("review_contexts", []):
            if context.get("lesson_id") not in selected:
                contexts.append(context)
                continue
            key = field(context)
            if key in seen:
                raise ValueError(f"Two committed contracts claim one card field: {key}")
            seen.add(key)
            usage = derived.get(key)
            if usage and usage["rendered_filename"] == row["filename"] and unsigned(usage["context"]) == unsigned(context):
                contexts.append(context)
                continue
            if usage:
                rebound.append((row, usage))
        if contexts == row.get("review_contexts", []):
            kept.append(row)
        elif contexts:
            kept.append({**row, "review_contexts": contexts, "card_refs": card_refs(contexts)})
    unclaimed = sorted(set(derived) - seen, key=str)
    if unclaimed:
        raise ValueError(f"Uses without a committed contract; author them explicitly: {unclaimed}")

    catalog = AssetCatalog()
    for row, usage in rebound:
        catalog.add_runtime_contract(filename=usage["rendered_filename"], concept=row["concept"],
                                     description=row["description"], context=usage["context"], source=row["source"])
    merged = {row["asset_id"]: row for row in kept}
    for row in catalog.items.values():
        if row["asset_id"] in merged:
            prior = merged[row["asset_id"]]
            row["review_contexts"] = [*prior["review_contexts"],
                                      *[c for c in row["review_contexts"] if c not in prior["review_contexts"]]]
            row["card_refs"] = sorted(set(prior["card_refs"]) | set(row["card_refs"]))
        merged[row["asset_id"]] = row
    manifest["assets"] = sorted(merged.values(), key=lambda row: row["asset_id"])
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Rebound {len(rebound)} still uses in {sorted(selected)}; every other use kept its committed contract.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
