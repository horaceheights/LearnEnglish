"""Prepare a visual review aid or install explicitly reviewed paid photo outputs."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import IMAGE_ROOTS,digest,read_lesson
from scripts.install_course_photo_reuse import main as install_references,pointer_parent

PACK=ROOT/'docs/product/course-photo-sweep-preferences-v1.json'
OUTPUT=ROOT/'output/imagegen/course-photo-sweep-v1'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack',type=Path,default=PACK)
    parser.add_argument('--install-reviewed',action='store_true')
    parser.add_argument('--asset-id',action='append',help='Install only these frozen-pack IDs; all receipt and scope checks still apply.')
    parser.add_argument('--hold-rejected',action='store_true',help='Install usable inspected sources while explicitly leaving rejected sources unbound.')
    parser.add_argument('--hold-unrendered-references',action='store_true',help='Leave unattempted existing-image edits pending upload permission; never declare the whole pack complete.')
    args=parser.parse_args();pack_path=args.pack.resolve();pack=json.loads(pack_path.read_text(encoding='utf-8'))
    if args.asset_id:
        if not set(args.asset_id)<={a['id'] for a in pack['assets']}:raise ValueError('Unknown selected asset ID.')
        pack={**pack,'assets':[a for a in pack['assets'] if a['id'] in args.asset_id]}
    from scripts.render_course_stills import pack_output_directory
    output=pack_output_directory(pack)
    existing=[a for a in pack['assets'] if (output/(a['id']+'.png')).is_file()]
    if not args.install_reviewed:
        font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',17)
        for start in range(0,len(existing),4):
            sheet=Image.new('RGB',(1120,len(existing[start:start+4])*420),'#faf8f2');draw=ImageDraw.Draw(sheet)
            for j,a in enumerate(existing[start:start+4]):
                with Image.open(output/(a['id']+'.png')) as im:
                    sheet.paste(ImageOps.contain(im.convert('RGB'),(600,400)),(0,j*420))
                    sheet.paste(ImageOps.fit(im.convert('RGB'),(300,375),centering=(.5,.5)),(680,j*420))
                draw.text((5,j*420+398),a['id']+' | full 3:2 and centered 4:5',font=font,fill='black')
            sheet.save(output/f'review-{start//4+1:02d}.jpg',quality=94)
        print(f'Review aids: {len(existing)}/{len(pack["assets"])} images saved. No approval recorded.')
        return
    held=[]
    for asset in pack['assets']:
        source=output/(asset['id']+'.png')
        if source.is_file():continue
        if (args.hold_unrendered_references and asset.get('reference_file')
                and not source.with_suffix('.receipt.json').exists()):
            held.append(asset['id'])
            print('HELD, UPLOAD PERMISSION PENDING: '+asset['id'])
        else:raise ValueError('Batch incomplete or attempted request unresolved; never pretend pending scenes were installed.')
    reviews=json.loads((output/'agent-reviews.json').read_text(encoding='utf-8'))
    proof_path=ROOT/'docs/qa/course-photo-reuse-v1.json';proof=json.loads(proof_path.read_text(encoding='utf-8'))
    copies={};new_records=[];revisions=[]
    for asset in pack['assets']:
        if asset['id'] in held:continue
        source=output/(asset['id']+'.png');receipt=json.loads(source.with_suffix('.receipt.json').read_text(encoding='utf-8'))
        review=reviews[asset['id']]
        if args.hold_rejected and review.get('disposition')=='rejected' and review.get('sha256')==digest(source):
            print('HELD, NOT INSTALLED: '+asset['id']+' — '+review['observed_description'])
            continue
        if receipt['status']!='image_saved' or receipt['sha256']!=digest(source) or receipt['pack_sha256']!=digest(pack_path):
            raise ValueError('Missing or stale generation receipt.')
        if receipt['request']['prompt']!=pack['shared_prompt']+'\n\n'+asset['prompt']:
            raise ValueError('Generated prompt differs from the frozen pack.')
        if any(receipt['request'].get(k)!=v for k,v in pack['image_settings'].items()):
            raise ValueError('Image generation settings changed.')
        if review.get('sha256')!=digest(source) or review.get('disposition')!='usable' or review.get('crop_review')!='inspected-3x2-and-centered-4x5' or len(review.get('observed_description',''))<35:
            raise ValueError('A current independent visual review is required.')
        with Image.open(source) as im:
            if im.size!=(1536,1024):raise ValueError('Unexpected image size.')
            buf=io.BytesIO();im.convert('RGB').save(buf,'WEBP',quality=92,method=6)
        pixels=buf.getvalue()
        for folder in IMAGE_ROOTS:
            path=ROOT/folder/asset['runtime_filename']
            if path.exists() and path.read_bytes()!=pixels:raise ValueError('Refusing to overwrite existing pixels.')
            copies[path]=pixels
        archive_folder='photo-sweep-v1' if output.name=='course-photo-sweep-v1' else output.name
        archive=ROOT/IMAGE_ROOTS[0]/'course-photoreal-sources'/archive_folder/source.name
        if archive.exists() and digest(archive)!=digest(source):raise ValueError('Original generated source changed.')
        copies[archive]=source.read_bytes()
        controls=asset['change_control'].get('replacements',[asset['change_control']])
        for control in controls:
            record={'index':control.get('inventory_index',asset.get('inventory_index')),'old_filename':control['old_filename'],'old_sha256':control['old_sha256'],
                'candidate_filename':asset['runtime_filename'],'new_sha256':hashlib.sha256(pixels).hexdigest(),'exists':True,
                'disposition':'agent-reviewed','kind':'illustration-or-inset-retirement','old_observation':control['old_observation'],
                'new_observation':review['observed_description'],'scopes':control['scopes'],'crop_review':review['crop_review'],
                'human_approval':'pending','generation':{'source_path':archive.relative_to(ROOT).as_posix(),'receipt':receipt,'agent_review':review}}
            if control.get('replaces_staged_candidate'):
                revisions.append((record,control['replaces_staged_candidate']))
            new_records.append(record)
    # A candidate rejected during this unpublished task can be corrected only
    # against its exact prior record and unchanged scope. Preserve its history.
    revised_docs={}
    for record,expected in revisions:
        prior=[r for r in proof['assets'] if r['old_filename']==record['old_filename'] and r['candidate_filename']==expected['filename']]
        completed=[r for r in proof['assets'] if r['old_filename']==record['old_filename'] and r['candidate_filename']==record['candidate_filename']]
        if not prior and len(completed)==1:
            history=completed[0].get('superseded_staged_candidate',{})
            if digest_json(history.get('record'))!=expected['record_sha256'] or history.get('issue')!=expected['issue']:
                raise ValueError('Completed revision history drift.')
            record['superseded_staged_candidate']=history
            if record!=completed[0]:raise ValueError('Completed revision record changed.')
            continue
        if len(prior)!=1:raise ValueError('Staged revision needs exactly one prior record.')
        previous=prior[0]
        if digest_json(previous)!=expected['record_sha256'] or previous['scopes']!=record['scopes']:
            raise ValueError('Staged revision evidence or scopes changed.')
        if len(expected.get('issue',''))<35:raise ValueError('Staged revision needs a concrete visual defect.')
        for folder in IMAGE_ROOTS:
            if digest(ROOT/folder/previous['candidate_filename'])!=previous['new_sha256']:
                raise ValueError('Superseded candidate pixels changed.')
        for scope in previous['scopes']:
            path=ROOT/scope['path'];lesson=revised_docs.setdefault(path,read_lesson(path))
            parent,key=pointer_parent(lesson,scope['pointer'])
            if Path(parent[key]).name!=previous['candidate_filename']:raise ValueError('Staged binding drift.')
            parent[key]=parent[key].replace(previous['candidate_filename'],record['candidate_filename'])
        record['superseded_staged_candidate']={'issue':expected['issue'],'record':previous}
        proof['assets'].remove(previous)
    for path,pixels in copies.items():
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(pixels)
    for record in new_records:
        prior=[r for r in proof['assets'] if r['old_filename']==record['old_filename'] and r['candidate_filename']==record['candidate_filename']]
        if prior and prior[0]!=record:raise ValueError('Different existing photo review record.')
        if not prior:proof['assets'].append(record)
    proof_path.write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for path,lesson in revised_docs.items():
        path.write_text(json.dumps(lesson,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if revisions:
        plans_path=ROOT/'docs/product/course-media-change-plans.json';plans=json.loads(plans_path.read_text(encoding='utf-8'))
        for plan in plans['changes']:
            if plan.get('issue')!='reviewed-legacy-photo-binding':continue
            names=sorted({r['candidate_filename'] for r in proof['assets'] if r['old_filename']==plan['old_filename']
                          and any(s['lesson_id']==plan['lesson_id'] for s in r['scopes'])})
            if not names:raise ValueError('A scoped legacy preservation plan lost its evidence.')
            plan['new_filename']=names[0]
            if len(names)>1:plan['alternative_filenames']=names[1:]
            else:plan.pop('alternative_filenames',None)
        plans_path.write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    sys.argv=['install_course_photo_reuse.py','--apply'];install_references()
    print(f'Installed {len({r["candidate_filename"] for r in new_records})} photos covering {len(new_records)} old/new mappings; originals retained, human approval pending.')

def digest_json(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False).encode('utf-8')).hexdigest()

if __name__=='__main__':main()
