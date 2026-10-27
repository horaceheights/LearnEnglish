"""Review compilation cannot hide content loss or claim an installed course."""
import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.compile_lesson_delivery import compile_package, require_preserved_fields
from scripts.verify_lesson_delivery import verify_package


REPO = Path(__file__).resolve().parents[2]


class CandidateDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.image_hash = self.asset("scene.webp", b"synthetic image fixture")
        self.normal_hash = self.asset("normal.mp3", b"synthetic normal recording")
        self.prepared_hash = self.asset("prepared.mp3", b"synthetic prepared recording")
        self.receipt = {
            "sha256": self.prepared_hash, "sourceText": "I work.",
            "audioDelivery": "reviewed-delivery-v1", "humanApproval": "pending",
        }
        self.asset("prepared.receipt.json", json.dumps(self.receipt).encode())
        self.turn = {"speaker": "teacher", "text": "I work.", "image": "scene",
                     "audio": "normal.mp3", "audioSha256": self.normal_hash, "clipId": "normal"}
        prepared = {**self.turn, "audio": "prepared.mp3", "audioSha256": self.prepared_hash,
                    "clipId": "prepared", "audioDelivery": "reviewed-delivery-v1",
                    "audioReceipt": "prepared.receipt.json"}
        self.source = {
            "title": "An unfamiliar unit", "sourceVersion": "test-v1", "scope": "review",
            "assets": {"scene": {"file": "scene.webp", "sha256": self.image_hash}},
            "lessons": [{"id": "3.2", "title": "Work", "kind": "teaching", "outcome": "Hear work.",
                         "cards": [
                             {"id": "3.2-N01", "stage": "Listen", "activity": "choice",
                              "turns": [self.turn], "instruction_es": "Escucha y elige.",
                              "spanish_translation": "Trabajo.", "answer": "working",
                              "options": [{"id": "working", "text": "I work."},
                                          {"id": "studying", "text": "I study."}]},
                             {"id": "3.2-S01", "stage": "Speak", "activity": "speak",
                              "turns": [prepared], "spanish_translation": "Trabajo."},
                         ]}],
        }
        self.plan = {"title": "Work and study", "aim": "Understand work.",
                     "lessons": [{"id": "3.2", "newTargets": ["work"]}]}

    def asset(self, filename, data):
        (self.root / filename).write_bytes(data)
        return hashlib.sha256(data).hexdigest()

    def compile(self, source=None):
        return compile_package(source or self.source, self.plan, repo=REPO, asset_root=self.root,
                               namespace="unfamiliar-course-unit", level="Test")

    def verify(self, package):
        return verify_package(package, self.source, repo=REPO, asset_root=self.root)

    def test_shared_prompt_translation_and_semantic_ids_survive(self):
        outputs = self.compile()
        package = outputs["lesson-delivery-package.json"]
        choice, speak = package["canonicalProjection"][0]["cards"]
        self.assertEqual("Listen and choose.", choice["prompt"])
        self.assertEqual("I work.", choice["audio_text"])
        self.assertEqual(["working", "studying"], [o["id"] for o in choice["options"]])
        self.assertEqual("working", choice["correct_option_id"])
        self.assertEqual("Trabajo.", choice["spanish_translation"])
        self.assertEqual("Trabajo.", speak["spanish_translation"])
        self.assertEqual(self.source, package["source"])
        self.assertEqual("pass", self.verify(package)["status"])
        self.assertEqual(outputs, self.compile())
        self.assertFalse(package["integrationContract"]["nativeImportReady"])
        self.assertNotIn("sourceCheckout", package["integrationContract"])

    def test_prepared_take_is_bound_to_exact_occurrence_and_receipt(self):
        package = self.compile()["lesson-delivery-package.json"]
        binding = next(item for item in package["canonicalAudioBindings"]
                       if item["canonicalSlideId"].endswith("S01") and item["asset"]["purpose"] == "prompt-turn-1")
        self.assertEqual("prepared.mp3", binding["take"]["file"])
        self.assertEqual("reviewed-delivery-v1", binding["take"]["audioDelivery"])
        self.assertEqual(package["receiptAssets"][0]["sha256"], binding["take"]["receiptSha256"])
        self.assertFalse(binding["installed"])
        binding["take"].update(file="normal.mp3", sha256=self.normal_hash)
        self.assertTrue(any("exact prepared occurrence" in error for error in self.verify(package)["errors"]))

    def test_pending_occurrence_never_borrows_existing_normal_take(self):
        source = copy.deepcopy(self.source)
        turn = source["lessons"][0]["cards"][1]["turns"][0]
        for key in ("audio", "audioSha256", "clipId", "audioReceipt"):
            turn.pop(key)
        package = self.compile(source)["lesson-delivery-package.json"]
        bindings = [item for item in package["canonicalAudioBindings"] if item["canonicalSlideId"].endswith("S01")]
        self.assertTrue(bindings)
        self.assertTrue(all(item["take"] is None for item in bindings))
        self.assertIn("3.2-S01", package["integrationContract"]["nativeImportBlockedReasons"]["pending-source-audio"]["cards"])
        self.assertEqual("pass", verify_package(package, source, repo=REPO, asset_root=self.root)["status"])
        turn["clipId"] = "orphan"
        with self.assertRaisesRegex(ValueError, "Incomplete recording identity"):
            self.compile(source)

    def test_exact_vocabulary_labels_do_not_use_planning_prose(self):
        source = copy.deepcopy(self.source)
        source["lessons"][0]["vocabulary"] = ["start work", "finish work"]
        self.plan["lessons"][0]["newTargets"] = ["Work applied to a new contextual exchange"]
        package = self.compile(source)["lesson-delivery-package.json"]
        self.assertEqual(["start work", "finish work"], package["canonicalProjection"][0]["vocabulary"])
        self.assertEqual("pass", verify_package(package, source, repo=REPO, asset_root=self.root)["status"])
        self.assertEqual([], self.compile()["lesson-delivery-package.json"]["canonicalProjection"][0]["vocabulary"])

    def test_changed_provider_receipt_invalidates_package(self):
        package = self.compile()["lesson-delivery-package.json"]
        receipt = {**self.receipt, "sourceText": "I study."}
        (self.root / "prepared.receipt.json").write_text(json.dumps(receipt))
        self.assertEqual("fail", self.verify(package)["status"])
        with self.assertRaisesRegex(ValueError, "receipt differs"):
            self.compile()

    def test_unknown_source_behavior_and_dropped_projection_fields_fail(self):
        source = copy.deepcopy(self.source)
        source["lessons"][0]["cards"][0]["play_answer_before_selection"] = True
        with self.assertRaisesRegex(ValueError, "Unsupported source fields"):
            self.compile(source)
        with self.assertRaisesRegex(ValueError, "silently discarded"):
            require_preserved_fields({"required_behavior": True}, {}, "card")

    def test_malformed_ordinary_activity_contracts_fail_closed(self):
        changes = [
            {"stage": "UnsupportedStage"}, {"stage": "Speak"},
            {"context_es": "Ambos están disponibles después del trabajo."},
            {"options": [{"id": "working", "text": "Let's meet at seven."},
                         {"id": "studying", "text": "Let's meet at six."}]},
            {"turns": []},
            {"options": [{"id": "working", "text": "I work."}]},
            {"options": [{"id": "working", "text": " "}, {"id": "studying", "text": "I study."}]},
            {"options": [{"id": "working", "text": "I work."}, {"id": "studying", "image": "scene"}]},
            {"options": [{"id": "working", "text": "I work."}, {"id": "studying", "text": "I work."}]},
            {"options": [{"id": "working", "image": "scene"}, {"id": "studying", "image": "scene"}]},
            {"options": [{"id": "working", "text": "I work."}] + [
                {"id": f"other-{index}", "text": text} for index, text in enumerate(("I study.", "I read.", "I walk."))]},
        ]
        for change in changes:
            source = copy.deepcopy(self.source)
            source["lessons"][0]["cards"][0].update(change)
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, "ordinary|Ordinary"):
                self.compile(source)

    def test_verifier_rejects_forged_packages_with_malformed_ordinary_source(self):
        # Forge a self-consistent source/sidecar claim without asking the compiler
        # to admit it. Verification must apply source admission itself.
        from scripts.verify_lesson_delivery import content_hash
        for change in ({"stage": "UnsupportedStage"}, {"activity": "invented"}, {"turns": []},
                       {"options": [{"id": "working", "text": "I work."}]},
                       {"options": [{"id": "working", "text": " "}, {"id": "studying", "text": "I study."}]}):
            source = copy.deepcopy(self.source)
            card = source["lessons"][0]["cards"][0]
            card.update(change)
            package = self.compile()["lesson-delivery-package.json"]
            package["source"] = source
            package["contentSha256"] = content_hash(source)
            package["sidecars"][0]["source"] = card
            package["sidecars"][0]["sourceSha256"] = content_hash(card)
            package["identities"][0]["sourceSha256"] = content_hash(card)
            with self.subTest(change=change):
                report = verify_package(package, source, repo=REPO, asset_root=self.root)
                self.assertEqual("fail", report["status"])
                self.assertTrue(any("Invalid source contract" in error for error in report["errors"]))

    def test_valid_written_recognition_does_not_require_prompt_audio(self):
        source = copy.deepcopy(self.source)
        card = source["lessons"][0]["cards"][0]
        card.update(stage="Recognize", turns=[], image="scene")
        package = self.compile(source)["lesson-delivery-package.json"]
        self.assertEqual("pass", verify_package(package, source, repo=REPO, asset_root=self.root)["status"])

    def test_distinct_clock_records_on_one_photo_remain_explicit_review_content(self):
        source = copy.deepcopy(self.source)
        card = source["lessons"][0]["cards"][0]
        card.update(stage="Recognize", turns=[], prompt="I work at five.", options=[
            {"id": "working", "image": "scene", "clock": {"hour": 5, "minute": 0}},
            {"id": "studying", "image": "scene", "clock": {"hour": 6, "minute": 0}},
        ])
        package = self.compile(source)["lesson-delivery-package.json"]
        self.assertIn("clock", package["integrationContract"]["nativeImportBlockedReasons"])
        self.assertFalse(package["integrationContract"]["nativeImportReady"])
        self.assertEqual("pass", verify_package(package, source, repo=REPO, asset_root=self.root)["status"])
        changed = copy.deepcopy(package)
        changed["canonicalProjection"][0]["cards"][0]["options"][1]["clock_cues"][0]["hour"] = 5
        self.assertTrue(any("option clock differs" in error for error in verify_package(
            changed, source, repo=REPO, asset_root=self.root)["errors"]))

    def test_supported_prepared_turn_metadata_and_construction_reply_are_exact_but_unapproved(self):
        source = copy.deepcopy(self.source)
        model = {**self.turn, "clock": {"hour": 7, "minute": 0}, "translation_es": "Trabajo."}
        prepared = source["lessons"][0]["cards"][1]["turns"][0]
        prepared["audioDelivery"] = "a1-pronunciation-v1"
        self.receipt["audioDelivery"] = "a1-pronunciation-v1"
        self.asset("prepared.receipt.json", json.dumps(self.receipt).encode())
        source["lessons"][0]["cards"] = [{
            "id": "3.2-U01", "stage": "Use", "activity": "build", "target": "I work.",
            "turns": [model], "answerTurns": [prepared],
        }]
        package = self.compile(source)["lesson-delivery-package.json"]
        canonical = package["canonicalProjection"][0]["cards"][0]
        self.assertEqual("a1-pronunciation-v1", canonical["success_audio_turns"][0]["delivery"])
        self.assertEqual([{"hour": 7, "minute": 0}], canonical["answer_audio_turns"][0]["clock_cues"])
        self.assertEqual("Trabajo.", canonical["answer_audio_turns"][0]["spanish_translation"])
        self.assertFalse(package["integrationContract"]["nativeImportReady"])
        self.assertEqual("pass", verify_package(package, source, repo=REPO, asset_root=self.root)["status"])
        del canonical["success_audio_turns"]
        self.assertTrue(any("success_audio_turns length differs" in error for error in verify_package(
            package, source, repo=REPO, asset_root=self.root)["errors"]))

    def test_projection_story_and_lesson_metadata_must_match_source(self):
        source = copy.deepcopy(self.source)
        source["lessons"][0]["cards"][1]["context_es"] = "Ana describe su día."
        package = self.compile(source)["lesson-delivery-package.json"]
        for field, value in (("title", "A different lesson"), ("goal", "A different goal")):
            changed = copy.deepcopy(package)
            changed["canonicalProjection"][0][field] = value
            errors = verify_package(changed, source, repo=REPO, asset_root=self.root)["errors"]
            self.assertTrue(any(f"authored lesson {field}" in error for error in errors))
        for replacement in (None, "Una situación diferente."):
            changed = copy.deepcopy(package)
            card = changed["canonicalProjection"][0]["cards"][1]
            if replacement is None:
                card.pop("context_es")
            else:
                card["context_es"] = replacement
            errors = verify_package(changed, source, repo=REPO, asset_root=self.root)["errors"]
            self.assertTrue(any("authored story context" in error for error in errors))
        package = self.compile()["lesson-delivery-package.json"]
        package["canonicalProjection"][0]["cards"][0]["context_es"] = "Un contexto añadido."
        self.assertTrue(any("authored story context" in error for error in self.verify(package)["errors"]))

    def test_media_outside_package_cannot_be_read(self):
        source = copy.deepcopy(self.source)
        source["assets"]["scene"]["file"] = "../scene.webp"
        with self.assertRaisesRegex(ValueError, "escaped package root"):
            self.compile(source)

    def test_unillustrated_single_turn_uses_existing_scalar_audio(self):
        source = copy.deepcopy(self.source)
        source["lessons"][0]["cards"] = [{
            "id": "3.2-U01", "stage": "Use", "activity": "build", "target": "I work.",
            "turns": [{key: value for key, value in self.turn.items() if key != "image"}],
            "spanish_translation": "Trabajo.",
        }]
        package = self.compile(source)["lesson-delivery-package.json"]
        card = package["canonicalProjection"][0]["cards"][0]
        self.assertEqual([], card["audio_turns"])
        self.assertEqual("", card["prompt_image_url"])
        self.assertEqual("teacher", card["audio_speaker"])
        self.assertEqual("I work.", card["audio_text"])
        self.assertEqual("pass", verify_package(package, source, repo=REPO, asset_root=self.root)["status"])

    def test_empty_prompt_and_changed_answer_ids_fail_independent_verification(self):
        package = self.compile()["lesson-delivery-package.json"]
        choice = package["canonicalProjection"][0]["cards"][0]
        choice["prompt"] = ""
        choice["options"][0]["id"] = "A"
        choice["correct_option_id"] = "A"
        errors = self.verify(package)["errors"]
        self.assertTrue(any("shared listening/recognition prompt" in error for error in errors))
        self.assertTrue(any("semantic option" in error for error in errors))

    def test_unimplemented_visual_metadata_stays_explicit_and_lossless(self):
        source = copy.deepcopy(self.source)
        source["lessons"][0]["cards"][0]["clock"] = {"hour": 7, "minute": 0}
        package = self.compile(source)["lesson-delivery-package.json"]
        self.assertEqual(source, package["source"])
        self.assertIn("clock", package["integrationContract"]["nativeImportBlockedReasons"])
        self.assertFalse(package["integrationContract"]["nativeImportReady"])

    def test_approved_mission_decisions_and_written_gates_project_without_lost_cards(self):
        source = copy.deepcopy(self.source)
        lesson = source["lessons"][0]
        lesson["kind"] = "mission"
        lesson["chapters"] = [{"id": "visit", "title": "La visita", "objective": "Confirma la visita."}]
        lesson["mission"] = {
            "label": "Misión", "title": "La visita", "briefing": "Confirma la visita.",
            "kickoff_image": "scene", "objectives": ["Confirma la visita."],
            "completion_title": "Visita confirmada", "completion_message": "Has confirmado la visita.",
            "voice_heading": "CONFIRMA", "voice_instruction": "Lee la respuesta.", "voice_success_label": "CONFIRMADO",
        }
        choice, gate = lesson["cards"]
        choice.update(stage="Mission", mission_kind="conversation-decision", chapter="visit",
                      completionScene={"image": "scene", "context_es": "La visita está confirmada."})
        gate.update(stage="Mission", mission_kind="voice-gate", chapter="visit",
                    speakTarget={"text": "I work.", "image": "scene"})
        gate["turns"][0]["text"] = "What do you do?"
        (self.root / "prepared.receipt.json").write_text(json.dumps({**self.receipt, "sourceText": "What do you do?"}))
        lesson["cards"] = [choice]
        for number in range(4):
            image_id = f"response-{number}"
            source["assets"][image_id] = {"file": f"{image_id}.webp", "sha256": self.asset(f"{image_id}.webp", f"response fixture {number}".encode())}
            next_gate = copy.deepcopy(gate)
            next_gate["id"] = f"3.2-S0{number + 1}"
            next_gate["speakTarget"]["image"] = image_id
            lesson["cards"].append(next_gate)
        outputs = self.compile(source)
        package = outputs["lesson-delivery-package.json"]
        decision, voice, *other_gates = package["canonicalProjection"][0]["cards"]
        self.assertEqual(5, outputs["app-package-validation.json"]["schemaValidatedProjectionCards"])
        self.assertEqual([], decision["mission_game"]["targets"])
        self.assertEqual([], decision["mission_game"]["cues"])
        self.assertEqual("Listen", decision["stage"])
        self.assertEqual("I work.", voice["prompt"])
        self.assertEqual("written", voice["prompt_presentation"])
        self.assertEqual("What do you do?", voice["mission_game"]["cue_audio_text"])
        self.assertIsNone(voice["answer_audio_text"])
        self.assertFalse(any(asset["purpose"].startswith("answer") for asset in voice["audio_assets"]))
        self.assertIn("required-canonical-audio", package["integrationContract"]["nativeImportBlockedReasons"])
        self.assertEqual("pass", verify_package(package, source, repo=REPO, asset_root=self.root)["status"])
        changed = copy.deepcopy(package)
        changed["canonicalProjection"][0]["mission"]["completion_message"] = "Un final diferente."
        errors = verify_package(changed, source, repo=REPO, asset_root=self.root)["errors"]
        self.assertTrue(any("authored mission completion_message" in error for error in errors))
        lesson["cards"].pop()
        with self.assertRaisesRegex(ValueError, "four consecutive closing voice gates"):
            self.compile(source)


if __name__ == "__main__":
    unittest.main()
