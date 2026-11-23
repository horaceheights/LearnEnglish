import unittest
from scripts.listening_contract import ordinary_listening_errors


class OrdinaryListeningContractTests(unittest.TestCase):
    def test_schedule_cannot_silently_become_a_meeting_proposal(self):
        options = [{"id": "six", "text": "Let's meet at six."},
                   {"id": "seven", "text": "Let's meet at seven."}]
        self.assertTrue(ordinary_listening_errors(None,
            "I arrive home at six. I finish work at seven.", options, "seven"))
        self.assertEqual([], ordinary_listening_errors(None, "Let's meet at seven.", options, "seven"))
        self.assertTrue(ordinary_listening_errors(None,
            "Let's meet at six. Let's meet at seven.", options, "seven"))

    def test_spanish_cannot_supply_missing_assessment_premises(self):
        options = [{"id": "home", "text": "I study at home."}]
        self.assertTrue(ordinary_listening_errors("Ambos están disponibles.",
            "I study at home.", options, "home"))

    def test_unknown_next_question_is_rejected_but_spoken_question_is_supported(self):
        options = [{"id": "where", "text": "Where do you study?"},
                   {"id": "when", "text": "When do you study?"}]
        self.assertTrue(ordinary_listening_errors(None, "I study at home.", options, "when"))
        self.assertEqual([], ordinary_listening_errors(None, "When do you study?", options, "when"))

    def test_direct_comprehension_does_not_require_verbatim_matching(self):
        self.assertEqual([], ordinary_listening_errors(None, "I arrive home after I finish work.",
            [{"id": "order", "text": "First, I finish work. Then, I arrive home."}], "order"))
