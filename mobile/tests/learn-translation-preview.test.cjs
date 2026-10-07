const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useLearnTranslationPreview.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const card = { stage: 'Learn', options: [{ image_url: 'our.webp' }], spanish_translation: 'Nuestro', learn_translation_preview_ms: 1000 };

function harness() {
  let now = 0, timerId = 0, cursor = 0, dirty = true, effects = [], value;
  const slots = [], timers = new Map();
  let props = { card, key: 'L1', ready: false };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useState(initial) { const i = cursor++; slots[i] ??= { value: initial }; return [slots[i].value, next => {
      if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true; }
    }]; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => {
      slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() };
    }); },
  };
  const api = {};
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', 'Date', compiled)(
    id => { assert.equal(id, 'react'); return react; }, api,
    (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
    id => timers.delete(id), { now: () => now });
  function render() { for (let n=0; dirty; n++) { assert.ok(n<20); dirty=false;cursor=0;effects=[];
    value=api.useLearnTranslationPreview(props.card, props.key, props.ready);effects.forEach(fn=>fn()); } }
  render();
  return { api, get value() { return value; }, set(next) {props={...props,...next};dirty=true;render();},
    tick(ms) { const end=now+ms;while(true) {const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();render();}now=end;render();},
    unmount() {slots.forEach(s=>s?.cleanup?.());assert.equal(timers.size,0);},
  };
}
const h=harness();
h.tick(5000);assert.equal(h.value.visible,false,'Wait for image, briefing and foreground readiness.');
h.set({ready:true});assert.equal(h.value.visible,true);
h.tick(999);assert.equal(h.value.visible,true);h.tick(1);assert.equal(h.value.visible,false,'Hide exactly at one second.');
h.set({card:{...card}});h.tick(1);assert.equal(h.value.visible,false,'Rotation and replay rerenders cannot restart.');
h.set({ready:false});h.set({ready:true});assert.equal(h.value.visible,false,'Exhausted preview stays hidden after help/background.');
h.set({key:'L2'});assert.equal(h.value.visible,true,'New Learn card gets its own preview.');
h.tick(300);h.set({ready:false});h.tick(5000);assert.equal(h.value.visible,false);
h.set({ready:true});h.tick(699);assert.equal(h.value.visible,true);h.tick(1);assert.equal(h.value.visible,false,'Paused time is excluded.');
h.set({key:'L1:restart'});h.tick(200);h.set({key:'R1',card:{...card,stage:'Recognize'}});assert.equal(h.value.enabled,false);h.tick(1000);assert.equal(h.value.visible,false);
for(const invalid of [{...card,stage:'Listen'},{...card,learn_translation_preview_ms:undefined},{...card,spanish_translation:''},{...card,options:[]},{...card,options:[{image_url:''}]}]) assert.equal(h.api.learnTranslationPreviewDuration(invalid),0);
h.set({key:'L2:restart',card});h.unmount();
console.log('Learn translation preview: exact timing, readiness, pause, replay, reset and cleanup passed.');
