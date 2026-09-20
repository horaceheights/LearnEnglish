"""Replace an ambiguous staged grandparents distractor with two young children."""
import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.install_preference_photo_batch import digest_json

def main():
    proof=json.loads((ROOT/'docs/qa/course-photo-reuse-v1.json').read_text(encoding='utf-8'))
    row=next(r for r in proof['assets'] if r['candidate_filename']=='a1_photo_u7_review_grandparents_v1.webp')
    base=json.loads((ROOT/'docs/product/course-photo-sweep-final-v1.json').read_text())
    prompt='Exactly TWO clearly young school-age children, one seven-year-old boy and one eight-year-old girl, sitting close together on a garden bench. Fresh candid review photograph, no adults or other people anywhere. Natural child proportions and youthful faces, ordinary casual clothes. Both children complete from head to knees and both faces inside middle 40 percent of landscape; wide leafy garden margins. They are unequivocally children, not parents or grandparents. Natural skin texture, no writing, no labels, no props needed.'
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v10','image_settings':base['image_settings'],
          'production':{'initial_batch_ceiling_usd':'0.12','no_automatic_retries':True},
          'shared_prompt':base['shared_prompt'],'assets':[{'id':'u7-review-children','runtime_filename':'a1_photo_u7_review_children_v1.webp',
          'prompt':prompt,'expected_description':prompt,'change_control':{'kind':'inspected-legacy-photo-group','replacements':[{
          'inventory_index':row['index'],'old_filename':row['old_filename'],'old_sha256':row['old_sha256'],'old_observation':row['old_observation'],'scopes':row['scopes'],
          'replaces_staged_candidate':{'filename':row['candidate_filename'],'record_sha256':digest_json(row),
          'issue':'The staged elderly couple can also truthfully be parents. The exact Who are they / parents question requires a visibly exclusive children contrast, not an age-based assumption.'}}]}}]}
    with (ROOT/'docs/product/course-photo-sweep-family-contrast-v1.json').open('x',encoding='utf-8') as f:
        json.dump(pack,f,ensure_ascii=False,indent=2);f.write('\n')

if __name__=='__main__': main()
