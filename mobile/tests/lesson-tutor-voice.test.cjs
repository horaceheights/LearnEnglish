const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };

// Execute both production voice surfaces, including the shared preference hook.
// Only platform I/O is mocked; effects, cancellation, storage and user controls run.
function harness(platform, saved = null, delayedRead = null) {
  let cursor=0, dirty=true, effects=[], tree, background;
  const slots=[], requests=[], writes=[], timers=new Set(), modules=new Map();
  const storage={ getItem:async()=>delayedRead || saved, setItem:async(key,value)=>{writes.push(value);saved=value;} };
  const playback={didJustFinish:false,playing:false};
  const player={ plays:0, pauses:0, replace(){}, play:async()=>{player.plays++;playback.playing=true;}, pause(){player.pauses++;playback.playing=false;} };
  const recorder={prepareToRecordAsync:async()=>{},record(){},stop:async()=>{}};
  const dom={open:false,showModal(){this.open=true;},close(){this.open=false;},scrollTo(){}};
  const document={hidden:false,addEventListener:(_,fn)=>{background=fn;},removeEventListener(){}};
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const react={
    useRef(initial){return slots[cursor++]??={current:initial};},
    useState(initial){const i=cursor++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,next=>{
      const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}
    }];},
    useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn};return slots[i].value;},
    useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
  };
  const jsx=(type,props)=>({type,props});
  const AppState={currentState:'active',addEventListener:(_,fn)=>{background=fn;return {remove(){}};}};
  const rn=new Proxy({AppState,Platform:{OS:'android'},StyleSheet:{create:v=>v}}, {get:(o,k)=>o[k]||k});
  function load(file) {
    file=path.resolve(root,file);
    if(modules.has(file))return modules.get(file);
    const api={};modules.set(file,api);
    const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'), {fileName:file.endsWith('.js')?'surface.jsx':file,
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const requireMock=id=>{
      if(id==='react')return react;
      if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
      if(id==='react-native')return rn;
      if(id==='@react-native-async-storage/async-storage')return storage;
      if(id.includes('Ionicons'))return ()=>null;
      if(id==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:24,bottom:24})};
      if(id==='expo-file-system')return {Paths:{cache:'cache'},File:class {write(){} delete(){} uri='file://voice.mp3';}};
      if(id==='expo-audio')return {RecordingPresets:{HIGH_QUALITY:{}}, AudioModule:{requestRecordingPermissionsAsync:async()=>({granted:true})},
        useAudioPlayer:()=>player,useAudioPlayerStatus:()=>playback,useAudioRecorder:()=>recorder,useAudioRecorderState:()=>({}),setAudioModeAsync:async()=>{}};
      if(id.endsWith('/tutorApi'))return {speakTutor:(context,text,signal)=>{const d=deferred();requests.push({...d,context,text,signal});return d.promise;},transcribeTutor:async()=>''};
      if(id.endsWith('/tutorAudio'))return {getTutorAudio:()=>player};
      if(id.endsWith('.css'))return {};
      if(id.endsWith('/TutorActivity'))return {TutorActivity:()=>null};
      const next=path.resolve(path.dirname(file),id);
      return load(next+(fs.existsSync(next+'.ts')?'.ts':'.js'));
    };
    new Function('require','exports','setTimeout','clearTimeout','setInterval','clearInterval','window','document','URL',compiled)(requireMock,api,
      fn=>{timers.add(fn);return fn;},fn=>timers.delete(fn),fn=>{timers.add(fn);return fn;},fn=>timers.delete(fn),
      {localStorage:{getItem:()=>saved,setItem:(_,value)=>{writes.push(value);saved=value;}}},document,{createObjectURL:()=> 'blob:voice',revokeObjectURL(){}});
    return api;
  }
  const Sheet=platform==='native'?load('mobile/src/components/LessonTutorSheet.tsx').LessonTutorSheet:load('frontend/components/LessonTutor.js').default;
  const props={context:{lesson_id:'lesson-1-people-actions',slide_id:'R2',content_revision:3,selected_option_ids:[]},title:'Lección 1.1',answer:'',active:true,
    tutor:{visible:false,messages:[],busy:false,error:'',close(){props.tutor.visible=false;dirty=true;},send:async()=>true,retry(){}}};
  function walk(node,callback){if(!node)return;if(Array.isArray(node)){node.forEach(n=>walk(n,callback));return;}if(typeof node==='object'){callback(node);walk(node.props?.children,callback);}}
  function render(){for(let i=0;dirty;i++){assert.ok(i<40,'Effect loop');dirty=false;cursor=0;effects=[];tree=Sheet(props);walk(tree,node=>{if(node.props?.ref)node.props.ref.current=dom;});effects.forEach(fn=>fn());}}
  async function flush(){for(let i=0;i<14;i++){await Promise.resolve();render();}}
  render();
  return {props,requests,writes,player,playback,flush,
    async set(next){Object.assign(props.tutor,next);dirty=true;await flush();},
    async control(label){let found;walk(tree,node=>{if((node.props?.accessibilityLabel||node.props?.['aria-label'])===label)found=node;});assert.ok(found,label);await(found.props.onPress||found.props.onClick)();await flush();},
    async hide(){if(platform==='native')background('background');else{document.hidden=true;background();}await flush();},
    async finish(){if(platform==='native'){playback.didJustFinish=true;dirty=true;}else player.onended();await flush();},
    unmount(){slots.forEach(s=>s?.cleanup?.());assert.equal(timers.size,0);},
  };
}

for(const platform of ['native','web']) {
  test(`${platform}: manual opening, autoplay once, mute cancellation, repeated replies and background`,async()=>{
    const h=harness(platform);await h.flush();assert.equal(h.requests.length,0);
    const answer={role:'assistant',content:'Con he usamos is.'};
    await h.set({visible:true,messages:[answer]});assert.equal(h.requests.length,1);
    await h.control('Respuestas con voz');assert.equal(h.requests[0].signal.aborted,true);
    h.requests[0].resolve(new Uint8Array([1,2]));await h.flush();assert.equal(h.player.plays,0,'Late speech cannot play after mute.');
    assert.equal(h.writes.at(-1),'off');
    await h.control('Respuestas con voz');assert.equal(h.requests.length,1,'Unmute does not retry interrupted speech automatically.');
    await h.set({messages:[answer,{role:'user',content:'Repite'},answer]});assert.equal(h.requests.length,2,'Identical new replies still autoplay.');
    h.requests[1].resolve(new Uint8Array([1,2]));await h.flush();assert.equal(h.player.plays,1);
    await h.finish();assert.equal(h.requests.length,2);
    await h.control('Cerrar tutor y volver a la lección');await h.set({visible:true});assert.equal(h.requests.length,2,'Reopening does not reread history.');
    await h.set({messages:[answer,{role:'user',content:'Otra duda'},answer,{role:'assistant',content:'Otro ejemplo.'}]});
    await h.hide();assert.equal(h.requests[2].signal.aborted,true);
    h.requests[2].resolve(new Uint8Array([1,2]));await h.flush();assert.equal(h.player.plays,1);
    h.unmount();
  });
  test(`${platform}: saved mute is respected on opening and remount`,async()=>{
    const h=harness(platform,'off');await h.flush();
    await h.set({visible:true,messages:[{role:'assistant',content:'Pista'}]});assert.equal(h.requests.length,0);
    h.unmount();
  });
}
test('native: a delayed preference read cannot briefly play speech or override a newer mute tap',async()=>{
  const read=deferred();const h=harness('native',null,read.promise);
  await h.set({visible:true,messages:[{role:'assistant',content:'Pista'}]});assert.equal(h.requests.length,0);
  await h.control('Respuestas con voz');read.resolve('on');await h.flush();assert.equal(h.requests.length,0);assert.equal(h.writes.at(-1),'off');h.unmount();
});
test('native: dictating a question preserves the explicit mute preference',async()=>{
  const h=harness('native','off');await h.flush();await h.set({visible:true,messages:[{role:'assistant',content:'Pista'}]});
  await h.control('Grabar pregunta');assert.equal(h.writes.length,0);assert.equal(h.requests.length,0);h.unmount();
});
