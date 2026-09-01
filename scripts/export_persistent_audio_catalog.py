from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "backend" / "approved-course-audio" / "catalog.json"
DEFAULT_SOURCE_REF = "release/preview"
COURSE_JSON_PATH = "mobile/src/generated/a1-course.json"
REGISTRY_PATH = ROOT / "backend" / "approved-course-audio" / "registry.json"
LEGACY_MANIFEST_PATH = ROOT / "frontend" / "lib" / "courseAudioManifest.json"
LEGACY_AUDIO_DIR = ROOT / "frontend" / "public" / "audio-cache"
NEUTRAL_SPEAKER_ROLES = {"teacher", "question", "answer"}


def git_text(ref: str, path: str) -> str:
    return subprocess.check_output(
        ["git", "show", f"{ref}:{path}"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )


def git_commit(ref: str) -> str:
    return subprocess.check_output(
        ["git", "rev-parse", ref],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    ).strip()


def build_catalog(source_ref: str) -> dict[str, object]:
    lessons = json.loads(git_text(source_ref, COURSE_JSON_PATH))
    if not isinstance(lessons, list) or len(lessons) != 70:
        raise SystemExit("Persistent audio must be exported from the complete 70-lesson course.")

    assets: dict[str, dict[str, object]] = {}
    for lesson in lessons:
        for card in lesson.get("cards", []):
            for asset in card.get("audio_assets", []):
                asset_id = asset.get("id")
                if not isinstance(asset_id, str) or not asset_id:
                    raise SystemExit("Persistent audio asset has no ID.")
                if asset_id in assets and assets[asset_id] != asset:
                    raise SystemExit(f"Conflicting persistent audio asset: {asset_id}")
                assets[asset_id] = asset

    profiles = {asset.get("profile_id") for asset in assets.values()}
    if len(profiles) != 1 or None in profiles:
        raise SystemExit("Persistent audio catalog must use one exact profile.")

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    bindings = set(registry.get("bindings", {}))
    legacy_manifest = json.loads(LEGACY_MANIFEST_PATH.read_text(encoding="utf-8"))
    unavailable: list[str] = []
    legacy_assets = 0
    for asset_id, asset in assets.items():
        if asset_id in bindings:
            continue
        if (
            asset.get("speaker_role") not in NEUTRAL_SPEAKER_ROLES
            or asset.get("variant") == "completion-prompt"
        ):
            unavailable.append(asset_id)
            continue
        key = "\n".join([asset["text"], asset["mode"], "en-US", asset["variant"]])
        source_name = legacy_manifest.get(key)
        source = LEGACY_AUDIO_DIR / source_name if isinstance(source_name, str) else None
        if source is None or not source.is_file() or source.stat().st_size <= 0:
            unavailable.append(asset_id)
            continue
        legacy_assets += 1
    if unavailable:
        raise SystemExit(
            f"Persistent catalog has {len(unavailable)} assets without reviewed audio: "
            + ", ".join(unavailable[:20])
        )

    return {
        "schema_version": 1,
        "profile_id": profiles.pop(),
        "source_ref": source_ref,
        "source_commit": git_commit(source_ref),
        "lesson_count": len(lessons),
        "asset_count": len(assets),
        "registry_asset_count": sum(asset_id in bindings for asset_id in assets),
        "legacy_manifest_asset_count": legacy_assets,
        "assets": dict(sorted(assets.items())),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export immutable audio contracts without promoting Preview lesson content."
    )
    parser.add_argument("--source-ref", default=DEFAULT_SOURCE_REF)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    catalog = build_catalog(args.source_ref)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Exported {catalog['asset_count']} immutable assets from "
        f"{catalog['source_commit']} to {args.output.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
