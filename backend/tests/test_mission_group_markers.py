import json
import unittest
from copy import deepcopy
from pathlib import Path

from pydantic import ValidationError
from backend.app.schemas import MissionGame


class StandingGroupMarkerTests(unittest.TestCase):
    def setUp(self):
        path = Path(__file__).resolve().parents[1] / "lessons/unit_1/1.10_family_scene_mission.yaml"
        self.cards = json.loads(path.read_text(encoding="utf-8"))["cards"]

    def test_reviewed_four_capsules_survive_backend_serialization(self):
        found = []
        for card in self.cards:
            game = MissionGame.model_validate(card["mission_game"])
            for target in game.model_dump()["targets"]:
                if target["group_chest_anchor"] is not None:
                    found.append((card["slide_id"], target["id"]))
        self.assertEqual(found, [("M04", "children"), ("M04", "adults"),
                                 ("M08", "parents"), ("M09", "grandparents")])

    def test_group_only_or_individual_chest_override_is_rejected(self):
        for index, target_index in [(4, 1), (3, 0)]:
            game = deepcopy(self.cards[index]["mission_game"])
            game["targets"][target_index]["group_chest_anchor"] = {"x": .5, "y": .5}
            with self.assertRaisesRegex(ValidationError, "individual targets for every member"):
                MissionGame.model_validate(game)

    def test_out_of_frame_or_above_head_anchor_is_rejected(self):
        for anchor in [{"x": 1.1, "y": .5}, {"x": .24, "y": .1}]:
            game = deepcopy(self.cards[3]["mission_game"])
            game["targets"][4]["group_chest_anchor"] = anchor
            with self.assertRaises(ValidationError):
                MissionGame.model_validate(game)


if __name__ == "__main__":
    unittest.main()
