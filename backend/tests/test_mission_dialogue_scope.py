import copy
import unittest
from pydantic import ValidationError
from backend.app.schemas import MissionGame
from scripts.validate_lesson_cards import _visual_meaning, _text_matches_visual


def dialogue():
    return dict(
        kind="crowd-search", validation="unordered", instruction_es="Escucha y toca a la persona.",
        cue_order="authored", scene_scope="two-person-dialogue",
        targets=[dict(id=i,label_es="Persona",rect=dict(x=x,y=.2,width=.2,height=.4),
                      accepted_option_ids=[i]) for i,x in [("asker",.1),("helper",.6)]],
        cues=[dict(id="cue-"+i,text=t,answer_text=t,target_id=i,option_id=i)
              for i,t in [("asker","Can you help me?"),("helper","Yes, I can.")]],
    )


class MissionDialogueScopeTests(unittest.TestCase):
    def test_explicit_dialogue_retains_both_turns_in_order(self):
        game=MissionGame(**dialogue())
        self.assertEqual(["asker","helper"],[cue.target_id for cue in game.cues])
        self.assertEqual("authored",game.model_dump()["cue_order"])

    def test_dialogue_cannot_waive_order_or_be_used_for_object_search(self):
        for field,value in [("cue_order",None),("kind","contrast-hunt")]:
            data=dialogue();data[field]=value
            with self.subTest(field=field), self.assertRaises(ValidationError):
                MissionGame(**data)
        data=dialogue();data["targets"][0]["subject_kind"]="object"
        with self.assertRaises(ValidationError):MissionGame(**data)

    def test_inspected_family_scene_preserves_visible_children_and_place_contrast(self):
        scene=_visual_meaning("/lesson-assets/a1_photo_u6_story_family_mall_v1.webp")
        self.assertTrue(_text_matches_visual("The children are at the mall.",scene,include_visible_subsets=True))
        self.assertFalse(_text_matches_visual("The children are at the bank.",scene,include_visible_subsets=True))

    def test_current_destination_and_transport_permission_are_not_ignored(self):
        scene=_visual_meaning("/lesson-assets/a1_photo_u6_story_father_going_bank_v1.webp")
        self.assertTrue(_text_matches_visual("He is going to the bank.",scene,include_visible_subsets=False))
        self.assertFalse(_text_matches_visual("He is going to the station.",scene,include_visible_subsets=False))
        scene=_visual_meaning("/lesson-assets/a1_photo_u6_story_family_bus_on_v1.webp")
        self.assertTrue(_text_matches_visual("They can go by bus.",scene,include_visible_subsets=False))
        self.assertFalse(_text_matches_visual("They cannot go by bus.",scene,include_visible_subsets=False))


if __name__=="__main__":unittest.main()
