# Lesson slide page turns

The existing `chapter-arrival-v2.mp3` cue now accompanies actual slide changes in ordinary lessons and missions. The incoming activity turns into place over 520 ms. The same activity tree settles without changing its layout or media framing. Feedback retains its existing review interval; the transition finishes and cancels its sound before prompt or pronunciation playback starts.

Verification:

- Complete Preview preflight passed: video and lesson validation, static effects, course audio, TypeScript, interaction regressions, native Yoga regressions, and Android production bundle export.
- 17 focused transition/audio tests passed. Both production page-turn hooks were exercised with a deterministic clock: duplicate navigation, forward/backward arrival, reduced stimulation, rotation, backgrounding, unmount, bounded sound cancellation, and speech gating.
- All 14 frontend tests and the production web build passed; 61 backend lesson tests passed.
- Browser QA used the real LessonPlayer with canonical Lesson 1.1 Recognize cards in a temporary local fixture. Four consecutive correct selections advanced to the expected cards. Checked settled two-image, sentence-choice, and four-image cards at desktop, 390x844 portrait, 844x390 landscape, and 768x1024 tablet sizes. Removed the fixture afterward.
- Existing pending human semantic-media reviews remain Preview advisories. No media approvals were changed. Android/iOS hardware playback and the perceived page-turn sound/animation still require review in the protected Preview app; browser checks and an Android export are not on-device evidence.

Before pushing, reviewed concurrent PR #127. Its runtime changes are in sentence construction components/content; page turns wrap the existing single activity tree and do not replace those components. Both tasks record the same standing recent-commit/conflict-review rule in the same documentation locations.
