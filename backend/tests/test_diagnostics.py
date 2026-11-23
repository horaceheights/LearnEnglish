import os
import unittest
from unittest.mock import patch

from backend.app.diagnostics import _sample_rate, initialize_diagnostics


class DiagnosticsConfigurationTests(unittest.TestCase):
    def test_trace_sample_rate_is_bounded_and_has_a_safe_default(self):
        self.assertEqual(0.2, _sample_rate(None))
        self.assertEqual(0.2, _sample_rate("not-a-number"))
        self.assertEqual(0.0, _sample_rate("-1"))
        self.assertEqual(1.0, _sample_rate("2"))
        self.assertEqual(0.35, _sample_rate("0.35"))

    def test_missing_dsn_leaves_backend_reporting_disabled(self):
        with patch.dict(os.environ, {"SENTRY_DSN": ""}, clear=False):
            self.assertFalse(initialize_diagnostics())


if __name__ == "__main__":
    unittest.main()
