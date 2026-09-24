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
import json
import re
import shutil
import subprocess
from pathlib import Path

from scripts.answer_choice_guardrail import analyze_bank
from scripts.content_engine.plan import PLAN_VERSION

WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
DEFAULT_LAYOUT = {"Recognize": 10, "Listen": 8, "Speak": 7, "Use": 7}
MAX_TEXT_OPTIONS = 3
MAX_IMAGE_OPTIONS = 4
CONSTRUCTIONS = 4  # the last four Use cards build the whole sentence


ROOT = Path(__file__).resolve().parents[2]
ACTION_VIDEO_BINDINGS = ROOT / "docs/product/action-video-bindings.json"
HINT_ORACLE = ROOT / "mobile/scripts/mistake-hint-oracle.cjs"


class BriefError(ValueError):
    pass


def unpostered_action_images() -> set[str]:
    """Photos that play an action video but have no reviewed two-choice poster.

    A two-choice picture card plays the correct photo's action video and shows its
    reviewed first-frame poster; without one, the photo needs a larger card.
    """
    if not ACTION_VIDEO_BINDINGS.exists():
        return set()
    bindings = json.loads(ACTION_VIDEO_BINDINGS.read_text(encoding="utf-8")).get("bindings", {})
    return {f"{key}.webp" for key, binding in bindings.items() if binding.get("video") and not binding.get("poster")}


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


def distractors(item: dict, candidates: list[dict], count: int, *, need_image: bool,
                rejected: frozenset = frozenset()) -> list[dict]:
    """Up to `count` wrong options of the item's kind; at least one is required.

    An item's `avoid` list names options that would also be true of its picture
    (a boy is also a child; a father is also a man), so they are never proposed.
    """
    chosen = []
    avoid = set(item.get("avoid", []))
    ordered = sorted(candidates, key=lambda other: abs(other["_order"] - item["_order"]))
    for other in ordered:
        if len(chosen) == count:
            break
        if other["text"] == item["text"] or other.get("kind") != item.get("kind") or other["text"] in avoid:
            continue
        if (item["text"], other["text"]) in rejected:
            continue
        if form(other) != form(item) or not coherent([item, *chosen, other]):
            continue
        if need_image and (not other.get("image") or other["image"] in {item["image"], *(c["image"] for c in chosen)}):
            continue
        if other["text"] in {c["text"] for c in chosen}:
            continue
        chosen.append(other)
    if not chosen:
        raise BriefError(f"No {item.get('kind', 'untyped')} {form(item)} can be a wrong option for "
                         f"{item['text']!r}; add items of that kind to the brief's pool.")
    return chosen


def _option(item: dict, *, image: bool, suffix: str) -> dict:
    return {"id": f"{slug(item['text'])}-{suffix}", "image_url": item["image"] if image else "",
            "label": item["text"]}


def _choice(slide: str, stage: str, item: dict, pool: list[dict], count: int, *, image: bool,
            instructions: dict, rejected: frozenset = frozenset()) -> tuple[dict, dict]:
    wrong = distractors(item, pool, count - 1, need_image=image, rejected=rejected)
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
    return f"{stage}: {item['text']}"


def _completion(slide: str, item: dict) -> dict:
    """Guided completion: the learner places the sentence's last two words."""
    tokens = words(item["text"])
    blanks = tokens[-2:]
    ids = [f"{token.lower()}-{index + 1}" if blanks.count(token) > 1 else token.lower()
           for index, token in enumerate(blanks)]
    prompt = item["text"]
    for token in reversed(blanks):
        cut = prompt.rindex(token)
        prompt = prompt[:cut] + "___" + prompt[cut + len(token):]
    return {"recipe": "complete", "slide_id": slide, "interaction_type": f"complete{len(blanks)}",
            "prompt": prompt, "stage": "Use", "correct_option_ids": ids,
            "options": [{"id": identifier, "image_url": "", "label": token} for identifier, token in zip(ids, blanks)],
            "answer_audio_text": item["text"], "prompt_image_url": item["image"],
            "spanish_translation": item["es"], "mirror_translation": True}


def _construction(slide: str, item: dict) -> dict:
    tokens = words(item["text"])
    ordered = [{"id": f"word-{index + 1}", "image_url": "", "label": token} for index, token in enumerate(tokens)]
    return {"recipe": "complete", "slide_id": slide, "interaction_type": "complete-sentence",
            "prompt": WORD.sub("___", item["text"]), "stage": "Use",
            "correct_option_ids": [option["id"] for option in ordered],
            "options": [*ordered[1::2], *ordered[0::2]], "answer_audio_text": item["text"],
            "prompt_image_url": item["image"], "spanish_translation": item["es"], "mirror_translation": True,
            "pedagogy_note": note("Use", item)}


def propose_lesson(brief: dict, standards: dict, rejected_pairs=frozenset()) -> tuple[dict, list[dict]]:
    """Return a draft plan and the answer banks a person must review.

    `rejected_pairs` holds (answer, wrong option) pairs that must not be proposed,
    for example because the app's mistake hints cannot explain the contrast.
    """
    rejected = frozenset(rejected_pairs)
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
    needs_larger_card = unpostered_action_images()

    def option_count(item: dict, image: bool, early: bool) -> int:
        if not early:
            return MAX_IMAGE_OPTIONS if image else MAX_TEXT_OPTIONS
        if image and Path(item["image"]).name in needs_larger_card:
            return MAX_IMAGE_OPTIONS
        return 2

    sentences = [item for item in items if 2 <= len(words(item["text"])) <= 8] or items

    vocabulary = [term.lower() for term in brief["lesson"].get("vocabulary", [])]
    terms = {item["text"]: [term for term in vocabulary
                            if re.search(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", item["text"].lower())]
             for item in pool}
    practice = {term: 0 for term in vocabulary}
    uses = {item["text"]: 0 for item in pool}

    def practised(item: dict) -> None:
        uses[item["text"]] += 1
        for term in terms[item["text"]]:
            practice[term] += 1

    def pick(eligible: list[dict], slots: int) -> list[dict]:
        """Give each slot to the item whose new words are least practised so far,
        then keep the section in story order."""
        chosen = []
        for _ in range(slots):
            def need(item):
                counts = [practice[term] for term in terms[item["text"]]]
                # Use every item once before any repeats, then favour the least-practised words.
                return (chosen.count(item), min(counts) if counts else 99, uses[item["text"]], item["_order"])
            best = min(eligible, key=need)
            chosen.append(best)
            for term in terms[best["text"]]:
                practice[term] += 1
            uses[best["text"]] += 1
        for item in chosen:  # undo the provisional counts; the cards below record them
            uses[item["text"]] -= 1
            for term in terms[item["text"]]:
                practice[term] -= 1
        # Story order within each pass; a repeated item comes after every item has had a turn.
        passes: dict[str, int] = {}
        ranked = []
        for item in chosen:
            passes[item["text"]] = passes.get(item["text"], 0) + 1
            ranked.append((passes[item["text"]], item["_order"], item))
        return [item for _, _, item in sorted(ranked, key=lambda entry: entry[:2])]

    cards, banks = [], []
    for index, item in enumerate(items):
        practised(item)
        cards.append({"recipe": "teach", "slide_id": f"L{index + 1}", "stage": "Learn",
                      "options": [_option(item, image=True, suffix="learn")], "spanish_translation": item["es"],
                      "pedagogy_note": note("Learn", item)})
    # Each section gives its cards to the least-practised new words, in story order.
    # Recognize alternates picture choices and sentence choices; two options come before four.
    for index, item in enumerate(pick(items, layout["Recognize"])):
        practised(item)
        image = index % 2 == 0
        count = option_count(item, image, early=index < layout["Recognize"] // 2)
        spec, bank = _choice(f"R{index + 1}", "Recognize", item, pool, count, image=image,
                             instructions=instructions, rejected=rejected)
        cards.append(spec)
        banks.append(bank)
    for index, item in enumerate(pick(items, layout["Listen"])):
        practised(item)
        image = index % 3 != 2
        count = option_count(item, image, early=index < layout["Listen"] // 2)
        spec, bank = _choice(f"A{index + 1}", "Listen", item, pool, count, image=image,
                             instructions=instructions, rejected=rejected)
        cards.append(spec)
        banks.append(bank)
    for index, item in enumerate(pick(sentences, layout["Speak"])):
        practised(item)
        cards.append({"recipe": "speak", "slide_id": f"S{index + 1}", "stage": "Speak",
                      "options": [_option(item, image=True, suffix="speak")], "spanish_translation": item["es"],
                      "pedagogy_note": note("Speak", item)})
    # Completa progression: guided completion first, whole-sentence construction in the last four.
    # Use works with whole sentences (three words or more) and keeps story order.
    use_pool = [item for item in sentences if len(words(item["text"])) >= 3] or sentences
    for index, item in enumerate(pick(use_pool, layout["Use"])):
        practised(item)
        build = index >= layout["Use"] - CONSTRUCTIONS or len(words(item["text"])) < 3
        cards.append((_construction if build else _completion)(f"U{index + 1}", item))

    # Each section follows the story in order; number its beats like every standard lesson.
    beats: dict[str, int] = {}
    for card in cards:
        beats[card["stage"]] = beats.get(card["stage"], 0) + 1
        card["pedagogy_note"] = f"Story beat {beats[card['stage']]:02d}: {_item_text(card)}"
    lesson = {key: value for key, value in brief["lesson"].items()}
    lesson.setdefault("vocabulary", [])
    # Items marked `builds_on` grow earlier language; their cards are the purposeful review.
    growth = {item["text"] for item in items if item.get("builds_on")}
    if growth:
        lesson["purposeful_review_slides"] = [card["slide_id"] for card in cards if _item_text(card) in growth]
    plan = {"plan_version": PLAN_VERSION, "draft": True, "lesson": lesson, "cards": cards,
            "source": {"path": brief["target"], "sha256": brief.get("replaces_sha256")}}
    return plan, banks


def _item_text(spec: dict) -> str | None:
    if spec["recipe"] == "complete":
        return spec.get("answer_audio_text")
    options = spec.get("options") or []
    return options[spec.get("answer", 0)].get("label") if options else None


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


def unexplained_mistakes(lesson: dict) -> set[tuple[str, str]] | None:
    """(answer, wrong option) pairs the app's hint resolver can only answer generically.

    Returns None when Node or the mobile dependencies are unavailable.
    """
    node = shutil.which("node")
    if not node or not (ROOT / "mobile/node_modules/typescript").exists():
        return None
    result = subprocess.run([node, str(HINT_ORACLE)], input=json.dumps(lesson), capture_output=True,
                            text=True, encoding="utf-8", cwd=ROOT, check=True)
    return {tuple(pair) for pair in json.loads(result.stdout)}


def propose_explained_lesson(brief: dict, standards: dict, check=unexplained_mistakes,
                             attempts: int = 8) -> tuple[dict, list[dict]]:
    """Propose a lesson whose every wrong option has a specific mistake explanation."""
    from scripts.content_engine.plan import compose_lesson  # local import avoids a cycle

    rejected: set[tuple[str, str]] = set()
    for _ in range(attempts):
        plan, banks = propose_lesson(brief, standards, frozenset(rejected))
        found = check(compose_lesson(plan))
        if found is None:
            raise BriefError("Mistake hints could not be checked; install the mobile dependencies (npm ci).")
        if not found - rejected:
            if found:
                raise BriefError(f"Wrong options still lack a specific hint: {sorted(found)}")
            return plan, banks
        rejected |= found
    raise BriefError(f"Could not find explainable wrong options after {attempts} attempts: {sorted(rejected)}")
