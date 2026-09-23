"""Report or ratchet the practice and pacing standards for one course.

Report (default): list every finding against docs/product/content-standards.json.
--check: fail on any finding missing from the baseline, and on baseline
entries that no longer occur, so fixed problems cannot quietly return.
--write-baseline: record the current findings after a reviewed change.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.content_engine.catalog import load_catalog, load_standards  # noqa: E402
from scripts.content_engine.practice import audit  # noqa: E402

BASELINE = Path("docs/product/content-practice-baseline.json")


def read_baseline(root: Path, course: str) -> set[str]:
    path = root / BASELINE
    if not path.exists():
        return set()
    return set(json.loads(path.read_text(encoding="utf-8")).get("courses", {}).get(course, []))


def write_baseline(root: Path, course: str, keys: set[str]) -> None:
    path = root / BASELINE
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {
        "schema_version": 1,
        "note": "Known practice findings in content that predates the 2026-09-23 standards. "
                "Entries may only be removed as lessons are rebuilt; new findings fail CI.",
        "courses": {},
    }
    data["courses"][course] = sorted(keys)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--course", default="a1")
    parser.add_argument("--root", type=Path, default=ROOT)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write-baseline", action="store_true")
    args = parser.parse_args()

    standards = load_standards(args.root, args.course)
    findings = audit(load_catalog(args.root, standards), standards)
    keys = {finding.key for finding in findings}

    if args.write_baseline:
        write_baseline(args.root, args.course, keys)
        print(f"Recorded {len(keys)} findings for {args.course}.")
        return 0

    if args.check:
        baseline = read_baseline(args.root, args.course)
        new = [finding for finding in findings if finding.key not in baseline]
        stale = sorted(baseline - keys)
        for finding in new:
            print(f"NEW  {finding.lesson:5} {finding.rule:15} {finding.item}: {finding.detail}")
        for key in stale:
            print(f"FIXED (remove from baseline) {key}")
        if new or stale:
            print("Fix new findings; after a reviewed rebuild, run --write-baseline to shrink the baseline.")
            return 1
        print(f"Content practice check passed: {len(keys)} known findings, none new.")
        return 0

    for finding in findings:
        print(f"{finding.lesson:5} {finding.rule:15} {finding.item}: {finding.detail}")
    totals = Counter(finding.rule for finding in findings)
    print("\n" + ", ".join(f"{rule}={count}" for rule, count in sorted(totals.items())))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
