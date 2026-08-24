import re
import struct
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
LESSON_ASSET_DIR = ROOT / "Lessons" / "Lesson1" / "images"
sys.path.insert(0, str(BACKEND_DIR))

from app.data import LESSONS  # noqa: E402


BROAD_ADULT_IDS = {"adult", "adults"}
ADULT_ROLE_IDS = {
    "father",
    "mother",
    "parents",
    "grandfather",
    "grandmother",
    "grandparents",
}
GRAMMAR_STAGES = {"Grammar", "New Grammar"}
PRONUNCIATION_STAGES = {"Pronunciation Practice", "Speak"}
NEGATIVE_VISUAL_CONTRACTS = {
    "they are not sitting.": {"they_boy_girl_are_running.webp"},
}


def referenced_lesson_asset(media_url: str) -> Path | None:
    prefix = "/lesson-assets/"
    path_without_query = media_url.split("?", 1)[0]
    if not path_without_query.startswith(prefix):
        return None

    asset_name = path_without_query.removeprefix(prefix)
    if not asset_name or Path(asset_name).name != asset_name:
        return None
    return LESSON_ASSET_DIR / asset_name


def validate_media_references() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            references = [("prompt", card.prompt_image_url)]
            references.extend(
                (f"option {option.id!r}", option.image_url)
                for option in card.options
            )
            for location, media_url in references:
                if not media_url:
                    continue
                asset_path = referenced_lesson_asset(media_url)
                if asset_path is None:
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) has an invalid "
                        f"{location} media URL: {media_url!r}."
                    )
                elif not asset_path.is_file():
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) references missing "
                        f"{location} media: {media_url!r}."
                    )
    return errors


def validate_duplicate_option_images() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            seen: dict[str, str] = {}
            for option in card.options:
                if not option.image_url:
                    continue
                previous_id = seen.get(option.image_url)
                if previous_id:
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) has duplicate option image "
                        f"{option.image_url!r} for {previous_id!r} and {option.id!r}."
                    )
                seen[option.image_url] = option.id
    return errors


def validate_option_ids() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            option_ids = [option.id for option in card.options]
            if len(option_ids) != len(set(option_ids)):
                errors.append(
                    f"{lesson.id} card {card_index} ({card.prompt!r}) has duplicate option ids: {option_ids}."
                )

            correct_count = option_ids.count(card.correct_option_id)
            if correct_count != 1:
                errors.append(
                    f"{lesson.id} card {card_index} ({card.prompt!r}) expected correct option "
                    f"{card.correct_option_id!r} exactly once, found {correct_count}."
                )
    return errors


def validate_family_adult_ambiguity() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            option_ids = {option.id for option in card.options}
            broad_adults = option_ids & BROAD_ADULT_IDS
            adult_roles = option_ids & ADULT_ROLE_IDS
            if broad_adults and adult_roles:
                errors.append(
                    f"{lesson.id} card {card_index} ({card.prompt!r}) mixes broad adult labels "
                    f"{sorted(broad_adults)} with adult family roles {sorted(adult_roles)}."
                )
    return errors


def validate_negative_visual_contracts() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            target_text = (card.audio_text or card.answer_audio_text or card.prompt or "").strip().lower()
            allowed_assets = NEGATIVE_VISUAL_CONTRACTS.get(target_text)
            if not allowed_assets:
                continue

            if card.prompt_image_url:
                answer_media = card.prompt_image_url
            else:
                answer_option = next(
                    (option for option in card.options if option.id == card.correct_option_id),
                    None,
                )
                answer_media = answer_option.image_url if answer_option else ""

            asset_name = answer_media.split("?", 1)[0].rsplit("/", 1)[-1]
            if asset_name not in allowed_assets:
                errors.append(
                    f"{lesson.id} card {card_index} ({card.prompt!r}) uses {asset_name!r} for "
                    f"{target_text!r}; expected one of {sorted(allowed_assets)} so the negated "
                    "posture is visibly absent."
                )
    return errors


def validate_interaction_requirements() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            location = f"{lesson.id} card {card_index} ({card.prompt!r})"
            for option in card.options:
                if not (option.label or "").strip() and not (option.image_url or "").strip():
                    errors.append(
                        f"{location} has an empty option {option.id!r}; it cannot be selected meaningfully."
                    )

            if card.stage == "Listen" and not (card.audio_text or "").strip():
                errors.append(f"{location} is a Listen card without model audio text.")

            if card.stage in GRAMMAR_STAGES:
                if not re.search(r"_+|\[\s*blank\s*\]", card.prompt, flags=re.IGNORECASE):
                    errors.append(f"{location} is a grammar card without a sentence blank.")
                if any(not (option.label or "").strip() for option in card.options):
                    errors.append(f"{location} is a grammar card with an unlabeled word choice.")

            if card.stage == "Use":
                completion = card.interaction_type is None or str(card.interaction_type).startswith("complete")
                if completion and not re.search(
                    r"_+|\[\s*blank\s*\]", card.prompt, flags=re.IGNORECASE
                ):
                    errors.append(f"{location} is a completion card without a visual sentence blank.")
                if any(not (option.label or "").strip() for option in card.options):
                    errors.append(f"{location} is an interactive Use card with an unlabeled choice.")
                if not (card.answer_audio_text or "").strip():
                    errors.append(f"{location} is an interactive Use card without completed-answer audio.")

            if card.stage in PRONUNCIATION_STAGES and not (
                (card.audio_text or "").strip() or (card.prompt or "").strip()
            ):
                errors.append(f"{location} is a pronunciation card without a phrase.")
    return errors


def webp_dimensions(path: Path) -> tuple[int, int] | None:
    data = path.read_bytes()
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    offset = 12
    while offset + 8 <= len(data):
        chunk_type = data[offset:offset + 4]
        chunk_size = struct.unpack_from("<I", data, offset + 4)[0]
        payload = data[offset + 8:offset + 8 + chunk_size]
        if chunk_type == b"VP8X" and len(payload) >= 10:
            return int.from_bytes(payload[4:7], "little") + 1, int.from_bytes(payload[7:10], "little") + 1
        if chunk_type == b"VP8L" and len(payload) >= 5 and payload[0] == 0x2F:
            bits = int.from_bytes(payload[1:5], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if chunk_type == b"VP8 " and len(payload) >= 10:
            marker = payload.find(b"\x9d\x01\x2a")
            if marker >= 0 and marker + 7 <= len(payload):
                width, height = struct.unpack_from("<HH", payload, marker + 3)
                return width & 0x3FFF, height & 0x3FFF
        offset += 8 + chunk_size + (chunk_size % 2)
    return None


def validate_a1_image_ratio() -> list[str]:
    errors: list[str] = []
    for path in LESSON_ASSET_DIR.glob("a1_*.webp"):
        dimensions = webp_dimensions(path)
        if dimensions != (1536, 1024):
            errors.append(
                f"{path.name} has dimensions {dimensions}; all new A1 stills must be 1536x1024 (3:2)."
            )
    return errors


def main() -> int:
    errors = [
        *validate_option_ids(),
        *validate_duplicate_option_images(),
        *validate_family_adult_ambiguity(),
        *validate_negative_visual_contracts(),
        *validate_interaction_requirements(),
        *validate_media_references(),
        *validate_a1_image_ratio(),
    ]
    if errors:
        print("Lesson card validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Lesson card validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
