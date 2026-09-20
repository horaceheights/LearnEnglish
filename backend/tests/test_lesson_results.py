import unittest
from unittest.mock import patch
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool
from backend.app import tracking


class LessonResultTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', poolclass=StaticPool)
        self.patching = patch.object(tracking, 'engine', self.engine)
        self.patching.start()
        tracking.init_db()
        self.user = tracking.create_or_update_user(tracking.UserCreate(display_name='Result Learner'))

    def tearDown(self):
        self.patching.stop()
        self.engine.dispose()

    def payload(self, **overrides):
        return tracking.LessonResultSync(**dict(dict(id='offline-run', userId=self.user['id'],
            lessonId='lesson-1', totalCards=10, initialScore=7, missedCards=[7, 8, 9],
            ungradedCards=[], recoveredCards=[], completedAt='2026-09-20T10:00:00.000Z'), **overrides))

    def test_offline_recovery_is_idempotent_and_keeps_initial_grade(self):
        tracking.sync_lesson_result(self.payload())
        self.assertFalse(tracking.get_lesson_progress(self.user['id'])[0]['passed'])
        tracking.sync_lesson_result(self.payload(recoveredCards=[7, 7]))
        tracking.sync_lesson_result(self.payload())  # delayed original request
        progress = tracking.get_lesson_progress(self.user['id'])[0]
        self.assertTrue(progress['passed'])
        self.assertEqual((7, 8), (progress['initial_score'], progress['score']))
        tracking.sync_lesson_result(self.payload(recoveredCards=[8, 9]))
        self.assertEqual(100, tracking.get_lesson_progress(self.user['id'])[0]['percentage'])
        with self.engine.begin() as db:
            self.assertEqual(1, db.execute(text('SELECT COUNT(*) FROM lesson_sessions')).scalar())

    def test_delayed_session_start_and_legacy_finish_do_not_erase_recovery(self):
        tracking.sync_lesson_result(self.payload(recoveredCards=[7]))
        tracking.create_session(tracking.SessionCreate(id='offline-run', user_id=self.user['id'], lesson_id='lesson-1', total_cards=10))
        tracking.finish_session('offline-run', tracking.SessionFinish(score=1, total_cards=10))
        progress = tracking.get_lesson_progress(self.user['id'])[0]
        self.assertEqual((7, 8), (progress['initial_score'], progress['score']))

    def test_result_baseline_and_identity_cannot_change(self):
        tracking.sync_lesson_result(self.payload())
        with self.assertRaises(ValueError):
            tracking.sync_lesson_result(self.payload(initialScore=8, missedCards=[8,9]))
        other = tracking.create_or_update_user(tracking.UserCreate(display_name='Other Learner'))
        with self.assertRaises(ValueError):
            tracking.sync_lesson_result(self.payload(userId=other['id']))
        with self.assertRaises(ValueError):
            self.payload(recoveredCards=[0])

    def test_pending_pronunciation_cannot_pass_until_evaluated(self):
        tracking.sync_lesson_result(self.payload(initialScore=9, missedCards=[], ungradedCards=[9]))
        self.assertFalse(tracking.get_lesson_progress(self.user['id'])[0]['passed'])
        tracking.sync_lesson_result(self.payload(initialScore=9, missedCards=[], ungradedCards=[9], recoveredCards=[9]))
        self.assertTrue(tracking.get_lesson_progress(self.user['id'])[0]['passed'])

    def test_below_threshold_never_displays_eighty(self):
        tracking.sync_lesson_result(self.payload(totalCards=1000, initialScore=799, missedCards=list(range(799, 1000))))
        progress = tracking.get_lesson_progress(self.user['id'])[0]
        self.assertEqual(79, progress['percentage'])
        self.assertFalse(progress['passed'])

    def test_new_failed_run_keeps_earlier_pass_and_separate_history(self):
        tracking.sync_lesson_result(self.payload(recoveredCards=[7]))
        tracking.sync_lesson_result(self.payload(id='restart', initialScore=0, missedCards=list(range(10)), completedAt='2026-09-20T11:00:00.000Z'))
        progress = tracking.get_lesson_progress(self.user['id'])[0]
        self.assertTrue(progress['passed'])
        self.assertEqual(0, progress['score'])


if __name__ == '__main__':
    unittest.main()
