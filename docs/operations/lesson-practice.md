# Liam lesson-review POC

An optional guided exchange appears after the saved result of Lesson 1.1. The shared context builder accepts canonical lessons; visibility is rollout configuration in mobile/src/lessonPractice.ts, reused on web. Expanding that list is a deliberate curriculum review, not a separate lesson program.

Liam introduces a situation, responds to the learner's actual text, and invites the next reply using only the completed lesson's vocabulary and structures. Early lessons use Spanish scaffolding because English questions have not yet been taught. Short mode allows three learner replies; extended mode allows six. Both are free POC choices, not purchase options. Each submission, including a help request, occupies one reply. The final call uses a separate structured feedback schema: an evidence-based observation and one practice suggestion, followed by a farewell. Invalid feedback is retryable; the UI closes the composer only after valid feedback arrives.

The avatar is a larger shared local portrait with blinking, breathing, head tilts and playback-driven mouth movement. Native playback samples drive mouth opening when supported and already permitted; the web decodes the current temporary audio file and follows its playback position. Unsupported sampling uses irregular motion gated by actual playback. Silence samples close the mouth; thinking and listening do not animate speech. This is amplitude-based animation, not phoneme-aligned lip sync or generated video. Reduced motion stops facial movement. Typed responses and editable microphone transcripts use the existing authenticated transport. The native recorder preserves a tap across the system permission dialog, waits for foreground before capture and cancels on close or context changes. Completion, grades, pronunciation scoring and immutable course audio remain unchanged.

## Provider configuration

Server only:
- OPENROUTER_API_KEY: existing chat and transcription credential.
- OPENROUTER_PRACTICE_MODEL: defaults to openai/gpt-4.1-mini.
- OPENROUTER_TUTOR_STT_MODEL: existing transcription model, defaults to openai/whisper-large-v3-turbo.
- OPENROUTER_TUTOR_TTS_MODEL and OPENROUTER_TUTOR_VOICE: the same approved bilingual voice configuration as the card tutor (Gemini TTS / Sulafat).
- LESSON_PRACTICE_ENABLED=false: disables all practice routes. The shared LESSON_TUTOR_ENABLED switch also disables OpenRouter calls.

Following the user's accent correction, practice speech delegates to the card tutor's existing speech-stream implementation: identical voice, native Latin American Spanish/American English instructions, PCM-to-MP3 encoding, two ordered sentence groups and per-segment quota accounting. This supersedes the POC's original direct ElevenLabs Liam voice. The illustrated character remains Liam. Transcription uses the established OpenRouter STT. There is no automatic paid fallback or retry.

POST /api/account/practice/chat, /speech and /transcribe require learner authentication and validated canonical lesson revision/card identity. The API shares the tutor's 20 requests/minute and 180/day per-account process-local limiter. Recordings are decoded before STT, capped at 61 seconds and 4 MiB; clients stop recording at 60 seconds. Replies are capped at 240 tokens/900 characters; speech follows the tutor's bounded PCM/MP3 pipeline. Provider requests time out at 40 seconds. Course/provider account identifiers are not sent as learner identity.

History exists only in client memory and is bounded to 12 messages. Closing retains the local review; changing mode, leaving the result or changing account resets it. Audio is temporary and cleaned up on close, mute, background or unmount. Provider errors expose no raw error bodies or credentials. The privacy page describes OpenRouter and its model providers; no zero-retention promise is made.

## Limits and rollout

This is not a premium billing implementation: reply counts are based on client history, and the rate limiter resets on server restart. Before broad paid rollout, add durable session ownership/usage, entitlement checks and provider spending limits, and evaluate conversation quality across each enabled lesson. Model grounding reduces but cannot eliminate off-topic or incorrect responses. Feedback assesses submitted text, not pronunciation or acoustic fluency.

No new native dependencies, permissions or Expo configuration are required. Integrate through a PR to current main, deploy that exact backend revision, then publish only through the protected Preview workflow. Production requires explicit approval of the tested Preview.

Provider contracts: [OpenRouter structured output](https://openrouter.ai/docs/guides/features/structured-outputs), [shared tutor speech](lesson-ai-tutor.md), [Expo playback sampling](https://docs.expo.dev/versions/latest/sdk/audio/).
