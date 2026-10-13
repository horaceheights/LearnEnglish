# Liam review POC — 2026-10-13

## Verified locally

- Authenticated FastAPI tests reject anonymous/operator-only access, unknown/stale lesson context, invalid turn order, excessive turns, invalid recordings and malformed final feedback before accepting a session result.
- Shared client tests cover three/six replies, retryable final failures, separate Liam audio transport, hiding the composer on completion, cancellation/mute/background behavior and unchanged card tutor behavior.
- Native Yoga layout checks cover the practice surface at 360×640 with 1.6 font scale and 740×360 landscape; existing tutor/result/layout suites also run in Preview verification.
- Real provider smoke: OpenRouter chat, ElevenLabs Liam speech, and OpenRouter transcription succeeded. Scribe rejected the existing TTS-only key with missing_permissions, so it is not used.
- Browser loopback fixture used a synthetic authenticated account and isolated in-memory database, with the real production practice components, API and paid providers. Liam prompted “A boy”; “He is a boy” was accepted. He then prompted “A woman”, corrected “She a woman” by identifying the missing “is”, accepted “She is a woman”, and ended with a specific achievement, an “is” practice suggestion and “¡Hasta pronto!”.
- Final UI displayed “Repaso terminado”, removed the response composer, returned to the result and offered “Ver mi feedback”. The lesson result was not rewritten. Text and speech were usable.
- The first live smoke exposed a model that continued asking questions on its final turn. Final feedback now uses a separate structured-output system/schema, validates both fields and rejects questions; this behavior has a regression test.
- Temporary loopback fixture/auth override was removed before the final production build and is not included in the application.

## Automated verification

Run:
- python -m unittest discover -s backend/tests
- npm run verify:preview (mobile)
- npm run build (frontend)

The frontend package's npm test points to a missing tests directory on the base branch; shared web behavior is exercised by mobile/tests/lesson-tutor-voice.test.cjs and tutor-transport.test.cjs instead. No unrelated test-script change was made.

## Preview/device checks still required

On the exact Preview commit, finish Lesson 1.1, save the result and open “Practica con Liam”. Test short and extended reviews, a helpful correction, microphone permission/record-stop/edit-send, muting, closing during speech, background interruption, offline recovery and returning to the unchanged result. Check bilingual Liam voice quality on the target phone. Browser/synthetic audio and Yoga tests do not prove microphone capture or playback on physical Android/iOS.

This POC has no subscriptions, production entitlement enforcement, phoneme lip sync or pronunciation grading. Do not promote to Production without explicit approval after testing the exact Preview.

## Voice, microphone and avatar correction — 2026-10-13

- User reported the microphone showing “Abriendo micrófono…” briefly and disappearing. A production-component regression test reproduced silent cancellation when the permission dialog made AppState and the parent inactive. The shared native control now checks existing permission, preserves the pending permission tap and waits for foreground before capture. Tests cover Liam and tutor, permission denial, closing during permission, actual background cancellation and record → stop → editable transcript → explicit send. Physical-device confirmation of the reported symptom remains required.
- Practice speech now delegates to the exact approved bilingual tutor service. Tests verify Sulafat, Gemini TTS, unchanged Spanish/English instructions, ordered segments, canonical context, kill switch and per-segment quota. A real-provider call through the practice endpoint returned HTTP 200, two audio segments and `done`; a local browser fixture played that response.
- The shared illustrated portrait is 140–208 points on native depending on available space, with a 150-point landscape portrait. Web uses corresponding responsive sizing. Blinks, head movement, breathing and eyebrows follow idle/listening/thinking/speaking states. Mouth opening follows playback RMS where available; native sampling never requests permission for animation. Unsupported sampling has a playback-gated fallback. This does not provide phoneme lip sync.
- Native Yoga checks retain microphone/send/close/mute targets and conversation space in portrait, landscape and enlarged text. Browser inspection at 390×844 and 740×360 confirmed the larger portrait and reachable controls. Mouth transforms changed during real audio playback and returned to idle afterward. Browser console showed no errors. Reduced-motion and silence behavior have shared animation regression tests.
- The temporary local fixture and generated speech sample are removed before the release build. No mock transport or authentication bypass is shipped. Exact Preview still needs the user's phone test for recording, playback sampling and bilingual voice quality.
