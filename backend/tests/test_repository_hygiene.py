"""Exercise cleanup classification against real, disposable Git worktrees."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


POWERSHELL = shutil.which("pwsh") or shutil.which("powershell")
AUDIT = Path(__file__).resolve().parents[2] / "scripts" / "audit-repository-hygiene.ps1"


@unittest.skipUnless(POWERSHELL and shutil.which("git"), "Git and PowerShell required")
class RepositoryHygieneTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="repository-hygiene-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.repo = self.root / "primary"
        self.repo.mkdir()
        self.env = os.environ.copy()
        for key in tuple(self.env):
            if key.startswith("GIT_"):
                self.env.pop(key)
        self.env.update({"GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull})
        self.git(self.repo, "init", "-b", "main")
        self.git(self.repo, "config", "user.name", "Hygiene test")
        self.git(self.repo, "config", "user.email", "hygiene@example.invalid")
        (self.repo / ".gitignore").write_text("local-data/\n", encoding="utf-8")
        (self.repo / "source.txt").write_text("committed\n", encoding="utf-8")
        self.git(self.repo, "add", ".")
        self.git(self.repo, "commit", "-m", "baseline")
        self.git(self.repo, "update-ref", "refs/remotes/origin/main", "HEAD")

    def git(self, cwd, *args):
        return subprocess.run(
            ["git", "-C", str(cwd), *args], check=True, capture_output=True,
            text=True, encoding="utf-8", env=self.env,
        ).stdout.strip()

    def worktree(self, name="task", branch=None):
        path = self.root / name
        mode = ["-b", branch] if branch else ["--detach"]
        self.git(self.repo, "worktree", "add", *mode, str(path), "origin/main")
        return path

    def audit(self, cwd=None):
        return subprocess.run(
            [POWERSHELL, "-NoProfile", "-File", str(AUDIT), "-FailOnFindings"],
            cwd=cwd or self.repo, capture_output=True, text=True,
            encoding="utf-8", errors="replace", env=self.env,
        )

    def test_primary_checkout_alone_is_never_a_cleanup_candidate(self):
        result = self.audit()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("primary/main checkout; keep", result.stdout)
        self.assertIn("Completed worktrees requiring cleanup review: 0", result.stdout)

    def test_integrated_detached_worktree_fails_final_audit(self):
        task = self.worktree()
        result = self.audit(cwd=task)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("(detached) - clean; integrated; cleanup candidate", result.stdout)
        self.assertIn("Completed worktrees requiring cleanup review: 1", result.stdout)
        self.assertTrue((task / "source.txt").exists(), "Audit must not delete files")

    def test_integrated_branch_worktree_is_also_reported(self):
        self.worktree(branch="codex/completed")
        result = self.audit()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("codex/completed - clean; integrated; cleanup candidate", result.stdout)

    def test_dirty_and_untracked_worktrees_are_preserved(self):
        dirty = self.worktree("dirty")
        untracked = self.worktree("untracked")
        (dirty / "source.txt").write_text("unfinished\n", encoding="utf-8")
        (untracked / "new-lesson.txt").write_text("original\n", encoding="utf-8")
        result = self.audit()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("dirty (1 paths); preserve", result.stdout)
        self.assertIn("Completed worktrees requiring cleanup review: 0", result.stdout)
        self.assertEqual((dirty / "source.txt").read_text(), "unfinished\n")
        self.assertTrue((untracked / "new-lesson.txt").exists())

    def test_unmerged_detached_commit_is_preserved(self):
        task = self.worktree()
        (task / "source.txt").write_text("local-only\n", encoding="utf-8")
        self.git(task, "commit", "-am", "unmerged work")
        result = self.audit()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("1 unmerged commits; preserve", result.stdout)
        self.assertIn("Completed worktrees requiring cleanup review: 0", result.stdout)

    def test_ignored_local_data_is_visible_but_never_deleted(self):
        task = self.worktree()
        (task / "local-data").mkdir()
        database = task / "local-data" / "learner.db"
        database.write_bytes(b"irreplaceable local state")
        result = self.audit()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("Ignored local paths: 1; inspect and preserve unique data", result.stdout)
        self.assertEqual(database.read_bytes(), b"irreplaceable local state")

    def test_locked_worktree_is_preserved(self):
        task = self.worktree()
        self.git(self.repo, "worktree", "lock", "--reason", "in use", str(task))
        result = self.audit()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("locked worktree; keep", result.stdout)
        self.assertIn("Completed worktrees requiring cleanup review: 0", result.stdout)


if __name__ == "__main__":
    unittest.main()
