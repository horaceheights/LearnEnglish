const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const contract = {};
new Function('exports', compile('lessonTutor.ts'))(contract);
const lesson = require('../src/generated/a1-course.json').find(l => l.id === 'lesson-1-people-actions');
const card = lesson.cards.find(c => c.slide_id === 'U4');
const context = contract.tutorCardContext(lesson, card, null, ['he']);
assert.deepEqual(context.selected_option_ids, [], 'An unfinished choice is never presented as a submitted answer.');
assert.deepEqual(contract.TUTOR_LESSON_IDS, [lesson.id]);
assert.equal(contract.tutorEnabled('another-lesson'), false);
assert.deepEqual(contract.tutorCardContext(lesson, card, 'wrong', ['a', 'man', 'he', 'is']).selected_option_ids, ['a', 'man', 'he', 'is']);

function harness() {
  let cursor = 0, dirty = true, effects = [], value;
  const slots = [], calls = [], timers = new Set();
  let scope = 'learner-a', ctx = context;
  const same = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const react = {
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useState(initial) { const i=cursor++; slots[i] ??= { value: initial }; return [slots[i].value, next => {
      const v=typeof next === 'function' ? next(slots[i].value) : next;
      if (!Object.is(v,slots[i].value)) { slots[i].value=v; dirty=true; }
    }]; },
    useCallback(fn,deps) { const i=cursor++; if (!same(slots[i]?.deps,deps)) slots[i]={deps,value:fn}; return slots[i].value; },
    useEffect(fn,deps) { const i=cursor++; if (!same(slots[i]?.deps,deps)) effects.push(() => {
      slots[i]?.cleanup?.(); slots[i]={deps,cleanup:fn()};
    }); },
  };
  const api={};
  new Function('require','exports','setTimeout','clearTimeout',compile('hooks/useLessonTutor.ts'))(
    id => id === 'react' ? react : contract, api,
    fn => { timers.add(fn); return fn; }, fn => timers.delete(fn));
  const transport=(...args) => new Promise((resolve,reject) => calls.push({args,resolve,reject}));
  function render() { for (let i=0;dirty;i++) { assert.ok(i<20); dirty=false; cursor=0; effects=[]; value=api.useLessonTutor(scope,ctx,transport); effects.forEach(fn=>fn()); } }
  async function flush() { for(let i=0;i<8;i++) { await Promise.resolve(); render(); } }
  render();
  return { calls, timers, get value(){return value;}, flush,
    async set(nextScope,nextContext) { scope=nextScope;ctx=nextContext;dirty=true;await flush(); },
    unmount() { slots.forEach(s=>s?.cleanup?.()); },
  };
}
(async () => {
  const h=harness(); await h.flush(); assert.equal(h.calls.length,0, 'Mount never makes a paid request.');
  await h.set('learner-a',{...context,selected_option_ids:['a','man','he','is']});
  assert.equal(h.calls.length,0,'A wrong answer alone never opens the tutor.');
  h.value.open(); h.value.open(); await h.flush(); assert.equal(h.calls.length,1,'Rapid taps send one opening request.');
  assert.equal(h.value.visible,true);
  h.calls[0].resolve({reply:'Explicación del orden.'}); await h.flush();
  assert.equal(h.value.messages.length,1);
  h.value.close(); await h.flush(); h.value.open(); await h.flush();
  assert.equal(h.calls.length,1,'Reopen preserves this card conversation.');
  void h.value.send('Otro ejemplo'); await h.flush();
  assert.equal(h.calls[1].args[2].length,1,'Follow-up receives prior context.');
  h.value.close(); await h.flush(); assert.equal(h.calls[1].args[3].aborted,true);
  h.calls[1].resolve({reply:'Late response'}); await h.flush();
  assert.ok(!h.value.messages.some(m=>m.content==='Late response'));
  await h.set('learner-b',context); assert.deepEqual(h.value.messages,[]);
  h.value.open(); await h.flush();
  h.calls[2].reject(new Error('Sin conexión')); await h.flush();
  assert.equal(h.value.error,'Sin conexión');
  h.value.retry(); await h.flush(); assert.equal(h.calls.length,4);
  h.calls[3].resolve({reply:'Pista recuperada'}); await h.flush(); assert.equal(h.value.error,'');
  void h.value.send('Más detalle'); await h.flush();
  await h.set('learner-b',{...context,slide_id:'U5'});
  assert.equal(h.calls[4].args[3].aborted,true); assert.equal(h.value.visible,false);
  h.calls[4].resolve({reply:'Stale card'}); await h.flush(); assert.deepEqual(h.value.messages,[]);
  h.unmount();
  console.log('Tutor: opt-in, submitted context, deduplication, history, retry, account/card reset and stale cancellation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
