"""Authoring layer: turn a short lesson brief into a proposed standard lesson.

An author writes the lesson as an ordered list of items (English, Spanish,
picture, kind). The engine proposes every card: Learn introduces each item;
Recognize and Listen use two options before four; Speak repeats items; Use
builds whole sentences from word tiles. It also proposes the wrong options,
drawn from items of the same kind and form.

A proposal is always a draft. A person reviews every proposed answer bank
(see docs/qa/answer-choice-review.md) and records it before the plan can be
installed; the engine never approves its own proposals.
"""
from __future__ import annotations

import hashlib
import re

from scripts.answer_choice_guardrail import analyze_bank
from scripts.content_engine.plan import PLAN_VERSION

WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
DEFAULT_LAYOUT = {"Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7}
MAX_TEXT_OPTIONS = 3
MAX_IMAGE_OPTIONS = 4


class BriefError(ValueError):
    pass


def words(text: str) -> list[str]:
    return WORD.findall(text)


def form(item: dict) -> str:
    """Words and complete sentences never share an answer bank."""
    return "sentence" if len(words(item["text"])) > 2 or item["text"].rstrip().endswith((".", "?", "!")) else "word"


def slug(text: str) -> str:
    return "-".join(word.lower() for word in words(text)) or "item"


def coherent(bank: list[dict]) -> bool:
    """The shared answer-bank check finds no defect or teaching conflict."""
    _, hard, conflicts = analyze_bank({"options": [{"label": item["text"]} for item in bank]})
    return not hard and not conflicts


def rotate(values: list, seed: str) -> list:
    """Deterministically vary where the correct answer sits."""
    if not values:
        return values
    shift = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % len(values)
    return values[shift:] + values[:shift]


def distractors(item: dict, candidates: list[dict], count: int, *, need_image: bool) -> list[dict]:
    chosen = []
    ordered = sorted(candidates, key=lambda other: abs(other["_order"] - item["_order"]))
    for other in ordered:
        if len(chosen) == count:
            break
        if other["text"] == item["text"] or other.get("kind") != item.get("kind"):
            continue
        if form(other) != form(item) or not coherent([item, *chosen, other]):
            continue
        if need_image and (not other.get("image") or other["image"] in {item["image"], *(c["image"] for c in chosen)}):
            continue
        if other["text"] in {c["text"] for c in chosen}:
            continue
        chosen.append(other)
    if len(chosen) < count:
        raise BriefError(f"Not enough {item.get('kind', 'untyped')} {form(item)}s to propose {count} wrong "
                         f"option(s) for {item['text']!r}; add items of that kind to the brief's pool.")
    return chosen


def _option(item: dict, *, image: bool, suffix: str) -> dict:
    return {"id": f"{slug(item['text'])}-{suffix}", "image_url": item["image"] if image else "",
            "label": item["text"]}


def _choice(slide: str, stage: str, item: dict, pool: list[dict], count: int, *, image: bool,
            instructions: dict) -> tuple[dict, dict]:
    wrong = distractors(item, pool, count - 1, need_image=image)
    options = rotate([item, *wrong], slide)
    spec = {"recipe": "choice", "slide_id": slide, "stage": stage,
            "options": [_option(each, image=image, suffix=slide.lower()) for each in options],
            "answer": options.index(item)}
    if stage == "Listen":
        spec["spanish_translation"] = instructions["listen"]
    elif image:
        spec["spanish_translation"] = item["es"]
    else:
        spec.update(prompt="", prompt_image_url=item["image"], spanish_translation=instructions["choose_sentence"])
    if spec["answer"] == 0:
        del spec["answer"]
    spec["pedagogy_note"] = note(stage, item)
    bank = {"slide_id": slide, "stage": stage, "correct": item["text"], "wrong": [each["text"] for each in wrong],
            "images": image}
    return spec, bank


def note(stage: str, item: dict) -> str:
    return f"Engine proposal: {stage} practice of {item['text']!r}; review before install."


def _construction(slide: str, item: dict) -> dict:
    tokens = words(item["text"])
    ordered = [{"id": f"word-{index + 1}", "image_url": "", "label": token} for index, token in enumerate(tokens)]
    return {"recipe": "complete", "slide_id": slide, "interaction_type": "complete-sentence",
            "prompt": WORD.sub("___", item["text"]), "stage": "Use",
            "correct_option_ids": [option["id"] for option in ordered],
            "options": [*ordered[1::2], *ordered[0::2]], "answer_audio_text": item["text"],
            "prompt_image_url": item["image"], "spanish_translation": item["es"], "mirror_translation": True,
            "pedagogy_note": note("Use", item)}


def propose_lesson(brief: dict, standards: dict) -> tuple[dict, list[dict]]:
    """Return a draft plan and the answer banks a person must review."""
    items = [{**item, "_order": index} for index, item in enumerate(brief["items"])]
    pool = items + [{**item, "_order": len(items) + index} for index, item in enumerate(brief.get("pool", []))]
    for item in items:
        for field in ("text", "es", "image", "kind"):
            if not item.get(field):
                raise BriefError(f"Item {item.get('text', item['_order'])!r} needs {field!r}.")
    layout = {**DEFAULT_LAYOUT, **brief.get("layout", {})}
    total = len(items) + sum(layout.values())
    bounds = standards["standard_lesson_cards"]
    if not bounds["min"] <= total <= bounds["max"]:
        raise BriefError(f"{len(items)} items make {total} cards; standard lessons need {bounds['min']}-{bounds['max']}.")
    instructions = standards["instructions"]
    sentences = [item for item in items if 2 <= len(words(item["text"])) <= 8] or items

    cards, banks = [], []
    for index, item in enumerate(items):
        cards.append({"recipe": "teach", "slide_id": f"L{index + 1}", "stage": "Learn",
                      "options": [_option(item, image=True, suffix="learn")], "spanish_translation": item["es"],
                      "pedagogy_note": note("Learn", item)})
    # Recognize alternates picture choices and sentence choices; two options come before four.
    for index in range(layout["Recognize"]):
        item = items[index % len(items)]
        image = index % 2 == 0
        early = index < layout["Recognize"] // 2
        count = 2 if early else (MAX_IMAGE_OPTIONS if image else MAX_TEXT_OPTIONS)
        spec, bank = _choice(f"R{index + 1}", "Recognize", item, pool, count, image=image, instructions=instructions)
        cards.append(spec)
        banks.append(bank)
    # Listen starts from the end of the story so each item is heard in a new position.
    for index in range(layout["Listen"]):
        item = items[-1 - index % len(items)]
        image = index % 3 != 2
        early = index < layout["Listen"] // 2
        count = 2 if early else (MAX_IMAGE_OPTIONS if image else MAX_TEXT_OPTIONS)
        spec, bank = _choice(f"A{index + 1}", "Listen", item, pool, count, image=image, instructions=instructions)
        cards.append(spec)
        banks.append(bank)
    for index in range(layout["Speak"]):
        item = sentences[index % len(sentences)]
        cards.append({"recipe": "speak", "slide_id": f"S{index + 1}", "stage": "Speak",
                      "options": [_option(item, image=True, suffix="speak")], "spanish_translation": item["es"],
                      "pedagogy_note": note("Speak", item)})
    for index in range(layout["Use"]):
        cards.append(_construction(f"U{index + 1}", sentences[-1 - index % len(sentences)]))

    lesson = {key: value for key, value in brief["lesson"].items()}
    lesson.setdefault("vocabulary", [])
    plan = {"plan_version": PLAN_VERSION, "draft": True, "lesson": lesson, "cards": cards,
            "source": {"path": brief["target"], "sha256": brief.get("replaces_sha256")}}
    return plan, banks


def review_sheet(plan: dict, banks: list[dict]) -> str:
    lesson = plan["lesson"]
    lines = [f"# Review: {lesson.get('title', lesson.get('id'))}", "",
             "Every answer bank below was proposed by the engine. For each one, confirm that exactly one option "
             "fits the picture or audio, that all options are the same kind of thing, and that every word has "
             "already been taught. Then record it by following docs/qa/answer-choice-review.md. "
             "Remove `draft` from the plan only after every bank is reviewed.", "",
             "| Slide | Stage | Options | Correct | Proposed wrong options |", "|---|---|---|---|---|"]
    for bank in banks:
        kind = "pictures" if bank["images"] else "text"
        lines.append(f"| {bank['slide_id']} | {bank['stage']} | {kind} | {bank['correct']} | "
                     f"{'; '.join(bank['wrong'])} |")
    return "\n".join(lines) + "\n"
