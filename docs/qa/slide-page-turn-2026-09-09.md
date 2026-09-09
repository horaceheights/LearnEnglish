# Lesson slide page turns

The existing `chapter-arrival-v2.mp3` cue now accompanies actual slide changes in ordinary lessons and missions. The incoming activity turns into place over 520 ms. The same activity tree settles without changing its layout or media framing. Feedback retains its existing review interval; the transition finishes and cancels its sound before prompt or pronunciation playback starts.

Verification:

- Complete Preview preflight passed: video and lesson validation, static effects, course audio, TypeScript, interaction regressions, native Yoga regressions, and Android production bundle export.
- 19 focused transition/audio/pronunciation tests passed. Both production page-turn hooks were exercised with a deterministic clock: duplicate navigation, forward/backward arrival, reduced stimulation, rotation, backgrounding, unmount, bounded sound cancellation, and speech gating. Two consecutive Speak startup effects wait for the dedicated autoplay gate without showing an app-interruption state.
- All 15 frontend tests and the production web build passed; 62 backend lesson tests passed after incorporating the concurrent construction rollout.
- Browser QA used the real LessonPlayer with canonical Lesson 1.1 Recognize cards in a temporary local fixture. Four consecutive correct selections advanced to the expected cards. Checked settled two-image, sentence-choice, and four-image cards at desktop, 390x844 portrait, 844x390 landscape, and 768x1024 tablet sizes. Removed the fixture afterward.
- Existing pending human semantic-media reviews remain Preview advisories. No media approvals were changed. Android/iOS hardware playback and the perceived page-turn sound/animation still require review in the protected Preview app; browser checks and an Android export are not on-device evidence.

Incorporated PR #127 from `main` commit `70ad078` after reviewing its construction components/content. Its new web word-width measurement originally used transformed visual bounds; changed that measurement to layout widths so a turning page cannot make a long construction choose the wrong layout. Added a regression guard. Page turns keep the existing single activity tree. Both tasks record the same standing recent-commit/conflict-review rule in the same documentation locations without duplicating it.
