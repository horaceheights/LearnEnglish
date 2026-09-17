# Progressive grammar and wrong-answer feedback

The Lesson 1.3 U6 regression (`She sleeping is.`) exposed a semantic gap in the construction hint tests. Coverage, nonempty copy and ordering words passed even though the generic `be` complement rule incorrectly treated `sleeping` as a subject description.

The resolver now distinguishes the auxiliary `am/is/are` plus a supported main verb in its -ing form from copular descriptions. Auxiliary/main-verb mistakes name those two roles and their local order; subject/auxiliary mistakes explain subject before auxiliary. Negative forms explain `not` between auxiliary and main verb. Adjective, identity, location and non-progressive -ing uses retain their separate interpretation.

The screenshot now produces: `Pusiste “sleeping” donde va “is”. “is” es el auxiliar y “sleeping” el verbo principal en -ing. Primero “is” y después “sleeping”: “is sleeping”.`

Both shared construction renderers show a red X beside the existing encouragement and expose `Respuesta incorrecta` to assistive technology. The X exists only during a wrong grade and disappears on `Reintentar`. The lesson layout, word placement, locked feedback, retry history and scoring contracts are preserved.

## Verification

- Exact screenshot regression on full construction and a scaffolded equivalent.
- Independent grammar examples cover all 16 supported action verbs with `I am`, `She is` and `They are`, positive and negative word-order mistakes.
- Controls cover `She is tired`, `She is a girl`, `The book is on the table`, `It is a living room` and `I like listening to music`.
- The full course audit checks 459 constructions, 2,961 reachable wrong orders and 46 movable auxiliary/main-verb pairs across all 70 lessons. These semantic assertions supplement, rather than replace, the earlier coverage tests.
- TypeScript, the interaction suite, content/audio checks and Android export pass in the full Preview preflight. The 17 frontend tests and frontend production build also pass.
- The real web LessonPlayer was exercised with canonical Lesson 1.3 U6 and U2 at 390x844: the red X and accurate progressive hint appear after wrong grading, remain through replay/help, disappear on Retry and do not appear on correct feedback. Completion retained 0/1 first-try credit after a corrected retry. No browser console errors were recorded. The temporary fixture did not serve backend audio, so replay-state preservation was checked without claiming audible playback verification; the fixture is removed before publication.

Installed Android/iOS Preview reading and assistive-technology review remain separate from browser and automated checks.
