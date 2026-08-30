from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

try:
    from scripts.a1_media_runtime_contracts import (
        REVIEW_CONTEXT_FIELDS,
        validate_review_context,
    )
except ModuleNotFoundError:  # Direct `python scripts/...` execution.
    from a1_media_runtime_contracts import REVIEW_CONTEXT_FIELDS, validate_review_context


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "product" / "a1-media-manifest.json"
REGISTRY = ROOT / "docs" / "qa" / "a1-media-semantic-approvals.json"
CANONICAL_ASSET_DIR = ROOT / "Lessons" / "Lesson1" / "images"

SCHEMA_VERSION = 3
MANIFEST_SCHEMA_VERSION = 3
CONTRACT_HASH_ALGORITHM = "sha256-canonical-json-v1"
ASSET_HASH_ALGORITHM = "sha256"
CONTRACT_FIELDS = (
    "filename",
    "concept",
    "description",
    "card_refs",
    "review_contexts",
)
VALID_DECISIONS = {"pending", "approved", "rejected"}


def canonical_json_bytes(value: object) -> bytes:
    """Serialize a semantic contract deterministically for hashing."""

    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def semantic_contract(asset: dict[str, Any]) -> dict[str, Any]:
    """Return and validate the manifest fields that require visual approval."""

    filename = asset.get("filename")
    concept = asset.get("concept")
    description = asset.get("description")
    card_refs = asset.get("card_refs")
    review_contexts = asset.get("review_contexts")
    if not isinstance(filename, str) or not filename:
        raise ValueError("filename must be a non-empty string")
    if Path(filename).name != filename:
        raise ValueError(f"filename must be a basename, got {filename!r}")
    if not isinstance(concept, str) or not concept:
        raise ValueError(f"concept for {filename!r} must be a non-empty string")
    if not isinstance(description, str) or not description:
        raise ValueError(f"description for {filename!r} must be a non-empty string")
    if not isinstance(card_refs, list) or any(
        not isinstance(card_ref, str) or not card_ref for card_ref in card_refs
    ):
        raise ValueError(f"card_refs for {filename!r} must be a list of non-empty strings")
    if not isinstance(review_contexts, list) or not review_contexts:
        raise ValueError(f"review_contexts for {filename!r} must be a non-empty list")
    normalized_contexts = []
    for index, review_context in enumerate(review_contexts, 1):
        try:
            normalized_contexts.append(validate_review_context(review_context))
        except ValueError as exc:
            raise ValueError(
                f"review_context {index} for {filename!r} is invalid: {exc}"
            ) from exc

    return {
        "filename": filename,
        "concept": concept,
        "description": description,
        "card_refs": list(card_refs),
        "review_contexts": normalized_contexts,
    }


def semantic_contract_sha256(contract: dict[str, Any]) -> str:
    return sha256_bytes(canonical_json_bytes(contract))


def load_json_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return payload


def existing_rows_by_contract(
    registry: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    if not registry:
        return {}
    approvals = registry.get("approvals", [])
    if not isinstance(approvals, list):
        raise ValueError("existing registry approvals must be a list")

    rows: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(approvals, 1):
        if not isinstance(row, dict):
            raise ValueError(f"existing approval row {index} must be an object")
        contract_sha256 = row.get("contract_sha256")
        if not isinstance(contract_sha256, str) or not contract_sha256:
            raise ValueError(f"existing approval row {index} has no contract_sha256")
        if contract_sha256 in rows:
            raise ValueError(
                f"existing registry has duplicate contract_sha256 {contract_sha256!r}"
            )
        rows[contract_sha256] = row
    return rows


def pending_row(contract: dict[str, Any], asset_sha256: str | None) -> dict[str, Any]:
    return {
        "contract_sha256": semantic_contract_sha256(contract),
        **contract,
        "asset_sha256": asset_sha256,
        "decision": "pending",
        "reviewer": None,
        "reviewed_at": None,
        "notes": "",
    }


def synchronized_registry(
    manifest: dict[str, Any],
    existing_registry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Synchronize contracts without ever granting semantic approval.

    An existing decision is retained only when its full canonical contract and
    exact asset bytes are unchanged. Any changed or new contract becomes pending.
    Obsolete rows are omitted so a subsequent validation cannot hide an orphan.
    """

    assets = manifest.get("assets")
    if manifest.get("schema_version") != MANIFEST_SCHEMA_VERSION:
        raise ValueError(
            f"manifest schema_version must be {MANIFEST_SCHEMA_VERSION}, got "
            f"{manifest.get('schema_version')!r}"
        )
    if not isinstance(assets, list):
        raise ValueError("manifest assets must be a list")
    existing_rows = existing_rows_by_contract(existing_registry)

    approvals: list[dict[str, Any]] = []
    seen_contracts: set[str] = set()
    for index, asset in enumerate(assets, 1):
        if not isinstance(asset, dict):
            raise ValueError(f"manifest asset {index} must be an object")
        contract = semantic_contract(asset)
        contract_sha256 = semantic_contract_sha256(contract)
        if contract_sha256 in seen_contracts:
            raise ValueError(
                f"manifest contains duplicate semantic contract {contract_sha256}"
            )
        seen_contracts.add(contract_sha256)

        asset_path = CANONICAL_ASSET_DIR / contract["filename"]
        asset_sha256 = sha256_file(asset_path) if asset_path.is_file() else None
        row = pending_row(contract, asset_sha256)
        existing = existing_rows.get(contract_sha256)
        if existing:
            existing_contract = {field: existing.get(field) for field in CONTRACT_FIELDS}
            unchanged_binding = (
                existing_contract == contract
                and existing.get("asset_sha256") == asset_sha256
                and existing.get("decision") in VALID_DECISIONS
            )
            if unchanged_binding:
                row["decision"] = existing.get("decision")
                row["reviewer"] = existing.get("reviewer")
                row["reviewed_at"] = existing.get("reviewed_at")
                row["notes"] = existing.get("notes", "")
        approvals.append(row)

    return {
        "schema_version": SCHEMA_VERSION,
        "manifest_schema_version": MANIFEST_SCHEMA_VERSION,
        "manifest_path": MANIFEST.relative_to(ROOT).as_posix(),
        "contract_hash_algorithm": CONTRACT_HASH_ALGORITHM,
        "asset_hash_algorithm": ASSET_HASH_ALGORITHM,
        "contract_fields": list(CONTRACT_FIELDS),
        "review_context_fields": list(REVIEW_CONTEXT_FIELDS),
        "approvals": approvals,
    }


def serialized_registry(registry: dict[str, Any]) -> str:
    return json.dumps(registry, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Create or synchronize the fail-closed A1 media semantic review registry. "
            "New or changed rows are always pending; this command never approves media."
        )
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail when the checked-in registry is not synchronized; do not write it.",
    )
    args = parser.parse_args()

    manifest = load_json_object(MANIFEST)
    existing = load_json_object(REGISTRY) if REGISTRY.is_file() else None
    synchronized = synchronized_registry(manifest, existing)
    rendered = serialized_registry(synchronized)

    if args.check:
        if not REGISTRY.is_file():
            print(f"Semantic review registry is missing: {REGISTRY.relative_to(ROOT)}")
            return 1
        if REGISTRY.read_text(encoding="utf-8") != rendered:
            print(
                "Semantic review registry is stale. Run "
                "python scripts/build_a1_media_semantic_review.py and review every pending row."
            )
            return 1
        print("A1 media semantic review registry is synchronized.")
        return 0

    REGISTRY.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY.write_text(rendered, encoding="utf-8")
    pending = sum(row["decision"] == "pending" for row in synchronized["approvals"])
    rejected = sum(row["decision"] == "rejected" for row in synchronized["approvals"])
    approved = sum(row["decision"] == "approved" for row in synchronized["approvals"])
    print(
        f"Wrote {REGISTRY.relative_to(ROOT)}: "
        f"{approved} approved, {pending} pending, {rejected} rejected."
    )
    if pending or rejected:
        print("Release remains blocked until every contract is visually approved.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
