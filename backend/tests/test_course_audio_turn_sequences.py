import hashlib
from pathlib import Path

import yaml

from backend.app.card_audio_assets import assets_for_card
from backend.app.schemas import LessonCard


ROOT_DIR = Path(__file__).resolve().parents[2]
LESSONS_ROOT = ROOT_DIR / "backend" / "lessons"
IMAGE_ROOT = ROOT_DIR / "Lessons" / "Lesson1" / "images"
TURN_FIELDS = ("audio_turns", "answer_audio_turns")
CHARACTER_ROLES = {
    "ana",
    "diego",
    "female-character",
    "luis",
    "male-character",
    "sofia",
}
EXPECTED_SEQUENCE_COUNT = 19
EXPECTED_TURN_COUNT = 40
EXPECTED_TURN_DIGEST = "e16c4a841e0cfacf8ff131aa565b5d1ab202f4618b6599d9515994e01dbcb4a0"


class TestCourseAudioTurnSequences:
    def test_reviewed_conversations_are_ordered_image_audio_turns(self) -> None:
        rows: list[str] = []
        sequence_count = 0

        for path in sorted(LESSONS_ROOT.rglob("*.yaml")):
            lesson = yaml.safe_load(path.read_text(encoding="utf-8"))
            lesson_id = lesson["id"]
            for card_index, raw_card in enumerate(lesson["cards"]):
                card = LessonCard(**raw_card)
                assets = assets_for_card(lesson_id, card_index, card)
                for field in TURN_FIELDS:
                    turns = raw_card.get(field) or []
                    if not turns:
                        continue
                    sequence_count += 1
                    purpose = "answer" if field == "answer_audio_turns" else "prompt"
                    turn_assets = [
                        asset for asset in assets
                        if asset.purpose.startswith(f"{purpose}-turn-")
                    ]
                    assert len(turn_assets) == len(turns)
                    assert not any(asset.purpose == purpose for asset in assets)

                    for turn_index, (turn, asset) in enumerate(zip(turns, turn_assets), start=1):
                        assert asset.purpose == f"{purpose}-turn-{turn_index}"
                        assert asset.text == turn["text"]
                        assert asset.speaker_role == turn["speaker_role"]
                        assert asset.image_ref == turn["image_url"]
                        assert turn["speaker_role"] in CHARACTER_ROLES
                        assert (IMAGE_ROOT / Path(turn["image_url"]).name).is_file()
                        rows.append("|".join([
                            lesson_id,
                            str(raw_card.get("slide_id") or ""),
                            field,
                            str(turn_index),
                            turn["text"],
                            turn["speaker_role"],
                            turn["image_url"],
                        ]))

        assert sequence_count == EXPECTED_SEQUENCE_COUNT
        assert len(rows) == EXPECTED_TURN_COUNT
        digest = hashlib.sha256(("\n".join(rows) + "\n").encode("utf-8")).hexdigest()
        assert digest == EXPECTED_TURN_DIGEST
