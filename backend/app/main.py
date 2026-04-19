import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .data import LESSONS, LESSON_IMAGE_DIR


app = FastAPI(title="Learn English API", version="0.1.0")


def allowed_origins() -> list[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if LESSON_IMAGE_DIR.exists():
    app.mount("/lesson-assets", StaticFiles(directory=str(LESSON_IMAGE_DIR)), name="lesson-assets")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/lessons")
def list_lessons() -> list[dict[str, str]]:
    return [
        {
            "id": lesson.id,
            "title": lesson.title,
            "level": lesson.level,
        }
        for lesson in LESSONS.values()
    ]


@app.get("/api/lessons/{lesson_id}")
def get_lesson(lesson_id: str):
    lesson = LESSONS.get(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson
