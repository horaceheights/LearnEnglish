from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
BUILDER_PATH = ROOT / "scripts" / "build_a1_units_2_7.py"
SPEC = importlib.util.spec_from_file_location("build_a1_units_2_7", BUILDER_PATH)
assert SPEC and SPEC.loader
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


def image_choice_row() -> list[object]:
    return [
        "R1",
        "recognize-image",
        "Choose the phrase.",
        "Choose the phrase.",
        "Correct-answer-only shared frame.",
        ["five blue chairs", "four red chairs"],
        "five blue chairs",
        "The quantity and color must both match.",
        "Elige la frase.",
    ]


class MediaOptionContractTests(unittest.TestCase):
    def test_each_image_option_falls_back_to_its_own_semantics(self) -> None:
        catalog = BUILDER.AssetCatalog()
        lesson = {"id": "9.9", "title": "Test lesson", "scene_contract": {}}

        BUILDER.build_card(catalog, 9, lesson, "Recognize", image_choice_row())

        contracts = {item["concept"]: item["description"] for item in catalog.items.values()}
        self.assertEqual(contracts["five blue chairs"], "five blue chairs")
        self.assertEqual(contracts["four red chairs"], "four red chairs")
        self.assertNotIn("Correct-answer-only shared frame.", contracts.values())

    def test_explicit_per_option_contract_remains_authoritative(self) -> None:
        catalog = BUILDER.AssetCatalog()
        lesson = {
            "id": "9.9",
            "title": "Test lesson",
            "scene_contract": {
                "four red chairs": "Exactly four separate red chairs, all fully visible."
            },
        }

        BUILDER.build_card(catalog, 9, lesson, "Recognize", image_choice_row())

        contracts = {item["concept"]: item["description"] for item in catalog.items.values()}
        self.assertEqual(
            contracts["four red chairs"],
            "Exactly four separate red chairs, all fully visible.",
        )

    def test_incompatible_reused_contracts_remain_separately_reviewable(self) -> None:
        catalog = BUILDER.AssetCatalog()
        catalog.add(
            unit_number=9,
            lesson_id="9.1",
            concept="beside the table",
            description="beside the table",
            card_ref="9.1|Recognize|R1",
            explicit=False,
        )
        catalog.add(
            unit_number=9,
            lesson_id="9.2",
            concept="beside the table",
            description="One book fully outside and beside the table footprint.",
            card_ref="9.2|Recognize|R2",
            explicit=True,
        )

        self.assertEqual(len(catalog.items), 2)
        contracts = {
            (item["description"], tuple(item["card_refs"]))
            for item in catalog.items.values()
        }
        self.assertEqual(
            contracts,
            {
                ("beside the table", ("9.1|Recognize|R1",)),
                (
                    "One book fully outside and beside the table footprint.",
                    ("9.2|Recognize|R2",),
                ),
            },
        )


if __name__ == "__main__":
    unittest.main()
