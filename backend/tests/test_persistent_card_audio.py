import asyncio
import copy
import json
import unittest
from collections import Counter
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
import yaml

from backend.app.card_audio_assets import (
    ImmutableAssetConflict,
    asset_index,
    assets_for_card,
    card_image_ref,
    install_asset_once,
    read_asset,
    seed_static_assets,
    storage_status,
    store_approved_asset,
)
from backend.app.course_audio_profile import (
    COURSE_AUDIO_MODEL_ID,
    COURSE_AUDIO_OUTPUT_FORMAT,
    COURSE_AUDIO_PROFILE_ID,
    COURSE_AUDIO_PROVIDER,
    COURSE_AUDIO_SEED,
    NARRATOR_VOICE_IDS,
    render_profile_for,
)
from backend.app.course_audio_receipts import (
    APPROVED_ONE_AUDIO_BINDING_NOTE,
    APPROVED_ONE_AUDIO_SHA256,
    LEGACY_STATIC_SOURCE,
    REVIEWED_EXACT_OVERRIDE_SOURCE,
    probe_mp3,
    receipt_path,
    sha256_bytes,
    validate_stored_asset,
    validate_provenance,
)
from backend.app.course_audio_registry import (
    ApprovedTakeRegistryError,
    load_approved_take_registry,
    resolve_approved_take,
)
from backend.app.data import LESSONS
from backend.app.schemas import ChoiceOption, CourseAudioAsset, LessonCard
from scripts.render_course_audio_assets import (
    RenderJob,
    add_generated_take,
    bind_take,
    blank_text_for,
    blank_texts_for,
    capture_legacy_backend_take,
    deterministic_completion_silence,
    fragment_request_contract,
    fragment_stage_path,
    generate_take,
    load_staged_fragment,
    matching_take_id,
    main as render_audio_main,
    request_audio,
    render_jobs,
    selected_assets,
)
from scripts.validate_course_audio_cast import validate_assignments


ROOT_DIR = Path(__file__).resolve().parents[2]
REVIEWED_HELLO_SHA256 = "b8292d77a02363d0b520600c3155db73d732b05ca6cb7c089a26c4d6b0722fe5"
REVIEWED_TAKES_DIR = ROOT_DIR / "backend" / "approved-course-audio" / "takes"


def reviewed_hello_bytes() -> bytes:
    return (REVIEWED_TAKES_DIR / f"{REVIEWED_HELLO_SHA256}.mp3").read_bytes()


def another_reviewed_mp3() -> bytes:
    for path in sorted(REVIEWED_TAKES_DIR.glob("*.mp3")):
        payload = path.read_bytes()
        if sha256_bytes(payload) != REVIEWED_HELLO_SHA256:
            return payload
    raise AssertionError("The approved registry must contain a second reviewed MP3 fixture.")


def provenance_for(asset: CourseAudioAsset, payload: bytes) -> dict[str, object]:
    return {
        "source": "reviewed-unit-test-fixture",
        **render_profile_for(asset.speaker_role, asset.mode).as_provenance_contract(),
        "stored_media": probe_mp3(payload),
        "processing": ["Read byte-for-byte from a reviewed repository take."],
        "generated_at": "2026-08-28T21:01:57Z",
        "approved_at": "2026-08-31T12:00:00-06:00",
        "request_id": "unit-test-request",
        "trace_id": "unit-test-trace",
        "character_cost": 0,
    }


def upload_for(payload: bytes) -> UploadFile:
    return UploadFile(
        filename="approved.mp3",
        file=BytesIO(payload),
        headers=Headers({"content-type": "audio/mpeg"}),
    )


def lessons_with_assets(*assets: CourseAudioAsset) -> dict[str, object]:
    lesson = SimpleNamespace(cards=[SimpleNamespace(audio_assets=list(assets))])
    return {"test-lesson": lesson}


def copied_asset(asset: CourseAudioAsset, **updates: object) -> CourseAudioAsset:
    values = asset.model_dump() if hasattr(asset, "model_dump") else asset.dict()
    values.update(updates)
    return CourseAudioAsset(**values)


class PersistentCardAudioTests(unittest.TestCase):
    def test_every_course_asset_is_unique_and_bound_to_its_card_visual(self):
        assets = [
            asset
            for lesson in LESSONS.values()
            for card in lesson.cards
            for asset in card.audio_assets
        ]
        self.assertGreater(len(assets), 2400)
        self.assertEqual(len(assets), len({asset.id for asset in assets}))
        self.assertTrue(all(asset.image_ref for asset in assets))
        self.assertTrue(all(asset.profile_id == COURSE_AUDIO_PROFILE_ID for asset in assets))
        self.assertTrue(all(asset.revision >= 1 for asset in assets))

    def test_complete_course_has_reviewed_audio_and_exact_cast_assignments(self):
        missing = selected_assets(SimpleNamespace(
            all_named_speakers=False,
            all_missing_after_reviewed_seed=True,
            asset_id=None,
            lesson_id=None,
        ))
        self.assertEqual([], missing)
        self.assertEqual([], validate_assignments())

    def test_changing_image_speaker_or_revision_creates_a_new_asset_id(self):
        def make_card(
            image_url: str = "/lesson-assets/boy.webp",
            speaker: str = "ana",
            revision: int = 1,
        ) -> LessonCard:
            return LessonCard(
                prompt="Hello.",
                audio_text="Hello.",
                stage="Learn",
                correct_option_id="speaker",
                options=[ChoiceOption(id="speaker", image_url=image_url, label="Hello.")],
                audio_speaker=speaker,
                audio_revision=revision,
            )

        first = assets_for_card("lesson-test", 0, make_card())[0]
        changed_image = assets_for_card(
            "lesson-test", 0, make_card(image_url="/lesson-assets/girl.webp")
        )[0]
        changed_speaker = assets_for_card("lesson-test", 0, make_card(speaker="luis"))[0]
        changed_revision = assets_for_card("lesson-test", 0, make_card(revision=2))[0]

        self.assertEqual(4, len({
            first.id,
            changed_image.id,
            changed_speaker.id,
            changed_revision.id,
        }))
        self.assertNotEqual(first.image_ref, changed_image.image_ref)
        self.assertEqual("ana", first.speaker_role)
        self.assertEqual("luis", changed_speaker.speaker_role)
        self.assertEqual(2, changed_revision.revision)

    def test_text_only_cards_have_a_stable_rendered_card_binding(self):
        card = LessonCard(
            prompt="Listen.",
            audio_text="The boy.",
            stage="Listen",
            correct_option_id="boy",
            options=[ChoiceOption(id="boy", label="The boy.")],
        )
        self.assertTrue(card_image_ref(card).startswith("text-only:"))
        self.assertEqual(card_image_ref(card), card_image_ref(card))

    def test_render_profile_pins_the_approved_elevenlabs_parameters(self):
        ana = render_profile_for("ana", "prompt")
        luis = render_profile_for("luis", "prompt")

        self.assertEqual(COURSE_AUDIO_PROFILE_ID, ana.profile_id)
        self.assertEqual(COURSE_AUDIO_PROVIDER, ana.provider)
        self.assertEqual(COURSE_AUDIO_MODEL_ID, ana.model_id)
        self.assertEqual(COURSE_AUDIO_OUTPUT_FORMAT, ana.output_format)
        self.assertEqual(COURSE_AUDIO_SEED, ana.seed)
        self.assertEqual(NARRATOR_VOICE_IDS["female-warm"], ana.voice_id)
        self.assertEqual("male-conversational", luis.narrator)
        self.assertEqual(NARRATOR_VOICE_IDS["male-conversational"], luis.voice_id)
        self.assertNotIn("male-warm", NARRATOR_VOICE_IDS)
        self.assertEqual(0.55, ana.stability)
        self.assertEqual(0.80, ana.similarity_boost)
        self.assertEqual(0.0, ana.style)
        self.assertTrue(ana.use_speaker_boost)
        self.assertEqual(0.70, ana.speed)

    def test_final_male_cast_has_one_bounded_liam_render_plan(self):
        arguments = SimpleNamespace(
            all_named_speakers=False,
            all_missing_after_reviewed_seed=False,
            lesson_id=None,
            asset_id=None,
            speaker_role=["luis", "diego", "male-character"],
        )
        selected = selected_assets(arguments)
        jobs = render_jobs(arguments)

        self.assertEqual(
            Counter({"male-character": 117, "luis": 87, "diego": 7}),
            Counter(asset.speaker_role for asset, _card in selected),
        )
        self.assertEqual(211, len(selected))
        self.assertEqual(63, len(jobs))
        self.assertEqual(66, sum(len(job.request_fragments()) for job in jobs))
        self.assertEqual(815, sum(job.estimated_character_cost() for job in jobs))
        self.assertEqual(
            {"male-conversational"},
            {job.profile.narrator for job in jobs},
        )

    def test_lesson_3_1_learn_and_recognize_hello_share_exact_reviewed_bytes(self):
        lesson = LESSONS["lesson-3-1-greetings-and-names"]
        learn_card = next(card for card in lesson.cards if card.slide_id == "L1")
        recognize_card = next(card for card in lesson.cards if card.slide_id == "R1")
        learn_asset = next(asset for asset in learn_card.audio_assets if asset.purpose == "prompt")
        recognize_asset = next(
            asset for asset in recognize_card.audio_assets if asset.purpose == "prompt"
        )
        registry = load_approved_take_registry()
        learn_take = resolve_approved_take(learn_asset, registry)
        recognize_take = resolve_approved_take(recognize_asset, registry)

        self.assertNotEqual(learn_asset.id, recognize_asset.id)
        self.assertEqual(2, learn_asset.revision)
        self.assertEqual(1, recognize_asset.revision)
        self.assertEqual("ana", learn_asset.speaker_role)
        self.assertEqual("ana", recognize_asset.speaker_role)
        self.assertEqual(COURSE_AUDIO_PROFILE_ID, learn_asset.profile_id)
        self.assertEqual(COURSE_AUDIO_PROFILE_ID, recognize_asset.profile_id)
        self.assertIsNotNone(learn_take)
        self.assertIsNotNone(recognize_take)
        self.assertEqual(REVIEWED_HELLO_SHA256, learn_take.take_id)
        self.assertEqual(REVIEWED_HELLO_SHA256, recognize_take.take_id)
        self.assertEqual(REVIEWED_HELLO_SHA256, sha256_bytes(learn_take.payload))
        self.assertEqual(learn_take.payload, recognize_take.payload)

    def test_all_six_standalone_one_assets_use_the_exact_reviewed_correction(self):
        assets = [
            asset
            for lesson in LESSONS.values()
            for card in lesson.cards
            for asset in card.audio_assets
            if asset.text == "One"
        ]
        self.assertEqual(6, len(assets))

        registry = load_approved_take_registry()
        resolved = [resolve_approved_take(asset, registry) for asset in assets]
        self.assertTrue(all(take is not None for take in resolved))
        self.assertEqual(
            {APPROVED_ONE_AUDIO_SHA256},
            {take.take_id for take in resolved if take is not None},
        )
        self.assertEqual(
            {APPROVED_ONE_AUDIO_SHA256},
            {sha256_bytes(take.payload) for take in resolved if take is not None},
        )

        for take in resolved:
            self.assertEqual(REVIEWED_EXACT_OVERRIDE_SOURCE, take.provenance["source"])
            self.assertEqual(
                APPROVED_ONE_AUDIO_SHA256,
                take.provenance["approved_audio_sha256"],
            )
            for unknown_field in (
                "provider",
                "model_id",
                "voice_id",
                "narrator",
                "seed",
                "generated_at",
                "request_id",
                "trace_id",
                "character_cost",
            ):
                self.assertIsNone(take.provenance[unknown_field])

    def test_reviewed_exact_override_rejects_wrong_bytes_text_and_contract(self):
        asset = next(
            asset
            for lesson in LESSONS.values()
            for card in lesson.cards
            for asset in card.audio_assets
            if asset.text == "One"
        )
        resolved = resolve_approved_take(asset, load_approved_take_registry())
        provenance = {
            key: value
            for key, value in resolved.provenance.items()
            if key != "registry_binding"
        }
        validate_provenance(
            asset,
            provenance,
            audio_sha256=APPROVED_ONE_AUDIO_SHA256,
        )

        with self.assertRaisesRegex(ValueError, "pinned approved checksum"):
            validate_provenance(asset, provenance, audio_sha256="0" * 64)
        with self.assertRaisesRegex(ValueError, "text does not match"):
            validate_provenance(
                copied_asset(asset, text="Two"),
                provenance,
                audio_sha256=APPROVED_ONE_AUDIO_SHA256,
            )
        with self.assertRaisesRegex(ValueError, "contract is outside"):
            validate_provenance(
                copied_asset(asset, speaker_role="ana"),
                provenance,
                audio_sha256=APPROVED_ONE_AUDIO_SHA256,
            )
        unexpected = copy.deepcopy(provenance)
        unexpected["provider_requests"] = 1
        with self.assertRaisesRegex(ValueError, "unexpected provenance fields"):
            validate_provenance(
                asset,
                unexpected,
                audio_sha256=APPROVED_ONE_AUDIO_SHA256,
            )
        wrong_source_commit = copy.deepcopy(provenance)
        wrong_source_commit["source_commit"] = "0" * 40
        with self.assertRaisesRegex(ValueError, "pinned source_commit"):
            validate_provenance(
                asset,
                wrong_source_commit,
                audio_sha256=APPROVED_ONE_AUDIO_SHA256,
            )
        wrong_binding = copy.deepcopy(provenance)
        wrong_binding["registry_binding"] = {
            "take_id": APPROVED_ONE_AUDIO_SHA256,
            "approved_at": provenance["approved_at"],
            "approval_note": "invented approval note",
        }
        with self.assertRaisesRegex(ValueError, "pinned registry binding"):
            validate_provenance(
                asset,
                wrong_binding,
                audio_sha256=APPROVED_ONE_AUDIO_SHA256,
            )

    def test_reviewed_one_registry_take_installs_and_validates_end_to_end(self):
        asset = next(
            asset
            for lesson in LESSONS.values()
            for card in lesson.cards
            for asset in card.audio_assets
            if asset.text == "One"
        )
        resolved = resolve_approved_take(asset, load_approved_take_registry())

        with TemporaryDirectory() as directory, patch.dict(
            "os.environ", {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            installed = install_asset_once(asset, resolved.payload, resolved.provenance)
            audio_path = Path(directory) / f"{asset.id}.mp3"
            valid, reason, receipt = validate_stored_asset(asset, audio_path)

        self.assertTrue(installed["stored"])
        self.assertTrue(valid, reason)
        self.assertEqual(
            APPROVED_ONE_AUDIO_SHA256,
            receipt["registry_binding"]["take_id"],
        )

    def test_renderer_reuses_exact_one_take_without_rewriting_its_approval(self):
        assets = [
            asset
            for lesson in LESSONS.values()
            for card in lesson.cards
            for asset in card.audio_assets
            if asset.text == "One"
        ]
        job = RenderJob(kind="ordinary", assets=assets, text="One")
        registry = copy.deepcopy(load_approved_take_registry())

        take_id = matching_take_id(registry, job)
        self.assertEqual(APPROVED_ONE_AUDIO_SHA256, take_id)
        bind_take(registry, take_id, job, "generic renderer reuse note")

        for asset in assets:
            self.assertEqual(
                APPROVED_ONE_AUDIO_BINDING_NOTE,
                registry["bindings"][asset.id]["approval_note"],
            )
            self.assertEqual(
                APPROVED_ONE_AUDIO_SHA256,
                resolve_approved_take(asset, registry).take_id,
            )

    def test_reviewed_fixture_is_a_real_decodable_mp3(self):
        media = probe_mp3(reviewed_hello_bytes())
        self.assertEqual("mp3", media["container"])
        self.assertGreater(media["sample_rate_hz"], 0)
        self.assertGreater(media["channels"], 0)
        with self.assertRaises(ValueError):
            probe_mp3(b"ID3reviewed-audio")

    def test_provenance_requires_complete_pinned_profile_and_server_owned_fields(self):
        asset = next(
            asset
            for asset in asset_index(LESSONS).values()
            if asset.speaker_role == "ana" and asset.text == "Hello." and asset.mode == "prompt"
        )
        payload = reviewed_hello_bytes()
        valid = provenance_for(asset, payload)
        validate_provenance(asset, valid)

        missing = copy.deepcopy(valid)
        missing.pop("request_id")
        wrong_voice = copy.deepcopy(valid)
        wrong_voice["voice_id"] = "wrong-voice"
        canonical_override = copy.deepcopy(valid)
        canonical_override["asset_id"] = "attacker-selected-id"

        for label, invalid in {
            "missing-required-field": missing,
            "wrong-profile-voice": wrong_voice,
            "canonical-override": canonical_override,
        }.items():
            with self.subTest(label=label), self.assertRaises(ValueError):
                validate_provenance(asset, invalid)

    def test_immutable_install_is_idempotent_and_rejects_different_bytes(self):
        asset = next(
            asset
            for asset in asset_index(LESSONS).values()
            if asset.speaker_role == "ana" and asset.text == "Hello." and asset.mode == "prompt"
        )
        payload = reviewed_hello_bytes()
        provenance = provenance_for(asset, payload)
        replacement = another_reviewed_mp3()

        with TemporaryDirectory() as directory, patch.dict(
            "os.environ", {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            first = install_asset_once(asset, payload, provenance)
            second = install_asset_once(asset, payload, provenance)
            audio_path = Path(directory) / f"{asset.id}.mp3"
            sidecar_path = receipt_path(audio_path)
            stored_audio = audio_path.read_bytes()
            stored_receipt = sidecar_path.read_bytes()
            with self.assertRaises(ImmutableAssetConflict):
                install_asset_once(asset, replacement, provenance_for(asset, replacement))

            self.assertTrue(first["stored"])
            self.assertFalse(first["idempotent"])
            self.assertFalse(second["stored"])
            self.assertTrue(second["idempotent"])
            self.assertEqual(stored_audio, audio_path.read_bytes())
            self.assertEqual(stored_receipt, sidecar_path.read_bytes())

    def test_admin_upload_uses_real_mp3_and_preserves_immutable_asset(self):
        asset = next(
            asset
            for asset in asset_index(LESSONS).values()
            if asset.speaker_role == "ana" and asset.text == "Hello." and asset.mode == "prompt"
        )
        lessons = lessons_with_assets(asset)
        payload = reviewed_hello_bytes()
        provenance = provenance_for(asset, payload)
        replacement = another_reviewed_mp3()

        with TemporaryDirectory() as directory, patch.dict(
            "os.environ", {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            first = asyncio.run(
                store_approved_asset(asset.id, upload_for(payload), provenance, lessons)
            )
            second = asyncio.run(
                store_approved_asset(asset.id, upload_for(payload), provenance, lessons)
            )
            audio_path = Path(directory) / f"{asset.id}.mp3"
            original = audio_path.read_bytes()
            with self.assertRaises(HTTPException) as conflict:
                asyncio.run(
                    store_approved_asset(
                        asset.id,
                        upload_for(replacement),
                        provenance_for(asset, replacement),
                        lessons,
                    )
                )
            with self.assertRaises(HTTPException) as invalid_mp3:
                asyncio.run(
                    store_approved_asset(
                        asset.id,
                        upload_for(b"ID3reviewed-audio"),
                        provenance,
                        lessons,
                    )
                )

            self.assertTrue(first["stored"])
            self.assertTrue(second["idempotent"])
            self.assertEqual(409, conflict.exception.status_code)
            self.assertEqual(422, invalid_mp3.exception.status_code)
            self.assertEqual(original, audio_path.read_bytes())
            self.assertEqual(1, storage_status(lessons)["available"])

    def test_registry_can_bind_logical_takes_to_one_sha_blob_but_stays_strict(self):
        def character_card(image: str) -> LessonCard:
            return LessonCard(
                prompt="Hello.",
                audio_text="Hello.",
                stage="Learn",
                correct_option_id="hello",
                options=[ChoiceOption(id="hello", image_url=image, label="Hello.")],
                audio_speaker="ana",
            )

        first_asset = assets_for_card("registry-test", 0, character_card("ana-one.webp"))[0]
        second_asset = assets_for_card("registry-test", 1, character_card("ana-two.webp"))[0]
        payload = reviewed_hello_bytes()
        digest = sha256_bytes(payload)
        provenance = provenance_for(first_asset, payload)
        approved_at = provenance["approved_at"]
        take = {
            "file": f"takes/{digest}.mp3",
            "audio_sha256": digest,
            "bytes": len(payload),
            "text": "Hello.",
            "compatible_speaker_roles": ["ana"],
            "profile_id": COURSE_AUDIO_PROFILE_ID,
            "compatible_modes": ["prompt"],
            "compatible_variants": ["prompt"],
            "provenance": provenance,
        }
        registry = {
            "schema_version": 1,
            "takes": {
                "logical-hello-one": copy.deepcopy(take),
                "logical-hello-two": copy.deepcopy(take),
            },
            "bindings": {
                first_asset.id: {
                    "take_id": "logical-hello-one",
                    "approved_at": approved_at,
                },
                second_asset.id: {
                    "take_id": "logical-hello-two",
                    "approved_at": approved_at,
                },
            },
        }

        with TemporaryDirectory() as directory:
            root = Path(directory)
            takes = root / "takes"
            takes.mkdir()
            (takes / f"{digest}.mp3").write_bytes(payload)

            first = resolve_approved_take(first_asset, registry, root)
            second = resolve_approved_take(second_asset, registry, root)
            self.assertEqual("logical-hello-one", first.take_id)
            self.assertEqual("logical-hello-two", second.take_id)
            self.assertEqual(first.payload, second.payload)
            self.assertEqual(1, len(list(takes.glob("*.mp3"))))

            broken_cases = {}
            wrong_text = copy.deepcopy(registry)
            wrong_text["takes"]["logical-hello-two"]["text"] = "Goodbye."
            broken_cases["text"] = wrong_text
            wrong_contract = copy.deepcopy(registry)
            wrong_contract["takes"]["logical-hello-two"]["compatible_variants"] = ["answer"]
            broken_cases["contract"] = wrong_contract
            wrong_profile = copy.deepcopy(registry)
            wrong_profile["takes"]["logical-hello-two"]["profile_id"] = "wrong-profile"
            broken_cases["profile"] = wrong_profile
            wrong_provenance = copy.deepcopy(registry)
            wrong_provenance["takes"]["logical-hello-two"]["provenance"]["voice_id"] = (
                "wrong-voice"
            )
            broken_cases["provenance"] = wrong_provenance
            malformed_bytes = copy.deepcopy(registry)
            malformed_bytes["takes"]["logical-hello-two"]["bytes"] = "not-an-integer"
            broken_cases["byte-count"] = malformed_bytes

            for label, broken in broken_cases.items():
                with self.subTest(label=label), self.assertRaises(ApprovedTakeRegistryError):
                    resolve_approved_take(second_asset, broken, root)

    def test_fully_hidden_completions_share_physical_silence_not_logical_contracts(self):
        def completion_job(asset_id: str) -> RenderJob:
            for lesson in LESSONS.values():
                for card in lesson.cards:
                    for asset in card.audio_assets:
                        if asset.id == asset_id:
                            return RenderJob(
                                kind="completion",
                                assets=[asset],
                                text=asset.text,
                                visual_prompt=card.prompt,
                                blank_text=blank_text_for(card, asset.text),
                            )
            raise AssertionError(f"Missing completion asset {asset_id}")

        babies = completion_job(
            "lesson-4-children-siblings-c032-prompt-d9e66fed26a1422fce3e"
        )
        pants = completion_job(
            "lesson-7-3-clothing-c030-prompt-00948ba213857ae2fd82"
        )
        approved_at = "2026-08-31T12:00:00-06:00"
        babies_payload, babies_provenance = deterministic_completion_silence(
            babies, approved_at
        )
        pants_payload, pants_provenance = deterministic_completion_silence(
            pants, approved_at
        )

        self.assertEqual([], babies.request_fragments())
        self.assertEqual([], pants.request_fragments())
        self.assertEqual(0, babies_provenance["character_cost"])
        self.assertEqual(babies_payload, pants_payload)

        registry = {"schema_version": 1, "takes": {}, "bindings": {}}
        with TemporaryDirectory() as directory, patch(
            "scripts.render_course_audio_assets.approved_audio_dir",
            return_value=Path(directory),
        ):
            babies_take_id = add_generated_take(
                registry, babies, babies_payload, babies_provenance
            )
            bind_take(registry, babies_take_id, babies, "test")
            pants_take_id = add_generated_take(
                registry, pants, pants_payload, pants_provenance
            )
            bind_take(registry, pants_take_id, pants, "test")

            babies_take = resolve_approved_take(babies.assets[0], registry, Path(directory))
            pants_take = resolve_approved_take(pants.assets[0], registry, Path(directory))

        self.assertNotEqual(babies_take_id, pants_take_id)
        self.assertTrue(pants_take_id.startswith("logical-"))
        self.assertEqual(babies_take.payload, pants_take.payload)
        self.assertEqual("Babies.", registry["takes"][babies_take_id]["text"])
        self.assertEqual("Pants.", registry["takes"][pants_take_id]["text"])

    def test_ordered_multi_blank_completion_builds_one_gap_per_answer(self):
        card = next(
            card for card in LESSONS["lesson-1-people-actions"].cards
            if card.slide_id == "U5"
        )
        asset = next(
            asset for asset in card.audio_assets
            if asset.variant == "completion-prompt"
        )
        blanks = blank_texts_for(card, asset.text)
        job = RenderJob(
            kind="completion",
            assets=[asset],
            text=asset.text,
            visual_prompt=card.prompt,
            blank_texts=blanks,
        )

        self.assertEqual(("He", "a"), blanks)
        self.assertEqual((None, "is,", "man."), job.completion_fragments())
        self.assertEqual(
            {
                "visual_prompt": "___ is ___ man.",
                "full_text": "He is a man.",
                "blank_texts": ["He", "a"],
            },
            job.completion_contract_metadata,
        )
        self.assertEqual(["is,", "man."], [text for text, _model in job.request_fragments()])

        payload = reviewed_hello_bytes()

        class FakeResponse:
            content = payload
            headers = {
                "x-audio-provider": COURSE_AUDIO_PROVIDER,
                "x-audio-profile": COURSE_AUDIO_PROFILE_ID,
            }

            @staticmethod
            def raise_for_status() -> None:
                return None

        class FakeClient:
            def __init__(self) -> None:
                self.texts: list[str] = []

            def get(self, _url: str, params: dict[str, object]):
                self.texts.append(str(params["text"]))
                return FakeResponse()

        client = FakeClient()
        captured, provenance = capture_legacy_backend_take(
            client,
            "https://example.invalid",
            job,
            "2026-09-02T12:00:00-06:00",
        )
        self.assertEqual(["is,", "man."], client.texts)
        self.assertTrue(probe_mp3(captured))
        self.assertEqual(2, len(provenance["provider_requests"]))
        self.assertIn("one deterministic digital-silence gap per blank", provenance["processing"][1])

    def test_direct_provider_fragment_is_staged_and_reused_without_another_request(self):
        asset = next(
            asset
            for asset in asset_index(LESSONS).values()
            if asset.speaker_role == "ana" and asset.text == "Hello." and asset.mode == "prompt"
        )
        job = RenderJob(kind="ordinary", assets=[asset], text=asset.text)
        payload = reviewed_hello_bytes()

        class FakeResponse:
            content = payload
            headers = {
                "character-cost": "6",
                "request-id": "request-one",
                "x-trace-id": "trace-one",
            }

            @staticmethod
            def raise_for_status() -> None:
                return None

        class FakeClient:
            def __init__(self) -> None:
                self.calls = 0

            def post(self, *_args, **_kwargs):
                self.calls += 1
                return FakeResponse()

        class NoRequestClient:
            @staticmethod
            def post(*_args, **_kwargs):
                raise AssertionError("A staged fragment must not call the provider again.")

        first_client = FakeClient()
        with TemporaryDirectory() as directory, patch(
            "scripts.render_course_audio_assets.approved_audio_dir",
            return_value=Path(directory),
        ):
            first_payload, first_request = request_audio(
                first_client, job, job.text, job.profile.model_id
            )
            staged_path = fragment_stage_path(job, job.text, job.profile.model_id)
            second_payload, second_request = request_audio(
                NoRequestClient(), job, job.text, job.profile.model_id
            )
            alternate_model = "eleven_flash_v2"
            alternate_payload, alternate_request = request_audio(
                first_client, job, job.text, alternate_model
            )
            alternate_path = fragment_stage_path(job, job.text, alternate_model)
            alternate_reuse_payload, alternate_reuse_request = request_audio(
                NoRequestClient(), job, job.text, alternate_model
            )

            self.assertTrue(staged_path.is_file())
            self.assertTrue(alternate_path.is_file())

        self.assertEqual(2, first_client.calls)
        self.assertNotEqual(staged_path, alternate_path)
        self.assertEqual(
            job.profile.model_id,
            fragment_request_contract(job, job.text, alternate_model)["model_id"],
        )
        self.assertEqual(
            alternate_model,
            fragment_request_contract(job, job.text, alternate_model)["fragment_model_id"],
        )
        self.assertEqual(payload, first_payload)
        self.assertEqual(payload, second_payload)
        self.assertEqual(payload, alternate_payload)
        self.assertEqual(payload, alternate_reuse_payload)
        self.assertEqual(6, first_request["character_cost"])
        self.assertEqual(6, alternate_request["character_cost"])
        self.assertEqual(6, second_request["character_cost"])
        self.assertEqual(6, second_request["original_character_cost"])
        self.assertEqual(0, second_request["incremental_character_cost"])
        self.assertTrue(second_request["staged_reuse"])
        self.assertEqual(6, alternate_reuse_request["character_cost"])
        self.assertEqual(6, alternate_reuse_request["original_character_cost"])
        self.assertEqual(0, alternate_reuse_request["incremental_character_cost"])
        self.assertTrue(alternate_reuse_request["staged_reuse"])

    def test_fragment_budget_stops_before_buying_a_later_completion_fragment(self):
        job = None
        for lesson in LESSONS.values():
            for card in lesson.cards:
                for asset in card.audio_assets:
                    if asset.variant != "completion-prompt":
                        continue
                    candidate = RenderJob(
                        kind="completion",
                        assets=[asset],
                        text=asset.text,
                        visual_prompt=card.prompt,
                        blank_text=blank_text_for(card, asset.text),
                    )
                    if len(candidate.request_fragments()) == 2:
                        job = candidate
                        break
                if job is not None:
                    break
            if job is not None:
                break
        self.assertIsNotNone(job)
        first_text, first_model = job.request_fragments()[0]
        second_text, second_model = job.request_fragments()[1]
        budget = len(first_text)
        payload = reviewed_hello_bytes()

        class FakeClient:
            def __init__(self) -> None:
                self.calls = 0

            def post(self, *_args, **_kwargs):
                self.calls += 1
                return SimpleNamespace(
                    content=payload,
                    headers={"character-cost": str(budget)},
                    raise_for_status=lambda: None,
                )

        client = FakeClient()
        with TemporaryDirectory() as directory, patch(
            "scripts.render_course_audio_assets.approved_audio_dir",
            return_value=Path(directory),
        ):
            with self.assertRaisesRegex(ValueError, "remaining character budget"):
                generate_take(
                    client,
                    job,
                    "2026-08-31T12:00:00-06:00",
                    max_incremental_character_cost=budget,
                )
            self.assertTrue(fragment_stage_path(job, first_text, first_model).is_file())
            self.assertFalse(fragment_stage_path(job, second_text, second_model).exists())

        self.assertEqual(1, client.calls)

    def test_invalid_provider_cost_fails_closed_after_staging_paid_bytes(self):
        asset = next(
            asset
            for asset in asset_index(LESSONS).values()
            if asset.speaker_role == "ana" and asset.text == "Hello." and asset.mode == "prompt"
        )
        job = RenderJob(kind="ordinary", assets=[asset], text=asset.text)
        payload = reviewed_hello_bytes()

        class InvalidCostClient:
            def __init__(self) -> None:
                self.calls = 0

            def post(self, *_args, **_kwargs):
                self.calls += 1
                return SimpleNamespace(
                    content=payload,
                    headers={"character-cost": "-1"},
                    raise_for_status=lambda: None,
                )

        class NoRequestClient:
            @staticmethod
            def post(*_args, **_kwargs):
                raise AssertionError("The paid response must be reused from staging.")

        client = InvalidCostClient()
        with TemporaryDirectory() as directory, patch(
            "scripts.render_course_audio_assets.approved_audio_dir",
            return_value=Path(directory),
        ):
            with self.assertRaisesRegex(ValueError, "Invalid character-cost"):
                request_audio(client, job, job.text, job.profile.model_id)
            staged_payload, staged_request = request_audio(
                NoRequestClient(), job, job.text, job.profile.model_id
            )

        self.assertEqual(1, client.calls)
        self.assertEqual(payload, staged_payload)
        self.assertEqual(len(job.text), staged_request["character_cost"])
        self.assertEqual(0, staged_request["incremental_character_cost"])
        self.assertEqual(
            "invalid-header-text-length-fallback",
            staged_request["character_cost_source"],
        )

    def test_billed_invalid_mp3_is_staged_only_as_refund_evidence(self):
        asset = next(
            asset
            for asset in asset_index(LESSONS).values()
            if asset.speaker_role == "ana" and asset.text == "Hello." and asset.mode == "prompt"
        )
        job = RenderJob(kind="ordinary", assets=[asset], text=asset.text)

        class InvalidAudioClient:
            @staticmethod
            def post(*_args, **_kwargs):
                return SimpleNamespace(
                    content=b"ID3-this-is-not-decodable-audio",
                    headers={"character-cost": str(len(job.text))},
                    raise_for_status=lambda: None,
                )

        with TemporaryDirectory() as directory, patch(
            "scripts.render_course_audio_assets.approved_audio_dir",
            return_value=Path(directory),
        ):
            with self.assertRaises(ValueError):
                request_audio(InvalidAudioClient(), job, job.text, job.profile.model_id)
            self.assertTrue(
                fragment_stage_path(job, job.text, job.profile.model_id).is_file()
            )
            with self.assertRaisesRegex(ValueError, "Staged provider fragment is invalid"):
                load_staged_fragment(job, job.text, job.profile.model_id)

    def test_paid_renderer_refuses_to_discard_output(self):
        arguments = [
            "render_course_audio_assets.py",
            "--all-missing-after-reviewed-seed",
            "--execute",
            "--max-character-cost",
            "1",
        ]
        with patch("sys.argv", arguments), patch(
            "scripts.render_course_audio_assets.render_jobs", return_value=[]
        ):
            self.assertEqual(1, render_audio_main())

    def test_legacy_seed_never_satisfies_named_or_completion_assets(self):
        neutral = CourseAudioAsset(
            id="test-neutral-asset-0001",
            purpose="prompt",
            text="Hello.",
            mode="prompt",
            variant="prompt",
            image_ref="neutral.webp",
            semantic_role="teacher",
            speaker_role="teacher",
            profile_id=COURSE_AUDIO_PROFILE_ID,
            revision=1,
        )
        named = copied_asset(
            neutral,
            id="test-named-asset-00001",
            image_ref="ana.webp",
            speaker_role="ana",
        )
        completion = copied_asset(
            neutral,
            id="test-completion-asset-1",
            text="It is a park.",
            variant="completion-prompt",
            image_ref="park.webp",
        )
        lessons = lessons_with_assets(neutral, named, completion)
        payload = reviewed_hello_bytes()

        with TemporaryDirectory() as directory:
            root = Path(directory)
            static_dir = root / "frontend" / "public" / "audio-cache"
            manifest_path = root / "frontend" / "lib" / "courseAudioManifest.json"
            storage = root / "storage"
            static_dir.mkdir(parents=True)
            manifest_path.parent.mkdir(parents=True)
            (static_dir / "reviewed.mp3").write_bytes(payload)
            manifest_path.write_text(
                json.dumps({
                    "Hello.\nprompt\nen-US\nprompt": "reviewed.mp3",
                    "It is a park.\nprompt\nen-US\ncompletion-prompt": "reviewed.mp3",
                }),
                encoding="utf-8",
            )
            empty_registry = {"schema_version": 1, "takes": {}, "bindings": {}}
            with patch.dict("os.environ", {"COURSE_AUDIO_STORAGE_DIR": str(storage)}), patch(
                "backend.app.card_audio_assets.ROOT_DIR", root
            ), patch(
                "backend.app.card_audio_assets.load_approved_take_registry",
                return_value=empty_registry,
            ):
                status = seed_static_assets(lessons)

            self.assertEqual(1, status["copied"])
            self.assertEqual(2, status["missing"])
            self.assertEqual(0, status["invalid"])
            self.assertTrue((storage / f"{neutral.id}.mp3").is_file())
            self.assertFalse((storage / f"{named.id}.mp3").exists())
            self.assertFalse((storage / f"{completion.id}.mp3").exists())

            legacy = {
                "source": LEGACY_STATIC_SOURCE,
                "provider": "unknown-reviewed-legacy",
                "model_id": "unknown-reviewed-legacy",
                "voice_id": "unknown-reviewed-legacy",
                "narrator": "unknown-reviewed-legacy",
                "settings": {},
                "seed": None,
                "provider_output_format": "unknown-reviewed-legacy",
                "stored_media": probe_mp3(payload),
                "processing": [],
                "generated_at": None,
                "approved_at": None,
                "request_id": None,
                "trace_id": None,
                "character_cost": None,
            }
            for asset in (named, completion):
                with self.subTest(asset=asset.id), self.assertRaises(ValueError):
                    validate_provenance(asset, legacy, allow_legacy_neutral=True)

    def test_missing_asset_fails_closed_without_generation(self):
        asset_id = next(iter(asset_index(LESSONS)))
        with TemporaryDirectory() as directory, patch.dict(
            "os.environ", {"COURSE_AUDIO_STORAGE_DIR": directory}
        ):
            with self.assertRaises(HTTPException) as raised:
                read_asset(asset_id, LESSONS)
            self.assertEqual(503, raised.exception.status_code)

    def test_render_blueprint_mounts_the_paid_persistent_audio_disk(self):
        blueprint = yaml.safe_load((ROOT_DIR / "render.yaml").read_text(encoding="utf-8"))
        service = blueprint["services"][0]
        self.assertEqual("/var/data/course-audio", service["disk"]["mountPath"])
        self.assertEqual(1, service["disk"]["sizeGB"])
        env = {item["key"]: item.get("value") for item in service["envVars"]}
        self.assertEqual("/var/data/course-audio", env["COURSE_AUDIO_STORAGE_DIR"])

    def test_legacy_production_routes_remain_during_preview_migration(self):
        from backend.app import main

        paths = {route.path for route in main.app.routes}
        self.assertIn("/api/audio/course.mp3", paths)
        self.assertIn("/api/audio/course-completion.mp3", paths)
        self.assertIn("/api/audio/assets-v2/{asset_id}.mp3", paths)


if __name__ == "__main__":
    unittest.main()
