"""Guardrails for the slim render-deploy copy (scripts/render_deploy_copy.py).

Render clones only the tip of its branch and gives up when the clone stalls, so
it deploys a copy of main that holds just the files the backend reads. These
tests keep that copy complete, keep it naming the exact main commit, and keep the
backend reporting that commit to the release guard.
"""

import hashlib
import json
import os
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml
from fastapi.testclient import TestClient

from backend.app import deploy_source, main
from scripts import render_deploy_copy as copy

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "backend" / "app"
WORKFLOW = ROOT / ".github" / "workflows" / "render-deploy-copy.yml"

# Repository paths that backend/app names but never reads while serving.
# They are left out of the deploy copy on purpose.
NOT_DEPLOYED = {
    "Lessons/Lesson1/images": "LESSON_IMAGE_DIR is read only by backend/tests",
}


def repository_paths_named_by_backend() -> dict[str, str]:
    """Map every ROOT / "..." path in backend/app to the file naming it."""
    found: dict[str, str] = {}
    for source_path in sorted(APP.glob("*.py")):
        source = source_path.read_text(encoding="utf-8")
        roots = re.findall(
            r"^(\w+)\s*=\s*Path\(__file__\)\.resolve\(\)\.parents\[2\]\s*$", source, re.M
        )
        for name in roots:
            pattern = rf"\b{name}\s*((?:/\s*[\"'][^\"']+[\"']\s*)+)"
            for match in re.finditer(pattern, source):
                parts = re.findall(r"[\"']([^\"']+)[\"']", match.group(1))
                found.setdefault("/".join(parts), source_path.name)
    return found


class BackendRuntimePathTests(unittest.TestCase):
    def test_repository_root_is_only_reached_through_named_constants(self):
        for source_path in sorted(APP.glob("*.py")):
            source = source_path.read_text(encoding="utf-8")
            named = re.findall(
                r"^\w+\s*=\s*Path\(__file__\)\.resolve\(\)\.parents\[2\]\s*$", source, re.M
            )
            self.assertEqual(
                source.count("parents[2]"),
                len(named),
                f"{source_path.name} reaches the repository root without a named constant; "
                "the deploy-copy path check cannot see what it reads.",
            )

    def test_deploy_copy_holds_every_repository_path_the_backend_reads(self):
        named = repository_paths_named_by_backend()
        self.assertIn("docs/product/course-audio-upload-manifest.json", named)
        for path, source_file in named.items():
            covered = any(path == kept or path.startswith(kept + "/") for kept in copy.DEPLOY_PATHS)
            self.assertTrue(
                covered or path in NOT_DEPLOYED,
                f"backend/app/{source_file} reads {path}, which the Render deploy copy leaves out. "
                "Add it to DEPLOY_PATHS in scripts/render_deploy_copy.py.",
            )

    def test_paths_left_out_of_the_copy_are_not_read_while_serving(self):
        uses = sum(
            source.count("LESSON_IMAGE_DIR")
            for source in (path.read_text(encoding="utf-8") for path in APP.glob("*.py"))
        )
        self.assertEqual(1, uses, "LESSON_IMAGE_DIR must stay a test-only constant.")

    def test_main_never_carries_the_deploy_record(self):
        self.assertEqual(copy.DEPLOY_SOURCE_PATH, f"backend/{deploy_source.DEPLOY_SOURCE_PATH.name}")
        self.assertFalse(deploy_source.DEPLOY_SOURCE_PATH.exists())
        self.assertIn("/backend/deploy-source.json", (ROOT / ".gitignore").read_text(encoding="utf-8"))


class DeployedIdentityTests(unittest.TestCase):
    def identity(self, record, branch="render-deploy", commit="c" * 40):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "deploy-source.json"
            if record is not None:
                path.write_text(record if isinstance(record, str) else json.dumps(record), encoding="utf-8")
            env = {"RENDER_GIT_BRANCH": branch, "RENDER_GIT_COMMIT": commit}
            with patch.dict(os.environ, env, clear=False):
                return deploy_source.deployed_identity(path)

    def record(self, **overrides):
        return {
            "deploy_branch": "render-deploy",
            "source_branch": "main",
            "source_commit": "A" * 40,
            **overrides,
        }

    def test_copy_reports_the_main_commit_it_was_made_from(self):
        self.assertEqual(
            {
                "git_branch": "main",
                "git_commit": "a" * 40,
                "deploy_branch": "render-deploy",
                "deploy_commit": "c" * 40,
            },
            self.identity(self.record()),
        )

    def test_a_record_for_another_branch_is_ignored(self):
        identity = self.identity(self.record(), branch="main", commit="b" * 40)
        self.assertEqual(("main", "b" * 40), (identity["git_branch"], identity["git_commit"]))

    def test_malformed_records_fall_back_to_render_values(self):
        for record in ("{not json", json.dumps(["main"]), self.record(source_commit="abc123"),
                       self.record(source_branch="")):
            identity = self.identity(record)
            self.assertEqual(("render-deploy", "c" * 40), (identity["git_branch"], identity["git_commit"]))

    def test_without_a_record_render_values_are_reported(self):
        identity = self.identity(None, branch="main", commit="B" * 40)
        self.assertEqual(("main", "b" * 40), (identity["git_branch"], identity["git_commit"]))

    def test_release_status_reports_main_commit_from_the_copy(self):
        ready_audio = {"ready": True}
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "deploy-source.json"
            path.write_text(json.dumps(self.record()), encoding="utf-8")
            env = {
                "APP_ENVIRONMENT": "production",
                "RENDER_GIT_BRANCH": "render-deploy",
                "RENDER_GIT_COMMIT": "c" * 40,
            }
            with TestClient(main.app) as client, patch.object(
                deploy_source, "DEPLOY_SOURCE_PATH", path
            ), patch.dict(os.environ, env, clear=False), patch.object(
                main.cloudflare_media, "release_status", return_value=ready_audio
            ):
                body = client.get("/api/release/status").json()
        self.assertEqual("production", body["environment"])
        self.assertEqual(("main", "a" * 40), (body["git_branch"], body["git_commit"]))
        self.assertEqual(("render-deploy", "c" * 40), (body["deploy_branch"], body["deploy_commit"]))


class FakeGitHub:
    """In-memory Git object store with the GitHub client's interface."""

    def __init__(self):
        self.objects: dict[str, tuple[str, object]] = {}
        self.refs: dict[str, str] = {}
        self.count = 0

    def _store(self, kind, payload):
        # Content-addressed like git: identical files and trees keep their ids.
        self.count += 1
        identity = [kind, payload, self.count if kind == "commit" else None]
        sha = hashlib.sha1(json.dumps(identity, sort_keys=True).encode("utf-8")).hexdigest()
        self.objects[sha] = (kind, payload)
        return sha

    def write_files(self, files: dict[str, str]) -> str:
        entries, nested = [], {}
        for path, text in files.items():
            head, _, rest = path.partition("/")
            if rest:
                nested.setdefault(head, {})[rest] = text
            else:
                entries.append({"path": head, "mode": "100644", "type": "blob", "sha": self._store("blob", text)})
        for name, children in nested.items():
            entries.append({"path": name, "mode": "040000", "type": "tree", "sha": self.write_files(children)})
        return self._store("tree", sorted(entries, key=lambda entry: entry["path"]))

    def commit_files(self, files, parents=()):
        sha = self._store("commit", {"tree": self.write_files(files), "parents": list(parents), "message": ""})
        self.refs["main"] = sha
        return sha

    def files(self, tree: str, prefix: str = "") -> dict[str, str]:
        out = {}
        for entry in self.tree(tree):
            path = prefix + entry["path"]
            if entry["type"] == "tree":
                out.update(self.files(entry["sha"], path + "/"))
            else:
                out[path] = entry["sha"]
        return out

    # The GitHub client's interface.
    def ref(self, branch):
        return self.refs.get(branch)

    def commit_tree(self, commit):
        return self.objects[commit][1]["tree"]

    def tree(self, sha):
        kind, entries = self.objects[sha]
        assert kind == "tree"
        return [dict(entry) for entry in entries]

    def blob_text(self, sha):
        return self.objects[sha][1]

    def create_blob(self, text):
        return self._store("blob", text)

    def create_tree(self, entries, base_tree=None):
        merged = {entry["path"]: entry for entry in (self.tree(base_tree) if base_tree else [])}
        for entry in entries:
            assert "/" not in entry["path"], "trees are built one level at a time"
            merged[entry["path"]] = dict(entry)
        return self._store("tree", sorted(merged.values(), key=lambda entry: entry["path"]))

    def create_commit(self, message, tree, parents):
        return self._store("commit", {"tree": tree, "parents": list(parents), "message": message})

    def create_ref(self, branch, sha):
        assert branch not in self.refs
        self.refs[branch] = sha

    def update_ref(self, branch, sha):
        assert self.refs[branch] in self.objects[sha][1]["parents"], "the copy only moves forward"
        self.refs[branch] = sha


MAIN_FILES = {
    "backend/app/main.py": "app",
    "backend/requirements.txt": "fastapi",
    "docs/product/course-audio-upload-manifest.json": "{}",
    "docs/product/project-guardrails.md": "rules",
    "frontend/lib/courseAudioManifest.json": "{}",
    "frontend/lib/adminApi.js": "js",
    "frontend/public/audio-cache/hello.mp3": "mp3",
    "frontend/public/lesson-assets/cat.webp": "webp",
    "Lessons/Lesson1/images/source.png": "png",
    "mobile/app.json": "{}",
}


class RenderDeployCopyPublisherTests(unittest.TestCase):
    def publish(self, api, commit, **options):
        messages = []
        result = copy.publish(api, "owner/repo", commit, log=messages.append, **options)
        return result, messages

    def test_copy_holds_only_deployed_files_and_names_main(self):
        api = FakeGitHub()
        source = api.commit_files(MAIN_FILES)
        deployed, _ = self.publish(api, source)

        self.assertEqual(deployed, api.refs["render-deploy"])
        self.assertEqual([], api.objects[deployed][1]["parents"])
        copied = api.files(api.commit_tree(deployed))
        original = api.files(api.commit_tree(source))
        self.assertEqual(
            {
                "backend/app/main.py",
                "backend/deploy-source.json",
                "backend/requirements.txt",
                "docs/product/course-audio-upload-manifest.json",
                "frontend/lib/courseAudioManifest.json",
                "frontend/public/audio-cache/hello.mp3",
            },
            set(copied),
        )
        for path, blob in copied.items():
            if path != "backend/deploy-source.json":
                self.assertEqual(original[path], blob, f"{path} must reuse main's object")
        record = json.loads(api.blob_text(copied["backend/deploy-source.json"]))
        self.assertEqual(source, record["source_commit"])
        self.assertEqual(("main", "render-deploy"), (record["source_branch"], record["deploy_branch"]))
        self.assertEqual(set(copy.DEPLOY_PATHS), set(record["content"]))

    def test_unchanged_deployed_files_keep_the_earlier_copy(self):
        api = FakeGitHub()
        first = api.commit_files(MAIN_FILES)
        deployed, _ = self.publish(api, first)

        mobile_only = api.commit_files({**MAIN_FILES, "mobile/app.json": '{"v": 2}'}, [first])
        skipped, messages = self.publish(api, mobile_only)
        self.assertIsNone(skipped)
        self.assertEqual(deployed, api.refs["render-deploy"])
        self.assertIn(first[:12], messages[-1])

        backend_change = api.commit_files({**MAIN_FILES, "backend/app/main.py": "app v2"}, [mobile_only])
        redeployed, _ = self.publish(api, backend_change)
        self.assertEqual([deployed], api.objects[redeployed][1]["parents"])
        record_blob = api.files(api.commit_tree(redeployed))["backend/deploy-source.json"]
        self.assertEqual(backend_change, json.loads(api.blob_text(record_blob))["source_commit"])

    def test_legacy_audio_changes_redeploy(self):
        api = FakeGitHub()
        first = api.commit_files(MAIN_FILES)
        self.publish(api, first)
        audio = api.commit_files({**MAIN_FILES, "frontend/public/audio-cache/bye.mp3": "mp3"}, [first])
        self.assertIsNotNone(self.publish(api, audio)[0])

    def test_force_republishes_unchanged_files(self):
        api = FakeGitHub()
        source = api.commit_files(MAIN_FILES)
        first, _ = self.publish(api, source)
        again, _ = self.publish(api, source, force=True)
        self.assertNotEqual(first, again)
        self.assertEqual(again, api.refs["render-deploy"])

    def test_a_commit_that_is_no_longer_main_is_not_published(self):
        api = FakeGitHub()
        old = api.commit_files(MAIN_FILES)
        api.commit_files({**MAIN_FILES, "backend/app/main.py": "newer"}, [old])
        self.assertIsNone(self.publish(api, old)[0])
        self.assertNotIn("render-deploy", api.refs)

    def test_main_moving_during_the_build_leaves_the_copy_alone(self):
        api = FakeGitHub()
        source = api.commit_files(MAIN_FILES)
        reads = iter([source, "f" * 40])
        api.ref = lambda branch, real=api.ref: next(reads) if branch == "main" else real(branch)
        self.assertIsNone(self.publish(api, source)[0])
        self.assertNotIn("render-deploy", api.refs)

    def test_a_missing_deployed_path_stops_the_copy(self):
        api = FakeGitHub()
        files = {path: text for path, text in MAIN_FILES.items() if "audio-cache" not in path}
        source = api.commit_files(files)
        with self.assertRaises(LookupError):
            self.publish(api, source)
        self.assertNotIn("render-deploy", api.refs)

    def test_only_full_commit_ids_are_accepted(self):
        with self.assertRaises(ValueError):
            copy.publish(FakeGitHub(), "owner/repo", "abc123")


class RenderDeployCopyConfigurationTests(unittest.TestCase):
    def test_every_main_push_runs_the_publisher_serially(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertRegex(source, r"on:\s*\n\s*push:\s*\n\s*branches:\s*\n\s*- main")
        self.assertRegex(source, r"concurrency:\s*\n\s*group: render-deploy-copy\s*\n\s*cancel-in-progress: false")
        self.assertRegex(source, r"permissions:\s*\n\s*contents: write")
        self.assertIn("if: github.ref == 'refs/heads/main'", source)
        self.assertIn('scripts/render_deploy_copy.py --repository "$GITHUB_REPOSITORY" --source-commit "$GITHUB_SHA"', source)
        self.assertIn("filter: blob:none", source)
        self.assertNotRegex(source, r"git\s+push|--force-with-lease|force: true")

    def test_render_blueprint_deploys_the_copy_from_backend(self):
        service = yaml.safe_load((ROOT / "render.yaml").read_text(encoding="utf-8"))["services"][0]
        self.assertEqual(copy.DEPLOY_BRANCH, service["branch"])
        self.assertEqual("backend", service["rootDir"])
        self.assertEqual("backend", copy.DEPLOY_PATHS[0])


if __name__ == "__main__":
    unittest.main()
