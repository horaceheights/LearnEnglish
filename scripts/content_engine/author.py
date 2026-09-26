"""Authoring layer: turn a short lesson brief into a proposed standard lesson.

An author writes the lesson as an ordered list of items (English, Spanish,
picture, kind). The engine proposes every card: Learn introduces each new
item; Recognize and Listen use two options before four; Speak repeats items;
Use builds whole sentences from word tiles. It also proposes the wrong options,
drawn from items of the same kind and form.

Learn holds only the lesson's new vocabulary (approved 2026-09-24). An item
marked `"learn": false` is practice only: a sentence built on a known frame,
such as "It is number eight." or "Two cars.", is practised in every later
section but never gets a Learn card. An item marked `"four_card": false` has a
picture whose answer does not survive the 2x2 grid's centered 4:5 crop, such as
a counting photo without a real reframe; it is never shown in a four-picture
card and gets three pictures at most. An item with a `question` (and
`question_es`) is a reply: when the learner picks its sentence for the picture,
the question is the card's heard prompt, as in "What number is it?".

Who says a line is content too. An item's `speaker` names the voice of its own
line (a cast member such as "ana", or "male-character"), and `question_speaker`
the voice that asks its `question`. An item with `turns` is a spoken exchange:
each turn names its words, speaker and picture, and every card that plays the
item plays those turns in order. An exchange has no single voice, so it never
becomes a Use construction; `"use": false` keeps any other item out of Use too.
A brief's `narrators` (such as ["teacher", "male-teacher"]) take turns reading
the neutral narration, card by card.

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
GRID_UNSAFE_IMAGE_OPTIONS = 3  # the largest layout that keeps every picture in 3:2
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
    """Words and complete sentences never share an answer bank.

    A multiword name such as "The United States" is a word, not a sentence; its
    item says so with `"form": "word"`.
    """
    if item.get("form") in ("word", "sentence"):
        return item["form"]
    return "sentence" if len(words(item["text"])) > 2 or item["text"].rstrip().endswith((".", "?", "!")) else "word"


def slug(text: str) -> str:
    return "-".join(word.lower() for word in words(text)) or "item"


def coherent(bank: list[dict]) -> bool:
    """The shared answer-bank check finds no defect, and no teaching conflict the answer does not accept.

    An item's `accepts` maps a teaching conflict the shared check reports (such as
    "conversational-response" for Hello. against Goodbye.) to the reason it is right
    here; a reviewer confirms that reason when recording the bank's contract.
    """
    _, hard, conflicts = analyze_bank({"options": [{"label": item["text"]} for item in bank]})
    return not hard and not set(conflicts) - set(bank[0].get("accepts", {}))


def rotate(values: list, seed: str) -> list:
    """Deterministically vary where the correct answer sits."""
    if not values:
        return values
    shift = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % len(values)
    return values[shift:] + values[:shift]


def grid_safe(item: dict) -> bool:
    return item.get("four_card", True) is not False


def distractors(item: dict, candidates: list[dict], count: int, *, need_image: bool,
                rejected: frozenset = frozenset(), labelled: bool = True) -> list[dict]:
    """Up to `count` wrong options of the item's kind; at least one is required.

    An item's `avoid` list names options that would also be true of its picture
    (a boy is also a child; a father is also a man), so they are never proposed.
    Its `prefer` list names wrong options tried first, so a choice can keep one
    variable (Three books. against Two books., not against Two cars.).
    """
    chosen = []
    avoid = set(item.get("avoid", []))
    prefer = list(item.get("prefer", []))
    ordered = sorted(candidates, key=lambda other: (prefer.index(other["text"]) if other["text"] in prefer else len(prefer),
                                                    abs(other["_order"] - item["_order"])))
    for other in ordered:
        if len(chosen) == count:
            break
        if other["text"] == item["text"] or other.get("kind") != item.get("kind") or other["text"] in avoid:
            continue
        if (item["text"], other["text"]) in rejected:
            continue
        # A caption-free picture bank shows no words, so only a labelled bank is read as text.
        if form(other) != form(item) or (labelled and not coherent([item, *chosen, other])):
            continue
        if need_image and (not other.get("image") or other["image"] in {item["image"], *(c["image"] for c in chosen)}):
            continue
        if need_image and count + 1 == MAX_IMAGE_OPTIONS and not grid_safe(other):
            continue
        if other["text"] in {c["text"] for c in chosen}:
            continue
        chosen.append(other)
    if not chosen:
        raise BriefError(f"No {item.get('kind', 'untyped')} {form(item)} can be a wrong option for "
                         f"{item['text']!r}; add items of that kind to the brief's pool.")
    return chosen


def _voice(spec: dict, item: dict, *, answer: bool = False) -> dict:
    """Give the card the voice of the item's line: its speaker, or each turn of its exchange."""
    if item.get("turns"):
        spec["answer_audio_turns" if answer else "audio_turns"] = [
            {"text": turn["text"], "speaker_role": turn["speaker"], "image_url": turn["image"]}
            for turn in item["turns"]]
    elif item.get("speaker"):
        spec["answer_audio_speaker" if answer else "audio_speaker"] = item["speaker"]
    return spec


def _option(item: dict, *, image: bool, suffix: str, captions: bool = True) -> dict:
    return {"id": f"{slug(item['text'])}-{suffix}", "image_url": item["image"] if image else "",
            "label": item["text"] if captions or not image else None}


def _choice(slide: str, stage: str, item: dict, pool: list[dict], count: int, *, image: bool,
            instructions: dict, rejected: frozenset = frozenset(), captions: bool = True) -> tuple[dict, dict]:
    wrong = distractors(item, pool, count - 1, need_image=image, rejected=rejected,
                        labelled=captions or not image)
    options = rotate([item, *wrong], slide)
    spec = {"recipe": "choice", "slide_id": slide, "stage": stage,
            "options": [_option(each, image=image, suffix=slide.lower(), captions=captions) for each in options],
            "answer": options.index(item)}
    if stage == "Listen":
        spec["spanish_translation"] = instructions["listen"]
        if image and not captions:
            spec["audio_text"] = item["text"]  # caption-free pictures: the spoken cue is authored
        _voice(spec, item)
    elif image:
        spec["spanish_translation"] = item["es"]
        if not captions:
            spec["prompt"] = item["text"]
        _voice(spec, item)
    elif item.get("question"):
        # A reply choice: the question plays over the picture and the chosen answer plays after.
        spec.update(prompt=item["question"], prompt_image_url=item["image"], spanish_translation=item["question_es"])
        if item.get("question_speaker"):
            spec["audio_speaker"] = item["question_speaker"]
        _voice(spec, item, answer=True)
    else:
        spec.update(prompt="", prompt_image_url=item["image"], spanish_translation=instructions["choose_sentence"])
        _voice(spec, item, answer=True)
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
            "spanish_translation": item["es"], "mirror_translation": True, **_use_voice(item)}


def _construction(slide: str, item: dict) -> dict:
    tokens = words(item["text"])
    ordered = [{"id": f"word-{index + 1}", "image_url": "", "label": token} for index, token in enumerate(tokens)]
    return {"recipe": "complete", "slide_id": slide, "interaction_type": "complete-sentence",
            "prompt": WORD.sub("___", item["text"]), "stage": "Use",
            "correct_option_ids": [option["id"] for option in ordered],
            "options": [*ordered[1::2], *ordered[0::2]], "answer_audio_text": item["text"],
            "prompt_image_url": item["image"], "spanish_translation": item["es"], "mirror_translation": True,
            "pedagogy_note": note("Use", item), **_use_voice(item)}


def narrate(cards: list[dict], narrators: list[str] | None) -> None:
    """Alternate neutral narration between the brief's narrators, card by card.

    Neutral narration (a line no named speaker says) takes turns among `narrators`
    in card order (approved 2026-09-25), so a lesson is not read by one voice
    throughout. The first narrator is the course's default teacher, whose cards
    carry no role; a card spoken by a named speaker or by exchange turns keeps it.
    """
    if not narrators:
        return
    from scripts.content_engine.plan import compose_card  # local import avoids a cycle

    turn = 0
    for spec in cards:
        card = compose_card(spec)
        neutral = [field for field, audio, turns in (("audio_speaker", "audio_text", "audio_turns"),
                                                     ("answer_audio_speaker", "answer_audio_text", "answer_audio_turns"))
                   if card.get(audio) and not card.get(turns) and not card.get(field)]
        if not neutral:
            continue
        voice = narrators[turn % len(narrators)]
        turn += 1
        if voice != "teacher":
            spec.update({field: voice for field in neutral})


def _use_voice(item: dict) -> dict:
    """A Use card plays the finished sentence as its prompt and its answer, in one voice."""
    if not item.get("speaker"):
        return {}
    return {"audio_speaker": item["speaker"], "answer_audio_speaker": item["speaker"]}


def propose_lesson(brief: dict, standards: dict, rejected_pairs=frozenset()) -> tuple[dict, list[dict]]:
    """Return a draft plan and the answer banks a person must review.

    `rejected_pairs` holds (answer, wrong option) pairs that must not be proposed,
    for example because the app's mistake hints cannot explain the contrast.
    """
    rejected = frozenset(rejected_pairs)
    captions = brief.get("captions", True)  # Units 2-7 show caption-free pictures
    items = [{**item, "_order": index} for index, item in enumerate(brief["items"])]
    pool = items + [{**item, "_order": len(items) + index} for index, item in enumerate(brief.get("pool", []))]
    for item in items:
        for field in ("text", "es", "image", "kind"):
            if not item.get(field):
                raise BriefError(f"Item {item.get('text', item['_order'])!r} needs {field!r}.")
        if item.get("image_choices") is False and item.get("text_choices") is False:
            raise BriefError(f"Item {item['text']!r} must be offered as pictures or as text.")
        if item.get("question") and not item.get("question_es"):
            raise BriefError(f"Item {item['text']!r} needs the Spanish of its question.")
        for turn in item.get("turns") or []:
            if not all(turn.get(field) for field in ("text", "speaker", "image")):
                raise BriefError(f"Each turn of {item['text']!r} needs its text, speaker and image.")
        if item.get("turns") and " ".join(turn["text"] for turn in item["turns"]) != item["text"]:
            raise BriefError(f"The turns of {item['text']!r} must say exactly its text.")
    layout = {**DEFAULT_LAYOUT, **brief.get("layout", {})}
    taught = [item for item in items if item.get("learn", True) is not False]
    if len(taught) < 2:
        # The app introduces contextual help on the second card when both opening cards are Learn.
        raise BriefError("A lesson needs at least two new items to introduce on Learn cards.")
    total = len(taught) + sum(layout.values())
    bounds = standards["standard_lesson_cards"]
    if not bounds["min"] <= total <= bounds["max"]:
        raise BriefError(f"{len(taught)} Learn items make {total} cards; standard lessons need {bounds['min']}-{bounds['max']}.")
    instructions = standards["instructions"]
    needs_larger_card = unpostered_action_images()

    def option_count(item: dict, image: bool, early: bool) -> int:
        largest = MAX_IMAGE_OPTIONS if grid_safe(item) else GRID_UNSAFE_IMAGE_OPTIONS
        if not early:
            return largest if image else MAX_TEXT_OPTIONS
        if image and Path(item["image"]).name in needs_larger_card:
            return largest
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
    for index, item in enumerate(taught):
        practised(item)
        cards.append(_voice({"recipe": "teach", "slide_id": f"L{index + 1}", "stage": "Learn",
                             "options": [_option(item, image=True, suffix="learn")],
                             "spanish_translation": item["es"], "pedagogy_note": note("Learn", item)}, item))
    # Each section gives its cards to the least-practised new words, in story order.
    # Recognize alternates picture choices and sentence choices; two options come before four.
    # A `"choices": false` item (a question such as "Which one?") has no wrong option of
    # its own; it is heard as the prompt of its reply cards and practised in Speak.
    choosable = [item for item in items if item.get("choices", True) is not False]
    for index, item in enumerate(pick(choosable, layout["Recognize"])):
        practised(item)
        # `"image_choices": false`: its pictures differ in more than the tested word
        # (a red bus against a blue bike), so it is only offered as text choices.
        # `"text_choices": false`: its word reads as another form in text (the noun
        # "cook" reads as the verb), so it is only offered as pictures.
        image = (index % 2 == 0 or item.get("text_choices", True) is False) and item.get("image_choices", True) is not False
        count = option_count(item, image, early=index < layout["Recognize"] // 2)
        spec, bank = _choice(f"R{index + 1}", "Recognize", item, pool, count, image=image,
                             instructions=instructions, rejected=rejected, captions=captions)
        cards.append(spec)
        banks.append(bank)
    for index, item in enumerate(pick(choosable, layout["Listen"])):
        practised(item)
        image = (index % 3 != 2 or item.get("text_choices", True) is False) and item.get("image_choices", True) is not False
        count = option_count(item, image, early=index < layout["Listen"] // 2)
        spec, bank = _choice(f"A{index + 1}", "Listen", item, pool, count, image=image,
                             instructions=instructions, rejected=rejected, captions=captions)
        cards.append(spec)
        banks.append(bank)
    for index, item in enumerate(pick(sentences, layout["Speak"])):
        practised(item)
        cards.append(_voice({"recipe": "speak", "slide_id": f"S{index + 1}", "stage": "Speak",
                             "options": [_option(item, image=True, suffix="speak")],
                             "spanish_translation": item["es"], "pedagogy_note": note("Speak", item)}, item))
    # Completa progression: guided completion first, whole-sentence construction in the last four.
    # Use works with whole sentences (three words or more) and keeps story order.
    # An exchange (`turns`) has no single voice to build, and `"use": false` opts an item out.
    buildable = [item for item in sentences if not item.get("turns") and item.get("use", True) is not False]
    use_pool = [item for item in buildable if len(words(item["text"])) >= 3] or buildable
    for index, item in enumerate(pick(use_pool, layout["Use"])):
        practised(item)
        build = index >= layout["Use"] - CONSTRUCTIONS or len(words(item["text"])) < 3
        cards.append((_construction if build else _completion)(f"U{index + 1}", item))

    narrate(cards, brief.get("narrators"))
    # Each section follows the story in order; number its beats like every standard lesson.
    beats: dict[str, int] = {}
    for card in cards:
        beats[card["stage"]] = beats.get(card["stage"], 0) + 1
        card["pedagogy_note"] = f"Story beat {beats[card['stage']]:02d}: {_item_text(card)}"
    lesson = {key: value for key, value in brief["lesson"].items()}
    lesson.setdefault("vocabulary", [])
    # Items marked `builds_on` grow earlier language, and a practice-only item is a known
    # frame carrying new words; their cards are the purposeful review.
    growth = {item["text"] for item in items if item.get("builds_on") or item.get("learn", True) is False}
    if growth:
        lesson["purposeful_review_slides"] = [card["slide_id"] for card in cards if _item_text(card) in growth]
    plan = {"plan_version": PLAN_VERSION, "draft": True, "lesson": lesson, "cards": cards,
            "source": {"path": brief["target"], "sha256": brief.get("replaces_sha256")}}
    return plan, banks


def _item_text(spec: dict) -> str | None:
    if spec["recipe"] == "complete":
        return spec.get("answer_audio_text")
    options = spec.get("options") or []
    label = options[spec.get("answer", 0)].get("label") if options else None
    # Caption-free picture choices carry the answer in their prompt or spoken cue.
    return label or spec.get("audio_text") or spec.get("prompt") or None


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


# Extra practice appended to an existing lesson: Recognize and Listen alternate
# picture and sentence choices; Speak repeats a sentence; Use builds one whole.
EXTENSION = {"Recognize": 2, "Listen": 2, "Speak": 1, "Use": 1}


def lesson_items(lesson: dict) -> list[dict]:
    """The items a lesson teaches, read from its Learn cards."""
    items = []
    for card in lesson.get("cards") or []:
        if card.get("stage") != "Learn" or len(card.get("options") or []) != 1:
            continue
        option = card["options"][0]
        text = option.get("label") or card.get("prompt")
        if text and option.get("image_url") and text not in {item["text"] for item in items}:
            items.append({"text": text, "es": card.get("spanish_translation") or "", "image": option["image_url"],
                          "kind": form({"text": text}), "_order": len(items)})
    return items


def extend_lesson(lesson: dict, standards: dict, additions: dict | None = None, avoid: dict | None = None,
                  check=unexplained_mistakes, attempts: int = 8) -> tuple[dict, list[dict]]:
    """Append extra practice to an existing lesson without changing any existing card.

    The new cards reuse the lesson's own items and style (captions, slide-id
    prefixes, image paths), favour the least-practised new words, and must pass
    the same answer-bank and mistake-hint checks as a proposed lesson. `avoid`
    maps an item's text to wrong options that are also true of its picture.
    """
    from scripts.content_engine.plan import compose_lesson, import_lesson
    from scripts.content_engine.practice import card_evidence

    additions = additions or EXTENSION
    items = lesson_items(lesson)
    for item in items:
        item["avoid"] = list((avoid or {}).get(item["text"], []))
    cards = lesson["cards"]
    captions = not any(option.get("image_url") and option.get("label") is None
                       for card in cards if card.get("stage") in ("Recognize", "Listen")
                       for option in card["options"])
    vocabulary = [term.lower() for term in lesson.get("vocabulary", [])]
    pattern = {term: re.compile(r"(?<![a-z])" + re.escape(term.rstrip(".?!").replace("...", " ").strip())
                                + r"(?![a-z])") for term in vocabulary}

    def exposures(term: str, extra: list[dict]) -> int:
        return sum(bool(pattern[term].search(card_evidence(card))) for card in [*cards, *extra])

    def prefix(stage: str) -> tuple[str, int]:
        ids = [card["slide_id"] for card in cards if card.get("stage") == stage]
        letters = re.match(r"[A-Z]+", ids[-1]).group(0) if ids else stage[0]
        return letters, max((int(re.sub(r"[^0-9]", "", sid) or 0) for sid in ids), default=0)

    rejected: set[tuple[str, str]] = set()
    for _ in range(attempts):
        new_cards: dict[str, list[dict]] = {}
        banks, composed_extra = [], []
        used: set[tuple[str, str]] = set()
        for stage, count in additions.items():
            letters, last = prefix(stage)
            if stage in ("Recognize", "Listen"):
                eligible = items
            else:
                eligible = [item for item in items if 3 <= len(words(item["text"])) <= 8] or items
            for offset in range(count):
                def need(item):
                    terms = [term for term in vocabulary if pattern[term].search(item["text"].lower())]
                    counts = [exposures(term, composed_extra) for term in terms]
                    return ((stage, item["text"]) in used, min(counts) if counts else 99, item["_order"])
                slide = f"{letters}{last + offset + 1}"
                if stage in ("Recognize", "Listen"):
                    image = offset % 2 == 0
                    # The least-practised item that has a fair wrong option gets the card.
                    for item in sorted(eligible, key=need):
                        try:
                            spec, bank = _choice(slide, stage, item, items,
                                                 MAX_IMAGE_OPTIONS if image else MAX_TEXT_OPTIONS, image=image,
                                                 instructions=standards["instructions"],
                                                 rejected=frozenset(rejected), captions=captions)
                            break
                        except BriefError:
                            continue
                    else:
                        raise BriefError(f"No item in {lesson.get('id')} has a fair wrong option for {slide}.")
                    used.add((stage, item["text"]))
                    banks.append(bank)
                elif stage == "Speak":
                    item = min(eligible, key=need)
                    used.add((stage, item["text"]))
                    spec = {"recipe": "speak", "slide_id": slide, "stage": "Speak",
                            "options": [_option(item, image=True, suffix="speak")],
                            "spanish_translation": item["es"]}
                else:
                    item = min(eligible, key=need)
                    used.add((stage, item["text"]))
                    spec = _construction(slide, item)
                spec["pedagogy_note"] = f"Extra practice: {item['text']}"
                new_cards.setdefault(stage, []).append(spec)
                composed_extra.append(compose_lesson({"plan_version": 1, "lesson": {}, "cards": [spec]})["cards"][0])
        plan = import_lesson(lesson)
        merged = []
        for index, spec in enumerate(plan["cards"]):
            merged.append(spec)
            following = plan["cards"][index + 1].get("stage") if index + 1 < len(plan["cards"]) else None
            if following != spec.get("stage"):
                merged.extend(new_cards.pop(spec.get("stage"), []))
        plan["cards"] = merged
        plan["lesson"]["content_revision"] = int(plan["lesson"].get("content_revision") or 1) + 1
        if "content_revision" not in lesson:
            plan.setdefault("field_order", [*lesson.keys()])
            plan["field_order"] = [key for key in plan["field_order"] if key != "cards"] + ["content_revision", "cards"]
        extended = compose_lesson(plan)
        found = check(extended)
        if found is None:
            raise BriefError("Mistake hints could not be checked; install the mobile dependencies (npm ci).")
        new_texts = {text for bank in banks for text in [bank["correct"], *bank["wrong"]]}
        found = {pair for pair in found if pair[0] in new_texts and pair[1] in new_texts} - rejected
        if not found:
            return extended, banks
        rejected |= found
    raise BriefError(f"Could not find explainable wrong options after {attempts} attempts: {sorted(rejected)}")
