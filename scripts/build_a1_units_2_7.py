from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

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
    ) -> str:
        if explicit and concept in EXISTING_ASSETS:
            filename = EXISTING_ASSETS[concept]
            key = f"existing:{concept}"
        else:
            key = asset_key(unit_number, lesson_id, concept)
            filename = f"a1_scene_{key}.webp"
        item = self.items.setdefault(
            key,
            {
                "asset_id": key,
                "concept": concept,
                "description": description,
                "filename": filename,
                "ratio": "3:2",
                "dimensions": [1536, 1024],
                "source": "existing" if key.startswith("existing:") else "composite-or-generated",
                "card_refs": [],
            },
        )
        if card_ref not in item["card_refs"]:
            item["card_refs"].append(card_ref)
        return filename


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
) -> str:
    contract = explicit_scene_contract(lesson)
    explicit = concept in contract
    final_description = contract.get(concept, description or concept)
    filename = catalog.add(
        unit_number=unit_number,
        lesson_id=str(lesson["id"]),
        concept=concept,
        description=final_description,
        card_ref=f"{lesson['id']}|{stage}|{row[0]}",
        explicit=explicit,
    )
    return filename


def option_id(label: str, index: int) -> str:
    return f"{slug(label)}-{index + 1}"


def find_correct_option_id(options: list[dict[str, Any]], raw_options: list[str], correct: str) -> str:
    for index, raw in enumerate(raw_options):
        if raw.strip().casefold() == correct.strip().casefold():
            return options[index]["id"]
    raise ValueError(f"Correct option {correct!r} is missing from {raw_options!r}")


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

    if interaction in SINGLE_INTERACTIONS:
        concept = visual if unit_number <= 4 and visual not in {"choice-grid", ""} else correct
        filename = scene_filename(
            catalog, unit_number, lesson, stage, row, concept, visual
        )
        options = [{"id": option_id(correct, 0), "image_url": filename, "label": correct}]
    elif interaction in IMAGE_INTERACTIONS:
        for index, choice in enumerate(choices):
            filename = scene_filename(
                catalog, unit_number, lesson, stage, row, choice, visual
            )
            options.append({"id": option_id(choice, index), "image_url": filename, "label": None})
    else:
        options = [
            {"id": option_id(choice, index), "image_url": "", "label": choice}
            for index, choice in enumerate(choices)
        ]
        if interaction not in {"a2t2", "a2t4", "listen-text"} and not no_image(visual):
            concept = visual if unit_number <= 4 else correct
            prompt_image = scene_filename(
                catalog, unit_number, lesson, stage, row, concept, visual
            )

    if not options:
        raise ValueError(f"{lesson['id']} {stage} {slide_id} has no selectable option")
    raw_for_correct = [correct] if interaction in SINGLE_INTERACTIONS else choices
    correct_id = find_correct_option_id(options, raw_for_correct, correct)

    answer_audio: str | None = None
    if interaction in {"i2t2", "i2t4", "recognize-text"}:
        answer_audio = correct
    elif interaction in USE_INTERACTIONS:
        answer_audio = completed_answer(prompt, correct)

    return {
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

    manifest_payload = {
        "schema_version": 1,
        "shared_ratio": "3:2",
        "dimensions": [1536, 1024],
        "assets": sorted(catalog.items.values(), key=lambda item: item["asset_id"]),
    }
    MANIFEST.write_text(
        json.dumps(manifest_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(output_files)} lessons and {len(catalog.items)} media contracts.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"A1 course build failed: {exc}", file=sys.stderr)
        raise
