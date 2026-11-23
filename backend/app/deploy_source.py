"""Name the main commit the running backend was built from.

Render deploys the slim render-deploy branch written by
scripts/render_deploy_copy.py, so its RENDER_GIT_BRANCH and RENDER_GIT_COMMIT
describe that copy rather than main. The copy carries deploy-source.json with
the exact main commit it was made from. The record is trusted only on the branch
it was written for; otherwise Render's own values are reported unchanged, and
the release guard (which requires branch main) fails closed.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

DEPLOY_SOURCE_PATH = Path(__file__).resolve().parents[1] / "deploy-source.json"
_COMMIT = re.compile(r"[0-9a-f]{40}")


def deployed_identity(path: Path | None = None) -> dict[str, str | None]:
    path = path or DEPLOY_SOURCE_PATH
    branch = os.getenv("RENDER_GIT_BRANCH", "").strip() or None
    commit = os.getenv("RENDER_GIT_COMMIT", "").strip().lower() or None
    identity = {
        "git_branch": branch,
        "git_commit": commit,
        "deploy_branch": branch,
        "deploy_commit": commit,
    }
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return identity
    if not isinstance(record, dict) or not branch or record.get("deploy_branch") != branch:
        return identity
    source_branch = str(record.get("source_branch") or "").strip()
    source_commit = str(record.get("source_commit") or "").strip().lower()
    if not source_branch or not _COMMIT.fullmatch(source_commit):
        return identity
    return {**identity, "git_branch": source_branch, "git_commit": source_commit}
