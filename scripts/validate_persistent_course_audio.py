from __future__ import annotations

import argparse
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.card_audio_assets import asset_index
from backend.app.data import LESSONS
from scripts.render_course_audio_assets import selected_assets


def unavailable_assets():
    return selected_assets(argparse.Namespace(
        all_named_speakers=False,
        all_missing_after_reviewed_seed=True,
        asset_id=None,
        lesson_id=None,
    ))


def main() -> None:
    missing = unavailable_assets()
    if missing:
        sample = ", ".join(asset.id for asset, _card in missing[:20])
        suffix = "" if len(missing) <= 20 else f" (and {len(missing) - 20} more)"
        raise SystemExit(
            f"Persistent course-audio validation failed: {len(missing)} unavailable assets: "
            f"{sample}{suffix}"
        )
    print(
        f"Persistent course-audio validation passed for {len(asset_index(LESSONS))} assets."
    )


if __name__ == "__main__":
    main()
