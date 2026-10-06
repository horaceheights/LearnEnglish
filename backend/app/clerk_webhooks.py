"""Signed provider deletion events purge data even outside our account screens."""
import os
import json
import uuid

from fastapi import HTTPException, Request
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool
from svix.webhooks import Webhook, WebhookVerificationError

from . import tracking


def erase_identity(issuer: str, subject: str):
    # Keep a minimal tombstone even if deletion arrives before the first login.
    # An already-issued session cannot create the deleted learner afterward.
    with tracking.engine.begin() as db:
        db.execute(text("""INSERT INTO learner_accounts (issuer,subject,user_id,generation,deleted)
            VALUES (:issuer,:subject,:id,:generation,1)
            ON CONFLICT (issuer,subject) DO UPDATE SET deleted=1,generation=:generation"""),
                   {"issuer": issuer, "subject": subject, "id": str(uuid.uuid4()), "generation": str(uuid.uuid4())})
        user_id = db.execute(text("SELECT user_id FROM learner_accounts WHERE issuer=:issuer AND subject=:subject"),
                             {"issuer": issuer, "subject": subject}).scalar_one()
    tracking.delete_user_and_activity(user_id)


async def receive(request: Request):
    secret = os.getenv("CLERK_WEBHOOK_SIGNING_SECRET", "").strip()
    issuer = os.getenv("CLERK_ISSUER", "").strip().rstrip("/")
    if not secret or not issuer:
        raise HTTPException(503, "Webhook not configured.")
    body = await request.body()
    if len(body) > 64000:
        raise HTTPException(413, "Webhook too large.")
    try:
        Webhook(secret).verify(body, dict(request.headers))
        event = json.loads(body)
    except (WebhookVerificationError, ValueError):
        raise HTTPException(400, "Invalid webhook signature.")
    if not isinstance(event, dict):
        raise HTTPException(400, "Invalid webhook event.")
    if event.get("type") == "user.deleted":
        data = event.get("data")
        subject = data.get("id") if isinstance(data, dict) else None
        if not isinstance(subject, str) or not subject:
            raise HTTPException(400, "Invalid deletion event.")
        await run_in_threadpool(erase_identity, issuer, subject)
    return {"received": True}
