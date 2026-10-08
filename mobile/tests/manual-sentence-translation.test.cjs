const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useManualSentenceTranslation.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const slots=[], timers=new Map();
let cursor=0, now=0, nextId=0, dirty=true, effects=[], key='card-1', value;
const react={
  useRef(initial){return slots[cursor++] ??= {current:initial};},
  useCallback(fn){cursor++;return fn;},
  useState(initial){const i=cursor++;slots[i] ??= {value:initial};return [slots[i].value,next=>{
    if(next!==slots[i].value){slots[i].value=next;dirty=true;}
  }];},
  useEffect(fn,deps){const i=cursor++;if(!slots[i]?.deps.every((v,j)=>v===deps[j]))effects.push(()=>{
    slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};
  });},
};
const api={};
new Function('require','exports','setTimeout','clearTimeout',compiled)(
  ()=>react,api,(fn,ms)=>{const id=++nextId;timers.set(id,{fn,at:now+ms});return id;},id=>timers.delete(id));
function render(){for(let n=0;dirty;n++){assert.ok(n<10);dirty=false;cursor=0;effects=[];
  value=api.useManualSentenceTranslation(key);effects.forEach(fn=>fn());}}
function tick(ms){now+=ms;for(const[id,t]of timers)if(t.at<=now){timers.delete(id);t.fn();}render();}
render();tick(5000);assert.equal(value.visible,false,'No automatic assessment translation.');
value.open();render();assert.equal(value.visible,true);
tick(2999);assert.equal(value.visible,true);
value.open();render();assert.equal(timers.size,1,'Repeated taps replace the existing timer.');
tick(2999);assert.equal(value.visible,true);tick(1);assert.equal(value.visible,false);
value.open();render();key='card-2';dirty=true;render();
assert.equal(value.visible,false,'A new card cannot inherit the previous translation.');
assert.equal(timers.size,0);
value.open();render();slots.forEach(s=>s?.cleanup?.());assert.equal(timers.size,0,'Unmount clears timers.');
console.log('Manual sentence translation: tap-only, three seconds, repeat tap, card reset and cleanup passed.');
