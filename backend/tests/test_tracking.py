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


if __name__ == "__main__":
    unittest.main()
