# Liam Unit 1 review — 2026-10-17

## Scope and entry

Open Unit 1 in the course menu and choose **Repasa la Unidad 1 con Liam**. The same optional entry appears after the final canonical Unit 1 lesson (currently Lesson 1.11, the family mission), rather than after Lesson 1.1. All eleven current Unit 1 lessons are resolved on the server. The default is six learner replies; the short trial has three. Both remain free POC choices. No course content, results, grades or progress are changed by practice.

Liam uses the approved local shoulders-up portrait, without arms/hands, and the male Charon voice. The card tutor retains Sulafat. Spanish scaffolding and American English examples use the existing bilingual synthesis instructions and ordered audio pipeline.

## Verified

- All **677 backend tests passed**, including authentication, canonical unit scope/revision validation on chat/speech/transcription, inclusion of every unit lesson, exclusion of other units, legacy request compatibility, turn limits, final feedback, separate Liam/tutor voices and segment quotas.
- Shared/mobile tests cover unit-menu context without cards, final-lesson eligibility, final-response retry, composer closure, microphone permission foreground recovery, editable transcription, cancellation/mute/background behavior, mouth geometry, silence and reduced motion. Native Yoga checks include the larger 390×844 portrait, small phones with enlarged text and landscape.
- TypeScript, the web production build and Android production export/asset validation passed. Content/media checks passed. The full interaction suite also verifies existing course navigation; its CourseScreen harness was updated to supply the added foreground/connectivity boundaries. The course screen's reviewed release-identity blob was deliberately refreshed for the new entry; its commit/version label and the complete 85-lesson, seven-unit course fingerprint remain unchanged.
- A bounded **real-provider service smoke** completed six synthetic replies: “A girl”; “She reading” (Liam corrected the missing “is”); “She is reading. The mother is cooking”; “The father and the mother are talking”; “Who is he?”; “They are not sleeping.” The final response reported complete=true, answers=6, gave a specific “is/are” practice suggestion, and ended with “¡Hasta pronto!” without another question. This was a direct service check, not a logged-in browser/device session.
- Browser visual verification used the actual web portrait and entry components in a temporary read-only fixture at 390×844. The entry defaulted to six replies and the portrait showed no hands. With the previously approved Charon sample, mouth height changed from the resting 4px rendered border to 19.8854px during playback, then closed. Browser console had no errors. Evidence: local artifact `liam-unit-1-portrait.png`.
- Automatic approval review blocked starting the initial synthetic-auth local servers without a specific reason. The read-only visual fixture required no auth override. All temporary fixture routes and sample assets were removed before the successful production web build; no test authentication bypass ships.

## Preview acceptance still required

On the exact published Preview commit, open Unit 1 from the course menu. Exercise both durations, voice mute, microphone permission/record/stop/edit/send, closing during speech, background interruption, offline recovery and returning to the unit. Finish the final unit lesson and verify the optional result entry, with no entry after Lesson 1.1. Confirm the male voice, bilingual accent and playback-driven mouth movement on the target phone. Browser/synthetic tests do not prove physical Android/iOS capture or playback sampling.

This is not a paid entitlement system, comprehensive unit assessment, acoustic pronunciation grade or phoneme lip sync. Production promotion still requires approval after testing the exact Preview.
