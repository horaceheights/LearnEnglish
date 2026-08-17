# Release workflow

- After completing and verifying an OTA-compatible mobile change, commit only the files that belong to the current task, push the current branch to `origin`, and publish the update to Expo's `preview` channel with `mobile/scripts/publish-preview.ps1`.
- Treat Preview publishing as the default final step; do not wait for a separate request.
- Never publish or promote to Production without explicit user approval after Preview testing.
- Preserve unrelated working-tree changes. If they prevent the clean-tree release guard from passing, publish from a clean temporary worktree at the pushed commit.
- Native dependency, Expo configuration, permission, native-module, or app-version changes require a new Preview build instead of an OTA update.
