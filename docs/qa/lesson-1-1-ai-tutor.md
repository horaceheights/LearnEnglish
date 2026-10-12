# Lesson 1.1 AI tutor POC

Scope: `lesson-1-people-actions`, with shared web/mobile components and authenticated OpenRouter routes. No curriculum or media changes.

## Automated coverage

- Backend: canonical lesson revision/card validation, POC allowlist, complete submitted selections, before-answer redaction, wrong/correct grounding, authentication (including rejection of an admin/public key alone), shared usage limits, missing-key/kill-switch behavior, provider error sanitization, speech/transcription payload validation, and privacy disclosure.
- Shared hook: no request on mount or an error event, explicit opening, double-tap deduplication, same-card history, follow-up context, retry, cancellation and stale replies after close/card/account changes. Unfinished construction is never a submitted answer.
- Native Yoga: visible composer/close/top-mute controls at 390×844, 360×640, 740×360 and 844×390, including enlarged text and safe areas. All Lesson 1.1 non-speaking cards with the floating button and wrong-answer controls are checked at 740×360 with font scales 1, 1.3 and 2; wide prompts remain above the floating target. Dragging, resize clamping and accessibility reset exercise the actual component. Other lesson layout suites remain in the release gate. These checks estimate native text metrics and do not substitute for installed-device testing.
- Production web/native voice components: no playback before manual opening, once-only autoplay for each new reply (including repeated text), close/reopen, stale completion after background/close, mute cancellation, delayed preference loading, persisted mute and dictation preserving mute. The shared preference hook is exercised with real asynchronous state changes and mocked storage/platform I/O.
- Existing prompt-replay regression tests now include the paused tutor state. New tutor suites run in `verify-interaction-paths.ps1` and protected CI.

## Live local verification, 2026-10-12

Used the real production web lesson components at phone portrait and landscape sizes, with canonical Lesson 1.1 cards and a loopback-only test server. The disposable harness bypassed account setup solely for UI testing; separate backend integration tests exercise the actual Clerk middleware and account dependency. The harness is excluded from the change and removed before the production build.

- R2 before submission opens a hint without `Tu respuesta` or an invented selection.
- R2 wrong `He is a man.` preserves the authored regular hint; only tapping `Saber más` opens the AI explanation. The returned response accurately contrasts `man` and `boy` and supplies two English examples with Spanish explanations.
- The grammar suggestion sends a follow-up in the same conversation. OpenRouter returned an explanation of `he/she + is + a + person`; the final prompt distinguishes identity from progressive aspect and uses sound, not spelling, for the article rule. Responses are plain text; emphasis markers are removed before display/speech.
- Speaking an explanation returned audio successfully through the speech endpoint and browser playback had no console error. A separate real-provider round trip generated a Spanish question and transcribed its MP3 through OpenRouter. This verifies provider compatibility, not a physical device microphone.
- U4 with only `He` placed opens as unanswered. Closing during its request preserves that word and the enabled Undo control.
- Stopping the loopback API produces a Spanish connection error with `Reintentar`; the typed follow-up remains in the composer. The conversation and lesson remain available. Restoring the API and tapping `Reintentar` successfully answers the preserved question.
- After the user's compact-response review, shortened the response guidance to 30–50 words by default and reduced the provider output limit to 350 tokens. A fresh live R2 mistake explanation returned 58 words; at 390×844 its text occupied 255 px and the entire first reply, both examples, all three suggestions and composer fit without internal scrolling. This is observed model behavior, not a guaranteed word count. Longer history and accessible text still retain scrolling. The 11 tutor/privacy tests passed again.

## Required Preview device review

After the protected CI release, test the exact commit on Android Chrome and the installed Expo Preview app; review iOS too before claiming iOS success. Verify microphone permission denial, recording/stop/cancel, editable dictation, explicit send, speaker playback and stop, Bluetooth/silent-mode routing, keyboard clearance in both orientations, app background/return during each voice phase, rapid open/close, and opening during a Speak model/recording. Confirm the lesson resumes without lost selections, duplicate scoring, unexpected advancement or two active microphones. No physical-device result is claimed by the local browser or Yoga evidence.

## Floating button and bilingual voice follow-up, 2026-10-12

- Real OpenRouter speech: an initial MP3 format probe was rejected with HTTP 400; the explicitly corrected Gemini PCM probe succeeded. Two planned mixed-language samples using Sulafat and Kore were generated and presented for human audition. On 2026-10-12 the user selected **Voice A — Sulafat**, confirming the previously provisional default. This is human approval of the auditioned voice, separate from provider/encoding success and pending physical-device review.
- Backend default speech requests include bilingual delivery instructions while preserving the exact visible explanation. Real PCM-to-MP3 conversion, missing/failed encoder handling, no paid retry, and configured legacy MP3 passthrough are covered. The full backend suite passed 660 tests.
- Live production web components at 390×844 and 740×360: the floating control starts by the answer area, leaves the logo clear, drags without opening, resets through the keyboard, and stays reachable after rotation. The top sound control persists across close/reopen. Real chat and speech calls succeeded without browser console errors; a new follow-up plays after the learner enables voice.
- Before-answer R2 remains a hint. On image-choice R1, selecting `A man` preserves regular authored feedback and only tapping `Saber más` opens an explanation of that exact error. The initial reply, suggestions and composer fit at normal portrait size. Screenshots are retained with the local task artifacts.
- Disposable loopback-only QA routes and account fixtures were removed before the production build. No curriculum, immutable recording, native permission or dependency was changed.
- The first broad native layout run found an outdated fixture still mounting the old header button. The fixture now mounts the production floating control, including measured wide-prompt clearance, while preserving all original fit and wrong-answer assertions.
- Final local checks passed: all 23 frontend tests and its production build, mobile TypeScript and complete interaction verification, Android export and export-integrity validation, and the unchanged 85-lesson / 7-unit release fingerprint. Installed-device review remains pending on Preview; the user subsequently approved the Voice A audition as recorded above.


## Local verification results

- Full backend suite: 658 tests passed; the final tutor/privacy changes also passed their 11 focused tests.
- Frontend production build and all 23 frontend tests passed. On Windows, the existing npm test script's wildcard was expanded explicitly with PowerShell; no package script was changed.
- Mobile TypeScript, the complete interaction verification script, and Android export/integrity validation passed. Content, cast, 6,779 immutable audio assets and static sound checks passed. Existing image-review advisories remain unchanged.
- The initial combined preflight caught test-fixture dependencies introduced by the new pause state. Those fixtures now exercise the tutor state, and the complete interaction script passed after the fixes. The dedicated Lesson 1.1 layout check caught and resolved a short-landscape rail overflow by keeping the icon beside the options control.


## All-unit rollout and future authoring, 2026-10-12

The user approved rollout to all units and integration into the content build engine. The runtime no longer uses lesson-ID allowlists. Catalog-driven backend checks cover every current card (85 lessons / 3,471 cards, including all seven missions), and a synthetic new lesson ID works without registration. Author/installer tests exercise the same tutor policy for future generated content and reject unsupported activities before writing any lesson file.

Mission tests execute both actual client components with shuffled clue order. They verify exact submitted target context, persistent `Saber más`, paused wrong/correct feedback timers, no advancement while tutoring, and resumption of the same cue. A mission scene stays mounted during tutor interruption, retaining found targets. Before-answer contexts omit hidden targets; after a mission tap, only the current clue and selected target are revealed, without later clues, scene geometry or media filenames.

The broad native layout fixtures now include the tutor for every tested lesson. Initial failures found undersized portrait choices and clipped longer landscape feedback. The shared fix places short-screen controls beside existing feedback or the side image, and construction's landscape toolbar holds `Saber más` beside retry/replay. The full viewport matrix passes while keeping 48dp controls, regular hints and full answer text. Media-frame and clue-resume assertions were updated to preserve their original invariants with the new layout and current-clue resumption.

Live loopback browser verification uses real production components, canonical cards and OpenRouter with a disposable local account dependency override; it does not bypass deployed authentication. Lesson 6.3 and Mission 6.14 both return contextual hints with Sulafat speech. On a mission mistake, the tutor shows the exact submitted phrase and explains the current clue. Closing it preserves clue 2 and the already-found first target. Portrait and landscape entry placement were inspected. A verbose first response on a longer mission sentence prompted stronger instructions to compare the changed terms without copying both full sentences.

No course data, immutable audio, native dependencies or permissions changed. Physical-device microphone, audio-route and interruption review remains a Preview check; browser tests do not establish native-device success.

Rollout verification: 665 backend tests passed, all 23 web tests and the final production build passed, mobile TypeScript passed, and the interaction suites passed (resuming the remaining suites after updating source assertions for the new pause/resume contract). The complete native viewport matrix passed with course-wide tutor controls. The final live mission reply stayed under 45 words with two examples; its context, response, suggestions and composer fit at 390×844. Temporary loopback routes and servers were removed before the final production build. Required CI repeats complete release verification and Android export on the PR candidate.
