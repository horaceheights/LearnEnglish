# Project memory

- Before changing curriculum, lesson behavior, shared UI, audio, pronunciation, media, or deployment code, read `PROJECT_GUARDRAILS.md` and the relevant section of `COURSE_DESIGN_A1.md`.
- Treat `PROJECT_GUARDRAILS.md` as the durable product memory across tasks. Do not silently replace an established behavior with a new pattern because a new lesson is being added.
- When the user approves a new reusable standard or changes an existing one, update `PROJECT_GUARDRAILS.md` in the same commit. Add or update an automated guardrail when the rule can be tested.
- If a request conflicts with an existing guardrail, call out the conflict before implementation and let the newest explicit user decision control.

# Release workflow

- After completing and verifying an OTA-compatible mobile change, commit only the files that belong to the current task, push the current branch to `origin`, and publish the update to Expo's `preview` channel with `mobile/scripts/publish-preview.ps1`.
- Treat Preview publishing as the default final step; do not wait for a separate request.
- Never publish or promote to Production without explicit user approval after Preview testing.
- Preserve unrelated working-tree changes. If they prevent the clean-tree release guard from passing, publish from a clean temporary worktree at the pushed commit.
- Native dependency, Expo configuration, permission, native-module, or app-version changes require a new Preview build instead of an OTA update.
