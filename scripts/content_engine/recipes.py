"""Card recipes: the fields a card type can predict from its authored content.

A recipe never stores content. It derives the predictable fields (card type,
prompt, audio, correct answer) from the fields an author writes: identity,
stage, options, pictures and Spanish. Anything a live card does differently
is kept by the lesson plan as an explicit, counted exception.
"""
from __future__ import annotations

LISTEN_PROMPT = "Listen and choose."


def _correct(spec: dict) -> dict:
    return spec["options"][spec.get("answer", 0)]


def _image_options(spec: dict) -> bool:
    return all(option.get("image_url") for option in spec["options"])


def teach(spec: dict) -> dict:
    label = _correct(spec).get("label")
    return {"interaction_type": "teach", "prompt": label, "audio_text": label,
            "answer_audio_text": None, "prompt_image_url": "", "correct_option_id": _correct(spec)["id"]}


def speak(spec: dict) -> dict:
    return {**teach(spec), "interaction_type": "speak"}


def choice(spec: dict) -> dict:
    """Recognize and Listen choices between two to four options."""
    correct = _correct(spec)
    images = _image_options(spec)
    listening = spec["stage"] == "Listen"
    kind = ("a2i" if images else "a2t") if listening else ("t2i" if images else "i2t")
    label = correct.get("label")
    derived = {"interaction_type": f"{kind}{len(spec['options'])}", "correct_option_id": correct["id"],
               "prompt_image_url": ""}
    if listening:
        derived.update(prompt=LISTEN_PROMPT, answer_audio_text=None)
        # Caption-free pictures carry no label, so the spoken cue is authored.
        if label is not None:
            derived["audio_text"] = label
    elif images:
        derived["answer_audio_text"] = None
        # A captioned answer names itself; a caption-free prompt is authored.
        if label is not None:
            derived["prompt"] = label
        derived["audio_text"] = derived.get("prompt", spec.get("prompt"))
    else:
        # The learner sees the picture and picks its sentence; the answer plays after.
        # The prompt stays authored: it is empty or the question being answered.
        derived.update(audio_text=spec.get("prompt"), answer_audio_text=label)
        derived.pop("prompt_image_url")
    return derived


def complete(spec: dict) -> dict:
    """Use-stage completion and construction; the answer sentence is content."""
    return {"correct_option_id": spec["correct_option_ids"][0], "audio_text": spec.get("answer_audio_text")}


def mission(spec: dict) -> dict:
    """Mission beats: the cues and targets in `mission_game` are the authored content."""
    game = spec["mission_game"]
    cues = game.get("cues") or []
    if game.get("kind") == "voice-gate":
        answer = cues[0]["answer_text"] if cues else None
        return {"prompt": answer, "audio_text": answer, "answer_audio_text": None, "prompt_image_url": "",
                "correct_option_id": spec["options"][0]["id"]}
    # A scene game: each cue is spoken in order and answered by tapping its option.
    options, seen = [], set()
    for cue in cues:
        if cue["option_id"] not in seen:
            seen.add(cue["option_id"])
            options.append({"id": cue["option_id"], "image_url": "", "label": cue["answer_text"]})
    scene = spec.get("prompt_image_url", "")
    return {"interaction_type": "mission-game", "options": options,
            "correct_option_id": options[0]["id"] if options else None,
            "correct_option_ids": [option["id"] for option in options],
            "audio_text": " ".join(cue["text"] for cue in cues), "answer_audio_text": None,
            "audio_turns": [{"text": cue["text"], "speaker_role": speaker, "image_url": scene}
                            for cue, speaker in zip(cues, cue_speakers(spec))]}


def cue_speakers(spec: dict) -> list[str]:
    """Who says each cue: the teacher unless the plan names a character."""
    cues = spec["mission_game"].get("cues") or []
    return spec.get("cue_speakers") or ["teacher"] * len(cues)


def verbatim(spec: dict) -> dict:
    return {}


RECIPES = {"teach": teach, "speak": speak, "choice": choice, "complete": complete,
           "mission": mission, "verbatim": verbatim}


def recipe_for(card: dict) -> str:
    options = card.get("options") or []
    if "mission_game" in card:
        return "mission"
    if card.get("stage") == "Learn" and len(options) == 1:
        return "teach"
    if card.get("stage") == "Speak" and len(options) == 1:
        return "speak"
    if card.get("stage") == "Use" and card.get("correct_option_ids"):
        return "complete"
    if card.get("stage") in ("Recognize", "Listen") and 2 <= len(options) <= 4:
        return "choice"
    return "verbatim"
