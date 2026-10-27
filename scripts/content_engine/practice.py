"""Practice and pacing checks for the approved 2026-09-23 content standards.

Evidence is the English a learner must hear, read or produce on a card:
prompts, audio, audio turns, mission cues and the correct answers. Every
visible option also counts toward the untaught-language check, because a
distractor may not use language the course has not introduced.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from scripts.content_engine.catalog import CatalogLesson, load_catalog, load_standards

STAGES = ("Learn", "Recognize", "Listen", "Speak", "Use")
WORD = re.compile(r"[a-z]+(?:'[a-z]+)?")
SIBILANT_ENDINGS = ("ses", "xes", "zes", "ches", "shes")


@dataclass(frozen=True)
class Finding:
    rule: str
    lesson: str
    item: str
    detail: str

    @property
    def key(self) -> str:
        return f"{self.rule}|{self.lesson}|{self.item}"


def card_evidence(card: dict) -> str:
    """English the learner must process on this card to succeed."""
    correct = {card.get("correct_option_id"), *(card.get("correct_option_ids") or [])}
    parts = [card.get("prompt"), card.get("audio_text"), card.get("answer_audio_text")]
    parts += [option.get("label") for option in card.get("options") or [] if option.get("id") in correct]
    parts += [turn.get("text") for turn in card.get("audio_turns") or []]
    parts += [turn.get("text") for turn in card.get("answer_audio_turns") or []]
    for cue in (card.get("mission_game") or {}).get("cues") or []:
        parts += [cue.get("text"), cue.get("answer_text")]
    return " ".join(str(part) for part in parts if part).lower()


def card_language(card: dict, instruction_phrases: tuple[str, ...] = ()) -> str:
    """Every English string shown or played on the card, including distractors.

    Fixed English task instructions such as "Listen and choose." are interface
    copy, not lesson language, so they are left out.
    """
    options = " ".join(str(option.get("label") or "") for option in card.get("options") or [])
    text = f"{card_evidence(card)} {options.lower()}"
    for phrase in instruction_phrases:
        text = text.replace(phrase.lower(), " ")
    return text


POSSESSIVE = "'s"


def term_pattern(term: str) -> re.Pattern | None:
    text = term.lower().replace("...", " ").strip().rstrip(".?!").strip()
    if not text:
        return None
    # A suffix such as the possessive 's attaches to the word before it.
    before = "" if text.startswith("'") else r"(?<![a-z])"
    return re.compile(before + re.escape(text) + r"(?![a-z])")


def term_words(term: str) -> set[str]:
    """The words a declared term makes known; the possessive 's is known as a suffix."""
    found = set(WORD.findall(term.lower()))
    return found | {POSSESSIVE} if term.strip().lower() == POSSESSIVE else found


def is_known(word: str, known: set[str]) -> bool:
    if word in known:
        return True
    # A possessive (Ana's, the boy's) is known once 's is taught and its owner is known.
    if word.endswith(POSSESSIVE) and POSSESSIVE in known:
        return is_known(word[:-2], known)
    # Regular plurals of taught nouns; third-person verb forms stay visible
    # because they are a grammar target, not an inflection allowance.
    if word.endswith("ies") and word[:-3] + "y" in known:
        return True
    if word.endswith(SIBILANT_ENDINGS) and word[:-2] in known:
        return True
    return word.endswith("s") and word[:-1] in known


def learn_context(cards: list[dict], pairs: list[dict], vocabulary: list[str], known: set[str]) -> tuple[set[str], list[str]]:
    """Allow known language only in exact, adjacent introductions of a new question.

    Authoring metadata binds both lines and their order. The response may use
    only earlier language; an unreviewed edit cannot inherit the allowance.
    This metadata does not change client playback or add a lesson-specific rule.
    """
    allowed, errors = set(), []
    positions = {card.get("slide_id"): index for index, card in enumerate(cards)}
    for pair in pairs:
        question_id, answer_id = pair.get("question_slide_id"), pair.get("answer_slide_id")
        target = pair.get("target")
        qi, ai = positions.get(question_id), positions.get(answer_id)
        if qi is None or ai != qi + 1 or target not in vocabulary:
            errors.append(f"{question_id}/{answer_id}: needs adjacent cards and a declared new target")
            continue
        question, answer = cards[qi], cards[ai]
        pattern = term_pattern(target)
        if (question.get("stage") != "Learn" or answer.get("stage") != "Learn"
                or question.get("prompt") != pair.get("question")
                or answer.get("prompt") != pair.get("answer")
                or not str(pair.get("question", "")).endswith("?")
                or not pattern or not pattern.search(card_evidence(question))
                or {question_id, answer_id} & allowed):
            errors.append(f"{question_id}/{answer_id}: stale or overlapping question/answer context")
            continue
        question_known = known | term_words(target)
        if (any(not is_known(word, question_known) for word in WORD.findall(card_language(question)))
                or any(not is_known(word, known) for word in WORD.findall(card_language(answer)))):
            errors.append(f"{question_id}/{answer_id}: context uses language not taught earlier")
            continue
        allowed.update((question_id, answer_id))
    return allowed, errors



def is_contrast_pair(lines: list[str]) -> bool:
    """Two statements that differ only in the new form, e.g. I leave / Luis leaves."""
    if len(lines) != 2 or any(line.strip().endswith("?") for line in lines):
        return False
    first, second = (set(WORD.findall(line.lower())) for line in lines)
    return bool(first) and len(first - second) <= 2 and len(second - first) <= 2


def is_exchange(lines: list[str]) -> bool:
    """An opening question or proposal followed by its reply."""
    return (len(lines) == 2 and not lines[1].strip().endswith("?")
            and (lines[0].strip().endswith("?") or lines[0].strip().startswith("Let's")))


def learn_context_groups(cards: list[dict], groups: list[dict], vocabulary: list[str], known: set[str], anchors: set[str],
                         kinds: tuple[str, ...] = ("sequence", "exchange")) -> tuple[set[str], list[str]]:
    """Validate exact introductions of new sequence markers or coupled exchanges.

    Each group names adjacent Learn models, exact English and its declared
    targets. A sequence may explicitly bind already-taught support targets to
    establish a contrast with its new targets. Every model must contain a new
    anchor or an exact declared support target and may retrieve only earlier
    language. Stale lines, unknown surrounding words and overlapping bindings
    fail closed. A course may also allow a contrast pair: one model of two
    statements differing only in the new form. This does not permit arbitrary
    known-language Learn cards.
    """
    allowed, errors = set(), []
    positions = {card.get("slide_id"): index for index, card in enumerate(cards)}
    for gi, group in enumerate(groups):
        models, targets = group.get("models") or [], group.get("targets") or []
        support = group.get("support_targets") or []
        ids = [model.get("slide_id") for model in models]
        indices = [positions.get(slide) for slide in ids]
        if (group.get("kind") not in kinds or len(models) < 1
                or not targets or not set(targets).issubset(vocabulary) or not set(targets) & anchors
                or len(ids) != len(set(ids)) or set(ids) & allowed
                or any(index is None for index in indices)
                or indices != list(range(indices[0], indices[0] + len(indices)))):
            errors.append(f"group {gi}: requires adjacent unique models and declared new targets")
            continue
        if support and (group.get("kind") != "sequence" or len(support) != len(set(support))
                        or set(support) & set(vocabulary)
                        or any(not term_words(target) or
                               any(not is_known(word, known) for word in term_words(target))
                               for target in support)):
            errors.append(f"group {gi}: support targets must be distinct earlier language in a sequence")
            continue
        group_known = known | {word for target in targets for word in term_words(target)}
        patterns = [term_pattern(target) for target in targets + support]
        anchor_patterns = [term_pattern(target) for target in targets if target in anchors]
        anchor_patterns += [term_pattern(target) for target in support]
        bound = [cards[index] for index in indices]
        def exact_model(card, model):
            lines = [card.get(key) for key in ("prompt", "audio_text", "answer_audio_text")]
            lines += [option.get("label") for option in card.get("options") or []]
            turns = [turn.get("text") for field in ("audio_turns", "answer_audio_turns")
                     for turn in card.get(field) or []]
            if "turns" in model:
                # One contextual model can contain an ordered exchange. Bind
                # every spoken line, rather than treating either reply as a
                # free-standing allowance for known-language Learn cards.
                expected = model["turns"]
                if (not expected or turns != expected
                        or " ".join(expected) != model.get("text")):
                    return False
            else:
                lines += turns
            return all(line == model.get("text") for line in lines if line)

        if any(not exact_model(card, model) or card.get("stage") != "Learn" or card.get("prompt") != model.get("text")
               or card.get("audio_text") != model.get("text")
               or any(not is_known(word, group_known) for word in WORD.findall(card_language(card)))
               or not any(pattern and pattern.search(card_evidence(card)) for pattern in anchor_patterns)
               for card, model in zip(bound, models)):
            errors.append(f"group {gi}: stale model, missing target or untaught context")
            continue
        if any(not pattern or not any(pattern.search(card_evidence(card)) for card in bound)
               for pattern in patterns):
            errors.append(f"group {gi}: each declared target needs a real model")
            continue
        exchange_lines = (models[0].get("turns", []) if len(models) == 1
                          else [model["text"] for model in models])
        if group.get("kind") == "exchange" and (len(exchange_lines) != 2 or
                not exchange_lines[0].endswith("?") or exchange_lines[1].endswith("?")):
            errors.append(f"group {gi}: question must immediately precede its reply")
            continue
        if group.get("kind") == "contrast" and (len(models) != 1 or not is_contrast_pair(exchange_lines)):
            errors.append(f"group {gi}: a contrast is one card with two statements that differ only in the new form")
            continue
        allowed.update(ids)
    return allowed, errors


def prior_knowledge(root: Path, standards: dict) -> set[str]:
    """Words a course may assume from the courses its learners have completed."""
    known: set[str] = set()
    for course in standards.get("prior_courses", ()):
        prior = load_standards(root, course)
        known |= set(prior["instruction_words"]) | set(prior["proper_names"])
        for lesson in load_catalog(root, prior):
            for item in (lesson.data.get("vocabulary") or []) + (lesson.data.get("review_vocabulary") or []):
                known |= term_words(str(item))
    return known


def card_lines(card: dict) -> list[str]:
    """The ordered English lines a card models: its spoken turns, else its prompt."""
    turns = [str(turn.get("text")) for turn in card.get("audio_turns") or [] if turn.get("text")]
    return turns or ([str(card["prompt"])] if card.get("prompt") else [])


def format_findings(lesson: CatalogLesson, cards: list[dict], standards: dict) -> list[Finding]:
    """Card-format standards that a course opts into through configuration.

    A1 sets none of these keys, so its results are unchanged. Each check reads
    only canonical card fields; picture meaning still needs human review.
    """
    findings: list[Finding] = []
    number = lesson.number
    by_stage = {stage: [card for card in cards if card.get("stage") == stage] for stage in STAGES}

    for stage, bounds in standards.get("stage_cards", {}).get(lesson.role, {}).items():
        count = len(by_stage.get(stage, []))
        low, high = bounds.get("min"), bounds.get("max")
        if (low is not None and count < low) or (high is not None and count > high):
            wanted = f"{low if low is not None else 0}-{high}" if high is not None else f"at least {low}"
            findings.append(Finding("stage-balance", number, stage, f"{count} cards; needs {wanted}"))

    banks = [card for card in by_stage["Recognize"] + by_stage["Listen"] if len(card.get("options") or []) > 1]
    if "min_cards_per_recognize_direction" in standards:
        to_photo = sum(1 for card in by_stage["Recognize"] if any(o.get("image_url") for o in card.get("options") or []))
        to_phrase = len(by_stage["Recognize"]) - to_photo
        for direction, count in (("phrase->photo", to_photo), ("photo->phrase", to_phrase)):
            if count < standards["min_cards_per_recognize_direction"]:
                findings.append(Finding("recognize-direction", number, direction,
                                        f"{count} cards; needs {standards['min_cards_per_recognize_direction']}"))
    if "min_large_bank_share" in standards and banks:
        large = sum(1 for card in banks if len(card["options"]) >= 3)
        if large / len(banks) < standards["min_large_bank_share"]:
            findings.append(Finding("option-size", number, "lesson",
                                    f"{large} of {len(banks)} choice cards have 3-4 options; needs "
                                    f"{standards['min_large_bank_share']:.0%}"))
    if "min_photo_listen_share" in standards and by_stage["Listen"]:
        photo = sum(1 for card in by_stage["Listen"]
                    if card.get("options") and all(o.get("image_url") for o in card["options"]))
        if photo / len(by_stage["Listen"]) < standards["min_photo_listen_share"]:
            findings.append(Finding("photo-listen", number, "lesson",
                                    f"{photo} of {len(by_stage['Listen'])} Listen cards are photo choices; needs "
                                    f"{standards['min_photo_listen_share']:.0%}"))
    if standards.get("distinct_option_images"):
        for card in banks:
            images = [o.get("image_url") for o in card["options"] if o.get("image_url")]
            if len(images) != len(set(images)):
                findings.append(Finding("duplicate-option-image", number, str(card.get("slide_id")),
                                        "one set of choices shows the same photograph twice"))

    if "learn_shapes" in standards:
        vocabulary = [str(item) for item in lesson.data.get("vocabulary") or []]
        connectors = {str(term).lower() for term in standards.get("learn_connector_targets", ())}
        lesson_connectors = [term_pattern(item) for item in vocabulary if item.lower() in connectors]
        shapes = set(standards["learn_shapes"])
        for card in by_stage["Learn"]:
            lines = card_lines(card)
            slide = str(card.get("slide_id"))
            if len(lines) > 2 or (len(lines) == 2 and not (
                    ("exchange" in shapes and is_exchange(lines))
                    or ("contrast" in shapes and is_contrast_pair(lines)))):
                findings.append(Finding("learn-shape", number, slide,
                                        f"{len(lines)} lines; a Learn card is one model, an exchange or a contrast pair"))
                continue
            for line in lines:
                connector = any(pattern and pattern.search(line.lower()) for pattern in lesson_connectors)
                limit = standards["learn_connector_max_words"] if connector else standards["learn_max_words"]
                if len(WORD.findall(line.lower())) > limit:
                    findings.append(Finding("learn-length", number, slide, f"{line!r} exceeds {limit} words"))

    if "max_two_speaker_speak_cards" in standards:
        mixed = [card for card in by_stage["Speak"]
                 if len({turn.get("speaker_role") for turn in card.get("audio_turns") or []}) > 1]
        if len(mixed) > standards["max_two_speaker_speak_cards"]:
            findings.append(Finding("speak-speakers", number, "lesson",
                                    f"{len(mixed)} Speak cards voice two speakers; at most "
                                    f"{standards['max_two_speaker_speak_cards']}"))
    if "speak_max_words" in standards:
        for card in by_stage["Speak"]:
            words = len(WORD.findall(" ".join(card_lines(card)).lower()))
            if words > standards["speak_max_words"]:
                findings.append(Finding("speak-length", number, str(card.get("slide_id")),
                                        f"{words} words; at most {standards['speak_max_words']}"))

    if lesson.data.get("id") in standards.get("decision_goal_lessons", ()):
        replies = sum(1 for card in cards if card.get("reply_image_timing") == "after-prompt")
        if replies < standards.get("min_reply_selection_cards", 0):
            findings.append(Finding("decision-practice", number, "lesson",
                                    f"{replies} reply-selection cards; the lesson goal needs "
                                    f"{standards['min_reply_selection_cards']}"))
    return findings

def audit(catalog: list[CatalogLesson], standards: dict, prior_known: set[str] = frozenset()) -> list[Finding]:
    findings: list[Finding] = []
    final_units = sorted({lesson.unit for lesson in catalog})[-standards["later_reuse_exempt_final_units"]:]
    known = set(standards["instruction_words"]) | set(standards["proper_names"]) | set(prior_known)
    # The review is the last non-mission lesson of its unit; any other lesson
    # must declare its own new language.
    reviews = {}
    for lesson in catalog:
        if lesson.role != "mission":
            reviews[lesson.unit] = lesson.number

    for index, lesson in enumerate(catalog):
        cards = lesson.data.get("cards") or []
        if lesson.role != "mission":
            findings += format_findings(lesson, cards, standards)
        minimum = standards.get("min_new_items_per_lesson")
        if (minimum and lesson.role != "mission" and lesson.number != reviews[lesson.unit]
                and len(lesson.data.get("vocabulary") or []) < minimum):
            findings.append(Finding("new-item-minimum", lesson.number, "lesson",
                                    f"{len(lesson.data.get('vocabulary') or [])} new items; a teaching lesson needs {minimum}"))
        # Course-configured action labels are vocabulary metadata, not complete
        # teaching utterances. A construction's individual tiles remain valid.
        bare_verbs = {term.lower().strip(" .?!") for term in standards.get("verbs_require_subject", [])}
        for card in cards:
            lines = [card.get(field) for field in ("prompt", "audio_text", "answer_audio_text")]
            lines += [turn.get("text") for field in ("audio_turns", "answer_audio_turns") for turn in card.get(field) or []]
            if card.get("interaction_type") not in ("complete2", "complete-sentence"):
                lines += [option.get("label") for option in card.get("options") or []]
            isolated = sorted({str(line).lower().strip(" .?!") for line in lines if line} & bare_verbs)
            for term in isolated:
                findings.append(Finding("verb-context", lesson.number, f"{card.get('slide_id')}:{term}",
                                        "Teach or assess this verb in a complete subject–verb context, not as an isolated action label."))
        limits = {"standard": standards["standard_lesson_cards"], "review": standards["review_lesson_cards"]}
        bounds = standards.get("approved_lesson_card_limits", {}).get(lesson.data.get("id"), limits.get(lesson.role))
        if bounds and not bounds["min"] <= len(cards) <= bounds["max"]:
            findings.append(Finding("lesson-length", lesson.number, lesson.role,
                                    f"{len(cards)} cards; this {lesson.role} lesson needs {bounds['min']}-{bounds['max']}"))

        vocabulary = [str(item) for item in lesson.data.get("vocabulary") or []]
        approved_budget = standards.get("approved_lesson_new_item_limits", {}).get(lesson.data.get("id"))
        item_limit = approved_budget["max"] if approved_budget else standards["max_new_items_per_lesson"]
        if len(vocabulary) > item_limit:
            findings.append(Finding("new-item-budget", lesson.number, "lesson",
                                    f"{len(vocabulary)} new items; the limit is {item_limit}"))

        for item in vocabulary:
            pattern = term_pattern(item)
            if pattern is None:
                continue
            stages = Counter(card.get("stage") for card in cards if pattern.search(card_evidence(card)))
            counted = standards.get("exposure_stages", STAGES)
            exposures = sum(stages[stage] for stage in counted)
            if exposures < standards["min_exposures_per_new_item"]:
                findings.append(Finding("exposures", lesson.number, item,
                                        f"{exposures} exposures; needs {standards['min_exposures_per_new_item']}"))
            missing = [stage for stage in standards.get("required_practice_stages", ()) if not stages[stage]]
            if missing:
                findings.append(Finding("practice-stages", lesson.number, item,
                                        f"never practised in {'+'.join(missing)}"))
            recognition = stages["Recognize"] + stages["Listen"]
            if recognition < standards.get("min_recognize_or_listen_exposures_per_new_item", 0):
                findings.append(Finding("recognition-practice", lesson.number, item,
                                        f"{recognition} Recognize/Listen exposures; needs "
                                        f"{standards['min_recognize_or_listen_exposures_per_new_item']}"))
            used = [stage for stage in STAGES if stages[stage]]
            required = standards["new_item_needs_one_of_stages"]
            if len(used) < standards["min_stages_per_new_item"] or not set(required) & set(used):
                findings.append(Finding("stage-variety", lesson.number, item,
                                        f"practiced in {'+'.join(used) or 'no stage'}; needs "
                                        f"{standards['min_stages_per_new_item']} stages including {' or '.join(required)}"))
            if lesson.unit not in final_units:
                later = sum(1 for other in catalog[index + 1:]
                            if any(pattern.search(card_evidence(card)) for card in other.data.get("cards") or []))
                if later < standards["min_later_lessons_per_new_item"]:
                    findings.append(Finding("later-reuse", lesson.number, item,
                                            f"returns in {later} later lessons; needs "
                                            f"{standards['min_later_lessons_per_new_item']}"))

        phrases = tuple(standards.get("instruction_phrases", ()))
        # Learn holds only this lesson's new vocabulary (approved 2026-09-24): a
        # standard lesson's Learn card never re-teaches a known frame such as "It is".
        if lesson.role == "standard":
            contextual, context_errors = learn_context(cards, lesson.data.get("learn_context_pairs", []), vocabulary, known)
            kinds = ("sequence", "exchange") + (("contrast",) if "contrast" in standards.get("learn_shapes", ()) else ())
            grouped, group_errors = learn_context_groups(cards, lesson.data.get("learn_context_groups", []), vocabulary, known,
                                                         set(standards.get("learn_context_anchor_targets", [])), kinds)
            if contextual & grouped:
                group_errors.append("context groups overlap an existing question/answer pair")
            contextual |= grouped
            context_errors += group_errors
            findings.extend(Finding("learn-context", lesson.number, str(index), error)
                            for index, error in enumerate(context_errors))
            allowed = {word for item in vocabulary for word in term_words(item)}
            # A person's name is not language being taught: "My name is Ana." re-teaches nothing.
            allowed |= set(standards.get("learn_frame_words", ())) | set(standards["proper_names"])
            for card in cards:
                if card.get("stage") != "Learn":
                    continue
                if card.get("slide_id") in contextual:
                    continue
                language = card_language(card, phrases)
                card_allowed = set(allowed)
                # A declared new question frame can retrieve an already-taught
                # object, without treating the noun as new vocabulary. Every
                # spoken/visible line must fit the exact configured template.
                for frame, template in standards.get("learn_question_frames", {}).items():
                    if frame not in vocabulary or template.count("{object}") != 1:
                        continue
                    pattern = re.compile(re.escape(template).replace(
                        re.escape("{object}"), r"[a-z]+(?: [a-z]+){0,2}"), re.I)
                    lines = [card.get(key) for key in ("prompt", "audio_text", "answer_audio_text")]
                    lines += [option.get("label") for option in card.get("options") or []]
                    lines += [turn.get("text") for field in ("audio_turns", "answer_audio_turns")
                              for turn in card.get(field) or []]
                    lines = [line for line in lines if line]
                    if lines and all(pattern.fullmatch(line.strip()) for line in lines):
                        card_allowed |= known
                extra = sorted({word for word in WORD.findall(language) if not is_known(word, card_allowed)})
                if extra:
                    label = next((option.get("label") for option in card.get("options") or [] if option.get("label")),
                                 None) or card.get("prompt") or card.get("slide_id")
                    findings.append(Finding("learn-new-only", lesson.number, str(label),
                                            f"Learn card repeats known words: {' '.join(extra)}"))
        for item in vocabulary + [str(item) for item in lesson.data.get("review_vocabulary") or []]:
            known.update(term_words(item))
        untaught = sorted({word for card in cards for word in WORD.findall(card_language(card, phrases))
                           if not is_known(word, known)})
        findings += [Finding("untaught-word", lesson.number, word, "used before any lesson declares it")
                     for word in untaught]
    return findings
