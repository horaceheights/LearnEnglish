# Repository Hygiene

`origin/main` is the sole integration and release source. Task branches merge only into `main`; shared release branches are not created or retained.

## Start of work

1. Fetch remote refs.
2. Run `powershell -File scripts/audit-repository-hygiene.ps1`.
3. Confirm the primary checkout is on an up-to-date local `main` unless an explicit recovery is underway.
4. Create new task branches from the refreshed `origin/main`.
5. Inspect dirty files before switching a checkout or reusing a worktree.

## End of work

The user's standing approval (2026-10-11) makes cleanup part of every completed task; do not ask again for routine cleanup within these boundaries. A local commit or a pushed task branch is not enough: the work must be integrated into refreshed `origin/main`.

1. Commit only the task's files, verify the change, and merge its pull request after required checks pass. GitHub automatically deletes the remote pull-request branch.
2. Fetch `origin/main` and confirm the task's commits are reachable from it. Check the task is no longer running and the worktree has no tracked or untracked changes. For squash/rebase merges, investigate and preserve the original commits before considering removal; a closed PR alone does not prove a local checkout is safe.
3. Inspect ignored files separately with `git status --short --ignored=matching`. A clean Git status does not protect ignored databases, `.env` configuration, original generated media, or other local-only data. Preserve anything unique outside the worktree, verify the backup, and record its location. Reinstallable task-local dependencies and identified build caches need no backup. Do not follow junctions or symlinks into shared dependencies when removing a checkout.
4. Name the exact paths and refs, then remove the inactive task worktree, including its disposable dependencies/caches/exports. Prefer Codex's worktree archive action for attached managed worktrees, after preserving required ignored files. For other registered worktrees use `git -c core.longpaths=true worktree remove <absolute-path>`; do not use force as routine cleanup. On Windows validate the resolved target stays under the intended worktree root before any recursive file operation. Only remove an empty task parent after inspecting it.
5. Delete fully merged local task branches and any surviving fully merged remote task branches. Preserve branches still used by another checkout or containing unmerged work. Recheck the actual remote before deleting stale remote-tracking refs.
6. Run `powershell -File scripts/audit-repository-hygiene.ps1` again and review completed worktree findings, including detached checkouts. `-FailOnFindings` exits nonzero for unresolved findings. The audit is read-only: a cleanup candidate is not permission to delete an active checkout or unreviewed ignored data.
7. Return the primary checkout to an up-to-date local `main` when it can be updated without changing unrelated work. If pending user changes prevent that, preserve them and report the remaining recovery requirement.
8. Report what was removed, the space reclaimed, the location of preserved local data, and any worktrees retained because they are active, dirty, or unmerged. Do not delete Codex session history or unrelated generated artifacts as task cleanup.

## Recovery and destructive cleanup

- A dirty worktree or unmerged branch is evidence, not trash. Review it against `origin/main` and preserve local-only work in a clearly named commit or tag before removal.
- Before deleting or overwriting anything, state the exact branches, worktrees, or generated paths affected.
- Generated dependencies, caches, logs, and validation exports may be regenerated, but they must still be identified before deletion when they are part of a dirty worktree.
- Do not use force-pushes, hard resets, or bulk deletion as routine cleanup.
- Keep archive tags only for genuinely local-only snapshots; record why they exist and revisit them after the useful content is integrated.

## Published-state boundary

Branch and worktree housekeeping does not authorize an Expo Preview or Production update. Both destinations publish only through their protected GitHub Actions workflows from the exact protected `main` head; follow [mobile release rules](../../mobile/RELEASE.md) when release work is explicitly in scope.
