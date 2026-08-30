from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
import textwrap
import uuid
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps

try:
    from scripts.a1_media_runtime_contracts import (
        card_media_usages,
        validate_review_context,
    )
    from scripts.build_a1_media_semantic_review import (
        MANIFEST_SCHEMA_VERSION,
        semantic_contract,
        semantic_contract_sha256,
    )
except ModuleNotFoundError:  # Direct `python scripts/...` execution.
    from a1_media_runtime_contracts import card_media_usages, validate_review_context
    from build_a1_media_semantic_review import (
        MANIFEST_SCHEMA_VERSION,
        semantic_contract,
        semantic_contract_sha256,
    )


ROOT = Path(__file__).resolve().parents[1]
GENERATED_ROOT = ROOT / "mobile" / "src" / "generated"
MOBILE_IMAGE_ROOT = ROOT / "mobile" / "assets" / "lesson-assets"
FRONTEND_IMAGE_ROOT = ROOT / "frontend" / "public" / "lesson-assets"
CANONICAL_IMAGE_ROOT = ROOT / "Lessons" / "Lesson1" / "images"
MEDIA_MANIFEST_PATH = ROOT / "docs" / "product" / "a1-media-manifest.json"
DEFAULT_OUTPUT_ROOT = ROOT / "tmp" / "four-card-media-audit"

FOUR_CARD_RENDER_PROFILE = "lesson-option-four-mobile-4x5-web-3x2-v1"
OUTPUT_MARKER_NAME = ".four-card-review-aid.json"
OUTPUT_MARKER_KIND = "four-card-human-review-aid-output"
OUTPUT_GENERATOR = "scripts/render_four_card_media_audit.py"
SHEET_NAME_PATTERN = re.compile(r"four-card-crops-\d{2,}\.png")

TILE_SIZE = (200, 250)
CELL_SIZE = (370, 650)
SHEET_COLUMNS = 4
SHEET_ROWS = 2
SHEET_MARGIN = 20
SHEET_HEADER_HEIGHT = 52


class ReviewAidError(ValueError):
    """Raised when current runtime media cannot be bound to one review contract."""


def normalized_text(value: object) -> str:
    return "" if value is None else str(value)


def canonical_json_bytes(value: object) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def runtime_four_card_contexts(
    generated_root: Path = GENERATED_ROOT,
) -> list[dict[str, Any]]:
    """Return canonical four-card contexts plus non-contract display location data."""

    contexts: list[dict[str, Any]] = []
    for lesson_path in sorted(generated_root.glob("lesson-*.json")):
        lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
        for card_index, card in enumerate(lesson.get("cards", [])):
            options = card.get("options") or []
            if len(options) != 4 or not all(option.get("image_url") for option in options):
                continue
            for usage in card_media_usages(lesson, card):
                context = usage["context"]
                if (
                    context["media_role"] != "option"
                    or context["render_profile"] != FOUR_CARD_RENDER_PROFILE
                ):
                    continue
                try:
                    normalized_context = validate_review_context(context)
                except ValueError as exc:
                    raise ReviewAidError(
                        f"Embedded runtime context in {lesson_path.name} card "
                        f"{card_index + 1} is invalid: {exc}"
                    ) from exc
                contexts.append(
                    {
                        "review_context": normalized_context,
                        "lesson_title": lesson.get("title", ""),
                        "card_index": card_index,
                    }
                )
    return contexts


def context_identity(context: dict[str, Any]) -> bytes:
    """Return the complete canonical context used by the approval authority."""

    try:
        normalized_context = validate_review_context(context)
    except ValueError as exc:
        raise ReviewAidError(f"Invalid still-media review context: {exc}") from exc
    return canonical_json_bytes(normalized_context)


def verified_asset_sha256(
    filename: str,
    *,
    canonical_root: Path = CANONICAL_IMAGE_ROOT,
    mobile_root: Path = MOBILE_IMAGE_ROOT,
    frontend_root: Path = FRONTEND_IMAGE_ROOT,
) -> str:
    copies = {
        "canonical": canonical_root / filename,
        "mobile": mobile_root / filename,
        "frontend": frontend_root / filename,
    }
    missing = [label for label, path in copies.items() if not path.is_file()]
    if missing:
        raise ReviewAidError(
            f"Effective four-card image {filename!r} is missing from: {', '.join(missing)}."
        )
    hashes = {label: sha256_file(path) for label, path in copies.items()}
    if len(set(hashes.values())) != 1:
        detail = ", ".join(f"{label}={digest}" for label, digest in hashes.items())
        raise ReviewAidError(
            f"Effective four-card image {filename!r} is not byte-identical: {detail}."
        )
    return hashes["canonical"]


def expected_option_meaning(
    concept: object,
    option_label: object,
    description: object,
) -> str:
    concept_text = normalized_text(concept).strip()
    description_text = normalized_text(description).strip()
    if not concept_text or not description_text:
        raise ReviewAidError(
            "Every review entry requires a non-empty concept and full contract description."
        )
    label_text = normalized_text(option_label).strip()
    if label_text:
        return f"{label_text} (concept: {concept_text})"
    return f"{concept_text} (image-only option; verify the full contract)"


def manifest_four_card_rows(
    manifest: dict[str, Any],
) -> Iterable[tuple[dict[str, Any], dict[str, Any]]]:
    if manifest.get("schema_version") != MANIFEST_SCHEMA_VERSION:
        raise ReviewAidError(
            f"A1 media manifest schema_version must be {MANIFEST_SCHEMA_VERSION}."
        )
    assets = manifest.get("assets")
    if not isinstance(assets, list):
        raise ReviewAidError("A1 media manifest must contain an assets list.")
    for asset in assets:
        if not isinstance(asset, dict):
            raise ReviewAidError("Every A1 media manifest asset must be an object.")
        try:
            contract = semantic_contract(asset)
        except ValueError as exc:
            asset_name = asset.get("asset_id") or asset.get("filename") or "<unknown>"
            raise ReviewAidError(
                f"Media contract {asset_name!r} is invalid: {exc}"
            ) from exc
        for context in contract["review_contexts"]:
            if context.get("render_profile") == FOUR_CARD_RENDER_PROFILE:
                yield contract, context


def build_review_entries(
    manifest: dict[str, Any],
    runtime_contexts: list[dict[str, Any]],
    *,
    canonical_root: Path = CANONICAL_IMAGE_ROOT,
    mobile_root: Path = MOBILE_IMAGE_ROOT,
    frontend_root: Path = FRONTEND_IMAGE_ROOT,
) -> list[dict[str, Any]]:
    runtime_by_identity: dict[bytes, deque[dict[str, Any]]] = defaultdict(deque)
    for runtime in runtime_contexts:
        context = runtime.get("review_context")
        if not isinstance(context, dict):
            raise ReviewAidError(
                "Every embedded runtime entry must contain one canonical review_context."
            )
        runtime_by_identity[context_identity(context)].append(runtime)

    entries: list[dict[str, Any]] = []
    asset_hashes: dict[str, str] = {}
    for contract, context in manifest_four_card_rows(manifest):
        identity = context_identity(context)
        matching_runtime = runtime_by_identity.get(identity)
        if not matching_runtime:
            raise ReviewAidError(
                "The semantic manifest contains a four-card contract that does not match "
                f"the embedded runtime: {context.get('lesson_id')} {context.get('stage')} "
                f"{context.get('slide_id')} option {context.get('option_id')}."
            )
        runtime = matching_runtime.popleft()
        if not matching_runtime:
            runtime_by_identity.pop(identity, None)

        rendered_filename = normalized_text(context.get("rendered_filename")).strip()
        source_filename = normalized_text(context.get("source_filename")).strip()
        if not rendered_filename or not source_filename:
            raise ReviewAidError("Every four-card context requires source and rendered filenames.")
        if contract["filename"] != rendered_filename:
            raise ReviewAidError(
                f"Contract filename {contract['filename']!r} does not match effective runtime "
                f"filename {rendered_filename!r}."
            )
        if context.get("media_role") != "option" or not isinstance(context.get("is_correct"), bool):
            raise ReviewAidError(
                f"Four-card context for {rendered_filename!r} lacks an unambiguous option role."
            )

        if rendered_filename not in asset_hashes:
            asset_hashes[rendered_filename] = verified_asset_sha256(
                rendered_filename,
                canonical_root=canonical_root,
                mobile_root=mobile_root,
                frontend_root=frontend_root,
            )
        description = contract["description"]
        concept = contract["concept"]
        meaning = expected_option_meaning(concept, context.get("option_label"), description)
        entries.append(
            {
                "review_id": "",
                "source_filename": source_filename,
                "rendered_filename": rendered_filename,
                "asset_sha256": asset_hashes[rendered_filename],
                "contract_sha256": semantic_contract_sha256(contract),
                "contract": contract,
                "expected": {
                    "concept": concept,
                    "option_label": context.get("option_label"),
                    "meaning": meaning,
                    "contract_description": description,
                },
                "role": {
                    "media_role": context.get("media_role"),
                    "is_correct": context.get("is_correct"),
                    "option_id": context.get("option_id"),
                    "correct_option_id": context.get("correct_option_id"),
                },
                "context": {
                    "context_type": context.get("context_type"),
                    "lesson_id": context.get("lesson_id"),
                    "unit_id": context.get("unit_id"),
                    "sub_lesson_id": context.get("sub_lesson_id"),
                    "lesson_title": runtime.get("lesson_title", ""),
                    "card_index": runtime.get("card_index"),
                    "stage": context.get("stage"),
                    "slide_id": context.get("slide_id"),
                    "interaction_type": context.get("interaction_type"),
                    "prompt": context.get("prompt"),
                    "audio_text": context.get("audio_text"),
                    "answer_audio_text": context.get("answer_audio_text"),
                    "spanish_translation": context.get("spanish_translation"),
                    "render_profile": context.get("render_profile"),
                    "render_signature_sha256": context.get("render_signature_sha256"),
                    "viewport_width": context.get("viewport_width"),
                    "viewport_height": context.get("viewport_height"),
                    "resize_mode": context.get("resize_mode"),
                    "object_position": context.get("object_position"),
                },
            }
        )

    if runtime_by_identity:
        extra_count = sum(len(values) for values in runtime_by_identity.values())
        example_runtime = next(iter(runtime_by_identity.values()))[0]
        example = example_runtime["review_context"]
        raise ReviewAidError(
            f"The embedded runtime has {extra_count} four-card option uses missing from the "
            f"semantic manifest; first: {example.get('lesson_id')} {example.get('stage')} "
            f"{example.get('slide_id')} option {example.get('option_id')}."
        )

    entries.sort(
        key=lambda entry: (
            normalized_text(entry["rendered_filename"]),
            normalized_text(entry["context"]["lesson_id"]),
            int(entry["context"]["card_index"] or 0),
            normalized_text(entry["role"]["option_id"]),
        )
    )
    for index, entry in enumerate(entries, 1):
        entry["review_id"] = f"FC-{index:04d}"
    return entries


def review_packet(manifest_sha256: str, entries: list[dict[str, Any]]) -> dict[str, Any]:
    contracts: dict[str, dict[str, Any]] = {}
    packet_entries: list[dict[str, Any]] = []
    for entry in entries:
        contract_hash = entry["contract_sha256"]
        contract = entry["contract"]
        existing = contracts.setdefault(contract_hash, contract)
        if existing != contract:
            raise ReviewAidError(
                f"Contract hash collision or inconsistent contract data: {contract_hash}."
            )
        packet_entries.append({key: value for key, value in entry.items() if key != "contract"})
    return {
        "schema_version": 2,
        "kind": "human-review-aid",
        "authoritative_approval_record": False,
        "approval_recording": "forbidden",
        "warning": (
            "This packet is review evidence only. It does not approve media. Never record "
            "approval from a filename, prompt, hidden option ID, or other ambiguous label; "
            "review the expected meaning, full contract, role/context, exact effective file, "
            "and current hashes together."
        ),
        "source_manifest": MEDIA_MANIFEST_PATH.relative_to(ROOT).as_posix(),
        "source_manifest_sha256": manifest_sha256,
        "render_profile": FOUR_CARD_RENDER_PROFILE,
        "portrait_viewport": "4:5",
        "entry_count": len(entries),
        "contract_count": len(contracts),
        "unique_effective_asset_count": len(
            {entry["rendered_filename"] for entry in entries}
        ),
        "contracts": contracts,
        "entries": packet_entries,
    }


def wrap_label(text: object, width: int = 52, lines: int | None = None) -> list[str]:
    wrapped = textwrap.wrap(
        normalized_text(text),
        width=width,
        break_long_words=True,
        break_on_hyphens=True,
    ) or [""]
    if lines is None or len(wrapped) <= lines:
        return wrapped
    clipped = wrapped[:lines]
    clipped[-1] = (clipped[-1][:-3] if len(clipped[-1]) > 3 else "") + "..."
    return clipped


def review_entry_lines(entry: dict[str, Any]) -> list[str]:
    expected = entry["expected"]
    role = entry["role"]
    context = entry["context"]
    role_label = "CORRECT" if role["is_correct"] else "DISTRACTOR"
    location = (
        f"{context['lesson_id']} | card {int(context['card_index']) + 1} | "
        f"{context['stage']} {normalized_text(context['slide_id']) or '(no slide id)'}"
    )
    lines = [f"{entry['review_id']} | {role_label} {role['media_role']}"]
    lines.extend(wrap_label(f"source: {entry['source_filename']}"))
    lines.extend(wrap_label(f"effective: {entry['rendered_filename']}"))
    lines.extend(wrap_label(f"asset sha256: {entry['asset_sha256']}"))
    lines.extend(wrap_label(f"contract sha256: {entry['contract_sha256']}"))
    lines.extend(
        wrap_label(
            f"full contract: four-card-inventory.json contracts[{entry['contract_sha256']}]"
        )
    )
    lines.extend(wrap_label(f"expected: {expected['meaning']}"))
    lines.extend(wrap_label(f"contract: {expected['contract_description']}"))
    lines.extend(wrap_label(f"context: {location}"))
    lines.extend(
        wrap_label(
            f"role ids: option={role['option_id']} correct={role['correct_option_id']}"
        )
    )
    lines.extend(wrap_label(f"prompt: {context['prompt']}"))
    if normalized_text(context.get("audio_text")).strip():
        lines.extend(wrap_label(f"audio: {context['audio_text']}"))
    if normalized_text(context.get("answer_audio_text")).strip():
        lines.extend(wrap_label(f"answer audio: {context['answer_audio_text']}"))
    if normalized_text(context.get("spanish_translation")).strip():
        lines.extend(wrap_label(f"translation: {context['spanish_translation']}"))
    lines.extend(
        wrap_label(f"render signature: {context['render_signature_sha256']}")
    )
    return lines


def render_contact_sheets(
    entries: list[dict[str, Any]],
    output_root: Path,
    *,
    manifest_sha256: str,
    image_root: Path = MOBILE_IMAGE_ROOT,
) -> list[Path]:
    output_root.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    per_sheet = SHEET_COLUMNS * SHEET_ROWS
    sheet_paths: list[Path] = []
    for sheet_index in range(0, len(entries), per_sheet):
        page_entries = entries[sheet_index : sheet_index + per_sheet]
        page_line_count = max(len(review_entry_lines(entry)) for entry in page_entries)
        page_cell_height = max(
            CELL_SIZE[1],
            TILE_SIZE[1] + 8 + (page_line_count * 14) + 20,
        )
        sheet = Image.new(
            "RGB",
            (
                (SHEET_COLUMNS * CELL_SIZE[0]) + (SHEET_MARGIN * 2),
                (SHEET_ROWS * page_cell_height) + (SHEET_MARGIN * 2) + SHEET_HEADER_HEIGHT,
            ),
            "#f4efe7",
        )
        draw = ImageDraw.Draw(sheet)
        draw.text(
            (SHEET_MARGIN, SHEET_MARGIN),
            "REVIEW AID ONLY - DOES NOT RECORD APPROVAL",
            fill="#8c1d18",
            font=font,
        )
        draw.text(
            (SHEET_MARGIN, SHEET_MARGIN + 16),
            (
                "Check expected meaning + full contract + role/context + effective file/hash. "
                f"Manifest {manifest_sha256}"
            ),
            fill="#172126",
            font=font,
        )
        for page_offset, entry in enumerate(page_entries):
            row, column = divmod(page_offset, SHEET_COLUMNS)
            cell_x = SHEET_MARGIN + (column * CELL_SIZE[0])
            cell_y = SHEET_MARGIN + SHEET_HEADER_HEIGHT + (row * page_cell_height)
            source_path = image_root / entry["rendered_filename"]
            if not source_path.is_file():
                raise ReviewAidError(f"Missing effective four-card image: {source_path}")
            try:
                with Image.open(source_path) as opened:
                    crop = ImageOps.fit(
                        opened.convert("RGB"),
                        TILE_SIZE,
                        method=Image.Resampling.LANCZOS,
                        centering=(0.5, 0.5),
                    )
            except OSError as exc:
                raise ReviewAidError(
                    f"Cannot decode effective four-card image: {source_path}"
                ) from exc
            tile_x = cell_x + ((CELL_SIZE[0] - TILE_SIZE[0]) // 2)
            tile_y = cell_y
            sheet.paste(crop, (tile_x, tile_y))
            draw.rounded_rectangle(
                (
                    tile_x - 2,
                    tile_y - 2,
                    tile_x + TILE_SIZE[0] + 1,
                    tile_y + TILE_SIZE[1] + 1,
                ),
                radius=12,
                outline="#173038",
                width=3,
            )
            text_y = tile_y + TILE_SIZE[1] + 8
            for line in review_entry_lines(entry):
                draw.text((cell_x + 4, text_y), line, fill="#172126", font=font)
                text_y += 14
        page_number = (sheet_index // per_sheet) + 1
        sheet_path = output_root / f"four-card-crops-{page_number:02d}.png"
        sheet.save(sheet_path, "PNG")
        sheet_paths.append(sheet_path)
    return sheet_paths


def publish_review_aid(
    packet: dict[str, Any],
    entries: list[dict[str, Any]],
    output_root: Path,
    *,
    manifest_sha256: str,
    image_root: Path = MOBILE_IMAGE_ROOT,
) -> tuple[Path, list[Path]]:
    """Build a complete packet off-path, then publish it as one directory."""

    output_root = output_root.resolve()
    output_root.parent.mkdir(parents=True, exist_ok=True)
    staging_root = Path(
        tempfile.mkdtemp(
            prefix=f".{output_root.name}.staging-",
            dir=output_root.parent,
        )
    )
    backup_root: Path | None = None
    try:
        output_marker = {
            "schema_version": 1,
            "kind": OUTPUT_MARKER_KIND,
            "generator": OUTPUT_GENERATOR,
            "source_manifest_sha256": manifest_sha256,
            "entry_count": len(entries),
        }
        (staging_root / OUTPUT_MARKER_NAME).write_text(
            json.dumps(output_marker, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        staging_inventory = staging_root / "four-card-inventory.json"
        staging_inventory.write_text(
            json.dumps(packet, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        staging_sheets = render_contact_sheets(
            entries,
            staging_root,
            manifest_sha256=manifest_sha256,
            image_root=image_root,
        )

        if output_root.exists():
            if not output_root.is_dir():
                raise ReviewAidError(
                    f"Review-aid output path exists and is not a directory: {output_root}"
                )
            validate_owned_output_directory(output_root)
            backup_root = output_root.with_name(
                f".{output_root.name}.previous-{uuid.uuid4().hex}"
            )
            output_root.replace(backup_root)
        try:
            staging_root.replace(output_root)
        except OSError:
            if backup_root is not None and backup_root.exists() and not output_root.exists():
                backup_root.replace(output_root)
            raise

        inventory_path = output_root / staging_inventory.name
        sheet_paths = [output_root / path.name for path in staging_sheets]
        if backup_root is not None:
            shutil.rmtree(backup_root, ignore_errors=True)
        return inventory_path, sheet_paths
    finally:
        if staging_root.exists():
            shutil.rmtree(staging_root, ignore_errors=True)
        if backup_root is not None and backup_root.exists() and not output_root.exists():
            backup_root.replace(output_root)


def validate_owned_output_directory(output_root: Path) -> None:
    """Fail closed before replacing anything not owned by this generator."""

    marker_path = output_root / OUTPUT_MARKER_NAME
    try:
        marker = json.loads(marker_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReviewAidError(
            f"Refusing to replace unowned review-aid directory: {output_root}"
        ) from exc
    if (
        not isinstance(marker, dict)
        or marker.get("schema_version") != 1
        or marker.get("kind") != OUTPUT_MARKER_KIND
        or marker.get("generator") != OUTPUT_GENERATOR
    ):
        raise ReviewAidError(
            f"Refusing to replace unowned review-aid directory: {output_root}"
        )

    unknown_children = [
        child.name
        for child in output_root.iterdir()
        if not child.is_file()
        or (
            child.name not in {OUTPUT_MARKER_NAME, "four-card-inventory.json"}
            and SHEET_NAME_PATTERN.fullmatch(child.name) is None
        )
    ]
    if unknown_children:
        examples = ", ".join(sorted(unknown_children)[:3])
        raise ReviewAidError(
            f"Refusing to replace review-aid directory with unknown contents: {examples}"
        )


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Render contract-aware review aids for the exact 4:5 crops used by portrait "
            "four-image lesson grids. This command never records approval."
        )
    )
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_ROOT)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_argument_parser().parse_args(argv)
    if not args.output_dir.is_absolute():
        args.output_dir = (ROOT / args.output_dir).resolve()

    manifest_bytes = MEDIA_MANIFEST_PATH.read_bytes()
    manifest = json.loads(manifest_bytes)
    runtime_contexts = runtime_four_card_contexts()
    entries = build_review_entries(manifest, runtime_contexts)
    manifest_sha256 = hashlib.sha256(manifest_bytes).hexdigest()
    packet = review_packet(manifest_sha256, entries)

    inventory_path, sheets = publish_review_aid(
        packet,
        entries,
        args.output_dir,
        manifest_sha256=manifest_sha256,
    )
    print(
        f"Rendered {len(entries)} explicit four-card option contexts across "
        f"{packet['unique_effective_asset_count']} effective assets into "
        f"{len(sheets)} contact sheets."
    )
    print("Review aid only: no approval manifest was read or written.")
    print(inventory_path.relative_to(ROOT))
    for sheet in sheets:
        print(sheet.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
