const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const filename=path.join(__dirname,'../src/lessonPractice.ts');
const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const practice={};new Function('exports',source)(practice);
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
