from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


from backend.app.card_audio_assets import asset_index
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take
from backend.app.data import LESSONS
from scripts import migrate_course_audio_brian_to_liam as migration
from scripts.render_course_audio_assets import write_registry


BRIAN_COMPLETION_TAKE_ID = "732c691481201c02dc31fb66ffb9a1afd1e2adf724b53cf51fddc4cc70fb40aa"
VALID_ANA_TAKE_ID = "059955d7fcb00ce5fe0d7e0d4765dbe2da29c85c1f3d5a29b0cbe54dcdd10165"
VALID_ANA_ASSET_ID = "lesson-3-1-greetings-and-names-c006-prompt-6587f77088ff445d9c87"
STALE_ASSET_ID = "retired-brian-course-audio-asset"


class BrianToLiamRegistryMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.current_index = asset_index(LESSONS)
        cls.target_asset = cls.current_index[migration.PINNED_ASSET_ID]
        cls.valid_ana_asset = cls.current_index[VALID_ANA_ASSET_ID]
        cls.real_registry_dir = migration.approved_audio_dir()
        cls.real_registry = load_approved_take_registry()
        cls.source_payload = migration.SOURCE_AUDIO.read_bytes()
        cls.qa_payload = migration.QA_EVIDENCE.read_bytes()

    def registry_fixture(self) -> tuple[Path, dict[str, object], dict[str, bytes]]:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        registry_dir = Path(temporary.name) / "approved-course-audio"
        takes_dir = registry_dir / "takes"
        takes_dir.mkdir(parents=True)

        brian_take = copy.deepcopy(self.real_registry["takes"][BRIAN_COMPLETION_TAKE_ID])
        ana_take = copy.deepcopy(self.real_registry["takes"][VALID_ANA_TAKE_ID])
        brian_binding = {
            "take_id": BRIAN_COMPLETION_TAKE_ID,
            "approved_at": brian_take["provenance"]["approved_at"],
            "approval_note": "pre-release Brian binding",
        }
        registry: dict[str, object] = {
            "schema_version": 1,
            "takes": {
                BRIAN_COMPLETION_TAKE_ID: brian_take,
                VALID_ANA_TAKE_ID: ana_take,
            },
            "bindings": {
                migration.PINNED_ASSET_ID: copy.deepcopy(brian_binding),
                STALE_ASSET_ID: copy.deepcopy(brian_binding),
                VALID_ANA_ASSET_ID: copy.deepcopy(
                    self.real_registry["bindings"][VALID_ANA_ASSET_ID]
                ),
            },
        }
        original_files: dict[str, bytes] = {}
        for take in registry["takes"].values():
            source = self.real_registry_dir / take["file"]
            target = registry_dir / take["file"]
            target.parent.mkdir(parents=True, exist_ok=True)
            payload = source.read_bytes()
            target.write_bytes(payload)
            original_files[target.name] = payload
        (registry_dir / "registry.json").write_text(
            json.dumps(registry, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return registry_dir, registry, original_files

    def run_migration(
        self,
        registry_dir: Path,
        *,
        apply: bool,
        source_audio: Path | None = None,
        qa_evidence: Path | None = None,
    ) -> migration.MigrationPlan:
        index = {
            migration.PINNED_ASSET_ID: self.target_asset,
            VALID_ANA_ASSET_ID: self.valid_ana_asset,
        }
        return migration.migrate(
            apply=apply,
            index=index,
            registry_dir=registry_dir,
            source_audio=source_audio or migration.SOURCE_AUDIO,
            qa_evidence=qa_evidence or migration.QA_EVIDENCE,
            committed_audio=self.source_payload,
            committed_qa=self.qa_payload,
            registry_writer=write_registry,
        )

    def test_dry_run_reports_pruning_without_writing_and_preserves_all_takes(self) -> None:
        registry_dir, original_registry, original_files = self.registry_fixture()
        registry_before = (registry_dir / "registry.json").read_bytes()

        plan = self.run_migration(registry_dir, apply=False)

        self.assertEqual(registry_before, (registry_dir / "registry.json").read_bytes())
        self.assertFalse((registry_dir / "takes" / f"{migration.LIAM_AUDIO_SHA256}.mp3").exists())
        self.assertEqual(
            {path.name: path.read_bytes() for path in (registry_dir / "takes").glob("*.mp3")},
            original_files,
        )
        self.assertEqual(
            {
                (migration.PINNED_ASSET_ID, "invalid-contract"),
                (STALE_ASSET_ID, "unknown-asset"),
            },
            {(item.asset_id, item.category) for item in plan.pruned_bindings},
        )
        self.assertEqual(original_registry, plan.source_registry)
        for take_id, take in original_registry["takes"].items():
            self.assertEqual(take, plan.registry["takes"][take_id])
        self.assertEqual(
            self.real_registry["bindings"][VALID_ANA_ASSET_ID],
            plan.registry["bindings"][VALID_ANA_ASSET_ID],
        )
        self.assertFalse(
            any(
                binding["take_id"] == BRIAN_COMPLETION_TAKE_ID
                for binding in plan.registry["bindings"].values()
            )
        )
        liam_take = plan.registry["takes"][migration.LIAM_AUDIO_SHA256]
        self.assertEqual(migration.LIAM_VOICE_ID, liam_take["provenance"]["voice_id"])
        self.assertEqual("male-conversational", liam_take["provenance"]["narrator"])
        self.assertIsNone(liam_take["provenance"]["request_id"])
        self.assertIsNone(liam_take["provenance"]["character_cost"])
        self.assertEqual(
            migration.PINNED_COMPLETION_CONTRACT,
            liam_take["completion_contract"],
        )
        self.assertEqual(
            migration.LIAM_AUDIO_SHA256,
            plan.registry["bindings"][migration.PINNED_ASSET_ID]["take_id"],
        )

    def test_apply_uses_atomic_registry_writer_and_keeps_brian_file_unbound(self) -> None:
        registry_dir, original_registry, original_files = self.registry_fixture()
        renderer_patch = patch(
            "scripts.render_course_audio_assets.approved_audio_dir",
            return_value=registry_dir,
        )
        with renderer_patch:
            plan = self.run_migration(registry_dir, apply=True)

        stored = load_approved_take_registry(registry_dir)
        for take_id, take in original_registry["takes"].items():
            self.assertEqual(take, stored["takes"][take_id])
        for name, payload in original_files.items():
            self.assertEqual(payload, (registry_dir / "takes" / name).read_bytes())
        self.assertFalse(
            any(
                binding["take_id"] == BRIAN_COMPLETION_TAKE_ID
                for binding in stored["bindings"].values()
            )
        )
        self.assertEqual(
            self.source_payload,
            (registry_dir / "takes" / f"{migration.LIAM_AUDIO_SHA256}.mp3").read_bytes(),
        )
        resolved = resolve_approved_take(self.target_asset, stored, registry_dir)
        self.assertIsNotNone(resolved)
        self.assertEqual(migration.LIAM_AUDIO_SHA256, resolved.take_id)
        self.assertEqual(2, len(plan.pruned_bindings))

    def test_wrong_cache_hash_fails_before_registry_changes(self) -> None:
        registry_dir, _registry, _files = self.registry_fixture()
        temporary_source = registry_dir.parent / migration.CACHE_FILENAME
        damaged = bytearray(self.source_payload)
        damaged[-1] ^= 0x01
        temporary_source.write_bytes(damaged)
        registry_before = (registry_dir / "registry.json").read_bytes()

        with self.assertRaisesRegex(ValueError, "checksum does not match"):
            self.run_migration(registry_dir, apply=False, source_audio=temporary_source)

        self.assertEqual(registry_before, (registry_dir / "registry.json").read_bytes())

    def test_wrong_qa_evidence_fails_before_registry_changes(self) -> None:
        registry_dir, _registry, _files = self.registry_fixture()
        document = json.loads(self.qa_payload)
        row = next(
            row for row in document["repairs"] if row["request_id"] == migration.QA_AUDIT_ID
        )
        row["validation"] = "fail"
        temporary_qa = registry_dir.parent / Path(migration.QA_REPOSITORY_PATH).name
        temporary_qa.write_text(json.dumps(document), encoding="utf-8")
        registry_before = (registry_dir / "registry.json").read_bytes()

        with self.assertRaisesRegex(ValueError, "validation does not match"):
            self.run_migration(registry_dir, apply=False, qa_evidence=temporary_qa)

        self.assertEqual(registry_before, (registry_dir / "registry.json").read_bytes())

    def test_existing_same_hash_with_other_metadata_is_never_relabelled(self) -> None:
        registry_dir, registry, _files = self.registry_fixture()
        conflicting = copy.deepcopy(registry["takes"][BRIAN_COMPLETION_TAKE_ID])
        conflicting["file"] = f"takes/{migration.LIAM_AUDIO_SHA256}.mp3"
        conflicting["audio_sha256"] = migration.LIAM_AUDIO_SHA256
        conflicting["bytes"] = len(self.source_payload)
        registry["takes"][migration.LIAM_AUDIO_SHA256] = conflicting
        (registry_dir / "takes" / f"{migration.LIAM_AUDIO_SHA256}.mp3").write_bytes(
            self.source_payload
        )
        (registry_dir / "registry.json").write_text(
            json.dumps(registry, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        with self.assertRaisesRegex(ValueError, "Refusing to relabel"):
            self.run_migration(registry_dir, apply=False)


if __name__ == "__main__":
    unittest.main()
