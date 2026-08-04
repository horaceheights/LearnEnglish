import unittest
from unittest.mock import patch

from backend.app import legal


class LegalPageTests(unittest.TestCase):
    def test_privacy_policy_discloses_core_data_processing(self):
        page = legal.privacy_policy_html()

        self.assertIn("Política de privacidad", page)
        self.assertIn("grabaciones de voz", page)
        self.assertIn("Microsoft Azure Speech", page)
        self.assertIn("Sentry", page)
        self.assertIn('/delete-account', page)

    def test_deletion_page_identifies_data_and_in_app_steps(self):
        page = legal.account_deletion_html()

        self.assertIn("Eliminar mi perfil y mis datos", page)
        self.assertIn("progreso", page)
        self.assertIn("intentos y respuestas", page)

    def test_support_email_is_escaped_before_rendering(self):
        with patch.object(legal, "SUPPORT_EMAIL", 'support@example.com"><script>'):
            page = legal.account_deletion_html()

        self.assertNotIn("<script>", page)
        self.assertIn("support@example.com&quot;&gt;&lt;script&gt;", page)


if __name__ == "__main__":
    unittest.main()
