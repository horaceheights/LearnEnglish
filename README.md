# SpanGlish (Learn English Lab)

This repository contains the full stack for the SpanGlish immersive English learning platform:

- `mobile/`: Cross-platform mobile app built with Expo (React Native)
- `backend/`: FastAPI backend for lesson delivery, audio synthesis, pronunciation evaluation, and telemetry
- `frontend/`: Next.js web application for testing and admin preview
- `Lessons/`: Lesson image, sprite, and audio assets

## Stack

- Mobile: Expo / React Native
- Frontend: Next.js
- Backend: FastAPI
- Speech & Audio: Azure Cognitive Services, OpenAI TTS / ElevenLabs, custom native speech module
- Storage: PostgreSQL / SQLite

## What The App Includes

- Rosetta-style immersive lesson flow
- Interactive image cards, animations, and video sprites
- Real-time speech and pronunciation assessment with pedagogical feedback
- First-try scoring, retry loops, and session tracking
- Offline preview lessons and audio preloading

## Run The Backend

From `backend/`:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will run on `http://localhost:8000`.

## Run The Mobile App

From `mobile/`:

```bash
npm install
npm run start
```

## Run The Web Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

The app will run on `http://localhost:3000`.

## Suggested Next Steps

1. Add a declarative authoring format for lessons (JSON/YAML) so cards are schema-driven.
2. Add admin tools for creating lessons and reviewing learner mistakes.
3. Enhance learner profile synchronization and cloud authentication.

## Deploy

Deployment notes for `Vercel + Koyeb` are in [DEPLOY.md](C:/Users/gorre/Documents/Code%20Projects/LearnEnglish/DEPLOY.md).

## Testing

- Spanish tester guide: [GUIA_PRUEBAS_TESTERS_ES.md](GUIA_PRUEBAS_TESTERS_ES.md)
- Internal engine checklist: [ENGINE_QA_CHECKLIST.md](ENGINE_QA_CHECKLIST.md)
- Owner-first mobile release flow: [mobile/RELEASE.md](mobile/RELEASE.md)
