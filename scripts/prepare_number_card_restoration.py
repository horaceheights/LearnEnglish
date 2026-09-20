"""Record the restored numeral-card photos that replace the counting photos.

Lessons 2.6, 3.3 and 3.4 teach and review numbers with registration photos:
one person holding one card that shows a single large numeral. On 2026-09-12
PR #148 overwrote ``a1_n1.webp`` to ``a1_n10.webp`` in place with counting
photos (apples, mugs, pens) and copied them byte-for-byte to the
``*_four-card.webp`` names. The four-card grid then cropped the counts, and the
Unit 3 number cards silently lost the numerals their contracts describe.

On 2026-09-19 the user decided that numbers are taught with the numerals
themselves and that the counting photos wait until their nouns are taught.
The exact pre-#148 bytes are restored under new versioned names. The counting
photos stay byte-for-byte under their own names. This script writes one
hash-bound ``contract-violating-photo-retirement`` record per old/new pair
into the photo-reuse evidence. It never changes pixels or lesson files.
``install_course_photo_reuse.py --apply`` then records the preservation plans.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.audit_course_media_preservation import IMAGE_ROOTS, digest, read_lesson  # noqa: E402

PROOF = ROOT / "docs/qa/course-photo-reuse-v1.json"
# The last commit before PR #148 overwrote the numeral photos in place.
SOURCE_COMMIT = "e97535f8ac056d9084150f64ad47a24a73b18aee"
FIRST_ADDED_BY = "98eca9af5fb819eca3b910f621a4c1919775fb32"
OVERWRITTEN_BY = "6b3ef7969e0e284393ee1611d6a25bfb53e621c0"
LESSON_FILES = (
    "backend/lessons/unit_2/lesson-2-6-numbers-1-10.yaml",
    "backend/lessons/unit_3/lesson-3-3-am-is-and-are.yaml",
    "backend/lessons/unit_3/lesson-3-4-age.yaml",
)
AUTHORIZATION = (
    "2026-09-19 user direction: introduce numbers with the numerals themselves, not counted objects, "
    "and reuse the counting photos only after the learner has been taught what the objects are."
)
PERSON = {
    1: "an older man in a straw hat and dark jacket",
    2: "a woman in a dark jacket with her hair pulled back",
    3: "a smiling East Asian man in a mustard shirt",
    4: "a young man in a wheelchair wearing a teal sweater",
    5: "an older woman with gray hair in a dark purple jacket",
    6: "an older Black woman in a teal cardigan",
    7: "a Middle Eastern man in a light blue shirt",
    8: "an older white woman in a coral jacket",
    9: "a young man in a black hoodie",
    10: "a South Asian woman in a green blouse",
}
COUNTED = {
    1: "one red apple on a wooden table",
    2: "two yellow bananas joined at the stem on a wooden table",
    3: "three green apples in a row on a wooden table",
    4: "four blue notebooks side by side on a wooden table",
    5: "five oranges on a kitchen counter, two half hidden behind the front three",
    6: "six colored pencils laid side by side on a desk",
    7: "seven strawberries in a row on a cutting board",
    8: "eight white mugs stacked in four pairs",
    9: "nine wooden blocks stacked in a three-by-three square",
    10: "ten colored pens in a row on a desk",
}
# What the centered 4:5 four-card crop of each byte-identical copy leaves visible.
FOUR_CARD_CROP = {
    3: "the centered 4:5 crop cuts into the two outer apples",
    4: "the centered 4:5 crop leaves two whole notebooks and two slivers",
    5: "the centered 4:5 crop also trims the left orange, so the count cannot be read",
    6: "all six pencils happen to stay inside the centered 4:5 crop",
    7: "the centered 4:5 crop shows five of the seven strawberries",
    8: "the centered 4:5 crop shows four whole mugs and two slivers",
    9: "all nine blocks happen to stay inside the centered 4:5 crop",
    10: "the centered 4:5 crop shows about eight of the ten pens, the count of a different answer",
}
# Unit 3 cards whose recorded contracts describe these exact registration photos.
UNIT_3_CONTRACTS = {
    3: "Lesson 3.3 R8's contract still describes a man holding a card with only the numeral 3",
    6: "Lesson 3.4 N6's contract still describes a woman holding a card with only the numeral 6",
    8: "Lesson 3.4 R8 and N6 contracts still describe a woman holding a card with only the numeral 8",
}
APPROVED_UNIT_3_SOURCES = {3, 6, 7, 8, 10}


def candidate(number: int) -> str:
    return f"a1_photo_number_card_{number:02d}_v1.webp"


def pointers(value: object, prefix: str = "") -> dict[str, str]:
    """Map every image field of a lesson to its JSON pointer."""
    found: dict[str, str] = {}
    if isinstance(value, dict):
        for key, child in value.items():
            path = f"{prefix}/{key}"
            if key in {"image_url", "prompt_image_url"} and isinstance(child, str) and child:
                found[path] = Path(child.split("?", 1)[0]).name
            else:
                found.update(pointers(child, path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.update(pointers(child, f"{prefix}/{index}"))
    return found


def base_lesson(ref: str, relative: str) -> dict:
    return json.loads(subprocess.check_output(["git", "show", f"{ref}:{relative}"], cwd=ROOT))


def old_observation(number: int, four_card: bool) -> str:
    if four_card:
        return (f"Byte-identical copy of a1_n{number}.webp ({COUNTED[number]}), not a four-card reframe: "
                f"{FOUR_CARD_CROP[number]}. It shows no numeral and teaches counting before the object is taught.")
    text = (f"Counting photo with no numeral: {COUNTED[number]}. PR #148 wrote it in place over the "
            f"numeral-{number} registration photo, so the number card shows objects the learner has not been taught")
    if number in UNIT_3_CONTRACTS:
        text += f"; {UNIT_3_CONTRACTS[number]}"
    return text + "."


def new_observation(number: int) -> str:
    text = (f"Restored pre-#148 registration photo, the exact bytes of a1_n{number}.webp at {SOURCE_COMMIT[:8]}: "
            f"{PERSON[number]} holds one white card showing only the large numeral {number}. The whole numeral "
            "stays inside the centered 4:5 crop")
    if number == 10:
        text += "; the card's left border touches the crop edge while the numeral keeps over 100 px of margin"
    if number in APPROVED_UNIT_3_SOURCES:
        text += f". Same scene as the approved Unit 3 source u3-number-{number:02d}-registration-approved-v1.png"
    return text + "."


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-ref", required=True, help="Commit whose lessons still bind the counting photos.")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    scopes: dict[tuple[str, str], list[dict]] = {}
    for relative in LESSON_FILES:
        before = pointers(base_lesson(args.base_ref, relative))
        lesson = read_lesson(ROOT / relative)
        after = pointers(lesson)
        for pointer, old in before.items():
            if not old.startswith("a1_n"):
                continue
            number = int(old.removeprefix("a1_n").split("_", 1)[0].removesuffix(".webp"))
            if after.get(pointer) != candidate(number):
                raise ValueError(f"{relative}{pointer} does not show {candidate(number)}.")
            scopes.setdefault((old, candidate(number)), []).append(
                {"lesson_id": lesson["id"], "lesson": lesson["sub_lesson_id"], "path": relative, "pointer": pointer})

    records = []
    for (old, new), scope in sorted(scopes.items(), key=lambda item: (int(item[0][1][21:23]), item[0][0])):
        number = int(new[21:23])
        source_path = f"Lessons/Lesson1/images/a1_n{number}.webp"
        source = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{source_path}"], cwd=ROOT)
        new_sha = hashlib.sha256(source).hexdigest()
        for folder in IMAGE_ROOTS:
            if digest(ROOT / folder / new) != new_sha:
                raise ValueError(f"{folder}/{new} is not the exact pre-#148 photo.")
        records.append({
            "old_filename": old,
            "old_sha256": digest(ROOT / IMAGE_ROOTS[0] / old),
            "candidate_filename": new,
            "exists": True,
            "disposition": "agent-reviewed",
            "new_sha256": new_sha,
            "kind": "contract-violating-photo-retirement",
            "old_observation": old_observation(number, old.endswith("_four-card.webp")),
            "new_observation": new_observation(number),
            "scopes": scope,
            "crop_review": "inspected-3x2-and-centered-4x5",
            "human_approval": "pending",
            "authorization": AUTHORIZATION,
            "restoration": {
                "source_commit": SOURCE_COMMIT,
                "source_path": source_path,
                "git_blob": subprocess.check_output(
                    ["git", "rev-parse", f"{SOURCE_COMMIT}:{source_path}"], cwd=ROOT, text=True).strip(),
                "first_added_by": FIRST_ADDED_BY,
                "overwritten_in_place_by": OVERWRITTEN_BY,
            },
        })

    proof = json.loads(PROOF.read_text(encoding="utf-8"))
    pairs = {(r["old_filename"], r["candidate_filename"]) for r in records}
    kept = [r for r in proof["assets"] if (r["old_filename"], r["candidate_filename"]) not in pairs]
    proof["assets"] = kept + records
    if args.apply:
        PROOF.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    fields = sum(len(r["scopes"]) for r in records)
    print(f"{'Recorded' if args.apply else 'Would record'} {len(records)} numeral-card restorations "
          f"covering {fields} lesson image fields.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
