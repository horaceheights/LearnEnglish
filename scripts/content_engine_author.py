"""Propose a standard lesson from a brief: a draft plan plus a review sheet.

    python scripts/content_engine_author.py BRIEF.json --out DIR

Writes DIR/<lesson>.plan.json (always a draft) and DIR/<lesson>.review.md,
and reports the proposal against the practice standards. A person reviews
every proposed answer bank before removing `draft` and installing with
`scripts/content_engine_plans.py --install DIR`.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.content_engine.author import BriefError, propose_lesson, review_sheet  # noqa: E402
from scripts.content_engine.catalog import CatalogLesson, load_standards, lesson_role  # noqa: E402
from scripts.content_engine.plan import compose_lesson  # noqa: E402
from scripts.content_engine.practice import audit  # noqa: E402

# Only rules a lone lesson can answer; untaught words and later reuse need the whole course.
LESSON_RULES = {"lesson-length", "new-item-budget", "exposures", "stage-variety"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("brief", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--course", default="a1")
    args = parser.parse_args()

    standards = load_standards(ROOT, args.course)
    brief = json.loads(args.brief.read_text(encoding="utf-8"))
    try:
        plan, banks = propose_lesson(brief, standards)
    except BriefError as error:
        print(f"Brief needs attention: {error}")
        return 1
    lesson = compose_lesson(plan)
    number = str(lesson.get("sub_lesson_id") or lesson.get("id"))
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / f"{number}.plan.json").write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n",
                                                  encoding="utf-8", newline="\n")
    (args.out / f"{number}.review.md").write_text(review_sheet(plan, banks), encoding="utf-8", newline="\n")

    unit = int(number.split(".")[0]) if number.split(".")[0].isdigit() else 0
    findings = [finding for finding in audit([CatalogLesson(number, unit, lesson_role(lesson), lesson, args.brief)],
                                             {**standards, "later_reuse_exempt_final_units": 1})
                if finding.rule in LESSON_RULES]
    stages = {}
    for card in lesson["cards"]:
        stages[card["stage"]] = stages.get(card["stage"], 0) + 1
    print(f"Proposed {number}: {len(lesson['cards'])} cards {stages}; {len(banks)} answer banks to review.")
    for finding in findings:
        print(f"  {finding.rule}: {finding.item}: {finding.detail}")
    print("Meets the lesson-level practice standards." if not findings else "Adjust the brief before review.")
    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
