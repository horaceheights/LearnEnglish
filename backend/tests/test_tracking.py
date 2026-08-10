import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from backend.app import tracking
from backend.app.tracking import (
    CardAttemptCreate,
    SessionCreate,
    SessionFinish,
    UserCreate,
    engine,
)


class TrackingDatabaseConfigurationTests(unittest.TestCase):
    def test_pool_rejects_stale_connections(self):
        self.assertTrue(engine.pool._pre_ping)
        self.assertEqual(300, engine.pool._recycle)


class AdminSummaryTests(unittest.TestCase):
    def setUp(self):
        self.test_engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.engine_patch = patch.object(tracking, "engine", self.test_engine)
        self.engine_patch.start()
        tracking.init_db()

    def tearDown(self):
        self.engine_patch.stop()
        self.test_engine.dispose()

    def test_summary_explains_activity_and_scores_by_lesson(self):
        user = tracking.create_or_update_user(UserCreate(display_name="Ana"))
        first = tracking.create_session(SessionCreate(user_id=user["id"], lesson_id="lesson-1-people-actions", total_cards=10))
        second = tracking.create_session(SessionCreate(user_id=user["id"], lesson_id="lesson-1-people-actions", total_cards=10))
        tracking.create_session(SessionCreate(user_id=user["id"], lesson_id="lesson-2-pronouns", total_cards=10))
        tracking.finish_session(first["id"], SessionFinish(score=8, total_cards=10))
        tracking.finish_session(second["id"], SessionFinish(score=10, total_cards=10))

        for card_index, is_correct in [(0, False), (0, True), (1, True)]:
            tracking.create_attempt(
                CardAttemptCreate(
                    session_id=first["id"],
                    user_id=user["id"],
                    lesson_id="lesson-1-people-actions",
                    card_index=card_index,
                    prompt="The girl",
                    selected_option_id="choice",
                    correct_option_id="choice" if is_correct else "correct",
                    is_correct=is_correct,
                    first_try=card_index == 1,
                )
            )

        summary = tracking.admin_summary()
        learner = summary["learners"][0]

        self.assertEqual(3, summary["totals"]["lesson_visits"])
        self.assertEqual(2, summary["totals"]["completed_lessons"])
        self.assertEqual(2, summary["totals"]["cards_practiced"])
        self.assertEqual(3, summary["totals"]["answer_taps"])
        self.assertEqual(3, learner["visits"])
        self.assertEqual(2, learner["cards_practiced"])
        self.assertEqual(90.0, learner["lesson_scores"]["lesson-1-people-actions"]["average_score"])
        self.assertEqual(0, learner["lesson_scores"]["lesson-2-pronouns"]["completed_runs"])
        self.assertTrue(any(lesson["number"] == "1.1" for lesson in summary["lessons"]))

    def test_delete_user_removes_profile_sessions_and_attempts(self):
        user = tracking.create_or_update_user(UserCreate(display_name="Delete Me"))
        session = tracking.create_session(
            SessionCreate(user_id=user["id"], lesson_id="lesson-1-people-actions", total_cards=10)
        )
        tracking.create_attempt(
            CardAttemptCreate(
                session_id=session["id"],
                user_id=user["id"],
                lesson_id="lesson-1-people-actions",
                card_index=0,
                prompt="The boy",
                selected_option_id="boy",
                correct_option_id="boy",
                is_correct=True,
                first_try=True,
            )
        )

        self.assertTrue(tracking.delete_user_and_activity(user["id"]))
        self.assertIsNone(tracking.get_user(user["id"]))

        with self.test_engine.begin() as db:
            sessions = db.exec_driver_sql(
                "SELECT COUNT(*) FROM lesson_sessions WHERE user_id = ?", (user["id"],)
            ).scalar_one()
            attempts = db.exec_driver_sql(
                "SELECT COUNT(*) FROM card_attempts WHERE user_id = ?", (user["id"],)
            ).scalar_one()

        self.assertEqual(0, sessions)
        self.assertEqual(0, attempts)
        self.assertFalse(tracking.delete_user_and_activity(user["id"]))

    def test_reset_user_activity_preserves_profile_and_removes_progress(self):
        user = tracking.create_or_update_user(UserCreate(display_name="Start Again"))
        session = tracking.create_session(
            SessionCreate(user_id=user["id"], lesson_id="lesson-1-people-actions", total_cards=10)
        )
        tracking.create_attempt(
            CardAttemptCreate(
                session_id=session["id"],
                user_id=user["id"],
                lesson_id="lesson-1-people-actions",
                card_index=0,
                prompt="The girl",
                selected_option_id="girl",
                correct_option_id="girl",
                is_correct=True,
                first_try=True,
            )
        )

        self.assertTrue(tracking.reset_user_activity(user["id"]))
        self.assertIsNotNone(tracking.get_user(user["id"]))

        with self.test_engine.begin() as db:
            sessions = db.exec_driver_sql(
                "SELECT COUNT(*) FROM lesson_sessions WHERE user_id = ?", (user["id"],)
            ).scalar_one()
            attempts = db.exec_driver_sql(
                "SELECT COUNT(*) FROM card_attempts WHERE user_id = ?", (user["id"],)
            ).scalar_one()

        self.assertEqual(0, sessions)
        self.assertEqual(0, attempts)
        reset_learner = next(
            learner
            for learner in tracking.admin_summary()["learners"]
            if learner["id"] == user["id"]
        )
        self.assertIsNone(reset_learner["last_seen"])
        self.assertFalse(tracking.reset_user_activity("missing-user"))

    def test_attempt_recovers_session_deleted_by_user_reset(self):
        user = tracking.create_or_update_user(UserCreate(display_name="Open Lesson"))
        session = tracking.create_session(
            SessionCreate(user_id=user["id"], lesson_id="lesson-1-people-actions", total_cards=10)
        )
        self.assertTrue(tracking.reset_user_activity(user["id"]))

        saved = tracking.create_attempt(
            CardAttemptCreate(
                session_id=session["id"],
                user_id=user["id"],
                lesson_id="lesson-1-people-actions",
                card_index=4,
                prompt="The boy",
                selected_option_id="boy",
                correct_option_id="boy",
                is_correct=True,
                first_try=True,
            )
        )

        self.assertTrue(saved["session_recovered"])
        with self.test_engine.begin() as db:
            recovered_session = db.exec_driver_sql(
                "SELECT user_id, lesson_id FROM lesson_sessions WHERE id = ?",
                (session["id"],),
            ).fetchone()
            attempts = db.exec_driver_sql(
                "SELECT COUNT(*) FROM card_attempts WHERE session_id = ?",
                (session["id"],),
            ).scalar_one()

        self.assertEqual((user["id"], "lesson-1-people-actions"), recovered_session)
        self.assertEqual(1, attempts)

        second = tracking.create_attempt(
            CardAttemptCreate(
                session_id=session["id"],
                user_id=user["id"],
                lesson_id="lesson-1-people-actions",
                card_index=5,
                prompt="The girl",
                selected_option_id="girl",
                correct_option_id="girl",
                is_correct=True,
                first_try=True,
            )
        )
        self.assertFalse(second["session_recovered"])

    def test_attempt_rejects_session_owned_by_another_user(self):
        owner = tracking.create_or_update_user(UserCreate(display_name="Session Owner"))
        other = tracking.create_or_update_user(UserCreate(display_name="Different Learner"))
        session = tracking.create_session(
            SessionCreate(user_id=owner["id"], lesson_id="lesson-1-people-actions", total_cards=10)
        )

        with self.assertRaisesRegex(ValueError, "Session does not match learner and lesson"):
            tracking.create_attempt(
                CardAttemptCreate(
                    session_id=session["id"],
                    user_id=other["id"],
                    lesson_id="lesson-1-people-actions",
                    card_index=0,
                    prompt="The boy",
                    selected_option_id="boy",
                    correct_option_id="boy",
                    is_correct=True,
                    first_try=True,
                )
            )

    def test_feedback_is_saved_and_visible_in_admin_summary(self):
        user = tracking.create_or_update_user(UserCreate(display_name="Horace"))
        session = tracking.create_session(
            SessionCreate(user_id=user["id"], lesson_id="lesson-1-people-actions", total_cards=10)
        )
        saved = tracking.create_lesson_feedback(
            tracking.LessonFeedbackCreate(
                user_id=user["id"],
                session_id=session["id"],
                lesson_id="lesson-1-people-actions",
                clarity_rating="Fácil",
                learning_support="Sí, ambos",
                comment_text="  La práctica fue clara.  ",
                score=9,
                total_cards=10,
                app_version="1.5.0",
                update_id="pilot-update",
                viewport_width=1920,
                viewport_height=1200,
            )
        )

        feedback = tracking.admin_summary()["feedback"]
        self.assertEqual(saved["id"], feedback[0]["id"])
        self.assertEqual("Horace", feedback[0]["display_name"])
        self.assertEqual("La práctica fue clara.", feedback[0]["comment_text"])
        self.assertEqual("Fácil", feedback[0]["clarity_rating"])


if __name__ == "__main__":
    unittest.main()
