#!/usr/bin/env python3
"""Publish the slim branch that Render deploys the shared backend from.

Render shallow-clones the tip of its branch and abandons a clone when GitHub
sends less than 100 KB/s for three minutes. The tip of main carries several
gigabytes of lesson media that the backend never reads, so those clones began
failing in November 2026. This script copies only DEPLOY_PATHS from an exact
main commit into DEPLOY_BRANCH through the GitHub Git Data API: it reuses the
objects main already stored, so nothing is cloned or uploaded except one small
record, backend/deploy-source.json, naming that main commit. The backend reports
that commit as its git_commit, so the release guard keeps comparing the running
service with origin/main.

When the deployed content is unchanged, no new copy is published; Render keeps
running the earlier main commit, which the release guard already accepts when its
backend files are identical (the same behavior Render's rootDir filter had).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Callable

SOURCE_BRANCH = "main"
DEPLOY_BRANCH = "render-deploy"
DEPLOY_SOURCE_NAME = "deploy-source.json"
DEPLOY_SOURCE_PATH = f"backend/{DEPLOY_SOURCE_NAME}"

# Every repository path the backend reads at runtime. Render runs from backend/
# (rootDir), but backend/app also reads these files through the repository root.
# backend/tests/test_render_deploy_copy.py fails when backend/app starts reading
# a repository path that this list does not cover.
DEPLOY_PATHS = (
    "backend",
    "docs/product/course-audio-upload-manifest.json",
    "frontend/lib/courseAudioManifest.json",
    "frontend/public/audio-cache",
)

TREE_MODE = "040000"
BLOB_MODE = "100644"
_COMMIT = re.compile(r"[0-9a-f]{40}")


class GitHub:
    """The handful of Git Data API calls the copy needs."""

    def __init__(self, repository: str, token: str, api: str = "https://api.github.com"):
        self.repository = repository
        self.token = token
        self.api = api.rstrip("/")

    def _request(self, method: str, path: str, body: dict | None = None, allow_missing: bool = False):
        request = urllib.request.Request(
            f"{self.api}/repos/{self.repository}/{path}",
            method=method,
            data=None if body is None else json.dumps(body).encode("utf-8"),
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "render-deploy-copy",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if allow_missing and error.code == 404:
                return None
            detail = error.read().decode("utf-8", "replace")[:500]
            raise RuntimeError(f"GitHub {method} {path} failed with HTTP {error.code}: {detail}") from error

    def ref(self, branch: str) -> str | None:
        data = self._request("GET", f"git/ref/heads/{branch}", allow_missing=True)
        return None if data is None else data["object"]["sha"].lower()

    def commit_tree(self, commit: str) -> str:
        return self._request("GET", f"git/commits/{commit}")["tree"]["sha"]

    def tree(self, sha: str) -> list[dict]:
        data = self._request("GET", f"git/trees/{sha}")
        if data.get("truncated"):
            raise RuntimeError(f"GitHub truncated tree {sha}; refusing a partial copy.")
        return data["tree"]

    def blob_text(self, sha: str) -> str:
        data = self._request("GET", f"git/blobs/{sha}")
        return base64.b64decode(data["content"]).decode("utf-8")

    def create_blob(self, text: str) -> str:
        return self._request("POST", "git/blobs", {"content": text, "encoding": "utf-8"})["sha"]

    def create_tree(self, entries: list[dict], base_tree: str | None = None) -> str:
        body: dict = {"tree": entries}
        if base_tree:
            body["base_tree"] = base_tree
        return self._request("POST", "git/trees", body)["sha"]

    def create_commit(self, message: str, tree: str, parents: list[str]) -> str:
        return self._request("POST", "git/commits", {"message": message, "tree": tree, "parents": parents})["sha"]

    def create_ref(self, branch: str, sha: str) -> None:
        self._request("POST", "git/refs", {"ref": f"refs/heads/{branch}", "sha": sha})

    def update_ref(self, branch: str, sha: str) -> None:
        # Never force: the copy only ever moves forward from its previous tip.
        self._request("PATCH", f"git/refs/heads/{branch}", {"sha": sha, "force": False})


def resolve(api, root_tree: str, path: str) -> dict:
    """Return the mode, type and object id that main stores at path."""
    entries = api.tree(root_tree)
    parts = path.split("/")
    for index, part in enumerate(parts):
        match = next((entry for entry in entries if entry["path"] == part), None)
        if match is None:
            raise LookupError(f"{path} is missing from the source tree.")
        if index == len(parts) - 1:
            return {"mode": match["mode"], "type": match["type"], "sha": match["sha"]}
        if match["type"] != "tree":
            raise LookupError(f"{'/'.join(parts[: index + 1])} is not a directory.")
        entries = api.tree(match["sha"])
    raise LookupError(f"Empty path: {path!r}")


def build_tree(api, entries: dict[str, dict]) -> str:
    """Create nested trees bottom-up from {path: {mode, type, sha}}."""
    direct: dict[str, dict] = {}
    nested: dict[str, dict[str, dict]] = {}
    for path, entry in entries.items():
        head, _, rest = path.partition("/")
        if rest:
            nested.setdefault(head, {})[rest] = entry
        else:
            direct[head] = entry
    items = [{"path": name, **entry} for name, entry in direct.items()]
    for name, children in nested.items():
        if name in direct:
            raise ValueError(f"{name} is listed both as a path and as a parent directory.")
        items.append({"path": name, "mode": TREE_MODE, "type": "tree", "sha": build_tree(api, children)})
    return api.create_tree(sorted(items, key=lambda item: item["path"]))


def deploy_source_record(repository: str, source_commit: str, content: dict[str, str]) -> str:
    record = {
        "content": content,
        "deploy_branch": DEPLOY_BRANCH,
        "schema": 1,
        "source_branch": SOURCE_BRANCH,
        "source_commit": source_commit,
        "source_repository": repository,
    }
    return json.dumps(record, indent=2, sort_keys=True) + "\n"


def previous_record(api, deploy_tip: str | None) -> dict | None:
    if not deploy_tip:
        return None
    try:
        entry = resolve(api, api.commit_tree(deploy_tip), DEPLOY_SOURCE_PATH)
    except LookupError:
        return None
    try:
        record = json.loads(api.blob_text(entry["sha"]))
    except ValueError:
        return None
    return record if isinstance(record, dict) else None


def publish(api, repository: str, source_commit: str, force: bool = False,
            log: Callable[[str], None] = print) -> str | None:
    """Publish the copy of source_commit; return the new deploy commit or None."""
    source_commit = source_commit.strip().lower()
    if not _COMMIT.fullmatch(source_commit):
        raise ValueError(f"Source commit must be a full 40-character SHA, not {source_commit!r}.")
    if api.ref(SOURCE_BRANCH) != source_commit:
        log(f"{SOURCE_BRANCH} has moved past {source_commit[:12]}; the run for the newer commit publishes.")
        return None

    root = api.commit_tree(source_commit)
    resolved = {path: resolve(api, root, path) for path in DEPLOY_PATHS}
    if resolved["backend"]["type"] != "tree":
        raise LookupError("backend is not a directory.")
    content = {path: entry["sha"] for path, entry in resolved.items()}

    deploy_tip = api.ref(DEPLOY_BRANCH)
    previous = previous_record(api, deploy_tip)
    if previous and previous.get("content") == content and not force:
        log(
            f"Deployed files are unchanged since {SOURCE_BRANCH} {str(previous.get('source_commit'))[:12]}; "
            f"{DEPLOY_BRANCH} stays at {deploy_tip[:12]}."
        )
        return None

    record_blob = api.create_blob(deploy_source_record(repository, source_commit, content))
    backend_tree = api.create_tree(
        [{"path": DEPLOY_SOURCE_NAME, "mode": BLOB_MODE, "type": "blob", "sha": record_blob}],
        base_tree=resolved["backend"]["sha"],
    )
    entries = dict(resolved)
    entries["backend"] = {"mode": TREE_MODE, "type": "tree", "sha": backend_tree}
    tree = build_tree(api, entries)
    message = (
        f"Deploy backend from {SOURCE_BRANCH} {source_commit[:12]}\n\n"
        f"Source: https://github.com/{repository}/commit/{source_commit}\n"
        f"Paths: {', '.join(DEPLOY_PATHS)}\n"
    )
    commit = api.create_commit(message, tree, [deploy_tip] if deploy_tip else [])

    if api.ref(SOURCE_BRANCH) != source_commit:
        log(f"{SOURCE_BRANCH} moved while the copy was built; the run for the newer commit publishes.")
        return None
    if deploy_tip:
        api.update_ref(DEPLOY_BRANCH, commit)
    else:
        api.create_ref(DEPLOY_BRANCH, commit)
    log(f"{DEPLOY_BRANCH} -> {commit[:12]} (copy of {SOURCE_BRANCH} {source_commit[:12]}).")
    return commit


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repository", required=True, help="owner/name")
    parser.add_argument("--source-commit", required=True, help="exact main commit to copy")
    parser.add_argument("--force", action="store_true", help="publish even when the deployed files are unchanged")
    args = parser.parse_args(argv)
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        parser.error("GITHUB_TOKEN is required.")
    publish(GitHub(args.repository, token), args.repository, args.source_commit, force=args.force)
    return 0


if __name__ == "__main__":
    sys.exit(main())
