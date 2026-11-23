"""Account binding and conflict-checked checkpoints, independent of Clerk IDs."""
import json
import os
import uuid
from contextvars import ContextVar

from fastapi import HTTPException
from sqlalchemy import text

from . import tracking
from .learner_auth import Identity

write_account: ContextVar[tuple[str, str] | None] = ContextVar("write_account", default=None)
operator_access: ContextVar[bool] = ContextVar("operator_access", default=False)


def guard_write(db, user_id):
    context = write_account.get()
    if context:
        if context[0] != user_id:
            raise HTTPException(403, "Esta información pertenece a otra cuenta.")
        lock_generation(db, user_id, context[1])
    elif not operator_access.get():
        if db.execute(text("SELECT user_id FROM learner_accounts WHERE user_id=:id"), {"id": user_id}).first():
            raise HTTPException(401, "Inicia sesión para acceder a esta cuenta.")


def init_account_db():
    with tracking.engine.begin() as db:
        db.execute(text("""CREATE TABLE IF NOT EXISTS learner_accounts (
            issuer TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL UNIQUE,
            generation TEXT NOT NULL, profile_version INTEGER NOT NULL DEFAULT 1,
            deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (issuer, subject))"""))
        db.execute(text("""CREATE TABLE IF NOT EXISTS learner_checkpoints (
            user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, revision INTEGER NOT NULL,
            run_json TEXT, PRIMARY KEY (user_id, lesson_id))"""))


def account_for_user(user_id):
    with tracking.engine.connect() as db:
        return db.execute(text("SELECT * FROM learner_accounts WHERE user_id=:id"), {"id": user_id}).mappings().first()


def account_for_identity(identity):
    with tracking.engine.connect() as db:
        return db.execute(text("SELECT * FROM learner_accounts WHERE issuer=:issuer AND subject=:subject"),
                          {"issuer": identity.issuer, "subject": identity.subject}).mappings().first()


def ensure_account(identity: Identity, display_name="Student"):
    params = {"issuer": identity.issuer, "subject": identity.subject, "id": str(uuid.uuid4()), "generation": str(uuid.uuid4())}
    with tracking.engine.begin() as db:
        db.execute(text("""INSERT INTO learner_accounts (issuer, subject, user_id, generation)
            VALUES (:issuer,:subject,:id,:generation) ON CONFLICT (issuer,subject) DO NOTHING"""), params)
        row = db.execute(text("SELECT * FROM learner_accounts WHERE issuer=:issuer AND subject=:subject"), params).mappings().one()
        if row["deleted"]:
            raise HTTPException(410, "Esta cuenta fue eliminada.")
        # Never claim a legacy learner by an editable display name or a client UUID.
        db.execute(text("""INSERT INTO users (id,display_name,profile_json,created_at,updated_at)
            VALUES (:id,:name,'{}',:now,:now) ON CONFLICT (id) DO NOTHING"""),
                   {"id": row["user_id"], "name": display_name.strip()[:80] or "Student", "now": tracking.now_iso()})
    return dict(row)


def lock_generation(db, user_id, generation):
    """All account writes and resets take the same lock before touching progress."""
    db.execute(text("UPDATE learner_accounts SET user_id=user_id WHERE user_id=:id"), {"id": user_id})
    row = db.execute(text("SELECT generation,deleted FROM learner_accounts WHERE user_id=:id"), {"id": user_id}).mappings().first()
    if row and (row["deleted"] or not generation or row["generation"] != generation):
        raise HTTPException(409, "Tu progreso cambió. Actualiza la cuenta antes de continuar.")


def adopt_first_name(account, name):
    """Replace only the untouched signup placeholder, under the profile write lock."""
    with tracking.engine.begin() as db:
        lock_generation(db, account["user_id"], account["generation"])
        version = db.execute(text("SELECT profile_version FROM learner_accounts WHERE user_id=:id"),
                             {"id": account["user_id"]}).scalar_one()
        if version != 1:
            return
        changed = db.execute(text("""UPDATE users SET display_name=:name,updated_at=:now
            WHERE id=:id AND display_name='Student'"""),
                             {"id": account["user_id"], "name": name, "now": tracking.now_iso()})
        if changed.rowcount:
            # An edit already opened on another device must refresh this new name.
            db.execute(text("UPDATE learner_accounts SET profile_version=profile_version+1 WHERE user_id=:id"),
                       {"id": account["user_id"]})


def snapshot(account):
    with tracking.engine.begin() as db:
        # One consistent snapshot, including profile and generation, during a reset.
        lock_generation(db, account["user_id"], account["generation"])
        current = db.execute(text("SELECT * FROM learner_accounts WHERE user_id=:id"), {"id": account["user_id"]}).mappings().one()
        user = db.execute(text("SELECT * FROM users WHERE id=:id"), {"id": account["user_id"]}).mappings().one()
        results = db.execute(text("""SELECT result_json,finished_order FROM lesson_sessions
            WHERE user_id=:id AND result_json IS NOT NULL ORDER BY finished_order"""), {"id": account["user_id"]}).mappings().all()
        checkpoints = db.execute(text("SELECT * FROM learner_checkpoints WHERE user_id=:id"), {"id": account["user_id"]}).mappings().all()
    qa_subjects = os.getenv("CLERK_QA_SUBJECTS", "").split(",")
    return {"user": tracking.row_to_user(user), "generation": current["generation"],
            "profileVersion": current["profile_version"], "qaAccess": current["subject"] in qa_subjects,
            "results": [{**json.loads(item["result_json"]), "serverOrder": item["finished_order"]} for item in results],
            "checkpoints": [{"lessonId": row["lesson_id"], "revision": row["revision"],
                             "run": json.loads(row["run_json"]) if row["run_json"] else None} for row in checkpoints]}


def update_profile(account, payload, version, generation):
    with tracking.engine.begin() as db:
        lock_generation(db, account["user_id"], generation)
        changed = db.execute(text("""UPDATE learner_accounts SET profile_version=profile_version+1
            WHERE user_id=:id AND profile_version=:version"""), {"id": account["user_id"], "version": version})
        if not changed.rowcount:
            raise HTTPException(409, "El perfil cambió en otro dispositivo. Actualiza antes de editarlo.")
        # Identity and privileges never come from profile JSON.
        profile = {key: value for key, value in payload.profile.items() if key not in ("userId", "authSubject", "qaAccess")}
        db.execute(text("""UPDATE users SET display_name=:name,profile_json=:profile,updated_at=:now WHERE id=:id"""),
                   {"id": account["user_id"], "name": payload.display_name.strip() or "Student",
                    "profile": json.dumps(profile), "now": tracking.now_iso()})
    return snapshot(account)


def save_checkpoint(account, lesson_id, run, revision, generation):
    with tracking.engine.begin() as db:
        lock_generation(db, account["user_id"], generation)
        db.execute(text("""INSERT INTO learner_checkpoints (user_id,lesson_id,revision,run_json)
            VALUES (:id,:lesson,0,NULL) ON CONFLICT (user_id,lesson_id) DO NOTHING"""),
                   {"id": account["user_id"], "lesson": lesson_id})
        row = db.execute(text("SELECT * FROM learner_checkpoints WHERE user_id=:id AND lesson_id=:lesson"),
                         {"id": account["user_id"], "lesson": lesson_id}).mappings().one()
        encoded = json.dumps(run, sort_keys=True) if run is not None else None
        # A retry after a lost acknowledgement is safe without granting a new revision.
        if row["run_json"] == encoded:
            return {"lessonId": lesson_id, "revision": row["revision"], "run": run}
        if row["revision"] != revision:
            raise HTTPException(409, {"code": "checkpoint_conflict", "lessonId": lesson_id,
                                      "revision": row["revision"], "run": json.loads(row["run_json"]) if row["run_json"] else None})
        db.execute(text("""UPDATE learner_checkpoints SET revision=revision+1,run_json=:run
            WHERE user_id=:id AND lesson_id=:lesson"""), {"id": account["user_id"], "lesson": lesson_id, "run": encoded})
        return {"lessonId": lesson_id, "revision": revision + 1, "run": run}
