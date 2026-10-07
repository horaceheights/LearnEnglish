"""The visible image/text contract for standard-lesson Recognize cards."""
from __future__ import annotations

import re


def _words(value: str | None) -> str:
    return " ".join(re.findall(r"[a-z]+(?:'[a-z]+)?", (value or "").lower()))


def recognize_errors(lesson: dict) -> list[str]:
    """Check every card, including banks that happen to contain a context photo.

    Missions use stage names as internal metadata and keep their own contract.
    Audio remains pronunciation support; it cannot be the sole recognition cue.
    """
    if lesson.get("experience_type") == "mission":
        return []
    errors = []
    for card in lesson.get("cards", []):
        if card.get("stage") != "Recognize":
            continue
        where = f"{lesson.get('id', '?')} {card.get('slide_id', '?')}"
        options = card.get("options") or []
        prompt = (card.get("prompt") or "").strip()
        hero = bool(card.get("prompt_image_url"))
        images = [bool(option.get("image_url")) for option in options]
        kind = card.get("interaction_type") or ""
        if len(options) < 2:
            errors.append(f"{where}: Recognize needs at least two visual/text choices.")
        if kind.startswith("a2") or card.get("input_modality") == "audio":
            errors.append(f"{where}: audio-only recognition belongs in Listen, not Recognize.")
        if images and all(images) and not hero:
            if not kind.startswith("t2i") or not prompt or re.match(
                r"^(?:[¡!]?(?:escucha|elige|mira)|listen|choose|select|pick)\b", prompt, re.I
            ):
                errors.append(f"{where}: image choices require a visible English target above them.")
        elif images and not any(images) and hero:
            if not kind.startswith("i2t") or any(not (option.get("label") or "").strip() for option in options):
                errors.append(f"{where}: a prompt image requires written answer choices.")
            correct = next((option for option in options if option.get("id") == card.get("correct_option_id")), {})
            answer = _words(correct.get("label"))
            # The content question may be spoken, but not its answer before selection.
            upfront = [(field, card.get(field)) for field in ("prompt", "audio_text")]
            upfront.extend(("audio_turns", turn.get("text")) for turn in card.get("audio_turns") or [])
            for field, value in upfront:
                target = _words(value)
                if answer and target and f" {answer} " in f" {target} ":
                    errors.append(f"{where}: {field} reveals the image-to-text answer before selection.")
        else:
            errors.append(f"{where}: Recognize must pair visible text with image choices, or one image with text choices.")
    return errors
