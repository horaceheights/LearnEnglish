import json
import unittest
from pathlib import Path

from scripts.audit_content_practice import BASELINE, read_baseline
from scripts.content_engine.catalog import CatalogLesson, load_catalog, load_standards
from scripts.content_engine.practice import audit, is_known, learn_context_groups, prior_knowledge

FORMAT_RULES = {"stage-balance", "recognize-direction", "option-size", "photo-listen", "duplicate-option-image",
                "learn-shape", "learn-length", "speak-speakers", "speak-length", "decision-practice",
                "new-item-minimum", "practice-stages", "recognition-practice"}

ROOT = Path(__file__).resolve().parents[2]
STANDARDS = {
    "standard_lesson_cards": {"min": 2, "max": 12},
    "review_lesson_cards": {"min": 1, "max": 12},
    "max_new_items_per_lesson": 2,
    "min_exposures_per_new_item": 3,
    "min_stages_per_new_item": 3,
    "new_item_needs_one_of_stages": ["Listen", "Speak"],
    "min_later_lessons_per_new_item": 1,
    "later_reuse_exempt_final_units": 1,
    "instruction_words": ["listen"],
    "proper_names": ["ana"],
}


def card(stage, text, distractor="A dog"):
    return {"stage": stage, "prompt": text, "correct_option_id": "right",
            "options": [{"id": "right", "label": text}, {"id": "wrong", "label": distractor}]}


def lesson(number, vocabulary, cards, role="standard"):
    data = {"sub_lesson_id": number, "vocabulary": vocabulary, "cards": cards}
    return CatalogLesson(number, int(number.split(".")[0]), role, data, Path(f"{number}.yaml"))


def rules(findings, rule):
    return {(finding.lesson, finding.item) for finding in findings if finding.rule == rule}


class ContentPracticeTests(unittest.TestCase):
    def test_verbs_need_context_but_nouns_commands_and_construction_tiles_remain_valid(self):
        settings = {**STANDARDS, "verbs_require_subject": ["want", "eating", "need"]}
        bad = card("Listen", "Want", "Need")
        bad["slide_id"] = "bare"
        good = [
            card("Learn", "I want water.", "I need water."),
            card("Learn", "Water", "Milk"),
            card("Learn", "Open the door.", "Close the door."),
            {**card("Use", "I ___ water.", "need"), "interaction_type": "complete2"},
        ]
        good[-1]["options"][0]["label"] = "want"
        group = lesson("7.1", [], [bad, *good], role="review")
        self.assertEqual(rules(audit([group], settings), "verb-context"),
                         {("7.1", "bare:want"), ("7.1", "bare:need")})

    def test_answer_dialogue_turns_count_as_successful_practice(self):
        from scripts.content_engine.practice import card_evidence
        c = card("Recognize", "I do not like milk.", "Me too.")
        c["answer_audio_turns"] = [{"text": "Me neither.", "speaker_role": "luis"}]
        self.assertIn("me neither.", card_evidence(c))

    def test_current_course_matches_the_reviewed_baseline(self):
        standards = load_standards(ROOT, "a1")
        keys = {finding.key for finding in audit(load_catalog(ROOT, standards), standards)}
        baseline = read_baseline(ROOT, "a1")
        self.assertEqual(sorted(keys - baseline), [], "New practice findings; fix the content.")
        self.assertEqual(sorted(baseline - keys), [], f"Fixed findings remain in {BASELINE}; shrink it.")

    def test_well_practiced_item_passes_every_rule(self):
        taught = lesson("1.1", ["a dog"], [card("Learn", "A dog"), card("Listen", "A dog"), card("Speak", "A dog")])
        later = lesson("2.1", [], [card("Use", "A dog")], role="review")
        self.assertEqual(audit([taught, later], STANDARDS), [])

    def test_thin_practice_is_reported_by_rule(self):
        thin = lesson("1.1", ["cat", "dog", "cow"], [card("Learn", "cat"), card("Recognize", "dog", "cat")]
                      + [card(stage, "cow", "cat") for stage in ("Learn", "Recognize", "Listen")])
        last = lesson("2.1", [], [card("Use", "cat", "cow")], role="review")
        findings = audit([thin, last], STANDARDS)
        self.assertEqual(rules(findings, "new-item-budget"), {("1.1", "lesson")})
        self.assertEqual(rules(findings, "exposures"), {("1.1", "cat"), ("1.1", "dog")})
        self.assertIn(("1.1", "dog"), rules(findings, "stage-variety"))
        # Only correct answers count as reuse; a distractor is not practice.
        self.assertEqual(rules(findings, "later-reuse"), {("1.1", "dog"), ("1.1", "cow")})

    def test_final_unit_is_exempt_from_later_reuse(self):
        final = lesson("7.1", ["hat"], [card(stage, "hat") for stage in ("Learn", "Listen", "Speak")])
        self.assertEqual(rules(audit([final], STANDARDS), "later-reuse"), set())

    def test_approved_item_budget_does_not_relax_other_lessons_or_practice(self):
        settings = {**STANDARDS, "approved_lesson_new_item_limits": {"approved": {"max": 3}}}
        current = lesson("7.1", ["cat", "dog", "cow"], [card("Learn", "cat")])
        current.data["id"] = "approved"
        findings = audit([current], settings)
        self.assertFalse(rules(findings, "new-item-budget"))
        self.assertTrue(rules(findings, "exposures"))
        self.assertTrue(rules(findings, "stage-variety"))
        current.data["id"] = "other"
        self.assertTrue(rules(audit([current], settings), "new-item-budget"))
        current.data["id"] = "approved"
        current.data["vocabulary"].append("bird")
        self.assertTrue(rules(audit([current], settings), "new-item-budget"))

    def test_distractors_and_prompts_may_not_use_untaught_words(self):
        early = lesson("1.1", ["a dog"], [card(stage, "A dog", "A red dog") for stage in ("Learn", "Listen", "Speak")])
        self.assertEqual(rules(audit([early], STANDARDS), "untaught-word"), {("1.1", "red")})

    def test_plurals_are_known_but_third_person_verbs_are_not(self):
        known = {"apple", "box", "strawberry", "go"}
        self.assertTrue(all(is_known(word, known) for word in ("apples", "boxes", "strawberries")))
        self.assertFalse(is_known("goes", known))

    def test_standards_are_configuration_for_each_course(self):
        standards = json.loads((ROOT / "docs/product/content-standards.json").read_text(encoding="utf-8"))
        a1 = standards["courses"]["a1"]
        self.assertEqual(a1["standard_lesson_cards"], {"min": 40, "max": 42})
        self.assertEqual(a1["max_new_items_per_lesson"], 8)
        self.assertEqual(a1["min_exposures_per_new_item"], 5)
        self.assertEqual(a1["min_stages_per_new_item"], 4)
        self.assertEqual(a1["min_later_lessons_per_new_item"], 2)

    def test_approved_pacing_is_scoped_to_the_named_lesson(self):
        settings = {**STANDARDS, "standard_lesson_cards": {"min": 3, "max": 3},
                    "approved_lesson_card_limits": {"approved": {"min": 4, "max": 4}}}
        current = lesson("7.1", [], [card("Speak", "") for _ in range(4)])
        current.data["id"] = "approved"
        self.assertFalse(rules(audit([current], settings), "lesson-length"))
        current.data["id"] = "other"
        self.assertTrue(rules(audit([current], settings), "lesson-length"))
        current.data["id"] = "approved"
        current.data["cards"].pop()
        self.assertTrue(rules(audit([current], settings), "lesson-length"))

    def test_current_a1_plus_course_matches_the_reviewed_baseline(self):
        standards = load_standards(ROOT, "a1-plus")
        findings = audit(load_catalog(ROOT, standards), standards, prior_knowledge(ROOT, standards))
        keys = {finding.key for finding in findings}
        baseline = read_baseline(ROOT, "a1-plus")
        self.assertEqual(sorted(keys - baseline), [], "New A1+ practice findings; fix the content.")
        self.assertEqual(sorted(baseline - keys), [], f"Fixed A1+ findings remain in {BASELINE}; shrink it.")

    def test_a1_plus_standards_record_the_approved_values(self):
        a1_plus = load_standards(ROOT, "a1-plus")
        self.assertEqual(a1_plus["approved_on"], "2026-10-27")
        self.assertEqual(a1_plus["standard_lesson_cards"], {"min": 40, "max": 42})
        self.assertEqual(a1_plus["review_lesson_cards"], {"min": 48, "max": 54})
        self.assertEqual(a1_plus["min_exposures_per_new_item"], 6)
        self.assertEqual(a1_plus["required_practice_stages"], ["Recognize", "Listen", "Speak", "Use"])
        self.assertEqual(a1_plus["stage_cards"]["standard"]["Recognize"], {"min": 10, "max": 12})
        self.assertEqual(a1_plus["learn_shapes"], ["model", "exchange", "contrast"])
        self.assertEqual((a1_plus["min_large_bank_share"], a1_plus["min_photo_listen_share"]), (0.25, 0.3))
        self.assertTrue(a1_plus["distinct_option_images"])
        self.assertEqual(a1_plus["prior_courses"], ["a1"])

    def test_a1_results_do_not_use_the_a1_plus_format_rules(self):
        standards = load_standards(ROOT, "a1")
        self.assertFalse({finding.rule for finding in audit(load_catalog(ROOT, standards), standards)} & FORMAT_RULES)

    def test_prior_course_vocabulary_is_known(self):
        known = prior_knowledge(ROOT, load_standards(ROOT, "a1-plus"))
        self.assertTrue({"jacket", "library", "dinner"} <= known)
        self.assertEqual(prior_knowledge(ROOT, load_standards(ROOT, "a1")), set())

    def test_format_rules_report_thin_and_one_sided_lessons(self):
        settings = {**STANDARDS,
                    "stage_cards": {"standard": {"Recognize": {"min": 2}, "Speak": {"max": 1}}},
                    "min_cards_per_recognize_direction": 1, "min_large_bank_share": 0.5,
                    "min_photo_listen_share": 0.5, "distinct_option_images": True,
                    "max_two_speaker_speak_cards": 0, "speak_max_words": 3}
        text_choice = card("Recognize", "A dog")
        same_photo = {"stage": "Listen", "slide_id": "same", "correct_option_id": "a",
                      "options": [{"id": "a", "image_url": "dog.webp"}, {"id": "b", "image_url": "dog.webp"}]}
        two_voices = {"stage": "Speak", "slide_id": "talk", "prompt": "A dog. A dog is here.",
                      "audio_turns": [{"text": "A dog.", "speaker_role": "ana"}, {"text": "A dog is here.", "speaker_role": "luis"}]}
        current = lesson("1.1", ["a dog"], [text_choice, same_photo, two_voices, card("Speak", "A dog")])
        found = {(finding.rule, finding.item) for finding in audit([current], settings)}
        for expected in [("stage-balance", "Recognize"), ("stage-balance", "Speak"),
                         ("recognize-direction", "phrase->photo"), ("option-size", "lesson"),
                         ("duplicate-option-image", "same"), ("speak-speakers", "lesson"), ("speak-length", "talk")]:
            self.assertIn(expected, found)
        self.assertNotIn(("photo-listen", "lesson"), found)

    def test_learn_shapes_allow_one_model_an_exchange_or_a_contrast_pair(self):
        settings = {**STANDARDS, "learn_shapes": ["model", "exchange", "contrast"], "learn_max_words": 5,
                    "learn_connector_max_words": 9, "learn_connector_targets": ["but"]}

        def learn(slide, *lines):
            return {"stage": "Learn", "slide_id": slide, "prompt": " ".join(lines),
                    "audio_turns": [{"text": line, "speaker_role": "ana"} for line in lines]}

        current = lesson("1.1", ["leaves", "but"], [
            learn("model", "Luis leaves home."),
            learn("exchange", "What time do you leave?", "I leave at seven."),
            learn("proposal", "Let's meet at seven.", "OK."),
            learn("contrast", "I leave home at eight.", "Luis leaves home at eight."),
            learn("connector", "Ana leaves at eight, but Luis leaves at nine."),
            learn("three", "I leave.", "Luis leaves.", "Ana leaves."),
            learn("pair", "I leave home.", "We eat dinner at seven."),
            learn("long", "Luis leaves home at eight every day."),
        ])
        shape = {finding.item for finding in audit([current], settings) if finding.rule == "learn-shape"}
        length = {finding.item for finding in audit([current], settings) if finding.rule == "learn-length"}
        self.assertEqual(shape, {"three", "pair"})
        self.assertEqual(length, {"long"})
        no_contrast = {**settings, "learn_shapes": ["model", "exchange"]}
        self.assertIn("contrast", {f.item for f in audit([current], no_contrast) if f.rule == "learn-shape"})

    def test_contrast_context_group_needs_permission_and_two_matching_statements(self):
        cards = [{"slide_id": "c1", "stage": "Learn", "prompt": "I leave home. Luis leaves home.",
                  "audio_text": "I leave home. Luis leaves home.",
                  "options": [{"id": "model", "label": "I leave home. Luis leaves home."}],
                  "audio_turns": [{"text": "I leave home."}, {"text": "Luis leaves home."}]}]
        group = {"kind": "contrast", "targets": ["leaves"],
                 "models": [{"slide_id": "c1", "text": "I leave home. Luis leaves home.",
                             "turns": ["I leave home.", "Luis leaves home."]}]}
        known = {"i", "leave", "home", "luis"}
        allowed, errors = learn_context_groups(cards, [group], ["leaves"], known, {"leaves"},
                                               ("sequence", "exchange", "contrast"))
        self.assertEqual((allowed, errors), ({"c1"}, []))
        allowed, errors = learn_context_groups(cards, [group], ["leaves"], known, {"leaves"})
        self.assertFalse(allowed)
        self.assertTrue(errors)

    def test_item_practice_counts_only_configured_stages_and_needs_recognition(self):
        settings = {**STANDARDS, "min_exposures_per_new_item": 3, "exposure_stages": ["Recognize", "Listen", "Speak", "Use"],
                    "required_practice_stages": ["Recognize", "Listen", "Speak", "Use"],
                    "min_recognize_or_listen_exposures_per_new_item": 2}
        current = lesson("7.1", ["a dog"], [card(stage, "A dog") for stage in ("Learn", "Learn", "Speak", "Use", "Listen")])
        findings = audit([current], settings)
        self.assertEqual(rules(findings, "practice-stages"), {("7.1", "a dog")})
        self.assertEqual(rules(findings, "recognition-practice"), {("7.1", "a dog")})
        self.assertFalse(rules(findings, "exposures"))

    def test_decision_lessons_need_reply_selection_and_teaching_lessons_need_new_items(self):
        settings = {**STANDARDS, "decision_goal_lessons": ["meet"], "min_reply_selection_cards": 1,
                    "min_new_items_per_lesson": 2}
        decision = lesson("1.1", ["a dog", "a cat"], [card("Recognize", "A dog")])
        decision.data["id"] = "meet"
        empty = lesson("1.2", [], [card("Listen", "A dog")], role="review")
        review = lesson("1.3", [], [card("Listen", "A cat")], role="review")
        findings = audit([decision, empty, review], settings)
        self.assertEqual(rules(findings, "decision-practice"), {("1.1", "lesson")})
        self.assertEqual(rules(findings, "new-item-minimum"), {("1.2", "lesson")})
        decision.data["cards"][0]["reply_image_timing"] = "after-prompt"
        self.assertFalse(rules(audit([decision, empty, review], settings), "decision-practice"))

    def test_new_question_frame_reuses_only_previously_taught_object_words(self):
        standards = {**STANDARDS, "learn_frame_words": ["the"],
                     "learn_question_frames": {"Where is": "Where is the {object}?"}}
        prior = lesson("1.1", ["blue", "book", "phone"], [], role="review")
        for text, new_vocabulary, rejected in [
            ("Where is the phone?", ["Where is"], False),
            ("Where is the blue book?", ["Where is"], False),
            ("Where is the telescope?", ["Where is"], True),
            ("The phone is blue.", ["Where is"], True),
            ("Where is the phone?", ["under"], True),
            ("Where is the phone? It is blue.", ["Where is"], True),
        ]:
            with self.subTest(text=text, vocabulary=new_vocabulary):
                current = lesson("2.1", new_vocabulary, [card("Learn", text, text)])
                findings = audit([prior, current], standards)
                self.assertEqual(bool(rules(findings, "learn-new-only")), rejected)
                if "telescope" in text:
                    self.assertIn(("2.1", "telescope"), rules(findings, "untaught-word"))


if __name__ == "__main__":
    unittest.main()
