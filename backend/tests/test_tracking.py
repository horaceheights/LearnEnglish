import unittest

from backend.app.tracking import engine


class TrackingDatabaseConfigurationTests(unittest.TestCase):
    def test_pool_rejects_stale_connections(self):
        self.assertTrue(engine.pool._pre_ping)
        self.assertEqual(300, engine.pool._recycle)


if __name__ == "__main__":
    unittest.main()
