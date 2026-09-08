# Lesson 1.10 overhead targets, selection sound, and cue shuffle

Scope: 18 listening scenes / 74 targets. The four speaking gates, story order,
image bytes, and all immutable English audio assets remain unchanged.

## Evidence

- Reviewed crown positions on all 18 canonical 1536x1024 scenes; individual and
  group membership is recorded in scripts/mission-head-anchors.json and exported
  through the canonical lesson schema.
- The existing target-placement test still binds each scene to its exact image
  SHA-256. The new interaction test checks all 74 head-anchor sets.
- Automated geometry checks cover 296/328/388px portrait, 400/650px short landscape,
  and 760/960px tablet slots: full 3:2 image, visible 48px minimum hit areas,
  no overlapping hit areas, and no marker intersecting the reviewed face regions.
- Browser inspection of the actual CelebrationMission component covered portrait
  and landscape, including the overlapping individual/group age scene and the
  babies/children scene. The latter moves the foreground group capsule slightly
  right, with two exact head pointers, to avoid the babies behind them.
- Browser interaction completed a four-target scene in order [2,1,0,3], including
  rapid double taps. Found count was exactly four, completion was correct, the
  person-found sound emitted playing/ended, and page overflow was false.
- Cue permutations were tested across 30 runs per listening scene. Each retained
  every cue exactly once, matching authored English audio indices, and preserved
  the first guided example. Replay/resize do not recreate the permutation.
- Full mobile interaction guards and TypeScript passed locally. All 13 frontend
  tests and 102 backend mission/delivery/audio tests passed before the added
  head-anchor schema regression (also checked separately).

## Release boundary

The browser exercise is a component fixture, not a claim of physical Android/iOS
playback verification. The protected release workflow must still verify the exact
main candidate and publish Preview. Phone review of that update remains required;
no pending human image-review approval is changed by these automated checks.
