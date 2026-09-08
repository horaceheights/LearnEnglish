# Lesson 1.10 — independent phone landscape

## Scope and cause

Portrait was approved and is preserved. Native landscape previously stacked the full lesson header and Engine QA toolbar above a game that also allocated a control rail. The resulting short scene slot forced small imagery and congested overhead markers. A width-under-760 compact-header threshold also excluded wider landscape phones.

The listening game now receives the full safe-area height. One landscape panel contains navigation, mission/beat progress, concise directions, current cue/replay, and success/retry feedback. An options sheet retains the existing QA toolbar and help. Portrait styles, image bytes, authored head anchors, placement algorithm, English audio, shuffle, scoring, and voice gates are unchanged. Rotation preserves the mounted game and audio player.

## Verification

- `mission-phone-landscape.test.cjs`: outer-shell ownership and mode scope, 18 scenes at six phone landscape sizes from 568x320 through 932x430, conservative safe-area allowances, uncropped image sizing, minimum 48dp markers, and stable card/cue identity. Wired into protected interaction verification.
- Existing 74-target placement/collision/shuffle/audio checks pass. All 59 backend lesson-structure tests pass. Mobile TypeScript passes.
- Browser QA renders the actual `MissionGameSurface.tsx` and `MissionLandscapeHeader.tsx` through a temporary React Native Web adapter, with 24px side/bottom safe-area allowances. All 18 scenes at 568x320 and 844x390, with 1.3x text, pass visible button, instruction/feedback, image framing, and target-overlap bounds. The adapter uses the real reviewed scene bytes and placement code; icons, reduced motion, audio callbacks, and outer safe-area wrapper are test adapters, not native-device evidence.
- The six-target family scene accepts every target and submits `correct`. Rotating after a solved target retains the exact cue index, solved count, and permutation.
- No curriculum, image, sound, native dependency, Expo configuration, or Production change.

## Device review

Preview remains the physical Android/iOS verification surface. Check regular learner and Engine QA entry, smallest phone landscape, rotate mid-clue and after a correct answer, every group capsule, replay, long feedback, and return from the options sheet. Confirm portrait remains as approved. Browser-rendered native components do not constitute a physical-device pass or human image approval.
