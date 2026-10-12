const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const lesson = require('../src/generated/a1-course.json').find(l => l.experience_type === 'mission');
const card = lesson.cards.find(c => c.mission_game.kind !== 'voice-gate' && c.mission_game.cues.length > 1);

// Run each real mission component and the shared timer hook. Stub platform I/O only.
function harness(platform) {
  let cursor = 0, dirty = true, effects = [], tree, now = 0, focus;
  const slots = [], timers = new Map(), modules = new Map(), replays = [], submits = [];
  const same = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const react = {
    useState(initial) { const i=cursor++; if(!slots[i]) slots[i]={value:typeof initial==='function'?initial():initial}; return [slots[i].value,next=>{const v=typeof next==='function'?next(slots[i].value):next;if(!Object.is(v,slots[i].value)){slots[i].value=v;dirty=true;}}]; },
    useRef(initial) { return slots[cursor++] ??= {current:initial}; },
    useMemo(fn,deps) { const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn()};return slots[i].value; },
    useCallback(fn,deps) { return react.useMemo(()=>fn,deps); },
    useEffect(fn,deps) { const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};}); },
  };
  const noop=()=>{};
  const jsx=(type,props,key)=>({type,props,key});
  const setTimer=(fn,delay)=>{timers.set(fn,now+delay);return fn;};
  function load(relative) {
    const file=path.resolve(root,relative);if(modules.has(file))return modules.get(file);
    const api={};modules.set(file,api);
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file.replace(/\.mjs$/,'.js'),compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const req=id=>{
      if(id==='react')return react;
      if(id==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'Fragment'};
      if(id==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:s=>s,absoluteFill:{}},useWindowDimensions:()=>({width:390,height:844})};
      if(id==='next/image'||id.startsWith('@expo/'))return ()=>null;
      if(id.endsWith('useReducedMotion'))return {useReducedMotion:()=>true};
      if(id.endsWith('TutorButton'))return {TutorButton:'TutorButton'};
      if(id.endsWith('OptionMediaImage'))return {OptionMediaImage:'Image'};
      let next=path.resolve(path.dirname(file),id);
      if(!path.extname(next))next+=fs.existsSync(next+'.ts')?'.ts':'.js';
      return load(next);
    };
    const ResizeObserver=class { constructor(fn){this.fn=fn;} observe(){this.fn([{contentRect:{width:350,height:430}}]);} disconnect(){} };
    const module={exports:api};
    new Function('require','exports','module','setTimeout','clearTimeout','Date','ResizeObserver',source)(req,api,module,setTimer,fn=>timers.delete(fn),{now:()=>now},ResizeObserver);
    modules.set(file,module.exports); return module.exports;
  }
  const Component=platform==='native'?load('mobile/src/components/MissionGameSurface.tsx').MissionGameSurface:load('frontend/components/CelebrationMission.js').default;
  const order=card.mission_game.cues.map((_,i)=>i).reverse();
  const props={card,lesson,cueOrder:order,cardIndex:0,imageSrc:card.prompt_image_url,interactionReady:true,introComplete:true,
    isMobile:true,paused:false,onTutor:noop,onTutorFocus:v=>{focus=v;},onCueRequest:i=>replays.push(i),onReplayEnglish:i=>replays.push(i),
    onMisstep:noop,onTargetFound:noop,onScenePlacement:noop,onSubmit:v=>submits.push(v),onComplete:v=>submits.push(v),resolveImage:x=>x,speech:{}};
  const nodes=()=>{const all=[];const walk=n=>{if(Array.isArray(n)){n.forEach(walk);return;}if(n&&typeof n==='object'){all.push(n);walk(n.props?.children);}};walk(tree);return all;};
  function render(){for(let i=0;dirty;i++){assert.ok(i<30,'effect loop');dirty=false;cursor=0;effects=[];tree=Component(props);for(const n of nodes())if(typeof n.props?.ref==='function')n.props.ref({});else if(n.props?.ref)n.props.ref.current={};effects.forEach(fn=>fn());}}
  function tick(ms){now+=ms;for(const [fn,due] of [...timers])if(due<=now){timers.delete(fn);fn();}render();}
  render();
  if(platform==='native'){nodes().find(n=>n.props?.onLayout && n.props.style.some?.(s=>s?.minHeight===0)).props.onLayout({nativeEvent:{layout:{width:350,height:430}}});render();}
  return {order,replays,submits,get focus(){return focus;},nodes,tick,
    pause(value){props.paused=value;dirty=true;render();},
    choose(target){const n=nodes().find(n=>platform==='native'?n.props?.target?.id===target.id:n.key===target.id && n.type==='button');assert.ok(n,'target rendered');(n.props.onPress||n.props.onClick)();render();},
    unmount(){slots.forEach(s=>s?.cleanup?.());},
  };
}
for(const platform of ['native','web'])test(`${platform}: tutor follows shuffled mission cues and pauses without losing found targets`,()=>{
  const h=harness(platform), cue=card.mission_game.cues[h.order[0]];
  assert.equal(h.focus.cue_index,h.order[0]);
  assert.equal(h.focus.target_id,undefined);
  const wrong=card.mission_game.targets.find(t=>t.id!==cue.target_id);
  h.choose(wrong); assert.equal(h.focus.target_id,wrong.id);
  assert.ok(h.nodes().some(n=>n.type==='TutorButton' && n.props.more),'Persistent Saber más after a wrong target');
  h.tick(200);h.pause(true);h.tick(5000);
  assert.deepEqual(h.replays,[],'No clue replay under tutor');
  assert.equal(h.focus.target_id,wrong.id,'Submitted target remains grounded while tutor is open');
  h.pause(false);h.tick(650);assert.deepEqual(h.replays,[0]);
  assert.ok(h.nodes().some(n=>n.type==='TutorButton'),'Saber más remains available after short feedback clears');
  h.choose(card.mission_game.targets.find(t=>t.id===cue.target_id));
  h.tick(500);h.pause(true);h.tick(5000);
  assert.equal(h.focus.cue_index,h.order[0]);assert.deepEqual(h.submits,[]);
  h.pause(false);h.tick(1700);
  assert.equal(h.focus.cue_index,h.order[1]);assert.equal(h.focus.target_id,undefined);
  assert.deepEqual(h.replays,[0,1]);
  h.unmount();h.tick(10000);assert.deepEqual(h.submits,[]);
});
