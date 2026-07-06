import os
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .course_audio import audio_debug, get_course_audio
from .data import LESSONS, LESSON_IMAGE_DIR
from .speechace import close_speechace_client, score_pronunciation, speechace_configured, speechace_request_debug
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
    storage_info,
)


app = FastAPI(title="Learn English API", version="0.1.0")
init_db()


@app.on_event("shutdown")
async def shutdown_clients():
    await close_speechace_client()


def allowed_origins() -> list[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    return origins or ["http://localhost:3000"]


def allowed_origin_regex() -> str | None:
    if os.getenv("ALLOWED_ORIGINS"):
        return None

    return r"^https?://(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}):3000$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_origin_regex=allowed_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if LESSON_IMAGE_DIR.exists():
    app.mount("/lesson-assets", StaticFiles(directory=str(LESSON_IMAGE_DIR)), name="lesson-assets")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/pronunciation/health")
def pronunciation_health():
    return {
        "speechace_configured": speechace_configured(),
        "speechace_request": speechace_request_debug(),
    }


@app.get("/api/audio/health")
def audio_health():
    return audio_debug()


@app.get("/api/audio/course")
async def read_course_audio(
    text: str,
    mode: str = "prompt",
    lang: str = "en-US",
    variant: str = "default",
):
    return await get_course_audio(text=text, mode=mode, lang=lang, variant=variant)


@app.post("/api/pronunciation/score")
async def score_pronunciation_practice(
    text: str = Form(...),
    audio: UploadFile = File(...),
    user_id: str | None = Form(None),
    question_info: str | None = Form(None),
):
    return await score_pronunciation(
        text=text,
        audio_file=audio,
        user_id=user_id,
        question_info=question_info,
    )


@app.get("/api/admin/storage")
def read_admin_storage():
    return storage_info()


@app.get("/api/lessons")
def list_lessons() -> list[dict[str, str]]:
    return [
        {
            "id": lesson.id,
            "title": lesson.title,
            "level": lesson.level,
            "unit_id": lesson.unit_id,
            "unit_title": lesson.unit_title,
            "lesson_id": lesson.lesson_id,
            "lesson_title": lesson.lesson_title,
            "sub_lesson_id": lesson.sub_lesson_id,
            "sub_lesson_title": lesson.sub_lesson_title,
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
