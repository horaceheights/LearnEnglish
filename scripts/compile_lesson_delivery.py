"""Compile a lossless, offline lesson delivery package. Never installs or publishes.

The source payload is the content authority. The canonical projection is explicitly
partial when the inspected app engine cannot represent a behavior. Known unsupported
fields remain in exact sidecars; unrecognized behavior fails instead of disappearing.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

LISTEN_PROMPT = "Listen and choose."
AUTHORITY_FILES = (
    "backend/app/schemas.py", "backend/app/card_audio_assets.py",
    "backend/app/course_audio_profile.py", "mobile/src/types.ts",
    "mobile/src/missionExperience.ts", "mobile/src/screens/LessonScreen.tsx",
    "scripts/export_mobile_preview_lessons.py",
    "scripts/compile_lesson_delivery.py", "scripts/verify_lesson_delivery.py", "scripts/validate_lesson_cards.py",
    "scripts/listening_contract.py",
    "mobile/src/choiceTeaching.ts", "mobile/src/lessonMistakeHints.ts", "mobile/src/constructionTeaching.ts",
    "mobile/src/teachingClock.ts", "mobile/src/courseAudioSources.ts",
    "mobile/src/components/TeachingClocks.tsx", "mobile/src/components/OptionMediaImage.tsx",
    "mobile/src/components/SentenceConstruction.tsx", "mobile/src/components/LessonCardView.tsx",
    "mobile/src/components/PronunciationPractice.tsx", "mobile/src/components/MissionVoicePresentation.tsx",
    "mobile/src/components/MissionConversationDecision.tsx", "mobile/src/components/MissionGameSurface.tsx",
    "mobile/src/components/LessonLandscapeRail.tsx",
    "frontend/components/LessonPlayer.js", "frontend/components/SentenceConstruction.js",
    "frontend/components/TeachingClocks.js", "frontend/components/CelebrationMission.js",
    "frontend/components/MissionConversationDecision.js", "backend/app/course_audio_receipts.py",
)


def contained_file(root, relative):
    """Only package-relative media may participate in a delivery contract."""
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or path == root or Path(relative).is_absolute():
        raise ValueError(f"Media escaped package root: {relative}")
    return path


def require_known_fields(value, allowed, label):
    unknown = sorted(set(value) - set(allowed.split()))
    if unknown:
        raise ValueError(f"Unsupported source fields at {label}: {', '.join(unknown)}")


def validate_source_fields(source):
    """Known sidecar-only fields are explicit; new behavior cannot vanish silently."""
    require_known_fields(source, "title sourceVersion scope lessons assets revision", "source")
    lesson_ids, slide_ids = set(), set()
    for lesson in source["lessons"]:
        require_known_fields(lesson, "id title outcome kind cards chapters content_revision mission vocabulary", "lesson")
        if "vocabulary" in lesson and (not isinstance(lesson["vocabulary"], list)
                or any(not isinstance(term, str) or not term.strip() for term in lesson["vocabulary"])):
            raise ValueError(f"Vocabulary must contain exact nonblank English labels: {lesson['id']}")
        if lesson["id"] in lesson_ids:
            raise ValueError(f"Duplicate lesson ID: {lesson['id']}")
        lesson_ids.add(lesson["id"])
        if lesson["kind"] not in {"teaching", "review", "mission"}:
            raise ValueError(f"Unsupported lesson kind: {lesson['kind']}")
        for card in lesson["cards"]:
            require_known_fields(card, "id stage activity context_es instruction_es turns answerTurns prompt image options answer hint_es feedbackByOption target guided clock clockCues frames speakTarget chapter spanish_translation mission_kind completionScene", card.get("id", "card"))
            if not card["id"] or card["id"] in slide_ids:
                raise ValueError(f"Blank or duplicate card ID: {card['id']}")
            slide_ids.add(card["id"])
            for field in ("turns", "answerTurns"):
                for index, turn in enumerate(card.get(field, [])):
                    require_known_fields(turn, "speaker text image translation_es clock clockCues frames audio audioSha256 clipId audioDelivery audioReceipt", f"{card['id']}.{field}[{index}]")
                    recording_fields = {key for key in ("audio", "audioSha256", "clipId") if key in turn}
                    if recording_fields and (len(recording_fields) != 3 or any(not turn[key] for key in recording_fields)):
                        raise ValueError(f"Incomplete recording identity: {card['id']}.{field}[{index}]")
                    if turn.get("audioReceipt") and not recording_fields:
                        raise ValueError(f"Receipt without recording identity: {card['id']}.{field}[{index}]")
            # Ordinary lessons use only the existing five-stage activity contract.
            # Untyped legacy mission data remains explicit sidecar-only content.
            ordinary = lesson["kind"] != "mission"
            if ordinary:
                if card["stage"] == "Listen":
                    from scripts.listening_contract import ordinary_listening_errors
                    issues = ordinary_listening_errors(card.get("context_es"),
                        " ".join(turn["text"] for turn in card.get("turns", [])),
                        card.get("options", []), card.get("answer"))
                    if issues:
                        raise ValueError(f"{card['id']}: {'; '.join(issues)}")
                stages = {"teach": {"Learn"}, "choice": {"Recognize", "Listen"},
                          "speak": {"Speak"}, "build": {"Use"}}
                if card["stage"] not in stages.get(card["activity"], set()):
                    raise ValueError(f"Unsupported ordinary activity/stage: {card['id']}")
                if (card["activity"] in {"teach", "speak", "build"} or card["stage"] == "Listen") and not card.get("turns"):
                    raise ValueError(f"Ordinary spoken activity needs authored prompt turns: {card['id']}")
            ids = []
            for option in card.get("options", []):
                require_known_fields(option, "id text image clock", f"{card['id']}.options")
                if not option["id"] or option["id"] in ids:
                    raise ValueError(f"Blank or duplicate option ID: {card['id']}")
                ids.append(option["id"])
            if card["activity"] == "choice" and card.get("answer") not in ids:
                raise ValueError(f"Choice answer missing from options: {card['id']}")
            if ordinary and card["activity"] == "choice":
                options = card.get("options", [])
                text_bank = all(isinstance(option.get("text"), str) and option["text"].strip()
                                and not option.get("image") for option in options)
                image_bank = all(isinstance(option.get("image"), str) and option["image"].strip()
                                 and not option.get("text") for option in options)
                if not ((text_bank and 2 <= len(options) <= 3) or (image_bank and len(options) == 2)):
                    raise ValueError(f"Unsupported ordinary choice bank: {card['id']}")
                # Reviewed clock overlays can distinguish two records of the same photograph.
                # They stay explicit unsupported projection metadata until installation.
                visible = [option["text"].strip().casefold() if text_bank else
                           digest({"image": option["image"], "clock": option.get("clock")}) for option in options]
                if len(visible) != len(set(visible)):
                    raise ValueError(f"Ordinary choices must have distinct visible alternatives: {card['id']}")
                if card["stage"] == "Recognize":
                    if image_bank and not str(card.get("prompt", "")).strip():
                        raise ValueError(f"Written image recognition needs an English prompt: {card['id']}")
                    if text_bank and not (card.get("image") or any(turn.get("image") for turn in card.get("turns", []))):
                        raise ValueError(f"Picture recognition needs an authored image: {card['id']}")


def require_preserved_fields(authored, canonical, label):
    """Pydantic defaults must never hide a dropped or coerced projected field."""
    if isinstance(authored, dict):
        for key, value in authored.items():
            if key not in canonical:
                if value is None:
                    continue
                raise ValueError(f"Projection silently discarded {label}.{key}")
            require_preserved_fields(value, canonical[key], f"{label}.{key}")
    elif isinstance(authored, list):
        if not isinstance(canonical, list) or len(authored) != len(canonical):
            raise ValueError(f"Projection changed sequence at {label}")
        for index, (left, right) in enumerate(zip(authored, canonical)):
            require_preserved_fields(left, right, f"{label}[{index}]")
    elif authored != canonical:
        raise ValueError(f"Projection changed {label}: {authored!r} != {canonical!r}")


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def digest(value):
    return hashlib.sha256(encoded(value)).hexdigest()


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def compile_package(source, plan, *, repo, asset_root, namespace, package_name="lesson-delivery-package.json", level=None):
    """Return review artifacts; this function never installs content or writes files."""
    from types import SimpleNamespace
    args = SimpleNamespace(repo=Path(repo).resolve(), namespace=namespace, package_name=package_name)
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", namespace):
        raise ValueError("Namespace must be a nonblank lowercase hyphenated identifier.")
    if not package_name or Path(package_name).name != package_name:
        raise ValueError("Package name must be one filename.")
    root = Path(asset_root).resolve()
    validate_source_fields(source)
    source_hash = digest(source)
    sys.path.insert(0, str(args.repo / "backend"))
    from app.schemas import Lesson, MissionLesson
    from app.card_audio_assets import bind_lesson_audio_assets

    plan_by_id = {lesson["id"]: lesson for lesson in plan["lessons"]}
    if len(plan_by_id) != len(plan["lessons"]):
        raise ValueError("Duplicate plan lesson IDs")
    missing_plans = sorted({lesson["id"] for lesson in source["lessons"]} - set(plan_by_id))
    if missing_plans:
        raise ValueError(f"Source lessons missing from plan: {missing_plans}")
    errors = []
    gaps = {}
    def gap(key, message, card_id=None):
        entry = gaps.setdefault(key, {"message": message, "cards": []})
        if card_id and card_id not in entry["cards"]:
            entry["cards"].append(card_id)

    # These are packaging requirements, not fabricated schema capabilities.
    if any(Path(asset["file"]).suffix != ".webp" for asset in source["assets"].values()):
        gap("image-bundling", "Some retained image formats are unsupported by the current offline exporter; review a shared rendering/bundling solution before installation.")
    gap("runtime-review", "Native/web parity and human semantic/audio approval are pending; this local package does not establish them.")
    image_assets = []
    image_urls = {}
    for image_id, asset in sorted(source["assets"].items()):
        path = contained_file(root, asset["file"])
        if not path.is_file() or file_hash(path) != asset["sha256"]:
            errors.append(f"Image bytes invalid: {image_id}")
        url = f"/lesson-assets/{args.namespace}-{Path(asset['file']).name}"
        if url in image_urls.values():
            raise ValueError(f"Image filenames collide in projection: {asset['file']}")
        image_urls[image_id] = url
        image_assets.append({"id": image_id, "canonicalUrl": url, **asset})

    def image_url(image_id):
        if not image_id:
            return ""
        if image_id not in image_urls:
            raise ValueError(f"Unbound image {image_id}")
        return image_urls[image_id]

    exact_takes = {}
    receipt_assets = {}
    for lesson in source["lessons"]:
        for card in lesson["cards"]:
            for field in ("turns", "answerTurns"):
                for turn in card.get(field, []):
                    if not turn.get("audio"):
                        gap("pending-source-audio", "Authored turns without a recording retain their exact text, speaker and delivery intent. No cached or normal-speed recording substitutes for them; media generation and approval remain pending.", card["id"])
                        continue
                    audio_path = contained_file(root, turn["audio"])
                    if not audio_path.is_file() or file_hash(audio_path) != turn["audioSha256"]:
                        errors.append(f"Audio bytes invalid: {card['id']} / {turn['text']}")
                    key = (turn["speaker"], turn["text"], turn.get("audioDelivery", "normal"))
                    take = {"speaker": turn["speaker"], "text": turn["text"], "file": turn["audio"], "sha256": turn["audioSha256"], "clipId": turn["clipId"]}
                    for field_name in ("audioDelivery", "audioReceipt"):
                        if field_name in turn:
                            take[field_name] = turn[field_name]
                    if turn.get("audioDelivery", "normal") != "normal" and not turn.get("audioReceipt"):
                        errors.append(f"Prepared audio lacks provider receipt: {card['id']}")
                    if turn.get("audioReceipt"):
                        receipt_path = contained_file(root, turn["audioReceipt"])
                        if not receipt_path.is_file():
                            errors.append(f"Audio receipt missing: {card['id']}")
                        else:
                            receipt = read(receipt_path)
                            if (receipt.get("sha256") != turn["audioSha256"]
                                    or receipt.get("sourceText") != turn["text"]
                                    or receipt.get("audioDelivery", "normal") != turn.get("audioDelivery", "normal")):
                                errors.append(f"Audio receipt differs from exact turn: {card['id']}")
                            receipt_assets[turn["audioReceipt"]] = {
                                "file": turn["audioReceipt"], "sha256": file_hash(receipt_path), "receipt": receipt,
                            }
                            take["receiptSha256"] = file_hash(receipt_path)
                    old = exact_takes.setdefault(key, take)
                    if old["sha256"] != take["sha256"]:
                        errors.append(f"Conflicting exact take: {key}")

    def canonical_take(source_card, asset):
        # Resolve the exact source occurrence so shared words cannot select
        # another pace, even when the canonical projection carries delivery.
        if asset["purpose"] == "mission-intro":
            return None  # An authored Spanish briefing still needs a real recording.
        asset_purpose = "prompt" if asset["purpose"] == "mission-cue" else asset["purpose"]
        purpose = re.fullmatch(r"(prompt|answer|success)(?:-turn-(\d+))?", asset_purpose)
        if not purpose:
            errors.append(f"Unsupported audio purpose: {source_card['id']} / {asset['purpose']}")
            return None
        field = "turns" if purpose.group(1) == "prompt" or (
            purpose.group(1) == "answer" and source_card["activity"] == "build"
        ) else "answerTurns"
        candidates = source_card.get(field, [])
        if purpose.group(2):
            index = int(purpose.group(2)) - 1
            candidates = candidates[index:index + 1]
        matches = [turn for turn in candidates
                   if turn["speaker"] == asset["speaker_role"] and turn["text"] == asset["text"]]
        if matches:
            identities = {(turn["speaker"], turn["text"], turn.get("audioDelivery", "normal")) for turn in matches}
            if len(identities) != 1:
                errors.append(f"Ambiguous audio delivery: {source_card['id']} / {asset['purpose']}")
                return None
            turn = matches[0]
            if not turn.get("audio"):
                return None  # An explicitly pending occurrence cannot borrow another take.
            take = {"speaker": turn["speaker"], "text": turn["text"], "file": turn["audio"],
                    "sha256": turn["audioSha256"], "clipId": turn["clipId"]}
            for field_name in ("audioDelivery", "audioReceipt"):
                if field_name in turn:
                    take[field_name] = turn[field_name]
            if turn.get("audioReceipt") in receipt_assets:
                take["receiptSha256"] = receipt_assets[turn["audioReceipt"]]["sha256"]
            return take
        if purpose.group(2):
            errors.append(f"Source audio occurrence differs: {source_card['id']} / {asset['purpose']}")
            return None
        if any(turn.get("audioDelivery", "normal") != "normal"
               for field_name in ("turns", "answerTurns") for turn in source_card.get(field_name, [])):
            errors.append(f"Prepared audio delivery has no source occurrence: {source_card['id']} / {asset['purpose']}")
            return None
        # The existing schema may derive an unauthored answer on a normal card.
        # Only that legacy case may reuse a normal take from another card.
        return exact_takes.get((asset["speaker_role"], asset["text"], "normal"))

    card_map = []
    canonical_lessons = []
    sidecars = []
    audio_bindings = []
    delivery_audio_bindings = []
    missing_audio = []
    roundtrips = []

    def clocks(value):
        if value.get("clock") and value.get("clockCues") and not any(
            cue["hour"] == value["clock"]["hour"] and cue["minute"] == value["clock"]["minute"]
            for cue in value["clockCues"]
        ):
            raise ValueError("A scalar clock must agree with the authored clock cue sequence.")
        return copy.deepcopy(value.get("clockCues") or ([value["clock"]] if value.get("clock") else []))

    def turns(values):
        if len(values) == 1 and not values[0].get("image"):
            return []  # Existing scalar audio supports an explicitly unillustrated utterance.
        if any(not turn.get("image") for turn in values):
            raise ValueError("Mixed illustrated/unillustrated audio turns are unsupported.")
        result = []
        for turn in values:
            projected = {"text": turn["text"], "speaker_role": turn["speaker"], "image_url": image_url(turn["image"])}
            if clocks(turn):
                projected["clock_cues"] = clocks(turn)
            if turn.get("translation_es"):
                projected["spanish_translation"] = turn["translation_es"]
            if turn.get("audioDelivery") in {"quick", "clear", "a1-pronunciation-v1"}:
                projected["delivery"] = turn["audioDelivery"]
            result.append(projected)
        return result

    def canonical_card(card):
        cid = card["id"]
        text = " ".join(t["text"] for t in card.get("turns", []))
        answer_text = " ".join(t["text"] for t in card.get("answerTurns", []))
        img = card.get("image") or (card.get("turns") or [{}])[0].get("image")
        result = {
            "slide_id": f"{args.namespace}-{cid}", "stage": card["stage"],
            "prompt": card.get("prompt", ""), "audio_text": text,
            "audio_turns": turns(card.get("turns", [])),
            "answer_audio_text": answer_text or None,
            "answer_audio_turns": turns(card.get("answerTurns", [])),
            "answer_audio_policy": "authored-only",
            "prompt_image_url": image_url(card.get("image")),
            "context_es": card.get("context_es") or None,
            "correct_option_id": card.get("answer", "model"),
            "options": [{"id": o["id"], "label": o.get("text"), "image_url": image_url(o.get("image")),
                         **({"clock_cues": clocks(o)} if clocks(o) else {})} for o in card.get("options", [])],
        }
        if clocks(card):
            result["clock_cues"] = clocks(card)
        if "spanish_translation" in card:
            result["spanish_translation"] = card["spanish_translation"]
        if len(card.get("turns", [])) == 1:
            result["audio_speaker"] = card["turns"][0]["speaker"]
        if len(card.get("answerTurns", [])) == 1:
            result["answer_audio_speaker"] = card["answerTurns"][0]["speaker"]
        elif result["answer_audio_turns"]:
            # A multi-speaker answer must not inherit one prompt-field role.
            result.pop("audio_speaker", None)
        activity = card["activity"]
        if activity in {"teach", "speak"}:
            result.update(interaction_type="teach" if activity == "teach" else "pronunciation", prompt=text,
                          options=[{"id": "model", "label": text, "image_url": image_url(img)}], correct_option_id="model")
            translations = [t.get("translation_es") for t in card.get("turns", [])]
            if translations and all(translations):
                if "spanish_translation" not in result:
                    result["spanish_translation"] = " ".join(translations)
                if len(translations) > 1:
                    gap("turn-translation", "Per-turn translations are projected; runtime synchronization and review remain pending.", cid)
        elif activity == "choice":
            if card["stage"] == "Listen":
                result["prompt"] = LISTEN_PROMPT
            image_options = all(o.get("image") for o in card["options"])
            result["interaction_type"] = ("t2i" if image_options else "i2t") if card["stage"] == "Recognize" else ("a2i" if image_options else "a2t")
            if card["stage"] == "Recognize" and not text:
                result["prompt_presentation"] = "written"
        elif activity == "build":
            target = card["target"]
            words = list(re.finditer(r"[A-Za-z]+(?:'[A-Za-z]+)?", target))
            selected = card.get("guided", list(range(len(words))))
            if (len(words) != len(target.split()) or not 2 <= len(words) <= 8
                    or not 2 <= len(selected) <= 8 or len(set(selected)) != len(selected)
                    or any(not isinstance(index, int) or not 0 <= index < len(words) for index in selected)):
                raise ValueError(f"Unsupported construction tokenization: {cid}")
            selected_set = set(selected)
            cursor, parts = 0, []
            for index, match in enumerate(words):
                parts.extend((target[cursor:match.start()], "___" if index in selected_set else match.group()))
                cursor = match.end()
            parts.append(target[cursor:])
            options = [{"id": f"word-{index+1}", "label": words[index].group(), "image_url": ""} for index in selected]
            result.update(interaction_type="complete2" if "guided" in card else "complete-sentence",
                          prompt="".join(parts), prompt_image_url=image_url(img), options=options,
                          correct_option_id=options[0]["id"], correct_option_ids=[o["id"] for o in options],
                          audio_text=target, answer_audio_text=target)
            if result["answer_audio_turns"]:
                gap("construction-reply", "The authored reply is projected after the constructed target; completed-audio sequencing and runtime review remain pending.", cid)
                result["success_audio_turns"] = result["answer_audio_turns"]
            result["answer_audio_turns"] = turns(card.get("turns", []))
            result.pop("answer_audio_speaker", None)
            if len(card.get("turns", [])) == 1:
                result["answer_audio_speaker"] = card["turns"][0]["speaker"]
        else:
            raise ValueError(f"Unsupported canonical activity {activity}: {cid}")
        return result

    def mission_card(card):
        """Use shared decision controls and the established written-answer voice gate."""
        kind = card["mission_kind"]
        if kind == "conversation-decision" and card["activity"] == "choice":
            result = canonical_card({**card, "stage": "Listen"})
            result["prompt_image_url"] = image_url(card.get("image") or card["turns"][0]["image"])
            result["mission_game"] = {
                "kind": kind, "instruction_es": "Escucha y elige cómo continuar.",
                "validation": "single", "targets": [], "cues": [],
            }
            if card.get("completionScene"):
                completion = card["completionScene"]
                require_known_fields(completion, "image context_es", f"{card['id']}.completionScene")
                result["mission_game"]["completion_scene"] = {
                    "image_url": image_url(completion["image"]), "context_es": completion["context_es"],
                }
        elif kind == "voice-gate" and card["activity"] == "speak":
            target = card["speakTarget"]
            require_known_fields(target, "text image clock clockCues", f"{card['id']}.speakTarget")
            question = " ".join(turn["text"] for turn in card["turns"])
            if len(card["turns"]) != 1 or card.get("answerTurns"):
                raise ValueError(f"A written-answer voice gate needs one question and no spoken answer: {card['id']}")
            option_id = "spoken-response"
            result = canonical_card({**card, "stage": "Speak"})
            result.update(interaction_type="mission-speak", prompt=target["text"], prompt_presentation="written", audio_text=target["text"],
                          answer_audio_text=None, answer_audio_turns=[], prompt_image_url="",
                          correct_option_id=option_id,
                          options=[{"id": option_id, "label": target["text"], "image_url": image_url(target["image"]),
                                    **({"clock_cues": clocks(target)} if clocks(target) else {})}])
            result["mission_game"] = {
                "kind": kind, "instruction_es": "Lee la respuesta en voz alta.",
                "validation": "single", "cue_audio_text": question,
                # Existing voice-gate targets have no hit-testing or head markers.
                "targets": [{"id": option_id, "label_es": card.get("spanish_translation") or "Respuesta",
                             "accepted_option_ids": [option_id],
                             "rect": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}}],
                "cues": [{"id": "spoken-response-cue", "text": question, "answer_text": target["text"],
                          "target_id": option_id, "option_id": option_id}],
            }
        else:
            raise ValueError(f"Unsupported mission behavior: {card['id']} / {kind}")
        result["mission_chapter_id"] = card["chapter"]
        return result

    for lesson in source["lessons"]:
        canonical_id = f"{args.namespace}-lesson-{lesson['id'].replace('.', '-')}"
        planned = plan_by_id[lesson["id"]]
        cards = []
        source_cards_by_slide = {}
        is_mission = lesson["kind"] == "mission"
        supported_mission = is_mission and bool(lesson.get("mission")) and all(card.get("mission_kind") for card in lesson["cards"])
        for index, card in enumerate(lesson["cards"]):
            cid = card["id"]
            stable_id = f"{args.namespace}-{cid}"
            source_cards_by_slide[stable_id] = card
            sidecar = {"sourceLessonId": lesson["id"], "sourceCardId": cid, "canonicalLessonId": canonical_id, "canonicalSlideId": stable_id, "position": index, "source": card, "sourceSha256": digest(card)}
            sidecars.append(sidecar)
            card_map.append({k: sidecar[k] for k in ("sourceLessonId", "sourceCardId", "canonicalLessonId", "canonicalSlideId", "position", "sourceSha256")})
            roundtrips.append({"card": cid, "sha256": digest(card), "exactSourcePreserved": digest(sidecar["source"]) == digest(card)})
            for field, purpose in (("turns", "prompt"), ("answerTurns", "answer")):
                for turn_index, turn in enumerate(card.get(field, []), 1):
                    exact_contract = {"lessonId": canonical_id, "slideId": stable_id, "cardPosition": index,
                                      "purpose": f"{purpose}-turn-{turn_index}", "turn": turn,
                                      "image": source["assets"].get(turn.get("image")),
                                      "frames": [source["assets"][image_id] for image_id in turn.get("frames", [])]}
                    contract_hash = digest(exact_contract)
                    delivery_audio_bindings.append({"id": f"{canonical_id}-{stable_id}-{purpose}-{turn_index}-{contract_hash[:20]}",
                                                    "bindingSha256": contract_hash, "contract": exact_contract,
                                                    "kind": "lossless-source-audio-binding", "canonicalInstallationReceipt": False})
            if any("clock" in item or "clockCues" in item for item in [card, *card.get("turns", []), *card.get("answerTurns", []), *card.get("options", []), card.get("speakTarget", {})]):
                gap("clock", "Clock evidence is projected; verify its shared native/web rendering and assessment boundaries before installation.", cid)
            if any("frames" in item for item in [card, *card.get("turns", []), *card.get("answerTurns", [])]):
                gap("frame-sequence", "The projection does not represent retained ordered physical-state frames. Review their teaching role and supported sequencing; a single ambiguous still is not equivalent.", cid)
            if any(turn.get("audioDelivery", "normal") != "normal" or "audioReceipt" in turn
                   for field_name in ("turns", "answerTurns") for turn in card.get(field_name, [])):
                gap("prepared-pronunciation-delivery", "Prepared delivery is projected with exact source receipt bindings; provider validation, exact-byte listening approval and native playback verification remain pending. This projection is not an installation receipt.", cid)
            if card.get("instruction_es"):
                gap("authored-instruction", "Exact instruction_es remains in the source; the app derives shared instructions. Compare intended task meaning with that shared behavior, rather than assuming every custom instruction must become an app field.", cid)
            if card.get("hint_es") or card.get("feedbackByOption"):
                gap("authored-hint", "Exact candidate feedback remains in the source; the app derives shared hints. Verify each actual error against shared teaching support; candidate text is not runtime evidence or automatic approval.", cid)
            if is_mission and not supported_mission:
                gap("continuous-mission", "The candidate mission is not represented by the supported mission_game contract. It remains complete in the source, but has no canonical projection. Resolve its design against approved mission controls; preserving a sidecar does not approve a new interaction.", cid)
            elif supported_mission:
                projected_card = mission_card(card)
                projected_card["pedagogy_note"] = f"Mission beat {index + 1:02d}/{len(lesson['cards']):02d}: {lesson['outcome']}"
                if index == len(lesson["cards"]) - 1 and card["mission_kind"] == "voice-gate":
                    projected_card["interaction_type"] = "mission-finale"
                cards.append(projected_card)
            else:
                cards.append(canonical_card(card))
        if is_mission and not supported_mission:
            continue
        projected = {
            "id": canonical_id, "title": f"{lesson['id']} {lesson['title']}", "level": level or plan.get("level"),
            "unit_id": args.namespace, "unit_title": plan["title"], "unit_outcome": plan["aim"],
            "lesson_id": canonical_id, "lesson_title": lesson["title"], "sub_lesson_id": lesson["id"],
            "sub_lesson_title": lesson["title"], "goal": lesson["outcome"], "vocabulary": lesson.get("vocabulary", []),
            "review_vocabulary": [], "grammar_function": planned.get("progression", ""),
            "prerequisite": " ".join(planned.get("prerequisites", [])), "speaking_outcome": planned.get("pronunciation", ""),
            "content_revision": lesson.get("content_revision", 1), "cards": cards,
        }
        if supported_mission:
            presentation = copy.deepcopy(lesson["mission"])
            if "kickoff_image" in presentation:
                presentation["kickoff_image_url"] = image_url(presentation.pop("kickoff_image"))
            if "chapters" not in presentation:
                presentation["chapters"] = copy.deepcopy(lesson["chapters"])
            projected.update(experience_type="mission", mission=presentation)
        model = (MissionLesson if supported_mission else Lesson)(**projected)
        require_preserved_fields(projected, model.model_dump(mode="json"), canonical_id)
        model = bind_lesson_audio_assets(model)
        canonical = model.model_dump(mode="json")
        canonical_lessons.append(canonical)
        for card in canonical["cards"]:
            for asset in card["audio_assets"]:
                take = canonical_take(source_cards_by_slide[card["slide_id"]], asset)
                binding = {"canonicalLessonId": canonical_id, "canonicalSlideId": card["slide_id"], "asset": asset, "take": take,
                           "installed": False, "receiptStatus": "exact take evidence only; canonical installation receipt not issued"}
                audio_bindings.append(binding)
                if not take:
                    omitted_by_player = asset["purpose"] == "answer" and card["stage"] in {"Recognize", "Listen"} and not card.get("answer_audio_text")
                    missing_audio.append({"card": card["slide_id"], "purpose": asset["purpose"], "speaker": asset["speaker_role"], "text": asset["text"],
                                          "playerUsesThisAsset": not omitted_by_player,
                                          "reason": "Backend derives fallback answer, but mobile correctSelectionAudioText explicitly omits unauthored Recognize/Listen answer replay; reconcile shared binder/cache, do not generate new content." if omitted_by_player else "Canonical player requires exact prepared audio binding."})
    if any(not entry["playerUsesThisAsset"] for entry in missing_audio):
        gap("canonical-answer-audio", "Backend derives fallback answer assets that newer mobile Recognize/Listen playback intentionally omits. Reconcile that unused inventory in shared binding/cache; do not generate additional spoken content or substitute voices.")
    if any(entry["playerUsesThisAsset"] for entry in missing_audio):
        gap("required-canonical-audio", "Some player-required canonical assets lack exact source recordings, including any newly authored mission briefing. These are explicit missing bindings; the package cannot be installed.")
    if any(lesson.get("experience_type") == "mission" for lesson in canonical_lessons):
        sys.path.insert(0, str(args.repo))
        from scripts.validate_lesson_cards import validate_mission_contracts
        models = {lesson["id"]: (MissionLesson if lesson.get("experience_type") == "mission" else Lesson)(**lesson)
                  for lesson in canonical_lessons}
        errors.extend(error for error in validate_mission_contracts(models)
                      if any(error.startswith(f"{lesson_id} ") for lesson_id in models))
    if errors:
        raise ValueError("\n".join(errors))

    authorities = {}
    for path in AUTHORITY_FILES:
        authorities[path] = file_hash(args.repo / path)
    contract = {
        "schema": "lossless-lesson-delivery/2", "namespace": args.namespace,
        "contentSha256": source_hash, "sourceVersion": source["sourceVersion"],
        "authority": f"The source field in {args.package_name} retains the complete reviewed candidate, including its limitations. CanonicalProjection is a schema-supported subset for inspection, not an installable course or proof of teaching quality. Corrections require a new identifiable source revision.",
        "nativeImportReady": False, "nativeImportBlockedReasons": gaps,
        "sourceAuthoritySha256": authorities,
        "evidence": {
            "context": "backend/app/schemas.py LessonCard.context_es and mobile/src/screens/LessonScreen.tsx lesson-story-context",
            "mission": "backend/app/schemas.py MissionLessonCard.mission_game and MissionLesson.cards validate shared decisions and written-answer gates; legacy untyped candidate missions have no projection",
            "visuals": "backend/app/schemas.py ChoiceOption/CourseAudioTurn/LessonCard contain neither clock nor frames",
            "instructions": "mobile/src/lessonMistakeHints.ts generates mistake hints; LessonCard schema has no instruction_es/hint_es",
            "bundling": "scripts/export_mobile_preview_lessons.py lesson_image_names admits only .webp and exports global a1-course.json",
        },
        "requiredIntegration": [
            "Resolve candidate gaps against approved behavior using shared content/configuration and justified shared support. A sidecar field does not mandate a new application interaction.",
            "Review revised content as an identifiable version; reject unknown fields rather than dropping them. Compare complete card identities and exact ordered audio/image bindings after export.",
            "Preserve approved v4/co-teacher provenance; install canonical immutable audio receipts from checksum-pinned takes only.",
            "Bundle exact images and records. Verify final phone crops, assessment-safe time evidence, ordered turns, authored question/response gates, recovery and completion on actual clients.",
            "Run canonical structure, answer-choice, media-semantic, audio, export/catalog preservation and app behavioral checks before any publication.",
        ],
        "humanApproval": "pending user review", "published": False,
    }
    package = {
        "schema": contract["schema"], "namespace": args.namespace, "contentSha256": source_hash,
        "source": source, "identities": card_map, "canonicalProjection": canonical_lessons,
        "sidecars": sidecars, "imageAssets": image_assets, "canonicalAudioBindings": audio_bindings,
        "receiptAssets": [receipt_assets[name] for name in sorted(receipt_assets)],
        "deliveryAudioBindings": delivery_audio_bindings,
        "integrationContract": contract,
    }
    report = {
        "contentSha256": source_hash, "packageSha256": digest(package),
        "sourceLessonCount": len(source["lessons"]), "sourceCardCount": len(card_map),
        "schemaValidatedProjectionLessons": len(canonical_lessons), "schemaValidatedProjectionCards": sum(len(l["cards"]) for l in canonical_lessons),
        "exactRoundtripCount": sum(r["exactSourcePreserved"] for r in roundtrips), "roundtrips": roundtrips,
        "imageCount": len(image_assets), "exactTakeCount": len(exact_takes),
        "canonicalAudioBindingCount": len(audio_bindings), "canonicalAudioMissing": missing_audio,
        "deliveryAudioBindingCount": len(delivery_audio_bindings),
        "nativeImportReady": False, "gaps": gaps,
        "validation": {"sourceByteHashes": "pass", "canonicalProjectionSchema": "pass", "losslessCardRoundtrip": "pass", "humanSemanticReview": "pending", "nativeRuntimeParity": "not asserted"},
    }
    return {args.package_name: package, "app-package-contract.json": contract, "app-package-validation.json": report}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1], help="Read-only schema/consumer checkout")
    parser.add_argument("--asset-root", type=Path, help="Media root; defaults to the source directory")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--package-name", default="lesson-delivery-package.json")
    parser.add_argument("--namespace", required=True)
    parser.add_argument("--level", required=True)
    parser.add_argument("--check", action="store_true", help="Verify byte-repeatability without writing")
    args = parser.parse_args(argv)
    files = compile_package(read(args.source), read(args.plan), repo=args.repo,
                            asset_root=args.asset_root or args.source.resolve().parent,
                            namespace=args.namespace, package_name=args.package_name, level=args.level)
    output = args.output_dir.resolve()
    for name, payload in files.items():
        path = output / name
        serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8") != serialized:
                raise SystemExit(f"Non-repeatable or stale output: {name}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(serialized, encoding="utf-8")
    report = files["app-package-validation.json"]
    print(json.dumps({"contentSha256": report["contentSha256"], "sourceCards": report["sourceCardCount"], "projectionCards": report["schemaValidatedProjectionCards"], "exactRoundtrips": report["exactRoundtripCount"], "nativeImportReady": False, "canonicalAudioMissing": len(report["canonicalAudioMissing"]), "repeatability": "pass" if args.check else "not yet checked"}))


if __name__ == "__main__":
    main()
