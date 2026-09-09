# Project memory

- Before changing curriculum, lesson behavior, shared UI, audio, pronunciation, media, or release code, read `docs/product/project-guardrails.md` and the relevant section of `docs/product/course-design-a1.md`.
- Treat `docs/product/project-guardrails.md` as durable product memory. Inspect existing behavior and usages before replacing an established pattern.
- Use `docs/planning/roadmap.md` for priorities, `docs/qa/` for verification, and `docs/operations/` plus `mobile/RELEASE.md` for deployment and release work. Start with `docs/README.md` when unsure.
- When the user approves a reusable standard or changes an existing one, update the project guardrails in the same commit and add or update an automated guardrail when practical.
- If a request conflicts with an existing guardrail, call out the conflict before implementation and let the newest explicit user decision control.
- Do not refactor unrelated code while completing a task. Report unrelated problems separately unless they prevent completion.
- Before implementing a fix, check earlier fixes and guardrails for conflicts or regression risk; challenge contradictory fixes before changing behavior.
- Preserve unrelated working-tree changes. Never stage, revert, overwrite, or discard them.

# Repository hygiene

- Treat `origin/main` as the canonical integration line and keep the primary checkout on an up-to-date local `main` when no recovery operation is in progress.
- Start task branches from a freshly fetched `origin/main`; do not continue new work on a stale feature or release worktree.
- Assume other coding tasks may be running concurrently. Use an isolated branch/worktree, inspect active worktrees and overlapping files before editing, and preserve unrelated changes. Every task branch must target a pull request into current `main`; release branches are not part of the workflow. Before merging or publishing, refresh `origin/main` and rerun the applicable checks. If overlapping changes cannot be combined safely, stop and ask the user. Never publish a stale snapshot.
- Run `scripts/audit-repository-hygiene.ps1` at the start and end of branch, recovery, or release work.
- After a task is integrated into `main`, remove its clean worktree and delete its fully merged local and remote task branches. Remote pull-request branches should also be deleted automatically on merge. Never remove a dirty worktree or an unmerged branch until its local-only state is reviewed and preserved in a named commit or tag.
- Do not force-push, rewrite, prune, or discard repository state without first naming the exact affected refs or paths to the user.

- Before every push, merge, or Preview publication, fetch `origin/main`, inspect commits added since the task base, and review overlapping files for both textual and behavioral conflicts. Combine current `main` into the task branch and rerun the applicable checks when it has advanced. Recheck immediately before merging; never treat an earlier clean merge or green check on a stale base as sufficient. Stop only if an overlap cannot be resolved safely.

# Release workflow

- After completing and verifying a change, commit only the files that belong to the current task, push the task branch, open a pull request into `main`, and merge only after its required checks pass.
- Never publish Expo Preview or Production directly from a task branch, local checkout, temporary worktree, or stale branch. In particular, never invoke `eas update`, `npx eas-cli update`, `mobile/scripts/publish-preview.ps1`, or `mobile/scripts/promote-preview.ps1` as a local fallback.
- `origin/main` is the sole mobile release authority. The shared Preview and Production channels may be changed only by their protected GitHub Actions workflows from the exact remote head of protected `main`; no release branch is created or retained.
- Treat a successful CI Preview publication as the default final step. If the protected workflow, environment, or CI credential is unavailable, stop after pushing the verified task branch and report the blocked release; do not bypass the release authority.
- Release checks must fail closed unless the exact `main` candidate preserves the versioned course fingerprint, exactly 70 lessons in seven units of ten, and the release-commit label. The published EAS update commit must be verified against the GitHub commit after publication.
- Never publish or promote to Production without explicit user approval after testing the exact same commit in Preview. Production republishes that immutable tested Preview group rather than building different local content.
- Preserve unrelated working-tree changes. If they prevent the clean-tree release guard from passing, publish from a clean temporary worktree at the pushed commit.
- Native dependency, Expo configuration, permission, native-module, or app-version changes require a new Preview build instead of an OTA update.
