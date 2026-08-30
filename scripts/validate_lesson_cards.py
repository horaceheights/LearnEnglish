import argparse
import json
import re
import struct
import sys
from collections import Counter
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
)


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
VISUAL_COMPLETION_PLACEHOLDER_PATTERN = re.compile(
    r"(?:_+|\[\s*(?:blank|pause)\s*\]|\{\s*blank\s*\}|\.{3,}|…)",
    flags=re.IGNORECASE,
)
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


def validate_text_tile_option_limit() -> list[str]:
    errors: list[str] = []
    for lesson in LESSONS.values():
        for card_index, card in enumerate(lesson.cards, 1):
            if not card.options or any((option.image_url or "").strip() for option in card.options):
                continue
            if len(card.options) > 3:
                errors.append(
                    f"{lesson.id} card {card_index} ({card.prompt!r}) has {len(card.options)} "
                    "text tiles; text-only answer sets allow at most three."
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
                if not VISUAL_COMPLETION_PLACEHOLDER_PATTERN.search(card.prompt):
                    errors.append(f"{location} is a grammar card without a sentence blank.")
                if any(not (option.label or "").strip() for option in card.options):
                    errors.append(f"{location} is a grammar card with an unlabeled word choice.")

            if card.stage == "Use":
                completion = card.interaction_type is None or str(card.interaction_type).startswith("complete")
                placeholders = list(VISUAL_COMPLETION_PLACEHOLDER_PATTERN.finditer(card.prompt))
                if completion and len(placeholders) != 1:
                    errors.append(
                        f"{location} must contain exactly one visual sentence blank; "
                        f"found {len(placeholders)}."
                    )
                if any(not (option.label or "").strip() for option in card.options):
                    errors.append(f"{location} is an interactive Use card with an unlabeled choice.")
                if not (card.answer_audio_text or "").strip():
                    errors.append(f"{location} is an interactive Use card without completed-answer audio.")
                if completion and len(placeholders) == 1:
                    correct_option = next(
                        (option for option in card.options if option.id == card.correct_option_id),
                        None,
                    )
                    if correct_option and (correct_option.label or "").strip():
                        placeholder = placeholders[0]
                        completed = (
                            card.prompt[:placeholder.start()]
                            + correct_option.label
                            + card.prompt[placeholder.end():]
                        )
                        if card.answer_audio_text != completed:
                            errors.append(
                                f"{location} answer_audio_text must exactly equal the full sentence "
                                "with the correct answer inserted."
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


def _context_counter_key(filename: str, context: dict[str, object]) -> tuple[str, str]:
    return (
        filename,
        json.dumps(context, ensure_ascii=False, separators=(",", ":"), sort_keys=True),
    )


def _runtime_media_context_counts() -> Counter[tuple[str, str]]:
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
                counts[_context_counter_key(rendered_filename, context)] += 1
    for usage in course_browser_media_usages(lesson_payloads):
        context = usage["context"]
        rendered_filename = usage["rendered_filename"]
        counts[_context_counter_key(rendered_filename, context)] += 1
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
    """Validate contracts strictly, allowing only pending decisions in Preview.

    Approval binds the full semantic contract and exact canonical image bytes.
    Canonical, mobile, and frontend copies are all required and byte-identical.
    Missing, malformed, stale, hash-mismatched, orphaned, and rejected records
    always fail. Pending decisions are warnings only under the explicit Preview
    policy and remain release blockers under the default Production policy.
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
    for index, asset in enumerate(manifest["assets"], 1):
        if not isinstance(asset, dict):
            errors.append(f"A1 media manifest asset {index} is not an object.")
            continue
        try:
            contract = semantic_contract(asset)
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
                _context_counter_key(contract["filename"], review_context)
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
        runtime_context_counts = _runtime_media_context_counts()
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
            row_contract = semantic_contract(row)
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
    return errors


def _mobile_export_payload(model: object) -> dict[str, object]:
    payload = _lesson_payload(model)
    cards = payload.get("cards") or []
    if isinstance(cards, list):
        for card in cards:
            if isinstance(card, dict) and card.get("spanish_translation") is None:
                card.pop("spanish_translation", None)
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
            "Preview reports pending human semantic approvals as warnings; "
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
