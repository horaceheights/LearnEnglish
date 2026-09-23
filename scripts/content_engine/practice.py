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

from scripts.content_engine.catalog import CatalogLesson

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
    for cue in (card.get("mission_game") or {}).get("cues") or []:
        parts += [cue.get("text"), cue.get("answer_text")]
    return " ".join(str(part) for part in parts if part).lower()


def card_language(card: dict) -> str:
    """Every English string shown or played on the card, including distractors."""
    options = " ".join(str(option.get("label") or "") for option in card.get("options") or [])
    return f"{card_evidence(card)} {options.lower()}"


def term_pattern(term: str) -> re.Pattern | None:
    text = term.lower().replace("...", " ").strip().rstrip(".?!").strip()
    if not text:
        return None
    return re.compile(r"(?<![a-z])" + re.escape(text) + r"(?![a-z])")


def is_known(word: str, known: set[str]) -> bool:
    if word in known:
        return True
    # Regular plurals of taught nouns; third-person verb forms stay visible
    # because they are a grammar target, not an inflection allowance.
    if word.endswith("ies") and word[:-3] + "y" in known:
        return True
    if word.endswith(SIBILANT_ENDINGS) and word[:-2] in known:
        return True
    return word.endswith("s") and word[:-1] in known


def audit(catalog: list[CatalogLesson], standards: dict) -> list[Finding]:
    findings: list[Finding] = []
    final_units = sorted({lesson.unit for lesson in catalog})[-standards["later_reuse_exempt_final_units"]:]
    known = set(standards["instruction_words"]) | set(standards["proper_names"])

    for index, lesson in enumerate(catalog):
        cards = lesson.data.get("cards") or []
        limits = {"standard": standards["standard_lesson_cards"], "review": standards["review_lesson_cards"]}
        if lesson.role in limits and not limits[lesson.role]["min"] <= len(cards) <= limits[lesson.role]["max"]:
            bounds = limits[lesson.role]
            findings.append(Finding("lesson-length", lesson.number, lesson.role,
                                    f"{len(cards)} cards; {lesson.role} lessons need {bounds['min']}-{bounds['max']}"))

        vocabulary = [str(item) for item in lesson.data.get("vocabulary") or []]
        if len(vocabulary) > standards["max_new_items_per_lesson"]:
            findings.append(Finding("new-item-budget", lesson.number, "lesson",
                                    f"{len(vocabulary)} new items; the limit is {standards['max_new_items_per_lesson']}"))

        for item in vocabulary:
            pattern = term_pattern(item)
            if pattern is None:
                continue
            stages = Counter(card.get("stage") for card in cards if pattern.search(card_evidence(card)))
            exposures = sum(stages.values())
            if exposures < standards["min_exposures_per_new_item"]:
                findings.append(Finding("exposures", lesson.number, item,
                                        f"{exposures} exposures; needs {standards['min_exposures_per_new_item']}"))
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

        for item in vocabulary + [str(item) for item in lesson.data.get("review_vocabulary") or []]:
            known.update(WORD.findall(item.lower()))
        untaught = sorted({word for card in cards for word in WORD.findall(card_language(card))
                           if not is_known(word, known)})
        findings += [Finding("untaught-word", lesson.number, word, "used before any lesson declares it")
                     for word in untaught]
    return findings
