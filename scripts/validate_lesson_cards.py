import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
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


def main() -> int:
    errors = [
        *validate_option_ids(),
        *validate_duplicate_option_images(),
        *validate_family_adult_ambiguity(),
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
