import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .data import LESSONS, LESSON_IMAGE_DIR
from .tracking import (
    CardAttemptCreate,
    SessionCreate,
    SessionFinish,
    UserCreate,
    admin_summary,
    create_attempt,
    create_or_update_user,
    create_session,
    finish_session,
    get_user_by_name,
    get_user,
    init_db,
)


app = FastAPI(title="Learn English API", version="0.1.0")
init_db()


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


@app.post("/api/users")
def create_user(payload: UserCreate):
    return create_or_update_user(payload)


@app.put("/api/users/{user_id}")
def update_user(user_id: str, payload: UserCreate):
    return create_or_update_user(payload, user_id=user_id)


@app.get("/api/users/{user_id}")
def read_user(user_id: str):
    user = get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/users/by-name/{display_name}")
def read_user_by_name(display_name: str):
    user = get_user_by_name(display_name)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/api/sessions")
def start_session(payload: SessionCreate):
    return create_session(payload)


@app.patch("/api/sessions/{session_id}/finish")
def complete_session(session_id: str, payload: SessionFinish):
    session = finish_session(session_id, payload)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/api/card-attempts")
def log_card_attempt(payload: CardAttemptCreate):
    return create_attempt(payload)


@app.get("/api/admin/summary")
def read_admin_summary():
    return admin_summary()
