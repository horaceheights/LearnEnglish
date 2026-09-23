"""Lesson plans: a lesson's authored content, from which the engine composes cards.

A plan keeps the lesson metadata and, for each card, its recipe and content.
Fields a live card sets differently from its recipe are recorded under
`exceptions`, so composing a plan always returns the live lesson exactly and
the number of exceptions measures how far the lesson is from pure recipes.
"""
from __future__ import annotations

from scripts.content_engine.recipes import RECIPES, recipe_for

PLAN_VERSION = 1
ABSENT = {"$absent": True}


def import_card(card: dict) -> dict:
    name = recipe_for(card)
    spec = dict(card)
    if "correct_option_id" in card and name in ("teach", "speak", "choice"):
        ids = [option["id"] for option in card["options"]]
        if card["correct_option_id"] in ids and ids.index(card["correct_option_id"]):
            spec["answer"] = ids.index(card["correct_option_id"])
    if "translation" in card and card["translation"] == card.get("spanish_translation"):
        del spec["translation"]
        spec["mirror_translation"] = True
    derived = RECIPES[name](spec)
    exceptions = {}
    for field, value in derived.items():
        spec.pop(field, None)
        actual = card.get(field, ABSENT)
        if actual != value:
            exceptions[field] = actual
    spec = {"recipe": name, **spec}
    if exceptions:
        spec["exceptions"] = exceptions
    return spec


def compose_card(spec: dict) -> dict:
    content = {key: value for key, value in spec.items()
               if key not in ("recipe", "exceptions", "answer", "mirror_translation")}
    card = {**content, **RECIPES[spec["recipe"]](spec), **spec.get("exceptions", {})}
    card = {key: value for key, value in card.items() if value != ABSENT}
    if spec.get("mirror_translation"):
        card["translation"] = card["spanish_translation"]
    return card


def import_lesson(lesson: dict) -> dict:
    metadata = {key: value for key, value in lesson.items() if key != "cards"}
    return {"plan_version": PLAN_VERSION, "lesson": metadata,
            "cards": [import_card(card) for card in lesson.get("cards") or []]}


def compose_lesson(plan: dict) -> dict:
    if plan.get("plan_version") != PLAN_VERSION:
        raise ValueError(f"Unsupported plan version {plan.get('plan_version')!r}.")
    return {**plan["lesson"], "cards": [compose_card(spec) for spec in plan["cards"]]}


def recipe_coverage(plan: dict) -> dict:
    """Cards composed purely from a recipe, versus cards that need exceptions."""
    cards = plan["cards"]
    # Mission cards are kept as authored until mission beats have recipes of their own.
    pure = [spec for spec in cards if spec["recipe"] not in ("verbatim", "mission") and not spec.get("exceptions")]
    fields: dict[str, int] = {}
    for spec in cards:
        for field in spec.get("exceptions", {}):
            fields[field] = fields.get(field, 0) + 1
    return {"cards": len(cards), "pure": len(pure),
            "verbatim": sum(spec["recipe"] == "verbatim" for spec in cards),
            "mission": sum(spec["recipe"] == "mission" for spec in cards), "exception_fields": fields}
