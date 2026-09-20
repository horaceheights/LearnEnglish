"""Replace the remaining drawn milk-price tile without losing its exact value."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons
from scripts.install_course_photo_reuse import pointer_parent
def main():
    old=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets'][498]
    current=lessons(ROOT);scopes=[]
    for s in old['authored_bindings']:
        parent,key=pointer_parent(current[s['lesson_id']],s['pointer'])
        if Path(parent[key]).name!=old['filename']:raise ValueError('Milk-price binding changed.')
        scopes.append(s)
    template=json.loads((ROOT/'docs/product/course-photo-sweep-corrections-v1.json').read_text())
    prompt='One real clear drinking glass full of white milk on a pale stone counter. Immediately in front of the glass at its base is a small physical yellow price card displaying ONLY $4 in large crisp black type. Milk and whole $4 card are stacked vertically at the exact center, together occupying no more than 35 percent of landscape width. No other food or drinks, no bottles, logos or words. Natural light, eye-level close photograph with ample empty countertop margins. Both the complete glass and the full $4 must survive a centered portrait crop.'
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v8','image_settings':template['image_settings'],
          'production':{'initial_batch_ceiling_usd':'0.15','expected_cost_usd':'0.043','no_automatic_retries':True},
          'shared_prompt':'A highly photorealistic full-frame landscape photograph, 1536x1024. No drawing, icons, collage, inset, decorative border or floating captions. The explicitly requested price is printed on a real physical card.',
          'assets':[{'id':'u5-milk-four-dollars','runtime_filename':'a1_photo_u5_milk_four_dollars_v1.webp','prompt':prompt,'expected_description':prompt,
          'change_control':{'kind':'inspected-legacy-photo-scene','inventory_index':499,'old_filename':old['filename'],'old_sha256':old['sha256'],
              'old_observation':'Directly inspected remaining milk-price option shows an outlined cartoon bottle beside $4, whereas neighboring price options use real food photos.','scopes':scopes}}]}
    path=ROOT/'docs/product/course-photo-sweep-price-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:raise ValueError('Frozen pack changed.')
    path.write_text(json.dumps(pack,indent=2)+'\n',encoding='utf-8')
    print('One text-only milk $4 tile; estimate $0.043, cap $0.15.')
if __name__=='__main__':main()
