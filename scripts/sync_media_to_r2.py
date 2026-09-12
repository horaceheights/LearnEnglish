#!/usr/bin/env python3
"""Publish lesson media to the R2 bucket that serves it.

Dry run (default -- uploads nothing, just reports):
    python scripts/sync_media_to_r2.py

Upload:
    python scripts/sync_media_to_r2.py --apply

Credentials are read from the environment, falling back to backend/.env:
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET. The S3
endpoint is derived from the account id; MEDIA_BASE_URL is the public hostname
and is only recorded in the manifest.

Object keys mirror the URL paths the application already uses, so
`/lesson-assets/boy.webp` is stored at key `lesson-assets/boy.webp` and the
resolver only has to prepend the base URL.

The upload is idempotent: each object carries its SHA-256 as user metadata, and
a file whose digest already matches is skipped. Re-running after adding a
handful of lessons therefore costs a few HEAD requests rather than a re-upload.

Writes docs/product/media-upload-manifest.json, which is what CI checks against
once frontend/public stops being a committed mirror.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "backend" / ".env"
MANIFEST_PATH = ROOT / "docs" / "product" / "media-upload-manifest.json"

# Source directory -> key prefix. These mirror the paths the app requests today,
# which is what lets the resolver be a pure prefix swap.
TREES = [
    (ROOT / "frontend" / "public" / "lesson-assets", "lesson-assets"),
    (ROOT / "frontend" / "public" / "audio-cache", "audio-cache"),
    (ROOT / "frontend" / "public" / "sfx", "sfx"),
]

# Long max-age because every application URL carries a ?v= cache-bust already.
CACHE_CONTROL = "public, max-age=31536000, immutable"

REQUIRED = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")


def load_env(path: Path) -> dict[str, str]:
    """Process environment wins; backend/.env fills the gaps.

    CI and the deploy hosts set real environment variables, and a git worktree
    has no backend/.env at all since it is untracked -- so the file is a
    developer convenience rather than the source of truth.
    """
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            match = re.match(r"^([A-Za-z0-9_]+)=(.*)$", line.strip())
            if match:
                env[match.group(1)] = match.group(2).strip().strip('"').strip("'")
    for key in (*REQUIRED, "MEDIA_BASE_URL"):
        from_process = os.environ.get(key)
        if from_process:
            env[key] = from_process
    missing = [key for key in REQUIRED if not env.get(key)]
    if missing:
        sys.exit(
            "missing credentials: " + ", ".join(missing)
            + f"\nset them in the environment or in {path}"
        )
    return env


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def content_type_for(path: Path) -> str:
    # mimetypes does not know these two, and serving a video as
    # application/octet-stream breaks seeking in Safari.
    suffix = path.suffix.lower()
    if suffix == ".webp":
        return "image/webp"
    if suffix == ".m4a":
        return "audio/mp4"
    guessed, _ = mimetypes.guess_type(path.name)
    return guessed or "application/octet-stream"


def collect() -> list[tuple[Path, str]]:
    items: list[tuple[Path, str]] = []
    for directory, prefix in TREES:
        if not directory.exists():
            print(f"  note: {directory.relative_to(ROOT)} does not exist, skipping")
            continue
        for path in sorted(directory.rglob("*")):
            if path.is_file():
                relative = path.relative_to(directory).as_posix()
                items.append((path, f"{prefix}/{relative}"))
    return items


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="perform the upload")
    parser.add_argument("--force", action="store_true", help="re-upload even when the digest matches")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    bucket = env["R2_BUCKET"]

    try:
        import boto3
        from botocore.config import Config
        from botocore.exceptions import ClientError
    except ImportError:
        sys.exit("boto3 is required: python -m pip install boto3")

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4", region_name="auto"),
    )

    items = collect()
    total_bytes = sum(path.stat().st_size for path, _ in items)
    print(f"bucket   {bucket}")
    print(f"mode     {'APPLY -- will upload' if args.apply else 'dry run -- nothing uploaded'}")
    print(f"local    {len(items)} files, {total_bytes / 1048576:.2f} MB\n")

    uploaded = skipped = failed = 0
    uploaded_bytes = 0
    manifest: dict[str, dict[str, object]] = {}

    for index, (path, key) in enumerate(items, start=1):
        digest = sha256_of(path)
        size = path.stat().st_size
        manifest[key] = {"sha256": digest, "bytes": size}

        if not args.force:
            try:
                head = client.head_object(Bucket=bucket, Key=key)
                if head.get("Metadata", {}).get("sha256") == digest:
                    skipped += 1
                    manifest[key]["state"] = "present"
                    continue
            except ClientError as error:
                if error.response["Error"]["Code"] not in ("404", "NoSuchKey", "NotFound"):
                    raise

        if not args.apply:
            manifest[key]["state"] = "would-upload"
            uploaded += 1
            uploaded_bytes += size
            continue

        try:
            client.put_object(
                Bucket=bucket,
                Key=key,
                Body=path.read_bytes(),
                ContentType=content_type_for(path),
                CacheControl=CACHE_CONTROL,
                Metadata={"sha256": digest},
            )
            uploaded += 1
            uploaded_bytes += size
            manifest[key]["state"] = "uploaded"
        except ClientError as error:
            failed += 1
            manifest[key]["state"] = "failed"
            print(f"  FAILED {key}: {error.response['Error'].get('Message')}")

        if index % 100 == 0:
            print(f"  {index}/{len(items)}...")

    verb = "would upload" if not args.apply else "uploaded"
    print(f"\n{verb}: {uploaded} files, {uploaded_bytes / 1048576:.2f} MB")
    print(f"already present: {skipped}")
    if failed:
        print(f"failed: {failed}")

    if args.apply and not failed:
        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "schema_version": 1,
            "bucket": bucket,
            "base_url": env.get("MEDIA_BASE_URL", ""),
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "cache_control": CACHE_CONTROL,
            "object_count": len(manifest),
            "objects": {key: {"sha256": value["sha256"], "bytes": value["bytes"]}
                        for key, value in sorted(manifest.items())},
        }
        MANIFEST_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"manifest: {MANIFEST_PATH.relative_to(ROOT)} ({len(manifest)} objects)")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
