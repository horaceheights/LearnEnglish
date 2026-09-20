"""Bounded text-only correction of observed unresolved cartoon/crop defects."""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import lessons
from scripts.install_course_photo_reuse import pointer_parent
from scripts.install_preference_photo_batch import digest_json

def main():
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets']
    proof=json.loads((ROOT/'docs/qa/course-photo-reuse-v1.json').read_text(encoding='utf-8'));current=lessons(ROOT)
    assets=[]
    def controls(indices):
        result=[]
        for index in indices:
            old=inventory[index-1];scopes=[]
            for s in old['authored_bindings']:
                parent,key=pointer_parent(current[s['lesson_id']],s['pointer'])
                if Path(parent[key]).name==old['filename']:scopes.append(s)
            if scopes:result.append({'inventory_index':index,'old_filename':old['filename'],'old_sha256':old['sha256'],
                'old_observation':'Directly inspected flat cartoon people and schematic place icons remain in this location/help exercise.','scopes':scopes})
        return result
    def revisions(filename,issue):
        return [{'inventory_index':r['index'],'old_filename':r['old_filename'],'old_sha256':r['old_sha256'],
                 'old_observation':r['old_observation'],'scopes':r['scopes'],
                 'replaces_staged_candidate':{'filename':filename,'record_sha256':digest_json(r),'issue':issue}}
                for r in proof['assets'] if r['candidate_filename']==filename]
    def add(aid,prompt,rows):
        if not rows:raise ValueError('No exact affected bindings: '+aid)
        assets.append({'id':aid,'runtime_filename':'a1_photo_'+aid.replace('-','_')+'_v1.webp','prompt':prompt,'expected_description':prompt,
                       'change_control':{'kind':'inspected-legacy-photo-group','replacements':rows}})
    source=json.loads((ROOT/'docs/product/course-photo-sweep-final-v1.json').read_text())
    old=next(a for a in source['assets'] if a['id']=='u7-likes-tv-reframed')
    a=copy.deepcopy(old);a['id']='u7-likes-tv-side-view';a['runtime_filename']='a1_photo_u7_likes_tv_v3.webp'
    a['prompt']='Photograph from the SIDE of a narrow living-room setup. A smiling woman sits in a chair facing a small television on a low stand DIRECTLY IN FRONT OF her knees, not behind her. Both in clear side profile: her eyes visibly look straight at the nature documentary screen. The camera sees her happy facial profile and the television image from a diagonal side angle. She holds a remote at her lap. Entire chair, woman and television form a compact group in central 40 percent of landscape width, camera far back, empty room margins. NO television behind or above the viewer. A physically usable real living-room layout.'
    a['expected_description']=a['prompt'];assets.append(a)
    add('u6-hospital-central','A real hospital entrance identified ONLY by a single blue H mounted immediately above central doors. A clinician in scrubs pushes a patient on a stretcher toward those doors, with a recognizable ambulance parked immediately alongside. Door, H, clinician, stretcher and ambulance front compactly centered. No other words, letters, place names or signage anywhere. Far-back symmetrical photograph, wide empty outer margins.',
        revisions('a1_hospital.webp','Directly viewed hospital candidate has large COMMUNITY HOSPITAL lettering, which supplies the target English answer in the image.')+controls([114]))
    add('u6-bank-central','A real bank entrance with a clearly recognizable cash ATM DIRECTLY BESIDE its central glass doorway. One adult uses the ATM with a bank card and visible keypad and banknotes. Both the ATM and whole user stand within central 35 percent width, not at the outer edge. Glass door immediately behind, no other venue, no words or signs or bank names. Far-back frontal view with large expendable facade margins.',
        revisions('a1_bank.webp','Directly viewed bank candidate places its only distinctive ATM at the extreme right, outside the centered four-choice portrait crop.')+controls([110]))
    add('u7-station-central','A real train station platform. A passenger locomotive stops directly under a small station canopy, both front of train and recognizable platform with waiting passengers together in the middle 40 percent of width. Railway tracks lead toward them. Whole central canopy, train front and platform retained with wide empty outer margins. No words, letters, signage, logos or clocks.',controls([117]))
    add('u6-review-help-bus-eight','A woman traveler holding a folded map politely asks a male station attendant for help beside a bus ready to depart. They stand close together; he points to a small physical bus-stop departure display directly between their heads, reading exactly 8:00. The central compact scene includes both faces, her map, his pointing gesture, the legible 8:00 display, and a bus immediately behind. Morning daylight, genuinely candid human exchange, no cartoon, no floating arrows or speech bubbles, no other text or times. Far-back side three-quarter view preserving all key details inside the middle 40 percent width.',controls([186]))
    pack={'schema_version':1,'output_namespace':'course-photo-sweep-v7','image_settings':source['image_settings'],
          'production':{'initial_batch_ceiling_usd':'0.60','expected_cost_usd':'0.22','no_automatic_retries':True},
          'shared_prompt':'Exceptionally realistic full-bleed 1536x1024 natural photograph. All answer-critical details fit inside the middle 40 percent width because phones crop away both outer sides. Wide expendable natural background margins. No cartoons, collages, insets, border padding, answer captions or artificial symbols. No text unless an exact physical numeric time display is explicitly requested.', 'assets':assets}
    path=ROOT/'docs/product/course-photo-sweep-corrections-v1.json'
    if path.exists() and json.loads(path.read_text())!=pack:raise ValueError('Frozen pack changed.')
    path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Five text-only corrected scenes; estimated $0.22, capped $0.60; no existing-image uploads.')
if __name__=='__main__':main()
