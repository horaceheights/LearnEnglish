"""Bring Unit 6 to the Unit 1 mission standard: a fresh 6.9 review and a 13-beat 6.10 mission.

The review keeps no exact-byte teaching image: it keeps the fifteen review-only
stills Unit 6 already owns and adds eleven fresh review scenes for the
pharmacy, the left-and-right street, the far station, crossing or not, the help
exchange, the schedules and the taxi that the old review could only show by
repeating a teaching card. The mission is rebuilt from three stub beats to nine
listening scenes and four voice gates, each with its own mission-only still,
because the approved photo edits of the stub's plaza, school and corner scenes
pin those cards exactly as they were inspected.

Modes mirror the Unit 5 builder: --check re-derives the installed lessons from a
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

from scripts.audit_course_media_preservation import BASELINE, IMAGE_ROOTS, PLANS  # noqa: E402
from scripts.parity_pack import (  # noqa: E402
    install_images, paid_attempts, prepare_review_exceptions, register_photoreal, reviewed_assets, stage_images,
    write_json,
)
from scripts.render_course_stills import digest  # noqa: E402

LESSONS = {
    "6.9": ROOT / "backend" / "lessons" / "unit_6" / "lesson-6-9-unit-6-review.yaml",
    "6.10": ROOT / "backend" / "lessons" / "unit_6" / "lesson-6-10-town-mission.yaml",
}
PACKS = {
    "6.9": ROOT / "docs" / "product" / "unit-6-review-pack.json",
    "6.10": ROOT / "docs" / "product" / "unit-6-mission-pack.json",
}
ARCHIVE = ROOT / "Lessons" / "Lesson1" / "images" / "course-photoreal-sources" / "unit-6"
# Review-only stills Unit 6 already owns; no teaching card uses these bytes.
EXISTING_REVIEW = {
    "store-bank-bus-train": "a1_scene_store-bank-bus-train_7ae1547.webp",
    "where-is-it": "a1_scene_where-is-it_c110584.webp",
    "go-straight-turn-left-stop": "a1_scene_go-straight-turn-left-stop_cbb31bb.webp",
    "bus-help-question": "a1_scene_bus-female-help-question_571febf.webp",
    "bus-eight-answer": "a1_scene_bus-male-eight-answer_522fa5f.webp",
    "hospital": "a1_photo_u6_review_hospital_v2.webp",
    "man-boards-train": "a1_photo_u6_review_man_boards_train_v1.webp",
    "station-near-park": "a1_scene_station-near-park_e8f4e0e.webp",
    "store": "a1_photo_u6_review_store_v2.webp",
    "library": "a1_photo_u6_review_library_v2.webp",
    "left-turn": "a1_scene_left-turn_e5eb228.webp",
    "right-turn": "a1_scene_right-turn_0579be5.webp",
    "bus-seven-night": "a1_scene_bus-leaves-7-night_937441f_four-card.webp",
    "station": "a1_photo_u6_review_station_v1.webp",
    "near-the-bank": "a1_scene_it-is-near-the-bank_bbd8eb4.webp",
}
REBUILD = ("The three-beat stub mission is rebuilt to the approved Unit 6 contract: nine listening scenes and four "
           "question-and-answer voice gates replace it, and every beat is re-authored, so this scene and the "
           "approved photo edit pinned to its stub card stop being bound.")
# Stub mission scenes the rebuild stops binding. Their files, and the inspected full-frame edits
# made from them, stay byte-for-byte on disk; only Lesson 6.10's bindings change.
RETIRED = {
    "a1_u6_scene_01_plaza.webp": ("town-square", REBUILD,
        "Inspected: the stub mission's plaza hotspot scene with the family walking, crossing, waiting and "
        "sitting; kept byte-for-byte together with its inspected full-frame edit."),
    "a1_u6_scene_02_school.webp": ("transport-stop", REBUILD,
        "Inspected: the stub mission's school-street hotspot scene with the girl, the parents, the grandmother "
        "and an arriving bus; kept byte-for-byte together with its inspected full-frame edit."),
    "a1_u6_scene_03_corner_checkpoint.webp": ("bank-question", REBUILD,
        "Inspected: the stub mission's corner scene used by its only voice gate; kept byte-for-byte together "
        "with its inspected full-frame edit."),
}
KICKOFF_RETIRED = {
    "a1_u6_mission_kickoff.webp": ("kickoff", REBUILD,
        "Inspected: the stub mission's kickoff shot of the town; the original file stays byte-for-byte on disk "
        "and in every archive copy, and only its Lesson 6.10 binding changes."),
}
# Exact-byte repeats of earlier teaching photographs that the old review still bound, and the
# bound review still that now carries the same language.
REVIEW_REPEATS = {
    # The old U7 built "It is near the bank." over this 6.8 bus-leaves-at-eight still; its Use-image
    # exception dies with that card, and the rebuilt review retrieves "leaves at" from its own still.
    "a1_scene_leaves_8411175.webp": "a1_u6_review_v1_train_nine.webp",
    "a1_scene_bus-arrives-8-night_aa53495_four-card.webp": "a1_u6_review_v1_train_ten.webp",
    "a1_scene_bus-leaves-8-morning_ca11581_four-card.webp": "a1_u6_review_v1_train_nine.webp",
    "a1_scene_bus-leaves-8-night_094ebc0_four-card.webp": "a1_scene_bus-male-eight-answer_522fa5f.webp",
    "a1_scene_can-you-help-me_eb476e5.webp": "a1_u6_review_v1_help_question.webp",
    "a1_scene_can_7e9219a.webp": "a1_u6_review_v1_can_cross.webp",
    "a1_scene_excuse-me-can-you-help-me_dab207f.webp": "a1_u6_review_v1_help_question.webp",
    "a1_scene_go-straight-turn-right_7db0dd5.webp": "a1_scene_go-straight-turn-left-stop_cbb31bb.webp",
    "a1_scene_goes-by-car_9de6eb4.webp": "a1_u6_review_v1_by_taxi.webp",
    "a1_scene_goes-by-taxi_19b09d5.webp": "a1_u6_review_v1_by_taxi.webp",
    "a1_scene_help_92005ec.webp": "a1_u6_review_v1_help_question.webp",
    "a1_scene_i-can-go-by-bus_a4c83d2.webp": "a1_photo_u6_review_man_boards_train_v1.webp",
    "a1_scene_it-is-on-the-left_f11a126.webp": "a1_u6_review_v1_left_right_street.webp",
    "a1_scene_it-is-on-the-right_95dc6ee.webp": "a1_u6_review_v1_left_right_street.webp",
    "a1_scene_leaves_8411175.webp": "a1_scene_bus-male-eight-answer_522fa5f.webp",
    "a1_scene_left_12c0f1f.webp": "a1_scene_left-turn_e5eb228.webp",
    "a1_scene_right_d27a1f1.webp": "a1_scene_right-turn_0579be5.webp",
    "a1_scene_station-far-from-park_d5dce5a.webp": "a1_u6_review_v1_far_station.webp",
    "a1_scene_thank-you_a6f59e1.webp": "a1_u6_review_v1_thank_you.webp",
    "a1_scene_the-train-arrives-at-ten_6fc48b2.webp": "a1_u6_review_v1_train_ten.webp",
    "a1_scene_the-train-leaves-at-nine_681786c.webp": "a1_u6_review_v1_train_nine.webp",
    "a1_scene_turn-left_c0779b7.webp": "a1_scene_left-turn_e5eb228.webp",
    "a1_scene_you-cannot-cross-the-street_1d21ab6.webp": "a1_u6_review_v1_cannot_cross.webp",
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


# ---------------------------------------------------------------------- 6.9
def compile_69(base: dict, pack: dict) -> dict:
    lesson = copy.deepcopy(base)
    cards: list[dict] = []

    def image(asset_id: str) -> str:
        return EXISTING_REVIEW.get(asset_id) or filename(pack, asset_id)

    def teach(sid, text, es, asset, speaker=None, note="fresh review station", turns=None):
        """Learn card; `turns` keeps a reviewed two-frame dialogue exactly as its poster evidence pins it."""
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

    def listen_images(sid, text, es, correct_asset, others, note, speaker=None):
        """Four caption-free pictures; dedicated four-card reframes belong only here."""
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

    # Station 1 places and transport; 2 where things are; 3 directions; 4 can and cannot;
    # 5 asking for help; 6 schedules. Each modality revisits them in order.
    teach("L1", "Store. Bank. Bus. Train.", "Tienda. Banco. Autobús. Tren.", "store-bank-bus-train")
    teach("L2", "This is the pharmacy.", "Esta es la farmacia.", "pharmacy")
    teach("L3", "The bank is next to the store.", "El banco está junto a la tienda.", "bank-next-to-store")
    teach("L4", "Can you help me? The bus leaves at eight.", "¿Me puedes ayudar? El autobús sale a las ocho.",
          "bus-help-question", note="reviewed dialogue poster kept frame for frame",
          turns=[("Can you help me?", "female-character", "bus-help-question"),
                 ("The bus leaves at eight.", "male-character", "bus-eight-answer")])
    teach("L5", "Turn left.", "Gira a la izquierda.", "left-turn")
    teach("L6", "You cannot cross the street.", "No puedes cruzar la calle.", "cannot-cross")
    teach("L7", "The station is far from the park.", "La estación está lejos del parque.", "far-station")
    teach("L8", "The train arrives at ten.", "El tren llega a las diez.", "train-ten")

    empty_recognize("R1", "A hospital", "A library", "Elige la palabra correcta.", "hospital", True)
    empty_recognize("R2", "I go by train.", "I go by bus.", "Elige la frase correcta.", "man-boards-train", False,
                    "male-character")
    image_to_text("R3", "Where is the bank?", "It is on the left.", "¿Dónde está el banco?", "left-right-street",
                  ["It is on the right.", "It is on the left.", "It is far from the park."])
    text_to_image("R4", "The station is far from the park.", "La estación está lejos del parque.", "far-station",
                  "station-near-park", True)
    text_to_image("R5", "Turn right.", "Gira a la derecha.", "right-turn", "left-turn", False)
    empty_recognize("R6", "You can cross the street.", "You cannot cross the street.", "Elige la frase correcta.",
                    "can-cross", True)
    empty_recognize("R7", "Thank you.", "Sorry, no.", "Elige la frase correcta.", "thank-you", False,
                    "male-character")
    empty_recognize("R8", "The train leaves at nine.", "The train leaves at ten.", "Elige la frase correcta.",
                    "train-nine", True)

    listen_image("N1", "A library", "Una biblioteca", "library", "store", True)
    listen_image("N2", "I go by taxi.", "Voy en taxi.", "by-taxi", "man-boards-train", False, "female-character")
    listen_image("N3", "This is the station.", "Esta es la estación.", "station", "hospital", True)
    listen_image("N4", "The bank is next to the store.", "El banco está junto a la tienda.", "bank-next-to-store",
                 "near-the-bank", False)
    listen_image("N5", "You can cross the street.", "Puedes cruzar la calle.", "can-cross", "cannot-cross", True)
    listen_image("N6", "Excuse me. Can you help me?", "Disculpe. ¿Me puede ayudar?", "help-question", "thank-you",
                 False, "female-character")
    listen_images("N7", "The bus leaves at seven at night.", "El autobús sale a las siete de la noche.",
                  "bus-seven-night", ["bus-eight-answer", "train-nine", "train-ten"],
                  "four schedules to listen for; the dedicated four-card reframe stays in a four-card set")
    listen_image("N8", "It is near the bank.", "Está cerca del banco.", "near-the-bank", "far-station", True)

    place = "audio-to-English retrieval without a picture"
    listen_text("N9", "I go by car.", "Voy en coche.", ["I go by bus.", "I go by car.", "I go by bike."], place,
                "male-character")
    listen_text("N10", "I cannot walk there.", "No puedo caminar hasta allá.",
                ["I walk.", "I cannot walk there.", "I can walk there."], place, "female-character")
    listen_text("N11", "The hospital is on the right.", "El hospital está a la derecha.",
                ["The hospital is on the left.", "The hospital is near the park.", "The hospital is on the right."],
                place)
    listen_text("N12", "Go straight. Turn right.", "Sigue derecho. Gira a la derecha.",
                ["Go straight. Turn right.", "Go straight. Turn left.", "Cross the street. Stop."], place)
    listen_text("N13", "Where is the pharmacy?", "¿Dónde está la farmacia?",
                ["Where is the library?", "Where is the pharmacy?", "Where is the store?"], place,
                "female-character")
    listen_text("N14", "Sorry, no.", "Lo siento, no.", ["Yes.", "Excuse me.", "Sorry, no."], place,
                "male-character")
    listen_text("N15", "The train arrives at ten.", "El tren llega a las diez.",
                ["The train leaves at ten.", "The train arrives at ten.", "The bus arrives at ten."], place)
    listen_text("N16", "They cannot go by train.", "No pueden ir en tren.",
                ["They go by train.", "We can go by bus.", "They cannot go by train."], place)
    listen_text("N17", "The store is far from the park.", "La tienda está lejos del parque.",
                ["The store is near the park.", "The store is far from the park.", "The store is next to the park."],
                place)
    listen_text("N18", "Stop at the bank.", "Detente en el banco.",
                ["Stop at the hospital.", "Stop at the station.", "Stop at the bank."], place)

    speak("S1", "Where is the station?", "¿Dónde está la estación?", "where-is-it", "male-character")
    speak("S2", "The hospital is on the right.", "El hospital está a la derecha.", "left-right-street")
    speak("S3", "Go straight. Turn left. Stop.", "Sigue derecho. Gira a la izquierda. Detente.",
          "go-straight-turn-left-stop")
    speak("S4", "I go by train.", "Voy en tren.", "man-boards-train", "male-character")
    speak("S5", "Excuse me. Can you help me?", "Disculpe. ¿Me puede ayudar?", "help-question", "female-character")
    speak("S6", "The train arrives at ten.", "El tren llega a las diez.", "train-ten")

    guided("U1", "I go ___ ___.", ["by", "taxi"], "I go by taxi.", "Voy en taxi.", "by-taxi", "female-character")
    guided("U2", "The bank is on ___ ___.", ["the", "left"], "The bank is on the left.",
           "El banco está a la izquierda.", "left-right-street")
    guided("U3", "You can cross ___ ___.", ["the", "street"], "You can cross the street.",
           "Puedes cruzar la calle.", "can-cross")
    guided("U4", "Can you ___ ___?", ["help", "me"], "Can you help me?", "¿Me puedes ayudar?", "help-question",
           "female-character")
    construct("U5", "Turn left.", "Gira a la izquierda.", "left-turn")
    construct("U6", "Thank you.", "Gracias.", "thank-you", "male-character")
    construct("U7", "It is next to the store.", "Está junto a la tienda.", "bank-next-to-store")
    construct("U8", "The train leaves at nine.", "El tren sale a las nueve.", "train-nine")

    lesson["cards"] = cards
    lesson.update(
        goal="Retrieve Unit 6 places, transport, location, direction, permission, help and schedule language from "
             "fresh review scenes, with no new vocabulary.",
        grammar_function="Spiral review of where is the, next to, near and far from, on the left and right, "
                         "imperatives for directions, can and cannot, polite requests, and leaves and arrives at.",
        speaking_outcome="Ask where a place is, say where it is, give simple directions, ask for help politely and "
                         "say when a bus or train leaves or arrives.",
        prerequisite="Lessons 6.1 to 6.8.",
        purposeful_review_slides=["L1", "R3", "R6", "N7", "N12", "N14", "S5", "U8"])
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["6.9"].parent.glob("*.yaml"))
                   if path not in (LESSONS["6.9"], LESSONS["6.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# --------------------------------------------------------------------- 6.10
WHO_SAYS = "Escucha la frase y toca a la persona que la dice."
FIND_IT = "Escucha la pista en inglés y toca la respuesta."
# (slide, chapter, asset, kind, instruction, purpose, [(text, spanish, speaker)])
NEW_BEATS = [
    ("M01", "lugares", "town-square", "guided-search", FIND_IT,
     "En la plaza, encuentra el lugar que nombra cada pista.",
     [("There is a bank.", "Hay un banco.", "teacher"),
      ("There is a pharmacy.", "Hay una farmacia.", "teacher"),
      ("There is a library.", "Hay una biblioteca.", "teacher"),
      ("There is a station.", "Hay una estación.", "teacher")]),
    ("M02", "lugares", "transport-stop", "crowd-search", WHO_SAYS,
     "Cada quien va a su manera: escucha quién lo dice.",
     [("I go by bus.", "Voy en autobús.", "female-character"),
      ("I go by train.", "Voy en tren.", "male-character"),
      ("I go by taxi.", "Voy en taxi.", "male-character"),
      ("I walk.", "Camino.", "female-character")]),
    ("M03", "donde", "left-right-street", "contrast-hunt", FIND_IT,
     "Mira la calle y toca el lugar que describe cada pista.",
     [("The bank is on the left.", "El banco está a la izquierda.", "teacher"),
      ("The hospital is on the right.", "El hospital está a la derecha.", "teacher"),
      ("The store is next to the bank.", "La tienda está junto al banco.", "teacher"),
      ("The pharmacy is next to the hospital.", "La farmacia está junto al hospital.", "teacher")]),
    ("M04", "donde", "near-far-park", "crowd-search", FIND_IT,
     "Desde el parque, toca lo que está cerca y lo que está lejos.",
     [("The library is near the park.", "La biblioteca está cerca del parque.", "teacher"),
      ("The bank is near the park.", "El banco está cerca del parque.", "teacher"),
      ("The station is far from the park.", "La estación está lejos del parque.", "teacher"),
      ("The hospital is far from the park.", "El hospital está lejos del parque.", "teacher")]),
    ("M05", "camino", "direction-signs", "crowd-search", FIND_IT,
     "Escucha la indicación y toca la señal correcta.",
     [("Go straight.", "Sigue derecho.", "teacher"),
      ("Turn left.", "Gira a la izquierda.", "teacher"),
      ("Turn right.", "Gira a la derecha.", "teacher"),
      ("Cross the street.", "Cruza la calle.", "teacher")]),
    ("M06", "camino", "crossing-corner", "contrast-hunt", FIND_IT,
     "En la esquina, escucha quién puede cruzar y quién no.",
     [("You can cross the street.", "Puedes cruzar la calle.", "teacher"),
      ("You cannot cross the street.", "No puedes cruzar la calle.", "teacher"),
      ("Stop at the bank.", "Detente en el banco.", "teacher"),
      ("He can turn right.", "Él puede girar a la derecha.", "teacher")]),
    ("M07", "ayuda", "help-exchange", "action-hunt", WHO_SAYS,
     "Cuatro personas piden o dan ayuda: escucha quién dice cada frase.",
     [("Excuse me.", "Disculpe.", "female-character"),
      ("Can you help me?", "¿Me puede ayudar?", "male-character"),
      ("Yes.", "Sí.", "female-character"),
      ("Sorry, no.", "Lo siento, no.", "male-character")]),
    ("M08", "horarios", "station-clocks", "crowd-search", FIND_IT,
     "En la estación, toca el reloj de la hora que escuchas.",
     [("The bus arrives at seven.", "El autobús llega a las siete.", "teacher"),
      ("The bus leaves at eight.", "El autobús sale a las ocho.", "teacher"),
      ("The train leaves at nine.", "El tren sale a las nueve.", "teacher"),
      ("The train arrives at ten.", "El tren llega a las diez.", "teacher")]),
    ("M09", "horarios", "cafe-table", "contrast-hunt", FIND_IT,
     "Antes de seguir, revisa dónde quedó cada cosa en la mesa.",
     [("The phone is in the bag.", "El teléfono está en la bolsa.", "teacher"),
      ("The book is on the table.", "El libro está sobre la mesa.", "teacher"),
      ("The apple is under the chair.", "La manzana está debajo de la silla.", "teacher"),
      ("The chair is next to the table.", "La silla está junto a la mesa.", "teacher")]),
]
# (slide, key, question, asker, answer, spanish, purpose, response asset)
GATES = [
    ("M10", "bank", "Where is the bank?", "female-character", "It is next to the store.",
     "Está junto a la tienda.", "La madre busca el banco; dile dónde está.", None),
    ("M11", "station", "Where is the station?", "male-character", "Go straight. Turn right.",
     "Sigue derecho. Gira a la derecha.", "El padre busca la estación; dale las indicaciones.", None),
    ("M12", "thanks", "It is on the left.", "female-character", "Thank you.", "Gracias.",
     "La niña te indica el camino; responde con cortesía.", None),
    ("M13", "help", "Excuse me. Can you help me?", "male-character", "Yes. The bus leaves at eight.",
     "Sí. El autobús sale a las ocho.", "El abuelo pide ayuda con el horario; responde y la ruta queda lista.",
     None),
]
CHAPTERS = [
    {"id": "lugares", "title": "Los lugares del barrio", "objective": "Escucha la pista y toca el lugar o la persona."},
    {"id": "donde", "title": "¿Dónde está?", "objective": "Escucha dónde está cada lugar y tócalo."},
    {"id": "camino", "title": "El camino", "objective": "Escucha la indicación y toca la señal o a la persona."},
    {"id": "ayuda", "title": "Pedir ayuda", "objective": "Escucha quién pide y quién da ayuda."},
    {"id": "horarios", "title": "Horarios y cosas", "objective": "Escucha la hora y dónde está cada cosa."},
    {"id": "pregunta", "title": "Pregunta y responde", "objective": "Escucha la pregunta y responde en voz alta."},
]


def compile_610(base: dict, pack: dict, reviews: dict | None) -> dict:
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
    title = "Ruta del barrio"
    lesson["title"] = f"6.10 {title}"
    lesson["sub_lesson_title"] = title
    lesson["experience_type"] = "mission"
    lesson["mission"] = {
        "label": "MISIÓN FINAL · UNIDAD 6", "title": title,
        "briefing": "Hoy la familia recorre el barrio. Escucha cada pista y toca el lugar, la señal o la persona "
                    "que describe: dónde está cada cosa, el camino, quién pide ayuda y a qué hora sale el autobús. "
                    "Al final, responde cuatro veces en voz alta. Primero escucha la frase completa; después toca.",
        "kickoff_image_url": url(filename(pack, "kickoff")),
        "objectives": ["Encuentra cada lugar", "Sigue las indicaciones", "Pide ayuda y confirma la hora"],
        "completion_title": "¡La ruta del barrio está lista!",
        "completion_message": "Encontraste cada lugar, seguiste el camino, escuchaste quién pide ayuda y "
                              "confirmaste el horario en voz alta.",
        "chapters": CHAPTERS,
        "voice_heading": "PREGUNTA Y RESPONDE",
        "voice_instruction": "Escucha la frase y responde en voz alta",
        "voice_success_label": "RUTA CONFIRMADA",
    }
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["6.10"].parent.glob("*.yaml"))
                   if path not in (LESSONS["6.9"], LESSONS["6.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# ------------------------------------------------------------ validation
def validate(lessons: dict) -> None:
    from backend.app.schemas import Lesson, MissionLesson

    Lesson.model_validate(lessons["6.9"])
    MissionLesson.model_validate(lessons["6.10"])


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

        path = pack_output_directory(pack_map["6.10"]) / "agent-reviews.json"
        reviews = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    lessons = {"6.9": compile_69(bases["6.9"], pack_map["6.9"]),
               "6.10": compile_610(bases["6.10"], pack_map["6.10"], reviews)}
    validate(lessons)
    return lessons


def dropped_review_bindings() -> set[str]:
    """Baseline 6.9 bindings the rebuilt review drops and no existing exception still covers."""
    from scripts.audit_course_media_preservation import images, lessons as current_lessons

    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
    bound = images(current_lessons(ROOT)["lesson-6-9-unit-6-review"])
    cards = current_lessons(ROOT)["lesson-6-9-unit-6-review"]["cards"]

    def still_valid(plan):
        """A Use-image exception only covers its named Use card while that card shows the replacement."""
        if plan["issue"] != "use-image-contradicts-sentence":
            return True
        named = [card for card in cards if card.get("slide_id") == plan.get("slide_id") and card.get("stage") == "Use"]
        return bool(named) and Path(str(named[0].get("prompt_image_url") or "")).name == plan["new_filename"]

    covered = {plan["old_filename"] for plan in plans
               if plan["lesson_id"] == "lesson-6-9-unit-6-review" and still_valid(plan)
               and {plan["new_filename"], *plan.get("alternative_filenames", [])} & bound}
    return (set(baseline["lesson_bindings"].get("lesson-6-9-unit-6-review", [])) - bound) - covered


def record_plans(pack_map: dict, baseline: dict) -> None:
    """Restate every Unit 6 exception the rebuild changes; originals stay byte-for-byte."""
    plans = json.loads(PLANS.read_text(encoding="utf-8"))
    mission, review = pack_map["6.10"], pack_map["6.9"]
    dropped = dropped_review_bindings()
    unmapped = sorted(dropped - set(REVIEW_REPEATS))
    if unmapped:
        raise ValueError(f"These dropped 6.9 bindings need an explicit replacement decision: {unmapped}")
    restated = ({(mission["lesson_id"], old) for old in RETIRED}
                | {(review["lesson_id"], old) for old in dropped})
    keep = [plan for plan in plans["changes"]
            if (plan["lesson_id"], plan["old_filename"]) not in restated]
    for old, (replacement, issue, _observation) in RETIRED.items():
        keep.append({"lesson_id": mission["lesson_id"], "old_filename": old,
                     "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                     "new_filename": filename(mission, replacement), "issue": "mission-rebuild-retires-scene",
                     "issue_detail": issue, "evidence_file": "docs/qa/unit-6-mission-media-v1.json",
                     "source_provenance": baseline["assets"][old]["provenance"],
                     "original_action": "preserve-byte-for-byte"})
    for old in sorted(dropped):
        keep.append({"lesson_id": review["lesson_id"], "old_filename": old,
                     "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                     "new_filename": REVIEW_REPEATS[old], "issue": "review-reuses-earlier-image",
                     "issue_detail": "Lesson 6.9 bound the exact bytes an earlier teaching card already uses; "
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
               "superseded_by": "docs/qa/unit-6-mission-media-v1.json",
               "reason": "The Unit 6 stub mission was rebuilt to the approved parity contract; its three beats "
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
        kind = {"6.9": "review", "6.10": "mission"}[number]
        install_images(pack, exports, records, rejected, ARCHIVE / f"{kind}-v1")
        register_photoreal(exports)
    for number, path in LESSONS.items():
        path.write_text(json.dumps(lessons[number], ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    for number, (pack, _reviews, records, attempts, _rejected, _exports) in staged.items():
        kind = {"6.9": "review", "6.10": "mission"}[number]
        proof = {"schema_version": 1, "pack_sha256": digest(PACKS[number]), "lesson_id": pack["lesson_id"],
                 "human_approval": "pending", "assets": records, "paid_attempts": attempts}
        if number == "6.10":
            proof["retired_scenes"] = [
                {"lesson_id": pack["lesson_id"], "old_filename": old,
                 "binding": "mission.kickoff_image_url" if old in KICKOFF_RETIRED else "cards",
                 "old_sha256": digest(ROOT / IMAGE_ROOTS[0] / old),
                 "issue": issue, "observation": observation,
                 "replacement_filename": filename(pack, replacement),
                 "original_action": "preserve-byte-for-byte"}
                for old, (replacement, issue, observation) in {**RETIRED, **KICKOFF_RETIRED}.items()]
        write_json(ROOT / "docs" / "qa" / f"unit-6-{kind}-media-v1.json", proof)
    record_plans(pack_map, json.loads(BASELINE.read_text(encoding="utf-8")))
    record_superseded_edits(pack_map["6.10"])
    record_target_reviews(lessons["6.10"], staged["6.10"][2])


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
        print("review exceptions added:", prepare_review_exceptions(pack_map["6.9"]))
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
        print("Installed Unit 6 lessons match the builder.")
        return 0
    if args.lessons_only:
        if args.draft or not args.base_ref:
            raise ValueError("--lessons-only needs --base-ref and measured geometry.")
        for number, path in LESSONS.items():
            path.write_text(rendered[number], encoding="utf-8", newline="\n")
        print("Rewrote Unit 6 lesson files; run the media preservation audit next.")
        return 0
    if args.write:
        if args.draft:
            raise ValueError("Never install draft geometry.")
        install(pack_map, lessons)
        print("Installed Unit 6 lessons and stills. Audio, manifests, snapshots and device QA remain required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
