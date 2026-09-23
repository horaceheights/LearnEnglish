"""Import live lessons into engine plans, prove the engine rebuilds them, and install plans.

Default: report, per lesson, how many cards come purely from recipes.
--check: fail unless composing every imported plan returns the live lesson exactly.
--export DIR: write each lesson's plan as JSON, recording the file it came from.
--install DIR: compose the plans in DIR and install them with the engine's safety
rules (no concurrent edits, no drafts, whole-course validation or full restore).
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
from scripts.content_engine.install import InstallRefused, install, source_record  # noqa: E402
from scripts.content_engine.plan import compose_lesson, import_lesson, recipe_coverage  # noqa: E402


def install_plans(root: Path, directory: Path) -> int:
    plans = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(directory.glob("*.plan.json"))]
    if not plans:
        print(f"No plans found in {directory}.")
        return 1
    try:
        written = install(root, plans)
    except InstallRefused as error:
        print(f"Install refused: {error}")
        return 1
    print(f"Installed {len(written)} lessons; the whole course validated.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--course", default="a1")
    parser.add_argument("--root", type=Path, default=ROOT)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--export", type=Path)
    mode.add_argument("--install", type=Path)
    args = parser.parse_args()

    if args.install:
        return install_plans(args.root, args.install)

    catalog = load_catalog(args.root, load_standards(args.root, args.course))
    mismatched, totals, fields = [], Counter(), Counter()
    for lesson in catalog:
        plan = import_lesson(lesson.data)
        if compose_lesson(plan) != lesson.data:
            mismatched.append(lesson.number)
        coverage = recipe_coverage(plan)
        totals.update(cards=coverage["cards"], pure=coverage["pure"])
        fields.update(coverage["exception_fields"])
        if args.export:
            args.export.mkdir(parents=True, exist_ok=True)
            plan = {**plan, "source": source_record(args.root, lesson.path)}
            path = args.export / f"{lesson.number}.plan.json"
            path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        if not (args.check or args.export):
            print(f"{lesson.number:5} {coverage['pure']:3}/{coverage['cards']:<3} from recipes"
                  + (f"  exceptions: {coverage['exception_fields']}" if coverage["exception_fields"] else ""))

    share = totals["pure"] / totals["cards"] if totals["cards"] else 0
    print(f"{len(catalog)} lessons; {totals['pure']}/{totals['cards']} cards ({share:.0%}) from recipes; "
          f"exceptions by field: {dict(fields.most_common())}")
    if mismatched:
        print(f"Plans do not rebuild these lessons exactly: {', '.join(mismatched)}")
        return 1
    print("Every lesson rebuilds exactly from its plan.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
