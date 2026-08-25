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
- Run `scripts/audit-repository-hygiene.ps1` at the start and end of branch, recovery, or release work.
- After a task is integrated, remove its clean worktree and delete its fully merged local and remote task branches. Never remove a dirty worktree or an unmerged branch until its local-only state is reviewed and preserved in a named commit or tag.
- Do not force-push, rewrite, prune, or discard repository state without first naming the exact affected refs or paths to the user.

# Release workflow

- After completing and verifying an OTA-compatible mobile change, commit only the files that belong to the current task and push the task branch to `origin`.
- Never publish Expo Preview directly from a task branch, local checkout, temporary worktree, or stale branch. In particular, never invoke `eas update`, `npx eas-cli update`, or `mobile/scripts/publish-preview.ps1` as a local fallback.
- The shared Preview channel may be published only by the protected GitHub Actions workflow from the exact remote head of `release/preview`. Move an approved change onto that branch only after the release-integrity checks pass and the branch still contains the current canonical release.
- Treat a successful CI Preview publication as the default final step. If the protected workflow, environment, or CI credential is unavailable, stop after pushing the verified task branch and report the blocked release; do not bypass the release authority.
- Preview release checks must fail closed unless the candidate preserves the versioned course fingerprint, exactly 70 lessons in seven units of ten, the release-commit label, and the current canonical ancestry. The published EAS update commit must be verified against the GitHub commit after publication.
- Never publish or promote to Production without explicit user approval after Preview testing.
- Preserve unrelated working-tree changes. If they prevent the clean-tree release guard from passing, publish from a clean temporary worktree at the pushed commit.
- Native dependency, Expo configuration, permission, native-module, or app-version changes require a new Preview build instead of an OTA update.
