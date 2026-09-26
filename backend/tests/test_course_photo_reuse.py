from copy import deepcopy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from scripts.audit_course_media_preservation import IMAGE_ROOTS, ROOT, images, lessons, read_lesson, validate_photo_reuse_plan, validate_mission_still_plan, validate_exact_diagram_plan, validate_dialogue_poster_plan
from scripts.course_contract import is_mission, is_review
from scripts.install_course_photo_reuse import pointer_parent
from scripts.render_course_stills import pack_output_directory, reviewed_reference_path


class PhotoReuseTests(unittest.TestCase):
    def test_dialogue_reuse_is_bound_to_unchanged_first_turn(self):
        current=lessons(ROOT)
        for row in json.loads((ROOT/'docs/qa/course-dialogue-poster-reuse-v1.json').read_text())['assets']:
            plan={'lesson_id':row['lesson_id'],'old_filename':row['old_filename'],'new_filename':row['candidate_filename'],
                  'old_sha256':row['old_sha256'],'evidence_file':'docs/qa/course-dialogue-poster-reuse-v1.json'}
            validate_dialogue_poster_plan(plan,current,ROOT)
            for field,value in [('audio_text','A changed sentence.'),('stage','Recognize'),('audio_turns',[])]:
                changed=deepcopy(current)
                card=next(c for c in changed[row['lesson_id']]['cards'] if c['slide_id']==row['cards'][0]['slide_id'])
                card[field]=value
                with self.subTest(field=field),self.assertRaises(ValueError):validate_dialogue_poster_plan(plan,changed,ROOT)

    def test_mission_edits_pin_every_marker_and_preserve_the_game_contract(self):
        from scripts.mission_photo_edit_contract import EVIDENCE, superseding_row, validate_record
        records=json.loads((ROOT/EVIDENCE).read_text(encoding='utf-8'))['assets']
        self.assertEqual(13,len(records))
        current=lessons(ROOT)
        for record in records:
            # A parity rebuild may retire an edited card only with its own
            # retired-scene evidence; every other edit stays fully pinned.
            if superseding_row(record,current,ROOT):
                continue
            validate_record(record,current,ROOT)
            for mutation in ('audio','marker','pixels','reference','evidence'):
                changed=deepcopy(current);altered=deepcopy(record)
                card=next(c for c in changed[record['lesson_id']]['cards'] if c['slide_id']==record['slide_id'])
                if mutation=='audio':card['audio_text']='Different assessed language.'
                if mutation=='marker':card['mission_game']['targets'][0]['head_anchors'][0]['x']+=.01
                if mutation=='pixels':altered['new_sha256']='0'*64
                if mutation=='reference':altered['uploaded_reference']['sha256']='0'*64
                if mutation=='evidence':altered['target_observations']={}
                with self.subTest(slide=record['slide_id'],mutation=mutation),self.assertRaises(ValueError):validate_record(altered,changed,ROOT)

    def test_lesson_2_5_pairs_retire_every_contract_violating_photo(self):
        current=lessons(ROOT);bound=images(current['lesson-2-5-this-and-that'])
        proof=json.loads((ROOT/'docs/qa/course-photo-reuse-v1.json').read_text(encoding='utf-8'))['assets']
        records={r['candidate_filename']:r for r in proof if r['kind']=='contract-violating-photo-retirement'}
        for noun in ('book','phone','bag','chair'):
            this,that=f'a1_photo_u2_this_{noun}_v1.webp',f'a1_photo_u2_that_{noun}_v1.webp'
            with self.subTest(noun=noun):
                self.assertFalse({f'a1_near-{noun}.webp',f'a1_far-{noun}.webp'} & bound)
                self.assertLessEqual({this,that},bound)
                near,far=records[this],records[that]
                self.assertEqual((near['old_filename'],far['old_filename']),(f'a1_near-{noun}.webp',f'a1_far-{noun}.webp'))
                # One state is generated and the other is an edit of exactly that output,
                # so the pair shares room and objects and only the pointing hand differs.
                generated,edited=sorted((near,far),key=lambda r:len(r['generation']['receipt']['references']))
                self.assertEqual(generated['generation']['receipt']['references'],[])
                self.assertEqual([r['sha256'] for r in edited['generation']['receipt']['references']],
                                 [generated['generation']['receipt']['sha256']])
                for record in (near,far):
                    self.assertEqual(record['generation']['agent_review']['disposition'],'usable')
                    self.assertEqual(record['human_approval'],'pending')
        review=next(c for c in current['lesson-4-1-rooms-at-home']['cards'] if c['slide_id']=='R7')
        self.assertEqual(review['prompt_image_url'],'a1_photo_u2_this_book_v1.webp')

    def test_opening_cast_is_consistent_through_lesson_one(self):
        lesson=lessons(ROOT)['lesson-1-people-actions']
        text=json.dumps(lesson)
        for person in ('boy','girl','man','woman'):
            for suffix in ('alt','transfer'):
                self.assertNotIn(f'a1_l1_{person}_{suffix}.webp',text)
            self.assertIn('/lesson-assets/'+person+'.webp',text)
        self.assertNotIn('changes clothes',text)
        self.assertNotIn('different clothes',text)

    def test_scoped_proof_requires_fresh_review_and_keeps_missions_out(self):
        proof=json.loads((ROOT/'docs/qa/course-photo-reuse-v1.json').read_text(encoding='utf-8'))
        current=lessons(ROOT)
        for record in proof['assets']:
            self.assertEqual(record['human_approval'],'pending')
            for scope in record['scopes']:
                lesson=current[scope['lesson_id']]
                self.assertFalse(is_mission(lesson))
                if is_review(lesson):self.assertIn('generation',record)
                parent,key=pointer_parent(lesson,scope['pointer'])
                self.assertEqual(Path(parent[key]).name,record['candidate_filename'])

    def test_validation_rejects_stale_pixels_crops_and_scope(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder); pixels=b'reviewed photograph'; sha=hashlib.sha256(pixels).hexdigest()
            for image_root in IMAGE_ROOTS:
                (root/image_root).mkdir(parents=True)
                (root/image_root/'photo.webp').write_bytes(pixels)
            path=root/'docs/qa/course-photo-reuse-v1.json'; path.parent.mkdir(parents=True)
            record={'old_filename':'old.webp','old_sha256':'a'*64,'candidate_filename':'photo.webp','new_sha256':sha,
                'kind':'illustration-or-inset-retirement','old_observation':'Flat illustrated person and symbolic food, observed directly.',
                'new_observation':'An adult in a real kitchen clearly enjoying a plate of eggs.',
                'crop_review':'inspected-3x2-and-centered-4x5','scopes':[{'lesson_id':'lesson','pointer':'/cards/0/image_url'}]}
            current={'lesson':{'sub_lesson_id':'5.4','vocabulary':['eggs'],'cards':[{'image_url':'photo.webp'}]}}
            plan={'lesson_id':'lesson','old_filename':'old.webp','old_sha256':'a'*64,'new_filename':'photo.webp','evidence_file':'docs/qa/course-photo-reuse-v1.json'}
            def save(value):path.write_text(json.dumps({'assets':[value]}))
            save(record); validate_photo_reuse_plan(plan,current,root)
            for patch in ({'new_sha256':'b'*64},{'old_sha256':'b'*64},{'crop_review':'pending'}, {'scopes':[]}):
                with self.subTest(patch=patch),self.assertRaises(ValueError):
                    save({**record,**patch});validate_photo_reuse_plan(plan,current,root)
            save(record)
            # Review and mission scenes are identified from lesson data, not their numbers.
            for role,change in (('review',{'sub_lesson_id':'5.9','vocabulary':[]}),
                                ('mission',{'sub_lesson_id':'5.10','vocabulary':[],'experience_type':'mission'})):
                with self.subTest(role=role),self.assertRaises(ValueError):
                    changed=deepcopy(current);changed['lesson'].update(change)
                    validate_photo_reuse_plan(plan,changed,root)

    def test_paid_namespace_cannot_escape_output_directory(self):
        self.assertEqual(pack_output_directory({'output_namespace':'course-photo-sweep-v1'}).name,'course-photo-sweep-v1')
        for name in ('../course-photo-sweep-v1','course-photo-sweep-v1/escape','course-photo-sweep-v0'):
            with self.subTest(name=name),self.assertRaises(ValueError):
                pack_output_directory({'output_namespace':name})

    def test_fast_parser_preserves_all_authored_lesson_data(self):
        import yaml
        for path in (ROOT/'backend/lessons').glob('unit_*/*.yaml'):
            with self.subTest(path=path.name):
                self.assertEqual(read_lesson(path),yaml.safe_load(path.read_text(encoding='utf-8-sig')))

    def test_existing_image_reference_is_exact_and_confined(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);path=root/IMAGE_ROOTS[0]/'reference.webp';path.parent.mkdir(parents=True);path.write_bytes(b'pixels')
            record={'path':path.relative_to(root).as_posix(),'sha256':hashlib.sha256(b'pixels').hexdigest(),
                    'observed_description':'Directly inspected existing course photograph preserving the same learner-facing character.'}
            self.assertEqual(reviewed_reference_path(record,root),path.resolve())
            for patch in ({'path':'../outside.webp'},{'path':str(path.resolve())},{'sha256':'0'*64},{'observed_description':''}):
                with self.subTest(patch=patch),self.assertRaises(ValueError):reviewed_reference_path({**record,**patch},root)

    def test_mission_still_exception_cannot_change_selectable_game(self):
        proof_path=ROOT/'docs/qa/course-mission-still-reuse-v1.json'
        if not proof_path.exists():self.skipTest('Clock binding not installed yet.')
        row=json.loads(proof_path.read_text())['assets'][0]
        plan={'lesson_id':row['lesson_id'],'old_filename':row['old_filename'],'new_filename':row['candidate_filename'],
              'old_sha256':row['old_sha256'],'evidence_file':'docs/qa/course-mission-still-reuse-v1.json'}
        current=lessons(ROOT);validate_mission_still_plan(plan,current,ROOT)
        card=next(c for c in current[row['lesson_id']]['cards'] if c['slide_id']==row['slide_id'])
        card['mission_game']['kind']='listen-targets'
        with self.assertRaises(ValueError):validate_mission_still_plan(plan,current,ROOT)

    def test_browser_replacements_retire_rejected_album_and_padding(self):
        source=(ROOT/'mobile/src/screens/CourseScreen.tsx').read_text(encoding='utf-8')
        for name in ('a1_u1_album_01_locked.webp','a1_title_unit_1.webp','a1_l1_people_together.webp'):
            self.assertNotIn("image: '"+name+"'",source)
        self.assertIn("image: 'a1_u1_reunion_01_people_path.webp'",source)

    def test_exact_diagram_correction_cannot_change_sentence_or_stage(self):
        rows=json.loads((ROOT/'docs/qa/course-exact-diagram-reuse-v1.json').read_text())['assets']
        current=lessons(ROOT)
        for row in rows:
            plan={'lesson_id':row['lesson_id'],'old_filename':row['old_filename'],'new_filename':row['candidate_filename'],
                  'old_sha256':row['old_sha256'],'evidence_file':'docs/qa/course-exact-diagram-reuse-v1.json'}
            validate_exact_diagram_plan(plan,current,ROOT)
            for patch in ({'stage':'Listen'},{'answer_audio_text':'An unrelated new sentence.'}):
                changed=deepcopy(current);card=next(c for c in changed[row['lesson_id']]['cards'] if c['slide_id']==row['slide_id'])
                card.update(patch)
                with self.subTest(slide=row['slide_id'],patch=patch),self.assertRaises(ValueError):
                    validate_exact_diagram_plan(plan,changed,ROOT)

    def test_multiple_new_photos_for_one_old_image_have_distinct_scopes(self):
        proof=json.loads((ROOT/'docs/qa/course-photo-reuse-v1.json').read_text(encoding='utf-8'))
        plans=json.loads((ROOT/'docs/product/course-media-change-plans.json').read_text(encoding='utf-8'))['changes']
        current=lessons(ROOT);seen=set();multiple=0
        for row in proof['assets']:
            for scope in row['scopes']:
                key=(scope['lesson_id'],scope['pointer'])
                self.assertNotIn(key,seen,'Two proof records must not control the same field')
                seen.add(key)
        for plan in plans:
            if plan.get('issue')=='reviewed-legacy-photo-binding' and plan.get('alternative_filenames'):
                multiple+=1
                validate_photo_reuse_plan(plan,current,ROOT)
        self.assertGreater(multiple,0,'Regression fixture must exercise scoped alternate replacements')

if __name__=='__main__':unittest.main()
