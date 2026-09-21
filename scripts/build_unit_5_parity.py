"""Bring Unit 5 to the Unit 1 mission standard: a fresh 5.9 review and a 13-beat 5.10 mission.

The review keeps no exact-byte teaching image: it reuses the seventeen Unit 5
review-only photographs that already exist and adds thirteen fresh review scenes
for the café, the prices and the likes the old review could only show by
repeating a teaching card. The mission is rebuilt from four stub beats to nine
listening scenes and four voice gates, each with its own mission-only still,
because the approved photo edits of the stub's market, register and café scenes
pin those cards exactly as they were inspected.

Modes mirror the Unit 4 builder: --check re-derives the installed lessons from a
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
    "5.9": ROOT / "backend" / "lessons" / "unit_5" / "lesson-5-9-unit-5-review.yaml",
    "5.10": ROOT / "backend" / "lessons" / "unit_5" / "lesson-5-10-cafe-mission.yaml",
}
PACKS = {
    "5.9": ROOT / "docs" / "product" / "unit-5-review-pack.json",
    "5.10": ROOT / "docs" / "product" / "unit-5-mission-pack.json",
}
ARCHIVE = ROOT / "Lessons" / "Lesson1" / "images" / "course-photoreal-sources" / "unit-5"
# Review-only photographs Unit 5 already owns; no teaching card uses these bytes.
EXISTING_REVIEW = {
    "boy-wants-two-eggs": "a1_photo_u5_review_boy_wants_two_eggs_v1.webp",
    "dislikes-bananas": "a1_photo_u5_review_dislikes_bananas_v1.webp",
    "eggs-breakfast": "a1_photo_u5_review_eggs_breakfast_v1.webp",
    "five-oranges": "a1_photo_u5_review_five_oranges_v2.webp",
    "food-and-drinks": "a1_photo_u5_review_food_and_drinks_v1.webp",
    "likes-and-needs": "a1_photo_u5_review_likes_and_needs_v1.webp",
    "pair-wants-three-eggs": "a1_photo_u5_review_pair_wants_three_eggs_v1.webp",
    "pair-wants-two-apples": "a1_photo_u5_review_pair_wants_two_apples_v1.webp",
    "pair-wants-two-eggs": "a1_photo_u5_review_pair_wants_two_eggs_v1.webp",
    "rice": "a1_photo_u5_review_rice_v1.webp",
    "rice-dinner": "a1_photo_u5_review_rice_dinner_v1.webp",
    "rice-lunch": "a1_photo_u5_review_rice_lunch_v1.webp",
    "tea-breakfast": "a1_photo_u5_review_tea_breakfast_v1.webp",
    "tea-dinner": "a1_photo_u5_review_tea_dinner_v1.webp",
    "three-red-apples": "a1_photo_u5_review_three_red_apples_v1.webp",
    "two-red-apples": "a1_photo_u5_review_two_red_apples_v1.webp",
    "water": "a1_photo_u5_review_water_v1.webp",
    # Review-only stills the old 32-card review owned; no teaching card uses these bytes either.
    "meals": "a1_scene_breakfast-lunch-and-dinner_797cd61.webp",
    "seven-dollars": "a1_scene_it-is-seven-dollars_ec36472.webp",
    "coffee-five": "a1_scene_coffee-5_c9b98e0_four-card.webp",
    "coffee-seven": "a1_scene_coffee-7_6481821_four-card.webp",
}
REBUILD = ("The four-beat stub mission is rebuilt to the approved Unit 5 contract: nine listening scenes and four "
           "question-and-answer voice gates replace it, and every beat is re-authored, so this scene and the "
           "approved photo edit pinned to its stub card stop being bound.")
# Stub mission scenes the rebuild stops binding. Their files, and the inspected full-frame edits
# made from them, stay byte-for-byte on disk; only Lesson 5.10's bindings change.
RETIRED = {
    "a1_u5_scene_01_market_stall.webp": ("market-stall", REBUILD,
        "Inspected: the stub mission's market-stall hotspot scene with fruit crates and a seller; kept "
        "byte-for-byte together with its inspected full-frame edit."),
    "a1_u5_scene_02_register.webp": ("price-board", REBUILD,
        "Inspected: the stub mission's register hotspot scene with the price display and the cashier; kept "
        "byte-for-byte together with its inspected full-frame edit."),
    "a1_u5_scene_03_cafe_counter.webp": ("cafe-counter-v2", REBUILD,
        "Inspected: the stub mission's café-counter hotspot scene used by its only voice gate; kept byte-for-byte "
        "together with its inspected full-frame edit."),
}
KICKOFF_RETIRED = {
    "a1_u5_mission_kickoff.webp": ("kickoff", REBUILD,
        "Inspected: the stub mission's kickoff shot of the market and café; the original file stays byte-for-byte "
        "on disk and in every archive copy, and only its Lesson 5.10 binding changes."),
}
# Exact-byte repeats of earlier teaching photographs that the old review still bound, and the
# fresh review scene that now carries the same language.
REVIEW_REPEATS = {
    "a1_scene_at-the-cafe_61dd3b6.webp": "a1_u5_review_v1_cafe.webp",
    "a1_scene_coffee-6_1ea48e3_four-card.webp": "a1_u5_review_v1_price_four_dollars.webp",
    "a1_scene_coffee-8_90b7ae7_four-card.webp": "a1_u5_review_v1_price_four_dollars.webp",
    "a1_scene_does-not-like-fish_6232056.webp": "a1_u5_review_v1_dislikes_fish.webp",
    "a1_scene_dollar_6c36ab3.webp": "a1_u5_review_v1_price_two_dollars.webp",
    "a1_scene_how-much-is-it_6073d26.webp": "a1_u5_review_v1_price_four_dollars.webp",
    "a1_scene_i-do-not-like-fish_25804e6.webp": "a1_u5_review_v1_dislikes_fish.webp",
    "a1_scene_i-do-not-like-milk_f3786e9.webp": "a1_u5_review_v1_dislikes_milk.webp",
    "a1_scene_i-need-water_3031cd6.webp": "a1_photo_u5_review_water_v1.webp",
    "a1_scene_it-is-four-dollars_05f05d1.webp": "a1_u5_review_v1_price_four_dollars.webp",
    "a1_scene_likes-bananas_df91561.webp": "a1_u5_review_v1_likes_fish.webp",
    "a1_scene_likes-fish_8324800.webp": "a1_u5_review_v1_likes_fish.webp",
    "a1_scene_she-needs-milk_d925690.webp": "a1_u5_review_v1_wants_juice.webp",
    "a1_scene_thank-you_a6f59e1.webp": "a1_u5_review_v1_cafe_order.webp",
    "a1_scene_wants-juice_0276b44.webp": "a1_u5_review_v1_wants_juice.webp",
    "a1_scene_water-please-thank-you_fda0ffb.webp": "a1_u5_review_v1_cafe_order.webp",
    "a1_scene_yes-please_ae43854.webp": "a1_u5_review_v1_yes_please.webp",
    "a1_scene_lunch_0945305.webp": "a1_photo_u5_review_rice_lunch_v1.webp",
    "a1_scene_not_557f255.webp": "a1_u5_review_v1_dislikes_milk.webp",
    "a1_scene_wants_5383092.webp": "a1_u5_review_v1_wants_juice.webp",
    "a1_scene_five_4db2c1d.webp": "a1_photo_u5_review_five_oranges_v2.webp",
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


# ---------------------------------------------------------------------- 5.9
def compile_59(base: dict, pack: dict) -> dict:
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

    # Station 1 food and drinks; 2 fruit and quantities; 3 likes and dislikes;
    # 4 wants and needs; 5 meals; 6 prices; 7 ordering at the café.
    teach("L1", "Food and drinks", "Comida y bebidas", "food-and-drinks")
    teach("L2", "This is bread.", "Esto es pan.", "bread")
    teach("L3", "This is chicken.", "Esto es pollo.", "chicken")
    teach("L4", "This is fruit.", "Esto es fruta.", "fruit-plate")
    teach("L5", "I like fish.", "Me gusta el pescado.", "likes-fish", "female-character")
    teach("L6", "I do not like milk.", "No me gusta la leche.", "dislikes-milk", "male-character")
    teach("L7", "It is two dollars.", "Cuesta dos dólares.", "price-two-dollars")
    teach("L8", "At the café", "En el café", "cafe")

    text_to_image("R1", "This is bread.", "Esto es pan.", "bread", "rice", True)
    empty_recognize("R2", "This is chicken.", "This is fish.", "Elige la frase correcta.", "chicken", False)
    image_to_text("R3", "How much is it?", "It is four dollars.", "¿Cuánto cuesta?", "price-four-dollars",
                  ["It is two dollars.", "It is four dollars.", "It is five dollars."])
    empty_recognize("R4", "I do not like fish.", "I like fish.", "Elige la frase correcta.", "dislikes-fish", True,
                    "male-character")
    text_to_image("R5", "I eat eggs for breakfast.", "Desayuno huevos.", "eggs-breakfast", "tea-breakfast", True,
                  "female-character")
    text_to_image("R6", "We eat rice for lunch.", "Comemos arroz en el almuerzo.", "rice-lunch", "rice-dinner", False)
    empty_recognize("R7", "There are five oranges.", "There are three oranges.", "Elige la frase correcta.",
                    "five-oranges", False)
    text_to_image("R8", "They want two eggs.", "Quieren dos huevos.", "pair-wants-two-eggs",
                  "pair-wants-two-apples", False)

    listen_image("N1", "Some water", "Un poco de agua", "water", "rice", True)
    listen_image("N2", "Three red apples", "Tres manzanas rojas", "three-red-apples", "two-red-apples", False)
    listen_image("N3", "I drink tea for breakfast.", "Tomo té en el desayuno.", "tea-breakfast", "tea-dinner", True,
                 "female-character")
    listen_image("N4", "They want two eggs.", "Quieren dos huevos.", "pair-wants-two-eggs", "pair-wants-three-eggs",
                 False)
    listen_image("N5", "I do not like milk.", "No me gusta la leche.", "dislikes-milk", "likes-and-needs", True,
                 "male-character")
    listen_image("N6", "I like fish.", "Me gusta el pescado.", "likes-fish", "dislikes-bananas", False,
                 "female-character")
    listen_image("N7", "At the café", "En el café", "cafe", "meals", True)
    listen_image("N8", "It is four dollars.", "Cuesta cuatro dólares.", "price-four-dollars", "price-two-dollars",
                 False)

    place = "audio-to-English retrieval without a picture"
    listen_text("N9", "I like a pear.", "Me gusta una pera.",
                ["I like grapes.", "I like a pear.", "I like a strawberry."], place, "female-character")
    listen_image("N10", "He wants two eggs.", "Él quiere dos huevos.", "boy-wants-two-eggs",
                 "pair-wants-two-eggs", True)
    listen_text("N11", "I need water.", "Necesito agua.",
                ["I need water.", "I need milk.", "I need juice."], place, "female-character")
    listen_text("N12", "She needs milk.", "Ella necesita leche.",
                ["He wants juice.", "She needs milk.", "She wants juice."], place)
    listen_text("N13", "We eat chicken for dinner.", "Cenamos pollo.",
                ["We eat chicken for lunch.", "We eat chicken for dinner.", "We eat chicken for breakfast."], place)
    listen_text("N14", "How much is it?", "¿Cuánto cuesta?",
                ["Here you are.", "How much is it?", "Thank you."], place, "male-character")
    listen_text("N15", "No, thank you.", "No, gracias.",
                ["Yes, please.", "No, thank you.", "Here you are."], place, "female-character")
    listen_images("N16", "The coffee is seven dollars.", "El café cuesta siete dólares.", "coffee-seven",
                  ["coffee-five", "price-two-dollars", "price-four-dollars"],
                  "four prices to listen for; the two coffee reframes stay in a four-card set")
    listen_text("N17", "Coffee, please.", "Un café, por favor.",
                ["Water, please.", "Coffee, please.", "Tea, please."], place, "male-character")
    listen_text("N18", "I eat an orange.", "Como una naranja.",
                ["I eat an apple.", "I eat a banana.", "I eat an orange."], place, "female-character")

    speak("S1", "Three red apples", "Tres manzanas rojas", "three-red-apples")
    speak("S2", "I do not like milk.", "No me gusta la leche.", "dislikes-milk", "male-character")
    speak("S3", "I need water.", "Necesito agua.", "water", "female-character")
    speak("S4", "I eat eggs for breakfast.", "Desayuno huevos.", "eggs-breakfast", "female-character")
    speak("S5", "How much is it?", "¿Cuánto cuesta?", "seven-dollars", "male-character")
    speak("S6", "Coffee, please. Thank you.", "Un café, por favor. Gracias.", "cafe-order", "female-character")

    guided("U1", "There are ___ ___.", ["five", "oranges"], "There are five oranges.", "Hay cinco naranjas.",
           "five-oranges")
    guided("U2", "She ___ ___.", ["wants", "juice"], "She wants juice.", "Ella quiere jugo.", "wants-juice")
    guided("U3", "We eat rice ___ ___.", ["for", "lunch"], "We eat rice for lunch.", "Comemos arroz en el almuerzo.",
           "rice-lunch")
    guided("U4", "It is ___ ___.", ["two", "dollars"], "It is two dollars.", "Cuesta dos dólares.",
           "price-two-dollars")
    construct("U5", "Thank you.", "Gracias.", "cafe-order", "female-character")
    guided("U6", "___, ___.", ["Yes", "please"], "Yes, please.", "Sí, por favor.", "yes-please",
           "male-character")
    construct("U7", "It is four dollars.", "Cuesta cuatro dólares.", "price-four-dollars")
    construct("U8", "I do not like fish.", "No me gusta el pescado.", "dislikes-fish", "male-character")

    lesson["cards"] = cards
    lesson.update(
        goal="Retrieve Unit 5 food, drink, quantity, preference, need, meal, price and polite-order language from "
             "fresh review scenes, with no new vocabulary.",
        grammar_function="Spiral review of there is/there are, like and do not like, want and need, meals with for, "
                         "prices with dollars, and polite ordering at a café.",
        speaking_outcome="Say what you like, what you want and need, what you eat for each meal, ask a price and "
                         "order politely.",
        prerequisite="Lessons 5.1 to 5.8.",
        purposeful_review_slides=["L1", "R3", "R8", "N7", "N14", "N17", "S5", "U8"])
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["5.9"].parent.glob("*.yaml"))
                   if path not in (LESSONS["5.9"], LESSONS["5.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# --------------------------------------------------------------------- 5.10
WHO_SAYS = "Escucha la frase y toca a la persona que la dice."
FIND_IT = "Escucha la pista en inglés y toca la respuesta."
# (slide, chapter, asset, kind, instruction, purpose, [(text, spanish, speaker)])
NEW_BEATS = [
    ("M01", "mercado", "market-stall", "guided-search", FIND_IT,
     "En el puesto del mercado, encuentra lo que nombra cada pista.",
     [("There are apples.", "Hay manzanas.", "teacher"),
      ("There are bananas.", "Hay plátanos.", "teacher"),
      ("There is bread.", "Hay pan.", "teacher"),
      ("There is rice.", "Hay arroz.", "teacher")]),
    ("M02", "mercado", "fruit-counter", "crowd-search", FIND_IT,
     "En la fruta, cuenta y toca lo que escuchas.",
     [("There are five oranges.", "Hay cinco naranjas.", "teacher"),
      ("There are two pears.", "Hay dos peras.", "teacher"),
      ("There are grapes.", "Hay uvas.", "teacher"),
      ("There is a strawberry.", "Hay una fresa.", "teacher")]),
    ("M03", "mercado", "drinks-fridge", "crowd-search", FIND_IT,
     "En el refrigerador de bebidas, toca la que escuchas.",
     [("There is water.", "Hay agua.", "teacher"),
      ("There is milk.", "Hay leche.", "teacher"),
      ("There is juice.", "Hay jugo.", "teacher"),
      ("There is coffee.", "Hay café.", "teacher")]),
    ("M04", "gustos", "likes-table", "contrast-hunt", WHO_SAYS,
     "En la mesa, escucha a quién le gusta cada cosa y tócalo.",
     [("I like fish.", "Me gusta el pescado.", "female-character"),
      ("I do not like fish.", "No me gusta el pescado.", "male-character"),
      ("I like chicken.", "Me gusta el pollo.", "male-character"),
      ("I do not like milk.", "No me gusta la leche.", "female-character")]),
    ("M05", "pide", "wants-counter", "action-hunt", WHO_SAYS,
     "En el mostrador, escucha qué quiere cada quien.",
     [("I want two eggs.", "Quiero dos huevos.", "female-character"),
      ("I want some rice.", "Quiero un poco de arroz.", "male-character"),
      ("I want three apples.", "Quiero tres manzanas.", "female-character"),
      ("I want some water.", "Quiero un poco de agua.", "male-character")]),
    ("M06", "pide", "needs-list", "crowd-search", WHO_SAYS,
     "Cada quien dice lo que necesita: escucha y tócalo.",
     [("I need milk.", "Necesito leche.", "male-character"),
      ("I need bread.", "Necesito pan.", "female-character"),
      ("I need eggs.", "Necesito huevos.", "male-character"),
      ("She needs juice.", "Ella necesita jugo.", "teacher")]),
    ("M07", "comidas", "meals-table", "crowd-search", WHO_SAYS,
     "En la mesa de comidas, escucha qué come cada quien.",
     [("I eat eggs for breakfast.", "Desayuno huevos.", "female-character"),
      ("I eat rice for lunch.", "Como arroz en el almuerzo.", "male-character"),
      ("I eat chicken for dinner.", "Ceno pollo.", "female-character"),
      ("I drink tea for breakfast.", "Tomo té en el desayuno.", "male-character")]),
    ("M08", "comidas", "price-board", "crowd-search", FIND_IT,
     "En el letrero de precios, toca el precio que escuchas.",
     [("It is one dollar.", "Cuesta un dólar.", "teacher"),
      ("It is two dollars.", "Cuesta dos dólares.", "teacher"),
      ("It is three dollars.", "Cuesta tres dólares.", "teacher"),
      ("It is five dollars.", "Cuesta cinco dólares.", "teacher")]),
    ("M09", "cafe", "cafe-counter-v2", "crowd-search", WHO_SAYS,
     "En el café, escucha quién dice cada frase.",
     [("Water, please.", "Agua, por favor.", "female-character"),
      ("Yes, please.", "Sí, por favor.", "male-character"),
      ("No, thank you.", "No, gracias.", "female-character"),
      ("Tea, please.", "Té, por favor.", "male-character")]),
]
# (slide, key, question, asker, answer, spanish, purpose, response asset)
GATES = [
    ("M10", "price", "How much is it?", "female-character", "It is four dollars.", "Cuesta cuatro dólares.",
     "La clienta pregunta el precio; léelo en voz alta.", None),
    ("M11", "serve", "Juice, please.", "male-character", "Here you are.", "Aquí tienes.",
     "El cliente pide jugo; entrégaselo con la frase correcta.", None),
    ("M12", "thanks", "Here you are.", "female-character", "Thank you.", "Gracias.",
     "La mesera te entrega tu bebida; responde con cortesía.", None),
    ("M13", "order", "Hello.", "male-character", "Hello. Coffee, please.", "Hola. Un café, por favor.",
     "El mesero te saluda; haz tu pedido y la misión queda lista.", None),
]
CHAPTERS = [
    {"id": "mercado", "title": "En el mercado", "objective": "Escucha la pista y toca lo que hay."},
    {"id": "gustos", "title": "Gustos y disgustos", "objective": "Escucha a quién le gusta cada cosa."},
    {"id": "pide", "title": "Lo que quiere cada quien", "objective": "Escucha quién quiere o necesita algo."},
    {"id": "comidas", "title": "Comidas y precios", "objective": "Escucha la comida y el precio."},
    {"id": "cafe", "title": "En el café", "objective": "Escucha la pregunta y responde en voz alta."},
]


def compile_510(base: dict, pack: dict, reviews: dict | None) -> dict:
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
        card = {"slide_id": slide, "mission_chapter_id": "cafe",
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
    title = "Un día en el mercado y el café"
    lesson["title"] = f"5.10 {title}"
    lesson["sub_lesson_title"] = title
    lesson["experience_type"] = "mission"
    lesson["mission"] = {
        "label": "MISIÓN FINAL · UNIDAD 5", "title": title,
        "briefing": "Hoy compras la comida del día y cierras el pedido en el café. Escucha cada pista y toca la "
                    "fruta, la bebida o la persona que describe. Al final, responde cuatro veces en voz alta. "
                    "Primero escucha la frase completa; después toca.",
        "kickoff_image_url": url(filename(pack, "kickoff")),
        "objectives": ["Encuentra la comida y la bebida", "Di qué quiere cada quien", "Pregunta el precio y pide"],
        "completion_title": "¡El mercado y el café están listos!",
        "completion_message": "Encontraste la comida y la bebida, escuchaste qué quiere y necesita cada quien, "
                              "leíste los precios y pediste en el café en voz alta.",
        "chapters": CHAPTERS,
        "voice_heading": "PIDE EN EL CAFÉ",
        "voice_instruction": "Escucha la frase y responde en voz alta",
        "voice_success_label": "PEDIDO CONFIRMADO",
    }
    foundations = [json.loads(path.read_text(encoding="utf-8-sig")) for path in sorted(LESSONS["5.10"].parent.glob("*.yaml"))
                   if path not in (LESSONS["5.9"], LESSONS["5.10"])]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for f in foundations for word in (f.get("vocabulary") or [])))
    lesson["vocabulary"] = []
    return lesson


# ------------------------------------------------------------ validation
def validate(lessons: dict) -> None:
    from backend.app.schemas import Lesson, MissionLesson

    Lesson.model_validate(lessons["5.9"])
    MissionLesson.model_validate(lessons["5.10"])


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

        path = pack_output_directory(pack_map["5.10"]) / "agent-reviews.json"
        reviews = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    lessons = {"5.9": compile_59(bases["5.9"], pack_map["5.9"]),
               "5.10": compile_510(bases["5.10"], pack_map["5.10"], reviews)}
    validate(lessons)
    return lessons


def record_plans(pack_map: dict, baseline: dict) -> None:
    """Restate every Unit 5 exception the rebuild changes; originals stay byte-for-byte."""
    plans = json.loads(PLANS.read_text(encoding="utf-8"))
    mission, review = pack_map["5.10"], pack_map["5.9"]
    dropped = dropped_review_bindings()
    unmapped = sorted(dropped - set(REVIEW_REPEATS))
    if unmapped:
        raise ValueError(f"These dropped 5.9 bindings need an explicit replacement decision: {unmapped}")
    restated = ({(mission["lesson_id"], old) for old in RETIRED}
                | {(review["lesson_id"], old) for old in dropped})
    keep = [plan for plan in plans["changes"]
            if (plan["lesson_id"], plan["old_filename"]) not in restated]
    for old, (replacement, issue, _observation) in RETIRED.items():
        keep.append({"lesson_id": mission["lesson_id"], "old_filename": old,
                     "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                     "new_filename": filename(mission, replacement), "issue": "mission-rebuild-retires-scene",
                     "issue_detail": issue, "evidence_file": "docs/qa/unit-5-mission-media-v1.json",
                     "source_provenance": baseline["assets"][old]["provenance"],
                     "original_action": "preserve-byte-for-byte"})
    for old in sorted(dropped):
        keep.append({"lesson_id": review["lesson_id"], "old_filename": old,
                     "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                     "new_filename": REVIEW_REPEATS[old], "issue": "review-reuses-earlier-image",
                     "issue_detail": "Lesson 5.9 bound the exact bytes an earlier Unit 5 teaching card already "
                                     "uses; the rebuilt review retrieves the same language from a review-only "
                                     "photograph instead. Every original file and earlier teaching use is kept.",
                     "source_provenance": baseline["assets"][old]["provenance"],
                     "original_action": "preserve-byte-for-byte"})
    plans["changes"] = keep
    write_json(PLANS, plans)


def dropped_review_bindings() -> set[str]:
    """Baseline 5.9 bindings the rebuilt review drops and no existing exception still covers.

    An earlier exception keeps covering its own old file as long as the replacement it
    names is still bound by the rebuilt review; only the rest need restating here.
    """
    from scripts.audit_course_media_preservation import images, lessons as current_lessons

    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
    bound = images(current_lessons(ROOT)["lesson-5-9-unit-5-review"])
    covered = {plan["old_filename"] for plan in plans
               if plan["lesson_id"] == "lesson-5-9-unit-5-review"
               and {plan["new_filename"], *plan.get("alternative_filenames", [])} & bound}
    return (set(baseline["lesson_bindings"].get("lesson-5-9-unit-5-review", [])) - bound) - covered


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
               "superseded_by": "docs/qa/unit-5-mission-media-v1.json",
               "reason": "The Unit 5 stub mission was rebuilt to the approved parity contract; its four beats "
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
        kind = {"5.9": "review", "5.10": "mission"}[number]
        install_images(pack, exports, records, rejected, ARCHIVE / f"{kind}-v1")
        register_photoreal(exports)
    for number, path in LESSONS.items():
        path.write_text(json.dumps(lessons[number], ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    for number, (pack, _reviews, records, attempts, _rejected, _exports) in staged.items():
        kind = {"5.9": "review", "5.10": "mission"}[number]
        proof = {"schema_version": 1, "pack_sha256": digest(PACKS[number]), "lesson_id": pack["lesson_id"],
                 "human_approval": "pending", "assets": records, "paid_attempts": attempts}
        if number == "5.10":
            proof["retired_scenes"] = [
                {"lesson_id": pack["lesson_id"], "old_filename": old,
                 "binding": "mission.kickoff_image_url" if old in KICKOFF_RETIRED else "cards",
                 "old_sha256": digest(ROOT / IMAGE_ROOTS[0] / old),
                 "issue": issue, "observation": observation,
                 "replacement_filename": filename(pack, replacement),
                 "original_action": "preserve-byte-for-byte"}
                for old, (replacement, issue, observation) in {**RETIRED, **KICKOFF_RETIRED}.items()]
        write_json(ROOT / "docs" / "qa" / f"unit-5-{kind}-media-v1.json", proof)
    record_plans(pack_map, json.loads(BASELINE.read_text(encoding="utf-8")))
    record_superseded_edits(pack_map["5.10"])
    record_target_reviews(lessons["5.10"], staged["5.10"][2])


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
        print("review exceptions added:", prepare_review_exceptions(pack_map["5.9"]))
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
        print("Installed Unit 5 lessons match the builder.")
        return 0
    if args.lessons_only:
        if args.draft or not args.base_ref:
            raise ValueError("--lessons-only needs --base-ref and measured geometry.")
        for number, path in LESSONS.items():
            path.write_text(rendered[number], encoding="utf-8", newline="\n")
        print("Rewrote Unit 5 lesson files; run the media preservation audit next.")
        return 0
    if args.write:
        if args.draft:
            raise ValueError("Never install draft geometry.")
        install(pack_map, lessons)
        print("Installed Unit 5 lessons and stills. Audio, manifests, snapshots and device QA remain required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
