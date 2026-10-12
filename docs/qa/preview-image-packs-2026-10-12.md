# Offline image packs for normal Preview updates

The approved Unit 6 candidate exceeded Expo's per-platform update limit: 1,042 assets including the launch bundle. The course's 1,059 required still filenames were all active; removing content was not an acceptable solution.

The mobile exporter now pins the unchanged WebP bytes, dimensions, hashes and ranges in `mobile/src/generated/bundled-image-packs.json`. Metro builds 64 binary packs from those reviewed source files. Filename hashing keeps unrelated packs stable; parts are bounded at 8 MiB. The generated packs total 289,110,636 bytes. They are ordinary bundled update assets, not new network-only media.

The existing Expo 57 Asset and FileSystem modules prepare readable local pack URIs before course rendering. The synchronous resolver reads only the requested byte range, verifies the extracted file, atomically installs it in a content-addressed cache, and returns the original dimensions. Cache eviction or corruption is repaired from the installed packs. Background image preparation remains independent of dialogue playback. No dependency, native configuration, app version, lesson, approved recording or source picture changed.

Verification:

- All 650 backend tests and the complete mobile Preview preflight passed; the updated renderer contract tests also passed.
- Android and iOS release exports each contain **113 assets including the bundle**, with all 64 packs included. The normal 1,000-asset fail-closed publication check passes and now also runs during Android preflight.
- The production resolver round-trips all 1,059 images against both the canonical and mobile files. Startup reads no image bytes into JavaScript memory; repeated rendering reuses verified extractions.
- Tests cover normalized option variants and dimensions, missing cache directories, deleted files, same-size corruption, interrupted partial files, corrupt ranges, disk-write failures, handle cleanup, concurrent preparation, retry and stale build indexes.
- Exporter/validator coverage still requires every current lesson, dialogue, mission and course-browser image. Existing direct video/poster/mascot assets remain bundled.
- Release-authority tests retain the exact 1,000/1,001 boundary on both platforms and reject a single-platform export at publication.

Preview device review: install the ordinary OTA through Settings → Actualizar, check the new commit label, open Unit 6 and an earlier lesson, then check their pictures in airplane mode. The automated file-system adapter exercises the Expo 57 API contract; it is not a physical-device UI test.
