# Correct Completa celebration

Guided and full sentence constructions now replace editing instructions, the return bank, its empty placeholder and Undo with the professor squirrel and `¡Perfecto! ¡Buen trabajo!` after a correct grade. The completed words remain green and tappable for Spanish translation; English replay and the lesson-owned scoring/audio/advance lifecycle remain intact. Wrong attempts keep their contextual explanation and Reintentar.

The versioned transparent mascot uses the approved professor as its reference. Its generation prompt and provenance are in `mobile/assets/mascots/serious/celebration-v1.md`; web and mobile ship identical RGBA pixels. The 600 ms hop is decorative, stops on unmount, and has a still reduced-motion fallback. Native animation state stays in the card owner so responsive reflow does not restart it. Portrait places the celebration below the existing image. Short web landscape places image and celebration side by side; mobile uses the existing feedback column beside its image rail.

Verification:

- Production native component tests cover initial, wrong, explicit retry and correct states for both formats, including translation and replay without editing the completed answer. Production web component render tests check the same success-only content boundary. Both run in protected Preview preflight.
- Native Yoga executes every one of the 462 authored constructions in its correct state inside the full short-landscape lesson shell, at 740×360 and 915×412 with font scales 1, 1.3 and 2. Existing initial/wrong, word placement, pronunciation, rotation and feedback checks remain in place.
- Real browser checks of the actual web component covered wrong order → Reintentar → success, guided and full construction, translation, replay, portrait and short landscape. The first landscape screenshot exposed praise below the screen; the success-only side-by-side arrangement corrected that. The fixture's format/attempt controls are QA controls, not product UI.
- The real web LessonPlayer in test mode completed all eight existing Lesson 1.5 Use cards and reached lesson completion with 8/8 first-try scoring. Each checked success state contained the mascot/praise and no editing instructions. Local media/audio fixture limitations do not establish installed-device audio coverage.
- Complete local Preview preflight passed: content/media/audio validation, TypeScript, interaction regressions and production Android bundle export. The versioned course remains exactly 70 lessons in seven units of ten with its existing fingerprint.

Installed Android/Expo Preview review remains required for actual font rendering, audio timing, motion preference, device touch and screen-reader announcements. Browser/Yoga evidence is not installed-device or human course-media approval.
