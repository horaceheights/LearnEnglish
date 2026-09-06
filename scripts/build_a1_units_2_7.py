from __future__ import annotations

import argparse
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
REVIEWED_PHOTOREAL_REGISTRY = (
    ROOT / "docs" / "product" / "a1-reviewed-photoreal-media.json"
)
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

# These landscape masters lose an answer-critical cue when a centered 4:5 crop is
# used by the portrait four-card grid. Their sibling variants keep the cue inside
# the shared center safe area without changing one- and two-card compositions.
FOUR_CARD_REFRAMES = {
    "a1_n3.webp", "a1_n4.webp", "a1_n5.webp", "a1_n6.webp",
    "a1_n7.webp", "a1_n8.webp", "a1_n9.webp", "a1_n10.webp",
    "a1_table.webp",
    "a1_scene_n13_e92ef3e.webp", "a1_scene_n14_f713285.webp",
    "a1_scene_n15_35e4ec4.webp", "a1_scene_n16_e4aa4eb.webp",
    "a1_scene_n17_9b96027.webp", "a1_scene_n18_bdd888e.webp",
    "a1_scene_bag-6_431210e.webp", "a1_scene_bag-7_378b7f0.webp",
    "a1_scene_bag-8_7f5b9cb.webp", "a1_scene_bag-9_adb8071.webp",
    "a1_scene_coffee-5_c9b98e0.webp", "a1_scene_coffee-6_1ea48e3.webp",
    "a1_scene_coffee-7_6481821.webp", "a1_scene_coffee-8_90b7ae7.webp",
    "a1_scene_tea-8_43e62f6.webp", "a1_scene_juice-8_437a2f8.webp",
    "a1_scene_five-black-phones_734dda6.webp",
    "a1_scene_five-blue-chairs_2a951fc.webp",
    # Full-course fixed-4:5 audit repairs (2026-08-30). These contracts are
    # correct in landscape but lose an answer-critical cue in the shared crop.
    "a1_scene_afternoon_7a10f39.webp",
    "a1_scene_ana-mexican_1fca9cc.webp",
    "a1_scene_asks-hospital_fd7a80d.webp",
    "a1_scene_book-next-to-table_11e545b.webp",
    "a1_scene_book-on-table_493a24c.webp",
    "a1_scene_book-under-table_3882341.webp",
    "a1_scene_boy-wants-chicken_33caa20.webp",
    "a1_scene_boy-wants-two-eggs_e6f44b3.webp",
    "a1_scene_bus-arrives-8-00-night_ac2fbb8.webp",
    "a1_scene_bus-arrives-8-night_aa53495.webp",
    "a1_scene_bus-leaves-6-night_59526f5.webp",
    "a1_scene_bus-leaves-7-night_937441f.webp",
    "a1_scene_bus-leaves-8-00-night_4e10422.webp",
    "a1_scene_bus-leaves-8-night_094ebc0.webp",
    "a1_scene_coffee-for-breakfast_54853c5.webp",
    "a1_scene_cold-and-sunny_e290276.webp",
    "a1_scene_diego-spanish_5d1c02d.webp",
    "a1_scene_does-not-like-fish_6232056.webp",
    "a1_scene_does-not-like-rice_90d5dff.webp",
    "a1_scene_five-oranges_c241081.webp",
    "a1_scene_five-strawberries_858ca75.webp",
    "a1_scene_four-blue-chairs_f3183f0.webp",
    "a1_scene_four-oranges_9e38f8c.webp",
    "a1_scene_four-red-chairs_0275a9d.webp",
    "a1_scene_four-strawberries_f01534e.webp",
    "a1_scene_four-yellow-bananas_d84c53d.webp",
    "a1_scene_hot-and-cloudy_801561e.webp",
    "a1_scene_hot-and-sunny_c88d51f.webp",
    "a1_scene_hot-jacket_586235b.webp",
    "a1_scene_hot-shirt_78da229.webp",
    "a1_scene_juice-for-dinner_d082ab8.webp",
    "a1_scene_left-only-hospital_4f9affe.webp",
    "a1_scene_library-far-from-bank_1f22e2f.webp",
    "a1_scene_library-far-from-park_49a2d48.webp",
    "a1_scene_library-near-bank_1865f7e.webp",
    "a1_scene_library-near-park_7111386.webp",
    "a1_scene_library-next-to-park_1233b17.webp",
    "a1_scene_library-next-to-school_e805256.webp",
    "a1_scene_library-right_6b435ec.webp",
    "a1_scene_man-wants-two-red-apples_772ff8a.webp",
    "a1_scene_one-egg-for-breakfast_fad7e29.webp",
    "a1_scene_pair-can-go-by-bus_69469a0.webp",
    "a1_scene_pair-can-go-by-train_67f6004.webp",
    "a1_scene_pair-cannot-go-by-bus_547b3cc.webp",
    "a1_scene_pair-needs-water_0ff58e2.webp",
    "a1_scene_pair-waits-at-red-signal_5078634.webp",
    "a1_scene_pair-wants-chicken_a4f08a9.webp",
    "a1_scene_pair-wants-fish_dedf2c8.webp",
    "a1_scene_pair-wants-three-eggs_00d5e99.webp",
    "a1_scene_pair-wants-two-apples_35e65ce.webp",
    "a1_scene_pair-wants-two-eggs_0cb7c59.webp",
    "a1_scene_pharmacy-left_1fc90a7.webp",
    "a1_scene_pharmacy-right_99d73fd.webp",
    "a1_scene_rejects-tv_58b4949.webp",
    "a1_scene_right-only-station_b733a34.webp",
    "a1_scene_station-far-from-park_d5dce5a.webp",
    "a1_scene_station-near-park_e8f4e0e.webp",
    "a1_scene_station-next-to-park_e1bf534.webp",
    "a1_scene_store-far-from-park_0ed30ee.webp",
    "a1_scene_store-near-bank_dd64fd0.webp",
    "a1_scene_store-next-to-park_eafcb41.webp",
    "a1_scene_straight-left-bank_11f5a88.webp",
    "a1_scene_straight-left-hospital_d4ea009.webp",
    "a1_scene_straight-left-station_7883bc6.webp",
    "a1_scene_straight-right-bank_2dc8386.webp",
    "a1_scene_straight-right-hospital_9271c5a.webp",
    "a1_scene_straight-right-station_6e3de89.webp",
    "a1_scene_tea-for-breakfast_98a3941.webp",
    "a1_scene_tea-for-lunch_c98eac2.webp",
    "a1_scene_three-eggs-for-breakfast_38c5f42.webp",
    "a1_scene_train-arrives-9-00_e656d46.webp",
    "a1_scene_train-leaves-8-00-night_c9b7ada.webp",
    "a1_scene_train-leaves-8-00_4f3f6e6.webp",
    "a1_scene_train-leaves-9-00_499abf3.webp",
    "a1_scene_turn-right-cross-station_338607c.webp",
    "a1_scene_woman-happy_259eb14.webp",
    "a1_scene_woman-wants-three-red-apples_dfcb889.webp",
    "a1_scene_woman-wants-two-green-apples_2751439.webp",
    "a1_scene_woman-wants-two-red-apples_ba4c073.webp",
    "a1_scene_you-have-phone_6017478.webp",
    "unit2_mission_two_blue_cars.webp",
    # Late findings from the independent post-repair tile audit. Keep these in
    # the same fail-closed binding set so a rebuild cannot silently fall back to
    # the landscape master that lost the tested cue in the fixed 4:5 crop.
    "a1_scene_ana-come-home_ad0dbb5.webp",
    "a1_scene_ana-go-school_83ace0e.webp",
    "a1_scene_asks-bank_0295ac7.webp",
    "a1_scene_asks-bathroom_03032c0.webp",
    "a1_scene_asks-station_745494e.webp",
    "a1_scene_boy-waits-at-red-signal_bc0177a.webp",
    "a1_scene_bus-arrives-6-morning_62e5453.webp",
    "a1_scene_bus-leaves-6-morning_45cf1bf.webp",
    "a1_scene_bus-leaves-8-00-morning_ffdbcde.webp",
    "a1_scene_bus-leaves-8-morning_ca11581.webp",
    "a1_scene_does-not-like-music_d5c6ed9.webp",
    "a1_scene_does-not-like-two-red-apples_d28d501.webp",
    "a1_scene_girl-waits-at-red-signal_c77147f.webp",
    "a1_scene_he-has-car_b3fa0ff.webp",
    "a1_scene_one-person-can-go-by-bus_7eed7a1.webp",
    "a1_scene_rain-boots_c3ee514.webp",
    "a1_scene_rain-umbrella_60133ed.webp",
    "a1_scene_she-has-bike_b6f7660.webp",
    "a1_scene_three-green-pears_341c468.webp",
    "a1_scene_two-eggs-for-breakfast_a51ebe1.webp",
    "a1_scene_two-eggs-for-lunch_8e8ae04.webp",
    # Final exact-runtime audit repairs.
    "a1_scene_ana-wake_d91086e.webp",
    "a1_scene_bank-right_cad19dd.webp",
    "a1_scene_bank_bdd240c.webp",
    "a1_scene_boy-crosses-at-green_4befcaf.webp",
    "a1_scene_bus-leaves-9-00_8cee9f4.webp",
    "a1_scene_luis-american_5a29f49.webp",
    "a1_scene_sofia-canadian_adf798e.webp",
    # Final answer-critical review: use label-free, action-literal assessment
    # scenes and keep count/speaker/music cues inside the fixed 4:5 crop.
    "a1_three-green-books.webp",
    "a1_scene_invites-music_0c739d4.webp",
    "a1_scene_i-have-book_25eacad.webp",
    "a1_scene_cook-sofia_ecb7eca.webp",
    "a1_scene_doctor-diego_1c7ef5a.webp",
    "a1_scene_driver-luis_111aa43.webp",
    "a1_scene_farmer-ana_f823cb6.webp",
    "a1_scene_nurse-sofia_63f2a9c.webp",
    "a1_scene_teacher-ana_0e983a0.webp",
}

# The earlier base six-bag asset failed semantic review, but its dedicated
# portrait-safe derivative is a separate, verified image that literally shows
# six white bags. Bind that derivative to the corrected canonical concept so a
# future course rebuild preserves both the semantic repair and the four-card
# crop instead of resurrecting the rejected base file.
FOUR_CARD_VARIANT_OVERRIDES = {
    "unit2_six_white_bags.webp": "a1_scene_six-white-bags_f412a8a_four-card.webp",
}


def load_reviewed_photoreal_filenames() -> frozenset[str]:
    if not REVIEWED_PHOTOREAL_REGISTRY.is_file():
        raise FileNotFoundError(
            "Reviewed photoreal media registry is required: "
            f"{REVIEWED_PHOTOREAL_REGISTRY}"
        )
    payload = json.loads(REVIEWED_PHOTOREAL_REGISTRY.read_text(encoding="utf-8"))
    filenames = payload.get("files")
    if not isinstance(filenames, list) or not all(
        isinstance(filename, str) and filename.endswith(".webp")
        for filename in filenames
    ):
        raise ValueError(
            f"Invalid reviewed-photoreal registry: {REVIEWED_PHOTOREAL_REGISTRY}"
        )
    return frozenset(filenames)


REVIEWED_PHOTOREAL_FILENAMES = load_reviewed_photoreal_filenames()

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
                    "reviewed-photoreal"
                    if filename in REVIEWED_PHOTOREAL_FILENAMES
                    or (unit_number == 3 and explicit)
                    else "existing"
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
                "source": (
                    "reviewed-photoreal"
                    if filename in REVIEWED_PHOTOREAL_FILENAMES
                    else source
                ),
                "card_refs": [],
                "review_contexts": [],
            },
        )
        if card_ref not in item["card_refs"]:
            item["card_refs"].append(card_ref)
        if context not in item["review_contexts"]:
            item["review_contexts"].append(context)

    def add_four_card_variant(
        self,
        filename: str,
        card_ref: str,
        binding_key: str,
        concept: str,
    ) -> tuple[str, str]:
        if filename in FOUR_CARD_VARIANT_OVERRIDES:
            variant = FOUR_CARD_VARIANT_OVERRIDES[filename]
        elif filename in FOUR_CARD_REFRAMES:
            variant = filename.removesuffix(".webp") + "_four-card.webp"
        else:
            return filename, binding_key

        source_item = self.items.get(binding_key)
        if source_item is None:
            raise ValueError(f"Unknown four-card source binding {binding_key!r}")
        source_description = str(source_item["description"])
        key = f"four-card:{binding_key}:{variant}"
        item = self.items.setdefault(
            key,
            {
                "asset_id": key,
                "concept": concept,
                "description": (
                    "Four-card portrait-safe reframe of this exact teaching contract; "
                    "preserve every answer-critical object, count or quantity, color, "
                    "identity or relationship, action, spatial relation, polarity, time "
                    "or schedule, and whole-scene cue in the centered 4:5 crop. Source "
                    f"contract: {source_description}"
                ),
                "filename": variant,
                "ratio": "3:2",
                "dimensions": [1536, 1024],
                "source": "four-card-safe-area-variant",
                "card_refs": [],
                "review_contexts": [],
            },
        )
        if card_ref not in item["card_refs"]:
            item["card_refs"].append(card_ref)
        return variant, key


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
    if len(options) == 4 and all((option.get("image_url") or "").strip() for option in options):
        card_ref = f"{lesson['id']}|{stage}|{slide_id}"
        for option in options:
            option_id_value = str(option["id"])
            binding_key, concept = option_bindings[option_id_value]
            variant_filename, variant_binding_key = catalog.add_four_card_variant(
                str(option["image_url"]), card_ref, binding_key, concept
            )
            option["image_url"] = variant_filename
            option_bindings[option_id_value] = (variant_binding_key, concept)

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

    question_scenes = json.loads((ROOT / "docs/product/lesson-1-8-question-scenes.json").read_text(encoding="utf-8"))
    question_descriptions = {scene["filename"]: scene["description"] for scene in question_scenes["scenes"]}
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
                description = question_descriptions.get(usage["source_filename"], description)
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


def add_course_browser_runtime_contracts(
    catalog: AssetCatalog,
    unit_id: str | None = None,
) -> None:
    """Bind all 70 lesson and seven unit thumbnails to semantic review."""

    sys.path.insert(0, str(ROOT / "backend"))
    from app.data import load_all_lessons  # noqa: PLC0415

    lesson_payloads = [
        lesson_model.model_dump(mode="json")
        for lesson_model in load_all_lessons().values()
    ]
    for usage in course_browser_media_usages(lesson_payloads):
        context = usage["context"]
        if unit_id is not None and context.get("unit_id") != unit_id:
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


def is_unit_one_lesson_context(context: object) -> bool:
    return (
        isinstance(context, dict)
        and context.get("context_type") in {"lesson_card", "course_browser"}
        and context.get("unit_id") == "unit-1"
    )


def current_review_context_shape(context: dict[str, Any]) -> dict[str, Any]:
    """Upgrade retained runtime contexts when the semantic schema expands.

    The unit-only refresh deliberately preserves Units 2-7 instead of rebuilding
    their curriculum. Their current cards are all single-answer and do not author
    mission-only spatial instructions, so these explicit defaults retain their
    exact semantics while keeping the fail-closed context schema current.
    """

    upgraded = dict(context)
    upgraded.setdefault("instruction_es", None)
    upgraded.setdefault("visual_description_es", None)
    if "correct_option_ids" not in upgraded:
        correct_option_id = upgraded.get("correct_option_id")
        upgraded["correct_option_ids"] = (
            [correct_option_id] if isinstance(correct_option_id, str) and correct_option_id else []
        )
    upgraded.setdefault("mission_targets", [])
    return upgraded


def refresh_unit_one_runtime_manifest() -> None:
    """Refresh Unit 1 runtime bindings without rebuilding Units 2-7."""

    manifest_payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    retained_assets: list[dict[str, Any]] = []
    for raw_item in manifest_payload.get("assets", []):
        item = dict(raw_item)
        review_contexts = [
            current_review_context_shape(context)
            for context in item.get("review_contexts", [])
            if isinstance(context, dict) and not is_unit_one_lesson_context(context)
        ]
        if not review_contexts:
            continue
        item["review_contexts"] = review_contexts
        item["card_refs"] = [
            card_ref
            for card_ref in item.get("card_refs", [])
            if not str(card_ref).startswith("1.")
        ]
        retained_assets.append(item)

    unit_one_catalog = AssetCatalog()
    add_unit_one_runtime_contracts(unit_one_catalog)
    add_course_browser_runtime_contracts(unit_one_catalog, unit_id="unit-1")
    unit_one_assets = [
        item for item in unit_one_catalog.items.values() if item["review_contexts"]
    ]
    manifest_payload["assets"] = sorted(
        [*retained_assets, *unit_one_assets],
        key=lambda item: item["asset_id"],
    )
    MANIFEST.write_text(
        json.dumps(manifest_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Refreshed {len(unit_one_assets)} Unit 1 runtime media contracts "
        "without rebuilding Units 2-7."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build A1 lesson and media contracts.")
    parser.add_argument(
        "--unit-one-runtime-only",
        action="store_true",
        help="Refresh only Unit 1 runtime media bindings in the existing manifest.",
    )
    args = parser.parse_args()
    if args.unit_one_runtime_only:
        refresh_unit_one_runtime_manifest()
        return

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
