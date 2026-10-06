import json
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from . import accounts, learner_auth, tracking
from .data import LESSONS

router = APIRouter(prefix="/api/account")


def current_account(request):
    return accounts.ensure_account(request.state.identity)


@router.get("")
def read_account(request: Request):
    return accounts.snapshot(current_account(request))


class ProfileUpdate(tracking.UserCreate):
    version: int = Field(ge=1)


@router.put("/profile")
def save_profile(payload: ProfileUpdate, request: Request):
    return accounts.update_profile(current_account(request), payload, payload.version, request.headers.get("x-progress-generation"))


class CheckpointUpdate(BaseModel):
    revision: int = Field(ge=0)
    run: dict | None = None


@router.put("/checkpoints/{lesson_id}")
def save_checkpoint(lesson_id: str, payload: CheckpointUpdate, request: Request):
    lesson = LESSONS.get(lesson_id)
    if lesson is None:
        raise HTTPException(404, "Lección no encontrada.")
    run = payload.run
    if run is not None:
        count = len(lesson.cards)
        if (run.get("cardCount") != count or run.get("contentRevision") != lesson.content_revision
                or not isinstance(run.get("sessionId"), str) or not 1 <= len(run["sessionId"]) <= 100):
            raise HTTPException(409, {"code": "checkpoint_obsolete", "lessonId": lesson_id,
                                      "message": "La lección cambió. Conservamos tu progreso anterior para revisión."})
        for field in ("cardIndex", "furthestCardIndex", "score"):
            value = run.get(field)
            maximum = count if field == "score" else count - 1
            if type(value) is not int or not 0 <= value <= maximum:
                raise HTTPException(422, "El progreso no es válido.")
        for field in ("attemptedCards", "completedCards", "wrongCards", "earnedCards", "ungradedCards", "reviewQueue"):
            values = run.get(field, [])
            if not isinstance(values, list) or len(values) > count or any(type(i) is not int or not 0 <= i < count for i in values):
                raise HTTPException(422, "El progreso no es válido.")
        if len(json.dumps(run)) > 32000:
            raise HTTPException(413, "El progreso es demasiado grande.")
    return accounts.save_checkpoint(current_account(request), lesson_id, run, payload.revision,
                                    request.headers.get("x-progress-generation"))


@router.delete("")
def delete_account(request: Request):
    account = current_account(request)
    # Revoke the provider account as well as local data. A tombstone rejects
    # already-issued short-lived tokens, even after all learner data is gone.
    learner_auth.delete_identity(request.state.identity)
    tracking.delete_user_and_activity(account["user_id"])
    return {"deleted": True}


async def guard_learner_request(request: Request, admin_authorized: bool):
    """Check every legacy data path too: a client app key is not user identity."""
    path = request.url.path
    if path.startswith("/api/admin") or not path.startswith("/api/") or admin_authorized:
        return None
    bearer = request.headers.get("authorization")
    if path.startswith("/api/account") or bearer:
        request.state.identity = await run_in_threadpool(learner_auth.authenticate, request)
    if path.startswith("/api/account"):
        return None
    if bearer and path == "/api/users":
        raise HTTPException(403, "Usa los controles de tu cuenta para esta acción.")
    ids = set()
    parts = path.split("/")
    if path.startswith("/api/users/by-name/"):
        user = await run_in_threadpool(tracking.get_user_by_name, unquote(parts[4]))
        if user:
            ids.add(user["id"])
    elif path.startswith("/api/users/"):
        ids.add(unquote(parts[3]))
    if request.headers.get("content-type", "").startswith("application/json") and request.method in ("POST", "PUT", "PATCH"):
        try:
            payload = await request.json()
        except (ValueError, UnicodeDecodeError):
            payload = {}
        if isinstance(payload, dict):
            for key in ("user_id", "userId"):
                if payload.get(key):
                    ids.add(str(payload[key]))
            if path == "/api/users":
                user = await run_in_threadpool(tracking.get_user_by_name, str(payload.get("display_name", "")))
                if user:
                    ids.add(user["id"])
            if payload.get("session_id"):
                owner = await run_in_threadpool(session_owner, str(payload["session_id"]))
                if owner:
                    ids.add(owner)
    if path.startswith(("/api/sessions/", "/api/lesson-results/")):
        owner = await run_in_threadpool(session_owner, unquote(parts[3]))
        if owner:
            ids.add(owner)
    context = None
    for user_id in ids:
        bound = await run_in_threadpool(accounts.account_for_user, user_id)
        if bearer:
            owned = await run_in_threadpool(accounts.account_for_identity, request.state.identity)
            if not owned or owned["deleted"] or owned["user_id"] != user_id:
                raise HTTPException(403, "Esta información pertenece a otra cuenta.")
            context = (user_id, request.headers.get("x-progress-generation", ""))
        elif bound:
            raise HTTPException(401, "Inicia sesión para acceder a esta cuenta.")
    # New clients update profiles and delete accounts through versioned account
    # routes. Name lookup, raw profile PUT and local-only deletion cannot bypass it.
    if context and (path.startswith("/api/users/by-name/") or path == "/api/users"
                    or (path.startswith("/api/users/") and request.method != "GET")):
        raise HTTPException(403, "Usa los controles de tu cuenta para esta acción.")
    if path == "/api/users" and not bearer:
        import os
        if os.getenv("LEGACY_LEARNER_LOGIN_ENABLED", "true").lower() != "true":
            raise HTTPException(401, "Crea una cuenta para continuar.")
    return context


def session_owner(session_id):
    with tracking.engine.connect() as db:
        return db.execute(text("SELECT user_id FROM lesson_sessions WHERE id=:id"), {"id": session_id}).scalar()
