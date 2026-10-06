"""Read-only release review inventory; never records image or Preview approval."""

from __future__ import annotations

import argparse
import copy
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.a1_media_runtime_contracts import render_profile_sha256
from scripts.build_a1_media_semantic_review import (
    MANIFEST, REGISTRY, CANONICAL_ASSET_DIR, semantic_contract,
    semantic_contract_sha256, sha256_file,
)
from scripts.validate_lesson_cards import validate_a1_media_semantic_approvals


def review_inventory(manifest: dict, registry: dict, asset_dir: Path) -> dict:
    """List only review advisories, with the full stored and current bindings."""
    rows = {
        row.get("contract_sha256"): row
        for row in registry.get("approvals", [])
        if isinstance(row, dict)
    }
    inventory = []
    profiles: Counter[str] = Counter()
    decisions: Counter[str] = Counter()
    for asset in manifest["assets"]:
        contract = semantic_contract(asset, allow_stale_render_signatures=True)
        stored_hash = semantic_contract_sha256(contract)
        row = rows.get(stored_hash, {})
        decision = row.get("decision", "missing")
        decisions[decision] += 1
        current = copy.deepcopy(contract)
        drift = []
        for context in current["review_contexts"]:
            expected = render_profile_sha256(context["render_profile"])
            if context["render_signature_sha256"] != expected:
                drift.append({
                    "render_profile": context["render_profile"],
                    "stored_signature": context["render_signature_sha256"],
                    "current_signature": expected,
                })
                profiles[context["render_profile"]] += 1
            context["render_signature_sha256"] = expected
        if decision == "approved" and not drift:
            continue
        asset_path = asset_dir / contract["filename"]
        inventory.append({
            "decision": decision,
            "stored_reviewer": row.get("reviewer"),
            "stored_reviewed_at": row.get("reviewed_at"),
            "stored_contract_sha256": stored_hash,
            "stored_asset_sha256": row.get("asset_sha256"),
            "current_asset_sha256": sha256_file(asset_path) if asset_path.is_file() else None,
            "current_contract_sha256": semantic_contract_sha256(current),
            "renderer_drift": drift,
            "stored_contract": contract,
            "current_contract": current,
        })
    return {
        "decisions": dict(sorted(decisions.items())),
        "renderer_drift_by_profile": dict(sorted(profiles.items())),
        "affected_contracts": inventory,
    }


def readiness_report(commit: str, blockers: list[str], advisories: list[str], inventory: dict) -> dict:
    return {
        "schema_version": 1,
        "commit": commit,
        "status": "blocked" if blockers else "awaiting-preview-approval",
        "production_approved": False,
        "approval_requirement": (
            "Test and explicitly approve the exact latest Android/iOS Preview group "
            "at current protected main. The Production workflow verifies that binding."
        ),
        "blockers": blockers,
        "advisories": advisories,
        "review_inventory": inventory,
    }


def markdown_summary(report: dict) -> str:
    status = (
        "Blocked by content integrity failures"
        if report["blockers"]
        else "Eligible after testing and approving the exact Preview"
    )
    lines = [
        "## Production readiness",
        "",
        f"**{status}.**",
        "",
        f"Commit: `{report['commit']}`",
        "",
        report["approval_requirement"],
        "",
        "Pending image reviews, renderer drift and crop-review warnings do not block "
        "an explicitly approved Preview. Review records remain unchanged.",
        "",
        "This report checks media-review integrity; the full content, audio, TypeScript, "
        "bundle, backend and immutable Expo-group gates still apply.",
        "",
    ]
    for title, findings in [("Blockers", report["blockers"]), ("Review advisories", report["advisories"])]:
        if findings:
            lines.extend([f"### {title}", ""])
            lines.extend(f"- {finding}" for finding in findings)
            lines.append("")
    inventory = report["review_inventory"]
    lines.extend([
        f"Targeted inventory: {len(inventory.get('affected_contracts', []))} contracts.",
        "Download the release-readiness artifact for full teaching contexts, source and "
        "rendered filenames, option roles, exact asset hashes and stored/current bindings.",
        "",
        "[Open Production workflow](https://github.com/horaceheights/LearnEnglish/actions/workflows/publish-production.yml)",
        "",
    ])
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-directory", type=Path, required=True)
    parser.add_argument("--summary", type=Path)
    parser.add_argument("--verification-status", choices=("success", "failure"), default="success")
    args = parser.parse_args(argv)
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    advisories: list[str] = []
    blockers = validate_a1_media_semantic_approvals("production", advisories)
    if args.verification_status == "failure":
        blockers.append("An earlier required verification step failed; inspect the workflow logs.")
    inventory: dict = {}
    try:
        inventory = review_inventory(
            json.loads(MANIFEST.read_text(encoding="utf-8")),
            json.loads(REGISTRY.read_text(encoding="utf-8")),
            CANONICAL_ASSET_DIR,
        )
    except (OSError, ValueError, TypeError, KeyError) as exc:
        blockers.append(f"Cannot build the current review inventory: {exc}")
    # Reuse the existing crop authority rather than maintaining a second checker.
    crop = subprocess.run(
        ["node", "mobile/tests/four-card-media-review.test.cjs", "--allow-pending-review"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
    )
    if crop.returncode:
        blockers.append("Four-card media integrity failed: " + crop.stdout.strip() + crop.stderr.strip())
    elif crop.stderr.strip():
        advisories.append(crop.stderr.strip())
    report = readiness_report(commit, blockers, advisories, inventory)
    args.output_directory.mkdir(parents=True, exist_ok=True)
    (args.output_directory / "readiness.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    summary = markdown_summary(report)
    (args.output_directory / "readiness.md").write_text(summary, encoding="utf-8")
    if args.summary:
        with args.summary.open("a", encoding="utf-8") as summary_file:
            summary_file.write(summary)
    print(report["status"] + ": " + commit)
    print(f"{len(blockers)} blockers; {len(advisories)} review advisories.")
    return 1 if blockers else 0


if __name__ == "__main__":
    raise SystemExit(main())
