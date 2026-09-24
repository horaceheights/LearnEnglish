import copy
import json
import tempfile
import unittest
from pathlib import Path

from scripts.build_unit_2_mission_pack import PACK, LESSON, compile_lesson, reviewed_assets
from scripts.render_course_stills import load_pack
from backend.app.schemas import MissionGameTarget


class UnitTwoMissionPackTests(unittest.TestCase):
    def test_object_geometry_is_explicit_and_does_not_change_legacy_serialization(self):
        target = {"id": "person", "label_es": "Persona", "accepted_option_ids": ["p"],
                  "rect": {"x": .1, "y": .1, "width": .2, "height": .3}}
        self.assertNotIn("subject_kind", MissionGameTarget.model_validate(target).model_dump())
        target["subject_kind"] = "object"
        self.assertEqual(MissionGameTarget.model_validate(target).model_dump()["subject_kind"], "object")

    def setUp(self):
        self.pack = load_pack(PACK)
        self.base = json.loads(LESSON.read_text(encoding="utf-8"))
        # Synthetic coordinates test authoring structure only, never visual approval.
        self.geometry = {beat["asset"]: {"targets": [
            {"rect": {"x": i * .24, "y": .4, "width": .2, "height": .3},
             "head_anchors": [{"x": i * .24 + .1, "y": .4}]} for i in range(4)
        ]} for beat in self.pack["beats"]}

    def test_compilation_preserves_canonical_identity_and_input(self):
        before = copy.deepcopy(self.base)
        result = compile_lesson(self.pack, self.base, self.geometry)
        self.assertEqual(self.base, before)
        self.assertEqual(result["id"], before["id"])
        self.assertEqual(result["sub_lesson_id"], "2.11")
        self.assertEqual(result["content_revision"], 4)
        self.assertEqual(len(result["cards"]), 13)
        self.assertNotIn("foto", json.dumps(result, ensure_ascii=False).lower())
        self.assertTrue(all(card["stage"] == "Speak" for card in result["cards"][-4:]))
        self.assertEqual(result["cards"][-1]["interaction_type"], "mission-finale")
        for card in result["cards"][-4:]:
            self.assertEqual(card["audio_turns"][0]["text"], "What is it?")
            self.assertNotEqual(card["audio_turns"][0]["image_url"], card["options"][0]["image_url"])
            self.assertTrue(card["prompt"].startswith("It is a "))

    def test_every_visible_target_gets_exactly_one_distinct_cue(self):
        result = compile_lesson(self.pack, self.base, self.geometry)
        for card in result["cards"]:
            game = card["mission_game"]
            self.assertEqual({t["id"] for t in game["targets"]}, {c["target_id"] for c in game["cues"]})
            self.assertEqual(len(game["targets"]), len(game["cues"]))
            self.assertEqual(len({c["text"] for c in game["cues"]}), len(game["cues"]))

    def test_missing_geometry_never_compiles(self):
        del self.geometry["places"]
        with self.assertRaisesRegex(ValueError, "every cue needs"):
            compile_lesson(self.pack, self.base, self.geometry)

    def test_missing_pixel_reviews_never_installs(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "visual inspections"):
                reviewed_assets(self.pack, Path(directory))


if __name__ == "__main__":
    unittest.main()
