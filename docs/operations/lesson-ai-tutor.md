# Lesson AI tutor POC

The shared tutor is enabled only for `lesson-1-people-actions` (Lesson 1.1). Both clients and the backend have an explicit rollout allowlist. Other lessons retain their existing UI. Lesson content, assets, grading and release fingerprints are unchanged.

The authenticated FastAPI endpoints are `POST /api/account/tutor/chat`, `/transcribe` and `/speech`. They load the canonical lesson by ID, revision and stable slide ID. Only a submitted, complete selection is accepted as an attempt. Before an attempt, recognition/listening answers, image filenames, translations and teaching notes are excluded from the provider context. The tutor cannot modify progress or call tools.

## Backend configuration

Configure the existing Render service through its environment settings. Credentials never belong in Expo, Vercel frontend variables, Git, screenshots or logs.

| Variable | Default / purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Required server-only OpenRouter credential |
| `LESSON_TUTOR_ENABLED` | `true`; set `false` for the server kill switch |
| `OPENROUTER_TUTOR_MODEL` | `openai/gpt-4.1-mini` |
| `OPENROUTER_TUTOR_STT_MODEL` | `openai/whisper-large-v3-turbo` |
| `OPENROUTER_TUTOR_TTS_MODEL` | `elevenlabs/eleven-flash-v2.5` |
| `OPENROUTER_TUTOR_VOICE` | `liam` |

All three providers route through OpenRouter with `data_collection: deny`. This routing preference is not a promise of zero retention. No learner identity is included in model requests. Chat history remains in memory, clears on card/attempt/account changes, and is limited to the most recent 12 messages. Temporary mobile audio files and browser object URLs are removed when stopped or closed. Text/recordings are not written to the progress database; raw provider error bodies are not logged or returned. The privacy page describes the optional processing.

Each account may make 20 paid requests per minute and 180 per rolling day, shared across chat, transcription and speech. This POC limiter is per server process and resets on restart; it is not a billing ceiling. Use an OpenRouter key spending limit for a hard provider budget before broadening rollout. Requests have bounded payloads, at most 350 output tokens, 40-second provider timeouts and no automatic paid retries. Initial replies target 30–50 words (roughly half a phone screen); explicitly requested deeper explanations may reach 90 words. Recording ends after 60 seconds and accepts at most 4 MiB. A failed service leaves standard help and the lesson available.

No native dependency, app permission or Expo configuration was added. Preview uses the protected workflow from current `main` after the backend deploys that exact commit. Physical Android/iOS microphone, audio-route, keyboard and interruption testing is still required on that Preview; browser and Yoga checks do not establish native-device success.

Provider contracts: [chat](https://openrouter.ai/docs/quickstart), [speech recognition](https://openrouter.ai/docs/guides/overview/multimodal/audio), [API reference](https://openrouter.ai/docs/api/reference/overview).
