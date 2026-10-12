"""Shared runtime/authoring contract for card-grounded tutor context. No provider calls."""
from __future__ import annotations


def build_tutor_context(lesson, card, selected=(), cue_index=None, target_id=None):
    options = {option.id: option.label or "" for option in card.options}
    expected = card.correct_option_ids or [card.correct_option_id]
    if (any(key not in options for key in expected)
            or selected and (len(selected) != len(expected) or len(set(selected)) != len(selected)
                             or any(key not in options for key in selected))):
        raise ValueError("Invalid submitted selection")
    game = getattr(card, "mission_game", None)
    if (cue_index is not None or target_id is not None) and (not game or game.kind == "voice-gate"):
        raise ValueError("Mission focus requires a search activity")
    if target_id is not None and (cue_index is None or selected):
        raise ValueError("A target attempt must name exactly one mission cue")
    submitted_words = [options[key] for key in selected]
    expected_words = [options[key] for key in expected]
    normalize = lambda words: [word.casefold().strip() for word in words]
    correct = normalize(submitted_words) == normalize(expected_words)
    if game and game.validation == "unordered":
        correct = sorted(normalize(submitted_words)) == sorted(normalize(expected_words))
    context = {
        "lesson": lesson.sub_lesson_title, "level": lesson.level,
        "goal": lesson.goal, "vocabulary": lesson.vocabulary,
        "grammar": lesson.grammar_function, "prerequisite": lesson.prerequisite,
        "stage": card.stage, "activity": card.interaction_type,
        "mode": "before_answer" if not selected else "after_correct" if correct else "after_error",
    }
    if game and game.kind != "voice-gate":
        context["task"] = "Listen to the current clue and tap its matching person, group, object or place in the scene. Do not build a sentence."
        # The client reports the authored cue index after its shuffled playback order.
        if cue_index is not None and not 0 <= cue_index < len(game.cues):
            raise ValueError("Unknown mission cue")
        if target_id is not None:
            cue = game.cues[cue_index]
            target = next((item for item in game.targets if item.id == target_id), None)
            if target is None:
                raise ValueError("Unknown scene target")
            context.update({
                "mode": "after_correct" if target.id == cue.target_id else "after_error",
                "heard_model": cue.text, "answer_model": cue.answer_text,
                "submitted_words": [options[key] for key in target.accepted_option_ids],
                "expected_words": [options[cue.option_id]],
            })
            # No other clue, whole-card audio or scene geometry is disclosed.
            return context
    elif card.stage == "Learn":
        context["task"] = "Understand the visible English model; no answer has been submitted."
    elif card.stage == "Speak":
        context["task"] = "Practise saying the visible English model. Tutor dictation does not assess pronunciation."
    elif card.stage == "Listen":
        context["task"] = "Listen again and choose the matching option; the heard target is hidden."
    elif (card.interaction_type or "").startswith("i2t"):
        context["task"] = "Choose the written phrase matching the image. Do not construct a sentence."
    elif (card.interaction_type or "").startswith("t2i"):
        context["task"] = "Choose the image matching the English phrase."
    elif card.stage == "Use":
        context["task"] = "Place whole word tiles into the blank spaces in order."
        context["visible_scaffold"] = card.prompt
    else:
        raise ValueError("Activity needs a shared tutor context policy")
    if selected:
        context.update({"prompt": card.prompt, "heard_model": card.audio_text,
                        "submitted_words": submitted_words, "expected_words": expected_words,
                        "answer_model": card.answer_audio_text,
                        "authored_teaching_note": card.pedagogy_note})
    elif card.stage in ("Learn", "Speak"):
        context["visible_model"] = card.prompt
    # Before submission: no assessment target, translation, media name or answer ID.
    return context


def tutor_contract_errors(lesson):
    """Future authored lessons inherit tutoring without flags or a per-lesson prompt."""
    errors = []
    if not lesson.id.strip() or not lesson.goal.strip() or not lesson.level.strip():
        errors.append("Tutor needs a lesson ID, learning goal and level.")
    seen = set()
    for card in lesson.cards:
        if not card.slide_id or not card.slide_id.strip() or card.slide_id in seen:
            errors.append(f"Tutor needs a unique stable slide ID: {card.slide_id!r}.")
        seen.add(card.slide_id)
        try:
            build_tutor_context(lesson, card)
            build_tutor_context(lesson, card, card.correct_option_ids or [card.correct_option_id])
        except (ValueError, KeyError) as error:
            errors.append(f"{card.slide_id}: {error}")
    return [f"{lesson.id}: {error}" for error in errors]
