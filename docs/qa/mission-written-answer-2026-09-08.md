# Lesson 1.10 written pronunciation answers

The user replaced unaided recall with written-answer pronunciation for all four
final voice gates. The English question and two-shot camera sequence remain.
After the question, the complete sentence appears with “Lee la frase en voz alta.”
It remains visible during recording, scoring and graded feedback. Question replay
does not play an answer model. Ordinary Speak and all listening beats are unchanged.

The service-unavailable state temporarily prioritizes recovery controls instead
of the answer; it is not a recording state. Retrying restores the normal sequence.
This prevents the smallest landscape error panel from displacing the entire image.

## Verification

- Complete mobile Preview preflight passed, including TypeScript, pronunciation
  lifecycle, content/audio contracts and production Android bundle export.
- Backend: 267 tests passed. Frontend: 14 tests passed and Next production build passed.
- Native Yoga regression covers 4 available sizes × 2 font scales × 3 action-row
  states, with the written answer and natural copy heights reserved.
- Actual native presentation through a React Native Web adapter: 168 state checks,
  covering all four cards, seven phases, font scales 1/1.3 at 393×852, 568×320 and
  740×360. No answer-visibility, image-fit, target-size or viewport-bound failures.
- Actual web mission with compiled styled-jsx: 56 state checks across all four
  cards and seven phases at 393×852 and 568×320. No visibility or layout failures.
- Browser screenshot review confirmed a contained written answer and instruction.
  No browser errors were reported.
- The adapter substitutes deterministic speech states and reserves a portrait
  header placeholder; it does not prove live Android microphone behavior or native
  rendering. Physical-device verification remains necessary.

No course content, images, audio bytes, audio catalog, or native dependencies changed.
Existing pending semantic-review and renderer-signature advisories remain pending.
The React review kept answer visibility derived directly from existing state,
without new effects or a second pronunciation engine.

## Release hold

The earlier reported M16 scene remains ambiguous: all four male characters are
sitting, so “He is sitting.” has multiple valid targets. This separate image/content
issue is unchanged by this scoped pronunciation update. Automated metadata checks
cannot prove that visible distinction. Do not publish a new Preview until the scene
and its clue/anchor bindings have been corrected and visually checked, or the user
explicitly approves an exception to the ambiguity release guardrail.

Resolved by the subsequently approved M16 correction: see
`mission-m16-posture-2026-09-08.md`. The replacement has only one seated person;
the other three stand. The scene, all four clue bindings and target positions
were visually checked, and the full Preview preflight passes. The original hold
above is retained as historical evidence, not an outstanding scene blocker.
