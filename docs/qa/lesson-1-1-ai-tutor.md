# Lesson 1.1 AI tutor POC

Scope: `lesson-1-people-actions`, with shared web/mobile components and authenticated OpenRouter routes. No curriculum or media changes.

## Automated coverage

- Backend: canonical lesson revision/card validation, POC allowlist, complete submitted selections, before-answer redaction, wrong/correct grounding, authentication (including rejection of an admin/public key alone), shared usage limits, missing-key/kill-switch behavior, provider error sanitization, speech/transcription payload validation, and privacy disclosure.
- Shared hook: no request on mount or an error event, explicit opening, double-tap deduplication, same-card history, follow-up context, retry, cancellation and stale replies after close/card/account changes. Unfinished construction is never a submitted answer.
- Native Yoga: visible composer/close controls at 390×844, 360×640, 740×360 and 844×390, including enlarged text and safe areas. All Lesson 1.1 non-speaking cards with the extra header and wrong-answer controls are checked at 740×360 with font scales 1, 1.3 and 2. Other lesson layout suites remain in the release gate. These checks estimate native text metrics and do not substitute for installed-device testing.
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


## Local verification results

- Full backend suite: 658 tests passed; the final tutor/privacy changes also passed their 11 focused tests.
- Frontend production build and all 23 frontend tests passed. On Windows, the existing npm test script's wildcard was expanded explicitly with PowerShell; no package script was changed.
- Mobile TypeScript, the complete interaction verification script, and Android export/integrity validation passed. Content, cast, 6,779 immutable audio assets and static sound checks passed. Existing image-review advisories remain unchanged.
- The initial combined preflight caught test-fixture dependencies introduced by the new pause state. Those fixtures now exercise the tutor state, and the complete interaction script passed after the fixes. The dedicated Lesson 1.1 layout check caught and resolved a short-landscape rail overflow by keeping the icon beside the options control.
