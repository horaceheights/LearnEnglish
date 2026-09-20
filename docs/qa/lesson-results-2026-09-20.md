# Lesson results and error recovery

Scope: the shared end-of-lesson flow on native and web, cumulative error review, durable results, and the existing survey's removal from that flow. No lesson cards, authored media bindings, native dependencies or course fingerprint changed.

## Verified behavior

- A five-activity browser run with two first-attempt errors finishes at 60%. Error review contains only those two activities; the first correction shows 80% and leaves the second activity available. Completing both shows 100% and “Resultado después del repaso”.
- The same production web player was exercised against the real local API and an isolated SQLite database. After the first correction the database retained `score=3`, `review_score=4`, `total_cards=5`. Reloading and reopening resumed only the unresolved second activity at 80%. Completing it reached 100% without changing the original score.
- Reopening a completed result preserves the grade. “Continuar” moved from the 1.10 fixture to the canonical `lesson-2-1-places-around-me` and displayed UNIT 2 / LESSON 2.1. “Salir” displayed the approved mascot and exact farewell, then returned to the course menu on web.
- Browser checks covered portrait at 390×844 and 320×640, plus landscape at 844×390. The small portrait result remains vertically scrollable with full-size buttons. Fixed a landscape mascot sizing issue found during visual inspection. The initial production build and all 18 web regression tests passed.
- Native production TSX is measured through the existing Yoga harness at 320×640, 390×844, 844×390 and 1024×768, for failing, passing and perfect results. All 13 checks pass, including minimum action sizes, horizontal fit, unclipped text and disabled navigation when saving fails.
- Shared result/outbox tests cover duplicate recovery, immutable initial grades, inclusive 80%, display rounding, ungraded pronunciation, separate fresh attempts, keeping a previous pass, stale sync acknowledgements, unavailable storage, and restoration by run ID.
- Backend tests cover additive migration, offline creation, delayed session starts and legacy finishes, idempotent correction unions, learner identity, immutable grades, pending speech, exact threshold display and prior-pass retention. The complete backend suite passed 384 tests before the additional rounding test; the final tracking subset includes that extra case.

## Audio and platform review

The two ElevenLabs UI generation attempts returned no audio files or visible balance change. The user explicitly authorized the second 52-credit attempt. The implementation therefore uses the existing reviewed `mission-finale-v2.mp3`, unchanged, as a provisional passing cue. No new provider variation was selected or silently substituted. A later successful generation must present every returned variation for user choice.

Mission narrative finales precede the common result; the previous separate finale trigger is removed to prevent duplicate celebration music. Decorative cues stop in the background and respect mute/reduced stimulation. The result's percentage and copy carry the outcome without sound or animation.

Android's farewell calls `BackHandler.exitApp()` after saving and the farewell interval; screen-reader users receive an explicit exit action. iOS and web return to the course menu. Installed-device animation/audio/exit behavior still needs review in the protected Preview build; the automated native checks and Android export do not replace that device review. Production was not requested.
