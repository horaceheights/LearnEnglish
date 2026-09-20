"""Keep explicit inspected retention decisions separate from unresolved cleanup.

This is not semantic approval. Uninstalled plans and real-but-padded mission
photos remain visible blockers rather than being hidden by a 'planned' count.
"""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import digest,lessons
from scripts.install_course_photo_reuse import pointer_parent
from scripts.report_photo_cleanup_remaining import remaining

GROUPS={
 'time-and-arrival-diagrams':([70,71,109,122,163,164,165,166,168,169,170,171,172,173,174,175,176,177,178,451,543,544,691,692,693,694,703,704,705,728,729,730,731,732,733,734,735],
     'Inspected clocks or literal transport diagrams retain exact numeric time, AM/PM or sun/moon cues, and arrival/departure arrows. These are precision teaching graphics, not substitutes for a human action scene.'),
 'exact-price-graphics':([104,105,123,124,125,126,156,157,198,199,200,201,256,410,411,428,431,432,440,441,442,498,620,679,695,697,698],
     'Inspected real food, drink or bag photograph paired with an exact numeric dollar price. Retain the visible price rather than replacing it with an unpriced stock photo.'),
 'real-body-part-highlights':([108,262,270,271,320,321,330,331,458,459,506,507,508,510,511,513,514,515,516],
     'Inspected photograph of a real adult with a targeted body-part highlight. The overlay identifies the taught body region; this is not a cartoon person.'),
 'numerals-and-counts':([523,525,527,529,531,533],
     'Inspected explicit numeral and matching dot count from thirteen through eighteen; photographic people cannot communicate an exact age or number more reliably.'),
 'literal-location-and-route-diagrams':([128,129,130,274,303,345,346,415,416,417,418,419,421,422,453,460,461,462,463,464,465,466,539,542,585,586,641,642,643,644,645,646,647,653,654,655,656,657,689,690,696,701,702],
     'Inspected route arrows, distance bars or adjacent landmark photos communicate the specific spatial relation. Retained as precision diagrams, not certified as photographic scenes or as approval of every question binding.'),
 'photographic-review-overviews':([159,290,652],
     'Inspected overview panels contain real photos and preview multiple review topics or meal times in order. They are non-selectable overview sequences, not cartoon answer options or purported single human scenes.')
}

def main():
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets']
    classifications={i:(name,reason) for name,(indices,reason) in GROUPS.items() for i in indices}
    retained=[];unresolved=[]
    for row in remaining():
        index=row['index'];original=inventory[index-1]
        item={'index':index,'filename':row['filename'],'sha256':original['sha256'],'scopes':row['scopes'],'human_approval':'pending'}
        if index in classifications:
            name,reason=classifications[index];item.update(disposition='retain-instructional-visual',category=name,observation=reason)
            retained.append(item)
        elif index in {901,902,903,904,906,907,908,909,910,911,912,913,914}:
            problem='Real mission photograph has baked-in blurred margins; a full-frame repair must preserve cast and reverify any selectable target coordinates.'
            if index==901:problem+=' The dinner guest has no unambiguous doctor cue.'
            if index==908:problem+=' The cafe scene does not display the required five-dollar price.'
            item.update(disposition='unresolved-existing-photo',observation=problem);unresolved.append(item)
        else:raise ValueError('Unclassified remaining image: '+str(index))
    current=lessons(ROOT);pending={}
    for path in (ROOT/'docs/product').glob('course-photo-sweep-*-v1.json'):
        pack=json.loads(path.read_text(encoding='utf-8'))
        for asset in pack['assets']:
            for control in asset['change_control'].get('replacements',[asset['change_control']]):
                for scope in control.get('scopes',[]):
                    parent,key=pointer_parent(current[scope['lesson_id']],scope['pointer'])
                    if Path(parent[key]).name==control['old_filename']:
                        pending[(scope['lesson_id'],scope['pointer'])]={'asset_id':asset['id'],'pack':path.relative_to(ROOT).as_posix(),'old_filename':control['old_filename'],'scope':scope,
                            'status':'unresolved-planned-reference'}
    status='cleanup-incomplete-do-not-publish' if unresolved or pending else 'cleanup-candidate-awaiting-release-validation'
    proof={'schema_version':1,'status':status,'inventory_sha256':digest(ROOT/'output/qa/course-photo-style/inventory.json'),
           'inspection':'All original 53 contact sheets and the eight focused remaining-retention contact sheets inspected; this is style triage, not Production semantic approval.',
           'retained':retained,'unresolved_existing_photos':unresolved,'unresolved_planned_references':list(pending.values())}
    (ROOT/'docs/qa/course-photo-cleanup-disposition-v1.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'retained_instructional_visuals':len(retained),'unresolved_existing_photos':len(unresolved),'unresolved_planned_references':len(pending),'publish':False}))
if __name__=='__main__':main()
