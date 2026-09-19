"""Author and install the Unit 3 parity rollout: 3.3 addition, 3.9 review, 3.10 mission.

No paid calls. Default is compile-and-validate only. ``--draft`` substitutes
placeholder geometry so the mission contract can be checked before its stills
are measured. ``--write`` requires every still to carry a matching paid receipt
and a hash-bound agent inspection (with measured targets for mission scenes),
then installs byte-identical copies without touching the original files.
Human media approval and device QA remain pending after installation.
"""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.audit_course_media_preservation import BASELINE, PLANS, audit  # noqa: E402
from scripts.parity_pack import (  # noqa: E402
    install_images, paid_attempts, prepare_review_exceptions, register_photoreal, reviewed_assets, stage_images,
    write_json,
)
from scripts.render_course_stills import digest, load_pack, pack_output_directory  # noqa: E402

PACKS = {
    "3.3": ROOT / "docs/product/unit-3-lesson-pack.json",
    "3.9": ROOT / "docs/product/unit-3-review-pack.json",
    "3.10": ROOT / "docs/product/unit-3-mission-pack.json",
}
LESSONS = {
    "3.3": ROOT / "backend/lessons/unit_3/lesson-3-3-am-is-and-are.yaml",
    "3.9": ROOT / "backend/lessons/unit_3/lesson-3-9-unit-3-review.yaml",
    "3.10": ROOT / "backend/lessons/unit_3/lesson-3-10-introduction-mission.yaml",
}
PROOFS = {
    "3.3": ROOT / "docs/qa/unit-3-lesson-media-v1.json",
    "3.9": ROOT / "docs/qa/unit-3-review-media-v1.json",
    "3.10": ROOT / "docs/qa/unit-3-mission-media-v1.json",
}
ARCHIVE = ROOT / "Lessons/Lesson1/images/course-photoreal-sources/unit-3"


def packs() -> dict:
    return {number: load_pack(path) for number, path in PACKS.items()}


def filename(pack: dict, asset_id: str) -> str:
    return next(asset["runtime_filename"] for asset in pack["assets"] if asset["id"] == asset_id)


def interleave(words: list[str]) -> list[str]:
    """Tile bank order that never spells the answer left to right."""
    order = list(range(1, len(words), 2)) + list(range(0, len(words), 2))
    if order == list(range(len(words))):
        order.reverse()
    return order


def text_option(identifier: str, label: str) -> dict:
    return {"id": identifier, "image_url": "", "label": label}


def slug(text: str) -> str:
    return "-".join(word.lower() for word in "".join(c if c.isalnum() or c == " " else " " for c in text).split())


# --------------------------------------------------------------------- 3.3
def compile_33(base: dict, pack: dict) -> dict:
    lesson = copy.deepcopy(base)
    image = lambda asset_id: filename(pack, asset_id)  # noqa: E731
    by_stage: dict[str, list[dict]] = {}
    for card in lesson["cards"]:
        by_stage.setdefault(card["stage"], []).append(card)
    if [len(by_stage[s]) for s in ("Learn", "Recognize", "Listen", "Speak", "Use")] != [6, 8, 6, 6, 8]:
        raise ValueError("3.3 changed independently; reconcile before appending the current-action thread.")
    question, es_question = "What are you doing?", "¿Qué estás haciendo?"
    note = "Current-action thread (late 3.3): "
    by_stage["Learn"].append({
        "slide_id": "L7", "interaction_type": "teach", "prompt": question, "stage": "Learn",
        "correct_option_id": "what-are-you-doing-1",
        "options": [{"id": "what-are-you-doing-1", "image_url": image("reading-question"), "label": question}],
        "audio_text": question, "answer_audio_text": None, "prompt_image_url": "",
        "spanish_translation": es_question, "audio_speaker": "luis",
        "pedagogy_note": note + "introduces doing inside the supported question; answers reuse I am + known actions."})
    by_stage["Recognize"].append({
        "slide_id": "R9", "interaction_type": "i2t2", "prompt": question, "stage": "Recognize",
        "correct_option_id": "i-am-reading-2",
        "options": [text_option("i-am-writing-1", "I am writing."), text_option("i-am-reading-2", "I am reading.")],
        "audio_text": question, "answer_audio_text": "I am reading.", "answer_audio_speaker": "ana",
        "prompt_image_url": image("reading-answer"), "spanish_translation": es_question,
        "pedagogy_note": note + "the answer view shows which action answers the question.",
        "audio_speaker": "luis"})
    by_stage["Listen"].append({
        "slide_id": "N7", "interaction_type": "a2t2", "prompt": "Listen and choose.", "stage": "Listen",
        "correct_option_id": "what-are-you-doing-2",
        "options": [text_option("what-is-your-name-1", "What is your name?"),
                    text_option("what-are-you-doing-2", question)],
        "audio_text": question, "answer_audio_text": None, "prompt_image_url": "",
        "spanish_translation": "Escucha y elige.",
        "pedagogy_note": note + "hear the new question apart from the known name question."})
    exchange = question + " I am writing."
    by_stage["Speak"].append({
        "slide_id": "S7", "interaction_type": "repeat", "prompt": exchange, "stage": "Speak",
        "correct_option_id": "what-are-you-doing-i-am-writing-1",
        "options": [{"id": "what-are-you-doing-i-am-writing-1", "image_url": image("writing-question"), "label": exchange}],
        "audio_text": exchange, "answer_audio_text": None, "prompt_image_url": "",
        "audio_turns": [
            {"text": question, "speaker_role": "ana", "image_url": image("writing-question")},
            {"text": "I am writing.", "speaker_role": "luis", "image_url": image("writing-answer")},
        ],
        "spanish_translation": es_question + " Estoy escribiendo.",
        "pedagogy_note": note + "complete exchange: Ana asks, Luis answers."})
    by_stage["Use"].append({
        "slide_id": "U9", "interaction_type": "complete2", "prompt": "What ___ you ___?", "stage": "Use",
        "correct_option_id": "are", "correct_option_ids": ["are", "doing"],
        "options": [text_option("doing", "doing"), text_option("are", "are")],
        "audio_text": question, "answer_audio_text": question, "prompt_image_url": image("reading-question"),
        "spanish_translation": es_question, "translation": es_question,
        "audio_speaker": "luis", "answer_audio_speaker": "luis",
        "pedagogy_note": note + "guided completion of the question Luis asks."})
    words = ["What", "are", "you", "doing"]
    ids = [f"word-{i + 1}" for i in range(len(words))]
    by_stage["Use"].append({
        "slide_id": "U10", "interaction_type": "complete-sentence", "prompt": "___ ___ ___ ___?", "stage": "Use",
        "correct_option_id": ids[0], "correct_option_ids": ids,
        "options": [text_option(ids[i], words[i]) for i in interleave(words)],
        "audio_text": question, "answer_audio_text": question, "prompt_image_url": image("writing-question"),
        "spanish_translation": es_question, "translation": es_question,
        "audio_speaker": "ana", "answer_audio_speaker": "ana",
        "pedagogy_note": note + "full construction of the question Ana asks."})
    lesson["cards"] = [card for stage in ("Learn", "Recognize", "Listen", "Speak", "Use") for card in by_stage[stage]]
    lesson.update(
        content_revision=1,
        vocabulary=["doing", "What are you doing?"],
        goal="Choose am, is, or are for familiar singular, plural, and speaker pronouns, then ask and answer "
             "What are you doing? with a known action.",
        grammar_function="I am; he/she/it is; you/we/they are. Affirmative only. Late in the lesson, the supported "
                         "current-action exchange What are you doing? / I am + known -ing action, kept distinct from "
                         "the 3.6 occupation question What is your job?",
        speaking_outcome="Repeat six mixed-subject sentences with the correct audible form of be, then say the "
                         "complete What are you doing? / I am writing. exchange.")
    return lesson


# --------------------------------------------------------------------- 3.9
def compile_39(base: dict, pack: dict) -> dict:
    lesson = copy.deepcopy(base)
    image = lambda asset_id: filename(pack, asset_id)  # noqa: E731
    cards: list[dict] = []

    def teach(sid, text, es, asset, speaker=None, note="fresh review station"):
        card = {"slide_id": sid, "interaction_type": "teach", "prompt": text, "stage": "Learn",
                "correct_option_id": slug(text) + "-1",
                "options": [{"id": slug(text) + "-1", "image_url": image(asset), "label": text}],
                "audio_text": text, "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": es, "pedagogy_note": note}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def image_to_text(sid, prompt, answer, es, asset, choices, speaker=None, note="fresh scene, answer frame",
                      asker=None):
        options = [text_option(f"{slug(c)}-{i + 1}", c) for i, c in enumerate(choices)]
        correct = next(o["id"] for o in options if o["label"] == answer)
        card = {"slide_id": sid, "interaction_type": f"i2t{len(options)}", "prompt": prompt, "stage": "Recognize",
                "correct_option_id": correct, "options": options, "audio_text": prompt, "answer_audio_text": answer,
                "prompt_image_url": image(asset), "spanish_translation": es, "pedagogy_note": note}
        if speaker:
            card["answer_audio_speaker"] = speaker
        if asker:
            card["audio_speaker"] = asker
        cards.append(card)

    def text_to_image(sid, text, es, correct_asset, other_asset, correct_first, speaker=None):
        pair = [(correct_asset, True), (other_asset, False)]
        if not correct_first:
            pair.reverse()
        options = [{"id": f"{a}-{i + 1}", "image_url": image(a), "label": None} for i, (a, _) in enumerate(pair)]
        correct = next(o["id"] for o, (_, ok) in zip(options, pair) if ok)
        card = {"slide_id": sid, "interaction_type": "t2i2", "prompt": text, "stage": "Recognize",
                "correct_option_id": correct, "options": options, "audio_text": text, "answer_audio_text": None,
                "prompt_image_url": "", "spanish_translation": es,
                "pedagogy_note": "bidirectional recognition with a fresh contrast"}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def listen_image(sid, text, es, correct_asset, other_asset, correct_first, speaker=None):
        pair = [(correct_asset, True), (other_asset, False)]
        if not correct_first:
            pair.reverse()
        options = [{"id": f"{a}-{i + 1}", "image_url": image(a), "label": None} for i, (a, _) in enumerate(pair)]
        correct = next(o["id"] for o, (_, ok) in zip(options, pair) if ok)
        card = {"slide_id": sid, "interaction_type": "a2i2", "prompt": "Listen and choose.", "stage": "Listen",
                "correct_option_id": correct, "options": options, "audio_text": text, "answer_audio_text": None,
                "prompt_image_url": "", "spanish_translation": es, "pedagogy_note": "text hidden; fresh scenes"}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def listen_text(sid, text, es, choices, note):
        options = [text_option(f"{slug(c)}-{i + 1}", c) for i, c in enumerate(choices)]
        correct = next(o["id"] for o in options if o["label"] == text)
        cards.append({"slide_id": sid, "interaction_type": f"a2t{len(options)}", "prompt": "Listen and choose.",
                      "stage": "Listen", "correct_option_id": correct, "options": options, "audio_text": text,
                      "answer_audio_text": None, "prompt_image_url": "", "spanish_translation": es,
                      "pedagogy_note": note})

    def speak(sid, text, es, image_name, speaker=None, note="single-image speaking"):
        card = {"slide_id": sid, "interaction_type": "repeat", "prompt": text, "stage": "Speak",
                "correct_option_id": slug(text) + "-1",
                "options": [{"id": slug(text) + "-1", "image_url": image_name, "label": text}],
                "audio_text": text, "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": es, "pedagogy_note": note}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def guided(sid, prompt, words, text, es, asset, speaker=None):
        ids = [w.lower() for w in words]
        card = {"slide_id": sid, "interaction_type": "complete2", "prompt": prompt, "stage": "Use",
                "correct_option_id": ids[0], "correct_option_ids": ids,
                "options": [text_option(ids[i], words[i]) for i in interleave(words)],
                "audio_text": text, "answer_audio_text": text, "prompt_image_url": image(asset),
                "spanish_translation": es, "translation": es, "pedagogy_note": "guided review completion"}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def construct(sid, text, es, asset, speaker=None):
        words = text.rstrip(".?").split()
        ids = [f"word-{i + 1}" for i in range(len(words))]
        card = {"slide_id": sid, "interaction_type": "complete-sentence",
                "prompt": " ".join("___" for _ in words) + text[-1], "stage": "Use",
                "correct_option_id": ids[0], "correct_option_ids": ids,
                "options": [text_option(ids[i], words[i]) for i in interleave(words)],
                "audio_text": text, "answer_audio_text": text, "prompt_image_url": image(asset),
                "spanish_translation": es, "translation": es, "pedagogy_note": "full construction over a fresh scene"}
        if speaker:
            card["audio_speaker"] = speaker
            card["answer_audio_speaker"] = speaker
        cards.append(card)

    # Station 1 greetings and names; 2 perspective and current action; 3 age;
    # 4 origin; 5 jobs; 6 possession. Each modality revisits them in order.
    teach("L1", "Hello.", "Hola.", "hello", "male-character")
    teach("L2", "Good morning.", "Buenos días.", "good-morning", "male-character")
    teach("L3", "My name is Ana.", "Me llamo Ana.", "ana-name", "ana")
    teach("L4", "We are talking.", "Estamos hablando.", "we-talking", "female-character")
    teach("L5", "I am twenty years old.", "Tengo veinte años.", "ana-age", "ana")
    teach("L6", "I am from Mexico. I am Mexican.", "Soy de México. Soy mexicana.", "ana-mexico", "ana")
    teach("L7", "I am a teacher. I have a book.", "Soy maestra. Tengo un libro.", "ana-teacher", "ana")
    teach("L8", "I am a driver.", "Soy conductor.", "luis-driver", "luis")

    image_to_text("R1", "What is your name?", "My name is Ana.", "¿Cómo te llamas?", "ana-name",
                  ["My name is Luis.", "My name is Ana."], "ana", asker="male-character")
    image_to_text("R2", "How old are you?", "I am eighteen years old.", "¿Cuántos años tienes?", "luis-age",
                  ["I am eighteen years old.", "I am twenty years old."], "luis")
    image_to_text("R3", "What are you doing?", "I am working.", "¿Qué estás haciendo?", "working",
                  ["I am reading.", "I am working."], "sofia", asker="male-character")
    text_to_image("R4", "Goodbye.", "Adiós.", "goodbye", "hello", correct_first=False, speaker="male-character")
    text_to_image("R5", "He is a doctor.", "Él es doctor.", "doctor", "farmer", correct_first=True)
    text_to_image("R6", "He has a car.", "Él tiene un auto.", "luis-car", "ana-teacher", correct_first=False)
    for sid, asset, answer, other in (("R7", "we-talking", "We are talking.", "They are playing."),
                                      ("R8", "ana-mexico", "I am Mexican.", "I am Spanish.")):
        # Empty-prompt Recognize: the shared Spanish instruction is shown, never spoken.
        options = [text_option(f"{slug(c)}-{i + 1}", c) for i, c in enumerate([other, answer] if sid == "R8" else [answer, other])]
        cards.append({"slide_id": sid, "interaction_type": "i2t2", "prompt": "", "stage": "Recognize",
                      "correct_option_id": next(o["id"] for o in options if o["label"] == answer), "options": options,
                      "audio_text": "", "answer_audio_text": answer, "prompt_image_url": image(asset),
                      "answer_audio_speaker": {"R7": "female-character", "R8": "ana"}[sid],
                      "spanish_translation": "Elige la frase correcta.", "pedagogy_note": "empty-prompt recognition"})

    listen_image("N1", "Hello.", "Hola.", "hello", "goodbye", correct_first=True, speaker="male-character")
    listen_image("N2", "Good morning.", "Buenos días.", "good-morning", "goodbye", correct_first=False,
                 speaker="male-character")
    origin = "Audio-to-written-English origin station; every option already taught in 3.5."
    listen_text("N3", "Where are you from?", "¿De dónde eres?",
                ["What is your job?", "Where are you from?", "How old are you?"], "question discrimination")
    listen_text("N4", "I am from Canada.", "Soy de Canadá.",
                ["I am from Spain.", "I am from Mexico.", "I am from Canada."], origin)
    listen_text("N5", "I am Canadian.", "Soy canadiense.", ["I am Canadian.", "I am American.", "I am Mexican."], origin)
    listen_text("N6", "I am from the United States.", "Soy de Estados Unidos.",
                ["I am from Canada.", "I am from the United States.", "I am from Spain."], origin)
    listen_text("N7", "I am American.", "Soy estadounidense.", ["I am Spanish.", "I am Canadian.", "I am American."], origin)
    listen_text("N8", "I am from Spain.", "Soy de España.",
                ["I am from Spain.", "I am from Mexico.", "I am from the United States."], origin)
    listen_text("N9", "I am Spanish.", "Soy español.", ["I am Mexican.", "I am Spanish.", "I am Canadian."], origin)
    jobs = "Audio-to-written-English job station; every option already taught in 3.6."
    listen_text("N10", "What is your job?", "¿Cuál es tu trabajo?",
                ["What is your name?", "Where are you from?", "What is your job?"], jobs)
    listen_text("N11", "I am a nurse.", "Soy enfermera.", ["I am a nurse.", "I am a driver.", "I am a teacher."], jobs)
    listen_text("N12", "She is a cook.", "Ella es cocinera.", ["She is a farmer.", "She is a cook.", "She is a nurse."], jobs)
    owner = "Possession station; the his/her contrast matches 3.7."
    listen_text("N13", "That is his bag.", "Esa es la bolsa de él.",
                ["That is her bag.", "That is my bag.", "That is his bag."], owner)
    listen_text("N14", "Her name is Sofia.", "Ella se llama Sofía.",
                ["Her name is Sofia.", "His name is Luis.", "My name is Ana."], owner)
    ages = "Closing age station: hear the exact number inside the taught age frame."
    listen_text("N15", "I am eleven years old.", "Tengo once años.",
                ["I am twelve years old.", "I am eleven years old.", "I am fifteen years old."], ages)
    listen_text("N16", "I am fourteen years old.", "Tengo catorce años.",
                ["I am fourteen years old.", "I am thirteen years old.", "I am sixteen years old."], ages)
    listen_text("N17", "I am sixteen years old.", "Tengo dieciséis años.",
                ["I am seventeen years old.", "I am nineteen years old.", "I am sixteen years old."], ages)
    listen_text("N18", "I am nineteen years old.", "Tengo diecinueve años.",
                ["I am nineteen years old.", "I am eighteen years old.", "I am twenty years old."], ages)

    speak("S1", "Good morning.", "Buenos días.", image("good-morning"), "male-character")
    speak("S2", "My name is Ana.", "Me llamo Ana.", "a1_ana.webp", "ana")
    speak("S3", "I am eighteen years old.", "Tengo dieciocho años.", "a1_luis.webp", "luis")
    speak("S4", "I am working.", "Estoy trabajando.", image("working"), "sofia")
    speak("S5", "He is a doctor.", "Él es doctor.", image("doctor"))
    speak("S6", "He has a car.", "Él tiene un auto.", image("luis-car"))

    guided("U1", "___ ___ you doing?", ["What", "are"], "What are you doing?", "¿Qué estás haciendo?", "working",
           "male-character")
    guided("U2", "Where ___ ___ from?", ["are", "you"], "Where are you from?", "¿De dónde eres?", "ana-mexico")
    guided("U3", "That is ___ ___.", ["his", "car"], "That is his car.", "Ese es el auto de él.", "luis-car")
    guided("U4", "She is ___ ___.", ["a", "farmer"], "She is a farmer.", "Ella es agricultora.", "farmer")
    construct("U5", "I am a driver.", "Soy conductor.", "luis-driver", "luis")
    construct("U6", "I have a book.", "Tengo un libro.", "ana-teacher", "ana")
    construct("U7", "We are talking.", "Estamos hablando.", "we-talking", "female-character")
    construct("U8", "I am eighteen years old.", "Tengo dieciocho años.", "luis-age", "luis")

    counts = [sum(c["stage"] == s for c in cards) for s in ("Learn", "Recognize", "Listen", "Speak", "Use")]
    if counts != [8, 8, 18, 6, 8]:
        raise ValueError(f"3.9 review must keep its 8/8/18/6/8 station shape; found {counts}.")
    lesson["cards"] = cards
    lesson.update(
        content_revision=1,
        goal="Review Unit 3 through fresh scenes: greetings and names, speaker perspective and current action, ages, "
             "countries and nationalities, jobs, and possession. No new language.",
        grammar_function="Hello/Good morning/Goodbye; What is your name? My name is...; I am/you are/we are; What are "
                         "you doing? I am + -ing; How old are you? I am ... years old; Where are you from? I am from... / "
                         "I am + nationality; What is your job? I am a...; he/she is; my/your/his/her; have/has.",
        speaking_outcome="Say six Unit 3 lines aloud across greeting, identity, age, current action, job and possession.",
        purposeful_review_slides=["L1", "R1", "R3", "N3", "N10", "N13", "S4", "U8"])
    foundation = {}
    for path in sorted(LESSONS["3.9"].parent.glob("*.yaml")):
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        foundation[data["sub_lesson_id"]] = data
    lesson["review_vocabulary"] = list(dict.fromkeys(
        word for n in range(1, 9) for word in (compile_33_vocabulary() if n == 3 else foundation[f"3.{n}"].get("vocabulary", []))))
    return lesson


def compile_33_vocabulary() -> list[str]:
    return ["doing", "What are you doing?"]


# -------------------------------------------------------------------- 3.10
WHO_SAYS = "Escucha la frase y toca a la persona que la dice."
DESCRIBES = "Escucha la frase y toca a la persona que describe."
BEATS = [
    ("M01", "arrivals", "courtyard", "guided-search", WHO_SAYS,
     "En la mañana llegan los voluntarios: descubre quién saluda, quién se va y qué hace cada persona.",
     [("Good morning.", "Buenos días.", "ana"), ("Goodbye.", "Adiós.", "male-character"),
      ("I am reading.", "Estoy leyendo.", "luis"), ("I am playing.", "Estoy jugando.", "male-character")]),
    ("M02", "arrivals", "registration", "crowd-search", WHO_SAYS,
     "En el registro, descubre quién pregunta, quién se presenta y quién llega.",
     [("What is your name?", "¿Cómo te llamas?", "ana"), ("My name is Diego.", "Me llamo Diego.", "diego"),
      ("Hello.", "Hola.", "sofia"), ("We are talking.", "Estamos hablando.", "female-character")]),
    ("M03", "welcome", "flags", "crowd-search", WHO_SAYS,
     "En la bienvenida internacional, cada invitado dice de dónde es.",
     [("I am from Mexico.", "Soy de México.", "ana"), ("I am Canadian.", "Soy canadiense.", "sofia"),
      ("I am from Spain.", "Soy de España.", "diego"), ("I am American.", "Soy estadounidense.", "luis")]),
    ("M04", "welcome", "ages", "crowd-search", WHO_SAYS,
     "En la mesa juvenil, cada participante dice su edad.",
     [("I am thirteen years old.", "Tengo trece años.", "female-character"), ("I am seventeen years old.", "Tengo diecisiete años.", "male-character"),
      ("I am twelve years old.", "Tengo doce años.", "female-character"), ("I am fifteen years old.", "Tengo quince años.", "male-character")]),
    ("M05", "prep", "kitchen", "action-hunt", WHO_SAYS,
     "En la cocina, distingue quién habla de sí mismo, quién le habla a otra persona y quiénes juegan juntos.",
     [("I am cooking.", "Estoy cocinando.", "sofia"), ("You are writing.", "Estás escribiendo.", "diego"),
      ("I am writing.", "Estoy escribiendo.", "luis"), ("We are playing.", "Estamos jugando.", "female-character")]),
    ("M06", "prep", "handoffs", "crowd-search", WHO_SAYS,
     "Antes de la cena, descubre quién habla de lo suyo, quién entrega algo y quiénes tienen libros.",
     [("This is my book.", "Este es mi libro.", "ana"), ("This is your phone.", "Este es tu teléfono.", "luis"),
      ("I have a bike.", "Tengo una bicicleta.", "sofia"), ("We have two books.", "Tenemos dos libros.", "male-character")]),
    ("M07", "guests", "jobs-v2", "crowd-search", WHO_SAYS,
     "Los invitados llegan del trabajo: descubre a qué se dedica cada uno.",
     [("I am a doctor.", "Soy doctor.", "diego"), ("I am a nurse.", "Soy enfermera.", "female-character"),
      ("I am a farmer.", "Soy agricultor.", "male-character"), ("I am a driver.", "Soy conductor.", "luis")]),
    ("M08", "guests", "evening", "crowd-search", DESCRIBES,
     "Llegan los últimos invitados: escucha qué tiene o qué es cada persona.",
     [("He has a car.", "Él tiene un auto.", "teacher"), ("She has a bike.", "Ella tiene una bicicleta.", "teacher"),
      ("They are talking.", "Ellos están hablando.", "teacher"), ("He is a doctor.", "Él es doctor.", "teacher")]),
    ("M09", "guests", "belongings", "contrast-hunt", "Escucha de quién es cada cosa y toca a esa persona.",
     "En la entrada, cada cosa tiene dueño: fíjate si es de él o de ella.",
     [("That is her bag.", "Esa es la bolsa de ella.", "teacher"), ("That is his bag.", "Esa es la bolsa de él.", "teacher"),
      ("That is her phone.", "Ese es el teléfono de ella.", "teacher"), ("That is his phone.", "Ese es el teléfono de él.", "teacher")]),
]
GATES = [
    ("M10", "job", "What is your job?", "ana", "I am a doctor.", "diego", "Soy doctor.",
     "Ana le pregunta a Diego por su trabajo; responde por él."),
    ("M11", "origin", "Where are you from?", "diego", "I am from Canada. I am Canadian.", "sofia",
     "Soy de Canadá. Soy canadiense.", "Diego le pregunta a Sofia de dónde es; responde por ella."),
    ("M12", "age", "How old are you?", "sofia", "I am eighteen years old.", "luis", "Tengo dieciocho años.",
     "Sofia le pregunta a Luis su edad; responde por él."),
    ("M13", "doing", "What are you doing?", "female-character", "We are eating.", None, "Estamos comiendo.",
     "Una vecina pregunta qué hacen; responde por todos y la cena comienza."),
]
# The first finale question shot was rejected for moving the exchange indoors.
QUESTION_ASSETS = {"doing": "doing-question-v2"}
CHAPTERS = [
    {"id": "arrivals", "title": "Buenos días, voluntarios", "objective": "Escucha quién lo dice y toca a esa persona."},
    {"id": "welcome", "title": "Bienvenida internacional", "objective": "Descubre de dónde son y cuántos años tienen."},
    {"id": "prep", "title": "Prepara la cena", "objective": "Escucha quién habla, qué hace y qué tiene."},
    {"id": "guests", "title": "Llegan los invitados", "objective": "Descubre sus trabajos y de quién es cada cosa."},
    {"id": "table-talk", "title": "Conversación en la mesa", "objective": "Escucha la pregunta y responde en voz alta."},
]


def placeholder_geometry(count: int) -> list[dict]:
    width = 0.8 / count
    return [{"rect": {"x": 0.05 + i * (width + 0.01), "y": 0.2, "width": width, "height": 0.6},
             "head_anchors": [{"x": 0.05 + i * (width + 0.01) + width / 2, "y": 0.22}]} for i in range(count)]


def compile_310(base: dict, pack: dict, reviews: dict | None) -> dict:
    lesson = copy.deepcopy(base)
    url = lambda asset_id: "/lesson-assets/" + filename(pack, asset_id)  # noqa: E731
    cards = []
    for sid, chapter, asset, kind, instruction, purpose, lines in BEATS:
        geometry = placeholder_geometry(len(lines)) if reviews is None else reviews.get(asset, {}).get("targets", [])
        if len(geometry) != len(lines):
            raise ValueError(f"{sid}: every cue needs one measured target, in cue order.")
        options, targets, cues = [], [], []
        for index, ((text, es, _speaker), measured) in enumerate(zip(lines, geometry, strict=True), 1):
            identifier = f"{asset}-{index}"
            options.append(text_option(identifier, text))
            targets.append({"id": identifier, "label_es": es, "accepted_option_ids": [identifier],
                            "rect": measured["rect"], "head_anchors": measured["head_anchors"]})
            cues.append({"id": "cue-" + identifier, "text": text, "answer_text": text,
                         "target_id": identifier, "option_id": identifier})
        phrase = " ".join(text for text, _, _ in lines)
        game = {"kind": kind, "instruction_es": instruction, "validation": "ordered", "targets": targets, "cues": cues}
        if sid == "M01":
            game["tutorial_mode"] = "guided-no-fail"
        cards.append({"slide_id": sid, "mission_chapter_id": chapter, "interaction_type": "mission-game",
                      "stage": "Listen", "prompt": phrase, "prompt_image_url": url(asset), "options": options,
                      "correct_option_id": options[0]["id"], "correct_option_ids": [o["id"] for o in options],
                      "audio_text": phrase, "answer_audio_text": None,
                      "audio_turns": [{"text": text, "speaker_role": speaker, "image_url": url(asset)}
                                      for text, _, speaker in lines],
                      "spanish_translation": " ".join(es for _, es, _ in lines), "pedagogy_note": purpose,
                      "mission_game": game})
    # A voice gate plays only the asker's question; its answer is private grading
    # text with no model audio, so the answering guest carries no speaker role.
    for index, (sid, key, question, asker, answer, _answerer, es, purpose) in enumerate(GATES):
        response = f"{key}-response"
        card = {"slide_id": sid, "mission_chapter_id": "table-talk",
                "interaction_type": "mission-finale" if index == len(GATES) - 1 else "mission-speak",
                "stage": "Speak", "prompt": answer, "prompt_image_url": "",
                "options": [{"id": response, "label": answer, "image_url": url(response)}],
                "correct_option_id": response, "audio_text": answer, "answer_audio_text": None,
                "audio_turns": [{"text": question, "speaker_role": asker,
                                 "image_url": url(QUESTION_ASSETS.get(key, f"{key}-question"))}],
                "spanish_translation": es, "pedagogy_note": purpose,
                "mission_game": {"kind": "voice-gate",
                                 "instruction_es": "Escucha la pregunta. Después lee la respuesta en voz alta.",
                                 "validation": "single", "cue_audio_text": question,
                                 "targets": [{"id": response, "label_es": es, "accepted_option_ids": [response],
                                              "rect": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}}],
                                 "cues": [{"id": "cue-" + response, "text": question, "answer_text": answer,
                                           "target_id": response, "option_id": response}]}}
        cards.append(card)
    for index, card in enumerate(cards, 1):
        card["pedagogy_note"] = f"Mission beat {index:02d}/{len(cards):02d}: " + card["pedagogy_note"]
    lesson["cards"] = cards
    title = "Cenas cruzadas"
    lesson.update(
        title="3.10 " + title, sub_lesson_title=title, content_revision=pack["revision"],
        unit_outcome="Meet people, exchange personal information established in dialogue, describe ownership, and "
                     "ask about the current action.",
        goal="Help Ana run the community center's international dinner: recognize who says each greeting and "
             "introduction, meet the guests' countries, ages and jobs, follow what everyone is doing and owns, and "
             "answer four dinner-table questions aloud.",
        grammar_function="Hello/Good morning/Goodbye; What is your name? My name is...; I am/you are/we are; he/she "
                         "is, they are; What are you doing? I am + -ing; I am ... years old; I am from... / I am + "
                         "nationality; I am a + job; my/your/his/her + noun; have/has.",
        prerequisite="Lessons 3.1-3.9 completed.",
        speaking_outcome="Answer four dinner-table questions aloud: a job, a country and nationality, an age, and what "
                         "everyone is doing.",
        purposeful_review_slides=[card["slide_id"] for card in cards])
    lesson["mission"] = {
        "label": "MISIÓN FINAL · UNIDAD 3", "title": title,
        "briefing": "Hoy es la cena internacional del centro comunitario y Ana necesita tu ayuda. Escucha cada frase "
                    "y descubre quién la dice o a quién describe: saludos, nombres, países, edades, trabajos y cosas "
                    "de cada invitado. Al final, responde en voz alta en la mesa. Primero escucha la frase completa; "
                    "después toca a la persona.",
        "kickoff_image_url": url("kickoff"),
        "objectives": ["Escucha quién lo dice", "Conoce a los invitados", "Responde en la mesa"],
        "completion_title": "¡La cena está servida!",
        "completion_message": "Reconociste saludos y presentaciones, conociste a cada invitado, descubriste qué hacen "
                              "y qué tienen, y respondiste en voz alta. La cena internacional puede comenzar.",
        "chapters": CHAPTERS,
        "voice_heading": "CONVERSA EN LA MESA",
        "voice_instruction": "Escucha la pregunta y responde en voz alta",
        "voice_success_label": "RESPUESTA COMPLETA",
    }
    foundations = [json.loads(p.read_text(encoding="utf-8-sig")) for p in sorted(LESSONS["3.10"].parent.glob("*.yaml"))
                   if p not in (LESSONS["3.9"], LESSONS["3.10"])]
    vocabulary = [w for f in foundations for w in (compile_33_vocabulary() if f["sub_lesson_id"] == "3.3"
                                                   else f.get("vocabulary", []))]
    lesson["review_vocabulary"] = list(dict.fromkeys(vocabulary))
    lesson["vocabulary"] = []
    return lesson


# ------------------------------------------------------------ validation
def validate(lessons: dict) -> None:
    from backend.app.schemas import Lesson, MissionLesson
    Lesson.model_validate(lessons["3.3"])
    Lesson.model_validate(lessons["3.9"])
    MissionLesson.model_validate(lessons["3.10"])


def read_base(path: Path, ref: str | None) -> dict:
    """Read a lesson from the working tree, or from a git ref for a re-run."""
    if ref is None:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    import subprocess
    text = subprocess.check_output(["git", "show", f"{ref}:{path.relative_to(ROOT).as_posix()}"],
                                   cwd=ROOT, encoding="utf-8")
    return json.loads(text.lstrip("\ufeff"))


def compile_all(pack_map: dict, draft: bool, base_ref: str | None = None) -> dict:
    bases = {number: read_base(path, base_ref) for number, path in LESSONS.items()}
    reviews = None
    if not draft:
        path = pack_output_directory(pack_map["3.10"]) / "agent-reviews.json"
        reviews = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    lessons = {"3.3": compile_33(bases["3.3"], pack_map["3.3"]),
               "3.9": compile_39(bases["3.9"], pack_map["3.9"]),
               "3.10": compile_310(bases["3.10"], pack_map["3.10"], reviews)}
    validate(lessons)
    return lessons


# --------------------------------------------------------------- install
RETIRED = {
    "a1_u3_scene_01_kitchen.webp": ("courtyard",
        "Blurred-inset hotspot scene: the photograph sits inside a blurred padded frame, breaking the full-bleed "
        "rule, and its cues used untaught helping language.",
        "Inspected full frame: a small kitchen photo inset in wide blurred borders; four family members cook or help."),
    "a1_u3_scene_02_dining.webp": ("registration",
        "Blurred-inset hotspot scene: the photograph sits inside a blurred padded frame, breaking the full-bleed "
        "rule, and it served a stub mission below the parity contract.",
        "Inspected full frame: a dining-room photo inset in blurred borders; four family members read, phone or set glasses."),
    "a1_u3_scene_03_photo_mother.webp": ("job-response",
        "The three-beat stub mission is rebuilt to the approved Unit 3 contract; its single doctor voice gate is "
        "replaced by four question-and-answer gates with distinct question and response views.",
        "Inspected: a doctor with a stethoscope smiles at a family dinner table; original kept byte-for-byte on disk."),
}


def install(pack_map: dict, lessons: dict) -> None:
    before = {number: path.read_bytes() for number, path in LESSONS.items()}
    staged = {}
    for number, pack in pack_map.items():
        reviews, records = reviewed_assets(pack)
        attempts, rejected = paid_attempts(pack, reviews, {r["asset_id"] for r in records})
        staged[number] = (pack, reviews, records, attempts, rejected, stage_images(pack, records))
    for number, path in LESSONS.items():
        if path.read_bytes() != before[number]:
            raise ValueError(f"Concurrent canonical edit of {number}; stop.")
    for number, (pack, reviews, records, attempts, rejected, exports) in staged.items():
        kind = {"3.3": "lesson-3-3", "3.9": "review", "3.10": "mission"}[number]
        install_images(pack, exports, records, rejected, ARCHIVE / f"{kind}-v1")
        register_photoreal(exports)
    for number, path in LESSONS.items():
        path.write_text(json.dumps(lessons[number], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    for number, (pack, reviews, records, attempts, rejected, exports) in staged.items():
        proof = {"schema_version": 1, "pack_sha256": digest(PACKS[number]), "lesson_id": pack["lesson_id"],
                 "human_approval": "pending", "assets": records, "paid_attempts": attempts}
        if number == "3.10":
            proof["retired_scenes"] = [
                {"lesson_id": pack["lesson_id"], "old_filename": old,
                 "old_sha256": baseline["assets"][old]["copies"]["Lessons/Lesson1/images"],
                 "issue": issue, "observation": observation,
                 "replacement_filename": filename(pack, replacement)}
                for old, (replacement, issue, observation) in RETIRED.items()]
        write_json(PROOFS[number], proof)
    record_plans(pack_map, baseline)
    record_superseded_edits(pack_map["3.10"])
    record_target_reviews(pack_map, lessons["3.10"], staged["3.10"][2])
    errors = audit(ROOT, baseline, json.loads(PLANS.read_text(encoding="utf-8"))["changes"])
    if errors:
        raise ValueError(errors)


def record_plans(pack_map: dict, baseline: dict) -> None:
    plans = json.loads(PLANS.read_text(encoding="utf-8"))
    mission = pack_map["3.10"]
    keep = []
    for plan in plans["changes"]:
        key = (plan["lesson_id"], plan["old_filename"])
        if key[0] == mission["lesson_id"] and key[1] in RETIRED:
            continue  # superseded by the rebuild record below
        if key == ("lesson-3-9-unit-3-review", "a1_n7.webp"):
            # The rebuilt U8 keeps this exact Use sentence over the fresh Luis still.
            plan = dict(plan, new_filename=filename(pack_map["3.9"], "luis-age"))
        keep.append(plan)
    for old, (replacement, issue, _observation) in RETIRED.items():
        keep.append({"lesson_id": mission["lesson_id"], "old_filename": old,
                     "old_sha256": baseline["assets"][old]["copies"]["Lessons/Lesson1/images"],
                     "new_filename": filename(mission, replacement), "issue": "mission-rebuild-retires-scene",
                     "issue_detail": issue, "evidence_file": "docs/qa/unit-3-mission-media-v1.json",
                     "source_provenance": baseline["assets"][old]["provenance"],
                     "original_action": "preserve-byte-for-byte"})
    plans["changes"] = keep
    write_json(PLANS, plans)


def record_superseded_edits(mission: dict) -> None:
    """Retire the 2026-09-17 edit of the stub mission's doctor gate, with evidence."""
    from scripts.mission_photo_edit_contract import EVIDENCE, SUPERSEDED
    edits = json.loads((ROOT / EVIDENCE).read_text(encoding="utf-8"))["assets"]
    path = ROOT / SUPERSEDED
    data = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {"schema_version": 1, "superseded": []}
    for record in edits:
        if record["lesson_id"] != mission["lesson_id"] or record["old_filename"] not in RETIRED:
            continue
        row = {"lesson_id": record["lesson_id"], "slide_id": record["slide_id"],
               "candidate_filename": record["candidate_filename"],
               "superseded_by": "docs/qa/unit-3-mission-media-v1.json",
               "reason": "The Unit 3 stub mission was rebuilt to the parity contract; its single doctor voice gate "
                         "became four question-and-answer gates with distinct question and response views."}
        if row not in data["superseded"]:
            data["superseded"].append(row)
    write_json(path, data)


def record_target_reviews(pack_map: dict, lesson: dict, records: list[dict]) -> None:
    path = ROOT / "docs/qa/units-2-7-mission-target-reviews.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    history = data.setdefault("superseded_reviews", [])
    for row in data["reviews"]:
        if row["lesson_id"] == lesson["id"] and row not in history:
            history.append(row)
    data["reviews"] = [row for row in data["reviews"] if row["lesson_id"] != lesson["id"]]
    by_name = {record["runtime_filename"]: record for record in records}
    for card in lesson["cards"]:
        groups = {t["id"]: t["head_anchors"] for t in card["mission_game"]["targets"] if len(t.get("head_anchors", [])) > 1}
        if groups:
            name = Path(card["prompt_image_url"]).name
            data["reviews"].append({"lesson_id": lesson["id"], "slide_id": card["slide_id"], "filename": name,
                                    "sha256": by_name[name]["runtime_sha256"], "targets": groups,
                                    "note": by_name[name]["agent_review"]["notes"]})
    write_json(path, data)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", action="store_true", help="Validate with placeholder mission geometry.")
    parser.add_argument("--prepare-exceptions", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--base-ref", help="Compile from the pre-rebuild lessons at this git ref (for re-runs).")
    parser.add_argument("--lessons-only", action="store_true",
                        help="With --base-ref, rewrite only the lesson files; stills must already be installed.")
    parser.add_argument("--check", action="store_true", help="Fail if the installed lessons differ from the builder.")
    args = parser.parse_args()
    pack_map = packs()
    if args.prepare_exceptions:
        print("review exceptions added:", prepare_review_exceptions(pack_map["3.9"]))
        return 0
    lessons = compile_all(pack_map, draft=args.draft, base_ref=args.base_ref)
    summary = {number: len(lesson["cards"]) for number, lesson in lessons.items()}
    print(json.dumps({"cards": summary, "draft": args.draft, "write": args.write}))
    rendered = {number: json.dumps(lesson, ensure_ascii=False, indent=2) + "\n" for number, lesson in lessons.items()}
    if args.check:
        stale = [number for number, path in LESSONS.items()
                 if path.read_text(encoding="utf-8-sig").replace("\r\n", "\n") != rendered[number]]
        if stale:
            raise SystemExit(f"Installed lessons differ from the builder: {stale}")
        print("Installed Unit 3 lessons match the builder.")
        return 0
    if args.lessons_only:
        if args.draft or not args.base_ref:
            raise ValueError("--lessons-only needs --base-ref and measured geometry.")
        for number, path in LESSONS.items():
            path.write_text(rendered[number], encoding="utf-8", newline="\n")
        print("Rewrote Unit 3 lesson files; run the media preservation audit next.")
        return 0
    if args.write:
        if args.draft:
            raise ValueError("Never install draft geometry.")
        install(pack_map, lessons)
        print("Installed Unit 3 lessons and stills. Audio, manifests, snapshots and device QA remain required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
