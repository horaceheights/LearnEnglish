"""Bring Unit 4 to the Unit 1 mission standard: a fresh 4.9 review and a 13-beat 4.10 mission.

The review keeps no exact-byte teaching image: it uses the four Unit 4 review-only
photographs that already exist plus thirteen fresh review scenes. The mission keeps
the three full-frame scenes the stub already owned, with their measured target
geometry, and adds six listening scenes, a kickoff and the question and response
views of four voice gates.

Modes mirror the Unit 3 builder: --check re-derives the installed lessons from a
pre-rebuild base, --lessons-only rewrites them, and --write installs reviewed stills.
"""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.parity_pack import (  # noqa: E402
    install_images, paid_attempts, prepare_review_exceptions, reviewed_assets, stage_images, write_json,
)

LESSONS = {
    "4.9": ROOT / "backend" / "lessons" / "unit_4" / "lesson-4-9-unit-4-review.yaml",
    "4.10": ROOT / "backend" / "lessons" / "unit_4" / "lesson-4-10-my-day-mission.yaml",
}
PACKS = {
    "4.9": ROOT / "docs" / "product" / "unit-4-review-pack.json",
    "4.10": ROOT / "docs" / "product" / "unit-4-mission-pack.json",
}
# Review-only photographs Unit 4 already owns; no teaching card uses these bytes.
EXISTING_REVIEW = {
    "bedroom": "a1_photo_u4_review_bedroom_v1.webp",
    "book-on-table": "a1_photo_u4_review_book_on_table_v1.webp",
    "computer": "a1_photo_u4_review_computer_v1.webp",
    "two-chairs": "a1_photo_u4_review_two_chairs_in_dining_room_v2.webp",
}
# Mission-only scenes the stub already owned, reused with their measured geometry.
KEPT_SCENES = {
    "M01": "a1_u4_scene_01_living_room_fullframe_v2.webp",
    "M02": "a1_u4_scene_02_kitchen_dining_fullframe_v2.webp",
    "M03": "a1_u4_scene_03_bedroom_fullframe_v2.webp",
}
CLOCK_SIX = "a1_u4_mission_clock_six_v3.webp"


def packs() -> dict:
    return {number: json.loads(path.read_text(encoding="utf-8")) for number, path in PACKS.items()}


def filename(pack: dict, asset_id: str) -> str:
    for asset in pack["assets"]:
        if asset["id"] == asset_id:
            return asset["runtime_filename"]
    raise KeyError(f"{pack['lesson_number']} pack has no asset {asset_id!r}")


def interleave(words: list[str]) -> list[int]:
    """Option order that never presents the answer already assembled."""
    order = list(range(len(words)))
    return order[1::2] + order[0::2] if len(order) > 1 else order


def text_option(identifier: str, label: str) -> dict:
    return {"id": identifier, "image_url": "", "label": label}


def slug(text: str) -> str:
    return "".join(character if character.isalnum() else "-" for character in text.lower()).strip("-")


# ---------------------------------------------------------------------- 4.9
def compile_49(base: dict, pack: dict) -> dict:
    lesson = copy.deepcopy(base)
    cards: list[dict] = []

    def image(asset_id: str) -> str:
        return EXISTING_REVIEW.get(asset_id) or filename(pack, asset_id)

    def teach(sid, text, es, asset, speaker=None, note="fresh review station"):
        card = {"slide_id": sid, "interaction_type": "teach", "prompt": text, "stage": "Learn",
                "correct_option_id": slug(text) + "-1",
                "options": [{"id": slug(text) + "-1", "image_url": image(asset), "label": text}],
                "audio_text": text, "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": es, "pedagogy_note": note}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def image_to_text(sid, prompt, answer, es, asset, choices, speaker=None, note="fresh scene, answer frame"):
        options = [text_option(f"{slug(choice)}-{index + 1}", choice) for index, choice in enumerate(choices)]
        correct = next(option["id"] for option in options if option["label"] == answer)
        card = {"slide_id": sid, "interaction_type": f"i2t{len(options)}", "prompt": prompt, "stage": "Recognize",
                "correct_option_id": correct, "options": options, "audio_text": prompt, "answer_audio_text": answer,
                "prompt_image_url": image(asset), "spanish_translation": es, "pedagogy_note": note}
        if speaker:
            card["answer_audio_speaker"] = speaker
        cards.append(card)

    def empty_recognize(sid, answer, other, es, asset, answer_first, speaker=None):
        """Recognize with no authored prompt: the app shows its Spanish instruction."""
        labels = [answer, other] if answer_first else [other, answer]
        options = [text_option(f"{slug(label)}-{index + 1}", label) for index, label in enumerate(labels)]
        card = {"slide_id": sid, "interaction_type": "i2t2", "prompt": "", "stage": "Recognize",
                "correct_option_id": next(option["id"] for option in options if option["label"] == answer),
                "options": options, "audio_text": "", "answer_audio_text": answer,
                "prompt_image_url": image(asset), "spanish_translation": es,
                "pedagogy_note": "empty-prompt recognition"}
        if speaker:
            card["answer_audio_speaker"] = speaker
        cards.append(card)

    def text_to_image(sid, text, es, correct_asset, other_asset, correct_first, speaker=None):
        pair = [(correct_asset, True), (other_asset, False)]
        if not correct_first:
            pair.reverse()
        options = [{"id": f"{asset}-{index + 1}", "image_url": image(asset), "label": None}
                   for index, (asset, _correct) in enumerate(pair)]
        correct = next(option["id"] for option, (_asset, ok) in zip(options, pair) if ok)
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
        options = [{"id": f"{asset}-{index + 1}", "image_url": image(asset), "label": None}
                   for index, (asset, _correct) in enumerate(pair)]
        correct = next(option["id"] for option, (_asset, ok) in zip(options, pair) if ok)
        card = {"slide_id": sid, "interaction_type": "a2i2", "prompt": "Listen and choose.", "stage": "Listen",
                "correct_option_id": correct, "options": options, "audio_text": text, "answer_audio_text": None,
                "prompt_image_url": "", "spanish_translation": es, "pedagogy_note": "text hidden; fresh scenes"}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def listen_text(sid, text, es, choices, note, speaker=None):
        options = [text_option(f"{slug(choice)}-{index + 1}", choice) for index, choice in enumerate(choices)]
        card = {"slide_id": sid, "interaction_type": f"a2t{len(options)}", "prompt": "Listen and choose.",
                "stage": "Listen", "correct_option_id": next(o["id"] for o in options if o["label"] == text),
                "options": options, "audio_text": text, "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": es, "pedagogy_note": note}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def speak(sid, text, es, asset, speaker=None, note="single-image speaking"):
        card = {"slide_id": sid, "interaction_type": "repeat", "prompt": text, "stage": "Speak",
                "correct_option_id": slug(text) + "-1",
                "options": [{"id": slug(text) + "-1", "image_url": image(asset), "label": text}],
                "audio_text": text, "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": es, "pedagogy_note": note}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def guided(sid, prompt, words, text, es, asset, speaker=None):
        ids = [word.lower() for word in words]
        card = {"slide_id": sid, "interaction_type": "complete2", "prompt": prompt, "stage": "Use",
                "correct_option_id": ids[0], "correct_option_ids": ids,
                "options": [text_option(ids[index], words[index]) for index in interleave(words)],
                "audio_text": text, "answer_audio_text": text, "prompt_image_url": image(asset),
                "spanish_translation": es, "translation": es, "pedagogy_note": "guided review completion"}
        if speaker:
            card["audio_speaker"] = speaker
        cards.append(card)

    def construct(sid, text, es, asset, speaker=None):
        words = text.rstrip(".?").split()
        ids = [f"word-{index + 1}" for index in range(len(words))]
        card = {"slide_id": sid, "interaction_type": "complete-sentence",
                "prompt": " ".join("___" for _ in words) + text[-1], "stage": "Use",
                "correct_option_id": ids[0], "correct_option_ids": ids,
                "options": [text_option(ids[index], words[index]) for index in interleave(words)],
                "audio_text": text, "answer_audio_text": text, "prompt_image_url": image(asset),
                "spanish_translation": es, "translation": es, "pedagogy_note": "full construction over a fresh scene"}
        if speaker:
            card["audio_speaker"] = speaker
            card["answer_audio_speaker"] = speaker
        cards.append(card)

    # Station 1 rooms; 2 furniture; 3 where things are; 4 there is/there are;
    # 5 routine and daily actions; 6 days and time. Each modality revisits them in order.
    teach("L1", "This is the kitchen.", "Esta es la cocina.", "kitchen")
    teach("L2", "This is the bathroom.", "Este es el baño.", "bathroom")
    teach("L3", "The lamp is next to the sofa.", "La lámpara está junto al sofá.", "sofa-lamp")
    teach("L4", "The bag is under the table.", "La bolsa está debajo de la mesa.", "bag-under-table")
    teach("L5", "I wake up in the morning.", "Me despierto en la mañana.", "wake-up", "female-character")
    teach("L6", "I brush my teeth.", "Me lavo los dientes.", "brush-teeth", "male-character")
    teach("L7", "I go to school every day.", "Voy a la escuela todos los días.", "go-to-school", "male-character")
    teach("L8", "It is seven o'clock.", "Son las siete.", "clock-seven")

    empty_recognize("R1", "This is the bedroom.", "This is the bathroom.", "Elige la frase correcta.",
                    "bedroom", answer_first=False)
    empty_recognize("R2", "There is a computer.", "There is a lamp.", "Elige la frase correcta.",
                    "computer", answer_first=True)
    image_to_text("R3", "Where is the book?", "The book is on the table.", "¿Dónde está el libro?", "book-on-table",
                  ["The book is under the table.", "The book is in the bag.", "The book is on the table."])
    empty_recognize("R4", "There are two chairs in the dining room.", "There is a bed in the bedroom.",
                    "Elige la frase correcta.", "two-chairs", answer_first=False)
    text_to_image("R5", "I eat breakfast.", "Desayuno.", "breakfast", "wake-up", correct_first=True,
                  speaker="female-character")
    text_to_image("R6", "I study English.", "Estudio inglés.", "study-english", "go-to-school", correct_first=False,
                  speaker="female-character")
    empty_recognize("R7", "The lamp is next to the sofa.", "The lamp is under the sofa.", "Elige la frase correcta.",
                    "sofa-lamp", answer_first=True)
    image_to_text("R8", "What time is it?", "It is seven o'clock.", "¿Qué hora es?", "clock-seven",
                  ["It is nine o'clock.", "It is three o'clock.", "It is seven o'clock."])

    listen_image("N1", "This is the bathroom.", "Este es el baño.", "bathroom", "kitchen", correct_first=False)
    listen_image("N2", "The bag is under the table.", "La bolsa está debajo de la mesa.", "bag-under-table",
                 "book-on-table", correct_first=True)
    place = "Audio-to-written-English location station; every option was taught in 4.3."
    listen_text("N3", "Where is the book?", "¿Dónde está el libro?",
                ["Where is the bag?", "Where is the book?", "Where is the lamp?"], "question discrimination")
    listen_text("N4", "The book is in the bag.", "El libro está en la bolsa.",
                ["The book is on the table.", "The book is in the bag.", "The book is under the table."], place)
    listen_text("N5", "The lamp is next to the bed.", "La lámpara está junto a la cama.",
                ["The lamp is next to the bed.", "The lamp is on the bed.", "The lamp is under the bed."], place)
    there = "There is / There are station; the singular and plural contrast matches 4.4."
    listen_text("N6", "There is a bed in the bedroom.", "Hay una cama en el dormitorio.",
                ["There are two beds in the bedroom.", "There is a bed in the bedroom.",
                 "There is a sofa in the bedroom."], there)
    listen_text("N7", "There are four chairs in the dining room.", "Hay cuatro sillas en el comedor.",
                ["There is a chair in the dining room.", "There are two chairs in the dining room.",
                 "There are four chairs in the dining room."], there)
    listen_text("N8", "There is a window in the kitchen.", "Hay una ventana en la cocina.",
                ["There is a door in the kitchen.", "There is a window in the kitchen.",
                 "There is a computer in the kitchen."], there)
    routine = "Morning-routine station; every option was taught in 4.5."
    listen_text("N9", "I wash my face.", "Me lavo la cara.",
                ["I wash my face.", "I brush my teeth.", "I get dressed."], routine, "female-character")
    listen_text("N10", "I get dressed.", "Me visto.",
                ["I eat breakfast.", "I wake up.", "I get dressed."], routine, "male-character")
    listen_text("N11", "I eat breakfast in the morning.", "Desayuno en la mañana.",
                ["I eat breakfast in the morning.", "I eat breakfast in the afternoon.",
                 "I eat breakfast at night."], routine, "female-character")
    daily = "Daily-actions station; every option was taught in 4.6."
    listen_text("N12", "I go to work.", "Voy al trabajo.",
                ["I go to school.", "I go to work.", "I come home."], daily, "male-character")
    listen_text("N13", "I come home.", "Regreso a casa.",
                ["I come home.", "I go to work.", "I study English."], daily, "female-character")
    listen_text("N14", "I sleep at night.", "Duermo en la noche.",
                ["I study English at night.", "I come home at night.", "I sleep at night."], daily, "male-character")
    order = "Sequence station; first, then and every day match 4.7."
    listen_text("N15", "First, I wake up.", "Primero, me despierto.",
                ["First, I eat breakfast.", "Then, I wake up.", "First, I wake up."], order, "female-character")
    listen_text("N16", "Then, I eat breakfast.", "Luego, desayuno.",
                ["Then, I eat breakfast.", "First, I eat breakfast.", "Then, I go to school."], order,
                "female-character")
    days = "Closing days-and-time station; every option was taught in 4.8."
    listen_text("N17", "I study English on Monday.", "Estudio inglés el lunes.",
                ["I study English on Sunday.", "I study English on Monday.", "I study English on Friday."], days,
                "female-character")
    listen_text("N18", "I come home in the afternoon.", "Regreso a casa en la tarde.",
                ["I come home in the morning.", "I come home in the afternoon.", "I come home at night."], days,
                "female-character")

    speak("S1", "This is the kitchen.", "Esta es la cocina.", "kitchen")
    speak("S2", "The book is on the table.", "El libro está sobre la mesa.", "book-on-table")
    speak("S3", "There are two chairs in the dining room.", "Hay dos sillas en el comedor.", "two-chairs")
    speak("S4", "I wash my face.", "Me lavo la cara.", "wash-face", "female-character")
    speak("S5", "First, I wake up. Then, I eat breakfast.", "Primero, me despierto. Luego, desayuno.", "breakfast",
          "female-character")
    speak("S6", "It is seven o'clock.", "Son las siete.", "clock-seven")

    guided("U1", "This is ___ ___.", ["the", "bathroom"], "This is the bathroom.", "Este es el baño.", "bathroom")
    guided("U2", "The bag is ___ ___ table.", ["under", "the"], "The bag is under the table.",
           "La bolsa está debajo de la mesa.", "bag-under-table")
    guided("U3", "There ___ ___ chairs in the dining room.", ["are", "two"],
           "There are two chairs in the dining room.", "Hay dos sillas en el comedor.", "two-chairs")
    guided("U4", "First, I ___ ___.", ["wake", "up"], "First, I wake up.", "Primero, me despierto.", "wake-up",
           "female-character")
    construct("U5", "I brush my teeth.", "Me lavo los dientes.", "brush-teeth", "male-character")
    construct("U6", "I go to work.", "Voy al trabajo.", "go-to-work", "male-character")
    construct("U7", "It is seven o'clock.", "Son las siete.", "clock-seven")
    construct("U8", "I study English on Monday.", "Estudio inglés el lunes.", "monday-calendar", "female-character")

    counts = [sum(card["stage"] == stage for card in cards) for stage in ("Learn", "Recognize", "Listen", "Speak", "Use")]
    if counts != [8, 8, 18, 6, 8]:
        raise ValueError(f"4.9 review must keep its 8/8/18/6/8 station shape; found {counts}.")
    lesson["cards"] = cards
    lesson.update(
        content_revision=2,
        goal="Review Unit 4 through fresh scenes: rooms, furniture, where things are, there is and there are, the "
             "morning routine and daily actions, and days and time. No new language.",
        grammar_function="This is the + room; there is / there are; in, on, under, next to; Where is...?; I + daily "
                         "action; first, then, every day; in the morning / afternoon, at night; on + day; It is ... "
                         "o'clock.",
        speaking_outcome="Say six Unit 4 lines aloud across rooms, object location, existence, routine and time.",
        purposeful_review_slides=["L1", "R3", "R8", "N6", "N12", "N17", "S4", "U8"])
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["4.9"].parent.glob("*.yaml"))
                   if path not in (LESSONS["4.9"], LESSONS["4.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# --------------------------------------------------------------------- 4.10
WHO_SAYS = "Escucha la frase y toca a la persona que la dice."
FIND_IT = "Escucha la pista y toca lo que describe."
WHERE_IS = "Escucha dónde está cada cosa y tócala."
# (slide, chapter, asset, kind, instruction, purpose, [(text, es, speaker)])
NEW_BEATS = [
    ("M04", "objetos", "living-objects", "contrast-hunt", WHERE_IS,
     "En la sala, cada cosa tiene su lugar: sobre, debajo, dentro y al lado.",
     [("The book is on the table.", "El libro está sobre la mesa.", "teacher"),
      ("The bag is under the table.", "La bolsa está debajo de la mesa.", "teacher"),
      ("The phone is in the bag.", "El teléfono está dentro de la bolsa.", "teacher"),
      ("The pen is next to the lamp.", "El bolígrafo está junto a la lámpara.", "teacher")]),
    ("M05", "rutina", "night-home", "action-hunt", WHO_SAYS,
     "En la noche, cada quien cuenta lo que hace: escucha quién lo dice.",
     [("First, I come home.", "Primero, regreso a casa.", "male-character"),
      ("Then, I wash my face in the bathroom.", "Luego, me lavo la cara en el baño.", "female-character"),
      ("I sleep at night.", "Duermo en la noche.", "male-character"),
      ("I study English every day.", "Estudio inglés todos los días.", "female-character")]),
    ("M06", "rutina", "morning-routine", "action-hunt", WHO_SAYS,
     "La familia se prepara: escucha quién dice cada parte de la rutina.",
     [("I wake up in the morning.", "Me despierto en la mañana.", "female-character"),
      ("I wash my face.", "Me lavo la cara.", "male-character"),
      ("I brush my teeth.", "Me lavo los dientes.", "female-character"),
      ("I get dressed.", "Me visto.", "male-character")]),
    ("M07", "rutina", "kitchen-morning", "crowd-search", WHO_SAYS,
     "En la cocina empieza el día: escucha quién dice cada frase.",
     [("I eat breakfast.", "Desayuno.", "male-character"),
      ("I go to school.", "Voy a la escuela.", "female-character"),
      ("I go to work.", "Voy al trabajo.", "female-character"),
      ("I get dressed.", "Me visto.", "male-character")]),
    ("M08", "casa", "count-dining", "crowd-search", FIND_IT,
     "Antes de la cena, cuenta lo que hay en el comedor.",
     [("There is a table.", "Hay una mesa.", "teacher"),
      ("There are four chairs.", "Hay cuatro sillas.", "teacher"),
      ("There is a lamp.", "Hay una lámpara.", "teacher"),
      ("There are two windows.", "Hay dos ventanas.", "teacher")]),
    ("M09", "casa", "clocks", "crowd-search", FIND_IT,
     "En la pared hay cuatro relojes: escucha la hora y tócala.",
     [("It is seven o'clock.", "Son las siete.", "teacher"),
      ("It is nine o'clock.", "Son las nueve.", "teacher"),
      ("It is three o'clock.", "Son las tres.", "teacher"),
      ("It is six o'clock.", "Son las seis.", "teacher")]),
]
# (slide, key, question, asker, answer, spanish, purpose, response asset)
GATES = [
    ("M10", "time", "What time is it?", "female-character", "It is six o'clock.", "Son las seis.",
     "La madre pregunta la hora antes de salir; responde por la familia.", CLOCK_SIX),
    ("M11", "book", "Where is the book?", "male-character", "The book is on the table.", "El libro está sobre la mesa.",
     "El padre busca el libro; dile dónde está.", None),
    ("M12", "morning", "What do you do in the morning?", "female-character", "I wake up in the morning.",
     "Me despierto en la mañana.", "La abuela pregunta por tu mañana; responde por ti.", None),
    ("M13", "english", "When do you study English?", "male-character", "I study English on Monday.",
     "Estudio inglés el lunes.", "El abuelo pregunta cuándo estudias inglés; responde y el día queda listo.", None),
]
CHAPTERS = [
    {"id": "cuartos", "title": "Cada quien en su cuarto", "objective": "Escucha la pista y toca a la persona o el mueble."},
    {"id": "objetos", "title": "¿Dónde quedó cada cosa?", "objective": "Escucha dónde está cada objeto y tócalo."},
    {"id": "rutina", "title": "La rutina de la mañana", "objective": "Escucha quién dice cada parte de la rutina."},
    {"id": "casa", "title": "La casa y la hora", "objective": "Cuenta lo que hay y encuentra la hora."},
    {"id": "confirma", "title": "Confirma el día", "objective": "Escucha la pregunta y responde en voz alta."},
]


def compile_410(base: dict, pack: dict, reviews: dict | None) -> dict:
    lesson = copy.deepcopy(base)
    url = lambda name: "/lesson-assets/" + name  # noqa: E731
    kept = {card["slide_id"]: card for card in base["cards"]}
    cards: list[dict] = []

    for slide, scene in KEPT_SCENES.items():
        card = copy.deepcopy(kept[slide])
        card["mission_chapter_id"] = "cuartos"
        card["mission_game"]["instruction_es"] = FIND_IT
        card["mission_game"]["validation"] = "ordered"
        if slide == "M01":
            card["mission_game"]["tutorial_mode"] = "guided-no-fail"
        card["mission_game"]["kind"] = "guided-search" if slide == "M01" else "crowd-search"
        card["audio_turns"] = [{"text": cue["text"], "speaker_role": "teacher", "image_url": url(scene)}
                               for cue in card["mission_game"]["cues"]]
        card["pedagogy_note"] = {
            "M01": "En la sala, encuentra a la familia y los muebles.",
            "M02": "En la cocina y el comedor, encuentra a quién y qué describe cada pista.",
            "M03": "En el cuarto, encuentra a la niña y los muebles.",
        }[slide]
        cards.append(card)

    for slide, chapter, asset, kind, instruction, purpose, lines in NEW_BEATS:
        scene = filename(pack, asset)
        geometry = (reviews or {}).get(asset, {}).get("targets", [])
        if len(geometry) != len(lines):
            raise ValueError(f"{slide}: every cue needs one measured target, in cue order.")
        options, targets, cues, turns = [], [], [], []
        for index, ((text, es, speaker), measured) in enumerate(zip(lines, geometry, strict=True), 1):
            identifier = f"{asset}-{index}"
            options.append(text_option(identifier, text))
            targets.append({"id": identifier, "label_es": es, "accepted_option_ids": [identifier],
                            "rect": measured["rect"], "head_anchors": measured["head_anchors"]})
            cues.append({"id": "cue-" + identifier, "text": text, "answer_text": text,
                         "target_id": identifier, "option_id": identifier})
            turns.append({"text": text, "speaker_role": speaker, "image_url": url(scene)})
        phrase = " ".join(text for text, _es, _speaker in lines)
        cards.append({"slide_id": slide, "mission_chapter_id": chapter, "interaction_type": "mission-game",
                      "stage": "Listen", "prompt": phrase, "prompt_image_url": url(scene), "options": options,
                      "correct_option_id": options[0]["id"], "correct_option_ids": [o["id"] for o in options],
                      "audio_text": phrase, "answer_audio_text": None, "audio_turns": turns,
                      "spanish_translation": " ".join(es for _text, es, _speaker in lines), "pedagogy_note": purpose,
                      "mission_game": {"kind": kind, "instruction_es": instruction, "validation": "ordered",
                                       "targets": targets, "cues": cues}})

    for index, (slide, key, question, asker, answer, es, purpose, response) in enumerate(GATES):
        response_name = response or filename(pack, f"{key}-response")
        card = {"slide_id": slide, "mission_chapter_id": "confirma",
                "interaction_type": "mission-finale" if index == len(GATES) - 1 else "mission-speak",
                "stage": "Speak", "prompt": answer, "prompt_image_url": "",
                "options": [{"id": f"{key}-response", "label": answer, "image_url": url(response_name)}],
                "correct_option_id": f"{key}-response", "audio_text": answer, "answer_audio_text": None,
                "audio_turns": [{"text": question, "speaker_role": asker,
                                 "image_url": url(filename(pack, f"{key}-question"))}],
                "spanish_translation": es, "pedagogy_note": purpose,
                "mission_game": {"kind": "voice-gate",
                                 "instruction_es": "Escucha la pregunta. Después lee la respuesta en voz alta.",
                                 "validation": "single", "cue_audio_text": question,
                                 "targets": [{"id": f"{key}-response", "label_es": es,
                                              "accepted_option_ids": [f"{key}-response"],
                                              "rect": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}}],
                                 "cues": [{"id": f"cue-{key}-response", "text": question, "answer_text": answer,
                                           "target_id": f"{key}-response", "option_id": f"{key}-response"}]}}
        cards.append(card)

    for index, card in enumerate(cards, 1):
        card["pedagogy_note"] = f"Mission beat {index:02d}/{len(cards):02d}: " + card["pedagogy_note"]
    lesson["cards"] = cards
    title = "Un día en casa"
    lesson.update(
        title="4.10 " + title, sub_lesson_title=title, content_revision=3,
        unit_outcome="Prepare a day at home: find the family in each room, locate belongings, follow the routine, and "
                     "confirm the time and the day.",
        goal="Help the family get the house and the day ready: find who is in each room, say where each thing is, "
             "follow the morning routine, count what the dining room has, read the clocks, and answer four questions "
             "aloud.",
        grammar_function="This/That is the + room; subject + be + in/on the + room; there is / there are; in, on, "
                         "under, next to; I + daily action; first, then, every day; in the morning / afternoon, at "
                         "night; on + day; It is ... o'clock.",
        prerequisite="Lessons 4.1-4.9 completed.",
        speaking_outcome="Answer four questions aloud: the time, where a book is, a morning routine, and the day you "
                         "study English.",
        purposeful_review_slides=[card["slide_id"] for card in cards])
    lesson["mission"] = {
        "label": "MISIÓN FINAL · UNIDAD 4", "title": title,
        "briefing": "Hoy la familia prepara su día en casa. Escucha cada pista y toca a la persona, el mueble o el "
                    "objeto que describe: los cuartos, dónde quedó cada cosa, la rutina de la mañana y la hora. Al "
                    "final, responde cuatro preguntas en voz alta. Primero escucha la frase completa; después toca.",
        "kickoff_image_url": url(filename(pack, "kickoff")),
        "objectives": ["Encuentra a cada quien en su cuarto", "Di dónde está cada cosa", "Confirma la hora y el día"],
        "completion_title": "¡La casa y el día están listos!",
        "completion_message": "Encontraste a la familia en cada cuarto, ubicaste cada objeto, seguiste la rutina de la "
                              "mañana y confirmaste la hora y el día en voz alta.",
        "chapters": CHAPTERS,
        "voice_heading": "CONFIRMA EL DÍA",
        "voice_instruction": "Escucha la pregunta y responde en voz alta",
        "voice_success_label": "RESPUESTA CONFIRMADA",
    }
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["4.10"].parent.glob("*.yaml"))
                   if path not in (LESSONS["4.9"], LESSONS["4.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# ------------------------------------------------------------ validation
def validate(lessons: dict) -> None:
    from backend.app.schemas import Lesson, MissionLesson

    Lesson.model_validate(lessons["4.9"])
    MissionLesson.model_validate(lessons["4.10"])


def read_base(path: Path, ref: str | None) -> dict:
    if ref is None:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    import subprocess

    text = subprocess.check_output(["git", "show", f"{ref}:{path.relative_to(ROOT).as_posix()}"],
                                   cwd=ROOT, encoding="utf-8")
    return json.loads(text.lstrip("﻿"))


def placeholder_geometry(count: int) -> list[dict]:
    width = 0.8 / count
    return [{"rect": {"x": 0.05 + index * (width + 0.01), "y": 0.2, "width": width, "height": 0.6},
             "head_anchors": [{"x": 0.05 + index * (width + 0.01) + width / 2, "y": 0.22}]} for index in range(count)]


def compile_all(pack_map: dict, draft: bool, base_ref: str | None = None) -> dict:
    bases = {number: read_base(path, base_ref) for number, path in LESSONS.items()}
    reviews: dict | None = None
    if draft:
        reviews = {asset: {"targets": placeholder_geometry(4)} for _s, _c, asset, *_rest in NEW_BEATS}
    else:
        from scripts.render_course_stills import pack_output_directory

        path = pack_output_directory(pack_map["4.10"]) / "agent-reviews.json"
        reviews = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    lessons = {"4.9": compile_49(bases["4.9"], pack_map["4.9"]),
               "4.10": compile_410(bases["4.10"], pack_map["4.10"], reviews)}
    validate(lessons)
    return lessons


def install(pack_map: dict, lessons: dict) -> None:
    before = {number: path.read_bytes() for number, path in LESSONS.items()}
    staged = {}
    for number, pack in pack_map.items():
        reviews, records = reviewed_assets(pack)
        attempts, rejected = paid_attempts(pack, reviews, {record["asset_id"] for record in records})
        staged[number] = (pack, reviews, records, attempts, rejected, stage_images(pack, records))
    for number, path in LESSONS.items():
        if path.read_bytes() != before[number]:
            raise ValueError(f"Concurrent canonical edit of {number}; stop.")
    for number, (pack, reviews, records, attempts, rejected, exports) in staged.items():
        kind = {"4.9": "review", "4.10": "mission"}[number]
        archive = ROOT / "docs" / "qa" / f"unit-4-{kind}-media-v1.json"
        install_images(pack, exports, records, rejected, archive)
        write_json(archive, {"schema_version": 1, "pack_sha256": pack.get("pack_sha256"), "lesson_id": pack["lesson_id"],
                             "human_approval": "pending", "assets": records, "paid_attempts": attempts})
    for number, path in LESSONS.items():
        path.write_text(json.dumps(lessons[number], ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


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
        print("review exceptions added:", prepare_review_exceptions(pack_map["4.9"]))
        return 0
    lessons = compile_all(pack_map, draft=args.draft, base_ref=args.base_ref)
    print(json.dumps({"cards": {number: len(lesson["cards"]) for number, lesson in lessons.items()},
                      "draft": args.draft, "write": args.write}))
    rendered = {number: json.dumps(lesson, ensure_ascii=False, indent=2) + "\n" for number, lesson in lessons.items()}
    if args.check:
        stale = [number for number, path in LESSONS.items()
                 if path.read_text(encoding="utf-8-sig").replace("\r\n", "\n") != rendered[number]]
        if stale:
            raise SystemExit(f"Installed lessons differ from the builder: {stale}")
        print("Installed Unit 4 lessons match the builder.")
        return 0
    if args.lessons_only:
        if args.draft or not args.base_ref:
            raise ValueError("--lessons-only needs --base-ref and measured geometry.")
        for number, path in LESSONS.items():
            path.write_text(rendered[number], encoding="utf-8", newline="\n")
        print("Rewrote Unit 4 lesson files; run the media preservation audit next.")
        return 0
    if args.write:
        if args.draft:
            raise ValueError("Never install draft geometry.")
        install(pack_map, lessons)
        print("Installed Unit 4 lessons and stills. Audio, manifests, snapshots and device QA remain required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
