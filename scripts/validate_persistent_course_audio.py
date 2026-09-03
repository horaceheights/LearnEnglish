from __future__ import annotations

import argparse
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.card_audio_assets import asset_index as canonical_asset_index
from backend.app.data import LESSONS
from backend.app.persistent_audio_assets import asset_index as catalog_asset_index
from scripts.render_course_audio_assets import selected_assets


def unavailable_assets():
    return selected_assets(argparse.Namespace(
        all_named_speakers=False,
        all_missing_after_reviewed_seed=True,
        asset_id=None,
        lesson_id=None,
    ))


def main() -> None:
    expected = canonical_asset_index(LESSONS)
    catalog = catalog_asset_index()
    missing_from_catalog = sorted(set(expected) - set(catalog))
    stale_in_catalog = sorted(set(catalog) - set(expected))
    mismatched = sorted(
        asset_id
        for asset_id in set(expected) & set(catalog)
        if expected[asset_id] != catalog[asset_id]
    )
    if missing_from_catalog or stale_in_catalog or mismatched:
        def sample(values: list[str]) -> str:
            return ", ".join(values[:10]) or "none"

        raise SystemExit(
            "Persistent course-audio catalog does not match the canonical lesson payload. "
            f"Missing: {sample(missing_from_catalog)}. "
            f"Stale: {sample(stale_in_catalog)}. "
            f"Mismatched: {sample(mismatched)}."
        )

    missing = unavailable_assets()
    if missing:
        sample = ", ".join(asset.id for asset, _card in missing[:20])
        suffix = "" if len(missing) <= 20 else f" (and {len(missing) - 20} more)"
        raise SystemExit(
            f"Persistent course-audio validation failed: {len(missing)} unavailable assets: "
            f"{sample}{suffix}"
        )
    print(
        f"Persistent course-audio validation passed for {len(expected)} assets."
    )


if __name__ == "__main__":
    main()
