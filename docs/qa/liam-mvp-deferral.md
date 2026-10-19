# Liam deferred after MVP — 2026-10-19

The user asked to remove the optional Liam conversation review to focus on shipping the MVP, preserving it for a later phase.

## Change

- The shared client rollout in `mobile/src/lessonPractice.ts` is empty. Both the native/web course menus and their saved lesson results already use this gate, so neither surface mounts a Liam practice session.
- The local HTML prototype, avatar and review implementation are retained. Re-enabling or expanding the feature requires a new explicit decision.
- The card tutor, canonical lessons, course audio, results and learner progress are unchanged. Existing authenticated backend routes remain compatible with older clients; users must install the updated Preview to remove the old entries.

## Verification

- The practice regression suite passes. It checks absence from menus and results for every lesson in the bundled canonical course, plus missing/future lesson metadata, while retaining prototype feedback and portrait checks.
- Source inspection confirmed that native `CourseScreen` and `LessonResultScreen`, and web `LessonPlayer` and `LessonResultScreen`, use the shared gate.
- Full `npm run verify:preview` passed, including TypeScript, course/media/audio integrity, interaction and native-layout suites, and the production Android export/asset limit. Existing human media-review advisories remain unchanged.
- The web production build (`npm run build` in `frontend`) passed.
- Physical-device acceptance remains pending: after installing the published Preview, open Unit 1 and a saved final-lesson result; neither should show a Liam card. Ordinary lesson navigation and the existing card tutor should remain available.

Publication uses the protected Preview workflow from merged `main`. This change does not approve Production.
