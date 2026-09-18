"""Refresh A1 media contracts for lessons changed by a Units 3-7 parity rollout.

``--rebuild`` lessons were authored anew: every stale context is dropped and
each current still use is re-derived. ``--append`` lessons only gained cards:
existing reviewed contexts stay untouched and only missing uses are added, so
unchanged cards keep their reviewed descriptions.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.app.data import load_all_lessons  # noqa: E402
from scripts.a1_media_runtime_contracts import card_media_usages, course_browser_media_usages  # noqa: E402
from scripts.build_a1_units_2_7 import AssetCatalog, MANIFEST  # noqa: E402


SIGNATURE = "render_signature_sha256"


def identity(filename: str, context: dict) -> tuple[str, str]:
    """A use's identity without the machine-dependent render signature.

    The signature is computed by the local image renderer, so comparing it would
    treat an unchanged committed use as missing on any other machine.
    """
    return filename, json.dumps({k: v for k, v in context.items() if k != SIGNATURE}, sort_keys=True, ensure_ascii=False)


def card_refs(contexts: list[dict]) -> list[str]:
    return sorted({"|".join((str(c.get("sub_lesson_id")), str(c.get("stage")), str(c.get("slide_id") or "<none>")))
                   for c in contexts})


def usage_contract(usage: dict) -> tuple[str, str]:
    context = usage["context"]
    if context["media_role"] == "prompt":
        concept = (context.get("prompt") or context.get("audio_text") or context.get("correct_option_id")
                   or Path(usage["rendered_filename"]).stem)
    else:
        concept = context.get("option_label") or context.get("option_id") or Path(usage["rendered_filename"]).stem
    unit = str(context.get("sub_lesson_id") or "").split(".")[0]
    return concept, (f"Unit {unit} learner-facing still for {concept}; the exact subject, action, identity, "
                     "relationship, quantity, polarity, and card role must match the bound runtime context.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rebuild", nargs="*", default=[])
    parser.add_argument("--append", nargs="*", default=[])
    args = parser.parse_args()
    rebuild, append = set(args.rebuild), set(args.append)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    # Committed signatures for every use, so an unchanged use keeps its value
    # instead of absorbing this machine's renderer.
    committed = {identity(item["filename"], c): c[SIGNATURE] for item in manifest.get("assets", [])
                 for c in item.get("review_contexts", []) if isinstance(c, dict) and SIGNATURE in c}
    retained = []
    for raw in manifest.get("assets", []):
        contexts = raw.get("review_contexts", [])
        keep = [c for c in contexts if not (isinstance(c, dict) and str(c.get("sub_lesson_id")) in rebuild)]
        if len(keep) == len(contexts):
            retained.append(raw)
        elif keep:
            retained.append({**raw, "review_contexts": keep, "card_refs": card_refs(keep)})
    existing = {identity(item["filename"], c) for item in retained for c in item.get("review_contexts", [])
                if isinstance(c, dict)}
    lessons = load_all_lessons()
    catalog = AssetCatalog()
    added = 0
    for lesson in lessons.values():
        payload = lesson.model_dump(mode="json")
        number = str(payload.get("sub_lesson_id"))
        if number not in rebuild | append:
            continue
        for card in payload.get("cards", []):
            for usage in card_media_usages(payload, card):
                key = identity(usage["rendered_filename"], usage["context"])
                if number in append and key in existing:
                    continue
                if key in committed:
                    usage["context"][SIGNATURE] = committed[key]
                concept, description = usage_contract(usage)
                catalog.add_runtime_contract(filename=usage["rendered_filename"], concept=concept,
                                             description=description, context=usage["context"],
                                             source="unit-mission-runtime" if number.endswith(".10") else "unit-runtime")
                added += 1
    payloads = [lesson.model_dump(mode="json") for lesson in lessons.values()]
    for usage in course_browser_media_usages(payloads):
        context = usage["context"]
        if str(context.get("sub_lesson_id")) not in rebuild:
            continue
        key = identity(usage["rendered_filename"], context)
        if key in committed:
            context[SIGNATURE] = committed[key]
        concept = f"{context['surface_label']}: {context['prompt']}"
        catalog.add_runtime_contract(
            filename=usage["rendered_filename"], concept=concept,
            description=(f"Course-browser {context['media_role'].replace('_', ' ')} for {context['surface_label']}; "
                         f"the image must accurately represent {context['prompt']} at the bound full-bleed 3:2 crop."),
            context=context, source="course-browser-runtime")
    merged = {item["asset_id"]: item for item in retained}
    for item in catalog.items.values():
        if item["asset_id"] in merged:
            prior = merged[item["asset_id"]]
            item["review_contexts"] = [*prior["review_contexts"],
                                       *[c for c in item["review_contexts"] if c not in prior["review_contexts"]]]
            item["card_refs"] = sorted(set(prior["card_refs"]) | set(item["card_refs"]))
        merged[item["asset_id"]] = item
    manifest["assets"] = sorted(merged.values(), key=lambda item: item["asset_id"])
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Refreshed {added} still uses for rebuilt {sorted(rebuild)} and appended {sorted(append)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
