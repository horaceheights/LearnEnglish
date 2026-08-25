# Repository Hygiene

`origin/main` is the canonical integration line. The protected `release/preview` branch is a separate release authority and repository cleanup must not move it or publish an update.

## Start of work

1. Fetch remote refs.
2. Run `powershell -File scripts/audit-repository-hygiene.ps1`.
3. Confirm the primary checkout is on an up-to-date local `main` unless an explicit recovery is underway.
4. Create new task branches from the refreshed `origin/main`.
5. Inspect dirty files before switching a checkout or reusing a worktree.

## End of work

1. Commit only the task's files and verify the intended change.
2. Integrate through a normal merge or cherry-pick; never force-push shared history.
3. Run the hygiene audit again.
4. Remove clean task worktrees after their commits are integrated.
5. Delete fully merged task branches locally and remotely when they no longer serve an active review.
6. Return the primary checkout to an up-to-date local `main`.

## Recovery and destructive cleanup

- A dirty worktree or unmerged branch is evidence, not trash. Review it against `origin/main` and preserve local-only work in a clearly named commit or tag before removal.
- Before deleting or overwriting anything, state the exact branches, worktrees, or generated paths affected.
- Generated dependencies, caches, logs, and validation exports may be regenerated, but they must still be identified before deletion when they are part of a dirty worktree.
- Do not use force-pushes, hard resets, or bulk deletion as routine cleanup.
- Keep archive tags only for genuinely local-only snapshots; record why they exist and revisit them after the useful content is integrated.

## Published-state boundary

Branch and worktree housekeeping does not authorize an Expo update, Preview promotion, Production promotion, deployment, or a change to `release/preview`. Follow [mobile release rules](../../mobile/RELEASE.md) only when release work is explicitly in scope.
