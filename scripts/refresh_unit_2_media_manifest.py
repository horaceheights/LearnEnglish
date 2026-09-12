from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.app.data import load_all_lessons
from scripts.a1_media_runtime_contracts import (
    card_media_usages,
    course_browser_media_usages,
)
from scripts.build_a1_units_2_7 import AssetCatalog, MANIFEST


def is_unit_2_context(context: object) -> bool:
    if not isinstance(context, dict):
        return False
    sub_lesson_id = str(context.get("sub_lesson_id") or "")
    if sub_lesson_id.startswith("2."):
        return True
    lesson_id = str(context.get("lesson_id") or "")
    if lesson_id.startswith("lesson-2-"):
        return True
    return False


DEMONSTRATIVE_DESCRIPTIONS = {
    "near-book": "paired first-person demonstrative scene; left hand holds the near book while right hand points at it; identical far book remains visible",
    "far-book": "same paired scene; left hand keeps holding the near book while right hand points from below at the identical far book without overlapping or touching it",
    "near-phone": "paired first-person demonstrative scene; left hand holds the near phone while right hand points at it; identical far phone remains visible",
    "far-phone": "same paired scene; left hand keeps holding the near phone while right hand points from below at the identical far phone without overlapping or touching it",
    "near-bag": "paired first-person demonstrative scene; left hand holds the near bag while right hand points at it; identical far bag remains clearly readable",
    "far-bag": "same paired scene; left hand keeps holding the near bag while right hand points from below at the readable identical far bag without overlapping or touching it",
    "near-chair": "paired first-person demonstrative scene; left hand grips the near chair while right hand points at it; near chair is substantially larger than the identical far chair",
    "far-chair": "same paired scene and strong size contrast; left hand keeps gripping the large near chair while right hand points from below at the smaller identical far chair without overlapping or touching it",
}
DEMONSTRATIVE_FILENAME_TO_CONCEPT = {
    "a1_near-book.webp": "near-book",
    "a1_far-book.webp": "far-book",
    "a1_near-phone.webp": "near-phone",
    "a1_far-phone.webp": "far-phone",
    "a1_near-bag.webp": "near-bag",
    "a1_far-bag.webp": "far-bag",
    "a1_near-chair.webp": "near-chair",
    "a1_far-chair.webp": "far-chair",
}


def main() -> None:
    manifest_payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    retained_assets: list[dict[str, object]] = []

    # Filter out stale unit 2 contexts
    for raw_item in manifest_payload.get("assets", []):
        contexts = raw_item.get("review_contexts", [])
        if not any(is_unit_2_context(c) for c in contexts):
            retained_assets.append(raw_item)
            continue
        item = dict(raw_item)
        remaining_contexts = [c for c in contexts if not is_unit_2_context(c)]
        if not remaining_contexts:
            continue
        item["review_contexts"] = remaining_contexts
        item["card_refs"] = sorted(
            {
                "|".join(
                    (
                        str(c.get("sub_lesson_id")),
                        str(c.get("stage")),
                        str(c.get("slide_id") or "<none>"),
                    )
                )
                for c in remaining_contexts
            }
        )
        retained_assets.append(item)

    lessons = load_all_lessons()
    catalog = AssetCatalog()

    # Collect all unit 2 lessons
    unit_2_lessons = [
        (lid, lesson)
        for lid, lesson in lessons.items()
        if lid.startswith("lesson-2-") or str(getattr(lesson, "sub_lesson_id", "")).startswith("2.")
    ]

    for lesson_id, lesson_model in sorted(unit_2_lessons):
        lesson_payload = lesson_model.model_dump(mode="json")
        unit_number = lesson_payload.get("sub_lesson_id", "").split(".")[0]
        sub_lesson_id = lesson_payload.get("sub_lesson_id", "")
        for card in lesson_payload.get("cards", []):
            for usage in card_media_usages(lesson_payload, card):
                context = usage["context"]
                fn = usage["rendered_filename"]
                if sub_lesson_id == "2.5" and fn in DEMONSTRATIVE_FILENAME_TO_CONCEPT:
                    concept = DEMONSTRATIVE_FILENAME_TO_CONCEPT[fn]
                    description = DEMONSTRATIVE_DESCRIPTIONS[concept]
                elif context["media_role"] == "prompt":
                    concept = (
                        context.get("prompt")
                        or context.get("audio_text")
                        or context.get("correct_option_id")
                        or Path(fn).stem
                    )
                    description = (
                        f"Unit {unit_number} learner-facing still for {concept}; the exact subject, action, "
                        "identity, relationship, quantity, polarity, and card role must match "
                        "the bound runtime context."
                    )
                else:
                    concept = (
                        context.get("option_label")
                        or context.get("option_id")
                        or Path(fn).stem
                    )
                    description = (
                        f"Unit {unit_number} learner-facing still for {concept}; the exact subject, action, "
                        "identity, relationship, quantity, polarity, and card role must match "
                        "the bound runtime context."
                    )
                catalog.add_runtime_contract(
                    filename=fn,
                    concept=concept,
                    description=description,
                    context=context,
                    source="unit-runtime",
                )

    # Refresh course browser thumbnails for unit 2 lessons
    lesson_payloads = [
        lesson_model.model_dump(mode="json")
        for lesson_model in lessons.values()
    ]
    for usage in course_browser_media_usages(lesson_payloads):
        context = usage["context"]
        if not is_unit_2_context(context):
            continue
        concept = f"{context['surface_label']}: {context['prompt']}"
        catalog.add_runtime_contract(
            filename=usage["rendered_filename"],
            concept=concept,
            description=(
                f"Course-browser {context['media_role'].replace('_', ' ')} for "
                f"{context['surface_label']}; the image must accurately represent "
                f"{context['prompt']} at the bound full-bleed 3:2 crop."
            ),
            context=context,
            source="course-browser-runtime",
        )

    unit_2_assets = list(catalog.items.values())
    merged = {item["asset_id"]: item for item in retained_assets}
    for item in unit_2_assets:
        if item["asset_id"] in merged:
            prior = merged[item["asset_id"]]
            item["review_contexts"] = [*prior["review_contexts"], *item["review_contexts"]]
            item["card_refs"] = sorted(set(prior["card_refs"] + item["card_refs"]))
        merged[item["asset_id"]] = item

    manifest_payload["assets"] = sorted(
        merged.values(),
        key=lambda item: item["asset_id"],
    )
    MANIFEST.write_text(
        json.dumps(manifest_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Refreshed {len(unit_2_assets)} Unit 2 media contracts in {MANIFEST}.")


if __name__ == "__main__":
    main()
