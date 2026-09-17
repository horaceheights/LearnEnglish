"""Prepare explicit reuse candidates for pixel/crop inspection; no course writes."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.audit_course_photo_style import render_sheets

# Manually selected from the complete 53-sheet September 17 style triage.
# These are proposals only. A matching word or filename never approves use.
EXPLICIT = {
    "boy.webp": [14,15], "girl.webp": [16,17], "man.webp": [18,19], "woman.webp": [21,22],
    "a1_banana.webp": [51,127,796], "a1_bank.webp": [52,131,132],
    "a1_dress.webp": [54,258], "a1_hat.webp": [55,323], "a1_hospital.webp": [56,347,715],
    "a1_jacket.webp": [57,437], "a1_library.webp": [58,467], "a1_pear.webp": [59,318,584],
    "a1_pharmacy.webp": [60,587], "a1_shirt.webp": [61,625], "a1_skirt.webp": [62,628],
    "a1_station.webp": [63,648,776], "a1_store.webp": [64,658,777],
    "a1_strawberry.webp": [65,670], "a1_taxi.webp": [66,678], "a1_train.webp": [67,736],
    "a1_apple.webp": [80,106,405,549,556,604], "a1_egg.webp": [81,263],
    "a1_orange.webp": [82,559,560], "a1_umbrella.webp": [83,750],
    "a1_bathroom.webp": [133], "a1_bed.webp": [134], "a1_bedroom.webp": [135,550],
    "a1_boots.webp": [148], "a1_bread.webp": [158,635], "place_bus.webp": [180],
    "object_car.webp": [191], "a1_chicken.webp": [193], "a1_cloudy.webp": [197,407],
    "a1_coffee.webp": [204], "a1_cold.webp": [211,409], "a1_computer.webp": [212],
    "a1_dining_room.webp": [235], "a1_door.webp": [257], "a1_fish.webp": [281],
    "family_grandparents.webp": [314], "a1_grapes.webp": [315], "a1_happy.webp": [322,357,785],
    "a1_hungry.webp": [356,358,786], "a1_sad.webp": [359,616], "a1_thirsty.webp": [360,714,789],
    "a1_tired.webp": [362,725,790], "a1_listening_music.webp": [388,473,484],
    "a1_rainy.webp": [427,602], "a1_sunny.webp": [430,675], "a1_windy.webp": [436,780],
    "a1_juice.webp": [446], "a1_kitchen.webp": [447], "a1_lamp.webp": [449],
    "a1_watch_tv.webp": [482,760], "a1_living_room.webp": [485], "a1_milk.webp": [500],
    "a1_pants.webp": [582], "family_parents.webp": [583], "a1_rice.webp": [610,636],
    "a1_school.webp": [618], "a1_shoes.webp": [626], "a1_socks.webp": [631],
    "a1_sofa.webp": [632], "a1_water.webp": [637,763], "a1_tea.webp": [685], "a1_window.webp": [779],
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'output/qa/course-photo-reuse')
    args = parser.parse_args()
    inventory = json.loads((ROOT / 'output/qa/course-photo-style/inventory.json').read_text(encoding='utf-8'))['assets']
    triage = json.loads((ROOT / 'docs/qa/course-photo-style-triage-2026-09-17.json').read_text(encoding='utf-8'))
    proposed = {index: filename for filename, indices in EXPLICIT.items() for index in indices}
    for key, indices in triage.items():
        if key.startswith('illustrated_scene_indices') or key == 'photo_overridden_by_numeral_indices':
            for index in indices:
                old = inventory[index - 1]['filename']
                if '_four-card.webp' in old:
                    proposed.setdefault(index, old.replace('_four-card.webp', '.webp'))
    rows, candidates = [], []
    for index, filename in sorted(proposed.items()):
        old = inventory[index - 1]
        target = ROOT / 'Lessons/Lesson1/images' / filename
        candidates.append({'index': index, 'old_filename': old['filename'], 'old_sha256': old['sha256'],
                           'candidate_filename': filename, 'exists': target.exists(), 'disposition': 'pending'})
        rows.append({'index': index, 'filename': filename, 'exists': target.exists(),
                     'descriptions': [{'concept': 'REUSE CANDIDATE for ' + old['filename']}]})
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'candidates.json').write_text(json.dumps(candidates, indent=2) + '\n', encoding='utf-8')
    render_sheets(rows, args.output)
    print(f'{len(candidates)} reuse candidates; none installed or approved.')


if __name__ == '__main__':
    main()
