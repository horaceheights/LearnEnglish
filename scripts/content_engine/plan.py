"""Lesson plans: a lesson's authored content, from which the engine composes cards.

A plan keeps the lesson metadata and, for each card, its recipe and content.
Fields a live card sets differently from its recipe are recorded under
`exceptions`, so composing a plan always returns the live lesson exactly and
the number of exceptions measures how far the lesson is from pure recipes.
"""
from __future__ import annotations

import json

from scripts.content_engine.recipes import RECIPES, recipe_for

PLAN_VERSION = 1
ABSENT = {"$absent": True}
PLAN_KEYS = ("recipe", "exceptions", "answer", "mirror_translation", "field_order", "cue_speakers", "formatted")
# The standard field order for a card. A live card written in another order
# keeps that order in its plan so reinstalling it changes no bytes.
FIELD_ORDER = (
    "slide_id", "interaction_type", "prompt", "mission_chapter_id", "stage", "correct_option_id", "options",
    "audio_text", "answer_audio_text", "answer_audio_turns", "prompt_image_url", "audio_turns",
    "spanish_translation", "translation", "correct_option_ids", "audio_revision", "answer_audio_speaker",
    "pedagogy_note", "audio_speaker", "answer_audio_revision", "mission_game",
)


def standard_order(fields) -> list[str]:
    rank = {field: index for index, field in enumerate(FIELD_ORDER)}
    return sorted(fields, key=lambda field: (rank.get(field, len(rank)), field))


def import_card(card: dict) -> dict:
    name = recipe_for(card)
    spec = dict(card)
    if "correct_option_id" in card and name in ("teach", "speak", "choice"):
        ids = [option["id"] for option in card["options"]]
        if card["correct_option_id"] in ids and ids.index(card["correct_option_id"]):
            spec["answer"] = ids.index(card["correct_option_id"])
    if name == "mission" and (card.get("mission_game") or {}).get("kind") != "voice-gate":
        speakers = [turn.get("speaker_role") for turn in card.get("audio_turns") or []]
        if speakers and set(speakers) != {"teacher"}:
            spec["cue_speakers"] = speakers
    if "translation" in card and card["translation"] == card.get("spanish_translation"):
        del spec["translation"]
        spec["mirror_translation"] = True
    derived = RECIPES[name](spec)
    exceptions, formatted = {}, {}
    for field, value in derived.items():
        spec.pop(field, None)
        actual = card.get(field, ABSENT)
        if actual != value:
            exceptions[field] = actual
        elif json.dumps(actual) != json.dumps(value):
            # Same data written in another key order: formatting, not an exception.
            formatted[field] = actual
    if formatted:
        spec["formatted"] = formatted
    spec = {"recipe": name, **spec}
    if exceptions:
        spec["exceptions"] = exceptions
    if list(card) != standard_order(card):
        spec["field_order"] = list(card)
    return spec


def compose_card(spec: dict) -> dict:
    content = {key: value for key, value in spec.items() if key not in PLAN_KEYS}
    card = {**content, **RECIPES[spec["recipe"]](spec), **spec.get("formatted", {}), **spec.get("exceptions", {})}
    card = {key: value for key, value in card.items() if value != ABSENT}
    if spec.get("mirror_translation"):
        card["translation"] = card["spanish_translation"]
    order = spec.get("field_order") or standard_order(card)
    return {field: card[field] for field in order}


def import_lesson(lesson: dict) -> dict:
    metadata = {key: value for key, value in lesson.items() if key != "cards"}
    plan = {"plan_version": PLAN_VERSION, "lesson": metadata,
            "cards": [import_card(card) for card in lesson.get("cards") or []]}
    if list(lesson) != [*metadata, "cards"]:
        plan["field_order"] = list(lesson)
    return plan


def compose_lesson(plan: dict) -> dict:
    if plan.get("plan_version") != PLAN_VERSION:
        raise ValueError(f"Unsupported plan version {plan.get('plan_version')!r}.")
    lesson = {**plan["lesson"], "cards": [compose_card(spec) for spec in plan["cards"]]}
    return {field: lesson[field] for field in plan.get("field_order") or lesson}


def recipe_coverage(plan: dict) -> dict:
    """Cards composed purely from a recipe, versus cards that need exceptions."""
    cards = plan["cards"]
    pure = [spec for spec in cards if spec["recipe"] != "verbatim" and not spec.get("exceptions")]
    fields: dict[str, int] = {}
    for spec in cards:
        for field in spec.get("exceptions", {}):
            fields[field] = fields.get(field, 0) + 1
    return {"cards": len(cards), "pure": len(pure),
            "verbatim": sum(spec["recipe"] == "verbatim" for spec in cards),
            "mission": sum(spec["recipe"] == "mission" for spec in cards), "exception_fields": fields}
