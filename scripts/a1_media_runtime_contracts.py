from __future__ import annotations

import hashlib
import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


# These are the actual 3:2 stills rendered for option cards by both clients.
# Keep the mapping in one Python authority so manifest generation, mobile export,
# and semantic validation bind the same final pixels.
OPTION_MEDIA_VARIANTS = {
    "boy.webp": "boy_3x2.webp",
    "family_adults.webp": "family_adults_3x2.webp",
    "family_all_members.webp": "family_all_members_3x2.webp",
    "family_babies.webp": "family_babies_3x2.webp",
    "family_baby.webp": "family_baby_3x2.webp",
    "family_baby_sleeping.webp": "family_baby_sleeping_3x2.webp",
    "family_brother_studying.webp": "family_brother_studying_3x2.webp",
    "family_brothers.webp": "family_brothers_3x2.webp",
    "family_children.webp": "family_children_3x2.webp",
    "family_children_playing.webp": "family_children_playing_3x2.webp",
    "family_children_studying.webp": "family_children_studying_3x2.webp",
    "family_father.webp": "family_father_3x2.webp",
    "family_father_talking.webp": "family_father_talking_3x2.webp",
    "family_father_working.webp": "family_father_working_3x2.webp",
    "family_grandfather.webp": "family_grandfather_3x2.webp",
    "family_grandmother.webp": "family_grandmother_3x2.webp",
    "family_grandparents.webp": "family_grandparents_3x2.webp",
    "family_grandparents_sitting.webp": "family_grandparents_sitting_3x2.webp",
    "family_grandparents_talking.webp": "family_grandparents_talking_3x2.webp",
    "family_mother.webp": "family_mother_3x2.webp",
    "family_mother_cooking.webp": "family_mother_cooking_3x2.webp",
    "family_parents.webp": "family_parents_3x2.webp",
    "family_parents_talking.webp": "family_parents_talking_3x2.webp",
    "family_sisters.webp": "family_sisters_3x2.webp",
    "family_sister_playing.webp": "family_sister_playing_3x2.webp",
    "girl.webp": "girl_3x2.webp",
    "man.webp": "man_3x2.webp",
    "man_is_standing.webp": "man_is_standing_3x2.webp",
    "object_backpack.webp": "object_backpack_3x2.webp",
    "object_bike.webp": "object_bike_3x2.webp",
    "object_book.webp": "object_book_3x2.webp",
    "object_car.webp": "object_car_3x2.webp",
    "place_bridge.webp": "place_bridge_3x2.webp",
    "place_bus.webp": "place_bus_3x2.webp",
    "place_house.webp": "place_house_3x2.webp",
    "place_park.webp": "place_park_3x2.webp",
    "place_street.webp": "place_street_3x2.webp",
    "they_boy_girl.webp": "they_boy_girl_3x2.webp",
    "they_boy_girl_are_eating.webp": "they_boy_girl_are_eating_3x2.webp",
    "they_boy_girl_are_reading.webp": "they_boy_girl_are_reading_3x2.webp",
    "they_boy_girl_are_running.webp": "they_boy_girl_are_running_3x2.webp",
    "they_boy_girl_are_writing.webp": "they_boy_girl_are_writing_3x2.webp",
    "woman.webp": "woman_3x2.webp",
}

# Two-choice action cards replace the ordinary option still with these exact
# first-visible-frame posters before playback. They therefore belong to the
# still semantic contract and must never inherit approval from the source image
# or from the video itself.
TWO_CARD_ACTION_POSTERS = {
    "boy_is_drinking": "boy_is_drinking-two-card-poster.webp",
    "boy_is_eating": "boy_is_eating-two-card-poster.webp",
    "boy_is_reading": "boy_is_reading-two-card-poster.webp",
    "boy_is_running": "boy_is_running-two-card-poster.webp",
    "boy_is_swimming": "boy_is_swimming-two-card-poster.webp",
    "family_brother_studying": "family_brother_studying-two-card-poster.webp",
    "family_children_playing": "family_children_playing-two-card-poster.webp",
    "family_children_studying": "family_children_studying-two-card-poster.webp",
    "family_father_working": "family_father_working-two-card-poster.webp",
    "family_mother_cooking": "family_mother_cooking-two-card-poster.webp",
    "family_parents_talking": "family_parents_talking-two-card-poster.webp",
    "girl_is_drinking": "girl_is_drinking-two-card-poster.webp",
    "girl_is_sleeping": "girl_is_sleeping-two-card-poster.webp",
    "girl_is_walking": "girl_is_walking-two-card-poster.webp",
    "girl_is_writing": "girl_is_writing-two-card-poster.webp",
    "they_boy_girl_are_running": "they_boy_girl_are_running-two-card-poster.webp",
}

REVIEW_CONTEXT_FIELDS = (
    "context_type",
    "lesson_id",
    "unit_id",
    "sub_lesson_id",
    "stage",
    "slide_id",
    "interaction_type",
    "media_role",
    "surface_label",
    "option_id",
    "option_label",
    "is_correct",
    "source_filename",
    "rendered_filename",
    "prompt",
    "audio_text",
    "answer_audio_text",
    "spanish_translation",
    "correct_option_id",
    "options",
    "render_profile",
    "render_signature_sha256",
    "viewport_width",
    "viewport_height",
    "resize_mode",
    "object_position",
)
OPTION_CONTRACT_FIELDS = (
    "id",
    "label",
    "source_filename",
    "rendered_filename",
    "is_correct",
)
VALID_MEDIA_ROLES = {
    "prompt",
    "option",
    "lesson_thumbnail",
    "unit_thumbnail",
    "continue_thumbnail",
}
LESSON_CARD_ROLES = {"prompt", "option"}
COURSE_BROWSER_ROLES = {
    "lesson_thumbnail",
    "unit_thumbnail",
    "continue_thumbnail",
}

# Approval is intentionally conservative: changing either client's lesson-card
# renderer invalidates every lesson-card approval, even when the final image file
# itself is unchanged. This binds crop, fit, focal-position, and viewport behavior
# to the reviewed result instead of trusting a filename or pixel hash alone.
LESSON_RENDER_FILES = (
    "mobile/src/actionVideos.ts",
    "mobile/src/components/LessonMediaFrame.tsx",
    "mobile/src/components/OptionMediaImage.tsx",
    "mobile/src/components/LessonCardView.tsx",
    "mobile/src/components/PronunciationPractice.tsx",
    "frontend/components/LessonPlayer.js",
)
RENDER_PROFILE_SPECS = {
    "lesson-prompt-3x2-v1": {
        "surfaces": ["mobile LessonCardView", "web LessonPlayer"],
        "viewport": "responsive 3:2 prompt frame",
        "fit": "cover with reviewed per-asset focal policy",
        "clip": "rounded frame; no overflow",
        "transform": "none",
    },
    "lesson-speak-model-3x2-v1": {
        "surfaces": ["mobile PronunciationPractice", "web LessonPlayer"],
        "viewport": "responsive 3:2 Speak model frame",
        "fit": "cover with reviewed per-asset focal policy",
        "clip": "rounded frame; no overflow",
        "transform": "none",
    },
    "lesson-option-1to3-3x2-v1": {
        "surfaces": ["mobile LessonCardView", "web LessonPlayer"],
        "viewport": "responsive 3:2 option frame for one to three choices",
        "fit": "cover with reviewed per-asset focal policy",
        "clip": "rounded frame; no overflow",
        "transform": "none",
    },
    "lesson-option-four-mobile-4x5-web-3x2-v1": {
        "surfaces": ["mobile LessonCardView", "web LessonPlayer"],
        "viewport": (
            "mobile fixed centered 4:5 option windows in a 2x2 grid; "
            "web responsive 3:2 option frames"
        ),
        "fit": "centered cover from an exact reviewed 3:2 master or four-card reframe",
        "clip": "rounded frame; no overflow",
        "transform": "none",
    },
    "two-card-action-poster-3x2-v1": {
        "surfaces": ["mobile LessonCardView", "web LessonPlayer"],
        "viewport": "responsive 3:2 two-choice option frame",
        "fit": "cover",
        "clip": "identical rounded still/video frame",
        "transform": "no still transform; playing video may use bounded overscan",
    },
    "course-browser-lesson-row-v1": {
        "surfaces": ["mobile CourseScreen lesson row"],
        "viewport": "68x62 logical pixels",
        "fit": "cover",
        "clip": "rounded frame; no overflow",
        "transform": "none; centered",
    },
    "course-browser-continue-card-v1": {
        "surfaces": ["mobile CourseScreen continue card"],
        "viewport": "94x88 logical pixels",
        "fit": "cover",
        "clip": "rounded frame; no overflow",
        "transform": "none; centered",
    },
    "course-browser-unit-card-v1": {
        "surfaces": ["mobile CourseScreen unit card"],
        "viewport": "122x102 logical pixels",
        "fit": "cover",
        "clip": "rounded frame; no overflow",
        "transform": "none; centered",
    },
}
RENDER_PROFILE_FILES = {
    profile: (
        ("mobile/src/screens/CourseScreen.tsx",)
        if profile.startswith("course-browser-")
        else LESSON_RENDER_FILES
    )
    for profile in RENDER_PROFILE_SPECS
}
MEDIA_CONTRACT_IGNORE_START = b"// media-contract-ignore-start:"
MEDIA_CONTRACT_IGNORE_END = b"// media-contract-ignore-end:"


def renderer_contract_source(path: Path) -> bytes:
    """Return renderer source while excluding reviewed nonvisual guard blocks."""

    normalized = path.read_bytes().replace(b"\r\n", b"\n")
    kept_lines: list[bytes] = []
    ignored_tag: bytes | None = None
    for line_number, line in enumerate(normalized.splitlines(keepends=True), 1):
        if MEDIA_CONTRACT_IGNORE_START in line:
            if ignored_tag is not None:
                raise ValueError(
                    f"nested media-contract ignore block in {path} at line {line_number}"
                )
            ignored_tag = line.split(MEDIA_CONTRACT_IGNORE_START, 1)[1].strip()
            if not ignored_tag:
                raise ValueError(
                    f"unnamed media-contract ignore block in {path} at line {line_number}"
                )
            continue
        if MEDIA_CONTRACT_IGNORE_END in line:
            closing_tag = line.split(MEDIA_CONTRACT_IGNORE_END, 1)[1].strip()
            if ignored_tag is None or closing_tag != ignored_tag:
                raise ValueError(
                    f"mismatched media-contract ignore block in {path} at line {line_number}"
                )
            ignored_tag = None
            continue
        if ignored_tag is None:
            kept_lines.append(line)
    if ignored_tag is not None:
        raise ValueError(f"unterminated media-contract ignore block in {path}")
    return b"".join(kept_lines)


@lru_cache(maxsize=None)
def render_profile_sha256(profile: str) -> str:
    files = RENDER_PROFILE_FILES.get(profile)
    if files is None:
        raise ValueError(f"unknown still-media render profile {profile!r}")
    digest = hashlib.sha256()
    digest.update(
        json.dumps(
            RENDER_PROFILE_SPECS[profile],
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    )
    digest.update(b"\0")
    for relative_path in files:
        path = ROOT / relative_path
        if not path.is_file():
            raise ValueError(f"render-profile source is missing: {relative_path}")
        digest.update(relative_path.encode("utf-8"))
        digest.update(b"\0")
        # Git may materialize CRLF or LF on different reviewers' machines. The
        # renderer signature binds visual source semantics, not checkout line
        # endings or explicitly reviewed nonvisual lifecycle guard blocks.
        digest.update(renderer_contract_source(path))
        digest.update(b"\0")
    return digest.hexdigest()


def _unit_id(lesson: dict[str, Any]) -> str:
    explicit = str(lesson.get("unit_id") or "")
    if explicit:
        return explicit
    sub_lesson_id = str(lesson.get("sub_lesson_id") or "")
    unit_number = sub_lesson_id.split(".", 1)[0]
    return f"unit-{unit_number}" if unit_number else ""


def media_filename(image_url: object) -> str:
    clean_path = str(image_url or "").split("?", 1)[0].split("#", 1)[0]
    return Path(clean_path).name


def _uses_still_only_lesson_17_comparison(
    lesson_id: str, option_ids: set[str]
) -> bool:
    return (
        lesson_id == "lesson-7-is-are-not"
        and {"grandparents-sitting", "pair-running"}.issubset(option_ids)
    )


def resolved_option_filename(
    source_filename: str,
    *,
    option_count: int,
    lesson_id: str,
    option_ids: set[str],
) -> str:
    stem = Path(source_filename).stem
    if (
        option_count == 2
        and not _uses_still_only_lesson_17_comparison(lesson_id, option_ids)
        and stem in TWO_CARD_ACTION_POSTERS
    ):
        return TWO_CARD_ACTION_POSTERS[stem]
    return OPTION_MEDIA_VARIANTS.get(source_filename, source_filename)


def normalized_option_contracts(
    lesson: dict[str, Any], card: dict[str, Any]
) -> list[dict[str, Any]]:
    correct_option_id = str(card.get("correct_option_id") or "")
    options = card.get("options") or []
    if not isinstance(options, list):
        raise ValueError("card options must be a list")

    lesson_id = str(lesson.get("id") or "")
    option_ids = {
        str(option.get("id") or "")
        for option in options
        if isinstance(option, dict)
    }
    normalized: list[dict[str, Any]] = []
    for index, option in enumerate(options, 1):
        if not isinstance(option, dict):
            raise ValueError(f"card option {index} must be an object")
        option_id = str(option.get("id") or "")
        if not option_id:
            raise ValueError(f"card option {index} has no id")
        label = option.get("label")
        if label is not None:
            label = str(label)
        source_filename = media_filename(option.get("image_url"))
        rendered_filename = resolved_option_filename(
            source_filename,
            option_count=len(options),
            lesson_id=lesson_id,
            option_ids=option_ids,
        )
        normalized.append(
            {
                "id": option_id,
                "label": label,
                "source_filename": source_filename or None,
                "rendered_filename": rendered_filename or None,
                "is_correct": option_id == correct_option_id,
            }
        )
    return normalized


def card_media_usages(
    lesson: dict[str, Any], card: dict[str, Any]
) -> list[dict[str, Any]]:
    """Return every still-image use with its complete learner-facing card context."""

    options = normalized_option_contracts(lesson, card)
    common = {
        "context_type": "lesson_card",
        "lesson_id": str(lesson.get("id") or ""),
        "unit_id": _unit_id(lesson),
        "sub_lesson_id": str(lesson.get("sub_lesson_id") or ""),
        "stage": str(card.get("stage") or ""),
        "slide_id": None if card.get("slide_id") is None else str(card.get("slide_id")),
        "interaction_type": (
            None
            if card.get("interaction_type") is None
            else str(card.get("interaction_type"))
        ),
        "surface_label": None,
        "prompt": str(card.get("prompt") or ""),
        "audio_text": (
            None if card.get("audio_text") is None else str(card.get("audio_text"))
        ),
        "answer_audio_text": (
            None
            if card.get("answer_audio_text") is None
            else str(card.get("answer_audio_text"))
        ),
        "spanish_translation": (
            None
            if card.get("spanish_translation") is None
            else str(card.get("spanish_translation"))
        ),
        "correct_option_id": str(card.get("correct_option_id") or ""),
        "options": options,
    }
    usages: list[dict[str, Any]] = []

    prompt_source = media_filename(card.get("prompt_image_url"))
    if prompt_source:
        # Web and mobile route prompt stills through the same 3:2 resolver as
        # image options, so approval must bind those final pixels too.
        prompt_rendered = OPTION_MEDIA_VARIANTS.get(prompt_source, prompt_source)
        prompt_profile = (
            "lesson-speak-model-3x2-v1"
            if common["stage"] == "Speak"
            else "lesson-prompt-3x2-v1"
        )
        usages.append(
            {
                "source_filename": prompt_source,
                "rendered_filename": prompt_rendered,
                "context": {
                    **common,
                    "media_role": "prompt",
                    "option_id": None,
                    "option_label": None,
                    "is_correct": None,
                    "source_filename": prompt_source,
                    "rendered_filename": prompt_rendered,
                    "render_profile": prompt_profile,
                    "render_signature_sha256": render_profile_sha256(prompt_profile),
                    "viewport_width": None,
                    "viewport_height": None,
                    "resize_mode": "profile-bound",
                    "object_position": "profile-bound",
                },
            }
        )

    raw_options = card.get("options") or []
    for raw_option, option in zip(raw_options, options, strict=True):
        source_filename = option["source_filename"]
        if not source_filename:
            continue
        rendered_filename = option["rendered_filename"]
        if rendered_filename in TWO_CARD_ACTION_POSTERS.values():
            option_profile = "two-card-action-poster-3x2-v1"
        elif len(options) == 4:
            option_profile = "lesson-option-four-mobile-4x5-web-3x2-v1"
        else:
            option_profile = "lesson-option-1to3-3x2-v1"
        usages.append(
            {
                "source_filename": source_filename,
                "rendered_filename": rendered_filename,
                "context": {
                    **common,
                    "media_role": "option",
                    "option_id": option["id"],
                    "option_label": option["label"],
                    "is_correct": option["is_correct"],
                    "source_filename": source_filename,
                    "rendered_filename": rendered_filename,
                    "render_profile": option_profile,
                    "render_signature_sha256": render_profile_sha256(option_profile),
                    "viewport_width": None,
                    "viewport_height": None,
                    "resize_mode": "profile-bound",
                    "object_position": "profile-bound",
                },
            }
        )
    return usages


def _typescript_visual_entries(
    source: str, constant_name: str, id_pattern: str
) -> dict[str, dict[str, str]]:
    block = re.search(
        rf"const {re.escape(constant_name)}:[\s\S]*?\n}};",
        source,
    )
    if block is None:
        raise ValueError(f"CourseScreen must define {constant_name}")
    entry_pattern = re.compile(
        rf"'(?P<id>{id_pattern})':\s*{{\s*"
        r"image:\s*'(?P<image>[^']+)',\s*"
        r"description:\s*'(?P<description>[^']+)'",
    )
    entries = {
        match.group("id"): {
            "image": match.group("image"),
            "description": match.group("description"),
        }
        for match in entry_pattern.finditer(block.group(0))
    }
    if not entries:
        raise ValueError(f"CourseScreen {constant_name} has no reviewable entries")
    return entries


def course_browser_media_usages(
    lessons: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Inventory the 70 lesson and seven unit thumbnails shown by CourseScreen.

    The TypeScript constants are the runtime authority today. Parsing fails closed
    when the mapping stops being explicit, when a lesson or unit is missing, or
    when an unexpected extra mapping could otherwise escape semantic review.
    """

    course_screen = ROOT / "mobile" / "src" / "screens" / "CourseScreen.tsx"
    if not course_screen.is_file():
        raise ValueError("mobile CourseScreen is missing")
    source = course_screen.read_text(encoding="utf-8")
    lesson_entries = _typescript_visual_entries(
        source, "VISUALS", r"lesson-[^'\s]+"
    )
    unit_entries = _typescript_visual_entries(source, "UNIT_VISUALS", r"unit-\d+")

    lessons_by_id: dict[str, dict[str, Any]] = {}
    unit_lessons: dict[str, list[dict[str, Any]]] = {}
    for lesson in lessons:
        lesson_id = str(lesson.get("id") or "")
        unit_id = _unit_id(lesson)
        sub_lesson_id = str(lesson.get("sub_lesson_id") or "")
        if not lesson_id or not unit_id or not sub_lesson_id:
            raise ValueError("course-browser lesson metadata is incomplete")
        if lesson_id in lessons_by_id:
            raise ValueError(f"duplicate course-browser lesson id {lesson_id!r}")
        lessons_by_id[lesson_id] = lesson
        unit_lessons.setdefault(unit_id, []).append(lesson)

    expected_lesson_ids = set(lessons_by_id)
    expected_unit_ids = set(unit_lessons)
    if set(lesson_entries) != expected_lesson_ids:
        missing = sorted(expected_lesson_ids - set(lesson_entries))
        extra = sorted(set(lesson_entries) - expected_lesson_ids)
        raise ValueError(
            f"CourseScreen lesson thumbnail coverage differs from the course; "
            f"missing={missing}, extra={extra}"
        )
    if set(unit_entries) != expected_unit_ids:
        missing = sorted(expected_unit_ids - set(unit_entries))
        extra = sorted(set(unit_entries) - expected_unit_ids)
        raise ValueError(
            f"CourseScreen unit thumbnail coverage differs from the course; "
            f"missing={missing}, extra={extra}"
        )

    usages: list[dict[str, Any]] = []

    def append_usage(
        *,
        item_id: str,
        unit_id: str,
        sub_lesson_id: str,
        role: str,
        surface_label: str,
        entry: dict[str, str],
        render_profile: str,
        viewport_width: int,
        viewport_height: int,
    ) -> None:
        filename = media_filename(entry["image"])
        if not filename:
            raise ValueError(f"course-browser item {item_id!r} has no image")
        context = {
            "context_type": "course_browser",
            "lesson_id": item_id,
            "unit_id": unit_id,
            "sub_lesson_id": sub_lesson_id,
            "stage": "CourseBrowser",
            "slide_id": item_id,
            "interaction_type": role.replace("_", "-"),
            "media_role": role,
            "surface_label": surface_label,
            "option_id": None,
            "option_label": None,
            "is_correct": None,
            "source_filename": filename,
            "rendered_filename": filename,
            "prompt": entry["description"],
            "audio_text": None,
            "answer_audio_text": None,
            "spanish_translation": None,
            "correct_option_id": None,
            "options": [],
            "render_profile": render_profile,
            "render_signature_sha256": render_profile_sha256(render_profile),
            "viewport_width": viewport_width,
            "viewport_height": viewport_height,
            "resize_mode": "cover",
            "object_position": "center",
        }
        usages.append(
            {
                "source_filename": filename,
                "rendered_filename": filename,
                "context": validate_review_context(context),
            }
        )

    def lesson_sort_key(lesson: dict[str, Any]) -> tuple[int, int, str]:
        value = str(lesson.get("sub_lesson_id") or "")
        parts = value.split(".", 1)
        try:
            return int(parts[0]), int(parts[1]), value
        except (IndexError, ValueError):
            return 999, 999, value

    for lesson in sorted(lessons_by_id.values(), key=lesson_sort_key):
        lesson_id = str(lesson["id"])
        sub_lesson_id = str(lesson["sub_lesson_id"])
        title = str(
            lesson.get("sub_lesson_title")
            or lesson.get("title")
            or lesson_id
        )
        append_usage(
            item_id=lesson_id,
            unit_id=_unit_id(lesson),
            sub_lesson_id=sub_lesson_id,
            role="lesson_thumbnail",
            surface_label=f"{sub_lesson_id} {title}".strip(),
            entry=lesson_entries[lesson_id],
            render_profile="course-browser-lesson-row-v1",
            viewport_width=68,
            viewport_height=62,
        )
        append_usage(
            item_id=lesson_id,
            unit_id=_unit_id(lesson),
            sub_lesson_id=sub_lesson_id,
            role="continue_thumbnail",
            surface_label=f"{sub_lesson_id} {title}".strip(),
            entry=lesson_entries[lesson_id],
            render_profile="course-browser-continue-card-v1",
            viewport_width=94,
            viewport_height=88,
        )

    for unit_id in sorted(unit_lessons, key=lambda value: int(value.split("-")[-1])):
        first_lesson = sorted(unit_lessons[unit_id], key=lesson_sort_key)[0]
        unit_number = unit_id.split("-")[-1]
        unit_title = str(first_lesson.get("unit_title") or unit_id)
        append_usage(
            item_id=unit_id,
            unit_id=unit_id,
            sub_lesson_id=unit_number,
            role="unit_thumbnail",
            surface_label=unit_title,
            entry=unit_entries[unit_id],
            render_profile="course-browser-unit-card-v1",
            viewport_width=122,
            viewport_height=102,
        )

    if len(usages) != 147:
        raise ValueError(
            f"A1 course browser must expose exactly 147 reviewed thumbnail usages, "
            f"got {len(usages)}"
        )
    return usages


def validate_review_context(
    value: object,
    *,
    allow_stale_render_signature: bool = False,
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("review context must be an object")
    if set(value) != set(REVIEW_CONTEXT_FIELDS):
        raise ValueError(
            "review context fields must be exactly " + ", ".join(REVIEW_CONTEXT_FIELDS)
        )
    context_type = value["context_type"]
    if context_type not in {"lesson_card", "course_browser"}:
        raise ValueError(f"invalid review context type {context_type!r}")
    for field in ("lesson_id", "unit_id", "sub_lesson_id", "stage"):
        if not isinstance(value[field], str) or not value[field]:
            raise ValueError(f"review context {field} must be non-empty text")
    if not isinstance(value["prompt"], str):
        raise ValueError("review context prompt must be text")
    if value["media_role"] not in VALID_MEDIA_ROLES:
        raise ValueError(f"invalid media role {value['media_role']!r}")
    for field in (
        "slide_id",
        "interaction_type",
        "surface_label",
        "option_id",
        "option_label",
        "audio_text",
        "answer_audio_text",
        "spanish_translation",
        "correct_option_id",
    ):
        if value[field] is not None and not isinstance(value[field], str):
            raise ValueError(f"review context {field} must be text or null")

    render_profile = value["render_profile"]
    if not isinstance(render_profile, str) or not render_profile:
        raise ValueError("review context render_profile must be non-empty text")
    signature = value["render_signature_sha256"]
    if (
        not isinstance(signature, str)
        or len(signature) != 64
        or any(character not in "0123456789abcdef" for character in signature)
    ):
        raise ValueError("review context render_signature_sha256 must be lowercase SHA-256")
    if context_type == "course_browser":
        expected_profile = {
            "lesson_thumbnail": "course-browser-lesson-row-v1",
            "continue_thumbnail": "course-browser-continue-card-v1",
            "unit_thumbnail": "course-browser-unit-card-v1",
        }.get(value["media_role"])
    elif value["media_role"] == "prompt":
        expected_profile = (
            "lesson-speak-model-3x2-v1"
            if value["stage"] == "Speak"
            else "lesson-prompt-3x2-v1"
        )
    elif str(value["rendered_filename"]) in TWO_CARD_ACTION_POSTERS.values():
        expected_profile = "two-card-action-poster-3x2-v1"
    elif isinstance(value["options"], list) and len(value["options"]) == 4:
        expected_profile = "lesson-option-four-mobile-4x5-web-3x2-v1"
    else:
        expected_profile = "lesson-option-1to3-3x2-v1"
    if render_profile != expected_profile:
        raise ValueError(
            f"review context type {context_type!r} requires render profile "
            f"{expected_profile!r}, not {render_profile!r}"
        )
    expected_signature = render_profile_sha256(render_profile)
    if signature != expected_signature and not allow_stale_render_signature:
        raise ValueError(
            f"review context render signature is stale for {render_profile!r}"
        )

    viewport_width = value["viewport_width"]
    viewport_height = value["viewport_height"]
    resize_mode = value["resize_mode"]
    object_position = value["object_position"]
    if context_type == "lesson_card":
        if viewport_width is not None or viewport_height is not None:
            raise ValueError("responsive lesson-card viewport dimensions must be null")
        if resize_mode != "profile-bound" or object_position != "profile-bound":
            raise ValueError("lesson-card fit and focal position must be profile-bound")
    else:
        if (
            not isinstance(viewport_width, int)
            or isinstance(viewport_width, bool)
            or viewport_width <= 0
            or not isinstance(viewport_height, int)
            or isinstance(viewport_height, bool)
            or viewport_height <= 0
        ):
            raise ValueError("course-browser viewport must use positive integer dimensions")
        if resize_mode != "cover" or object_position != "center":
            raise ValueError("course-browser thumbnails must use centered cover rendering")

    media_role = value["media_role"]
    if context_type == "lesson_card" and media_role not in LESSON_CARD_ROLES:
        raise ValueError(f"lesson-card context cannot use media role {media_role!r}")
    if context_type == "course_browser" and media_role not in COURSE_BROWSER_ROLES:
        raise ValueError(f"course-browser context cannot use media role {media_role!r}")

    if media_role == "option":
        if not isinstance(value["option_id"], str) or not value["option_id"]:
            raise ValueError("option media context must have an option_id")
        if not isinstance(value["is_correct"], bool):
            raise ValueError("option media context must have boolean is_correct")
    elif media_role == "prompt" and (
        value["option_id"] is not None
        or value["option_label"] is not None
        or value["is_correct"] is not None
    ):
        raise ValueError("prompt media context cannot claim an option or correctness")
    elif media_role in COURSE_BROWSER_ROLES and (
        value["option_id"] is not None
        or value["option_label"] is not None
        or value["is_correct"] is not None
    ):
        raise ValueError("course-browser media cannot claim an option or correctness")
    for field in ("source_filename", "rendered_filename"):
        filename = value[field]
        if not isinstance(filename, str) or not filename or Path(filename).name != filename:
            raise ValueError(f"review context {field} must be a basename")
    raw_options = value["options"]
    raw_option_ids = {
        str(option.get("id") or "")
        for option in raw_options
        if isinstance(option, dict)
    } if isinstance(raw_options, list) else set()
    if context_type == "lesson_card" and media_role == "option":
        expected_rendered = resolved_option_filename(
            value["source_filename"],
            option_count=len(raw_options) if isinstance(raw_options, list) else 0,
            lesson_id=value["lesson_id"],
            option_ids=raw_option_ids,
        )
    elif context_type == "lesson_card":
        expected_rendered = OPTION_MEDIA_VARIANTS.get(
            value["source_filename"], value["source_filename"]
        )
    else:
        expected_rendered = value["source_filename"]
    if value["rendered_filename"] != expected_rendered:
        raise ValueError(
            f"review context source {value['source_filename']!r} resolves to "
            f"{expected_rendered!r}, not {value['rendered_filename']!r}"
        )

    options = value["options"]
    if not isinstance(options, list):
        raise ValueError("review context options must be a list")
    if context_type == "course_browser":
        if options:
            raise ValueError("course-browser context options must be empty")
        if value["correct_option_id"] is not None:
            raise ValueError("course-browser context cannot claim a correct option")
        if not isinstance(value["surface_label"], str) or not value["surface_label"]:
            raise ValueError("course-browser context must bind a visible surface label")
        if not value["prompt"]:
            raise ValueError("course-browser context must bind a semantic description")
        if not isinstance(value["slide_id"], str) or not value["slide_id"]:
            raise ValueError("course-browser context must bind its item id")
        expected_interaction = media_role.replace("_", "-")
        if value["interaction_type"] != expected_interaction:
            raise ValueError(
                f"course-browser role {media_role!r} requires interaction_type "
                f"{expected_interaction!r}"
            )
        for field in ("audio_text", "answer_audio_text", "spanish_translation"):
            if value[field] is not None:
                raise ValueError(f"course-browser context {field} must be null")
        return {field: value[field] for field in REVIEW_CONTEXT_FIELDS}

    if value["surface_label"] is not None:
        raise ValueError("lesson-card context surface_label must be null")
    if not isinstance(value["correct_option_id"], str) or not value["correct_option_id"]:
        raise ValueError("lesson-card context correct_option_id must be non-empty text")
    if not options:
        raise ValueError("lesson-card context options must be a non-empty list")
    correct_count = 0
    option_ids: set[str] = set()
    normalized_options: list[dict[str, Any]] = []
    for index, option in enumerate(options, 1):
        if not isinstance(option, dict) or set(option) != set(OPTION_CONTRACT_FIELDS):
            raise ValueError(f"review context option {index} has invalid fields")
        if not isinstance(option["id"], str) or not option["id"]:
            raise ValueError(f"review context option {index} has no id")
        if option["id"] in option_ids:
            raise ValueError(f"review context has duplicate option id {option['id']!r}")
        option_ids.add(option["id"])
        if option["label"] is not None and not isinstance(option["label"], str):
            raise ValueError(f"review context option {index} label must be text or null")
        source_filename = option["source_filename"]
        rendered_filename = option["rendered_filename"]
        if source_filename is None:
            if rendered_filename is not None:
                raise ValueError(
                    f"review context option {index} has a rendered file without a source"
                )
        else:
            if (
                not isinstance(source_filename, str)
                or not source_filename
                or Path(source_filename).name != source_filename
            ):
                raise ValueError(
                    f"review context option {index} source_filename is invalid"
                )
            expected_option_rendered = resolved_option_filename(
                source_filename,
                option_count=len(options),
                lesson_id=value["lesson_id"],
                option_ids=raw_option_ids,
            )
            if rendered_filename != expected_option_rendered:
                raise ValueError(
                    f"review context option {index} source {source_filename!r} resolves to "
                    f"{expected_option_rendered!r}, not {rendered_filename!r}"
                )
        if not isinstance(option["is_correct"], bool):
            raise ValueError(f"review context option {index} is_correct must be boolean")
        correct_count += int(option["is_correct"])
        normalized_options.append({field: option[field] for field in OPTION_CONTRACT_FIELDS})
    if correct_count != 1:
        raise ValueError("review context options must contain exactly one correct option")
    if not any(
        option["id"] == value["correct_option_id"] and option["is_correct"]
        for option in normalized_options
    ):
        raise ValueError("review context correct_option_id does not identify the correct option")
    if media_role == "option":
        selected = [
            option for option in normalized_options if option["id"] == value["option_id"]
        ]
        if len(selected) != 1:
            raise ValueError("review context option_id is absent from the full option set")
        expected_selected = selected[0]
        selected_fields = {
            "label": value["option_label"],
            "source_filename": value["source_filename"],
            "rendered_filename": value["rendered_filename"],
            "is_correct": value["is_correct"],
        }
        for field, actual in selected_fields.items():
            if expected_selected[field] != actual:
                raise ValueError(
                    f"review context selected option {field} contradicts the full option set"
                )

    return {
        field: normalized_options if field == "options" else value[field]
        for field in REVIEW_CONTEXT_FIELDS
    }
