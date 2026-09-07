import argparse
import json
import re
import struct
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
LESSON_ASSET_DIR = ROOT / "Lessons" / "Lesson1" / "images"
MOBILE_LESSON_ASSET_DIR = ROOT / "mobile" / "assets" / "lesson-assets"
FRONTEND_LESSON_ASSET_DIR = ROOT / "frontend" / "public" / "lesson-assets"
MOBILE_COURSE_PATH = ROOT / "mobile" / "src" / "generated" / "a1-course.json"
MOBILE_IMAGE_SOURCES_PATH = ROOT / "mobile" / "src" / "lessonImageSources.ts"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ROOT))

from app.data import LESSONS  # noqa: E402
from scripts.build_a1_media_semantic_review import (  # noqa: E402
    ASSET_HASH_ALGORITHM,
    CONTRACT_FIELDS,
    CONTRACT_HASH_ALGORITHM,
    MANIFEST_SCHEMA_VERSION,
    MANIFEST as A1_MEDIA_MANIFEST,
    REGISTRY as A1_MEDIA_SEMANTIC_APPROVALS,
    SCHEMA_VERSION as SEMANTIC_APPROVAL_SCHEMA_VERSION,
    semantic_contract,
    semantic_contract_sha256,
    sha256_file,
)
from scripts.a1_media_runtime_contracts import (  # noqa: E402
    REVIEW_CONTEXT_FIELDS,
    card_media_usages,
    course_browser_media_usages,
    render_profile_sha256,
)


SEMANTIC_ACTIONS = frozenset({
    "cooking",
    "drinking",
    "eating",
    "playing",
    "reading",
    "running",
    "sitting",
    "sleeping",
    "studying",
    "swimming",
    "talking",
    "working",
    "writing",
})
SEMANTIC_CONCEPT_TERMS = (
    ("grandchildren", "grandchild", "many"),
    ("grandchild", "grandchild", "one"),
    ("grandparents", "grandparent", "many"),
    ("grandfather", "grandfather", "one"),
    ("grandmother", "grandmother", "one"),
    ("parents", "parent", "many"),
    ("father", "father", "one"),
    ("mother", "mother", "one"),
    ("adults", "adult", "many"),
    ("adult", "adult", "one"),
    ("children", "child", "many"),
    ("child", "child", "one"),
    ("babies", "baby", "many"),
    ("baby", "baby", "one"),
    ("brothers", "brother", "many"),
    ("brother", "brother", "one"),
    ("sisters", "sister", "many"),
    ("sister", "sister", "one"),
    ("boys", "boy", "many"),
    ("boy", "boy", "one"),
    ("girls", "girl", "many"),
    ("girl", "girl", "one"),
    ("men", "man", "many"),
    ("man", "man", "one"),
    ("women", "woman", "many"),
    ("woman", "woman", "one"),
    ("family", "family", "many"),
)
SEMANTIC_CONCEPT_IMPLICATIONS = {
    "baby": {"child"},
    "boy": {"brother", "child"},
    "brother": {"boy", "child"},
    "father": {"adult", "man", "grandfather"},
    "girl": {"child", "sister"},
    "grandchild": {"child"},
    "grandfather": {"adult", "father", "man"},
    "grandmother": {"adult", "mother", "woman"},
    "grandparent": {"adult", "parent"},
    "man": {"adult"},
    "mother": {"adult", "grandmother", "woman"},
    "parent": {"adult", "grandparent"},
    "sister": {"child", "girl"},
    "woman": {"adult"},
}
SINGULAR_SEMANTIC_NOUNS = (
    "adult|baby|boy|brother|child|family|father|girl|grandchild|grandfather|grandmother|man|mother|sister|woman"
)
PLURAL_SEMANTIC_NOUNS = (
    "adults|babies|boys|brothers|children|girls|grandchildren|grandparents|men|parents|sisters|women"
)
SEMANTIC_ASSET_ACTION_ADDITIONS = {
    "grandparents_talking": {"sitting"},
    "mission_game_setup": {"playing"},
    "a1_u1_reunion_10_eat_drink": {"eating", "drinking"},
    "a1_u1_reunion_11_read_write": {"reading", "writing"},
    "a1_u1_reunion_12_run_swim": {"running", "swimming"},
    "a1_u1_reunion_13_sit_sleep": {"sitting", "sleeping"},
    "a1_u1_reunion_14_play_study": {"playing", "studying"},
    "a1_u1_reunion_15_work_cook_talk": {"working", "cooking", "talking"},
    "a1_u1_reunion_16_not_eating": {"drinking"},
    "a1_u1_reunion_17_not_reading": {"writing"},
    "a1_u1_reunion_18_not_running": {"sitting"},
}
# These are explicit facts of the authored Unit 1 scenes, not conclusions drawn
# from the absence of a word in a filename. Talking and sitting can coexist.
SEMANTIC_ASSET_NEGATIVE_ACTIONS = {
    "family_father_talking": {"cooking"},
    "girl_is_writing": {"reading"},
    "they_boy_girl_are_running": {"sitting"},
    "family_sister_playing": {"studying"},
    "grandparents_talking": {"sleeping"},
    "a1_u1_reunion_16_not_eating": {"eating"},
    "a1_u1_reunion_17_not_reading": {"reading"},
    "a1_u1_reunion_18_not_running": {"running"},
}
SEMANTIC_RELATED_GROUP_MARKERS = (
    "family_adults",
    "family_babies",
    "family_brothers",
    "family_children",
    "family_grandparents",
    "family_parents",
    "family_sisters",
    "review_children_running",
    "review_grandparents_talking",
    "mission_children_playing",
    "mission_grandparents_talking",
)


@dataclass(frozen=True)
class SemanticClause:
    count: str | None
    gender: str | None
    concepts: frozenset[str]
    negative_concepts: frozenset[str]
    positive_actions: frozenset[str]
    negative_actions: frozenset[str]
    contradictory: bool = False


@dataclass(frozen=True)
class VisualReferent:
    count: str
    gender: str | None
    concepts: frozenset[str]
    negative_concepts: frozenset[str]
    actions: frozenset[str]
    negative_actions: frozenset[str]


@dataclass(frozen=True)
class VisualMeaning:
    primary: VisualReferent
    visible_subsets: tuple[VisualReferent, ...] = ()
    allow_negative_visible_subsets: bool = False
GRAMMAR_STAGES = {"Grammar", "New Grammar"}
PRONUNCIATION_STAGES = {"Pronunciation Practice", "Speak"}
VISUAL_COMPLETION_PLACEHOLDER_PATTERN = re.compile(
    r"(?:_+|\[\s*(?:blank|pause)\s*\]|\{\s*blank\s*\}|\.{3,}|…)",
    flags=re.IGNORECASE,
)
NEGATIVE_VISUAL_CONTRACTS = {
    "they are not sitting.": {"they_boy_girl_are_running.webp"},
}
MISSION_COMPLETION_INTERACTIONS = {
    "mission-word-parts",
}
MAX_MISSION_CONSTRUCTION_TILES = 8
MIN_MISSION_TARGET_WIDTH = 0.12
MIN_MISSION_TARGET_HEIGHT = 0.16
MISSION_INTERACTIONS = frozenset({
    "mission-brief",
    "mission-clue",
    "mission-listen",
    "mission-speak",
    "mission-sentence",
    "mission-finale",
    *MISSION_COMPLETION_INTERACTIONS,
})
MISSION_INTERACTION_STAGES = {
    "mission-speak": "Speak",
    "mission-finale": "Speak",
}
UNIT_ONE_FOUNDATION_LESSON_IDS = (
    "lesson-1-people-actions",
    "lesson-2-pronouns",
    "lesson-3-two-people",
    "lesson-4-children-siblings",
    "lesson-5-parents-grandparents",
    "lesson-6-family-actions",
    "lesson-7-is-are-not",
    "lesson-8-who",
)
MISSION_CARD_COUNTS = {
    "lesson-10-family-mission": 22,
}
MISSION_REQUIRED_INTERACTIONS = {
    "lesson-10-family-mission": frozenset({
        "mission-clue",
        "mission-listen",
        "mission-speak",
        "mission-sentence",
        "mission-finale",
    }),
}
MISSION_HERO_PREFIXES = {
    "lesson-10-family-mission": "a1_u1_reunion_",
}
MISSION_REQUIRED_KINDS = {
    "lesson-10-family-mission": frozenset({
        "hotspot",
        "label-placement",
        "relationship-link",
        "action-sequence",
        "not-correction",
        "who-dialogue",
        "speak",
        "finale",
    }),
}
MISSION_KIND_SEQUENCE = {
    "lesson-10-family-mission": [
        "hotspot", "hotspot", "label-placement", "label-placement",
        "relationship-link", "relationship-link", "relationship-link",
        "relationship-link", "relationship-link",
        "action-sequence", "action-sequence", "action-sequence",
        "action-sequence", "action-sequence", "action-sequence",
        "not-correction", "not-correction", "not-correction",
        "who-dialogue", "speak", "who-dialogue", "finale",
    ],
}
MISSION_CHAPTER_SEQUENCE = {
    "lesson-10-family-mission": (
        ["find-the-people"] * 3
        + ["connect-the-family"] * 6
        + ["follow-the-actions"] * 6
        + ["repair-the-clues"] * 3
        + ["welcome-everyone"] * 4
    ),
}


def is_completion_interaction(interaction_type: str | None) -> bool:
    value = str(interaction_type or "")
    return interaction_type is None or value.startswith("complete") or value in MISSION_COMPLETION_INTERACTIONS


def _mission_language_tokens(text: str | None) -> set[str]:
    # A word-part target such as ``fa-ther`` represents the already-taught word
    # ``father``. Joining internal hyphens keeps it from inventing ``fa`` and
    # ``ther`` as vocabulary while ordinary sentence punctuation still vanishes.
    normalized = re.sub(r"(?<=[A-Za-z])-(?=[A-Za-z])", "", str(text or ""))
    return set(re.findall(r"[a-z]+", normalized.lower()))


def _correct_option(card: object) -> object | None:
    correct_id = str(getattr(card, "correct_option_id", "") or "")
    return next(
        (
            option
            for option in list(getattr(card, "options", []) or [])
            if str(getattr(option, "id", "") or "") == correct_id
        ),
        None,
    )


def _correct_options(card: object) -> list[object]:
    options = list(getattr(card, "options", []) or [])
    options_by_id = {
        str(getattr(option, "id", "") or ""): option
        for option in options
    }
    correct_ids = list(getattr(card, "correct_option_ids", []) or [])
    if not correct_ids:
        correct_ids = [str(getattr(card, "correct_option_id", "") or "")]
    return [options_by_id[option_id] for option_id in correct_ids if option_id in options_by_id]


def _mission_success_language(card: object) -> list[str]:
    """Return assessed English that appears on the successful mission path.

    Spanish UI directions and hidden pedagogy notes are deliberately excluded.
    Distractors are checked separately for unintroduced English but never earn
    mastery coverage.
    """

    interaction = str(getattr(card, "interaction_type", "") or "")
    correct_labels = [
        str(getattr(option, "label", "") or "")
        for option in _correct_options(card)
    ]
    prompt = str(getattr(card, "prompt", "") or "")
    audio_text = str(getattr(card, "audio_text", "") or "")
    answer_audio_text = str(getattr(card, "answer_audio_text", "") or "")
    mission_game = getattr(card, "mission_game", None)
    cue_audio_text = str(getattr(mission_game, "cue_audio_text", "") or "")

    values = [audio_text, answer_audio_text, cue_audio_text]
    prompt_is_target = (
        str(getattr(mission_game, "kind", "") or "") in {"speak", "finale"}
        or interaction == "mission-speak"
        or prompt == audio_text
        or prompt == answer_audio_text
        or re.match(r"^Who\s+(?:is|are)\b", prompt, flags=re.IGNORECASE)
    )
    if prompt_is_target:
        values.append(prompt)
    values.extend(correct_labels)
    return [value for value in values if value.strip()]


def _mission_authored_english(card: object) -> list[str]:
    """Return mission fields in which authored English may reach the learner."""

    interaction = str(getattr(card, "interaction_type", "") or "")
    values = _mission_success_language(card)
    if interaction not in {"mission-word-parts"}:
        values.extend(
            str(getattr(option, "label", "") or "")
            for option in list(getattr(card, "options", []) or [])
        )
    if interaction in MISSION_COMPLETION_INTERACTIONS:
        values.append(str(getattr(card, "prompt", "") or ""))
    return [value for value in values if value.strip()]


def _card_media_urls(card: object) -> list[str]:
    urls = [str(getattr(card, "prompt_image_url", "") or "")]
    urls.extend(
        str(getattr(option, "image_url", "") or "")
        for option in list(getattr(card, "options", []) or [])
    )
    for turn_field in ("audio_turns", "answer_audio_turns"):
        urls.extend(
            str(getattr(turn, "image_url", "") or "")
            for turn in list(getattr(card, turn_field, []) or [])
        )
    return [url for url in urls if url]


def _mission_hero_url(card: object) -> str:
    prompt_image = str(getattr(card, "prompt_image_url", "") or "")
    if prompt_image:
        return prompt_image
    correct = _correct_option(card)
    return str(getattr(correct, "image_url", "") or "") if correct else ""


def _sub_lesson_sequence_key(sub_lesson_id: object) -> tuple[int, ...]:
    """Compare dotted lesson numbers component-wise (`1.10` follows `1.9`)."""

    parts = str(sub_lesson_id or "").split(".")
    if not parts or any(not part.isdigit() for part in parts):
        return ()
    return tuple(int(part) for part in parts)


def validate_mission_contracts(lessons=None) -> list[str]:
    """Fail closed on the continuous mission contract and Unit 1 mastery scope."""

    errors: list[str] = []
    lesson_catalog = LESSONS if lessons is None else lessons
    for required_id in MISSION_CARD_COUNTS:
        lesson = lesson_catalog.get(required_id)
        if lesson is None:
            errors.append(f"Required mission lesson {required_id!r} is missing.")
        elif getattr(lesson, "experience_type", None) != "mission":
            errors.append(
                f"{required_id} must declare experience_type='mission'; lesson-ID-only "
                "mission behavior is not allowed."
            )

    mission_lessons = [
        lesson
        for lesson in lesson_catalog.values()
        if getattr(lesson, "experience_type", None) == "mission"
    ]
    for lesson in mission_lessons:
        expected_count = MISSION_CARD_COUNTS.get(lesson.id)
        if expected_count is not None and len(lesson.cards) != expected_count:
            errors.append(
                f"{lesson.id} must contain exactly {expected_count} mission beats; "
                f"found {len(lesson.cards)}."
            )
        if not isinstance(getattr(lesson, "content_revision", None), int) or lesson.content_revision < 1:
            errors.append(f"{lesson.id} must declare a positive content_revision.")

        mission = getattr(lesson, "mission", None)
        chapters = list(getattr(mission, "chapters", []) or [])
        chapter_ids = [str(getattr(chapter, "id", "") or "") for chapter in chapters]
        if not chapters or any(not chapter_id for chapter_id in chapter_ids):
            errors.append(f"{lesson.id} must declare at least one nonempty mission chapter.")
        if len(chapter_ids) != len(set(chapter_ids)):
            errors.append(f"{lesson.id} mission chapter IDs must be unique.")
        for field in (
            "label",
            "title",
            "briefing",
            "kickoff_image_url",
            "completion_title",
            "completion_message",
        ):
            if not str(getattr(mission, field, "") or "").strip():
                errors.append(f"{lesson.id} mission presentation is missing {field!r}.")
        objectives = [
            str(value or "")
            for value in list(getattr(mission, "objectives", []) or [])
        ]
        if not objectives or any(not value.strip() for value in objectives):
            errors.append(f"{lesson.id} mission presentation requires visible objectives.")
        if len(objectives) != len(set(objectives)):
            errors.append(f"{lesson.id} mission objectives must be unique.")

        card_chapters = [
            str(getattr(card, "mission_chapter_id", "") or "")
            for card in lesson.cards
        ]
        encountered_chapters: list[str] = []
        for chapter_id in card_chapters:
            if not encountered_chapters or encountered_chapters[-1] != chapter_id:
                encountered_chapters.append(chapter_id)
        if card_chapters and encountered_chapters != chapter_ids:
            errors.append(
                f"{lesson.id} cards must visit declared chapters once in order; "
                f"declared {chapter_ids}, encountered {encountered_chapters}."
            )
        expected_chapters = MISSION_CHAPTER_SEQUENCE.get(lesson.id)
        if expected_chapters is not None and card_chapters != list(expected_chapters):
            errors.append(
                f"{lesson.id} must preserve the approved five-act beat map; "
                f"found {card_chapters}."
            )

        expected_slide_ids = [
            f"M{index:02d}" for index in range(1, len(lesson.cards) + 1)
        ]
        actual_slide_ids = [str(card.slide_id or "") for card in lesson.cards]
        if actual_slide_ids != expected_slide_ids:
            errors.append(
                f"{lesson.id} mission beat IDs must be contiguous M01.."
                f"M{len(lesson.cards):02d}; found {actual_slide_ids}."
            )
        for index, card in enumerate(lesson.cards, 1):
            expected_note = rf"^Mission beat {index:02d}/{len(lesson.cards):02d}:"
            if not re.match(expected_note, str(card.pedagogy_note or "")):
                errors.append(
                    f"{lesson.id} {card.slide_id or f'card {index}'} must declare "
                    f"Mission beat {index:02d}/{len(lesson.cards):02d} in its pedagogy note."
                )

        mission_kinds: list[str] = []
        for index, card in enumerate(lesson.cards, 1):
            location = f"{lesson.id} {card.slide_id or f'card {index}'}"
            game = getattr(card, "mission_game", None)
            if game is None:
                errors.append(f"{location} must declare validated mission_game metadata.")
                continue
            kind = str(getattr(game, "kind", "") or "")
            mission_kinds.append(kind)
            instruction = str(getattr(game, "instruction_es", "") or "")
            validation = str(getattr(game, "validation", "") or "")
            targets = list(getattr(game, "targets", []) or [])
            if not instruction.strip():
                errors.append(f"{location} mission_game requires an exact Spanish instruction.")
            if validation not in {"single", "ordered", "unordered"}:
                errors.append(f"{location} has unsupported mission validation {validation!r}.")
            if not targets:
                errors.append(f"{location} mission_game requires at least one target.")
                continue
            target_ids = [str(getattr(target, "id", "") or "") for target in targets]
            if any(not target_id for target_id in target_ids) or len(target_ids) != len(set(target_ids)):
                errors.append(f"{location} mission target IDs must be nonempty and unique.")

            option_ids = {
                str(getattr(option, "id", "") or "")
                for option in list(getattr(card, "options", []) or [])
            }
            accepted_ids: list[str] = []
            for target in targets:
                accepted = [
                    str(value or "")
                    for value in list(getattr(target, "accepted_option_ids", []) or [])
                ]
                accepted_ids.extend(accepted)
                missing = sorted(set(accepted) - option_ids)
                if not accepted or any(not value for value in accepted):
                    errors.append(
                        f"{location} target {getattr(target, 'id', '')!r} needs accepted option IDs."
                    )
                if missing:
                    errors.append(
                        f"{location} target {getattr(target, 'id', '')!r} references "
                        f"missing options {missing}."
                    )
                rect = getattr(target, "rect", None)
                x = float(getattr(rect, "x", -1))
                y = float(getattr(rect, "y", -1))
                width = float(getattr(rect, "width", 0))
                height = float(getattr(rect, "height", 0))
                if x < 0 or y < 0 or x + width > 1 or y + height > 1:
                    errors.append(
                        f"{location} target {getattr(target, 'id', '')!r} leaves its normalized image bounds."
                    )
                if width < MIN_MISSION_TARGET_WIDTH or height < MIN_MISSION_TARGET_HEIGHT:
                    errors.append(
                        f"{location} target {getattr(target, 'id', '')!r} is too small for the "
                        "responsive mission hit-area contract."
                    )
            if len(accepted_ids) != len(set(accepted_ids)):
                errors.append(f"{location} reuses one answer across multiple mission targets.")
            expected_ids = list(getattr(card, "correct_option_ids", []) or [])
            if not expected_ids:
                expected_ids = [str(getattr(card, "correct_option_id", "") or "")]
            answers_match = (
                accepted_ids == expected_ids
                if validation == "ordered"
                else set(accepted_ids) == set(expected_ids)
            )
            if not answers_match:
                errors.append(
                    f"{location} mission targets do not match its declared correct answers."
                )
            if validation == "single" and len(targets) != 1:
                errors.append(f"{location} single validation requires exactly one target.")
            if validation == "ordered" and len(targets) < 2:
                errors.append(f"{location} ordered validation requires multiple targets.")

        required_kinds = MISSION_REQUIRED_KINDS.get(lesson.id, frozenset())
        missing_kinds = sorted(required_kinds - set(mission_kinds))
        if missing_kinds:
            errors.append(f"{lesson.id} is missing mission game kinds: {missing_kinds}.")
        expected_kinds = MISSION_KIND_SEQUENCE.get(lesson.id)
        if expected_kinds is not None and mission_kinds != expected_kinds:
            errors.append(
                f"{lesson.id} mission game kinds must follow the approved 22-beat flow; "
                f"found {mission_kinds}."
            )

        interactions = [str(card.interaction_type or "") for card in lesson.cards]
        unknown_interactions = sorted(set(interactions) - MISSION_INTERACTIONS)
        required_interactions = MISSION_REQUIRED_INTERACTIONS.get(lesson.id, frozenset())
        missing_interactions = sorted(required_interactions - set(interactions))
        if unknown_interactions:
            errors.append(
                f"{lesson.id} has unsupported mission interactions: {unknown_interactions}."
            )
        if missing_interactions:
            errors.append(
                f"{lesson.id} is missing required mission interactions: {missing_interactions}."
            )
        if interactions and interactions[-1] != "mission-finale":
            errors.append(f"{lesson.id} must end with a mission-finale beat.")
        if any(card.stage not in {"Learn", "Recognize", "Listen", "Speak", "Use"} for card in lesson.cards):
            errors.append(
                f"{lesson.id} may interleave only the established internal modality stages."
            )
        stage_mismatches = [
            f"{card.slide_id}:{card.interaction_type}/{card.stage}"
            for card in lesson.cards
            if str(card.interaction_type or "") in MISSION_INTERACTION_STAGES
            and MISSION_INTERACTION_STAGES[str(card.interaction_type or "")] != card.stage
        ]
        if stage_mismatches:
            errors.append(
                f"{lesson.id} mission interactions must retain their internal modality stage: "
                f"{stage_mismatches}."
            )

        all_mission_media = {
            _asset_name(url)
            for card in lesson.cards
            for url in _card_media_urls(card)
        }
        earlier_media = {
            _asset_name(url)
            for earlier in lesson_catalog.values()
            if earlier.unit_id == lesson.unit_id and earlier.id != lesson.id
            and _sub_lesson_sequence_key(earlier.sub_lesson_id)
            < _sub_lesson_sequence_key(lesson.sub_lesson_id)
            for card in earlier.cards
            for url in _card_media_urls(card)
        }
        overlap = sorted(all_mission_media & earlier_media)
        if overlap:
            errors.append(
                f"{lesson.id} reuses earlier lesson media instead of mission-only assets: {overlap}."
            )

        heroes = [_asset_name(_mission_hero_url(card)) for card in lesson.cards]
        missing_hero_beats = [
            card.slide_id or f"card {index}"
            for index, (card, hero) in enumerate(zip(lesson.cards, heroes), 1)
            if not hero
        ]
        if missing_hero_beats:
            errors.append(
                f"{lesson.id} mission beats without a primary/correct hero still: "
                f"{missing_hero_beats}."
            )
        duplicate_heroes = sorted(
            hero for hero, count in Counter(heroes).items() if hero and count > 1
        )
        if duplicate_heroes:
            errors.append(
                f"{lesson.id} repeats assessed hero stills across beats: {duplicate_heroes}."
            )
        expected_hero_prefix = MISSION_HERO_PREFIXES.get(lesson.id)
        invalid_hero_names = sorted(
            hero
            for hero in heroes
            if hero and expected_hero_prefix and not hero.startswith(expected_hero_prefix)
        )
        if invalid_hero_names:
            errors.append(
                f"{lesson.id} hero stills must use the mission-only "
                f"{expected_hero_prefix} namespace: "
                f"{invalid_hero_names}."
            )
        if lesson.id == "lesson-10-family-mission":
            incorrectly_ordered_heroes = [
                hero
                for index, hero in enumerate(heroes, 1)
                if hero and not re.fullmatch(
                    rf"a1_u1_reunion_{index:02d}_[a-z0-9_]+\.webp",
                    hero,
                )
            ]
            if incorrectly_ordered_heroes:
                errors.append(
                    f"{lesson.id} hero filenames must carry their ordered two-digit beat "
                    f"prefix: {incorrectly_ordered_heroes}."
                )

            kickoff_name = _asset_name(str(getattr(mission, "kickoff_image_url", "") or ""))
            if kickoff_name != "a1_u1_reunion_kickoff.webp":
                errors.append(
                    f"{lesson.id} must use the dedicated a1_u1_reunion_kickoff.webp onboarding still."
                )

            # Filename uniqueness is insufficient: copied bytes would still make a
            # supposedly new challenge feel repeated. The canonical validation run
            # compares every reunion still against every other checked-in A1 still.
            if lessons is None:
                missing_files = [
                    name
                    for name in [kickoff_name, *heroes]
                    if name and not (LESSON_ASSET_DIR / name).is_file()
                ]
                if missing_files:
                    errors.append(
                        f"{lesson.id} is missing reunion image files: {sorted(missing_files)}."
                    )
                else:
                    reunion_names = {kickoff_name, *heroes}
                    reunion_hashes = {
                        name: sha256_file(LESSON_ASSET_DIR / name)
                        for name in reunion_names
                    }
                    duplicate_reunion_hashes = sorted(
                        name
                        for name, digest in reunion_hashes.items()
                        if sum(value == digest for value in reunion_hashes.values()) > 1
                    )
                    if duplicate_reunion_hashes:
                        errors.append(
                            f"{lesson.id} reuses exact image bytes within the mission: "
                            f"{duplicate_reunion_hashes}."
                        )
                    prior_hashes: dict[str, list[str]] = {}
                    for path in LESSON_ASSET_DIR.glob("*.webp"):
                        if path.name in reunion_names:
                            continue
                        prior_hashes.setdefault(sha256_file(path), []).append(path.name)
                    reused_bytes = {
                        name: sorted(prior_hashes[digest])
                        for name, digest in reunion_hashes.items()
                        if digest in prior_hashes
                    }
                    if reused_bytes:
                        errors.append(
                            f"{lesson.id} reunion images reuse exact bytes from existing course "
                            f"or rejected mission assets: {reused_bytes}."
                        )

        if lesson.id != "lesson-10-family-mission":
            continue
        if lesson.content_revision != 3:
            errors.append(
                f"{lesson.id} celebration adventure must declare content_revision 3."
            )
        if str(getattr(mission, "title", "") or "") != "¡Todos a la celebración!":
            errors.append(
                f"{lesson.id} must expose the approved ¡Todos a la celebración! title."
            )
        if objectives != [
            "Encuentra personas",
            "Sigue sus acciones",
            "Reúne a la familia",
        ]:
            errors.append(
                f"{lesson.id} must present the three approved kickoff objectives in order."
            )
        tutorial_modes = [
            str(getattr(getattr(card, "mission_game", None), "tutorial_mode", "") or "")
            for card in lesson.cards
        ]
        if tutorial_modes != ["guided-no-fail", *("" for _ in range(21))]:
            errors.append(
                f"{lesson.id} must use one guided-no-fail tutorial on M01 only."
            )
        rejected_terms = re.compile(r"\b(?:album|álbum|studio|estudio|film|película)\b", re.I)
        rejected_copy = [
            value
            for value in [
                str(getattr(mission, "title", "") or ""),
                str(getattr(mission, "briefing", "") or ""),
                str(getattr(mission, "completion_title", "") or ""),
                str(getattr(mission, "completion_message", "") or ""),
                *(str(getattr(card, "pedagogy_note", "") or "") for card in lesson.cards),
            ]
            if rejected_terms.search(value)
        ]
        if rejected_copy:
            errors.append(
                f"{lesson.id} reintroduces rejected album/studio mission language."
            )
        introduced_order = [
            str(word).strip().lower()
            for source_id in UNIT_ONE_FOUNDATION_LESSON_IDS
            for word in lesson_catalog[source_id].vocabulary
        ]
        introduced = set(introduced_order)
        if len(introduced_order) != 46 or len(introduced) != 46:
            errors.append(
                "Unit 1 Lessons 1.1-1.8 must declare exactly 46 unique vocabulary "
                "targets before the final mission."
            )
        review_targets = [str(word).strip().lower() for word in lesson.review_vocabulary]
        if len(review_targets) != len(set(review_targets)) or set(review_targets) != introduced:
            errors.append(
                f"{lesson.id} review_vocabulary must be the exact 46-item union from "
                "Lessons 1.1-1.8."
            )

        successful_tokens: set[str] = set()
        authored_tokens: set[str] = set()
        for card in lesson.cards:
            for value in _mission_success_language(card):
                successful_tokens.update(_mission_language_tokens(value))
            for value in _mission_authored_english(card):
                authored_tokens.update(_mission_language_tokens(value))
        missing_gold = sorted(introduced - successful_tokens)
        if missing_gold:
            errors.append(
                f"{lesson.id} does not retrieve these Unit 1 targets on the successful "
                f"path: {missing_gold}."
            )
        unintroduced = sorted(authored_tokens - introduced)
        if unintroduced:
            errors.append(
                f"{lesson.id} contains unintroduced assessed/distractor English: {unintroduced}."
            )
        question_text = " ".join(
            value
            for card in lesson.cards
            for value in _mission_success_language(card)
        ).lower()
        for question in ("who is he", "who is she", "who are they"):
            if question not in re.sub(r"[^a-z]+", " ", question_text):
                errors.append(f"{lesson.id} must assess the question form {question!r}.")
    return errors


def _expanded_visual_concepts(concepts: set[str]) -> frozenset[str]:
    expanded = set(concepts)
    pending = list(concepts)
    while pending:
        concept = pending.pop()
        for implied in SEMANTIC_CONCEPT_IMPLICATIONS.get(concept, set()):
            if implied not in expanded:
                expanded.add(implied)
                pending.append(implied)
    return frozenset(expanded)


def _visual_referent(
    count: str,
    concepts: set[str],
    actions: set[str],
    gender: str | None = None,
    negative_concepts: set[str] | None = None,
    negative_actions: set[str] | None = None,
    expand_concepts: bool = True,
) -> VisualReferent:
    return VisualReferent(
        count=count,
        gender=gender,
        concepts=_expanded_visual_concepts(concepts) if expand_concepts else frozenset(concepts),
        negative_concepts=frozenset(negative_concepts or set()),
        actions=frozenset(actions),
        negative_actions=frozenset(negative_actions or set()),
    )


def _asset_name(media_url: str | None) -> str:
    return str(media_url or "").split("?", 1)[0].replace("\\", "/").rsplit("/", 1)[-1].lower()


def _visual_meaning(media_url: str | None) -> VisualMeaning | None:
    """Return conservative Unit 1 facts for the exact bound visual asset.

    The primary referent describes the whole answer tile. Visible subsets also
    expose true shorter labels and same-cardinality category overlaps, but a
    person inside a plural image tile cannot satisfy a singular spoken target.
    This is contract validation, not pixel-level evidence; the hash-bound human
    semantic review remains authoritative for the actual rendered image.

    Generation roles intentionally overlap here. An isolated father portrait
    cannot prove that he is not also a grandfather, for example, so role pairs
    are expanded as possible ordinary interpretations. Authored choices must use
    a genuinely exclusive gender, number, category, or action contrast.
    """

    asset_name = _asset_name(media_url)
    if not asset_name:
        return None
    stem = asset_name.rsplit(".", 1)[0]
    # Units 2-7 use rich generated scene contracts (objects, colors, food,
    # quantities, places, and more) that this Unit 1 people/action model cannot
    # safely reduce. Their hash-bound semantic-review gate remains authoritative.
    if stem.startswith("a1_scene_"):
        return None
    tokens = set(re.split(r"[^a-z]+", stem))
    actions = {action for action in SEMANTIC_ACTIONS if action in tokens}
    for marker, additional_actions in SEMANTIC_ASSET_ACTION_ADDITIONS.items():
        if marker in stem:
            actions.update(additional_actions)
    negative_actions: set[str] = set()
    for marker, excluded_actions in SEMANTIC_ASSET_NEGATIVE_ACTIONS.items():
        if marker in stem:
            negative_actions.update(excluded_actions)
    related_group_concepts = (
        {"family"}
        if any(marker in stem for marker in SEMANTIC_RELATED_GROUP_MARKERS)
        else set()
    )

    def primary_referent(
        count: str,
        concepts: set[str],
        gender: str | None = None,
        *,
        expand_concepts: bool = True,
    ) -> VisualReferent:
        return _visual_referent(
            count,
            concepts,
            actions,
            gender,
            negative_actions=negative_actions,
            expand_concepts=expand_concepts,
        )

    # The Unit 1 final mission uses storyboard/contact-sheet heroes whose exact
    # filename is bound to a reviewed set of visible panels. Model each panel
    # explicitly so a composite cannot bypass the one-valid-answer gate merely
    # because its filename contains several people or actions.
    if "a1_u1_album_01_locked" in stem:
        return VisualMeaning(
            primary=_visual_referent("many", {"family"}, set()),
        )

    if "a1_u1_album_02_people_board" in stem or "a1_u1_album_03_pronoun_cast" in stem:
        return VisualMeaning(
            primary=_visual_referent("one", {"boy"}, set(), "male"),
            visible_subsets=(
                _visual_referent("one", {"girl"}, set(), "female"),
                _visual_referent("one", {"man"}, set(), "male"),
                _visual_referent("one", {"woman"}, set(), "female"),
            ),
        )

    if "a1_u1_album_04_family_index" in stem:
        return VisualMeaning(
            primary=_visual_referent("one", {"baby"}, set()),
            visible_subsets=(
                _visual_referent("many", {"baby"}, set()),
                _visual_referent("one", {"child"}, set()),
                _visual_referent("many", {"child"}, set()),
                _visual_referent("one", {"brother"}, set(), "male"),
                _visual_referent("many", {"brother"}, set(), "male"),
                _visual_referent("one", {"sister"}, set(), "female"),
                _visual_referent("many", {"sister"}, set(), "female"),
            ),
        )

    if "a1_u1_album_05_adult_count" in stem:
        return VisualMeaning(
            primary=_visual_referent("one", {"adult"}, set()),
            visible_subsets=(
                _visual_referent("many", {"adult"}, set()),
            ),
        )

    if "a1_u1_album_07_grandparents_branch" in stem:
        return VisualMeaning(
            primary=_visual_referent("one", {"grandfather"}, set(), "male"),
            visible_subsets=(
                _visual_referent("one", {"grandmother"}, set(), "female"),
                _visual_referent("many", {"grandparent"}, set()),
                _visual_referent("many", {"grandchild"}, set()),
            ),
        )

    if "a1_u1_album_08_tree_complete" in stem:
        return VisualMeaning(
            primary=_visual_referent(
                "many",
                {"family", "grandchild", "grandparent"},
                set(),
                expand_concepts=False,
            ),
            visible_subsets=(
                _visual_referent("many", {"grandparent"}, set()),
                _visual_referent("many", {"grandchild"}, set()),
            ),
        )

    if "a1_u1_album_16_siblings_running_mother_sitting" in stem:
        return VisualMeaning(
            primary=_visual_referent(
                "many", {"brother", "sister"}, {"running"}, expand_concepts=False,
            ),
            visible_subsets=(
                _visual_referent("one", {"brother"}, {"running"}, "male"),
                _visual_referent("one", {"sister"}, {"running"}, "female"),
                _visual_referent("one", {"mother"}, {"sitting"}, "female"),
            ),
        )

    if "a1_u1_album_17_sisters_swimming_grandfather_sleeping" in stem:
        return VisualMeaning(
            primary=_visual_referent("many", {"sister"}, {"swimming"}, "female"),
            visible_subsets=(
                _visual_referent("one", {"grandfather"}, {"sleeping"}, "male"),
            ),
        )

    if "a1_u1_album_18_children_playing_sister_studying" in stem:
        return VisualMeaning(
            primary=_visual_referent("many", {"child"}, {"playing"}),
            visible_subsets=(
                _visual_referent("one", {"sister"}, {"studying"}, "female"),
            ),
        )

    if "a1_u1_album_19_family_work_cook_talk" in stem:
        return VisualMeaning(
            primary=_visual_referent("many", {"parent"}, {"working"}),
            visible_subsets=(
                _visual_referent("one", {"grandmother"}, {"cooking"}, "female"),
                _visual_referent("many", {"brother"}, {"talking"}, "male"),
            ),
        )

    if "a1_u1_album_20_negative_contact_sheet" in stem:
        return VisualMeaning(
            primary=_visual_referent(
                "one", set(), {"running"}, "male", negative_actions={"sitting"},
            ),
            visible_subsets=(
                _visual_referent(
                    "one", set(), {"cooking"}, "female", negative_actions={"sleeping"},
                ),
                _visual_referent(
                    "many", set(), {"swimming"}, negative_actions={"sitting"},
                ),
            ),
            allow_negative_visible_subsets=True,
        )

    if "a1_u1_album_21_voiceover_booth" in stem:
        return VisualMeaning(
            primary=_visual_referent("many", {"grandparent"}, set()),
        )

    if "a1_u1_album_22_final_portrait" in stem:
        return VisualMeaning(
            primary=_visual_referent("many", {"family"}, set()),
        )

    if "family_grandparents_grandchildren" in stem:
        return VisualMeaning(
            primary=primary_referent(
                "many",
                {"family", "grandchild", "grandparent"},
                expand_concepts=False,
            ),
            visible_subsets=(
                _visual_referent("many", {"grandparent"}, actions),
                _visual_referent("many", {"grandchild"}, actions),
                _visual_referent("one", {"grandfather"}, actions, "male"),
                _visual_referent("one", {"grandmother"}, actions, "female"),
                _visual_referent("one", {"grandchild"}, actions),
            ),
        )

    if "family_parents_children" in stem:
        return VisualMeaning(
            primary=primary_referent(
                "many",
                {"child", "family", "parent"},
                expand_concepts=False,
            ),
            visible_subsets=(
                _visual_referent("many", {"parent"}, actions),
                _visual_referent("many", {"child"}, actions),
                _visual_referent("one", {"father"}, actions, "male"),
                _visual_referent("one", {"mother"}, actions, "female"),
                _visual_referent("one", {"child"}, actions),
            ),
        )

    if "review_children_running" in stem:
        return VisualMeaning(
            primary=primary_referent(
                "many",
                {"boy", "child", "family", "girl"},
                expand_concepts=False,
            ),
            visible_subsets=(
                _visual_referent("one", {"boy"}, actions, "male"),
                _visual_referent("one", {"girl"}, actions, "female"),
            ),
        )

    if "mission_game_setup" in stem:
        return VisualMeaning(
            primary=primary_referent(
                "many",
                {"family", "father", "mother", "parent"},
                expand_concepts=False,
            ),
            visible_subsets=(
                _visual_referent("one", {"father"}, actions, "male"),
                _visual_referent("one", {"mother"}, actions, "female"),
            ),
        )

    full_family_markers = (
        "family_all_members",
        "review_family_story",
        "mission_family_start",
        "mission_family_finish",
    )
    if any(marker in stem for marker in full_family_markers):
        primary = primary_referent(
            "many",
            {"child", "family", "parent"},
            expand_concepts=False,
        )
        visible = (
            _visual_referent("one", {"father"}, actions, "male"),
            _visual_referent("one", {"mother"}, actions, "female"),
            _visual_referent("one", {"grandfather"}, actions, "male"),
            _visual_referent("one", {"grandmother"}, actions, "female"),
            _visual_referent("one", {"adult"}, actions),
            _visual_referent("many", {"adult"}, actions),
            _visual_referent("many", {"child"}, actions),
            _visual_referent("many", {"parent"}, actions),
            _visual_referent("many", {"grandparent"}, actions),
            _visual_referent("many", {"grandchild"}, actions),
            _visual_referent(
                "many",
                {"family", "grandchild", "grandparent"},
                actions,
                expand_concepts=False,
            ),
        )
        return VisualMeaning(primary=primary, visible_subsets=visible)

    if "grandparents" in tokens:
        primary = primary_referent("many", {"grandparent"} | related_group_concepts)
        return VisualMeaning(
            primary=primary,
            visible_subsets=(
                _visual_referent("one", {"grandfather"}, actions, "male"),
                _visual_referent("one", {"grandmother"}, actions, "female"),
                _visual_referent("one", {"adult"}, actions),
            ),
        )
    if "parents" in tokens:
        primary = primary_referent("many", {"parent"} | related_group_concepts)
        return VisualMeaning(
            primary=primary,
            visible_subsets=(
                _visual_referent("one", {"father"}, actions, "male"),
                _visual_referent("one", {"mother"}, actions, "female"),
                _visual_referent("one", {"adult"}, actions),
            ),
        )
    if "adults" in tokens:
        return VisualMeaning(
            primary=primary_referent("many", {"adult"} | related_group_concepts),
        )
    if "children" in tokens:
        return VisualMeaning(
            primary=primary_referent("many", {"child"} | related_group_concepts),
        )
    if "brothers" in tokens:
        return VisualMeaning(
            primary=primary_referent("many", {"brother"} | related_group_concepts, "male"),
        )
    if "sisters" in tokens:
        return VisualMeaning(
            primary=primary_referent("many", {"sister"} | related_group_concepts, "female"),
        )
    if "babies" in tokens:
        return VisualMeaning(
            primary=primary_referent("many", {"baby"} | related_group_concepts),
        )
    group_people = {
        concept
        for concept in ("boy", "girl", "man", "woman")
        if concept in tokens
    }
    if len(group_people) >= 2 or ("they" in tokens and group_people):
        shared_group_concepts: set[str] = set()
        if group_people <= {"boy", "girl"}:
            shared_group_concepts.add("child")
        if group_people <= {"man", "woman"}:
            shared_group_concepts.add("adult")
        visible_subsets = tuple(
            _visual_referent(
                "one",
                {concept},
                actions,
                "male" if concept in {"boy", "man"} else "female",
            )
            for concept in sorted(group_people)
        )
        return VisualMeaning(
            primary=primary_referent(
                "many",
                group_people | shared_group_concepts,
                expand_concepts=False,
            ),
            visible_subsets=visible_subsets,
        )

    singular_concepts = (
        ("grandfather", "grandfather", "male"),
        ("grandmother", "grandmother", "female"),
        ("father", "father", "male"),
        ("mother", "mother", "female"),
        ("brother", "brother", "male"),
        ("sister", "sister", "female"),
        ("baby", "baby", None),
        ("boy", "boy", "male"),
        ("girl", "girl", "female"),
        ("woman", "woman", "female"),
        ("man", "man", "male"),
        ("adult", "adult", None),
        ("child", "child", None),
    )
    for token, concept, gender in singular_concepts:
        if token in tokens:
            return VisualMeaning(
                primary=primary_referent("one", {concept}, gender),
            )

    if "family" in tokens:
        return VisualMeaning(
            primary=primary_referent("many", {"family"}),
        )
    return None


def _semantic_clauses(text: str | None) -> tuple[SemanticClause, ...]:
    clauses: list[SemanticClause] = []
    for raw_clause in re.split(r"[.!?/]+", str(text or "")):
        clause = re.sub(r"\s+", " ", raw_clause.strip().lower())
        if not clause or clause.startswith("who "):
            continue

        concepts: set[str] = set()
        negative_concepts: set[str] = set()
        term_counts: set[str] = set()
        for term, concept, count in SEMANTIC_CONCEPT_TERMS:
            if re.search(rf"\b{re.escape(term)}\b", clause):
                if re.search(
                    rf"\bnot\s+(?:(?:a|an|the)\s+)?{re.escape(term)}\b",
                    clause,
                ):
                    negative_concepts.add(concept)
                else:
                    concepts.add(concept)
                term_counts.add(count)

        negative_actions = {
            action
            for action in SEMANTIC_ACTIONS
            if re.search(rf"\bnot\s+{re.escape(action)}\b", clause)
        }
        positive_actions = {
            action
            for action in SEMANTIC_ACTIONS
            if re.search(rf"\b{re.escape(action)}\b", clause)
            and action not in negative_actions
        }

        has_they = bool(re.search(r"\bthey\b", clause))
        has_he = bool(re.search(r"\bhe\b", clause))
        has_she = bool(re.search(r"\bshe\b", clause))
        if has_they or "many" in term_counts or (
            " and " in clause and len(concepts - {"family"}) >= 2
        ):
            count = "many"
        elif has_he or has_she or "one" in term_counts:
            count = "one"
        else:
            count = None

        if has_he:
            gender = "male"
        elif has_she:
            gender = "female"
        elif count == "one" and concepts & {"boy", "brother", "father", "grandfather", "man"}:
            gender = "male"
        elif count == "one" and concepts & {"girl", "grandmother", "mother", "sister", "woman"}:
            gender = "female"
        else:
            gender = None

        contradictory = False
        copula_parts = re.split(r"\b(?:is|are)\b", clause, maxsplit=1)
        if len(copula_parts) == 2:
            subject_text, predicate_text = copula_parts
            subject_concepts = {
                concept
                for term, concept, _count in SEMANTIC_CONCEPT_TERMS
                if re.search(rf"\b{re.escape(term)}\b", subject_text)
            }
            predicate_concepts = {
                concept
                for term, concept, _count in SEMANTIC_CONCEPT_TERMS
                if re.search(rf"\b{re.escape(term)}\b", predicate_text)
            }
            incompatible_category_claims = {
                "baby": {"adult", "father", "grandfather", "grandmother", "mother", "parent"},
                "brother": {"adult", "father", "grandfather", "grandmother", "mother", "parent"},
                "child": {"adult", "father", "grandfather", "grandmother", "mother", "parent"},
                "sister": {"adult", "father", "grandfather", "grandmother", "mother", "parent"},
            }
            contradictory = any(
                subject_concepts & incompatible_subjects
                for predicate_concept, incompatible_subjects in incompatible_category_claims.items()
                if predicate_concept in predicate_concepts
            )

        if (
            concepts
            or negative_concepts
            or positive_actions
            or negative_actions
            or has_they
            or has_he
            or has_she
        ):
            clauses.append(
                SemanticClause(
                    count=count,
                    gender=gender,
                    concepts=frozenset(concepts),
                    negative_concepts=frozenset(negative_concepts),
                    positive_actions=frozenset(positive_actions),
                    negative_actions=frozenset(negative_actions),
                    contradictory=contradictory,
                )
            )
    return tuple(clauses)


def _question_scope(text: str | None) -> tuple[str | None, str | None]:
    normalized = re.sub(r"\s+", " ", str(text or "").strip().lower())
    if re.search(r"\bwho\s+are\s+they\b", normalized):
        return "many", None
    if re.search(r"\bwho\s+is\s+he\b", normalized):
        return "one", "male"
    if re.search(r"\bwho\s+is\s+she\b", normalized):
        return "one", "female"
    return None, None


def _clause_matches_referent(clause: SemanticClause, referent: VisualReferent) -> bool:
    if clause.contradictory:
        return False
    if clause.count and clause.count != referent.count:
        return False
    if clause.gender and clause.gender != referent.gender:
        return False
    if not clause.concepts.issubset(referent.concepts):
        return False
    # Missing metadata is not evidence of a negative identity or relationship.
    if not clause.negative_concepts.issubset(referent.negative_concepts):
        return False
    if not clause.positive_actions.issubset(referent.actions):
        return False
    if not clause.negative_actions.issubset(referent.negative_actions):
        return False
    return True


def _text_matches_visual(
    text: str | None,
    meaning: VisualMeaning,
    *,
    include_visible_subsets: bool,
    visible_subsets_must_match_primary_count: bool = False,
    require_primary_reference: bool = False,
    question_text: str | None = None,
) -> bool:
    clauses = _semantic_clauses(text)
    if not clauses:
        return False

    scope_count, scope_gender = _question_scope(question_text)
    first_clause = clauses[0]
    if scope_count and first_clause.count != scope_count:
        return False
    if scope_gender and first_clause.gender != scope_gender:
        return False

    referents = (meaning.primary,)
    # Bare personal pronouns identify the whole pictured person/group. Without
    # a predicate, ``He`` cannot select one boy inside a ``They`` pair portrait.
    # Sentence labels and filled completions still retain their scoped meaning.
    bare_pronoun = re.fullmatch(r"\s*(?:he|she|they)\s*[.!?]?\s*", str(text or ""), re.I)
    # A positive label can truthfully select a visible subset of a larger scene
    # (for example, ``Adults`` in a family portrait). A negative assertion is
    # scoped to the referenced subject, however; letting it select some other
    # subset would make ``They are not a family`` pass merely because the adults
    # inside the pictured family are not themselves the whole family.
    if include_visible_subsets and not bare_pronoun and (
        meaning.allow_negative_visible_subsets
        or not any(clause.negative_concepts or clause.negative_actions for clause in clauses)
    ):
        visible_subsets = meaning.visible_subsets
        if visible_subsets_must_match_primary_count:
            visible_subsets = tuple(
                referent
                for referent in visible_subsets
                if referent.count == meaning.primary.count
            )
        referents += visible_subsets
    if not all(
        any(_clause_matches_referent(clause, referent) for referent in referents)
        for clause in clauses
    ):
        return False
    return not require_primary_reference or any(
        _clause_matches_referent(clause, meaning.primary)
        for clause in clauses
    )


def _is_obviously_well_formed_completion(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    if re.search(r"\bthe\s+(?:he|she|they)\b", normalized):
        return False
    if re.search(r"\b(?:he|she)\s+are\b|\bthey\s+is\b", normalized):
        return False
    if re.search(
        rf"(?:^|[.!?]\s*)(?:the\s+)?(?:{SINGULAR_SEMANTIC_NOUNS})\s+are\b",
        normalized,
    ):
        return False
    if re.search(
        rf"(?:^|[.!?]\s*)(?:the\s+)?(?:{PLURAL_SEMANTIC_NOUNS})\s+is\b",
        normalized,
    ):
        return False
    return True


def _fill_completion(prompt: str, labels: list[str]) -> str | None:
    label_iterator = iter(labels)
    replacements = 0

    def replace_blank(_match: re.Match[str]) -> str:
        nonlocal replacements
        try:
            label = next(label_iterator)
        except StopIteration:
            return _match.group(0)
        replacements += 1
        return label

    filled = VISUAL_COMPLETION_PLACEHOLDER_PATTERN.sub(replace_blank, prompt)
    if replacements != len(labels) or VISUAL_COMPLETION_PLACEHOLDER_PATTERN.search(filled):
        return None
    return filled


def _completion_correct_text(card: object) -> str | None:
    options = list(getattr(card, "options", []) or [])
    options_by_id = {option.id: option for option in options}
    correct_ids = list(getattr(card, "correct_option_ids", []) or [])
    if not correct_ids:
        correct_ids = [str(getattr(card, "correct_option_id", ""))]
    if not correct_ids or any(option_id not in options_by_id for option_id in correct_ids):
        return None
    correct_labels = [str(options_by_id[option_id].label or "") for option_id in correct_ids]
    return _fill_completion(str(getattr(card, "prompt", "") or ""), correct_labels)


def _completion_semantic_ambiguities(card: object, meaning: VisualMeaning) -> list[str]:
    interaction_type = str(getattr(card, "interaction_type", "") or "")
    if not is_completion_interaction(interaction_type):
        return []

    options = list(getattr(card, "options", []) or [])
    options_by_id = {option.id: option for option in options}
    correct_ids = list(getattr(card, "correct_option_ids", []) or [])
    if not correct_ids:
        correct_ids = [str(getattr(card, "correct_option_id", ""))]
    if not correct_ids or any(option_id not in options_by_id for option_id in correct_ids):
        return []

    correct_labels = [str(options_by_id[option_id].label or "") for option_id in correct_ids]
    if _completion_correct_text(card) is None:
        return []

    ambiguities: list[str] = []
    used_correct_ids = set(correct_ids)
    for slot_index in range(len(correct_ids)):
        # Do not substitute a semantic noun/pronoun into a slot whose authored
        # answer is only an article, linking word, or punctuation. Such a tile is
        # a distractor for another blank, and cross-slot substitutions such as
        # ``He is She man`` are syntactic noise rather than semantic ambiguity.
        if not _semantic_clauses(correct_labels[slot_index]):
            continue
        for option in options:
            if option.id in used_correct_ids:
                continue
            # Function-word and punctuation alternatives are grammar exercises,
            # not independent visual claims. Only semantic choices enter this gate.
            if not _semantic_clauses(option.label):
                continue
            alternative_labels = list(correct_labels)
            alternative_labels[slot_index] = str(option.label or "")
            filled = _fill_completion(
                str(getattr(card, "prompt", "") or ""),
                alternative_labels,
            )
            if not filled or not _is_obviously_well_formed_completion(filled):
                continue
            if _text_matches_visual(
                filled,
                meaning,
                include_visible_subsets=True,
                question_text=filled,
            ):
                ambiguities.append(f"{option.id} ({option.label!r} -> {filled!r})")
    return ambiguities


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

            correct_option_ids = list(card.correct_option_ids or [])
            if correct_option_ids:
                if len(correct_option_ids) < 2:
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) multi-answer completion "
                        "must declare at least two ordered correct option IDs."
                    )
                if len(correct_option_ids) != len(set(correct_option_ids)):
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) has repeated ordered "
                        f"correct option IDs: {correct_option_ids}."
                    )
                if card.correct_option_id != correct_option_ids[0]:
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) must keep "
                        "correct_option_id aligned with the first ordered answer."
                    )
                if (
                    not is_completion_interaction(card.interaction_type)
                    and getattr(card, "mission_game", None) is None
                ):
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) declares ordered "
                        "correct answers outside a completion interaction."
                    )
                for correct_option_id in correct_option_ids:
                    correct_count = option_ids.count(correct_option_id)
                    if correct_count != 1:
                        errors.append(
                            f"{lesson.id} card {card_index} ({card.prompt!r}) expected ordered "
                            f"correct option {correct_option_id!r} exactly once, found {correct_count}."
                        )
            else:
                correct_count = option_ids.count(card.correct_option_id)
                if correct_count != 1:
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) expected correct option "
                        f"{card.correct_option_id!r} exactly once, found {correct_count}."
                    )
    return errors


def validate_text_tile_option_limit() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            if not card.options or any((option.image_url or "").strip() for option in card.options):
                continue
            if (
                card.interaction_type in MISSION_COMPLETION_INTERACTIONS
                or getattr(card, "mission_game", None) is not None
            ):
                # Mission game banks are not ordinary multiple-choice banks. The
                # dedicated responsive renderer exposes options through bounded
                # hotspots, local targets, and a complete non-drag path.
                if len(card.options) > MAX_MISSION_CONSTRUCTION_TILES:
                    errors.append(
                        f"{lesson.id} card {card_index} ({card.prompt!r}) has "
                        f"{len(card.options)} construction tiles; the reviewed mission "
                        f"maximum is {MAX_MISSION_CONSTRUCTION_TILES}."
                    )
                continue
            if len(card.options) > 3:
                errors.append(
                    f"{lesson.id} card {card_index} ({card.prompt!r}) has {len(card.options)} "
                    "text tiles; text-only answer sets allow at most three."
                )
    return errors


def validate_family_adult_ambiguity(lessons=None) -> list[str]:
    """Require supported correct meanings and reject truth-compatible distractors.

    The historical name remains public because release checks and tests import it,
    but the validation now covers the broader Unit 1 semantic failure class:
    categories, incomplete-but-true labels, generation-role overlap, polarity,
    and semantic alternatives in image-backed completion cards.
    """

    errors: list[str] = []
    lesson_catalog = LESSONS if lessons is None else lessons
    for lesson in lesson_catalog.values():
        for card_index, card in enumerate(lesson.cards, 1):
            options = list(getattr(card, "options", []) or [])
            if not options:
                continue
            if getattr(card, "mission_game", None) is not None:
                # Mission answers are scoped to explicit normalized target areas.
                # Treating the entire composite hero as one referent would create
                # false ambiguity findings for local labels and action panels.
                continue

            correct_ids = set(getattr(card, "correct_option_ids", []) or [])
            if not correct_ids:
                correct_ids = {str(getattr(card, "correct_option_id", ""))}
            prompt_image_url = str(getattr(card, "prompt_image_url", "") or "")
            image_options = [option for option in options if str(option.image_url or "").strip()]
            text_options = [option for option in options if not str(option.image_url or "").strip()]
            interaction_type = str(getattr(card, "interaction_type", "") or "")
            is_completion = is_completion_interaction(interaction_type)

            ambiguous_distractors: list[str] = []
            unsupported_correct_answers: list[str] = []
            if prompt_image_url and len(text_options) == len(options):
                meaning = _visual_meaning(prompt_image_url)
                if meaning is None:
                    continue
                if is_completion:
                    correct_text = _completion_correct_text(card)
                    if (
                        correct_text
                        and _semantic_clauses(correct_text)
                        and not _text_matches_visual(
                            correct_text,
                            meaning,
                            include_visible_subsets=True,
                            require_primary_reference=True,
                            question_text=correct_text,
                        )
                    ):
                        unsupported_correct_answers.append(
                            f"{sorted(correct_ids)!r} ({correct_text!r}, "
                            f"{_asset_name(prompt_image_url)!r})"
                        )
                    ambiguous_distractors.extend(_completion_semantic_ambiguities(card, meaning))
                else:
                    question_text = str(getattr(card, "prompt", "") or "")
                    for option in text_options:
                        if not _semantic_clauses(option.label):
                            continue
                        option_matches = _text_matches_visual(
                            option.label,
                            meaning,
                            include_visible_subsets=True,
                            require_primary_reference=option.id in correct_ids,
                            question_text=question_text,
                        )
                        if option.id in correct_ids and not option_matches:
                            unsupported_correct_answers.append(
                                f"{option.id} ({option.label!r}, "
                                f"{_asset_name(prompt_image_url)!r})"
                            )
                        elif option.id not in correct_ids and option_matches:
                            ambiguous_distractors.append(
                                f"{option.id} ({option.label!r}, {_asset_name(prompt_image_url)!r})"
                            )
            elif len(image_options) == len(options):
                target_text = (
                    getattr(card, "audio_text", None)
                    or getattr(card, "answer_audio_text", None)
                    or getattr(card, "prompt", None)
                    or ""
                )
                if not _semantic_clauses(target_text):
                    continue
                question_text = str(target_text)
                for option in image_options:
                    meaning = _visual_meaning(option.image_url)
                    if meaning is None:
                        continue
                    option_matches = _text_matches_visual(
                        target_text,
                        meaning,
                        include_visible_subsets=True,
                        visible_subsets_must_match_primary_count=True,
                        require_primary_reference=option.id in correct_ids,
                        question_text=question_text,
                    )
                    if option.id in correct_ids and not option_matches:
                        unsupported_correct_answers.append(
                            f"{option.id} ({option.label!r}, {_asset_name(option.image_url)!r})"
                        )
                    elif option.id not in correct_ids and option_matches:
                        ambiguous_distractors.append(
                            f"{option.id} ({option.label!r}, {_asset_name(option.image_url)!r})"
                        )

            # Text/audio-to-text cards intentionally do not use truth entailment:
            # hearing a specific role and choosing its exact phrase is different
            # from describing a visible person with any true broader category.
            if unsupported_correct_answers:
                errors.append(
                    f"{lesson.id} card {card_index} ({getattr(card, 'prompt', '')!r}) has declared "
                    "correct answers that are not supported by the known visual semantics: "
                    f"{unsupported_correct_answers}."
                )
            if ambiguous_distractors:
                errors.append(
                    f"{lesson.id} card {card_index} ({getattr(card, 'prompt', '')!r}) has semantic "
                    "distractors that can still satisfy the same visible or spoken evidence under "
                    f"an ordinary interpretation: {ambiguous_distractors}."
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
                if not VISUAL_COMPLETION_PLACEHOLDER_PATTERN.search(card.prompt):
                    errors.append(f"{location} is a grammar card without a sentence blank.")
                if any(not (option.label or "").strip() for option in card.options):
                    errors.append(f"{location} is a grammar card with an unlabeled word choice.")

            if card.stage == "Use" or card.interaction_type in MISSION_COMPLETION_INTERACTIONS:
                completion = is_completion_interaction(card.interaction_type)
                placeholders = list(VISUAL_COMPLETION_PLACEHOLDER_PATTERN.finditer(card.prompt))
                ordered_correct_ids = list(card.correct_option_ids or [])
                expected_placeholders = len(ordered_correct_ids) if ordered_correct_ids else 1
                if completion and len(placeholders) != expected_placeholders:
                    errors.append(
                        f"{location} must contain exactly {expected_placeholders} visual sentence "
                        f"blank{'s' if expected_placeholders != 1 else ''}; found {len(placeholders)}."
                    )
                if any(not (option.label or "").strip() for option in card.options):
                    errors.append(f"{location} is an interactive Use card with an unlabeled choice.")
                if not (card.answer_audio_text or "").strip():
                    errors.append(f"{location} is an interactive Use card without completed-answer audio.")
                if completion and len(placeholders) == expected_placeholders:
                    correct_ids = ordered_correct_ids or [card.correct_option_id]
                    correct_labels = []
                    for correct_id in correct_ids:
                        correct_option = next(
                            (option for option in card.options if option.id == correct_id),
                            None,
                        )
                        if correct_option and (correct_option.label or "").strip():
                            correct_labels.append(correct_option.label)
                    if len(correct_labels) == expected_placeholders:
                        label_iterator = iter(correct_labels)
                        completed = VISUAL_COMPLETION_PLACEHOLDER_PATTERN.sub(
                            lambda _: next(label_iterator),
                            card.prompt,
                        )
                        if card.interaction_type in MISSION_COMPLETION_INTERACTIONS:
                            authored_words = re.findall(
                                r"[a-z]+",
                                re.sub(
                                    r"(?<=[A-Za-z])-(?=[A-Za-z])",
                                    "",
                                    card.answer_audio_text.lower(),
                                ),
                            )
                            completed_words = re.findall(
                                r"[a-z]+",
                                re.sub(
                                    r"(?<=[A-Za-z])-(?=[A-Za-z])",
                                    "",
                                    completed.lower(),
                                ),
                            )
                            answer_matches = authored_words == completed_words
                        else:
                            answer_matches = card.answer_audio_text == completed
                        if not answer_matches:
                            errors.append(
                                f"{location} answer_audio_text must exactly equal the full sentence "
                                "with every ordered correct answer inserted (mission construction "
                                "may vary punctuation but not word order)."
                            )

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


def _summarize_contracts(contracts: list[dict[str, object]], limit: int = 12) -> str:
    labels = [
        f"{contract.get('filename', '<missing filename>')} ({contract.get('concept', '<missing concept>')})"
        for contract in contracts
    ]
    preview = ", ".join(labels[:limit])
    if len(labels) > limit:
        preview += f", and {len(labels) - limit} more"
    return preview


def _valid_reviewed_at(value: object) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def _lesson_payload(model: object) -> dict[str, object]:
    if hasattr(model, "model_dump"):
        return model.model_dump(mode="json")  # type: ignore[no-any-return, union-attr]
    return json.loads(model.json())  # type: ignore[no-any-return, union-attr]


def _context_counter_key(
    filename: str,
    context: dict[str, object],
    *,
    ignore_render_signature: bool = False,
) -> tuple[str, str]:
    comparison_context = context
    if ignore_render_signature:
        comparison_context = {
            field: value
            for field, value in context.items()
            if field != "render_signature_sha256"
        }
    return (
        filename,
        json.dumps(
            comparison_context,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        ),
    )


def _runtime_media_context_counts(
    *,
    ignore_render_signature: bool = False,
) -> Counter[tuple[str, str]]:
    counts: Counter[tuple[str, str]] = Counter()
    lesson_payloads: list[dict[str, object]] = []
    for lesson_model in LESSONS.values():
        lesson = _lesson_payload(lesson_model)
        lesson_payloads.append(lesson)
        cards = lesson.get("cards") or []
        if not isinstance(cards, list):
            raise ValueError(f"Runtime lesson {lesson.get('id')!r} cards must be a list")
        for card in cards:
            if not isinstance(card, dict):
                raise ValueError(f"Runtime lesson {lesson.get('id')!r} has a non-object card")
            for usage in card_media_usages(lesson, card):
                context = usage["context"]
                rendered_filename = usage["rendered_filename"]
                counts[_context_counter_key(
                    rendered_filename,
                    context,
                    ignore_render_signature=ignore_render_signature,
                )] += 1
    for usage in course_browser_media_usages(lesson_payloads):
        context = usage["context"]
        rendered_filename = usage["rendered_filename"]
        counts[_context_counter_key(
            rendered_filename,
            context,
            ignore_render_signature=ignore_render_signature,
        )] += 1
    return counts


def _summarize_context_keys(
    values: list[tuple[str, str]], limit: int = 8
) -> str:
    labels: list[str] = []
    for filename, serialized_context in values[:limit]:
        context = json.loads(serialized_context)
        labels.append(
            f"{filename} ({context['sub_lesson_id']}|{context['stage']}|"
            f"{context['slide_id']}|{context['media_role']})"
        )
    if len(values) > limit:
        labels.append(f"and {len(values) - limit} more")
    return ", ".join(labels)


def semantic_review_decision_findings(
    pending_contracts: list[dict[str, object]],
    rejected_contracts: list[dict[str, object]],
    review_policy: str,
) -> tuple[list[str], list[str]]:
    """Classify review decisions without weakening malformed/stale contract checks."""

    if review_policy not in {"preview", "production"}:
        raise ValueError(f"Unsupported semantic review policy: {review_policy!r}.")

    errors: list[str] = []
    warnings: list[str] = []
    if pending_contracts:
        message = (
            f"A1 media semantic review has {len(pending_contracts)} pending contracts: "
            f"{_summarize_contracts(pending_contracts)}."
        )
        if review_policy == "preview":
            warnings.append(
                f"Preview-only advisory: {message} Human approval is still required "
                "before Production."
            )
        else:
            errors.append(message)
    if rejected_contracts:
        errors.append(
            f"A1 media semantic review has {len(rejected_contracts)} rejected contracts: "
            f"{_summarize_contracts(rejected_contracts)}."
        )
    return errors, warnings


def validate_a1_media_semantic_approvals(
    review_policy: str = "production",
    warnings: list[str] | None = None,
) -> list[str]:
    """Validate contracts strictly, allowing review-state drift in Preview.

    Approval binds the full semantic contract and exact canonical image bytes.
    Canonical, mobile, and frontend copies are all required and byte-identical.
    Missing assets, malformed contracts, asset/hash mismatches, orphaned rows,
    and rejected records always fail. Pending decisions and renderer-source
    signature drift are warnings only under the explicit Preview policy and
    remain release blockers under the default Production policy.
    """

    if review_policy not in {"preview", "production"}:
        raise ValueError(f"Unsupported semantic review policy: {review_policy!r}.")

    warning_sink = warnings if warnings is not None else []
    errors: list[str] = []
    if not A1_MEDIA_MANIFEST.is_file():
        return [
            f"A1 media manifest is missing: {A1_MEDIA_MANIFEST.relative_to(ROOT)}."
        ]
    if not A1_MEDIA_SEMANTIC_APPROVALS.is_file():
        return [
            "A1 media semantic approval registry is missing. Run "
            "python scripts/build_a1_media_semantic_review.py, then visually review "
            "every pending contract."
        ]

    try:
        manifest = json.loads(A1_MEDIA_MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"A1 media manifest cannot be read: {exc}."]
    try:
        registry = json.loads(A1_MEDIA_SEMANTIC_APPROVALS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"A1 media semantic approval registry cannot be read: {exc}."]

    if not isinstance(manifest, dict) or not isinstance(manifest.get("assets"), list):
        return ["A1 media manifest must be an object with an assets list."]
    if not isinstance(registry, dict):
        return ["A1 media semantic approval registry must be a JSON object."]

    expected_header = {
        "schema_version": SEMANTIC_APPROVAL_SCHEMA_VERSION,
        "manifest_schema_version": MANIFEST_SCHEMA_VERSION,
        "manifest_path": A1_MEDIA_MANIFEST.relative_to(ROOT).as_posix(),
        "contract_hash_algorithm": CONTRACT_HASH_ALGORITHM,
        "asset_hash_algorithm": ASSET_HASH_ALGORITHM,
        "contract_fields": list(CONTRACT_FIELDS),
        "review_context_fields": list(REVIEW_CONTEXT_FIELDS),
    }
    for field, expected in expected_header.items():
        actual = registry.get(field)
        if actual != expected:
            errors.append(
                f"A1 media semantic approval registry {field} is {actual!r}; expected {expected!r}."
            )

    canonical_contracts: dict[str, dict[str, object]] = {}
    asset_hashes: dict[str, str | None] = {}
    checked_filenames: set[str] = set()
    manifest_context_counts: Counter[tuple[str, str]] = Counter()
    stale_render_profiles: Counter[str] = Counter()
    for index, asset in enumerate(manifest["assets"], 1):
        if not isinstance(asset, dict):
            errors.append(f"A1 media manifest asset {index} is not an object.")
            continue
        for review_context in asset.get("review_contexts", []):
            if not isinstance(review_context, dict):
                continue
            render_profile = review_context.get("render_profile")
            signature = review_context.get("render_signature_sha256")
            if not isinstance(render_profile, str) or not isinstance(signature, str):
                continue
            try:
                expected_signature = render_profile_sha256(render_profile)
            except ValueError:
                continue
            if signature != expected_signature:
                stale_render_profiles[render_profile] += 1
        try:
            contract = semantic_contract(
                asset,
                allow_stale_render_signatures=review_policy == "preview",
            )
        except ValueError as exc:
            errors.append(f"A1 media manifest asset {index} is invalid: {exc}.")
            continue

        contract_sha256 = semantic_contract_sha256(contract)
        if contract_sha256 in canonical_contracts:
            errors.append(
                f"A1 media manifest has duplicate semantic contract {contract_sha256} "
                f"for {contract['filename']!r}."
            )
            continue
        canonical_contracts[contract_sha256] = contract

        for review_context in contract["review_contexts"]:
            manifest_context_counts[
                _context_counter_key(
                    contract["filename"],
                    review_context,
                    ignore_render_signature=review_policy == "preview",
                )
            ] += 1

        filename = contract["filename"]
        if filename in checked_filenames:
            continue
        checked_filenames.add(filename)
        canonical_path = LESSON_ASSET_DIR / filename
        mobile_path = MOBILE_LESSON_ASSET_DIR / filename
        frontend_path = FRONTEND_LESSON_ASSET_DIR / filename

        if not canonical_path.is_file():
            errors.append(f"Semantic-review canonical asset is missing: {filename!r}.")
            asset_hashes[filename] = None
        else:
            asset_hashes[filename] = sha256_file(canonical_path)

        if not mobile_path.is_file():
            errors.append(f"Semantic-review mobile asset copy is missing: {filename!r}.")
        elif asset_hashes[filename] and sha256_file(mobile_path) != asset_hashes[filename]:
            errors.append(
                f"Semantic-review asset {filename!r} differs between canonical and mobile copies."
            )

        if not frontend_path.is_file():
            errors.append(f"Semantic-review frontend asset copy is missing: {filename!r}.")
        elif asset_hashes[filename] and sha256_file(frontend_path) != asset_hashes[filename]:
            errors.append(
                f"Semantic-review asset {filename!r} differs between canonical and frontend copies."
            )

    try:
        runtime_context_counts = _runtime_media_context_counts(
            ignore_render_signature=review_policy == "preview",
        )
    except ValueError as exc:
        errors.append(f"Runtime semantic media inventory is invalid: {exc}.")
        runtime_context_counts = Counter()
    missing_runtime_contexts = list((runtime_context_counts - manifest_context_counts).elements())
    stale_manifest_contexts = list((manifest_context_counts - runtime_context_counts).elements())
    if missing_runtime_contexts:
        errors.append(
            "A1 media manifest is missing "
            f"{len(missing_runtime_contexts)} runtime image usages: "
            f"{_summarize_context_keys(missing_runtime_contexts)}."
        )
    if stale_manifest_contexts:
        errors.append(
            "A1 media manifest has "
            f"{len(stale_manifest_contexts)} stale or duplicate image usages: "
            f"{_summarize_context_keys(stale_manifest_contexts)}."
        )

    approvals = registry.get("approvals")
    if not isinstance(approvals, list):
        errors.append("A1 media semantic approval registry approvals must be a list.")
        return errors

    rows_by_declared_hash: dict[str, dict[str, object]] = {}
    matched_contract_hashes: set[str] = set()
    pending_contracts: list[dict[str, object]] = []
    rejected_contracts: list[dict[str, object]] = []
    for index, row in enumerate(approvals, 1):
        if not isinstance(row, dict):
            errors.append(f"A1 media semantic approval row {index} is not an object.")
            continue

        declared_contract_sha256 = row.get("contract_sha256")
        if not isinstance(declared_contract_sha256, str) or not re.fullmatch(
            r"[0-9a-f]{64}", declared_contract_sha256
        ):
            errors.append(
                f"A1 media semantic approval row {index} has a missing or invalid contract_sha256."
            )
            continue
        if declared_contract_sha256 in rows_by_declared_hash:
            errors.append(
                f"A1 media semantic approval registry has duplicate contract "
                f"{declared_contract_sha256}."
            )
            continue
        rows_by_declared_hash[declared_contract_sha256] = row

        try:
            row_contract = semantic_contract(
                row,
                allow_stale_render_signatures=review_policy == "preview",
            )
        except ValueError as exc:
            errors.append(f"A1 media semantic approval row {index} is invalid: {exc}.")
            continue
        computed_contract_sha256 = semantic_contract_sha256(row_contract)
        if computed_contract_sha256 != declared_contract_sha256:
            errors.append(
                f"A1 media semantic approval for {row_contract['filename']!r} has a stale "
                "contract_sha256; its contract fields changed after hashing."
            )
            continue

        canonical_contract = canonical_contracts.get(declared_contract_sha256)
        if canonical_contract is None:
            errors.append(
                f"A1 media semantic approval for {row_contract['filename']!r} is orphaned; "
                "its contract is not in the canonical manifest."
            )
            continue
        matched_contract_hashes.add(declared_contract_sha256)
        if row_contract != canonical_contract:
            errors.append(
                f"A1 media semantic approval for {row_contract['filename']!r} does not match "
                "the canonical manifest contract."
            )
            continue

        filename = row_contract["filename"]
        expected_asset_sha256 = asset_hashes.get(filename)
        declared_asset_sha256 = row.get("asset_sha256")
        if not isinstance(declared_asset_sha256, str) or not re.fullmatch(
            r"[0-9a-f]{64}", declared_asset_sha256
        ):
            errors.append(
                f"A1 media semantic approval for {filename!r} has a missing or invalid asset_sha256."
            )
        elif expected_asset_sha256 and declared_asset_sha256 != expected_asset_sha256:
            errors.append(
                f"A1 media semantic approval for {filename!r} is stale; the canonical asset "
                "bytes changed after review."
            )

        decision = row.get("decision")
        if decision == "pending":
            pending_contracts.append(row_contract)
        elif decision == "rejected":
            rejected_contracts.append(row_contract)
        elif decision == "approved":
            reviewer = row.get("reviewer")
            if not isinstance(reviewer, str) or not reviewer.strip():
                errors.append(
                    f"Approved A1 media semantic contract {filename!r} has no reviewer."
                )
            if not _valid_reviewed_at(row.get("reviewed_at")):
                errors.append(
                    f"Approved A1 media semantic contract {filename!r} has no valid ISO review date."
                )
        else:
            errors.append(
                f"A1 media semantic approval for {filename!r} has invalid decision {decision!r}."
            )
        if not isinstance(row.get("notes", ""), str):
            errors.append(f"A1 media semantic approval for {filename!r} has non-text notes.")

    missing_hashes = set(canonical_contracts) - matched_contract_hashes
    if missing_hashes:
        missing_contracts = [canonical_contracts[value] for value in sorted(missing_hashes)]
        errors.append(
            f"A1 media semantic approval registry is missing {len(missing_contracts)} canonical "
            f"contracts: {_summarize_contracts(missing_contracts)}."
        )
    decision_errors, decision_warnings = semantic_review_decision_findings(
        pending_contracts,
        rejected_contracts,
        review_policy,
    )
    errors.extend(decision_errors)
    if decision_warnings and warnings is None:
        errors.append(
            "Preview semantic-review warnings were not surfaced by the caller; "
            "refusing to pass silently."
        )
    else:
        warning_sink.extend(decision_warnings)
    if stale_render_profiles and review_policy == "preview":
        profile_summary = ", ".join(
            f"{profile} ({count})"
            for profile, count in sorted(stale_render_profiles.items())
        )
        warning_sink.append(
            "Preview-only advisory: renderer-source changes made "
            f"{sum(stale_render_profiles.values())} semantic review contexts pending "
            f"across {profile_summary}. Review the exact runtime framing in Preview; "
            "Production remains blocked until current signatures are reviewed."
        )
    return errors


def _mobile_export_payload(model: object) -> dict[str, object]:
    payload = _lesson_payload(model)
    cards = payload.get("cards") or []
    if isinstance(cards, list):
        for card in cards:
            if not isinstance(card, dict):
                continue
            if card.get("spanish_translation") is None:
                card.pop("spanish_translation", None)
            if not card.get("correct_option_ids"):
                card.pop("correct_option_ids", None)
            if not card.get("audio_turns"):
                card.pop("audio_turns", None)
            if not card.get("answer_audio_turns"):
                card.pop("answer_audio_turns", None)
    return payload


def validate_mobile_a1_semantic_parity() -> list[str]:
    """Bind the mobile snapshot and Metro still-image resolution to backend truth."""

    errors: list[str] = []
    if not MOBILE_COURSE_PATH.is_file():
        return [f"Mobile A1 course snapshot is missing: {MOBILE_COURSE_PATH.relative_to(ROOT)}."]
    try:
        mobile_course = json.loads(MOBILE_COURSE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"Mobile A1 course snapshot cannot be read: {exc}."]

    canonical_course = [_mobile_export_payload(lesson) for lesson in LESSONS.values()]
    if mobile_course != canonical_course:
        canonical_by_id = {
            str(lesson.get("sub_lesson_id")): lesson for lesson in canonical_course
        }
        mobile_by_id = {
            str(lesson.get("sub_lesson_id")): lesson
            for lesson in mobile_course
            if isinstance(lesson, dict)
        } if isinstance(mobile_course, list) else {}
        differing = [
            lesson_id
            for lesson_id in sorted(set(canonical_by_id) | set(mobile_by_id))
            if canonical_by_id.get(lesson_id) != mobile_by_id.get(lesson_id)
        ]
        preview = ", ".join(differing[:12])
        if len(differing) > 12:
            preview += f", and {len(differing) - 12} more"
        errors.append(
            "Mobile A1 course snapshot differs from canonical backend lessons"
            + (f" in: {preview}." if preview else ".")
        )

    if not MOBILE_IMAGE_SOURCES_PATH.is_file():
        errors.append(
            f"Mobile lesson image source registry is missing: "
            f"{MOBILE_IMAGE_SOURCES_PATH.relative_to(ROOT)}."
        )
        return errors
    source_registry = MOBILE_IMAGE_SOURCES_PATH.read_text(encoding="utf-8")
    try:
        required_filenames = {
            filename for filename, _context in _runtime_media_context_counts().keys()
        }
    except ValueError as exc:
        errors.append(f"Cannot derive required mobile stills: {exc}.")
        return errors
    missing_requires = [
        filename
        for filename in sorted(required_filenames)
        if not re.search(
            rf"['\"]{re.escape(filename)}['\"]\s*:\s*require\(",
            source_registry,
        )
    ]
    if missing_requires:
        preview = ", ".join(missing_requires[:12])
        if len(missing_requires) > 12:
            preview += f", and {len(missing_requires) - 12} more"
        errors.append(
            f"Mobile Metro registry is missing {len(missing_requires)} runtime/resolved "
            f"lesson stills: {preview}."
        )
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate A1 lesson cards and media.")
    parser.add_argument(
        "--semantic-review-policy",
        choices=("preview", "production"),
        default="production",
        help=(
            "Preview reports pending human semantic approvals and stale renderer "
            "signatures as warnings; "
            "Production (the default) requires every approval to be current."
        ),
    )
    arguments = parser.parse_args(argv)
    warnings: list[str] = []
    errors = [
        *validate_option_ids(),
        *validate_text_tile_option_limit(),
        *validate_duplicate_option_images(),
        *validate_family_adult_ambiguity(),
        *validate_negative_visual_contracts(),
        *validate_interaction_requirements(),
        *validate_mission_contracts(),
        *validate_media_references(),
        *validate_a1_image_ratio(),
        *validate_a1_media_semantic_approvals(
            arguments.semantic_review_policy,
            warnings,
        ),
        *validate_mobile_a1_semantic_parity(),
    ]
    if warnings:
        print("Lesson card validation warnings:")
        for warning in warnings:
            print(f"- WARNING: {warning}")
    if errors:
        print("Lesson card validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Lesson card validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
