import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


DB_PATH = Path(__file__).resolve().parents[1] / "learnenglish.db"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                profile_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lesson_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                score INTEGER DEFAULT 0,
                total_cards INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

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
            );
            """
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


def row_to_user(row: sqlite3.Row) -> dict[str, Any]:
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

    with connect() as db:
        duplicate = db.execute(
            """
            SELECT * FROM users
            WHERE lower(display_name) = lower(?) AND (? IS NULL OR id != ?)
            """,
            (display_name, user_id, user_id),
        ).fetchone()
        if duplicate:
            return row_to_user(duplicate)

        if user_id:
            existing = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
            if existing:
                db.execute(
                    """
                    UPDATE users
                    SET display_name = ?, profile_json = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (display_name, profile_json, timestamp, user_id),
                )
                row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                return row_to_user(row)

        new_id = user_id or str(uuid.uuid4())
        db.execute(
            """
            INSERT INTO users (id, display_name, profile_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (new_id, display_name, profile_json, timestamp, timestamp),
        )
        row = db.execute("SELECT * FROM users WHERE id = ?", (new_id,)).fetchone()
        return row_to_user(row)


def get_user(user_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return row_to_user(row) if row else None


def get_user_by_name(display_name: str) -> dict[str, Any] | None:
    name = display_name.strip()
    if not name:
        return None

    with connect() as db:
        row = db.execute("SELECT * FROM users WHERE lower(display_name) = lower(?)", (name,)).fetchone()
    return row_to_user(row) if row else None


def create_session(payload: SessionCreate) -> dict[str, Any]:
    session_id = str(uuid.uuid4())
    timestamp = now_iso()
    with connect() as db:
        db.execute(
            """
            INSERT INTO lesson_sessions (id, user_id, lesson_id, started_at, total_cards)
            VALUES (?, ?, ?, ?, ?)
            """,
            (session_id, payload.user_id, payload.lesson_id, timestamp, payload.total_cards),
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
    with connect() as db:
        cursor = db.execute(
            """
            UPDATE lesson_sessions
            SET finished_at = ?, score = ?, total_cards = ?
            WHERE id = ?
            """,
            (timestamp, payload.score, payload.total_cards, session_id),
        )
        if cursor.rowcount == 0:
            return None
    return {"id": session_id, "finished_at": timestamp, "score": payload.score, "total_cards": payload.total_cards}


def create_attempt(payload: CardAttemptCreate) -> dict[str, Any]:
    attempt_id = str(uuid.uuid4())
    timestamp = now_iso()
    with connect() as db:
        db.execute(
            """
            INSERT INTO card_attempts (
                id, session_id, user_id, lesson_id, card_index, prompt,
                selected_option_id, correct_option_id, is_correct, first_try, attempted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attempt_id,
                payload.session_id,
                payload.user_id,
                payload.lesson_id,
                payload.card_index,
                payload.prompt,
                payload.selected_option_id,
                payload.correct_option_id,
                int(payload.is_correct),
                int(payload.first_try),
                timestamp,
            ),
        )
    return {"id": attempt_id, "attempted_at": timestamp}


def admin_summary() -> dict[str, Any]:
    with connect() as db:
        totals = db.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM users) AS users,
                (SELECT COUNT(*) FROM lesson_sessions) AS sessions,
                (SELECT COUNT(*) FROM lesson_sessions WHERE finished_at IS NOT NULL) AS completed_sessions,
                (SELECT COUNT(*) FROM card_attempts) AS attempts
            """
        ).fetchone()
        learners = db.execute(
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
                SELECT user_id, COUNT(*) AS sessions, COALESCE(MAX(finished_at), MAX(started_at)) AS last_seen
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
                COALESCE(st.last_seen, u.updated_at) AS last_seen,
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
            ORDER BY last_seen DESC
            """
        ).fetchall()
        difficult_cards = db.execute(
            """
            SELECT prompt, COUNT(*) AS attempts, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS misses
            FROM card_attempts
            GROUP BY prompt
            HAVING misses > 0
            ORDER BY misses DESC, attempts DESC
            LIMIT 10
            """
        ).fetchall()

    return {
        "totals": dict(totals),
        "learners": [dict(row) for row in learners],
        "difficult_cards": [dict(row) for row in difficult_cards],
    }
