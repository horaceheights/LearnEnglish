"""Bring Unit 7 to the Unit 1 mission standard: a fresh 7.9 review and a 13-beat 7.10 capstone mission.

The review keeps no exact-byte teaching image: it keeps the 24 review-only stills
Unit 7 already owns and adds twelve fresh review scenes for body parts, feelings,
needs, clothing, weather with matching gear, hobbies and communication repair.
The mission is rebuilt from three stub beats to nine listening scenes and four
question-and-answer voice gates, each with its own mission-only still, because
the approved photo edits of the stub courtyard, hall and podium scenes pin those
cards exactly as inspected.

Modes mirror the earlier unit builders: --check re-derives the installed lessons
from a pre-rebuild base, --draft validates with placeholder geometry,
--lessons-only rewrites them, and --write installs reviewed stills.
"""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.audit_course_media_preservation import BASELINE, IMAGE_ROOTS, PLANS  # noqa: E402
from scripts.parity_pack import (  # noqa: E402
    install_images, paid_attempts, prepare_review_exceptions, register_photoreal, reviewed_assets, stage_images,
    write_json,
)
from scripts.render_course_stills import digest  # noqa: E402

LESSONS = {
    "7.9": ROOT / "backend" / "lessons" / "unit_7" / "lesson-7-9-complete-a1-review.yaml",
    "7.10": ROOT / "backend" / "lessons" / "unit_7" / "lesson-7-10-a1-final-mission.yaml",
}
PACKS = {
    "7.9": ROOT / "docs" / "product" / "unit-7-review-pack.json",
    "7.10": ROOT / "docs" / "product" / "unit-7-mission-pack.json",
}
ARCHIVE = ROOT / "Lessons" / "Lesson1" / "images" / "course-photoreal-sources" / "unit-7"

# Review-only stills Unit 7 already owns; no teaching card uses these bytes.
EXISTING_REVIEW = {
    "book-under-table": "a1_photo_u7_review_book_under_table_v1.webp",
    "children": "a1_photo_u7_review_children_v1.webp",
    "four-blue-chairs": "a1_photo_u7_review_four_blue_chairs_v2.webp",
    "four-red-chairs": "a1_photo_u7_review_four_red_chairs_v2.webp",
    "parents": "a1_photo_u7_review_parents_v1.webp",
    "station": "a1_photo_u7_review_station_v1.webp",
    "three-blue-chairs": "a1_photo_u7_review_three_blue_chairs_v2.webp",
    "three-red-books": "a1_photo_u7_review_three_red_books_v1.webp",
    "wakes-morning": "a1_photo_u7_review_wakes_morning_v1.webp",
    "boy-book-park": "a1_scene_a-boy-a-book-a-park_b812e12.webp",
    "five-blue-chairs": "a1_scene_five-blue-chairs_2a951fc_four-card.webp",
    "food-bank-sunny": "a1_scene_food-the-bank-it-is-sunny_6a1f116.webp",
    "tired-need-help": "a1_scene_i-am-tired-i-need-help_788b204.webp",
    "apples-water": "a1_scene_i-like-apples-water-please_0c2bcf0.webp",
    "wake-up-morning": "a1_scene_i-wake-up-in-the-morning_8586957.webp",
    "left-only-hospital": "a1_scene_left-only-hospital_4f9affe_four-card.webp",
    "name-day": "a1_scene_my-name-my-day_d5d5c59.webp",
    "straight-left-bank": "a1_scene_straight-left-bank_11f5a88_four-card.webp",
    "straight-left-hospital": "a1_scene_straight-left-hospital_d4ea009_four-card.webp",
    "straight-right-hospital": "a1_scene_straight-right-hospital_9271c5a_four-card.webp",
    "woman-reading": "a1_scene_woman-reading_6702805.webp",
    "woman-writing": "a1_scene_woman-writing_ffec6b1.webp",
    "five-green-pens": "a1_use_five_green_pens_photo_v1.webp",
    "listen-and-choose": "a1_scene_listen-and-choose_520049e.webp",
}

REBUILD = ("The three-beat stub mission is rebuilt to the approved Unit 7 contract: nine listening scenes and four "
           "question-and-answer voice gates replace it, and every beat is re-authored, so this scene and the "
           "approved photo edit pinned to its stub card stop being bound.")

# Stub mission scenes the rebuild stops binding. Their files and inspected full-frame edits stay on disk.
RETIRED = {
    "a1_u7_scene_01_courtyard.webp": ("weather-prep", REBUILD,
        "Inspected: the stub mission's courtyard hotspot scene; kept byte-for-byte together with its inspected full-frame edit."),
    "a1_u7_scene_02_entrance_hall.webp": ("clothing-line", REBUILD,
        "Inspected: the stub mission's entrance hall hotspot scene; kept byte-for-byte together with its inspected full-frame edit."),
    "a1_u7_scene_03_stage_podium.webp": ("feelings-question", REBUILD,
        "Inspected: the stub mission's podium scene used by its only voice gate; kept byte-for-byte together with its inspected full-frame edit."),
}
KICKOFF_RETIRED = {
    "a1_u7_mission_kickoff.webp": ("kickoff", REBUILD,
        "Inspected: the stub mission's kickoff shot; the original file stays byte-for-byte on disk "
        "and in every archive copy, and only its Lesson 7.10 binding changes."),
}

# Exact-byte repeats of earlier teaching photographs that the old review still bound, and the
# bound review still that now carries the same language.
REVIEW_REPEATS = {
    "a1_scene_are_5f9e580.webp": "a1_u7_review_v1_hobbies_music.webp",
    "a1_scene_five_4db2c1d.webp": "a1_u7_review_v1_happy_person.webp",
    "a1_scene_her-name-is-ana_b0f00a0.webp": "a1_u7_review_v1_happy_person.webp",
    "a1_scene_i-do-not-like-fish_25804e6.webp": "a1_u7_review_v1_hungry_person.webp",
    "a1_scene_it-is-cold-i-need-a-jacket_181fae6.webp": "a1_u7_review_v1_cold_windy_jacket.webp",
    "a1_scene_jacket_1cdbba9.webp": "a1_u7_review_v1_cold_windy_jacket.webp",
    "a1_scene_my-name-is-ana-i-am-from-mexico_0ddbe00.webp": "a1_u7_review_v1_happy_person.webp",
    "a1_scene_my_3ece147.webp": "a1_u7_review_v1_head_arms_hands.webp",
    "a1_scene_not_557f255.webp": "a1_u7_review_v1_please_repeat.webp",
    "a1_scene_please-repeat_50ab734.webp": "a1_u7_review_v1_please_repeat.webp",
    "a1_scene_please-speak-slowly_f0a8349.webp": "a1_u7_review_v1_please_repeat.webp",
    "a1_scene_right_d27a1f1.webp": "a1_u7_review_v1_please_repeat.webp",
    "a1_scene_sleeps-at-night_62c7b85.webp": "a1_u7_review_v1_tired_person.webp",
    "a1_scene_turn-right_e21c99d.webp": "a1_u7_review_v1_please_repeat.webp",
    "a1_scene_under_dad64cc.webp": "a1_u7_review_v1_legs_feet.webp",
}


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


# ---------------------------------------------------------------------- 7.9
def compile_79(base: dict, pack: dict) -> dict:
    lesson = copy.deepcopy(base)
    cards: list[dict] = []

    def image(asset_id: str) -> str:
        return EXISTING_REVIEW.get(asset_id) or filename(pack, asset_id)

    def teach(sid, text, es, asset, speaker=None, note="fresh review station", turns=None):
        card = {"slide_id": sid, "interaction_type": "teach", "prompt": text, "stage": "Learn",
                "correct_option_id": slug(text) + "-1",
                "options": [{"id": slug(text) + "-1", "image_url": image(asset), "label": text}],
                "audio_text": text, "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": es, "pedagogy_note": note}
        if turns:
            card["audio_turns"] = [{"text": line, "speaker_role": role, "image_url": image(frame)}
                                   for line, role, frame in turns]
        elif speaker:
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

    def listen_images(sid, text, es, correct_asset, others, note, speaker=None):
        assets = [correct_asset, *others]
        options = [{"id": f"{asset}-{index + 1}", "image_url": image(asset), "label": None}
                   for index, asset in enumerate(assets)]
        options = [options[index] for index in interleave(assets)]
        card = {"slide_id": sid, "interaction_type": "listen-image", "prompt": "Listen and choose.",
                "stage": "Listen", "correct_option_id": f"{correct_asset}-1", "options": options,
                "audio_text": text, "answer_audio_text": None, "prompt_image_url": "",
                "spanish_translation": es, "pedagogy_note": note}
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

    # Station 1: Foundational spiral review (Units 1-4)
    teach("L1", "A boy. A book. A park.", "Un niño. Un libro. Un parque.", "boy-book-park")
    teach("L2", "My name. My day.", "Mi nombre. Mi día.", "name-day")
    teach("L3", "Food. The bank. It is sunny.", "Comida. El banco. Está soleado.", "food-bank-sunny")
    teach("L4", "Listen and choose.", "Escucha y elige.", "listen-and-choose")
    # Station 2: Body parts, feelings and clothing (7.1-7.3)
    teach("L5", "My head, my eyes, and my ears.", "Mi cabeza, mis ojos y mis orejas.", "head-arms-hands")
    teach("L6", "I am happy, not sad.", "Estoy feliz, no triste.", "happy-person")
    teach("L7", "I am hungry and thirsty.", "Tengo hambre y sed.", "hungry-person")
    teach("L8", "A blue dress and a green skirt.", "Un vestido azul y una falda verde.", "dress-skirt")

    empty_recognize("R1", "My arms and hands.", "My eyes and ears.", "Elige la frase correcta.", "head-arms-hands", True)
    empty_recognize("R2", "I am happy.", "I am sad.", "Elige la frase correcta.", "happy-person", True)
    image_to_text("R3", "How are you?", "I am thirsty.", "¿Cómo estás?", "thirsty-person",
                  ["I am thirsty.", "I am hungry."])
    text_to_image("R4", "A blue dress.", "Un vestido azul.", "dress-skirt", "legs-feet", True)
    empty_recognize("R5", "It is rainy.", "It is sunny.", "Elige la frase correcta.", "rainy-umbrella-boots", True)
    text_to_image("R6", "I need a jacket.", "Necesito una chamarra.", "cold-windy-jacket", "sunny-hot-hat", True)
    image_to_text("R7", "Do you want to listen to music?", "I like listening to music.",
                  "¿Quieres escuchar música?", "hobbies-music",
                  ["I like listening to music.", "I do not like music."], speaker="male-character")
    empty_recognize("R8", "Please repeat.", "Where is the bathroom?", "Elige la frase correcta.", "please-repeat", False)

    listen_image("N1", "My arms and hands.", "Mis brazos y manos.", "head-arms-hands", "legs-feet", True)
    listen_image("N2", "I am tired.", "Estoy cansado.", "tired-person", "happy-person", True, "male-character")
    listen_image("N3", "I am hungry.", "Tengo hambre.", "hungry-person", "thirsty-person", True)
    listen_image("N4", "A green skirt.", "Una falda verde.", "dress-skirt", "parents", True)
    listen_image("N5", "It is cold and windy.", "Está frío y ventoso.", "cold-windy-jacket", "book-under-table", True)
    listen_image("N6", "I need an umbrella.", "Necesito un paraguas.", "rainy-umbrella-boots", "cold-windy-jacket", True)
    listen_image("N7", "I like listening to music.", "Me gusta escuchar música.", "hobbies-music", "wakes-morning", True, "male-character")
    listen_image("N8", "Please repeat.", "Por favor repite.", "please-repeat", "station", True)

    listen_images("N9", "Four blue chairs.", "Cuatro sillas azules.", "four-blue-chairs",
                  ["four-red-chairs", "three-blue-chairs", "five-blue-chairs"],
                  "four chair counts to distinguish; dedicated review stills kept in a four-card set")
    listen_images("N10", "Three red books.", "Tres libros rojos.", "three-red-books",
                  ["book-under-table", "parents", "children"],
                  "retrieval of objects, counts and people across distinct review photographs")
    listen_images("N11", "A woman reading.", "Una mujer leyendo.", "woman-reading",
                  ["woman-writing", "boy-book-park", "name-day"],
                  "retrieval of people and actions across preserved review scenes")
    listen_images("N12", "Straight and right.", "Derecho y a la derecha.", "straight-right-hospital",
                  ["straight-left-hospital", "straight-left-bank", "left-only-hospital"],
                  "retrieval of hospital and bank directions across preserved review scenes")

    retrieval_note = "audio-to-English retrieval without a picture"
    listen_text("N13", "Please speak slowly.", "Por favor habla despacio.",
                ["Please speak slowly.", "Please repeat.", "Where is the bathroom?"], retrieval_note)
    listen_text("N14", "Do you want to play?", "¿Quieres jugar?",
                ["Do you want to play?", "Do you want to read?", "Do you want to watch TV?"], retrieval_note)
    listen_text("N15", "Yes, thank you.", "Sí, gracias.",
                ["Yes, thank you.", "Sorry, no.", "Please repeat."], retrieval_note)
    listen_text("N16", "I do not understand.", "No entiendo.",
                ["I do not understand.", "I need help.", "Please speak slowly."], retrieval_note)
    listen_text("N17", "Where is the bathroom?", "¿Dónde está el baño?",
                ["Where is the bathroom?", "Where is the station?", "Where is the park?"], retrieval_note)
    listen_text("N18", "It is sunny and hot.", "Está soleado y caluroso.",
                ["It is sunny and hot.", "It is rainy and cold.", "It is windy and cloudy."], retrieval_note)

    speak("S1", "My head, my mouth, and my feet.", "Mi cabeza, mi boca y mis pies.", "head-arms-hands")
    speak("S2", "I am happy and thirsty.", "Estoy feliz y con sed.", "thirsty-person")
    speak("S3", "I wake up in the morning.", "Me despierto en la mañana.", "wake-up-morning")
    speak("S4", "I like apples. Water, please.", "Me gustan las manzanas. Agua, por favor.", "apples-water")
    speak("S5", "It is cold and windy.", "Está frío y ventoso.", "cold-windy-jacket")
    speak("S6", "I am tired. I need help.", "Estoy cansado. Necesito ayuda.", "tired-need-help")

    guided("U1", "My ___ ___ ___.", ["arms", "and", "hands"], "My arms and hands.", "Mis brazos y manos.", "head-arms-hands")
    guided("U2", "___ am ___.", ["I", "happy"], "I am happy.", "Estoy feliz.", "happy-person")
    guided("U3", "There are five ___ ___.", ["green", "pens"], "There are five green pens.", "Hay cinco bolígrafos verdes.", "five-green-pens")
    guided("U4", "A blue ___ and a green ___.", ["dress", "skirt"], "A blue dress and a green skirt.", "Un vestido azul y una falda verde.", "dress-skirt")

    construct("U5", "I am tired.", "Estoy cansado.", "tired-person", "male-character")
    construct("U6", "It is sunny.", "Está soleado.", "sunny-hot-hat")
    construct("U7", "I like music.", "Me gusta la música.", "hobbies-music", "male-character")
    construct("U8", "Please repeat.", "Por favor repite.", "please-repeat")

    lesson["cards"] = cards
    lesson.update(
        goal="Retrieve Unit 7 body parts, feelings, needs, clothes, weather, leisure, invitations, and repair language "
             "from fresh review scenes, with no new vocabulary.",
        unit_outcome="Consolidate all A1 foundational competencies: introduce oneself, describe people and objects, "
                     "state feelings and needs, discuss routines and weather, give simple directions, and handle "
                     "everyday communication repair.",
        grammar_function="Spiral review of body nouns, feel/state adjectives, weather adjectives, need expressions, "
                         "hobby verbs, invitation formulas, and communication repair phrases across A1.",
        speaking_outcome="State physical feelings and needs, describe weather and clothing, extend or accept invitations, "
                         "and ask for repetition or help politely.",
        prerequisite="Lessons 7.1 to 7.8.",
        purposeful_review_slides=["L1", "R3", "R6", "N7", "N12", "N14", "S5", "U8"])
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["7.9"].parent.glob("*.yaml"))
                   if path not in (LESSONS["7.9"], LESSONS["7.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# --------------------------------------------------------------------- 7.10
WHO_SAYS = "Escucha la frase y toca a la persona que la dice."
FIND_IT = "Escucha la pista en inglés y toca la respuesta."

NEW_BEATS = [
    ("M01", "clima", "weather-prep", "guided-search", FIND_IT,
     "Revisa el clima para la salida: toca la estación según lo que escuchas.",
     [("It is sunny. It is hot. I need a hat.", "Está soleado. Hace calor. Necesito un sombrero.", "teacher"),
      ("It is rainy. I need an umbrella.", "Está lluvioso. Necesito un paraguas.", "teacher"),
      ("It is windy. It is cold. I need a jacket.", "Está ventoso. Hace frío. Necesito una chamarra.", "teacher"),
      ("It is cloudy. I need boots.", "Está nublado. Necesito botas.", "teacher")]),

    ("M02", "ropa", "clothing-line", "crowd-search", FIND_IT,
     "Encuentra qué ropa lleva cada persona en la reunión familiar.",
     [("She has a red dress.", "Ella tiene un vestido rojo.", "teacher"),
      ("He has a yellow shirt.", "Él tiene una camisa amarilla.", "teacher"),
      ("She has a blue jacket and a green skirt.", "Ella tiene una chamarra azul y una falda verde.", "teacher"),
      ("He has blue pants and black shoes.", "Él tiene pantalones azules y zapatos negros.", "teacher")]),

    ("M03", "estados", "feelings", "action-hunt", WHO_SAYS,
     "Escucha cómo se siente cada familiar antes de comenzar las actividades.",
     [("I am happy.", "Estoy feliz.", "female-character"),
      ("I am tired.", "Estoy cansado.", "male-character"),
      ("I am hungry.", "Tengo hambre.", "male-character"),
      ("I am thirsty.", "Tengo sed.", "female-character")]),

    ("M04", "cuerpo", "body-health", "guided-search", WHO_SAYS,
     "En la zona de bienestar, toca a quien muestra cada parte del cuerpo.",
     [("My head.", "Mi cabeza.", "male-character"),
      ("My eyes and ears.", "Mis ojos y orejas.", "female-character"),
      ("My hands and arms.", "Mis manos y brazos.", "male-character"),
      ("My legs and feet.", "Mis piernas y pies.", "female-character")]),

    ("M05", "pasatiempos", "hobbies", "contrast-hunt", WHO_SAYS,
     "Escucha qué le gusta y qué no le gusta hacer a cada familiar en el parque.",
     [("I like reading.", "Me gusta leer.", "male-character"),
      ("I like playing.", "Me gusta jugar.", "male-character"),
      ("I like listening to music.", "Me gusta escuchar música.", "female-character"),
      ("I do not like watching TV.", "No me gusta ver televisión.", "male-character")]),

    ("M06", "invitaciones", "invitations", "action-hunt", WHO_SAYS,
     "Cuatro amigos se invitan y responden: toca a quien corresponde cada frase.",
     [("Do you want to play?", "¿Quieres jugar?", "male-character"),
      ("Yes, thank you.", "Sí, gracias.", "male-character"),
      ("Do you want to read?", "¿Quieres leer?", "female-character"),
      ("Sorry, no.", "Lo siento, no.", "female-character")]),

    ("M07", "mesa", "table-refreshments", "crowd-search", FIND_IT,
     "En la mesa de comida y bebidas, encuentra la hora, el precio y las cosas.",
     [("It is five o'clock.", "Son las cinco en punto.", "teacher"),
      ("How much is it?", "¿Cuánto cuesta?", "teacher"),
      ("Water, please.", "Agua, por favor.", "teacher"),
      ("Three red apples.", "Tres manzanas rojas.", "teacher")]),

    ("M08", "ayuda", "communication-help", "action-hunt", WHO_SAYS,
     "Escucha a las personas pidiendo ayuda o aclaraciones en la fiesta.",
     [("I need help.", "Necesito ayuda.", "female-character"),
      ("I do not understand.", "No entiendo.", "male-character"),
      ("Please repeat.", "Por favor repite.", "female-character"),
      ("Please speak slowly.", "Por favor habla despacio.", "male-character")]),

    ("M09", "indicaciones", "navigation", "guided-search", FIND_IT,
     "Ubica el baño, las direcciones del camino y al abuelo.",
     [("Where is the bathroom?", "¿Dónde está el baño?", "teacher"),
      ("Go straight.", "Sigue derecho.", "teacher"),
      ("Turn right.", "Gira a la derecha.", "teacher"),
      ("Who is he? He is the grandfather.", "¿Quién es él? Es el abuelo.", "teacher")]),
]

GATES = [
    ("M10", "feelings", "What is your name? How are you?", "female-character",
     "My name is Alex. I am happy.", "Mi nombre es Alex. Estoy feliz.",
     "La anfitriona te da la bienvenida; preséntate y dile cómo estás.", None),
    ("M11", "bathroom", "Excuse me. Where is the bathroom?", "male-character",
     "Go straight. Turn left.", "Sigue derecho. Gira a la izquierda.",
     "Un invitado busca el baño; dale las indicaciones claras.", None),
    ("M12", "purchase", "Hello. How are you?", "female-character",
     "I am thirsty. Juice, please.", "Tengo sed. Jugo, por favor.",
     "En el puesto de bebidas la vendedora te saluda; dile cómo estás y pide tu jugo cortésmente.", None),
    ("M13", "invitation", "Do you want to listen to music?", "male-character",
     "Yes, thank you. I like music.", "Sí, gracias. Me gusta la música.",
     "El músico te invita al concierto final; responde con entusiasmo para completar el nivel A1.", None),
]

CHAPTERS = [
    {"id": "clima", "title": "El clima y la salida", "objective": "Escucha el clima y qué ropa o accesorio se necesita."},
    {"id": "ropa", "title": "La vestimenta", "objective": "Escucha qué prenda lleva cada persona y tócala."},
    {"id": "estados", "title": "¿Cómo nos sentimos?", "objective": "Escucha el estado de ánimo o necesidad física de cada familiar."},
    {"id": "cuerpo", "title": "El cuerpo y la salud", "objective": "Escucha la parte del cuerpo y tócala en la escena."},
    {"id": "pasatiempos", "title": "Pasatiempos y descanso", "objective": "Escucha qué le gusta y qué no le gusta hacer a cada persona."},
    {"id": "invitaciones", "title": "Invitaciones entre amigos", "objective": "Escucha quién invita, quién acepta y quién rechaza amablemente."},
    {"id": "mesa", "title": "La mesa de refrigerios", "objective": "Confirma la hora, el precio, las bebidas y la fruta."},
    {"id": "ayuda", "title": "Pedir ayuda y entender", "objective": "Escucha quién pide ayuda, repetición o habla pausada."},
    {"id": "indicaciones", "title": "Ubicación y camino", "objective": "Ubica el baño, sigue las direcciones e identifica al abuelo."},
    {"id": "pregunta", "title": "Pregunta y responde", "objective": "Escucha cada pregunta y responde en voz alta para superar el reto final A1."},
]


def compile_710(base: dict, pack: dict, reviews: dict | None) -> dict:
    lesson = copy.deepcopy(base)
    url = lambda name: "/lesson-assets/" + name  # noqa: E731
    cards: list[dict] = []

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
        if slide == "M01":
            cards[-1]["mission_game"]["tutorial_mode"] = "guided-no-fail"

    for index, (slide, key, question, asker, answer, es, purpose, response) in enumerate(GATES):
        response_name = response or filename(pack, f"{key}-response")
        card = {"slide_id": slide, "mission_chapter_id": "pregunta",
                "interaction_type": "mission-finale" if index == len(GATES) - 1 else "mission-speak",
                "stage": "Speak", "prompt": answer, "prompt_image_url": "",
                "options": [{"id": f"{key}-response", "label": answer, "image_url": url(response_name)}],
                "correct_option_id": f"{key}-response", "audio_text": answer, "answer_audio_text": None,
                "audio_turns": [{"text": question, "speaker_role": asker,
                                 "image_url": url(filename(pack, f"{key}-question"))}],
                "spanish_translation": es, "pedagogy_note": f"Mission beat {index + 10:02d}/13: {purpose}",
                "mission_game": {
                    "kind": "voice-gate",
                    "instruction_es": "Escucha la frase. Después lee la respuesta en voz alta.",
                    "validation": "single", "cue_audio_text": question,
                    "targets": [{"id": f"{key}-response", "label_es": es,
                                 "accepted_option_ids": [f"{key}-response"],
                                 "rect": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}}],
                    "cues": [{"id": f"cue-{key}-response", "text": question, "answer_text": answer,
                              "target_id": f"{key}-response", "option_id": f"{key}-response"}]}}
        cards.append(card)

    for index, card in enumerate(cards[:len(NEW_BEATS)], 1):
        card["pedagogy_note"] = f"Mission beat {index:02d}/13: {card['pedagogy_note']}"

    lesson["cards"] = cards
    title = "Gran misión de familia"
    lesson["title"] = f"7.10 {title}"
    lesson["sub_lesson_title"] = title
    lesson["experience_type"] = "mission"
    lesson["mission"] = {
        "label": "MISIÓN FINAL · NIVEL A1", "title": title,
        "briefing": "Última misión del nivel A1: acompaña a la familia en la gran celebración y salida al parque. "
                    "Escucha cada pista y toca el clima, la ropa, cómo se siente cada persona, las actividades y las indicaciones. "
                    "Al final, responde cuatro veces en voz alta para completar tu certificación A1.",
        "kickoff_image_url": url(filename(pack, "kickoff")),
        "objectives": ["Verifica el clima y la ropa", "Sigue las acciones y sentimientos", "Responde cuatro veces en voz alta"],
        "completion_title": "¡Nivel A1 Completado!",
        "completion_message": "¡Felicidades! Superaste todos los desafíos de la gran misión familiar, demostraste tu comprensión auditiva "
                              "y hablaste en inglés con confianza en todo el nivel A1.",
        "chapters": CHAPTERS,
        "voice_heading": "COMPLETA TU RETO A1",
        "voice_instruction": "Responde en voz alta para terminar",
        "voice_success_label": "RETO SUPERADO",
    }
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["7.10"].parent.glob("*.yaml"))
                   if path not in (LESSONS["7.9"], LESSONS["7.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# ------------------------------------------------------------ validation
def validate(lessons: dict) -> None:
    from backend.app.schemas import Lesson, MissionLesson

    Lesson.model_validate(lessons["7.9"])
    MissionLesson.model_validate(lessons["7.10"])


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

        path = pack_output_directory(pack_map["7.10"]) / "agent-reviews.json"
        reviews = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    lessons = {"7.9": compile_79(bases["7.9"], pack_map["7.9"]),
               "7.10": compile_710(bases["7.10"], pack_map["7.10"], reviews)}
    validate(lessons)
    return lessons


def dropped_review_bindings() -> set[str]:
    """Baseline 7.9 bindings the rebuilt review drops and no existing exception still covers."""
    from scripts.audit_course_media_preservation import images, lessons as current_lessons

    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
    bound = images(current_lessons(ROOT)["lesson-7-9-complete-a1-review"])
    cards = current_lessons(ROOT)["lesson-7-9-complete-a1-review"]["cards"]

    def still_valid(plan):
        if plan["issue"] != "use-image-contradicts-sentence":
            return True
        named = [card for card in cards if card.get("slide_id") == plan.get("slide_id") and card.get("stage") == "Use"]
        return bool(named) and Path(str(named[0].get("prompt_image_url") or "")).name == plan["new_filename"]

    covered = {plan["old_filename"] for plan in plans
               if plan["lesson_id"] == "lesson-7-9-complete-a1-review" and still_valid(plan)
               and {plan["new_filename"], *plan.get("alternative_filenames", [])} & bound}
    return (set(baseline["lesson_bindings"].get("lesson-7-9-complete-a1-review", [])) - bound) - covered


def record_plans(pack_map: dict, baseline: dict) -> None:
    """Restate every Unit 7 exception the rebuild changes; originals stay byte-for-byte."""
    plans = json.loads(PLANS.read_text(encoding="utf-8"))
    mission, review = pack_map["7.10"], pack_map["7.9"]
    restated = ({(mission["lesson_id"], old) for old in RETIRED}
                | {(review["lesson_id"], old) for old in REVIEW_REPEATS})
    keep = [plan for plan in plans["changes"]
            if (plan["lesson_id"], plan["old_filename"]) not in restated]
    for old, (replacement, issue, _observation) in RETIRED.items():
        keep.append({"lesson_id": mission["lesson_id"], "old_filename": old,
                     "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                     "new_filename": filename(mission, replacement), "issue": "mission-rebuild-retires-scene",
                     "issue_detail": issue, "evidence_file": "docs/qa/unit-7-mission-media-v1.json",
                     "source_provenance": baseline["assets"][old]["provenance"],
                     "original_action": "preserve-byte-for-byte"})
    for old in sorted(REVIEW_REPEATS):
        keep.append({"lesson_id": review["lesson_id"], "old_filename": old,
                     "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                     "new_filename": REVIEW_REPEATS[old], "issue": "review-reuses-earlier-image",
                     "issue_detail": "Lesson 7.9 bound the exact bytes an earlier teaching card already uses; "
                                     "the rebuilt review retrieves the same language from a review-only "
                                     "photograph instead. Every original file and earlier teaching use is kept.",
                     "source_provenance": baseline["assets"][old]["provenance"],
                     "original_action": "preserve-byte-for-byte"})
    plans["changes"] = keep
    write_json(PLANS, plans)


def record_superseded_edits(mission: dict) -> None:
    """Retire the approved full-frame edits of the stub mission's three scenes."""
    from scripts.mission_photo_edit_contract import EVIDENCE, SUPERSEDED

    edits = json.loads((ROOT / EVIDENCE).read_text(encoding="utf-8"))["assets"]
    path = ROOT / SUPERSEDED
    data = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {"schema_version": 1, "superseded": []}
    for record in edits:
        if record["lesson_id"] != mission["lesson_id"] or record["old_filename"] not in RETIRED:
            continue
        row = {"lesson_id": record["lesson_id"], "slide_id": record["slide_id"],
               "candidate_filename": record["candidate_filename"],
               "superseded_by": "docs/qa/unit-7-mission-media-v1.json",
               "reason": "The Unit 7 stub mission was rebuilt to the approved parity contract; its three beats "
                         "became nine listening scenes and four voice gates, so this re-authored beat binds its "
                         "own mission-only still and the edited scene stops being bound."}
        if row not in data["superseded"]:
            data["superseded"].append(row)
    write_json(path, data)


def record_target_reviews(lesson: dict, records: list[dict]) -> None:
    """Pin every measured group anchor set to the exact image bytes it was read from."""
    path = ROOT / "docs" / "qa" / "units-2-7-mission-target-reviews.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    history = data.setdefault("superseded_reviews", [])
    for row in data["reviews"]:
        if row["lesson_id"] == lesson["id"] and row not in history:
            history.append(row)
    data["reviews"] = [row for row in data["reviews"] if row["lesson_id"] != lesson["id"]]
    by_name = {record["runtime_filename"]: record for record in records}
    for card in lesson["cards"]:
        game = card.get("mission_game") or {}
        groups = {target["id"]: target["head_anchors"] for target in game.get("targets", [])
                  if len(target.get("head_anchors") or []) > 1}
        name = Path(card.get("prompt_image_url", "")).name
        if groups and name in by_name:
            data["reviews"].append({"lesson_id": lesson["id"], "slide_id": card["slide_id"], "filename": name,
                                    "sha256": by_name[name]["runtime_sha256"], "targets": groups,
                                    "note": by_name[name]["agent_review"]["notes"]})
    write_json(path, data)


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
    for number, (pack, _reviews, records, _attempts, rejected, exports) in staged.items():
        kind = {"7.9": "review", "7.10": "mission"}[number]
        install_images(pack, exports, records, rejected, ARCHIVE / f"{kind}-v1")
        register_photoreal(exports)
    for number, path in LESSONS.items():
        path.write_text(json.dumps(lessons[number], ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    for number, (pack, _reviews, records, attempts, _rejected, _exports) in staged.items():
        kind = {"7.9": "review", "7.10": "mission"}[number]
        proof = {"schema_version": 1, "pack_sha256": digest(PACKS[number]), "lesson_id": pack["lesson_id"],
                 "human_approval": "pending", "assets": records, "paid_attempts": attempts}
        if number == "7.10":
            proof["retired_scenes"] = [
                {"lesson_id": pack["lesson_id"], "old_filename": old,
                 "binding": "mission.kickoff_image_url" if old in KICKOFF_RETIRED else "cards",
                 "old_sha256": digest(ROOT / IMAGE_ROOTS[0] / old),
                 "issue": issue, "observation": observation,
                 "replacement_filename": filename(pack, replacement),
                 "original_action": "preserve-byte-for-byte"}
                for old, (replacement, issue, observation) in {**RETIRED, **KICKOFF_RETIRED}.items()]
        write_json(ROOT / "docs" / "qa" / f"unit-7-{kind}-media-v1.json", proof)
    record_plans(pack_map, json.loads(BASELINE.read_text(encoding="utf-8")))
    record_superseded_edits(pack_map["7.10"])
    record_target_reviews(lessons["7.10"], staged["7.10"][2])


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
        print("review exceptions added:", prepare_review_exceptions(pack_map["7.9"]))
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
        print("Installed Unit 7 lessons match the builder.")
        return 0
    if args.lessons_only:
        if args.draft or not args.base_ref:
            raise ValueError("--lessons-only needs --base-ref and measured geometry.")
        for number, path in LESSONS.items():
            path.write_text(rendered[number], encoding="utf-8", newline="\n")
        print("Rewrote Unit 7 lesson files; run the media preservation audit next.")
        return 0
    if args.write:
        if args.draft:
            raise ValueError("Never install draft geometry.")
        install(pack_map, lessons)
        print("Installed Unit 7 lessons and stills. Audio, manifests, snapshots and device QA remain required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
