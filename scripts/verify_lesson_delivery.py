"""Independent, read-only fidelity check for the local lossless delivery artifact."""
from __future__ import annotations
import argparse
import hashlib
import json
import sys
from pathlib import Path


def content_hash(value):
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def verify_package(package, original, *, repo, asset_root):
    """Independently verify a review package; never assert runtime readiness."""
    repo, root = Path(repo).resolve(), Path(asset_root).resolve()
    failures = []
    # Share only the source admission contract. The field-by-field projection,
    # audio/media identities and sidecar checks below remain independent of the
    # compiler, so a forged package cannot bypass admission by skipping compilation.
    sys.path.insert(0, str(repo))
    from scripts.compile_lesson_delivery import validate_source_fields
    try:
        validate_source_fields(original)
    except (ValueError, KeyError, TypeError) as error:
        return {"status": "fail", "contentSha256": package.get("contentSha256"),
                "errors": [f"Invalid source contract: {error}"]}
    def check(condition, label):
        if not condition:
            failures.append(label)
    def check_file(relative, expected_hash, label):
        path = (root / relative).resolve()
        if not path.is_relative_to(root) or path == root or Path(relative).is_absolute():
            failures.append(f"{label}: media escaped package root")
            return
        if not path.is_file():
            failures.append(f"{label}: media missing")
        else:
            check(hashlib.sha256(path.read_bytes()).hexdigest() == expected_hash, f"{label}: media hash")

    check(package["schema"] == "lossless-lesson-delivery/2", "Unsupported delivery package schema")
    check(package["source"] == original, "Full source content differs")
    check(package["contentSha256"] == content_hash(original), "Content hash differs")
    namespace = package["namespace"]
    source_cards = [(lesson, card, index) for lesson in original["lessons"] for index, card in enumerate(lesson["cards"])]
    check(len(source_cards) == len(package["sidecars"]) == len(package["identities"]), "Source/sidecar/identity count")
    canonical_ids = set()
    for (lesson, card, index), sidecar, identity in zip(source_cards, package["sidecars"], package["identities"]):
        label = card["id"]
        expected_lesson_id = f"{namespace}-lesson-{lesson['id'].replace('.', '-')}"
        expected_slide_id = f"{namespace}-{label}"
        canonical_ids.add((expected_lesson_id, expected_slide_id))
        check(sidecar["source"] == card, f"{label}: exact source sidecar")
        check(sidecar["sourceSha256"] == content_hash(card), f"{label}: source hash")
        for entry in (sidecar, identity):
            check(entry["sourceLessonId"] == lesson["id"] and entry["sourceCardId"] == label, f"{label}: source identity/order")
            check(entry["canonicalLessonId"] == expected_lesson_id and entry["canonicalSlideId"] == expected_slide_id, f"{label}: collision-safe identity")
            check(entry["position"] == index, f"{label}: learner order")
    check(len(canonical_ids) == len(source_cards), "Duplicate canonical IDs")

    for image_id, asset in original["assets"].items():
        check_file(asset["file"], asset["sha256"], f"image {image_id}")
    image_urls = {image_id: f"/lesson-assets/{namespace}-{Path(asset['file']).name}"
                  for image_id, asset in original["assets"].items()}
    expected_images = [{"id": image_id, "canonicalUrl": image_urls[image_id], **asset}
                       for image_id, asset in sorted(original["assets"].items())]
    check(package["imageAssets"] == expected_images, "Canonical image inventory differs")
    expected_audio_bindings = []
    for lesson, card, card_index in source_cards:
        for field, purpose in (("turns", "prompt"), ("answerTurns", "answer")):
            for turn_index, turn in enumerate(card.get(field, []), 1):
                recording_fields = {key for key in ("audio", "audioSha256", "clipId") if key in turn}
                check(not recording_fields or len(recording_fields) == 3 and all(turn[key] for key in recording_fields), f"{card['id']}: incomplete recording identity")
                if turn.get("audio"):
                    check_file(turn["audio"], turn["audioSha256"], f"audio {card['id']} {purpose} {turn_index}")
                else:
                    check(not turn.get("audioReceipt"), f"{card['id']}: receipt without recording")
                    check(card['id'] in package['integrationContract']['nativeImportBlockedReasons'].get('pending-source-audio', {}).get('cards', []), f"{card['id']}: pending recording not disclosed")
                expected_audio_bindings.append({
                    "lessonId": f"{namespace}-lesson-{lesson['id'].replace('.', '-')}",
                    "slideId": f"{namespace}-{card['id']}", "cardPosition": card_index,
                    "purpose": f"{purpose}-turn-{turn_index}", "turn": turn,
                    "image": original["assets"].get(turn.get("image")),
                    "frames": [original["assets"][image_id] for image_id in turn.get("frames", [])],
                })
    check(len(expected_audio_bindings) == len(package["deliveryAudioBindings"]), "Full audio sequence count")
    for expected, binding in zip(expected_audio_bindings, package["deliveryAudioBindings"]):
        check(binding["contract"] == expected, f"{expected['slideId']}: exact audio/visual turn contract")
        check(binding["bindingSha256"] == content_hash(expected), f"{expected['slideId']}: audio/visual binding hash")

    source_receipts = {
        turn["audioReceipt"]: turn
        for _, card, _ in source_cards
        for field in ("turns", "answerTurns") for turn in card.get(field, [])
        if turn.get("audioReceipt")
    }
    receipt_entries = {entry["file"]: entry for entry in package["receiptAssets"]}
    check(len(receipt_entries) == len(package["receiptAssets"]), "Duplicate receipt entries")
    check(set(receipt_entries) == set(source_receipts), "Prepared receipt inventory differs")
    for relative, turn in source_receipts.items():
        if relative not in receipt_entries:
            continue
        entry = receipt_entries[relative]
        check_file(relative, entry["sha256"], f"receipt {relative}")
        receipt_path = (root / relative).resolve()
        if receipt_path.is_relative_to(root) and receipt_path.is_file():
            check(entry["receipt"] == read(receipt_path), f"receipt {relative}: source differs")
        receipt = entry["receipt"]
        check(receipt.get("sha256") == turn["audioSha256"], f"receipt {relative}: audio differs")
        check(receipt.get("sourceText") == turn["text"], f"receipt {relative}: text differs")
        check(receipt.get("audioDelivery", "normal") == turn.get("audioDelivery", "normal"), f"receipt {relative}: delivery differs")

    sys.path.insert(0, str(repo / "backend"))
    from app.schemas import Lesson, MissionLesson
    from app.card_audio_assets import bind_lesson_audio_assets
    expected_supported = [lesson for lesson in original["lessons"] if lesson["kind"] != "mission"
                          or lesson.get("mission") and all(card.get("mission_kind") for card in lesson["cards"])]
    check(len(expected_supported) == len(package["canonicalProjection"]), "Canonical supported lesson count")
    projection_card_count = 0
    canonical_assets = []
    for source_lesson, projection in zip(expected_supported, package["canonicalProjection"]):
        model = (MissionLesson if source_lesson["kind"] == "mission" else Lesson)(**projection)
        check(len(model.cards) == len(source_lesson["cards"]), f"{model.id}: projection card count")
        check(model.model_dump(mode="json") == projection, f"{model.id}: unrecognized/dropped canonical fields")
        check(projection["vocabulary"] == source_lesson.get("vocabulary", []), f"{model.id}: exact vocabulary labels differ")
        source_lesson_fields = {
            "id": f"{namespace}-lesson-{source_lesson['id'].replace('.', '-')}",
            "title": f"{source_lesson['id']} {source_lesson['title']}", "unit_id": namespace,
            "lesson_id": f"{namespace}-lesson-{source_lesson['id'].replace('.', '-')}",
            "lesson_title": source_lesson["title"], "sub_lesson_id": source_lesson["id"],
            "sub_lesson_title": source_lesson["title"], "goal": source_lesson["outcome"],
            "content_revision": source_lesson.get("content_revision", 1),
        }
        for field, value in source_lesson_fields.items():
            check(projection.get(field) == value, f"{model.id}: authored lesson {field} differs")
        if source_lesson["kind"] == "mission":
            presentation = dict(source_lesson["mission"])
            if "kickoff_image" in presentation:
                presentation["kickoff_image_url"] = image_urls[presentation.pop("kickoff_image")]
            presentation.setdefault("chapters", source_lesson.get("chapters", []))
            for field, value in presentation.items():
                check(projection["mission"].get(field) == value, f"{model.id}: authored mission {field} differs")
        rebound = bind_lesson_audio_assets(model).model_dump(mode="json")
        check(rebound == projection, f"{model.id}: noncanonical immutable audio IDs")
        for source_card, canonical in zip(source_lesson["cards"], projection["cards"]):
            projection_card_count += 1
            check(canonical["slide_id"] == f"{namespace}-{source_card['id']}", "Canonical projection card order")
            check(canonical.get("context_es") == (source_card.get("context_es") or None),
                  f"{source_card['id']}: authored story context differs")
            if source_lesson["kind"] == "mission":
                check(canonical.get("mission_chapter_id") == source_card.get("chapter"),
                      f"{source_card['id']}: authored chapter differs")
            else:
                check(canonical["stage"] == source_card["stage"], f"{source_card['id']}: authored stage differs")
            if source_card["activity"] == "choice":
                expected_prompt = "Listen and choose." if source_card["stage"] in {"Listen", "Mission"} else source_card.get("prompt", "")
                check(canonical["prompt"] == expected_prompt, f"{source_card['id']}: shared listening/recognition prompt differs")
                check([o["id"] for o in canonical["options"]] == [o["id"] for o in source_card["options"]], f"{source_card['id']}: semantic option IDs differ")
                check(canonical["correct_option_id"] == source_card["answer"], f"{source_card['id']}: correct semantic option differs")
                check([o.get("label") for o in canonical["options"]] == [o.get("text") for o in source_card["options"]], f"{source_card['id']}: option labels differ")
                check([o["image_url"] for o in canonical["options"]] == [image_urls.get(o.get("image"), "") for o in source_card["options"]], f"{source_card['id']}: option images differ")
            if "spanish_translation" in source_card:
                check(canonical["spanish_translation"] == source_card["spanish_translation"], f"{source_card['id']}: authored translation differs")
            elif source_card["activity"] in {"teach", "speak"}:
                translations = [turn.get("translation_es") for turn in source_card.get("turns", [])]
                if translations and all(translations):
                    check(canonical["spanish_translation"] == " ".join(translations), f"{source_card['id']}: turn translation differs")
            source_turns = source_card.get("turns", [])
            if len(source_turns) == 1 and not source_turns[0].get("image"):
                check(not canonical["audio_turns"] and not canonical["prompt_image_url"]
                      and canonical["audio_text"] == source_turns[0]["text"]
                      and canonical["audio_speaker"] == source_turns[0]["speaker"], f"{source_card['id']}: unillustrated scalar audio differs")
            else:
                check([t["text"] for t in canonical["audio_turns"]] == [t["text"] for t in source_turns], f"{source_card['id']}: spoken prompt changed")
                check([t["speaker_role"] for t in canonical["audio_turns"]] == [t["speaker"] for t in source_turns], f"{source_card['id']}: voice changed")
                check([t["image_url"] for t in canonical["audio_turns"]] == [image_urls[t["image"]] for t in source_turns], f"{source_card['id']}: turn images changed")
            if source_card.get("mission_kind") == "voice-gate":
                target = source_card["speakTarget"]
                check(canonical["stage"] == "Speak" and canonical["prompt"] == target["text"]
                      and canonical["audio_text"] == target["text"]
                      and canonical["options"][0]["image_url"] == image_urls[target["image"]]
                      and canonical["answer_audio_text"] is None and not canonical["answer_audio_turns"], f"{source_card['id']}: written-answer voice gate differs")
            if source_card.get("mission_kind") == "conversation-decision":
                game = canonical["mission_game"]
                check(game["kind"] == "conversation-decision" and not game["targets"] and not game["cues"], f"{source_card['id']}: decision gained fabricated geometry/cues")
                if source_card.get("completionScene"):
                    scene = source_card["completionScene"]
                    check(game.get("completion_scene") == {"image_url": image_urls[scene["image"]], "context_es": scene["context_es"]}, f"{source_card['id']}: completion scene differs")
            canonical_assets.extend((projection["id"], canonical["slide_id"], asset, source_card) for asset in canonical["audio_assets"])
    check(len(canonical_assets) == len(package["canonicalAudioBindings"]), "Canonical audio binding count")
    for (lesson_id, slide_id, asset, source_card), binding in zip(canonical_assets, package["canonicalAudioBindings"]):
        check(binding["canonicalLessonId"] == lesson_id and binding["canonicalSlideId"] == slide_id and binding["asset"] == asset, f"{slide_id}: canonical audio identity differs")
        check(binding["installed"] is False, f"{slide_id}: unproven canonical audio installation")
        take = binding.get("take")
        purpose = ("prompt" if asset["purpose"] == "mission-cue" else asset["purpose"]).split("-turn-")
        field = "turns" if purpose[0] == "prompt" else "answerTurns"
        turns = source_card.get(field, [])
        if len(purpose) == 2:
            turns = turns[int(purpose[1]) - 1:int(purpose[1])]
        exact = [turn for turn in turns if turn["text"] == asset["text"] and turn["speaker"] == asset["speaker_role"]]
        if take is None:
            check(not any(turn.get("audio") for turn in exact), f"{slide_id}: exact authored take is missing")
            continue  # Explicit pending source occurrences and derived/intro gaps remain uninstalled.
        check(take["text"] == asset["text"] and take["speaker"] == asset["speaker_role"], f"{slide_id}: canonical take text/voice differs")
        check_file(take["file"], take["sha256"], f"{slide_id}: canonical audio take")
        if exact:
            check(any(take["file"] == turn.get("audio") and take["sha256"] == turn.get("audioSha256")
                      and take.get("audioDelivery", "normal") == turn.get("audioDelivery", "normal")
                      and take.get("audioReceipt") == turn.get("audioReceipt") for turn in exact), f"{slide_id}: exact prepared occurrence differs")
        if take.get("audioReceipt"):
            entry = receipt_entries.get(take["audioReceipt"])
            check(entry is not None and entry["sha256"] == take.get("receiptSha256"), f"{slide_id}: canonical receipt hash differs")
    for relative, expected in package["integrationContract"]["sourceAuthoritySha256"].items():
        check(hashlib.sha256((repo / relative).read_bytes()).hexdigest() == expected, f"Authority changed: {relative}")
    if any(lesson.get("experience_type") == "mission" for lesson in package["canonicalProjection"]):
        sys.path.insert(0, str(repo))
        from scripts.validate_lesson_cards import validate_mission_contracts
        models = {lesson["id"]: (MissionLesson if lesson.get("experience_type") == "mission" else Lesson)(**lesson)
                  for lesson in package["canonicalProjection"]}
        failures.extend(error for error in validate_mission_contracts(models)
                        if any(error.startswith(f"{lesson_id} ") for lesson_id in models))
    check(package["integrationContract"]["nativeImportReady"] is False, "Unproven native compatibility asserted")
    check(package["integrationContract"]["published"] is False, "Unproven publication asserted")
    report = {"status": "pass" if not failures else "fail", "contentSha256": package["contentSha256"],
              "sourceCards": len(source_cards), "canonicalSchemaCards": projection_card_count,
              "orderedAudioBindings": len(expected_audio_bindings), "sourceImages": len(original["assets"]), "errors": failures}
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--asset-root", type=Path)
    args = parser.parse_args(argv)
    report = verify_package(read(args.package), read(args.source), repo=args.repo,
                            asset_root=args.asset_root or args.source.resolve().parent)
    print(json.dumps(report))
    if report["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
