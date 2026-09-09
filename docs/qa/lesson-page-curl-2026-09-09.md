# Curved lesson page turn — 2026-09-09

The user's follow-up replaces the rigid incoming tilt with a visibly bending outgoing page. Both clients use the same cylindrical geometry, shaded reverse face, direction, and 720 ms duration. The next activity is revealed underneath. Lesson 1.10's approved `chapter-arrival-v2.mp3` remains the cue.

Mobile captures only the activity view with Expo-compatible `react-native-view-shot` 5.1.0, displays clipped portions of the same temporary image, and deletes it after the turn. The animation runs with the native driver. Web renders one temporary canvas; it may draw existing cross-origin media locally but never serializes or uploads that canvas. Neither client mounts another active lesson or microphone.

Navigation waits for capture readiness. Capture failure/timeout advances once, late results are discarded, duplicate navigation is rejected, and unmount cannot advance a departed lesson. Sound starts with the visible curl and stops before the next prompt or pronunciation startup. Reduced motion skips capture and effects. Backgrounding or rotation ends the decorative surface without replaying it. Settled media bounds and construction word measurements remain unchanged.

## Verification

- Full mobile Preview preflight: course/media validation, 4,946 immutable audio assets and receipts, static SFX, TypeScript, interaction tests, native Yoga checks, and Android production export passed. Existing Preview-only human media review advisories remain.
- Backend lesson tests: 62 passed.
- Focused geometry, capture lifecycle, pronunciation, audio recovery, and sound checks passed; release authority tests also verify both native build platforms and archive exclusions.
- Browser: actual LessonPlayer with canonical lesson 1.1 Recognize cards, isolated `testMode` fixture. Success advances produced exactly one curl each, then removed the overlay, retained one live activity, and restored input. Frozen production-renderer frames show forward and reverse curvature with actual lesson photos. Observed captures were 113–359 ms on this desktop. These measurements do not establish native device performance.
- Settled two- and four-option layouts were inspected at desktop, 390×844 phone portrait, 844×390 phone landscape, and 768×1024 tablet sizes. The established web landscape scrolling remains unchanged. The temporary fixture is removed before release.
- Frontend tests: 15 passed. Next.js production build passed with the temporary QA route removed.

## Native Preview delivery

Version 1.7.0 requires new native Preview installations. The protected `publish-preview.yml` workflow adds `delivery: native-build`, uses the existing exact-main/course/backend gates, builds both internal Preview platforms, and checks each build's commit, version, runtime, channel, and result. Git metadata is retained; the archive includes only mobile. The app's commit label also reads the immutable native build commit. No local publication or Production promotion is used.

The release-identity manifest pins the reviewed publisher and commit-label changes, including the new native commit/runtime checks. Its complete-course baseline, catalog hash, seven-unit topology, and lesson counts are unchanged. A real-repository integrity test complements the synthetic rejection fixtures so local preflight also catches stale identity bindings.

Final device review must cover curl smoothness and capture latency on the installed Android/iOS builds, video-backed slides, section/back navigation, consecutive Speak cards, and interruption by rotation/backgrounding. A JavaScript export and browser inspection do not replace these native checks.
