const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const filename=path.join(__dirname,'../src/lessonPractice.ts');
const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const practice={};new Function('exports',source)(practice);
const animation={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/liamAnimation.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(animation);

test('Liam follows speech energy, closes on silence and stops facial motion when reduced',()=>{
 const {liamPose,liamSpeechLevel}=animation;
 assert.equal(liamSpeechLevel([0,0,0]),0);
 assert.ok(liamSpeechLevel([.25,-.25])>liamSpeechLevel([.04,-.04]));
 assert.equal(liamPose(1700,'speaking',0).mouth,.12);
 assert.ok(liamPose(1700,'speaking',.6).mouth>liamPose(1700,'speaking',.2).mouth);
 for(const state of ['idle','thinking','listening','complete']) assert.equal(liamPose(1700,state,1).mouth,.12);
 assert.deepEqual(liamPose(1700,'speaking',1,true),liamPose(8500,'listening',0,true));
});
test('review finishes only after feedback; failed and pending replies remain retryable',()=>{
 for(const mode of ['short','extended']){
  const limit=practice.PRACTICE_LIMITS[mode];
  const history=[{role:'assistant',content:'Start'}];
  for(let i=1;i<=limit;i++){
   history.push({role:'user',content:'My reply'});
   assert.equal(practice.practiceProgress(history,mode,true,'').complete,false);
   history.push({role:'assistant',content:'Liam reply'});
   assert.equal(practice.practiceProgress(history,mode,false,'').complete,i===limit);
  }
  assert.equal(practice.practiceProgress(history,mode,false,'Network error').complete,false);
 }
});
test('POC eligibility is configuration and canonical lesson revision follows into review',()=>{
 const lesson={id:'lesson-1-people-actions',content_revision:7,cards:[{slide_id:'L1'}]};
 assert.equal(practice.practiceAvailable(lesson),true);
 assert.equal(practice.practiceAvailable({...lesson,id:'other'}),false);
 assert.deepEqual(practice.practiceContext(lesson,'short'),{lesson_id:lesson.id,content_revision:7,slide_id:'L1',selected_option_ids:[],review_mode:'short'});
});
