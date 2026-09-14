"""Compile the reviewed Unit 2 story pack, never the stale full-course canvas.

Default is validation-only. --write requires every generated image to have a
matching paid receipt and explicit hash-bound agent inspection. This does not
record human approval or make the complete Units 2–7 rollout releasable.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.schemas import MissionLesson
from scripts.render_course_stills import digest, load_pack

PACK = ROOT / "docs/product/unit-2-mission-pack.json"
LESSON = ROOT / "backend/lessons/unit_2/lesson-2-10-around-me-mission.yaml"
OUTPUT = ROOT / "output/imagegen/unit-2-mission-v4"
IMAGES = ROOT / "Lessons/Lesson1/images"


def asset_name(asset_id: str) -> str:
    return "a1_u2_meeting_v4_" + asset_id.replace("-", "_") + ".webp"


def url(asset_id: str) -> str:
    return "/lesson-assets/" + asset_name(asset_id)


def reviewed_assets(pack: dict, output: Path = OUTPUT) -> tuple[dict, list[dict]]:
    reviews_path = output / "agent-reviews.json"
    if not reviews_path.is_file():
        raise ValueError("Missing explicit agent visual inspections. No canonical lesson was changed.")
    reviews = json.loads(reviews_path.read_text(encoding="utf-8"))
    records = []
    for asset in pack["assets"]:
        path = output / (asset["id"] + ".png")
        receipt_path = path.with_suffix(".receipt.json")
        if not path.is_file() or not receipt_path.is_file():
            raise ValueError(f"Asset {asset['id']} is not generated with a receipt yet.")
        image_hash = digest(path)
        review = reviews.get(asset["id"], {})
        if review.get("disposition") != "usable" or review.get("sha256") != image_hash:
            raise ValueError(f"Asset {asset['id']} requires current pixel inspection.")
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        expected_prompt = pack["shared_prompt"] + "\n\n" + asset["prompt"]
        if (receipt.get("status") != "image_saved" or receipt.get("sha256") != image_hash
                or receipt.get("request", {}).get("prompt") != expected_prompt
                or any(receipt.get("request", {}).get(key) != value for key, value in pack["image_settings"].items())
                or receipt.get("byte_count") != path.stat().st_size
                or receipt.get("generation_requests_sent") != 1):
            raise ValueError(f"Asset {asset['id']} receipt does not match the exact scene contract.")
        if asset.get("reference"):
            reference_hash = digest(output / (asset["reference"] + ".png"))
            if [ref["sha256"] for ref in receipt.get("references", [])] != [reference_hash]:
                raise ValueError(f"Asset {asset['id']} uses stale reference pixels.")
        records.append({"asset_id": asset["id"], "runtime_filename": asset_name(asset["id"]),
                        "receipt": receipt, "agent_review": review, "human_approval": "pending"})
    return reviews, records


def compile_lesson(pack: dict, base: dict, reviews: dict) -> dict:
    lesson = copy.deepcopy(base)
    lesson.update(title="2.10 " + pack["title"], sub_lesson_title=pack["title"],
                  content_revision=pack["revision"],
                  goal="Find the park, identify transport and objects, distinguish near and far, check colors and quantities, and confirm the meeting aloud.",
                  unit_outcome="Identify familiar places and objects, distinguish near and far, and combine learned numbers, colors and nouns.",
                  grammar_function="What is it? / It is a...; This is... / That is...; numbers 1–10; number + color + singular/plural noun.",
                  speaking_outcome="Pronounce four complete It is a... answers after the helper's What is it? questions.")
    lesson["mission"].update(title=pack["title"], briefing=pack["briefing"],
                             kickoff_image_url=url("kickoff"), objectives=pack["objectives"],
                             completion_title=pack["completion_title"], completion_message=pack["completion_message"],
                             chapters=pack["chapters"], voice_heading=pack["voice_heading"],
                             voice_instruction="Lee cada respuesta en voz alta para confirmar",
                             voice_success_label="CONFIRMACIÓN COMPLETA")
    cards = []
    for beat in pack["beats"]:
        geometry = reviews.get(beat["asset"], {}).get("targets", [])
        if len(geometry) != len(beat["cues"]):
            raise ValueError(f"{beat['id']}: every cue needs one reviewed target, in authored cue order.")
        options, targets, cues = [], [], []
        for i, (text, translation, target_geometry) in enumerate(zip(beat["cues"], beat["translations"], geometry, strict=True), 1):
            identifier = f"{beat['asset']}-{i}"
            options.append({"id": identifier, "label": text, "image_url": ""})
            targets.append({"id": identifier, "label_es": translation, "subject_kind": "object",
                            "accepted_option_ids": [identifier], **target_geometry})
            cues.append({"id": "cue-" + identifier, "text": text, "answer_text": text,
                         "target_id": identifier, "option_id": identifier})
        phrase = " ".join(beat["cues"])
        card = {"slide_id": beat["id"], "mission_chapter_id": beat["chapter"],
                "interaction_type": "mission-game", "stage": "Listen", "prompt": phrase,
                "prompt_image_url": url(beat["asset"]), "options": options,
                "correct_option_id": options[0]["id"], "correct_option_ids": [item["id"] for item in options],
                "audio_text": phrase,
                "audio_turns": [{"text": text, "speaker_role": "teacher", "image_url": url(beat["asset"])} for text in beat["cues"]],
                "spanish_translation": " ".join(beat["translations"]),
                "pedagogy_note": beat["purpose_es"],
                "mission_game": {"kind": "guided-search" if not cards else "crowd-search",
                                 "instruction_es": beat["instruction_es"], "validation": "ordered",
                                 "targets": targets, "cues": cues}}
        if not cards:
            card["mission_game"]["tutorial_mode"] = "guided-no-fail"
        cards.append(card)
    for index, gate in enumerate(pack["voice_gates"]):
        identifier = gate["response_asset"]
        cards.append({"slide_id": gate["id"], "mission_chapter_id": "confirm-the-meeting",
                      "interaction_type": "mission-finale" if index == len(pack["voice_gates"]) - 1 else "mission-speak",
                      "stage": "Speak", "prompt": gate["answer"], "prompt_image_url": "",
                      "options": [{"id": identifier, "label": gate["answer"], "image_url": url(identifier)}],
                      "correct_option_id": identifier, "audio_text": gate["answer"],
                      "audio_turns": [{"text": gate["question"], "speaker_role": "female-character",
                                       "image_url": url(gate["question_asset"])}],
                      "spanish_translation": gate["translation"], "pedagogy_note": gate["purpose_es"],
                      "mission_game": {"kind": "voice-gate", "instruction_es": "Escucha la pregunta. Después lee la respuesta en voz alta.",
                                       "validation": "single", "cue_audio_text": gate["question"],
                                       "targets": [{"id": identifier, "label_es": gate["translation"],
                                                    "accepted_option_ids": [identifier],
                                                    "rect": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}}],
                                       "cues": [{"id": "cue-" + identifier, "text": gate["question"], "answer_text": gate["answer"],
                                                 "target_id": identifier, "option_id": identifier}]}})
    lesson["cards"] = cards
    for index, card in enumerate(cards, 1):
        card["pedagogy_note"] = f"Mission beat {index:02d}/{len(cards):02d}: " + card["pedagogy_note"]
    lesson["purposeful_review_slides"] = [card["slide_id"] for card in cards]
    foundations = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(LESSON.parent.glob("*.yaml"))
                   if path != LESSON and not path.stem.startswith("lesson-2-9-")]
    lesson["review_vocabulary"] = list(dict.fromkeys(word for foundation in foundations for word in foundation.get("vocabulary", [])))
    MissionLesson.model_validate(lesson)
    return lesson


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    pack = load_pack(PACK)
    reviews, records = reviewed_assets(pack)
    # Keep every paid attempt in the durable cost ledger, including rejected
    # candidate images. Rejection never makes its actual charge disappear.
    attempts = []
    for receipt_path in sorted(OUTPUT.glob("*.receipt.json")):
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        asset_id = receipt["asset_id"]
        attempts.append({"receipt": receipt, "agent_review": reviews.get(asset_id, {}),
                         "installed": any(record["asset_id"] == asset_id for record in records)})
    before = LESSON.read_bytes()
    base = json.loads(before)
    if base.get("content_revision") not in (3, pack["revision"]):
        raise ValueError("Canonical mission advanced independently; reconcile before replacing it.")
    lesson = compile_lesson(pack, base, reviews)
    print(json.dumps({"lesson": lesson["sub_lesson_id"], "beats": len(lesson["cards"]),
                      "listening_decisions": sum(len(beat["cues"]) for beat in pack["beats"]),
                      "voice_gates": len(pack["voice_gates"]), "images": len(records),
                      "write": args.write, "human_approval": "pending"}))
    if not args.write:
        return 0
    from PIL import Image
    # Preflight the entire set before installing or changing any canonical card.
    rendered = {}
    archive = IMAGES / "course-photoreal-sources/unit-2/mission-v4"
    rejected_sources = []
    for attempt in attempts:
        if attempt["installed"]:
            continue
        receipt = attempt["receipt"]
        source = OUTPUT / (receipt["asset_id"] + ".png")
        if receipt.get("status") != "image_saved" or not source.is_file() or digest(source) != receipt.get("sha256"):
            raise ValueError("A paid rejected attempt is not reconciled; preserve its evidence before installation.")
        target = archive / "rejected" / source.name
        if target.exists() and digest(target) != digest(source):
            raise ValueError("Refusing to overwrite different rejected source pixels.")
        rejected_sources.append((source, target))
    import io
    for record in records:
        source = OUTPUT / (record["asset_id"] + ".png")
        archived = archive / source.name
        if archived.exists() and digest(archived) != digest(source):
            raise ValueError("Different archived source exists; preserve it and use a new version.")
        with Image.open(source) as image:
            if image.size != (1536, 1024):
                raise ValueError(f"{source.name}: cannot crop a generated scene into compliance.")
            stream = io.BytesIO()
            image.convert("RGB").save(stream, "WEBP", quality=92, method=6)
            pixels = stream.getvalue()
        name = record["runtime_filename"]
        for root in (IMAGES, ROOT / "mobile/assets/lesson-assets", ROOT / "frontend/public/lesson-assets"):
            target = root / name
            if target.exists() and target.read_bytes() != pixels:
                raise ValueError(f"Refusing to overwrite a different versioned asset: {target}")
        rendered[name] = pixels
        record["runtime_sha256"] = hashlib.sha256(pixels).hexdigest()
    if LESSON.read_bytes() != before:
        raise ValueError("Concurrent lesson change detected before installation.")
    for name, pixels in rendered.items():
        for root in (IMAGES, ROOT / "mobile/assets/lesson-assets", ROOT / "frontend/public/lesson-assets"):
            (root / name).write_bytes(pixels)
    archive.mkdir(parents=True, exist_ok=True)
    for record in records:
        source = OUTPUT / (record["asset_id"] + ".png")
        target = archive / source.name
        if target.exists() and digest(target) != digest(source):
            raise ValueError("Different archived source exists; preserve it and use a new version.")
        shutil.copyfile(source, target)
    for source, target in rejected_sources:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    LESSON.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    proof = ROOT / "docs/qa/unit-2-mission-media-v4.json"
    proof.write_text(json.dumps({"schema_version": 1, "pack_sha256": digest(PACK),
                                "human_approval": "pending", "assets": records,
                                "paid_attempts": attempts}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    photo_registry = ROOT / "docs/product/a1-reviewed-photoreal-media.json"
    photo_data = json.loads(photo_registry.read_text(encoding="utf-8"))
    photo_data["files"] = sorted(set(photo_data["files"]) | set(rendered))
    photo_registry.write_text(json.dumps(photo_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    target_registry = ROOT / "docs/qa/units-2-7-mission-target-reviews.json"
    target_data = json.loads(target_registry.read_text(encoding="utf-8"))
    replaced = [row for row in target_data["reviews"] if row["lesson_id"] == lesson["id"]]
    # Preserve the old geometry evidence as history, never pretend it applies to new pixels.
    history = target_data.setdefault("superseded_reviews", [])
    for row in replaced:
        if not row["filename"].startswith("a1_u2_meeting_v4_") and row not in history:
            history.append(row)
    target_data["reviews"] = [row for row in target_data["reviews"] if row["lesson_id"] != lesson["id"]]
    by_name = {record["runtime_filename"]: record for record in records}
    for card in lesson["cards"]:
        groups = {target["id"]: target["head_anchors"] for target in card["mission_game"]["targets"]
                  if len(target.get("head_anchors", [])) > 1}
        if groups:
            name = Path(card["prompt_image_url"]).name
            target_data["reviews"].append({"lesson_id": lesson["id"], "slide_id": card["slide_id"],
                                          "filename": name, "sha256": by_name[name]["runtime_sha256"],
                                          "targets": groups, "note": by_name[name]["agent_review"]["notes"]})
    target_registry.write_text(json.dumps(target_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Installed Unit 2 mission and byte-identical stills. Audio, manifests, snapshots and device verification remain required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
