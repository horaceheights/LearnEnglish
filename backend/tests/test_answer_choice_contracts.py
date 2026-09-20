import copy
import unittest

from scripts.answer_choice_guardrail import (
    analyze_bank, bank_fingerprint, bank_key, validate_banks,
)


def lesson_with(labels, *, stage="Recognize", images=False):
    card = {"slide_id": "R1", "stage": stage, "interaction_type": "i2t3",
            "prompt": "Choose the matching description.", "correct_option_id": "0",
            "options": [{"id": str(i), "label": label,
                         "image_url": f"{i}.webp" if images else ""}
                        for i, label in enumerate(labels)]}
    return {"id": "new-lesson", "cards": [card]}


def contract_for(lesson, exceptions=None):
    card = lesson["cards"][0]
    record = {"sha256": bank_fingerprint(card), "form": analyze_bank(card)[0]}
    if exceptions:
        record["exceptions"] = exceptions
    return {"schema_version": 1, "banks": {bank_key(lesson, card): record}}


class AnswerChoiceContractTests(unittest.TestCase):
    def test_mixed_forms_cannot_be_waived_even_with_matching_contract(self):
        sentences = ["The children play.", "The children played.", "They're playing.",
                     "They’re playing.", "The boy's playing.", "She won't play.",
                     "The children are playing", "He runs", "They’ve eaten."]
        for stage in ("Recognize", "Listen", "Use"):
            for images in (False, True):
                for sentence in sentences:
                    for labels in (["Working.", "Studying", sentence], [sentence, "Studying", "Working"]):
                        with self.subTest(stage=stage, images=images, labels=labels):
                            lesson = lesson_with(labels, stage=stage, images=images)
                            errors = validate_banks([lesson], contract_for(lesson, {
                                "mixed-forms": "Pretend this is an allowed exception to the structural rule."}))
                            self.assertTrue(any("mixes vocabulary" in e for e in errors), errors)

    def test_comparable_sentences_and_single_action_words_pass(self):
        for labels in (["Playing", "Studying", "Working"],
                       ["The children play.", "The father works.", "The mother cooks."],
                       ["They're playing.", "She's cooking.", "He's working."],
                       ["The father is working.", "The mother is cooking.", "The children are playing."]):
            lesson = lesson_with(labels)
            self.assertEqual([], validate_banks([lesson], contract_for(lesson)))

    def test_reading_load_and_sentence_depth_apply_beyond_lesson_16(self):
        for labels, expected in [
            (["The children are playing.", "The father is working very hard at the office all day.",
              "The mother is cooking."], "unequal reading load"),
            (["He works.", "She cooks. She cooks."], "different numbers"),
        ]:
            lesson = lesson_with(labels)
            errors = validate_banks([lesson], contract_for(lesson))
            self.assertTrue(any(expected in e for e in errors), errors)

    def test_repeated_subjects_and_actions_fail_in_new_lessons(self):
        for labels, expected in [
            (["The children are playing.", "The children are cooking.", "The children are working."], "repeats subjects"),
            (["The children play.", "The father plays.", "The mother plays."], "repeats actions"),
            (["He is the father. He is working.", "He is the father. He is cooking."], "repeats subjects"),
            (["The father works.", "A father cooks."], "repeats subjects"),
        ]:
            for images in (False, True):
                lesson = lesson_with(labels, images=images)
                errors = validate_banks([lesson], contract_for(lesson))
                self.assertTrue(any(expected in e for e in errors), errors)

    def test_compound_actions_and_explicit_identities_are_distinguished(self):
        lesson = lesson_with([
            "They are the grandparents. They are sitting and talking.",
            "They are the brothers. They are sitting and studying."])
        self.assertEqual([], validate_banks([lesson], contract_for(lesson)))

    def test_new_and_unrecognized_banks_require_review(self):
        for labels in (["Sparrows chirp.", "Robins warble."], ["Working", "Sparrows chirp."]):
            errors = validate_banks([lesson_with(labels)], {"schema_version": 1, "banks": {}})
            self.assertTrue(any("missing answer-choice contract" in e for e in errors))

    def test_every_material_bank_change_invalidates_its_contract(self):
        original = lesson_with(["The children play.", "The mother cooks."], images=True)
        contracts = contract_for(original)
        for field, changed in [("prompt", "Who is playing?"), ("audio_text", "New audio."),
                               ("answer_audio_text", "New answer."), ("correct_option_id", "1"),
                               ("prompt_image_url", "other-scene.webp"), ("interaction_type", "a2i2")]:
            lesson = copy.deepcopy(original)
            lesson["cards"][0][field] = changed
            self.assertTrue(any("stale" in e for e in validate_banks([lesson], contracts)), field)
        for field, changed in [("label", "The children swim."), ("image_url", "different.webp"), ("id", "new-id")]:
            lesson = copy.deepcopy(original)
            lesson["cards"][0]["options"][0][field] = changed
            self.assertTrue(any("stale" in e for e in validate_banks([lesson], contracts)), field)
        lesson = copy.deepcopy(original)
        lesson["cards"][0]["options"].reverse()
        self.assertTrue(any("stale" in e for e in validate_banks([lesson], contracts)))

    def test_caption_free_images_require_exact_contracts_too(self):
        lesson = lesson_with([None, None], images=True)
        self.assertEqual([], validate_banks([lesson], contract_for(lesson)))
        self.assertTrue(validate_banks([lesson], {"schema_version": 1, "banks": {}}))
        lesson["cards"][0]["options"][0]["label"] = "Working"
        self.assertTrue(any("partially labeled" in e for e in validate_banks([lesson], contract_for(lesson))))

    def test_natural_vocabulary_and_utterances_need_scoped_reasons(self):
        examples = [
            (["Bus", "Train", "Bus stop"], "lexical-phrase", "Bus stop is the taught multiword place name; keep each alternative a natural transport-related label."),
            (["Hello.", "Here you are.", "Thank you."], "conversational-response", "These are complete greetings, handover and thanks responses in the shop exchange."),
            (["Cross the street.", "Stop."], "conversational-response", "Both alternatives are complete direction imperatives; Stop is an entire instruction."),
        ]
        for labels, check, reason in examples:
            lesson = lesson_with(labels)
            self.assertTrue(validate_banks([lesson], contract_for(lesson)))
            self.assertEqual([], validate_banks([lesson], contract_for(lesson, {check: reason})))

    def test_grammar_exception_cannot_spread_to_another_card_or_content(self):
        lesson = lesson_with(["She is reading.", "She is not reading."])
        reasons = {check: "This card isolates positive versus negative polarity for the same woman's activity."
                   for check in ("subject-variety", "action-variety")}
        contracts = contract_for(lesson, reasons)
        self.assertEqual([], validate_banks([lesson], contracts))
        lesson["cards"][0]["slide_id"] = "R2"
        self.assertTrue(any("missing" in e for e in validate_banks([lesson], contracts)))
        lesson["cards"][0]["slide_id"] = "R1"
        lesson["cards"][0]["options"][1]["label"] = "She is cooking."
        errors = validate_banks([lesson], contracts)
        self.assertTrue(any("stale" in e for e in errors))
        self.assertTrue(any("unnecessary exception" in e for e in errors))

    def test_malformed_duplicate_and_orphan_contracts_fail_closed(self):
        lesson = lesson_with(["Playing", "Studying"])
        for malformed in ({}, {"schema_version": 2, "banks": {}}, {"schema_version": 1, "banks": []}):
            self.assertTrue(validate_banks([lesson], malformed))
        contracts = contract_for(lesson)
        record = next(iter(contracts["banks"].values()))
        record["exceptions"] = {"subject-variety": "skip"}
        self.assertTrue(validate_banks([lesson], contracts))
        self.assertTrue(any("orphan" in e for e in validate_banks([], contracts)))
        self.assertTrue(any("duplicate answer-bank" in e for e in validate_banks([lesson, lesson], contracts)))

    def test_punctuation_does_not_disguise_duplicate_answers(self):
        for labels in (["Working", "Working."], ["She's cooking.", "She is cooking!"]):
            lesson = lesson_with(labels)
            self.assertTrue(any("duplicates an answer choice" in e for e in validate_banks([lesson], contract_for(lesson))))

    def test_real_construction_and_mission_target_banks_are_excluded(self):
        lesson = lesson_with(["Working", "The children play."], stage="Use")
        for interaction in ("complete2", "complete-sentence", "mission-word-parts"):
            lesson["cards"][0]["interaction_type"] = interaction
            self.assertEqual([], validate_banks([lesson], {"schema_version": 1, "banks": {}}))
        lesson["cards"][0]["interaction_type"] = "mission-game"
        lesson["cards"][0]["mission_game"] = {"targets": ["a", "b"]}
        self.assertEqual([], validate_banks([lesson], {"schema_version": 1, "banks": {}}))


if __name__ == "__main__":
    unittest.main()
