# Learn English Lab

This repo now has two tracks:

- `app.py` and `models.py`: the earlier Streamlit prototype
- `frontend/` and `backend/`: the new app foundation for a more robust product

## Stack

- Frontend: Next.js
- Backend: FastAPI
- Lesson assets: local files in `Lessons/Lesson1/images`

## What The New App Includes

- Rosetta-style Lesson 1 flow
- Clickable image cards
- Correct and wrong audio feedback
- First-try scoring
- Backend-served lesson data and lesson images

## Run The Backend

From `backend/`:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will run on `http://localhost:8000`.

## Run The Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

The app will run on `http://localhost:3000`.

If your backend is not on the default port, set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Suggested Next Steps

1. Move the remaining lesson logic out of the old Streamlit prototype.
2. Add an authoring format for lessons so you do not hardcode every card.
3. Add audio files for spoken prompts.
4. Add admin tools for creating lessons and reviewing learner mistakes.

## Deploy

Deployment notes for `Vercel + Koyeb` are in [DEPLOY.md](C:/Users/gorre/Documents/Code%20Projects/LearnEnglish/DEPLOY.md).
