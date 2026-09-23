"""Import live lessons into engine plans and prove the engine rebuilds them.

Default: report, per lesson, how many cards come purely from recipes.
--check: fail unless composing every imported plan returns the live lesson exactly.
--export DIR: write each lesson's plan as JSON for inspection.
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
from scripts.content_engine.plan import compose_lesson, import_lesson, recipe_coverage  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--course", default="a1")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--export", type=Path)
    args = parser.parse_args()

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
            path = args.export / f"{lesson.number}.plan.json"
            path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        if not args.check:
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
