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
| `OPENROUTER_TUTOR_TTS_MODEL` | `google/gemini-3.8-flash-tts` |
| `OPENROUTER_TUTOR_VOICE` | `Sulafat` — Voice A, approved by the user on 2026-10-12 |

All three providers route through OpenRouter with `data_collection: deny`. This routing preference is not a promise of zero retention. No learner identity is included in model requests. Chat history remains in memory, clears on card/attempt/account changes, and is limited to the most recent 12 messages. Temporary mobile audio files and browser object URLs are removed when stopped or closed. Text/recordings are not written to the progress database; raw provider error bodies are not logged or returned. The privacy page describes the optional processing.

Each account may make 20 paid requests per minute and 180 per rolling day, shared across chat, transcription and speech. This POC limiter is per server process and resets on restart; it is not a billing ceiling. Use an OpenRouter key spending limit for a hard provider budget before broadening rollout. Requests have bounded payloads, at most 350 output tokens, 40-second provider timeouts and no automatic paid retries. Initial replies target 30–50 words (roughly half a phone screen); explicitly requested deeper explanations may reach 90 words. Recording ends after 60 seconds and accepts at most 4 MiB. A failed service leaves standard help and the lesson available.

No native dependency, app permission or Expo configuration was added. Preview uses the protected workflow from current `main` after the backend deploys that exact commit. Physical Android/iOS microphone, audio-route, keyboard and interruption testing is still required on that Preview; browser and Yoga checks do not establish native-device success.

Speech instructions request neutral native Latin American Spanish and American English for embedded words/examples without changing the learner-visible text. Gemini requires `pcm` on the tested route (the MP3 request returned 400); the backend converts its 24 kHz mono signed 16-bit audio to MP3 with the already-installed imageio-ffmpeg encoder, preserving existing mobile clients. Encoding is bounded to 180 seconds of input and a 10-second subprocess timeout. No paid retry or model fallback occurs on failure. Check the encoder before calling the provider. Changing model/voice overrides requires another bilingual audition; older overrides such as Liam do not inherit the new default. Other model families retain the MP3 passthrough contract.

Replies autoplay after manual opening, with a remembered top sound/mute control. The preference uses `spanglish:tutor:voice:v1` in device/browser storage; missing storage defaults on, while a stored mute is loaded before playback. Browser opening primes one reusable silent audio element from the tap; blocked autoplay still offers explicit replay. Dictation does not enable spoken replies. Temporary speech remains uncached and separate from the immutable course catalog.

Provider contracts: [chat](https://openrouter.ai/docs/quickstart), [speech recognition](https://openrouter.ai/docs/guides/overview/multimodal/audio), [text-to-speech parameters and formats](https://openrouter.ai/docs/guides/overview/multimodal/tts), [Gemini voice and style controls](https://ai.google.dev/gemini-api/docs/speech-generation).
