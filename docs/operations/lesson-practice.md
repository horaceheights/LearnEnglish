# Liam lesson-review POC

An optional guided exchange appears after the saved result of Lesson 1.1. The shared context builder accepts canonical lessons; visibility is rollout configuration in mobile/src/lessonPractice.ts, reused on web. Expanding that list is a deliberate curriculum review, not a separate lesson program.

Liam introduces a situation, responds to the learner's actual text, and invites the next reply using only the completed lesson's vocabulary and structures. Early lessons use Spanish scaffolding because English questions have not yet been taught. Short mode allows three learner replies; extended mode allows six. Both are free POC choices, not purchase options. Each submission, including a help request, occupies one reply. The final call uses a separate structured feedback schema: an evidence-based observation and one practice suggestion, followed by a farewell. Invalid feedback is retryable; the UI closes the composer only after valid feedback arrives.

The avatar is a local drawing with a mouth animation during actual playback. It is not phoneme-aligned lip sync or generated video. It respects reduced motion. Typed responses and editable microphone transcripts work through the existing authenticated account transport. Completion, lesson grades, pronunciation scoring, navigation and immutable course audio remain unchanged. There are no progress writes from practice.

## Provider configuration

Server only:
- OPENROUTER_API_KEY: existing chat and transcription credential.
- OPENROUTER_PRACTICE_MODEL: defaults to openai/gpt-4.1-mini.
- OPENROUTER_TUTOR_STT_MODEL: existing transcription model, defaults to openai/whisper-large-v3-turbo.
- ELEVENLABS_API_KEY: a key with text_to_speech permission.
- ELEVENLABS_PRACTICE_MODEL: defaults to eleven_flash_v2_5.
- LESSON_PRACTICE_ENABLED=false: disables all practice routes. The shared LESSON_TUTOR_ENABLED switch also disables OpenRouter calls.

Liam uses the existing course cast voice TX3LPaxmHKxFdv7VOQHJ. The card tutor's approved Sulafat voice is unchanged. ElevenLabs Scribe was tested but the available key lacks speech_to_text permission; the POC uses the already-established OpenRouter STT instead. There is no automatic paid fallback or retry.

POST /api/account/practice/chat, /speech and /transcribe require learner authentication and validated canonical lesson revision/card identity. The API shares the tutor's 20 requests/minute and 180/day per-account process-local limiter. Recordings are decoded before STT, capped at 61 seconds and 4 MiB; clients stop recording at 60 seconds. Replies are capped at 240 tokens/900 characters; TTS responses at 3 MB. Provider requests time out at 40 seconds. Course/provider account identifiers are not sent as learner identity.

History exists only in client memory and is bounded to 12 messages. Closing retains the local review; changing mode, leaving the result or changing account resets it. Audio is temporary and cleaned up on close, mute, background or unmount. Provider errors expose no raw error bodies or credentials. The privacy page names both processors; no zero-retention promise is made.

## Limits and rollout

This is not a premium billing implementation: reply counts are based on client history, and the rate limiter resets on server restart. Before broad paid rollout, add durable session ownership/usage, entitlement checks and provider spending limits, and evaluate conversation quality across each enabled lesson. Model grounding reduces but cannot eliminate off-topic or incorrect responses. Feedback assesses submitted text, not pronunciation or acoustic fluency.

No new native dependencies, permissions or Expo configuration are required. Integrate through a PR to current main, deploy that exact backend revision, then publish only through the protected Preview workflow. Production requires explicit approval of the tested Preview.

Provider contracts: [OpenRouter structured output](https://openrouter.ai/docs/guides/features/structured-outputs), [ElevenLabs TTS](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
