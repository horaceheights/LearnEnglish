"""Read-only rollout gate. Metadata and distractors cannot stand in for practice.

Run with --check before declaring the Units 2–7 rollout complete. This does not
grant semantic approval: pixel inspection, audio receipts and device QA remain
separate mandatory gates. Existing shortcomings are reported, never baselined away.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "docs/product/a1-unit-parity-contracts.json"


def normalize(text: str) -> str:
    return " ".join(re.findall(r"[a-z]+", text.casefold()))


def successful_language(lesson: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for card in lesson.get("cards", []):
        game = card.get("mission_game")
        if game:
            # The learner completes every bound cue, not the arbitrary first
            # correct_option_id used by the legacy card envelope.
            for cue in game.get("cues", []):
                lines.extend([cue.get("text", ""), cue.get("answer_text", "")])
        else:
            correct = set(card.get("correct_option_ids") or [card.get("correct_option_id")])
            lines.extend(option.get("label", "") for option in card.get("options", [])
                         if option.get("id") in correct)
            lines.append(card.get("audio_text") or card.get("prompt", ""))
            lines.extend(turn.get("text", "") for turn in card.get("audio_turns", []))
    return [normalize(line) for line in lines if line]


def function_coverage(lesson: dict[str, Any], functions: list[dict[str, Any]]) -> dict[str, Any]:
    lines = successful_language(lesson)
    # Do not join adjacent cards: 'That is' on one card and 'a phone' on another
    # is not evidence of a successfully practised 'That is a phone' sentence.
    return {function["id"]: {
        "taught_in": function["taught_in"],
        "missing_patterns": [pattern for pattern in function["patterns"]
                             if not any(re.search(pattern, line) for line in lines)],
    } for function in functions}


def referenced_images(lesson: dict[str, Any]) -> set[str]:
    images: set[str] = set()
    for card in lesson.get("cards", []):
        paths = [card.get("prompt_image_url", "")]
        paths += [option.get("image_url", "") for option in card.get("options", [])]
        paths += [turn.get("image_url", "") for field in ("audio_turns", "answer_audio_turns")
                  for turn in card.get(field, [])]
        images.update(Path(path.split("?", 1)[0].split("#", 1)[0]).name for path in paths if path)
    return images


def review_reuse(review: dict[str, Any], earlier: list[dict[str, Any]], image_root: Path) -> dict[str, list[str]]:
    hashes: dict[str, str] = {}
    def digest(name: str) -> str | None:
        path = image_root / name
        if not path.is_file():
            return None
        if name not in hashes:
            hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        return hashes[name]
    earlier_hashes = {value for lesson in earlier for name in referenced_images(lesson)
                      if (value := digest(name)) is not None}
    names = referenced_images(review)
    return {
        "reused_images": sorted(name for name in names if digest(name) in earlier_hashes),
        "missing_images": sorted(name for name in names if digest(name) is None),
    }


def audit(lessons: list[dict[str, Any]], contracts: dict[str, Any], image_root: Path) -> dict[str, Any]:
    by_number = {str(lesson["sub_lesson_id"]): lesson for lesson in lessons}
    output: dict[str, Any] = {"ready": True, "units": {}}
    for unit, contract in contracts["units"].items():
        mission = by_number.get(f"{unit}.10", {})
        review = by_number.get(f"{unit}.9", {})
        cards = mission.get("cards", [])
        voices = [i for i, card in enumerate(cards) if card.get("mission_game", {}).get("kind") == "voice-gate"]
        listens = [card for card in cards if card.get("mission_game", {}).get("kind") not in (None, "voice-gate")]
        decisions = sum(len(card["mission_game"].get("cues", [])) for card in listens)
        gaps: list[str] = []
        if mission.get("experience_type") != "mission":
            gaps.append("Lesson 10 must use the continuous mission experience.")
        if decisions < contracts["minimum_listening_decisions"]:
            gaps.append(f"Only {decisions} listening decisions; expand meaningful unit coverage.")
        if len(voices) < contracts["minimum_voice_gates"]:
            gaps.append(f"Only {len(voices)} speaking tasks; at least four are required.")
        if voices != list(range(len(cards) - len(voices), len(cards))):
            gaps.append("The final speaking tasks must close the story consecutively.")
        for index in voices:
            card = cards[index]
            turns = card.get("audio_turns", [])
            response = next((option.get("image_url") for option in card.get("options", [])
                             if option["id"] == card.get("correct_option_id")), None)
            if len(turns) != 1 or not turns[0].get("image_url") or turns[0]["image_url"] == response:
                gaps.append(f"{card.get('slide_id')}: needs a distinct question-view and response-view.")
        coverage = function_coverage(mission, contract["functions"])
        missing_functions = [key for key, value in coverage.items() if value["missing_patterns"]]
        if missing_functions:
            gaps.append("Missing successful-path practice: " + ", ".join(missing_functions))
        for function in contract["functions"]:
            if not function.get("requires_introduction"):
                continue
            source = by_number.get(function["taught_in"], {})
            learn = {**source, "cards": [card for card in source.get("cards", []) if card.get("stage") == "Learn"]}
            if function_coverage(learn, [function])[function["id"]]["missing_patterns"]:
                gaps.append(f"Teach {function['id']} explicitly in {function['taught_in']} before assessing it.")
        earlier = [lesson for number, lesson in by_number.items()
                   if tuple(map(int, number.split("."))) < (int(unit), 9)]
        reuse = review_reuse(review, earlier, image_root)
        if not review.get("cards"):
            gaps.append("Lesson 9 review is missing.")
        if reuse["reused_images"]:
            gaps.append(f"Review reuses {len(reuse['reused_images'])} earlier images (exact bytes).")
        if reuse["missing_images"]:
            gaps.append("Review references missing images.")
        own_foundations = [by_number.get(f"{unit}.{n}", {}) for n in range(1, 9)]
        vocabulary = {normalize(word) for lesson in own_foundations for word in lesson.get("vocabulary", []) if word}
        review_lines = successful_language(review)
        retrieved = {word for word in vocabulary if any(re.search(r"\b" + re.escape(word) + r"\b", line) for line in review_lines)}
        fraction = len(retrieved) / len(vocabulary) if vocabulary else 0
        if fraction < contracts["review_vocabulary_fraction"]:
            gaps.append("Review's exact declared-vocabulary retrieval is below 70%; inspect the listed gaps and inflections.")
        output["units"][unit] = {
            "ready": not gaps, "gaps": gaps, "mission_beats": len(cards),
            "listening_decisions": decisions, "voice_gates": len(voices),
            "function_coverage": coverage, "review_media": reuse,
            "review_vocabulary": {"exact_retrieved": len(retrieved), "declared": len(vocabulary),
                                  "unmatched": sorted(vocabulary - retrieved)},
        }
        output["ready"] = output["ready"] and not gaps
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Exit nonzero until the rollout is ready.")
    args = parser.parse_args()
    lessons = [yaml.safe_load(path.read_text(encoding="utf-8-sig"))
               for path in sorted((ROOT / "backend/lessons").glob("unit_*/*.yaml"))]
    result = audit(lessons, json.loads(CONTRACTS.read_text(encoding="utf-8")), ROOT / "Lessons/Lesson1/images")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if args.check and not result["ready"] else 0


if __name__ == "__main__":
    sys.exit(main())
