const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const clients = {
  web: 'frontend/components/CelebrationMission.js',
  native: 'mobile/src/components/MissionGameSurface.tsx',
};

function callback(file, select, context) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
  let found;
  function visit(node) { if (select(node, ast)) found = select(node, ast); ts.forEachChild(node, visit); }
  visit(ast); assert.ok(found, `Production callback not found in ${file}`);
  const exports = {};
  vm.runInNewContext(ts.transpileModule('exports.run = ' + found.getText(ast),
    {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText, {exports, ...context});
  return exports.run;
}

function transitionClock() {
  let now = 0, cursor = 0, nextTimer = 0;
  const slots = [], effects = [], timers = new Map();
  const changed = (a,b) => !a || a.length !== b.length || a.some((x,i) => x !== b[i]);
  const react = {
    useRef(value) { const i=cursor++; return slots[i] ||= {current:value}; },
    useCallback(fn,deps) { const i=cursor++; if(changed(slots[i]?.deps,deps)) slots[i]={fn,deps}; return slots[i].fn; },
    useEffect(fn,deps) { const i=cursor++; if(changed(slots[i]?.deps,deps)) effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};}); },
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'mobile/src/hooks/useMissionTransition.ts'),'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {
    exports, require:()=>react, Date:{now:()=>now},
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},
    clearTimeout:id=>timers.delete(id),
  });
  return {
    render(paused=false,key='scene-a') {cursor=0;const schedule=exports.useMissionTransition(paused,key);while(effects.length)effects.shift()();return schedule;},
    tick(ms) {now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}},
  };
}

for (const [client,file] of Object.entries(clients)) {
  function harness(completion=true) {
    const clock=transitionClock(), events=[], state={shown:false,feedback:'',cueIndex:0};
    const game={cues:[{target_id:'person',option_id:'reply',answer_text:'Go straight.'}],
      ...(completion?{completion_scene:{image_url:'arrived.webp',context_es:'Ya llegó al parque.'}}:{})};
    const lock={current:false};
    const context={game,cueIndex:0,cue:game.cues[0],currentCue:game.cues[0],isVoiceGate:false,
      locked:false,disabled:false,solvedTargets:[],solvedTargetIds:[],selectionLockRef:lock,
      scheduleTransition:clock.render(),setSubmittedTarget:()=>{},setWrongTarget:()=>{},setWrongTargetId:()=>{},
      setFeedback:x=>state.feedback=x,setSolvedTargets:()=>{},setSolvedTargetIds:()=>{},
      setShowCompletionScene:x=>state.shown=x,setCueIndex:x=>state.cueIndex=x,
      onMisstep:()=>events.push('wrong'),onReplayEnglish:()=>events.push('replay'),onCueRequest:()=>events.push('replay'),
      onScenePlacement:()=>events.push('target'),onTargetFound:()=>events.push('target'),
      onComplete:ids=>events.push('submit:'+ids.join(',')),onSubmit:ids=>events.push('submit:'+ids.join(','))};
    const choose=callback(file,node=>ts.isVariableDeclaration(node)&&node.name.getText()==='chooseTarget'
      ? ts.isCallExpression(node.initializer)?node.initializer.arguments[0]:node.initializer : null,context);
    const proceed=callback(file,node=>{
      if(!ts.isJsxOpeningElement(node))return null;
      const attributes=node.attributes.properties;
      if(!attributes.some(a=>ts.isJsxAttribute(a)&&a.name.getText().endsWith('Label')&&a.initializer?.text==='Continuar la historia')
        && !attributes.some(a=>ts.isJsxAttribute(a)&&a.name.getText()==='aria-label'&&a.initializer?.text==='Continuar la historia'))return null;
      return attributes.find(a=>ts.isJsxAttribute(a)&&['onClick','onPress'].includes(a.name.getText()))?.initializer.expression;
    },context);
    return {clock,events,state,choose,proceed,lock};
  }

  test(`${client}: last cue shows an unscored outcome, freezes on pause and submits once on Continue`,()=>{
    const h=harness();h.choose({id:'person'});h.choose({id:'person'});
    assert.deepEqual(h.events,['target']);h.clock.tick(1000);h.clock.render(true);h.clock.tick(6000);
    assert.equal(h.state.shown,false);h.clock.render(false);h.clock.tick(1199);assert.equal(h.state.shown,false);
    h.clock.tick(1);assert.equal(h.state.shown,true);assert.equal(h.state.feedback,'');assert.deepEqual(h.events,['target']);
    h.proceed();h.proceed();assert.deepEqual(h.events,['target','submit:reply']);
  });
  test(`${client}: a wrong target replays without showing or submitting an outcome`,()=>{
    const h=harness();h.choose({id:'wrong'});h.clock.tick(850);
    assert.deepEqual(h.events,['wrong','replay']);assert.equal(h.state.shown,false);assert.equal(h.lock.current,false);
  });
  test(`${client}: changing cards cancels a pending outcome`,()=>{
    const h=harness();h.choose({id:'person'});h.clock.render(false,'scene-b');h.clock.tick(4000);
    assert.equal(h.state.shown,false);assert.deepEqual(h.events,['target']);
  });
  test(`${client}: scenes without outcomes retain automatic submission`,()=>{
    const h=harness(false);h.choose({id:'person'});h.clock.tick(2200);
    assert.equal(h.state.shown,false);assert.deepEqual(h.events,['target','submit:reply']);
  });
}
