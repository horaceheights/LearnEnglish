"""Keep every line a pictured person says in a voice that matches that person.

The neutral narrator is a woman, so a card that shows a man saying "I go by train."
sounds wrong until the line is given a male voice. That went unnoticed when a photo
sweep swapped pictures under existing lines: the old voice stayed and no test failed.

Each spoken line is keyed by the exact picture it plays over and its exact words.
docs/qa/speaking-voice-review-v1.json records, for every such pair, whether a person
who looked at the picture decided the voice must be male or female (the neutral
narrator counts as female; off-camera askers and narration are recorded as female
for that reason). The check fails when:

- a spoken line (first- or second-person words, a greeting, a request, yes/no) plays
  over a picture that no one has reviewed for that line;
- the line's voice does not match the recorded gender;
- a self-introduction names Luis, Diego, Ana or Sofia in the other gender's voice;
- a recorded pair is no longer used by any card, so the record can never vouch for a
  picture that has been replaced.

Usage (from the repository root):
  python scripts/review_speaking_voices.py                  report; exit 1 on problems
  python scripts/review_speaking_voices.py --sheets DIR     contact sheets of unreviewed pictures
  python scripts/review_speaking_voices.py --record IMAGE "TEXT" male|female
  python scripts/review_speaking_voices.py --prune          drop pairs no card uses
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.app.course_audio_profile import narrator_for_speaker  # noqa: E402

REVIEW_PATH = ROOT / "docs" / "qa" / "speaking-voice-review-v1.json"
IMAGE_ROOT = ROOT / "mobile" / "assets" / "lesson-assets"
MALE_NARRATOR = "male-conversational"
# The Spanish mission briefing is narration, and a voice gate's mission-cue clip is
# only a fallback: the gate always plays its asker's own question turn.
SKIPPED_PURPOSES = frozenset({"mission-intro", "mission-cue"})

FIRST_PERSON = re.compile(r"\b(i|i'm|my|me|mine|we|we're|our|us)\b", re.IGNORECASE)
SECOND_PERSON = re.compile(r"\b(you|your|you're|yours)\b", re.IGNORECASE)
SOCIAL = re.compile(
    r"\b(hello|hi|good morning|good afternoon|good evening|good night|goodbye|bye|thank you|"
    r"thanks|please|sorry|excuse me|nice to meet you|see you|welcome|yes|no)\b",
    re.IGNORECASE,
)
SELF_INTRODUCTION = re.compile(r"^(?:my name is|i am|i'm)\s+(luis|diego|ana|sofia|sofía)\b", re.IGNORECASE)
NAMED_GENDER = {"luis": "male", "diego": "male", "ana": "female", "sofia": "female", "sofía": "female"}


def is_spoken(text: str) -> bool:
    return bool(FIRST_PERSON.search(text) or SECOND_PERSON.search(text) or SOCIAL.search(text))


def voice_gender(speaker_role: str) -> str:
    return "male" if narrator_for_speaker(speaker_role) == MALE_NARRATOR else "female"


def image_name(image_ref: str | None) -> str | None:
    if not image_ref or image_ref.startswith("text-only:"):
        return None
    return image_ref.split("?", 1)[0].rsplit("/", 1)[-1] or None


@dataclass(frozen=True)
class SpokenLine:
    lesson: str
    slide: str
    purpose: str
    text: str
    speaker_role: str
    image: str | None

    @property
    def voice(self) -> str:
        return voice_gender(self.speaker_role)

    @property
    def card(self) -> str:
        return f"{self.lesson} {self.slide} {self.purpose}"


def spoken_lines(lessons) -> list[SpokenLine]:
    rows = []
    for lesson_id, lesson in lessons.items():
        for card in lesson.cards:
            for asset in card.audio_assets:
                if asset.purpose in SKIPPED_PURPOSES or not is_spoken(asset.text):
                    continue
                rows.append(SpokenLine(lesson_id, card.slide_id or "", asset.purpose, asset.text,
                                       asset.speaker_role, image_name(asset.image_ref)))
    return rows


def load_review(path: Path = REVIEW_PATH) -> dict[tuple[str, str], str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    review: dict[tuple[str, str], str] = {}
    for entry in data["reviewed"]:
        key = (entry["image"], entry["text"])
        if key in review:
            raise ValueError(f"Duplicate speaking-voice review for {key}")
        if entry["voice"] not in {"male", "female"}:
            raise ValueError(f"Unknown voice {entry['voice']!r} for {key}")
        review[key] = entry["voice"]
    return review


@dataclass
class Report:
    unreviewed: list[SpokenLine] = field(default_factory=list)
    mismatched: list[tuple[SpokenLine, str]] = field(default_factory=list)
    misnamed: list[SpokenLine] = field(default_factory=list)
    stale: list[tuple[str, str]] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not (self.unreviewed or self.mismatched or self.misnamed or self.stale)


def check_rows(rows: list[SpokenLine], review: dict[tuple[str, str], str]) -> Report:
    report = Report()
    used = set()
    for row in rows:
        named = SELF_INTRODUCTION.match(row.text.strip())
        if named and NAMED_GENDER[named.group(1).lower()] != row.voice:
            report.misnamed.append(row)
        if row.image is None:
            continue
        key = (row.image, row.text)
        used.add(key)
        expected = review.get(key)
        if expected is None:
            report.unreviewed.append(row)
        elif expected != row.voice:
            report.mismatched.append((row, expected))
    report.stale = sorted(set(review) - used)
    return report


def check(lessons=None, review_path: Path = REVIEW_PATH) -> Report:
    if lessons is None:
        from backend.app.data import load_all_lessons

        lessons = load_all_lessons()
    return check_rows(spoken_lines(lessons), load_review(review_path))


def describe(report: Report) -> str:
    lines = []
    if report.unreviewed:
        lines.append("Spoken lines over pictures nobody has reviewed for this line (look at the picture, "
                     "then record who says it with --record; --sheets DIR draws them):")
        lines += [f"  {row.card}: {row.text!r} over {row.image} (now {row.voice}, {row.speaker_role})"
                  for row in report.unreviewed]
    if report.mismatched:
        lines.append("Voices that do not match the reviewed speaker (fix the card's speaker role):")
        lines += [f"  {row.card}: {row.text!r} over {row.image} is {row.voice} ({row.speaker_role}); "
                  f"the pictured speaker is {expected}" for row, expected in report.mismatched]
    if report.misnamed:
        lines.append("Self-introductions in the other gender's voice:")
        lines += [f"  {row.card}: {row.text!r} is {row.voice} ({row.speaker_role})" for row in report.misnamed]
    if report.stale:
        lines.append("Reviewed pairs no card uses any more (run --prune):")
        lines += [f"  {text!r} over {image}" for image, text in report.stale]
    return "\n".join(lines)


def write_review(entries: list[dict], path: Path = REVIEW_PATH) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    data["reviewed"] = sorted(entries, key=lambda entry: (entry["image"], entry["text"]))
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")


def draw_sheets(rows: list[SpokenLine], directory: Path) -> int:
    from PIL import Image, ImageDraw, ImageFont

    directory.mkdir(parents=True, exist_ok=True)
    by_image: dict[str, list[SpokenLine]] = {}
    for row in rows:
        by_image.setdefault(row.image, []).append(row)
    try:
        font = ImageFont.truetype("arial.ttf", 17)
    except OSError:
        font = ImageFont.load_default()
    names = sorted(by_image)
    thumb_w, thumb_h, text_h = 500, 333, 118
    for start in range(0, len(names), 9):
        sheet = Image.new("RGB", (3 * (thumb_w + 12), 3 * (thumb_h + text_h + 12)), "white")
        draw = ImageDraw.Draw(sheet)
        for position, name in enumerate(names[start:start + 9]):
            x = (position % 3) * (thumb_w + 12) + 6
            y = (position // 3) * (thumb_h + text_h + 12) + 6
            path = IMAGE_ROOT / name
            if path.is_file():
                with Image.open(path) as source:
                    thumb = source.convert("RGB")
                    thumb.thumbnail((thumb_w, thumb_h))
                    sheet.paste(thumb, (x, y))
            captions = sorted({f"{row.text} [{row.voice}]" for row in by_image[name]})
            wrapped = textwrap.wrap(f"{name} | " + " | ".join(captions), 58)[:6]
            for index, line in enumerate(wrapped):
                draw.text((x, y + thumb_h + 2 + index * 19), line, fill="black", font=font)
        sheet.save(directory / f"speaking-voices-{start // 9 + 1:02d}.jpg", quality=82)
    return len(names)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sheets", type=Path, help="Write contact sheets of every unreviewed picture here.")
    parser.add_argument("--record", nargs=3, metavar=("IMAGE", "TEXT", "VOICE"),
                        help="Record the reviewed voice (male or female) for one picture and line.")
    parser.add_argument("--prune", action="store_true", help="Drop reviewed pairs that no card uses.")
    args = parser.parse_args()
    data = json.loads(REVIEW_PATH.read_text(encoding="utf-8"))
    entries = data["reviewed"]
    if args.record:
        image, text, voice = args.record
        if voice not in {"male", "female"}:
            raise SystemExit("VOICE must be male or female.")
        entries = [entry for entry in entries if (entry["image"], entry["text"]) != (image, text)]
        entries.append({"image": image, "text": text, "voice": voice, "reviewed_on": date.today().isoformat()})
        write_review(entries)
    report = check()
    if args.prune and report.stale:
        stale = set(report.stale)
        write_review([entry for entry in entries if (entry["image"], entry["text"]) not in stale])
        report = check()
    if args.sheets and report.unreviewed:
        print(f"Drew {draw_sheets(report.unreviewed, args.sheets)} unreviewed pictures in {args.sheets}")
    if report.ok:
        print("Every spoken line over a picture has a reviewed, gender-matched voice.")
        return 0
    print(describe(report))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
