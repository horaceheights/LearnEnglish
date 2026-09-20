"""Correct three rejected venue prompts without uploading existing images."""
import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROMPTS={
'u6-review-hospital':'A real hospital emergency entrance with a SINGLE large blue H above its central doors, no other letters or words anywhere. A clearly recognizable ambulance directly beside the doors and a clinician in scrubs wheeling a patient toward the entrance. Doors, ambulance and medical activity close together in center 45 percent width. Farther-back frontal view, whole scene visible. No HOSPITAL word, no branding, no readable license plates.',
'u6-review-library':'A natural photograph just inside a public lending library: tall bookshelves immediately behind a central librarian at a checkout desk, handing a stack of books to an adult customer. Both people and unmistakable shelves of books fill the middle 45 percent width compactly. No words, signs, letters, book titles, shop price tags or branding. Do not write LIBRARY anywhere. Farther-back view with expendable room margins.',
'u6-review-store':'A natural photograph of a small grocery store doorway surrounded closely by fruit and vegetable crates and visible stocked shelves. One customer holds a paper bag of groceries at the threshold. Person, produce and entrance compactly centered in middle 45 percent width. Blank awning, absolutely no signs, words, letters, logos, price tags or branding. Do not write STORE or GROCERY anywhere.'}

def main():
    source=json.loads((ROOT/'docs/product/course-photo-sweep-meals-v1.json').read_text())
    reviews=json.loads((ROOT/'output/imagegen/course-photo-sweep-v4/agent-reviews.json').read_text());assets=[]
    for original in source['assets']:
        if original['id'] not in PROMPTS:continue
        r=reviews[original['id']]
        if r['disposition']!='rejected':raise ValueError('Only explicitly rejected scenes may be corrected.')
        a=copy.deepcopy(original);a['prompt']=PROMPTS[a['id']];a['expected_description']=a['prompt']
        a['id']+='-word-free';a['runtime_filename']=a['runtime_filename'].replace('_v1.webp','_v2.webp')
        a['supersedes_rejected_output']={'path':f'output/imagegen/course-photo-sweep-v4/{original["id"]}.png','sha256':r['sha256'],'reason':r['observed_description']}
        assets.append(a)
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v6','image_settings':source['image_settings'],
          'production':{'initial_batch_ceiling_usd':'0.30','expected_cost_usd':'0.13','no_automatic_retries':True},
          'shared_prompt':'Exceptionally realistic full-bleed 3:2 landscape photography, real humans and settings. No cartoons, insets, collages, borders, captions or floating symbols. A centered 4:5 phone crop cuts the outer quarters: all meaningful subjects must fit within the central 45 percent width, with plenty of expendable background margins. Venue must be recognized from real-world objects and actions, never answer text.', 'assets':assets}
    path=ROOT/'docs/product/course-photo-sweep-venues-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:raise ValueError('Pack is frozen.')
    path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('3 text-only images, estimate $0.13, cap $0.30. No existing image uploads.')

if __name__=='__main__':main()
