const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useLearnTranslationPreview.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const card = { stage: 'Learn', options: [{ image_url: 'our.webp' }], spanish_translation: 'Nuestro', learn_translation_preview_ms: 2000 };

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
    value=api.useLearnTranslationPreview(props.card, props.key, props.ready, props.speaking);effects.forEach(fn=>fn()); } }
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
h.tick(1999);assert.equal(h.value.visible,true);h.tick(1);assert.equal(h.value.visible,false,'Hide exactly at two seconds.');
h.set({card:{...card}});h.tick(1);assert.equal(h.value.visible,false,'Rotation and replay rerenders cannot restart.');
h.set({ready:false});h.set({ready:true});assert.equal(h.value.visible,false,'Exhausted preview stays hidden after help/background.');
h.set({key:'L2'});assert.equal(h.value.visible,true,'New Learn card gets its own preview.');
h.tick(300);h.set({ready:false});h.tick(5000);assert.equal(h.value.visible,false);
h.set({ready:true});h.tick(1699);assert.equal(h.value.visible,true);h.tick(1);assert.equal(h.value.visible,false,'Paused time is excluded.');
// User decision 2026-11-19: keep the Spanish while the voice speaks and one second after it stops.
h.set({key:'S1',ready:true});h.tick(150);h.set({speaking:true});h.tick(1850);h.set({speaking:false});h.tick(80);
h.set({speaking:true});h.tick(1900);assert.equal(h.value.visible,true,'Still shown while the answer line is spoken.');
h.set({speaking:false});h.tick(999);assert.equal(h.value.visible,true);h.tick(1);assert.equal(h.value.visible,false,'Hide one second after the voice stops.');
h.set({speaking:true});h.tick(500);assert.equal(h.value.visible,false,'A replay after hiding cannot restart it.');h.set({speaking:false});
h.set({key:'S2'});h.tick(100);h.set({speaking:true});h.tick(400);h.set({speaking:false});
h.tick(1499);assert.equal(h.value.visible,true);h.tick(1);assert.equal(h.value.visible,false,'Short speech still gets the two-second minimum.');
h.set({key:'S3'});h.set({speaking:true});h.tick(1000);h.set({ready:false});h.tick(4000);h.set({ready:true});
h.tick(3000);assert.equal(h.value.visible,true,'Help/background pauses without ending the speech hold.');
h.set({speaking:false});h.tick(999);assert.equal(h.value.visible,true);h.tick(1);assert.equal(h.value.visible,false);
h.set({key:'S4'});h.set({speaking:true});h.tick(11999);assert.equal(h.value.visible,true);h.tick(1);
assert.equal(h.value.visible,false,'Playback that never reports its end is capped at 12 seconds.');h.set({speaking:false});
assert.equal(h.api.LEARN_TRANSLATION_HOLD_MS,1000);
for(const [client,pattern] of [['../src/screens/LessonScreen.tsx',/useLearnTranslationPreview\(currentCard, helpCardKey,[\s\S]{0,260}?,\s*courseAudioPlaybackStatus\.playing\);/],
  ['../../frontend/components/LessonPlayer.js',/useLearnTranslationPreview\(currentCard, teachingCardKey,[\s\S]{0,360}?Boolean\(hasPromptAutoplay\) && helpAudioReadyKey !== helpCardKey\);/]])
  assert.match(fs.readFileSync(path.resolve(__dirname,client),'utf8'),pattern,`${client} tells the preview when the voice is speaking.`);
h.set({key:'L1:restart'});h.tick(200);h.set({key:'R1',card:{...card,stage:'Recognize'}});assert.equal(h.value.enabled,false);h.tick(1000);assert.equal(h.value.visible,false);
for(const invalid of [{...card,stage:'Listen'},{...card,learn_translation_preview_ms:0},{...card,spanish_translation:''},{...card,options:[]},{...card,options:[{image_url:''}]}]) assert.equal(h.api.learnTranslationPreviewDuration(invalid),0);
assert.equal(h.api.learnTranslationPreviewDuration({...card,learn_translation_preview_ms:undefined}),2000,'All Learn introductions default to two seconds, without lesson-specific metadata.');
assert.equal(h.api.learnTranslationPreviewDuration({...card,learn_translation_preview_ms:null}),2000);
const course=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../src/generated/a1-course.json'),'utf8'));
const lessons=Array.isArray(course)?course:(course.lessons||Object.values(course));
const units=new Set();let introductions=0;
for(const lesson of lessons){for(const intro of lesson.cards||[]){if(intro.stage==='Learn'){
  assert.equal(h.api.learnTranslationPreviewDuration(intro),2000,`${lesson.id}/${intro.slide_id}`);units.add(lesson.unit_id);introductions++;
}}}
assert.equal(units.size,new Set(lessons.map(lesson=>lesson.unit_id)).size,'Every unit is covered by the default.');assert.ok(introductions>300);
// User decision 2026-11-18: a question-and-answer Learn card previews its complete Spanish at once;
// a tap still translates the line on screen. Per-line text inside one two-second window only flashed.
const exchange={...card,spanish_translation:'¿Cuándo trabaja Luis? Él trabaja el sábado.',audio_turns:[
  {text:'When does Luis work?',spanish_translation:'¿Cuándo trabaja Luis?'},{text:'He works on Saturday.',spanish_translation:'Él trabaja el sábado.'}]};
assert.equal(h.api.learnTranslationText(exchange,'¿Cuándo trabaja Luis?',false),exchange.spanish_translation,'Preview shows every line.');
assert.equal(h.api.learnTranslationText(exchange,'Él trabaja el sábado.',false),exchange.spanish_translation,'Preview does not switch per line.');
assert.equal(h.api.learnTranslationText(exchange,'Él trabaja el sábado.',true),'Él trabaja el sábado.','A tap translates the visible line.');
assert.equal(h.api.learnTranslationText({...exchange,stage:'Recognize'},'Él trabaja el sábado.',false),'Él trabaja el sábado.','Assessments keep their own text.');
let exchanges=0;
for(const file of ['a1-course.json','a1-plus-course.json']){
  const catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../src/generated',file),'utf8'));
  for(const lesson of Array.isArray(catalog)?catalog:catalog.lessons)for(const intro of lesson.cards){
    const lines=(intro.audio_turns||[]).map(turn=>turn.spanish_translation?.trim()).filter(Boolean);
    if(intro.stage!=='Learn'||!lines.length)continue;exchanges++;
    const shown=h.api.learnTranslationText(intro,lines.at(-1),false);
    for(const line of lines)assert.ok(shown.includes(line),`${lesson.id}/${intro.slide_id} preview must include "${line}"`);
  }
}
// The Codex A1+ 1.9-1.12 held the catalog's only per-line Learn cards until their 2026-11-18 rebuild,
// so one of them is kept as a fixture and the rule stays tested on a real installed card.
const kept=JSON.parse(fs.readFileSync(path.resolve(__dirname,'fixtures/a1plus-per-line-learn-card.json'),'utf8')).card;
const keptLines=kept.audio_turns.map(turn=>turn.spanish_translation?.trim()).filter(Boolean);
assert.ok(kept.stage==='Learn'&&keptLines.length===2,'The fixture is a two-line Learn exchange.');
for(const line of keptLines)assert.ok(h.api.learnTranslationText(kept,keptLines.at(-1),false).includes(line),`fixture preview must include "${line}"`);
exchanges++;
assert.ok(exchanges>0,'Per-line Learn cards exist to protect.');
for(const client of ['../src/screens/LessonScreen.tsx','../../frontend/components/LessonPlayer.js'])
  assert.match(fs.readFileSync(path.resolve(__dirname,client),'utf8'),/\{learnTranslationText\(currentCard,/,`${client} renders the shared preview text.`);
// A complete question-and-answer translation can need three lines at 13 px on a phone: shrink, never clip with "…".
assert.match(fs.readFileSync(path.resolve(__dirname,'../src/screens/LessonScreen.tsx'),'utf8'),
  /adjustsFontSizeToFit\s+minimumFontScale=\{0\.75\}\s+numberOfLines=\{2\}\s+style=\{\[styles\.inlineTranslation/,'Native translation fits its two lines.');
h.set({key:'L2:restart',card});h.unmount();
console.log('Learn translation preview: exact timing, readiness, pause, replay, reset and cleanup passed.');
