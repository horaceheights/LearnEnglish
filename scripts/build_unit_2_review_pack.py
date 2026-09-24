"""Prepare scoped media exceptions or install the reviewed Unit 2 review pack.

No paid calls. Default is validation only. Original Gemini/unknown images and
all other lessons are preserved; installation requires individual pixel reviews.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.audit_course_media_preservation import BASELINE, PLANS, IMAGE_ROOTS, audit, digest, lessons, validate_plan
from scripts.render_course_stills import load_pack, pack_output_directory

PACK = ROOT / "docs/product/unit-2-review-pack.json"
# 2026-09-24 reuse pass: fresh review photos (Gemini, docs/product/unit-2-reuse-photos-v1.json)
# for "What number is it?", so the review never borrows the teaching lessons' numeral cards.
FRESH_NUMBERS = {"n7": "a1_u2_review_v2_parking_number_7.webp", "n8": "a1_u2_review_v2_bus_number_8.webp"}
LESSON = ROOT / "backend/lessons/unit_2/lesson-2-9-unit-2-review.yaml"


def prepare_exceptions(pack: dict) -> None:
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))
    current = lessons(ROOT)
    for asset in pack["assets"]:
        for old in asset["change_control"].get("replaces", []):
            proposal = {"lesson_id": pack["lesson_id"], "old_filename": old,
                        "old_sha256": baseline["assets"][old]["copies"][IMAGE_ROOTS[0]],
                        "new_filename": asset["runtime_filename"], "issue": "review-reuses-earlier-image",
                        "issue_detail": "Lesson 2.9 repeats the exact bytes already used by earlier teaching cards; retain this original and every other use, replace only the review binding with a fresh scene.",
                        "source_provenance": baseline["assets"][old]["provenance"],
                        "original_action": "preserve-byte-for-byte"}
            validate_plan(proposal, baseline, current, ROOT)
            existing = [p for p in plans["changes"] if (p["lesson_id"], p["old_filename"]) == (pack["lesson_id"], old)]
            if existing and existing != [proposal]:
                raise ValueError("Different exception exists; reconcile it explicitly.")
            if not existing:
                plans["changes"].append(proposal)
    PLANS.write_text(json.dumps(plans, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def compile_lesson(base: dict, pack: dict) -> dict:
    lesson = deepcopy(base)
    remap = {old: asset["runtime_filename"] for asset in pack["assets"] for old in asset["change_control"].get("replaces", [])}
    by_asset = {asset.get("concept_id", asset["id"]): asset["runtime_filename"] for asset in pack["assets"]}
    def remap_images(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in ("image_url", "prompt_image_url") and isinstance(item, str):
                    value[key] = remap.get(item, item)
                else:
                    remap_images(item)
        elif isinstance(value, list):
            for item in value:
                remap_images(item)
    remap_images(lesson)
    cards = {card["slide_id"]: card for card in lesson["cards"]}
    if len(cards) not in (32, 48):
        raise ValueError("Unexpected independent review revision; reconcile before authoring.")
    # Retain the old IDs for existing cards so their history stays traceable.
    def teach(identifier, text, translation, asset):
        return {"slide_id": identifier, "stage": "Learn", "interaction_type": "teach", "prompt": text,
                "audio_text": text, "answer_audio_text": None, "prompt_image_url": "", "correct_option_id": asset,
                "spanish_translation": translation, "pedagogy_note": "Fresh Unit 2 review station; previously taught language only.",
                "options": [{"id": asset, "label": text, "image_url": by_asset[asset]}]}
    additions = [teach("L5", "It is a bridge.", "Es un puente.", "bridge"),
                 teach("L6", "It is a phone.", "Es un teléfono.", "phone"),
                 teach("L7", "That is a chair.", "Esa es una silla.", "far-chair"),
                 teach("L8", "Two blue cars", "Dos coches azules", "blue-cars")]
    for card in additions:
        cards[card["slide_id"]] = card
    for identifier in ("R4", "R7", "R8"):
        # Empty-prompt Recognize uses the shared plain Spanish instruction;
        # never speak an English meta-instruction or leak the answer.
        cards[identifier]["prompt"] = ""
        cards[identifier]["audio_text"] = ""
        cards[identifier]["spanish_translation"] = "Elige la frase correcta."
    def replace_image_options(identifier, choices, correct):
        card = cards[identifier]
        card["options"] = [{"id": asset, "label": None, "image_url": by_asset[asset]} for asset in choices]
        card["correct_option_id"] = correct
        card["pedagogy_note"] = "Same-object near/far contrast: only the indicated distance changes. No noun-only shortcut."
    replace_image_options("R5", ["far-chair", "near-chair"], "far-chair")
    replace_image_options("N3", ["far-bag", "near-bag"], "near-bag")
    replace_image_options("N4", ["near-chair", "far-chair"], "far-chair")
    for identifier, text, translated, correct, choices in (
        ("N7", "It is number seven.", "Es el número siete.", "n7", ["n7", "n8"]),
        ("N8", "It is number eight.", "Es el número ocho.", "n8", ["n7", "n8"]),
    ):
        cards[identifier] = {"slide_id": identifier, "stage": "Listen", "interaction_type": "a2i2",
                             "prompt": "Listen and choose.", "audio_text": text, "answer_audio_text": None,
                             "correct_option_id": correct, "prompt_image_url": "", "spanish_translation": translated,
                             "pedagogy_note": "Number check in the world: the heard number is painted on a parking space or lit on a bus.",
                             "options": [{"id": item, "label": None, "image_url": FRESH_NUMBERS[item]} for item in choices]}
    cards["S6"] = {"slide_id": "S6", "interaction_type": "repeat", "prompt": "What number is it? It is number eight.",
                   "stage": "Speak", "correct_option_id": "what-number-is-it-it-is-number-eight-1",
                   "options": [{"id": "what-number-is-it-it-is-number-eight-1", "image_url": FRESH_NUMBERS["n8"],
                                "label": "What number is it? It is number eight."}],
                   "audio_text": "What number is it? It is number eight.", "answer_audio_text": None,
                   "prompt_image_url": "", "spanish_translation": "¿Qué número es? Es el número ocho.",
                   "pedagogy_note": "question-answer"}
    for identifier, word, translated, options in (
        ("N9", "Nine", "Nueve", ["Ten", "Eight", "Nine"]),
        ("N10", "Ten", "Diez", ["Nine", "Ten", "Seven"]),
    ):
        cards[identifier] = {"slide_id": identifier, "stage": "Listen", "interaction_type": "a2t4",
                             "prompt": "Listen and choose.", "audio_text": word, "answer_audio_text": None,
                             "correct_option_id": word.lower(), "prompt_image_url": "", "spanish_translation": translated,
                             "pedagogy_note": "Closing number-check station: retrieve the heard number without an image or translated answer.",
                             "options": [{"id": item.lower(), "label": item, "image_url": ""} for item in options]}
    for identifier, noun, translation, distractors in (
        ("N11", "store", "Es una tienda.", ["school", "hospital"]),
        ("N12", "house", "Es una casa.", ["park", "store"]),
        ("N13", "restaurant", "Es un restaurante.", ["hospital", "school"]),
        ("N14", "hospital", "Es un hospital.", ["restaurant", "house"]),
        ("N15", "street", "Es una calle.", ["bridge", "park"]),
        ("N16", "bike", "Es una bicicleta.", ["car", "bus"]),
        ("N17", "pen", "Es una pluma.", ["book", "phone"]),
        ("N18", "table", "Es una mesa.", ["chair", "bag"]),
    ):
        choices = list(distractors)
        choices.insert(int(identifier[1:]) % 3, noun)
        text = f"It is a {noun}."
        cards[identifier] = {"slide_id": identifier, "stage": "Listen", "interaction_type": "a2t4",
                             "prompt": "Listen and choose.", "audio_text": text, "answer_audio_text": None,
                             "correct_option_id": noun, "prompt_image_url": "", "spanish_translation": translation,
                             "pedagogy_note": "Audio-to-written-English review within the same place/transport/object station; all options already taught. No translated answer or redundant photo.",
                             "options": [{"id": item, "label": f"It is a {item}.", "image_url": ""} for item in choices]}
    # Preserve the newer concurrent Completa direction: guided two-tile
    # constructions then four complete phrases. Prompt speech stays fragments.
    guided = [("U1", "___ ___ it?", ["What", "is"]), ("U2", "This is ___ ___.", ["a", "bag"]),
              ("U3", "That is ___ ___.", ["a", "chair"]), ("U4", "Three ___ ___", ["green", "books"])]
    for identifier, prompt, words in guided:
        card = cards[identifier]
        card.update(interaction_type="complete2", prompt=prompt, audio_text=prompt,
                    correct_option_id=words[0].lower(), correct_option_ids=[word.lower() for word in words],
                    options=[{"id": word.lower(), "label": word, "image_url": ""} for word in words])
    for identifier, text in (("U5", "Four yellow pens"), ("U6", "Five black phones"),
                             ("U7", "One red car"), ("U8", "Six white bags")):
        card = cards[identifier]
        words = text.split()
        ids = [f"word-{i + 1}" for i in range(len(words))]
        card.update(interaction_type="complete-sentence", prompt=" ".join("___" for _ in words),
                    audio_text=text, answer_audio_text=text, correct_option_id=ids[0], correct_option_ids=ids,
                    options=[{"id": key, "label": word, "image_url": ""} for key, word in zip(ids, words)])
    for identifier, translation in {"U1": "¿Qué es?", "U2": "Esta es una bolsa.", "U3": "Esa es una silla.",
                                    "U4": "Tres libros verdes", "U5": "Cuatro plumas amarillas", "U6": "Cinco teléfonos negros",
                                    "U7": "Un coche rojo", "U8": "Seis bolsas blancas"}.items():
        cards[identifier]["spanish_translation"] = translation
        cards[identifier]["translation"] = translation
    # Same ordered stations across modalities: surroundings -> object identity
    # -> pointing near/far -> quantity/color -> final number check (Listen).
    order = ["L1", "L5", "L2", "L6", "L4", "L7", "L3", "L8"]
    order += [f"R{i}" for i in range(1, 9)]
    order += ["N1", "N11", "N12", "N13", "N14", "N15", "N2", "N16", "N17", "N18", "N3", "N4", "N6", "N5", "N7", "N8", "N9", "N10"]
    order += [f"S{i}" for i in range(1, 7)] + [f"U{i}" for i in range(1, 9)]
    lesson["cards"] = [cards[key] for key in order]
    lesson["content_revision"] = 1
    lesson["goal"] = "Review Unit 2 through fresh surroundings, object identification, true near/far contrasts, quantities and colors, then recognize the final numbers by ear. No new language."
    from scripts.course_contract import is_foundation
    lesson["review_vocabulary"] = sorted(set(word for value in lessons(ROOT).values()
                                               if value.get("unit_id") == "unit-2" and is_foundation(value)
                                               for word in value.get("vocabulary", [])))
    from backend.app.schemas import Lesson
    Lesson.model_validate(lesson)
    return lesson


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare-exceptions", action="store_true")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    pack = load_pack(PACK)
    if args.prepare_exceptions:
        prepare_exceptions(pack)
        print("Recorded review-only exceptions; no media changed or generated.")
        return 0
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    plans = json.loads(PLANS.read_text(encoding="utf-8"))["changes"]
    errors = audit(ROOT, baseline, plans)
    if errors:
        raise ValueError(errors)
    before = LESSON.read_bytes()
    result = compile_lesson(json.loads(before), pack)
    output = pack_output_directory(pack)
    reviews = json.loads((output / "agent-reviews.json").read_text(encoding="utf-8"))
    from PIL import Image
    records, exports = [], {}
    for asset in pack["assets"]:
        key = asset["id"]
        source = output / f"{key}.png"
        receipt = json.loads((output / f"{key}.receipt.json").read_text(encoding="utf-8"))
        review = reviews.get(key, {})
        if not source.is_file() or receipt.get("status") != "image_saved" or receipt.get("sha256") != digest(source):
            raise ValueError(f"Missing or stale receipt: {key}")
        expected_prompt = pack["shared_prompt"] + "\n\n" + asset["prompt"]
        if (receipt.get("request", {}).get("prompt") != expected_prompt
                or any(receipt.get("request", {}).get(k) != v for k, v in pack["image_settings"].items())
                or receipt.get("byte_count") != source.stat().st_size or receipt.get("generation_requests_sent") != 1):
            raise ValueError(f"Prompt differs from receipt: {key}")
        if asset.get("reference") and [ref["sha256"] for ref in receipt.get("references", [])] != [digest(output / f"{asset['reference']}.png")]:
            raise ValueError(f"Stale reference pixels: {key}")
        if review.get("disposition") != "usable" or review.get("sha256") != digest(source) or not review.get("notes"):
            raise ValueError(f"Individual visual inspection required: {key}")
        with Image.open(source) as photo:
            if photo.size != (1536, 1024):
                raise ValueError("Do not crop generated pixels into compliance.")
            buf = io.BytesIO()
            photo.convert("RGB").save(buf, "WEBP", quality=92, method=6)
        pixels = buf.getvalue()
        filename = asset["runtime_filename"]
        for folder in IMAGE_ROOTS:
            target = ROOT / folder / filename
            if target.exists() and target.read_bytes() != pixels:
                raise ValueError(f"Refusing to overwrite image: {target}")
        exports[filename] = pixels
        archive = ROOT / IMAGE_ROOTS[0] / "course-photoreal-sources/unit-2/review-v1" / source.name
        if archive.exists() and digest(archive) != digest(source):
            raise ValueError("Refusing to overwrite archived source.")
        records.append({"asset_id": key, "runtime_filename": filename, "runtime_sha256": hashlib.sha256(pixels).hexdigest(),
                        "source_path": archive.relative_to(ROOT).as_posix(), "receipt": receipt, "agent_review": review,
                        "change_control": asset["change_control"], "human_approval": "pending"})
    print(json.dumps({"cards": len(result["cards"]), "fresh_stills": len(records), "write": args.write}))
    attempts = []
    rejected = []
    active = {asset["id"] for asset in pack["assets"]}
    for path in sorted(output.glob("*.receipt.json")):
        receipt = json.loads(path.read_text(encoding="utf-8"))
        key = receipt["asset_id"]
        source = output / f"{key}.png"
        if receipt.get("status") != "image_saved" or not source.is_file() or receipt.get("sha256") != digest(source) or receipt.get("cost", {}).get("usd") is None:
            raise ValueError("Every paid attempt must be reconciled, including rejected output.")
        attempts.append({"receipt": receipt, "installed": key in active, "agent_review": reviews.get(key, {})})
        if key not in active:
            if reviews.get(key, {}).get("disposition") != "rejected" or reviews[key].get("sha256") != digest(source):
                raise ValueError("Unused paid output needs an explicit hash-bound rejection.")
            archive = ROOT / IMAGE_ROOTS[0] / "course-photoreal-sources/unit-2/review-v1/rejected" / source.name
            if archive.exists() and digest(archive) != digest(source):
                raise ValueError("Do not overwrite rejected source history.")
            rejected.append((source, archive))
    if not args.write:
        return 0
    if LESSON.read_bytes() != before:
        raise ValueError("Concurrent canonical edit; stop.")
    for filename, pixels in exports.items():
        for folder in IMAGE_ROOTS:
            (ROOT / folder / filename).write_bytes(pixels)
    for record in records:
        archive = ROOT / record["source_path"]
        archive.parent.mkdir(parents=True, exist_ok=True)
        archive.write_bytes((output / f"{record['asset_id']}.png").read_bytes())
    for source, archive in rejected:
        archive.parent.mkdir(parents=True, exist_ok=True)
        archive.write_bytes(source.read_bytes())
    LESSON.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    proof = {"schema_version": 1, "pack_sha256": digest(PACK), "human_approval": "pending", "assets": records, "paid_attempts": attempts}
    (ROOT / "docs/qa/unit-2-review-media-v1.json").write_text(json.dumps(proof, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    registry = ROOT / "docs/product/a1-reviewed-photoreal-media.json"
    data = json.loads(registry.read_text(encoding="utf-8"))
    data["files"] = sorted(set(data["files"]) | set(exports))
    registry.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if errors := audit(ROOT, baseline, plans):
        raise ValueError(errors)
    print("Installed review only; original files and every other lesson binding preserved.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
