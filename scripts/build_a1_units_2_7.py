from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    from scripts.a1_media_runtime_contracts import (
        card_media_usages,
        course_browser_media_usages,
    )
except ModuleNotFoundError:  # Direct `python scripts/...` execution.
    from a1_media_runtime_contracts import card_media_usages, course_browser_media_usages

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "docs" / "product" / "a1-course-canvas.json"
LESSONS_ROOT = ROOT / "backend" / "lessons"
ASSET_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"
STAGES = ["Learn", "Recognize", "Listen", "Speak", "Use"]

IMAGE_INTERACTIONS = {
    "t2i2", "t2i4", "a2i2", "a2i4", "recognize-image", "listen-image"
}
TEXT_INTERACTIONS = {
    "i2t2", "i2t4", "a2t2", "a2t4", "recognize-text", "listen-text"
}
SINGLE_INTERACTIONS = {"teach", "repeat", "speak"}
USE_INTERACTIONS = {
    "complete", "complete2", "complete4", "choose2", "choose4", "choice", "response-choice"
}
NO_IMAGE_MARKERS = ("no image", "no teaching image", "speaker control only")

EXISTING_ASSETS = {
    "boy": "boy.webp",
    "boy-running": "boy_is_running.webp",
    "girl-walking": "girl_is_walking.webp",
    "woman": "woman.webp",
    "park": "place_park.webp",
    "house": "place_house.webp",
    "street": "place_street.webp",
    "bridge": "place_bridge.webp",
    "bus": "place_bus.webp",
    "car": "object_car.webp",
    "bike": "object_bike.webp",
    "book": "object_book.webp",
    "bag": "object_backpack.webp",
    "phone": "a1_phone.webp",
    "pen": "a1_pen.webp",
    "chair": "a1_chair.webp",
    "table": "a1_table.webp",
    "red": "a1_red.webp",
    "blue": "a1_blue.webp",
    "green": "a1_green.webp",
    "yellow": "a1_yellow.webp",
    "black": "a1_black.webp",
    "white": "a1_white.webp",
    "near-bag": "a1_near-bag.webp",
    "near-book": "a1_near-book.webp",
    "near-chair": "a1_near-chair.webp",
    "near-phone": "a1_near-phone.webp",
    "far-bag": "a1_far-bag.webp",
    "far-book": "a1_far-book.webp",
    "far-chair": "a1_far-chair.webp",
    "far-phone": "a1_far-phone.webp",
    "one-red-car": "a1_one-red-car.webp",
    "two-blue-cars": "a1_two-blue-cars.webp",
    "three-green-books": "a1_three-green-books.webp",
    "four-yellow-pens": "a1_four-yellow-pens.webp",
    "mission-two-blue-cars": "unit2_mission_two_blue_cars.webp",
    "mission-three-green-books": "unit2_mission_three_green_books.webp",
    "mission-four-yellow-pens": "unit2_mission_four_yellow_pens.webp",
    "near-red-book": "unit2_near_red_book.webp",
    "six-white-bags": "unit2_six_white_bags.webp",
    "n1": "a1_n1.webp", "n2": "a1_n2.webp", "n3": "a1_n3.webp",
    "n4": "a1_n4.webp", "n5": "a1_n5.webp", "n6": "a1_n6.webp",
    "n7": "a1_n7.webp", "n8": "a1_n8.webp", "n9": "a1_n9.webp",
    "n10": "a1_n10.webp",
    "school": "a1_school.webp",
    "store": "a1_store.webp",
    "restaurant": "a1_restaurant.webp",
    "hospital": "a1_hospital.webp",
    "ana-profile": "a1_ana.webp",
    "luis-profile": "a1_luis.webp",
    "name-ana": "a1_scene_ana_name.webp",
    "age-ana": "a1_scene_ana_age_20.webp",
    "origin-ana": "a1_scene_ana_mexico.webp",
    "job-ana": "a1_scene_ana_teacher_book.webp",
    "book-ana": "a1_scene_ana_teacher_book.webp",
    "ana-teacher-book": "a1_scene_ana_teacher_book.webp",
    "name-luis": "a1_scene_luis_name.webp",
    "age-luis": "a1_scene_luis_age_18.webp",
    "origin-luis": "a1_scene_luis_usa.webp",
    "job-luis": "a1_scene_luis_driver.webp",
}


def slug(value: str) -> str:
    normalized = value.lower().replace("caf�", "cafe").replace("café", "cafe")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized or "scene"


def clean_audio(value: str) -> str:
    return re.sub(r"\[\s*pause\s*\]", "___", value, flags=re.IGNORECASE)


def list_value(value: Any) -> list[str]:
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    return [part for part in str(value).split() if part]


def asset_key(unit_number: int, lesson_id: str, concept: str) -> str:
    concept_slug = slug(concept)
    digest = hashlib.sha1(concept.casefold().encode()).hexdigest()[:7]
    return f"{concept_slug}_{digest}"


def explicit_scene_contract(lesson: dict[str, Any]) -> dict[str, str]:
    contract = lesson.get("scene_contract") or {}
    return {str(key): str(value) for key, value in contract.items()}


class AssetCatalog:
    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}

    def add(
        self,
        *,
        unit_number: int,
        lesson_id: str,
        concept: str,
        description: str,
        card_ref: str,
        explicit: bool,
    ) -> tuple[str, str]:
        if explicit and concept in EXISTING_ASSETS:
            filename = EXISTING_ASSETS[concept]
            base_key = f"existing:{concept}"
        else:
            base_key = asset_key(unit_number, lesson_id, concept)
            filename = f"a1_scene_{base_key}.webp"

        # One filename may be intentionally reused, but each distinct authored
        # semantic contract must remain separately reviewable. Never let a
        # first-use catalog merge hide a later, incompatible description.
        description_digest = hashlib.sha1(description.encode("utf-8")).hexdigest()[:10]
        key = f"{base_key}__{description_digest}"
        item = self.items.setdefault(
            key,
            {
                "asset_id": key,
                "concept": concept,
                "description": description,
                "filename": filename,
                "ratio": "3:2",
                "dimensions": [1536, 1024],
                "source": (
                    "existing"
                    if base_key.startswith("existing:")
                    else "composite-or-generated"
                ),
                "card_refs": [],
                "review_contexts": [],
            },
        )
        if card_ref not in item["card_refs"]:
            item["card_refs"].append(card_ref)
        return filename, key

    def add_review_context(self, key: str, context: dict[str, Any]) -> None:
        item = self.items.get(key)
        if item is None:
            raise ValueError(f"Unknown media catalog binding {key!r}")
        if context not in item["review_contexts"]:
            item["review_contexts"].append(context)

    def add_runtime_contract(
        self,
        *,
        filename: str,
        concept: str,
        description: str,
        context: dict[str, Any],
        source: str,
    ) -> None:
        signature = "\n".join((filename, concept, description))
        key = f"runtime_{hashlib.sha1(signature.encode('utf-8')).hexdigest()[:16]}"
        card_ref = "|".join(
            (
                str(context.get("sub_lesson_id") or "<none>"),
                str(context.get("stage") or "<none>"),
                context["slide_id"] or "<none>",
            )
        )
        item = self.items.setdefault(
            key,
            {
                "asset_id": key,
                "concept": concept,
                "description": description,
                "filename": filename,
                "ratio": "3:2",
                "dimensions": [1536, 1024],
                "source": source,
                "card_refs": [],
                "review_contexts": [],
            },
        )
        if card_ref not in item["card_refs"]:
            item["card_refs"].append(card_ref)
        if context not in item["review_contexts"]:
            item["review_contexts"].append(context)


def no_image(description: str) -> bool:
    lowered = description.lower()
    return any(marker in lowered for marker in NO_IMAGE_MARKERS)


def scene_filename(
    catalog: AssetCatalog,
    unit_number: int,
    lesson: dict[str, Any],
    stage: str,
    row: list[Any],
    concept: str,
    description: str,
) -> tuple[str, str]:
    contract = explicit_scene_contract(lesson)
    explicit = concept in contract
    final_description = contract.get(concept, description or concept)
    filename, binding_key = catalog.add(
        unit_number=unit_number,
        lesson_id=str(lesson["id"]),
        concept=concept,
        description=final_description,
        card_ref=f"{lesson['id']}|{stage}|{row[0]}",
        explicit=explicit,
    )
    return filename, binding_key


def option_id(label: str, index: int) -> str:
    return f"{slug(label)}-{index + 1}"


def find_correct_option_id(options: list[dict[str, Any]], raw_options: list[str], correct: str) -> str:
    for index, raw in enumerate(raw_options):
        if raw.strip().casefold() == correct.strip().casefold():
            return options[index]["id"]
    raise ValueError(f"Correct option {correct!r} is missing from {raw_options!r}")


def limit_text_tile_options(
    options: list[dict[str, Any]], correct_option_id: str
) -> list[dict[str, Any]]:
    """Keep text-only answer sets to one answer plus two authored distractors."""
    if len(options) <= 3 or any((option.get("image_url") or "").strip() for option in options):
        return options

    kept: list[dict[str, Any]] = []
    distractors = 0
    for option in options:
        if option["id"] == correct_option_id:
            kept.append(option)
        elif distractors < 2:
            kept.append(option)
            distractors += 1
    return kept


def completed_answer(prompt: str, correct: str) -> str:
    if re.search(r"___|\[\s*blank\s*\]", prompt, flags=re.IGNORECASE):
        return re.sub(r"___|\[\s*blank\s*\]", correct, prompt, count=1, flags=re.IGNORECASE)
    return correct


def build_card(
    catalog: AssetCatalog,
    unit_number: int,
    lesson: dict[str, Any],
    stage: str,
    row: list[Any],
) -> dict[str, Any]:
    slide_id, interaction, prompt, audio, visual, raw_options, correct, note, spanish = row
    prompt = str(prompt)
    audio = clean_audio(str(audio))
    visual = str(visual)
    correct = str(correct)
    choices = list_value(raw_options)
    options: list[dict[str, Any]] = []
    prompt_image = ""
    option_bindings: dict[str, tuple[str, str]] = {}
    prompt_binding: tuple[str, str] | None = None

    if interaction in SINGLE_INTERACTIONS:
        concept = visual if unit_number <= 4 and visual not in {"choice-grid", ""} else correct
        filename, binding_key = scene_filename(
            catalog, unit_number, lesson, stage, row, concept, visual
        )
        single_option_id = option_id(correct, 0)
        options = [{"id": single_option_id, "image_url": filename, "label": correct}]
        option_bindings[single_option_id] = (binding_key, concept)
    elif interaction in IMAGE_INTERACTIONS:
        for index, choice in enumerate(choices):
            # An option image depicts that option. The card-level `visual` text
            # often describes only the correct answer, so using it for every
            # distractor creates internally contradictory media contracts.
            # Rich per-option scene contracts still override this fallback.
            filename, binding_key = scene_filename(
                catalog, unit_number, lesson, stage, row, choice, choice
            )
            choice_option_id = option_id(choice, index)
            options.append({"id": choice_option_id, "image_url": filename, "label": None})
            option_bindings[choice_option_id] = (binding_key, choice)
    else:
        options = [
            {"id": option_id(choice, index), "image_url": "", "label": choice}
            for index, choice in enumerate(choices)
        ]
        if interaction not in {"a2t2", "a2t4", "listen-text"} and not no_image(visual):
            concept = visual if unit_number <= 4 else correct
            prompt_image, binding_key = scene_filename(
                catalog, unit_number, lesson, stage, row, concept, visual
            )
            prompt_binding = (binding_key, concept)

    if not options:
        raise ValueError(f"{lesson['id']} {stage} {slide_id} has no selectable option")
    raw_for_correct = [correct] if interaction in SINGLE_INTERACTIONS else choices
    correct_id = find_correct_option_id(options, raw_for_correct, correct)
    options = limit_text_tile_options(options, correct_id)

    answer_audio: str | None = None
    if interaction in {"i2t2", "i2t4", "recognize-text"}:
        answer_audio = correct
    elif interaction in USE_INTERACTIONS:
        answer_audio = completed_answer(prompt, correct)

    card = {
        "slide_id": str(slide_id),
        "interaction_type": str(interaction),
        "prompt": prompt,
        "stage": stage,
        "correct_option_id": correct_id,
        "options": options,
        "audio_text": audio or None,
        "answer_audio_text": answer_audio,
        "prompt_image_url": prompt_image,
        "spanish_translation": str(spanish),
        "pedagogy_note": str(note),
    }

    lesson_identity = {
        "id": lesson_identifier(lesson),
        "sub_lesson_id": str(lesson["id"]),
    }
    for usage in card_media_usages(lesson_identity, card):
        context = usage["context"]
        if context["media_role"] == "prompt":
            if prompt_binding is None:
                raise ValueError(f"{lesson['id']} {stage} {slide_id} lost its prompt binding")
            binding_key, concept = prompt_binding
        else:
            option_binding = option_bindings.get(context["option_id"])
            if option_binding is None:
                raise ValueError(
                    f"{lesson['id']} {stage} {slide_id} lost option binding "
                    f"{context['option_id']!r}"
                )
            binding_key, concept = option_binding
        if usage["rendered_filename"] == usage["source_filename"]:
            catalog.add_review_context(binding_key, context)
        else:
            catalog.add_runtime_contract(
                filename=usage["rendered_filename"],
                concept=concept,
                description=(
                    f"Client-rendered 3:2 option variant for {concept}; it must preserve "
                    "the complete source concept without changing identity, count, color, "
                    "action, relation, polarity, or time."
                ),
                context=context,
                source="client-rendered-variant",
            )
    return card


def metadata(lesson: dict[str, Any], snake: str, camel: str, default: Any = None) -> Any:
    return lesson.get(snake, lesson.get(camel, default))


def lesson_identifier(lesson: dict[str, Any]) -> str:
    return f"lesson-{lesson['id'].replace('.', '-')}-{slug(str(lesson['title']))}"


def build_lesson(catalog: AssetCatalog, unit: dict[str, Any], lesson: dict[str, Any]) -> dict[str, Any]:
    unit_number = int(unit["unit"])
    cards: list[dict[str, Any]] = []
    for stage in STAGES:
        rows = lesson["stages"][stage]
        cards.extend(build_card(catalog, unit_number, lesson, stage, row) for row in rows)
    return {
        "id": lesson_identifier(lesson),
        "title": f"{lesson['id']} {lesson['title']}",
        "level": "Beginner A1",
        "unit_id": f"unit-{unit_number}",
        "unit_title": f"Unit {unit_number}: {unit['title']}",
        "unit_outcome": unit.get("unit_outcome", unit.get("unitOutcome", "")),
        "lesson_id": f"lesson-{unit_number}",
        "lesson_title": f"Unit {unit_number}: {unit['title']}",
        "sub_lesson_id": str(lesson["id"]),
        "sub_lesson_title": str(lesson["title"]),
        "goal": str(lesson["goal"]),
        "vocabulary": metadata(lesson, "new_vocabulary", "newVocabulary", []),
        "review_vocabulary": metadata(lesson, "review_vocabulary", "reviewVocabulary", []),
        "grammar_function": metadata(lesson, "grammar_function", "grammarFunction", ""),
        "prerequisite": str(lesson.get("prerequisite", "")),
        "speaking_outcome": metadata(lesson, "speaking_outcome", "speakingOutcome", ""),
        "purposeful_review_slides": lesson.get("purposeful_review_slides", []),
        "cards": cards,
    }


def add_unit_one_runtime_contracts(catalog: AssetCatalog) -> None:
    """Add the established Unit 1 stills and their final 3:2 render variants.

    Unit 1 predates the Units 2-7 canvas, but the semantic gate covers the full
    70-lesson course. Runtime card contexts are therefore the authority for its
    source filenames, correct/distractor roles, and client-resolved variants.
    """

    sys.path.insert(0, str(ROOT / "backend"))
    from app.data import load_all_lessons  # noqa: PLC0415

    lessons = load_all_lessons()
    for lesson_model in lessons.values():
        lesson_payload = lesson_model.model_dump(mode="json")
        if not str(lesson_payload.get("sub_lesson_id", "")).startswith("1."):
            continue
        for card in lesson_payload.get("cards", []):
            for usage in card_media_usages(lesson_payload, card):
                context = usage["context"]
                if context["media_role"] == "prompt":
                    concept = (
                        context["prompt"]
                        or context["audio_text"]
                        or context["correct_option_id"]
                        or Path(usage["rendered_filename"]).stem
                    )
                else:
                    concept = (
                        context["option_label"]
                        or context["option_id"]
                        or Path(usage["rendered_filename"]).stem
                    )
                description = (
                    f"Unit 1 learner-facing still for {concept}; the exact subject, action, "
                    "identity, relationship, quantity, polarity, and card role must match "
                    "the bound runtime context."
                )
                if usage["rendered_filename"] == usage["source_filename"]:
                    catalog.add_runtime_contract(
                        filename=usage["source_filename"],
                        concept=concept,
                        description=description,
                        context=context,
                        source="unit-1-runtime",
                    )
                else:
                    catalog.add_runtime_contract(
                        filename=usage["rendered_filename"],
                        concept=concept,
                        description=(
                            f"Client-rendered 3:2 Unit 1 option variant for {concept}; it "
                            "must preserve the complete source concept and bound card role."
                        ),
                        context=context,
                        source="client-rendered-variant",
                    )


def add_course_browser_runtime_contracts(catalog: AssetCatalog) -> None:
    """Bind all 70 lesson and seven unit thumbnails to semantic review."""

    sys.path.insert(0, str(ROOT / "backend"))
    from app.data import load_all_lessons  # noqa: PLC0415

    lesson_payloads = [
        lesson_model.model_dump(mode="json")
        for lesson_model in load_all_lessons().values()
    ]
    for usage in course_browser_media_usages(lesson_payloads):
        context = usage["context"]
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


def main() -> None:
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    catalog = AssetCatalog()
    output_files: list[Path] = []
    for unit in plan["units"]:
        unit_number = int(unit["unit"])
        output_dir = LESSONS_ROOT / f"unit_{unit_number}"
        output_dir.mkdir(parents=True, exist_ok=True)
        expected: set[Path] = set()
        for lesson in unit["lessons"]:
            payload = build_lesson(catalog, unit, lesson)
            destination = output_dir / f"{payload['id']}.yaml"
            expected.add(destination)
            destination.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            output_files.append(destination)
        for stale in output_dir.glob("*.yaml"):
            if stale not in expected:
                stale.unlink()

    add_unit_one_runtime_contracts(catalog)
    add_course_browser_runtime_contracts(catalog)

    published_assets = sorted(
        (
            item
            for item in catalog.items.values()
            if item["review_contexts"]
        ),
        key=lambda item: item["asset_id"],
    )
    manifest_payload = {
        "schema_version": 3,
        "shared_ratio": "3:2",
        "dimensions": [1536, 1024],
        "assets": published_assets,
    }
    MANIFEST.write_text(
        json.dumps(manifest_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(output_files)} lessons and {len(published_assets)} media contracts.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"A1 course build failed: {exc}", file=sys.stderr)
        raise
