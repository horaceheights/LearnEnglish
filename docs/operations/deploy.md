# Deploy SpanGlish

This app is set up to deploy with:

- Frontend: Vercel
- Backend API: Koyeb

The frontend and backend should be deployed as two separate projects from the same GitHub repository.

## 1. Push The Repo To GitHub

Push this whole repository to GitHub first. Both Vercel and Koyeb can deploy directly from the same repo.

## 2. Deploy The Backend On Koyeb

Official references:

- Koyeb FastAPI guide: https://www.koyeb.com/docs/deploy/fastapi
- Koyeb Python runtime selection: https://www.koyeb.com/docs/build-and-deploy/build-from-git/python

In Koyeb:

1. Create a new `Web Service`.
2. Choose `GitHub` as the source.
3. Select this repository.
4. Set the service root directory to `backend`.
5. Use the default `Buildpack` builder.
6. Set the run command to:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

7. Add this environment variable after you know your Vercel frontend URL:

```text
ALLOWED_ORIGINS=https://your-project-name.vercel.app
```

8. Add a persistent Postgres database and set:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

9. Add Azure Speech for pronunciation scoring. These values belong only in the hosted backend service environment. Your local `backend/.env` file is not pushed to Render, Vercel, GitHub, or a mobile/browser bundle:

```text
PRONUNCIATION_PROVIDER=azure
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=your-azure-region
AZURE_SPEECH_LOCALE=en-US
PRONUNCIATION_PEDAGOGICAL_SCORING=true
```

10. Add the OpenAI key for course audio. This lets the backend generate and cache natural lesson prompts instead of relying on browser voices:

```text
OPENAI_API_KEY=your-openai-api-key
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=coral
OPENAI_TTS_FORMAT=mp3
```

11. Add Sentry performance tracing for backend latency and mobile-to-server
trace correlation:

```text
SENTRY_DSN=your-sentry-project-dsn
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_ENVIRONMENT=production
```

The DSN may be the existing React Native project DSN or a backend project in
the same Sentry organization. Request bodies are not collected, so learner
recordings and pronunciation text are excluded from Sentry.

`OPENAI_API_KEY` must be the raw key only, starting with `sk-`. Do not include labels such as `openAI`, quotes, extra spaces, or line breaks.

After saving environment variables in Render, restart or redeploy the backend. Then verify:

```text
https://your-api-name.onrender.com/api/pronunciation/health
```

It should return `"provider": "azure"`, `"azure": true` under `configured`, and `"pedagogical_scoring": true` under `features`.

Also verify:

```text
https://your-api-name.onrender.com/api/audio/health
https://your-api-name.onrender.com/api/audio/course?text=The%20boy&mode=prompt&lang=en-US
```

The audio health endpoint should return `"openai_audio_configured": true`, and the course audio URL should return a playable audio file.

## Shipping Pregenerated Course Audio

Generated course audio can be shipped with the frontend from `frontend/public/audio-cache/*.mp3`. The frontend uses `frontend/lib/courseAudioManifest.json` to play those static Vercel files first, then falls back to the Render backend only when a clip is missing. This avoids mobile audio lag from Render and avoids paying OpenAI again for the same lesson prompts after each deploy.

Backend cache files in `backend/storage/audio-cache/*.mp3` can still be kept as the source cache for generation, but the mobile app should prefer the frontend static files.

This works because the cache filename is deterministic from:

- text
- mode
- language
- variant
- `OPENAI_TTS_MODEL`
- `OPENAI_TTS_VOICE`
- `OPENAI_TTS_FORMAT`

Keep the Render audio settings the same as local, especially:

```text
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=coral
OPENAI_TTS_FORMAT=mp3
```

If any of those values change, the backend will create new cache filenames and regenerate audio. After generating new clips, rebuild the frontend audio manifest and copy the MP3s into `frontend/public/audio-cache` before pushing. Do not commit learner database files or other runtime storage.

From the repo root:

```bash
python scripts/build_frontend_audio_manifest.py
```

The script should report `"missing_expected": 0` before pushing if you want every known lesson clip served statically by Vercel.

Without `DATABASE_URL`, the backend falls back to a local SQLite file. That is fine for local development, but hosted services can replace that file during deploys, which means learner profiles and results may disappear.

After deploy, Koyeb will give you a URL like:

```text
https://your-api-name.koyeb.app
```

Test these endpoints:

- `https://your-api-name.koyeb.app/api/health`
- `https://your-api-name.koyeb.app/api/lessons`

## 3. Deploy The Frontend On Vercel

Official references:

- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Vercel environment variables: https://vercel.com/docs/environment-variables

In Vercel:

1. Create a new project from GitHub.
2. Select this repository.
3. Set the root directory to `frontend`.
4. Add this environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-api-name.koyeb.app
```

5. Deploy.

Vercel will give you a URL like:

## Local Microphone Testing

Pronunciation practice needs browser microphone APIs. Chrome and most mobile browsers only expose `getUserMedia` on secure origins:

- `http://localhost:3000` works on the same computer.
- `http://192.168.x.x:3000` may not expose the microphone because it is not HTTPS.
- The deployed HTTPS Vercel URL should work once the browser grants microphone permission.

If testing from another device on your LAN, use the deployed HTTPS URL or set up local HTTPS for the frontend.

```text
https://your-project-name.vercel.app
```

## 4. Update CORS On Koyeb

After Vercel gives you the final frontend URL, go back to Koyeb and set:

```text
ALLOWED_ORIGINS=https://your-project-name.vercel.app
```

If you want both local dev and Vercel allowed, use:

```text
ALLOWED_ORIGINS=http://localhost:3000,https://your-project-name.vercel.app
```

Redeploy the Koyeb service after changing environment variables.

## 5. About Mobile Speech

Speech recognition on phones often requires a secure origin. Once the app is deployed on:

- `https://...vercel.app`
- `https://...koyeb.app`

mobile microphone access has a much better chance of working than it does on a home-network HTTP URL.
