# Lesson 1.10 M16: one seated target

The user approved correcting the remaining ambiguous scene before releasing the
already-integrated written pronunciation answers. M16 now has three standing men
(drinking, eating and reading) and exactly one seated, empty-handed man. All four
English clues and existing speech bytes remain unchanged.

The built-in image generation tool edited the previous scene into a full-body
3:2 composition. The new versioned filename prevents a cached old scene from
remaining under the active image URL. The old source is preserved. Generation
prompt, exact image hash and observed posture evidence are in
`mission-m16-posture-review.json`; this is an agent-assisted Preview review, not
human Production approval.

## Verification

- All four people, defining actions, standing legs and the sole seated posture
  were visually inspected in the new source and actual web/mobile presentations.
- Reviewed head anchors keep all four dots above their intended people.
- Nine target placement/interaction tests pass, including all 74 listening
  targets, seven viewport sizes, face/touch-bound separation, shuffle contracts,
  and a new exact-image-bound M16 unique-clue regression.
- The regression checks the active image URL as well as its bytes; a review of
  an unused old file can no longer satisfy the placement audit.
- Actual mobile presentation via React Native Web: fresh runs at 393x852 and
  568x320, font scale 1.3, all four dots, wrong-answer recovery and complete-scene
  submission passed with no bounds, minimum-touch-size or image-fit failures.
- Actual web component with compiled scoped styles was visually inspected at
  393x852 and 568x320. The whole scene and all four markers fit in both views.
- Full mobile Preview preflight passed, including TypeScript, native Yoga
  regressions, curriculum/audio contracts, pronunciation lifecycle and production
  Android bundle export.
- Backend: 267 tests passed. Frontend: 14 tests and Next production build passed.
- Only M16 changes in canonical lesson content. The 70-lesson, seven-unit course
  remains intact; M19-22 written answers from the prior change remain intact.

## Audio and release

The image-bound IDs for the four unchanged English cues were refreshed. Two
existing registry takes were rebound and two existing approved static seeds retain
their identical text/mode/voice keys. No new speech was generated. The immutable
catalog still contains 4,946 assets (3,948 registry and 998 legacy seeds), exported
from content commit `e7c0b08ef5a3ace8e430202e75bb9e7052381463`.

This resolves the M16 scene-specific hold recorded in
`mission-written-answer-2026-09-08.md`. Preview still requires the protected main
workflow, an exact-main backend with the matching complete audio catalog, and
post-publication verification of both Expo platform commit IDs.

The browser adapter uses deterministic audio callbacks, not a live phone speaker
or microphone. Physical-device playback and visual review remain necessary in
Preview. Existing pending human semantic reviews remain pending; no Production
approval or promotion is implied.
