"""Bind the audio of photo-rebound cards to the exact takes their predecessors used.

A card's audio asset id includes its image reference, so rebinding a photo gives
each clip on that card a new id although its text, voice and role are unchanged.
This copies every predecessor's binding to the new id instead of letting a text
match choose a possibly different take. It never renders audio and refuses any
asset whose contract changed in more than its image.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.app.card_audio_assets import assets_for_card  # noqa: E402
from backend.app.course_audio_receipts import binding_note_for_provenance  # noqa: E402
from backend.app.course_audio_registry import load_approved_take_registry, resolve_approved_take  # noqa: E402
from backend.app.data import load_lesson_from_file  # noqa: E402
from scripts.render_course_audio_assets import write_registry  # noqa: E402

NOTE = "Reuse the exact reviewed take for the same pinned voice and spoken text."
UNCHANGED = ("purpose", "text", "mode", "variant", "semantic_role", "speaker_role", "profile_id", "revision")


def lesson_at(ref: str, relative: str):
    payload = subprocess.check_output(["git", "show", f"{ref}:{relative}"], cwd=ROOT)
    with tempfile.TemporaryDirectory() as folder:
        copy = Path(folder) / Path(relative).name
        copy.write_bytes(payload)
        return load_lesson_from_file(copy)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson-file", action="append", required=True, help="Repository-relative lesson path.")
    parser.add_argument("--base-ref", default="HEAD", help="Commit holding the lessons before the rebinding.")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    registry = load_approved_take_registry()
    bound = unbound = 0
    for relative in args.lesson_file:
        before, after = lesson_at(args.base_ref, relative), load_lesson_from_file(ROOT / relative)
        if before.id != after.id or len(before.cards) != len(after.cards):
            raise ValueError(f"{relative} changed more than its photos.")
        for index, (old_card, new_card) in enumerate(zip(before.cards, after.cards)):
            old_assets = assets_for_card(before.id, index, old_card)
            new_assets = assets_for_card(after.id, index, new_card)
            if len(old_assets) != len(new_assets):
                raise ValueError(f"{after.id} card {index + 1} changed its audio contracts.")
            for old, new in zip(old_assets, new_assets):
                if any(getattr(old, name) != getattr(new, name) for name in UNCHANGED):
                    raise ValueError(f"{new.id} changed more than its image reference.")
                if old.id == new.id:
                    continue
                prior = registry["bindings"].get(old.id)
                if prior is None:
                    # The predecessor was never registered here; keep the same state.
                    unbound += 1
                    continue
                existing = registry["bindings"].get(new.id)
                if existing and existing["take_id"] != prior["take_id"]:
                    raise ValueError(f"{new.id} is already bound to a different take.")
                if not existing:
                    provenance = registry["takes"][prior["take_id"]]["provenance"]
                    registry["bindings"][new.id] = {
                        "take_id": prior["take_id"],
                        "approved_at": provenance.get("approved_at"),
                        "approval_note": binding_note_for_provenance(provenance, NOTE),
                    }
                resolve_approved_take(new, registry)
                bound += 1
    if args.apply:
        write_registry(registry)
    print(f"{'Bound' if args.apply else 'Would bind'} {bound} rebound assets to their predecessors' takes; "
          f"{unbound} predecessors were unregistered and stay that way.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
