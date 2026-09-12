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

MISSION_SUB_LESSON_IDS = {"2.10", "3.10", "4.10", "5.10", "6.10", "7.10"}
MISSION_LESSON_IDS = {
    "lesson-2-10-around-me-mission",
    "lesson-3-10-introduction-mission",
    "lesson-4-10-my-day-mission",
    "lesson-5-10-cafe-mission",
    "lesson-6-10-town-mission",
    "lesson-7-10-a1-final-mission",
}


def is_mission_context(context: object) -> bool:
    if not isinstance(context, dict):
        return False
    if str(context.get("sub_lesson_id")) in MISSION_SUB_LESSON_IDS:
        return True
    if context.get("lesson_id") in MISSION_LESSON_IDS:
        return True
    return False


def main() -> None:
    manifest_payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    retained_assets: list[dict[str, object]] = []

    # Filter out stale mission contexts
    for raw_item in manifest_payload.get("assets", []):
        contexts = raw_item.get("review_contexts", [])
        if not any(is_mission_context(c) for c in contexts):
            retained_assets.append(raw_item)
            continue
        item = dict(raw_item)
        remaining_contexts = [c for c in contexts if not is_mission_context(c)]
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

    # Add runtime contracts for newly authored mission lessons
    for lesson_id in sorted(MISSION_LESSON_IDS):
        lesson_model = lessons[lesson_id]
        lesson_payload = lesson_model.model_dump(mode="json")
        unit_number = lesson_payload.get("sub_lesson_id", "").split(".")[0]
        for card in lesson_payload.get("cards", []):
            for usage in card_media_usages(lesson_payload, card):
                context = usage["context"]
                if context["media_role"] == "prompt":
                    concept = (
                        context.get("prompt")
                        or context.get("audio_text")
                        or context.get("correct_option_id")
                        or Path(usage["rendered_filename"]).stem
                    )
                else:
                    concept = (
                        context.get("option_label")
                        or context.get("option_id")
                        or Path(usage["rendered_filename"]).stem
                    )
                description = (
                    f"Unit {unit_number} learner-facing still for {concept}; the exact subject, action, "
                    "identity, relationship, quantity, polarity, and card role must match "
                    "the bound runtime context."
                )
                catalog.add_runtime_contract(
                    filename=usage["rendered_filename"],
                    concept=concept,
                    description=description,
                    context=context,
                    source="unit-mission-runtime",
                )

    # Refresh course browser thumbnails for mission lessons
    lesson_payloads = [
        lesson_model.model_dump(mode="json")
        for lesson_model in lessons.values()
    ]
    for usage in course_browser_media_usages(lesson_payloads):
        context = usage["context"]
        if not is_mission_context(context):
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

    mission_assets = list(catalog.items.values())
    merged = {item["asset_id"]: item for item in retained_assets}
    for item in mission_assets:
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
    print(f"Refreshed {len(mission_assets)} mission media contracts in {MANIFEST}.")


if __name__ == "__main__":
    main()
