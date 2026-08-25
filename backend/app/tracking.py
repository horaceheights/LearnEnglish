import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import RowMapping

from .data import LESSONS


DB_PATH = Path(__file__).resolve().parents[1] / "learnenglish.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    # Render and serverless Postgres providers can close idle SSL connections.
    # Validate pooled connections before checkout and retire them proactively.
    pool_pre_ping=True,
    pool_recycle=300,
)


def storage_info() -> dict[str, Any]:
    return {
        "database_configured": bool(os.getenv("DATABASE_URL")),
        "database_type": "postgres" if DATABASE_URL.startswith("postgresql") else "sqlite",
        "sqlite_path": str(DB_PATH) if DATABASE_URL.startswith("sqlite") else None,
    }


def now_iso() -> str:
    seconds, nanoseconds = divmod(time.time_ns(), 1_000_000_000)
    timestamp = datetime.fromtimestamp(seconds, timezone.utc)
    return f"{timestamp:%Y-%m-%dT%H:%M:%S}.{nanoseconds:09d}+00:00"


def init_db() -> None:
    with engine.begin() as db:
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    display_name TEXT NOT NULL,
                    profile_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
        )
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS lesson_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    lesson_id TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    finished_order BIGINT,
                    score INTEGER DEFAULT 0,
                    total_cards INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
                """
            )
        )
        session_columns = {column["name"] for column in inspect(db).get_columns("lesson_sessions")}
        if "finished_order" not in session_columns:
            db.execute(text("ALTER TABLE lesson_sessions ADD COLUMN finished_order BIGINT"))
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS tracking_counters (
                    name TEXT PRIMARY KEY,
                    value BIGINT NOT NULL
                )
                """
            )
        )
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS lesson_feedback (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    session_id TEXT,
                    lesson_id TEXT NOT NULL,
                    clarity_rating TEXT NOT NULL,
                    learning_support TEXT NOT NULL,
                    comment_text TEXT,
                    score INTEGER DEFAULT 0,
                    total_cards INTEGER DEFAULT 0,
                    app_version TEXT,
                    update_id TEXT,
                    viewport_width INTEGER,
                    viewport_height INTEGER,
                    submitted_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (session_id) REFERENCES lesson_sessions (id)
                )
                """
            )
        )
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS card_attempts (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    lesson_id TEXT NOT NULL,
                    card_index INTEGER NOT NULL,
                    prompt TEXT NOT NULL,
                    selected_option_id TEXT NOT NULL,
                    correct_option_id TEXT NOT NULL,
                    is_correct INTEGER NOT NULL,
                    first_try INTEGER NOT NULL,
                    attempted_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES lesson_sessions (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
                """
            )
        )


class UserCreate(BaseModel):
    display_name: str = Field(default="Student", max_length=80)
    profile: dict[str, Any] = Field(default_factory=dict)


class SessionCreate(BaseModel):
    user_id: str
    lesson_id: str
    total_cards: int


class SessionFinish(BaseModel):
    score: int
    total_cards: int


class CardAttemptCreate(BaseModel):
    session_id: str
    user_id: str
    lesson_id: str
    card_index: int
    prompt: str
    selected_option_id: str
    correct_option_id: str
    is_correct: bool
    first_try: bool


class LessonFeedbackCreate(BaseModel):
    user_id: str
    session_id: str | None = None
    lesson_id: str
    clarity_rating: str = Field(max_length=40)
    learning_support: str = Field(max_length=40)
    comment_text: str | None = Field(default=None, max_length=2000)
    score: int = 0
    total_cards: int = 0
    app_version: str | None = Field(default=None, max_length=40)
    update_id: str | None = Field(default=None, max_length=80)
    viewport_width: int | None = None
    viewport_height: int | None = None


def row_to_user(row: RowMapping) -> dict[str, Any]:
    return {
        "id": row["id"],
        "display_name": row["display_name"],
        "profile": json.loads(row["profile_json"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def create_or_update_user(payload: UserCreate, user_id: str | None = None) -> dict[str, Any]:
    timestamp = now_iso()
    display_name = payload.display_name.strip() or "Student"
    profile_json = json.dumps(payload.profile)

    with engine.begin() as db:
        if user_id:
            duplicate = db.execute(
                text(
                    """
                    SELECT * FROM users
                    WHERE lower(display_name) = lower(:display_name)
                    AND id != :user_id
                    """
                ),
                {"display_name": display_name, "user_id": user_id},
            ).mappings().fetchone()
        else:
            duplicate = db.execute(
            text(
                """
                SELECT * FROM users
                WHERE lower(display_name) = lower(:display_name)
                ORDER BY updated_at DESC
                """
            ),
            {"display_name": display_name},
        ).mappings().fetchone()
        if duplicate:
            db.execute(
                text(
                    """
                    UPDATE users
                    SET profile_json = :profile_json,
                        updated_at = :updated_at
                    WHERE id = :user_id
                    """
                ),
                {
                    "profile_json": profile_json,
                    "updated_at": timestamp,
                    "user_id": duplicate["id"],
                },
            )
            row = db.execute(
                text("SELECT * FROM users WHERE id = :user_id"),
                {"user_id": duplicate["id"]},
            ).mappings().fetchone()
            return row_to_user(row)

        if user_id:
            existing = db.execute(
                text("SELECT id FROM users WHERE id = :user_id"),
                {"user_id": user_id},
            ).fetchone()
            if existing:
                db.execute(
                    text(
                        """
                        UPDATE users
                        SET display_name = :display_name,
                            profile_json = :profile_json,
                            updated_at = :updated_at
                        WHERE id = :user_id
                        """
                    ),
                    {
                        "display_name": display_name,
                        "profile_json": profile_json,
                        "updated_at": timestamp,
                        "user_id": user_id,
                    },
                )
                row = db.execute(
                    text("SELECT * FROM users WHERE id = :user_id"),
                    {"user_id": user_id},
                ).mappings().fetchone()
                return row_to_user(row)

        new_id = user_id or str(uuid.uuid4())
        db.execute(
            text(
                """
                INSERT INTO users (id, display_name, profile_json, created_at, updated_at)
                VALUES (:id, :display_name, :profile_json, :created_at, :updated_at)
                """
            ),
            {
                "id": new_id,
                "display_name": display_name,
                "profile_json": profile_json,
                "created_at": timestamp,
                "updated_at": timestamp,
            },
        )
        row = db.execute(
            text("SELECT * FROM users WHERE id = :user_id"),
            {"user_id": new_id},
        ).mappings().fetchone()
        return row_to_user(row)


def get_user(user_id: str) -> dict[str, Any] | None:
    with engine.begin() as db:
        row = db.execute(
            text("SELECT * FROM users WHERE id = :user_id"),
            {"user_id": user_id},
        ).mappings().fetchone()
    return row_to_user(row) if row else None


def get_user_by_name(display_name: str) -> dict[str, Any] | None:
    name = display_name.strip()
    if not name:
        return None

    with engine.begin() as db:
        row = db.execute(
            text(
                """
                SELECT * FROM users
                WHERE lower(display_name) = lower(:display_name)
                ORDER BY updated_at DESC
                """
            ),
            {"display_name": name},
        ).mappings().fetchone()
    return row_to_user(row) if row else None


def delete_user_and_activity(user_id: str) -> bool:
    """Delete a learner profile and every activity record linked to it."""
    with engine.begin() as db:
        existing = db.execute(
            text("SELECT id FROM users WHERE id = :user_id"),
            {"user_id": user_id},
        ).fetchone()
        if existing is None:
            return False

        # Delete children explicitly so this works consistently in SQLite and
        # Postgres even when an older database was created without cascades.
        db.execute(
            text("DELETE FROM lesson_feedback WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        db.execute(
            text("DELETE FROM card_attempts WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        db.execute(
            text("DELETE FROM lesson_sessions WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        db.execute(
            text("DELETE FROM users WHERE id = :user_id"),
            {"user_id": user_id},
        )
    return True


def reset_user_activity(user_id: str) -> bool:
    """Delete a learner's tracked progress while preserving the profile."""
    with engine.begin() as db:
        existing = db.execute(
            text("SELECT id FROM users WHERE id = :user_id"),
            {"user_id": user_id},
        ).fetchone()
        if existing is None:
            return False

        # Attempts reference sessions, so remove them first for databases that
        # were created before foreign-key cascades were enabled.
        db.execute(
            text("DELETE FROM lesson_feedback WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        db.execute(
            text("DELETE FROM card_attempts WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        db.execute(
            text("DELETE FROM lesson_sessions WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
    return True


def create_session(payload: SessionCreate) -> dict[str, Any]:
    session_id = str(uuid.uuid4())
    timestamp = now_iso()
    with engine.begin() as db:
        db.execute(
            text(
                """
                INSERT INTO lesson_sessions (id, user_id, lesson_id, started_at, total_cards)
                VALUES (:id, :user_id, :lesson_id, :started_at, :total_cards)
                """
            ),
            {
                "id": session_id,
                "user_id": payload.user_id,
                "lesson_id": payload.lesson_id,
                "started_at": timestamp,
                "total_cards": payload.total_cards,
            },
        )
    return {
        "id": session_id,
        "user_id": payload.user_id,
        "lesson_id": payload.lesson_id,
        "started_at": timestamp,
        "total_cards": payload.total_cards,
    }


def finish_session(session_id: str, payload: SessionFinish) -> dict[str, Any] | None:
    timestamp = now_iso()
    with engine.begin() as db:
        result = db.execute(
            text(
                """
                UPDATE lesson_sessions
                SET finished_at = :finished_at,
                    score = :score,
                    total_cards = :total_cards
                WHERE id = :session_id
                """
            ),
            {
                "finished_at": timestamp,
                "score": payload.score,
                "total_cards": payload.total_cards,
                "session_id": session_id,
            },
        )
        if result.rowcount == 0:
            return None
        finished_order = db.execute(
            text(
                """
                INSERT INTO tracking_counters (name, value)
                VALUES ('lesson_session_finish', 1)
                ON CONFLICT (name) DO UPDATE
                SET value = tracking_counters.value + 1
                RETURNING value
                """
            )
        ).scalar_one()
        db.execute(
            text(
                """
                UPDATE lesson_sessions
                SET finished_order = :finished_order
                WHERE id = :session_id
                """
            ),
            {"finished_order": finished_order, "session_id": session_id},
        )
    return {"id": session_id, "finished_at": timestamp, "score": payload.score, "total_cards": payload.total_cards}


def get_lesson_progress(user_id: str) -> list[dict[str, Any]] | None:
    """Return the learner's most recent completed run for every completed lesson."""
    if get_user(user_id) is None:
        return None

    with engine.begin() as db:
        rows = db.execute(
            text(
                """
                WITH ranked_sessions AS (
                    SELECT
                        lesson_id,
                        score,
                        total_cards,
                        finished_at,
                        finished_order,
                        MAX(
                            CASE
                                WHEN total_cards > 0 AND (score * 100.0) / total_cards >= 80 THEN 1
                                ELSE 0
                            END
                        ) OVER (PARTITION BY lesson_id) AS passed,
                        ROW_NUMBER() OVER (
                            PARTITION BY lesson_id
                            ORDER BY
                                CASE WHEN finished_order IS NULL THEN 0 ELSE 1 END DESC,
                                finished_order DESC,
                                finished_at DESC,
                                id DESC
                        ) AS session_rank
                    FROM lesson_sessions
                    WHERE user_id = :user_id
                      AND finished_at IS NOT NULL
                )
                SELECT lesson_id, score, total_cards, finished_at, passed
                FROM ranked_sessions
                WHERE session_rank = 1
                ORDER BY lesson_id
                """
            ),
            {"user_id": user_id},
        ).mappings().all()

    return [
        {
            "lesson_id": row["lesson_id"],
            "completed": True,
            "passed": bool(row["passed"]),
            "score": row["score"],
            "total_cards": row["total_cards"],
            "percentage": round((row["score"] * 100) / row["total_cards"])
            if row["total_cards"] > 0
            else 0,
            "completed_at": row["finished_at"],
        }
        for row in rows
    ]


def create_attempt(payload: CardAttemptCreate) -> dict[str, Any]:
    attempt_id = str(uuid.uuid4())
    timestamp = now_iso()
    with engine.begin() as db:
        session = db.execute(
            text(
                """
                SELECT user_id, lesson_id
                FROM lesson_sessions
                WHERE id = :session_id
                """
            ),
            {"session_id": payload.session_id},
        ).mappings().fetchone()
        session_recovered = session is None

        if session_recovered:
            existing_user = db.execute(
                text("SELECT id FROM users WHERE id = :user_id"),
                {"user_id": payload.user_id},
            ).fetchone()
            if existing_user is None:
                raise ValueError("User not found")

            # An administrator can reset a learner while their lesson is still
            # open on a device. The device will keep the now-deleted session ID
            # until it leaves the lesson, so recreate that session as a fresh
            # run before accepting the next attempt. ON CONFLICT also makes the
            # recovery safe when two attempts arrive at nearly the same time.
            db.execute(
                text(
                    """
                    INSERT INTO lesson_sessions (
                        id, user_id, lesson_id, started_at, total_cards
                    )
                    VALUES (
                        :id, :user_id, :lesson_id, :started_at, 0
                    )
                    ON CONFLICT (id) DO NOTHING
                    """
                ),
                {
                    "id": payload.session_id,
                    "user_id": payload.user_id,
                    "lesson_id": payload.lesson_id,
                    "started_at": timestamp,
                },
            )
            session = db.execute(
                text(
                    """
                    SELECT user_id, lesson_id
                    FROM lesson_sessions
                    WHERE id = :session_id
                    """
                ),
                {"session_id": payload.session_id},
            ).mappings().fetchone()

        if (
            session is None
            or session["user_id"] != payload.user_id
            or session["lesson_id"] != payload.lesson_id
        ):
            raise ValueError("Session does not match learner and lesson")

        db.execute(
            text(
                """
                INSERT INTO card_attempts (
                    id, session_id, user_id, lesson_id, card_index, prompt,
                    selected_option_id, correct_option_id, is_correct, first_try, attempted_at
                )
                VALUES (
                    :id, :session_id, :user_id, :lesson_id, :card_index, :prompt,
                    :selected_option_id, :correct_option_id, :is_correct, :first_try, :attempted_at
                )
                """
            ),
            {
                "id": attempt_id,
                "session_id": payload.session_id,
                "user_id": payload.user_id,
                "lesson_id": payload.lesson_id,
                "card_index": payload.card_index,
                "prompt": payload.prompt,
                "selected_option_id": payload.selected_option_id,
                "correct_option_id": payload.correct_option_id,
                "is_correct": int(payload.is_correct),
                "first_try": int(payload.first_try),
                "attempted_at": timestamp,
            },
        )
    return {
        "id": attempt_id,
        "attempted_at": timestamp,
        "session_recovered": session_recovered,
    }


def create_lesson_feedback(payload: LessonFeedbackCreate) -> dict[str, Any]:
    feedback_id = str(uuid.uuid4())
    timestamp = now_iso()
    comment_text = (payload.comment_text or "").strip() or None
    with engine.begin() as db:
        existing_user = db.execute(
            text("SELECT id FROM users WHERE id = :user_id"),
            {"user_id": payload.user_id},
        ).fetchone()
        if existing_user is None:
            raise ValueError("User not found")
        db.execute(
            text(
                """
                INSERT INTO lesson_feedback (
                    id, user_id, session_id, lesson_id, clarity_rating,
                    learning_support, comment_text, score, total_cards,
                    app_version, update_id, viewport_width, viewport_height,
                    submitted_at
                )
                VALUES (
                    :id, :user_id, :session_id, :lesson_id, :clarity_rating,
                    :learning_support, :comment_text, :score, :total_cards,
                    :app_version, :update_id, :viewport_width, :viewport_height,
                    :submitted_at
                )
                """
            ),
            {
                "id": feedback_id,
                "user_id": payload.user_id,
                "session_id": payload.session_id,
                "lesson_id": payload.lesson_id,
                "clarity_rating": payload.clarity_rating,
                "learning_support": payload.learning_support,
                "comment_text": comment_text,
                "score": payload.score,
                "total_cards": payload.total_cards,
                "app_version": payload.app_version,
                "update_id": payload.update_id,
                "viewport_width": payload.viewport_width,
                "viewport_height": payload.viewport_height,
                "submitted_at": timestamp,
            },
        )
    return {"id": feedback_id, "submitted_at": timestamp}


def admin_summary() -> dict[str, Any]:
    with engine.begin() as db:
        totals = db.execute(
            text(
                """
                SELECT
                    (SELECT COUNT(*) FROM users) AS users,
                    (SELECT COUNT(*) FROM lesson_sessions) AS sessions,
                    (SELECT COUNT(*) FROM lesson_sessions WHERE finished_at IS NOT NULL) AS completed_sessions,
                    (
                        SELECT COUNT(*)
                        FROM (
                            SELECT session_id, card_index
                            FROM card_attempts
                            GROUP BY session_id, card_index
                        ) practiced_cards
                    ) AS cards_practiced,
                    (SELECT COUNT(*) FROM card_attempts) AS answer_taps
                """
            )
        ).mappings().fetchone()
        learners = db.execute(
            text(
                """
                WITH ranked_attempts AS (
                    SELECT
                        a.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY a.session_id, a.card_index
                            ORDER BY a.attempted_at, a.id
                        ) AS attempt_number
                    FROM card_attempts a
                ),
                card_totals AS (
                    SELECT
                        user_id,
                        session_id,
                        card_index,
                        COUNT(*) AS attempts_for_card
                    FROM card_attempts
                    GROUP BY user_id, session_id, card_index
                ),
                session_totals AS (
                    SELECT
                        user_id,
                        COUNT(*) AS sessions,
                        SUM(CASE WHEN finished_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_sessions,
                        MAX(COALESCE(finished_at, started_at)) AS last_seen
                    FROM lesson_sessions
                    GROUP BY user_id
                ),
                attempt_totals AS (
                    SELECT
                        user_id,
                        SUM(CASE WHEN is_correct = 1 AND attempt_number = 1 THEN 1 ELSE 0 END) AS first_try_correct,
                        SUM(CASE WHEN is_correct = 1 AND attempt_number = 2 THEN 1 ELSE 0 END) AS second_try_correct,
                        SUM(CASE WHEN is_correct = 1 AND attempt_number = 3 THEN 1 ELSE 0 END) AS third_try_correct,
                        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_cards,
                        COUNT(*) AS attempts
                    FROM ranked_attempts
                    GROUP BY user_id
                ),
                average_totals AS (
                    SELECT
                        user_id,
                        COUNT(*) AS cards_answered,
                        ROUND(AVG(attempts_for_card), 2) AS avg_attempts
                    FROM card_totals
                    GROUP BY user_id
                )
                SELECT
                    u.id,
                    u.display_name,
                    u.updated_at,
                    COALESCE(st.sessions, 0) AS sessions,
                    COALESCE(st.completed_sessions, 0) AS completed_sessions,
                    st.last_seen AS last_seen,
                    COALESCE(at.first_try_correct, 0) AS first_try_correct,
                    COALESCE(at.second_try_correct, 0) AS second_try_correct,
                    COALESCE(at.third_try_correct, 0) AS third_try_correct,
                    COALESCE(at.correct_cards, 0) AS correct_cards,
                    COALESCE(at.attempts, 0) AS attempts,
                    COALESCE(av.cards_answered, 0) AS cards_answered,
                    COALESCE(av.avg_attempts, 0) AS avg_attempts
                FROM users u
                LEFT JOIN session_totals st ON st.user_id = u.id
                LEFT JOIN attempt_totals at ON at.user_id = u.id
                LEFT JOIN average_totals av ON av.user_id = u.id
                ORDER BY
                    CASE WHEN st.last_seen IS NULL THEN 1 ELSE 0 END,
                    st.last_seen DESC,
                    u.updated_at DESC
                """
            )
        ).mappings().fetchall()
        lesson_results = db.execute(
            text(
                """
                SELECT
                    user_id,
                    lesson_id,
                    COUNT(*) AS visits,
                    SUM(CASE WHEN finished_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_runs,
                    ROUND(
                        AVG(
                            CASE
                                WHEN finished_at IS NOT NULL AND total_cards > 0
                                THEN (score * 100.0) / total_cards
                            END
                        ),
                        1
                    ) AS average_score,
                    MAX(
                        CASE
                            WHEN finished_at IS NOT NULL AND total_cards > 0
                            THEN (score * 100.0) / total_cards
                        END
                    ) AS best_score
                FROM lesson_sessions
                GROUP BY user_id, lesson_id
                """
            )
        ).mappings().fetchall()
        difficult_cards = db.execute(
            text(
                """
                SELECT prompt, COUNT(*) AS attempts, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS misses
                FROM card_attempts
                GROUP BY prompt
                HAVING SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) > 0
                ORDER BY misses DESC, attempts DESC
                LIMIT 10
                """
            )
        ).mappings().fetchall()
        feedback = db.execute(
            text(
                """
                SELECT
                    f.id,
                    f.lesson_id,
                    f.clarity_rating,
                    f.learning_support,
                    f.comment_text,
                    f.score,
                    f.total_cards,
                    f.app_version,
                    f.update_id,
                    f.viewport_width,
                    f.viewport_height,
                    f.submitted_at,
                    u.display_name
                FROM lesson_feedback f
                JOIN users u ON u.id = f.user_id
                ORDER BY f.submitted_at DESC
                LIMIT 100
                """
            )
        ).mappings().fetchall()

    lesson_catalog = [
        {
            "id": lesson.id,
            "number": lesson.sub_lesson_id,
            "title": lesson.sub_lesson_title,
        }
        for lesson in LESSONS.values()
        if lesson.sub_lesson_id != "TEST"
    ]
    scores_by_user: dict[str, dict[str, dict[str, Any]]] = {}
    for result in lesson_results:
        score = dict(result)
        user_scores = scores_by_user.setdefault(score["user_id"], {})
        user_scores[score["lesson_id"]] = {
            "visits": score["visits"],
            "completed_runs": score["completed_runs"],
            "average_score": float(score["average_score"]) if score["average_score"] is not None else None,
            "best_score": round(float(score["best_score"]), 1) if score["best_score"] is not None else None,
        }

    learner_rows = []
    for row in learners:
        learner = dict(row)
        learner["visits"] = learner["sessions"]
        learner["cards_practiced"] = learner["cards_answered"]
        learner["answer_taps"] = learner["attempts"]
        learner["lesson_scores"] = scores_by_user.get(learner["id"], {})
        learner_rows.append(learner)

    total_values = dict(totals)
    # Preserve the previous keys for older dashboard clients while exposing names
    # that describe what the numbers actually measure.
    total_values["lesson_visits"] = total_values["sessions"]
    total_values["completed_lessons"] = total_values["completed_sessions"]
    total_values["attempts"] = total_values["answer_taps"]

    return {
        "totals": total_values,
        "lessons": lesson_catalog,
        "learners": learner_rows,
        "difficult_cards": [dict(row) for row in difficult_cards],
        "feedback": [dict(row) for row in feedback],
    }


def reset_tracking_data() -> dict[str, str]:
    with engine.begin() as db:
        db.execute(text("DELETE FROM lesson_feedback"))
        db.execute(text("DELETE FROM card_attempts"))
        db.execute(text("DELETE FROM lesson_sessions"))
        db.execute(text("DELETE FROM users"))

    return {"status": "reset"}
