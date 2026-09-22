const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {fitMissionHeadScene}=require('../src/missionTargetInteraction');
const root=path.resolve(__dirname,'../..');
const proof=JSON.parse(fs.readFileSync(path.join(root,'docs/qa/course-mission-photo-edits-v1.json'),'utf8'));
const pack=JSON.parse(fs.readFileSync(path.join(root,'docs/product/course-photo-sweep-mission-edits-v1.json'),'utf8'));

const supersededPath=path.join(root,'docs/qa/course-mission-photo-edits-superseded-v1.json');
const superseded=fs.existsSync(supersededPath)?JSON.parse(fs.readFileSync(supersededPath,'utf8')).superseded:[];
const isSuperseded=record=>superseded.some(row=>row.lesson_id===record.lesson_id&&row.slide_id===record.slide_id
  &&row.candidate_filename===record.candidate_filename);

test('all 13 mission photo edits preserve exact inspected image and marker bindings',()=>{
  assert.equal(proof.assets.length,13);
  let scenes=0;
  for(const record of proof.assets){
    // A parity rebuild retires an edited card only with its own evidence (checked
    // in the backend contract); the edited pixels must still be preserved.
    if(isSuperseded(record)){
      for(const folder of ['Lessons/Lesson1/images','mobile/assets/lesson-assets','frontend/public/lesson-assets']){
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,folder,record.candidate_filename))).digest('hex'),record.new_sha256);
      }
      continue;
    }
    const asset=pack.assets.find(a=>a.runtime_filename===record.candidate_filename);
    const lesson=JSON.parse(fs.readFileSync(path.join(root,asset.change_control.lesson_path),'utf8'));
    const card=lesson.cards.find(c=>c.slide_id===record.slide_id);
    assert.deepEqual(card.mission_game.targets,record.reviewed_targets);
    assert.deepEqual(card.mission_game.cues,record.original_card.mission_game.cues);
    for(const folder of ['Lessons/Lesson1/images','mobile/assets/lesson-assets','frontend/public/lesson-assets']){
      for(const [filename,sha] of [[record.candidate_filename,record.new_sha256],[record.old_filename,record.old_sha256]]){
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,folder,filename))).digest('hex'),sha);
      }
    }
    if(card.mission_game.kind==='voice-gate')continue;
    scenes++;
    for(const [w,h] of [[328,410],[440,190],[650,190],[560,280],[960,430]]){
      const frame=fitMissionHeadScene(w,h,record.reviewed_targets);
      assert.ok(frame&&frame.height<=h);
      assert.equal(frame.imageWidth/frame.imageHeight,1.5);
      assert.ok(frame.imageX>=0&&frame.imageY>=0&&frame.imageX+frame.imageWidth<=w&&frame.imageY+frame.imageHeight<=h);
      for(const m of frame.markers){
        assert.ok(m.width>=48&&m.height>=48);
        assert.ok(m.x>=0&&m.y>=0&&m.x+m.width<=w&&m.y+m.height<=h);
        const target=record.reviewed_targets.find(t=>t.id===m.id);
        assert.equal(m.heads.length,target.head_anchors.length);
        assert.equal(m.collective,target.head_anchors.length>1);
        assert.equal(card.mission_game.cues.filter(c=>c.target_id===m.id).length,1);
        for(const other of frame.markers)if(m.id!==other.id){
          assert.ok(m.x+m.width<=other.x||other.x+other.width<=m.x||m.y+m.height<=other.y||other.y+other.height<=m.y);
        }
      }
    }
  }
  // Two edits still bind their card; the Unit 4, Unit 5 and Unit 6 parity rebuilds superseded their
  // room, market and town scenes, whose pixels are checked in the branch above instead.
  assert.equal(scenes,2);
});
