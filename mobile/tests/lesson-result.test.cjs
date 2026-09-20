const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const model = require(process.argv[2]);
const { createLessonResultStore } = require(path.join(path.dirname(process.argv[2]), 'lessonResultStore.js'));
const initial = (extra = {}) => ({ id:'run-1', userId:'learner', lessonId:'lesson-1', totalCards:10,
  initialScore:7, missedCards:[7,8,9], ungradedCards:[], recoveredCards:[], completedAt:'2026-09-20T10:00:00.000Z', ...extra });
const memory = () => { const data = new Map(); return { getItem:async key => data.get(key) || null, setItem:async (key,value) => { data.set(key,value); } }; };

test('recovery crosses 80% and continues to 100% without changing the original grade', () => {
  let result = initial();
  assert.equal(model.resultSummary(result).passed, false);
  result = model.recoverLessonCard(result, 7);
  assert.equal(model.resultSummary(result).percentage, 80);
  assert.equal(model.resultSummary(result).passed, true);
  assert.deepEqual(model.remainingReviewCards(result), [8,9]);
  assert.deepEqual(model.recoverLessonCard(result,7), result);
  assert.deepEqual(model.recoverLessonCard(result,0), result);
  result = model.recoverLessonCard(model.recoverLessonCard(result,8),9);
  assert.equal(model.resultSummary(result).percentage,100);
  assert.equal(result.initialScore,7);
  assert.deepEqual(model.remainingReviewCards(result),[]);
});
test('79.9% is never presented as 80% and ungraded speech cannot grant a pass', () => {
  assert.equal(model.resultSummary(initial({totalCards:1000,initialScore:799})).percentage,79);
  assert.equal(model.resultSummary(initial({totalCards:1000,initialScore:799})).passed,false);
  const pending = initial({initialScore:9,missedCards:[],ungradedCards:[9]});
  assert.equal(model.resultSummary(pending).passed,false);
  assert.equal(model.resultSummary(pending).pending,1);
  assert.equal(model.resultSummary(model.recoverLessonCard(pending,9)).percentage,100);
});
test('restarting and reviewing never revoke a previously earned pass; next lesson crosses units', () => {
  const passed = model.recoverLessonCard(initial(),7);
  const restarted = initial({id:'run-2',initialScore:0,missedCards:Array.from({length:10},(_,i)=>i),completedAt:'2026-09-20T11:00:00.000Z'});
  assert.equal(model.localResultProgress([passed,restarted])['lesson-1'].passed,true);
  assert.equal(model.localResultProgress([passed,restarted])['lesson-1'].score,0);
  const lessons = [{id:'1.10'},{id:'2.1'},{id:'7.10'}];
  assert.equal(model.nextCourseLesson(lessons,'1.10').id,'2.1');
  assert.equal(model.nextCourseLesson(lessons,'7.10'),null);
});
test('immutable original result rejects changed grades and impossible recovered activities', () => {
  assert.throws(()=>model.mergeLessonResult(initial(),initial({initialScore:8})), /no puede cambiar/);
  assert.equal(model.parseLessonResult(initial({recoveredCards:[0]})),null);
  assert.equal(model.parseLessonResult(initial({missedCards:[7,8]})),null);
  assert.deepEqual(model.remainingReviewCards(initial({reviewAvailable:false,missedCards:[]})),[]);
});
test('offline results survive restarting and a stale sync acknowledgement cannot erase a correction', async () => {
  const storage = memory();
  const store = createLessonResultStore(storage);
  await store.save(initial());
  await assert.rejects(store.sync('learner',async()=>{throw Error('offline');}));
  assert.equal((await createLessonResultStore(storage).list('learner')).length,1);
  let release, entered;
  const atSend = new Promise(resolve=>{entered=resolve;});
  const calls=[];
  const syncing=store.sync('learner', async result => {
    calls.push(result);
    if(calls.length===1) { entered(); await new Promise(resolve=>{release=resolve;}); }
    return result;
  });
  await atSend;
  await store.save(model.recoverLessonCard(initial(),7));
  release(); await syncing;
  assert.equal(calls.length,2);
  const reloaded=await createLessonResultStore(storage).latest('learner','lesson-1',10);
  assert.equal(model.resultSummary(reloaded).percentage,80);
  assert.equal(reloaded.initialScore,7);
  await store.sync('learner',async()=>{assert.fail('clean result must not resend');});
});
test('an unavailable disk reports failure without discarding the result', async () => {
  const store=createLessonResultStore({getItem:async()=>null,setItem:async()=>{throw Error('full');}});
  await assert.rejects(store.save(initial()), /full/);
});

test('a completed new checkpoint cannot reopen an older finished run', async()=>{
  const store=createLessonResultStore(memory());
  await store.save(initial());
  assert.equal(await store.latest('learner','lesson-1',10,undefined,'new-unpersisted-run'),null);
  await store.save(initial({id:'run-2',completedAt:'2026-09-20T11:00:00.000Z'}));
  assert.equal((await store.latest('learner','lesson-1',10,undefined,'run-1')).id,'run-1');
});
