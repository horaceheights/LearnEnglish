const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const nativeFile = 'mobile/src/screens/LessonScreen.tsx';
const webFile = 'frontend/components/LessonPlayer.js';
const course = JSON.parse(fs.readFileSync(path.join(root, 'mobile/src/generated/a1-course.json'), 'utf8'));
const lesson = course.find(l => l.sub_lesson_id === '5.5');
const cards = lesson.cards.filter(c => c.reply_image_timing === 'after-prompt');
const shared = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'mobile/src/lessonTurnImages.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:shared});

// Execute the production callbacks with observable playback and choice events.
function callback(file, name, contains, context) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      found = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
    }
    if (!name && ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
        && node.arguments[0].getText(ast).includes(contains)) found = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(found, name || contains);
  const exports = {};
  vm.runInNewContext(ts.transpileModule('exports.run = ' + found.getText(ast),
    {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText, {exports, ...context});
  return exports.run;
}

function value(file, name, context) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(found, name);
  const exports = {};
  vm.runInNewContext(ts.transpileModule('exports.value = ' + found.getText(ast),
    {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText, {exports,...context});
  return exports.value;
}

test('both agreement choices author a pre-choice response picture and retain existing audio bindings', () => {
  assert.deepEqual(cards.map(c => c.slide_id), ['R2', 'R4']);
  for (const card of cards) {
    assert.ok(card.audio_text);
    assert.notEqual(card.prompt_image_url, shared.replyImageAfterPrompt(card));
    assert.equal(card.answer_audio_turns.length, 1);
    assert.equal(card.answer_audio_turns[0].text, card.answer_audio_text);
    assert.ok(card.options.every(o => !o.image_url));
  }
  assert.equal(shared.replyImageAfterPrompt({...cards[0], reply_image_timing:undefined}), null);
});

test('native waits for actual prompt completion, then shows the reply before accepting a choice; replay restores the first image', () => {
  for (const currentCard of cards) {
    const status = {playing:false, didJustFinish:false, error:null};
    let image = null;
    const ctx = {currentCard, courseAudioPlaybackStatus:status, replyImageAfterPrompt:shared.replyImageAfterPrompt,
      promptAutoplayAwaitingRef:{current:true}, promptAutoplayWasPlayingRef:{current:false},
      audioPlaybackRequestRef:{current:1},audioPlaybackStartedRequestRef:{current:1},
      promptAutoplayFallbackTimerRef:{current:null}, clearTimeout(){}, setPromptAutoplayFinished(){},
      setActiveTurnImageUrl:value => { image=value; }};
    const observe = callback(nativeFile, null, 'const replyImage = replyImageAfterPrompt(currentCard)', ctx);
    observe(); assert.equal(image,null);
    status.playing=true; observe(); assert.equal(image,null);
    status.playing=false; status.didJustFinish=true; observe();
    assert.equal(image, shared.replyImageAfterPrompt(currentCard));
    const replay = callback(nativeFile, 'replayPrompt', null, {...ctx, visiblePromptAudio:currentCard.audio_text,
      setReplyImageAttempt(){},promptHasVisualBlank:false, isPronunciation:false, playAudio(){}, completionPromptSource:null});
    replay(); assert.equal(image,null); assert.equal(ctx.promptAutoplayAwaitingRef.current,true);
    status.didJustFinish=false; status.playing=true; observe();
    status.playing=false; status.error='failed'; observe(); assert.equal(image,null, 'An error is not a finished line.');

    let choices=0;
    const chooseContext = {currentCard, result:null, correctChoiceHandledRef:{current:false},
      replyImageAfterPrompt:shared.replyImageAfterPrompt, awaitingConstructionRetry:()=>false,
      orderedCorrectOptionIds:c=>[c.correct_option_id], selectedIds:[], missionExperience:false,
      evaluateChoiceSelection:()=>choices++};
    callback(nativeFile,'choose',null,{...chooseContext,replyScenePending:true})(currentCard.correct_option_id);
    assert.equal(choices,0);
    callback(nativeFile,'choose',null,{...chooseContext,replyScenePending:false})(currentCard.correct_option_id);
    assert.equal(choices,1);
  }
});

test('web prompt replay shows the first frame and reveals the response only on confirmed audio completion', () => {
  for (const currentCard of cards) {
    let image = shared.replyImageAfterPrompt(currentCard), spoken;
    const replay = callback(webFile,'playCurrentCardPrompt',null,{
      help:{interact(){}}, setHelpAudioReadyKey(){}, isPronunciationCard:false, correctRecognizeReplayText:null,
      currentCard, cardPromptText:currentCard.audio_text, replyImage:image,
      setReplyImageAttempt(){},
      setActiveTurnImageUrl:value=>{image=value;}, cardAudioTurnSequence:()=>null,
      cardAudioAsset:()=>({id:'bound-prompt'}), speakText:(text,options)=>{spoken={text,options};},
      cardPromptVoiceMode:'prompt',cardCompletionFullText:'',cardCompletionBlankText:'',helpCardKey:'5.5:R4',
    });
    replay(); assert.equal(image,null); assert.equal(spoken.text,currentCard.audio_text);
    spoken.options.onEnd(); assert.equal(image,null,'Recovery callback cannot reveal the response.');
    spoken.options.onAudioCompleted(); assert.equal(image,shared.replyImageAfterPrompt(currentCard));
  }
});

test('native correct-answer replay preserves authored turn audio and scalar fallback', () => {
  for (const authoredTurns of [true, false]) {
    const currentCard = {...cards[0], answer_audio_turns:authoredTurns ? cards[0].answer_audio_turns : []};
    const sequence = [{turn:currentCard.answer_audio_turns[0],asset:{id:'reviewed-answer-turn'}}];
    const events=[];
    const replay=callback(nativeFile,'handleReplayButtonPress',null,{
      currentCard,phraseReplayAvailable:true,isPronunciation:false,
      correctRecognizeReplayText:currentCard.answer_audio_text,
      help:{interact(){events.push('interact');}},
      findCourseAudioTurnSequence:(card,purpose)=>{
        assert.equal(card,currentCard);assert.equal(purpose,'answer');return sequence;
      },
      playAudioSequence:(value,mode,variant)=>{assert.equal(value,sequence);events.push([mode,variant]);},
      playAudio:(text,mode,variant)=>events.push([text,mode,variant]),
      replayPrompt:()=>assert.fail('Correct-answer replay must not restart the question.'),
      addDiagnosticBreadcrumb:()=>assert.fail('The reviewed turn contract should resolve.'),
    });
    replay();
    assert.deepEqual(events,authoredTurns
      ? ['interact',['prompt','answer-turns']]
      : ['interact',[currentCard.answer_audio_text,'prompt','answer']]);
  }

  const diagnostics=[];
  callback(nativeFile,'handleReplayButtonPress',null,{
    currentCard:cards[0],phraseReplayAvailable:true,isPronunciation:false,
    correctRecognizeReplayText:cards[0].answer_audio_text,help:{interact(){}},
    findCourseAudioTurnSequence:()=>null,
    playAudioSequence:()=>assert.fail('An invalid turn must not play.'),
    playAudio:()=>assert.fail('An authored turn must not fall back to an unbound scalar answer.'),
    replayPrompt:()=>assert.fail('Invalid answer replay must not play the question.'),
    addDiagnosticBreadcrumb:(name)=>diagnostics.push(name),
  })();
  assert.deepEqual(diagnostics,['course_audio_turn_sequence_invalid']);
});

test('web automatically plays these authored exchanges outside Unit 1 without requiring a manual replay', () => {
  for (const currentCard of cards) {
    let pending, spoken, image=null;
    const mount=callback(webFile,null,'spokenPromptKeyRef.current = promptKey',{
      currentCard, replyImage:shared.replyImageAfterPrompt(currentCard), isRecognitionLesson:false,
      setReplyImageAttempt(){},
      isWrittenRecognize:()=>false,cardPromptHasVisualBlank:false,isPronunciationCard:false,
      isMissionGameExperience:false,isPageTurning:false,started:true,isComplete:false,lastResult:null,
      activeLesson:lesson,cardIndex:1,spokenPromptKeyRef:{current:null},
      window:{setTimeout:fn=>{pending=fn;return 1;},clearTimeout(){}},
      cardPromptText:currentCard.audio_text,cardAudioTurnSequence:()=>null,
      setActiveTurnImageUrl:v=>{image=v;},speakText:(text,options)=>{spoken={text,options};},
      cardAudioAsset:()=>({id:'bound-prompt'}),cardPromptVoiceMode:'prompt',
      cardCompletionFullText:'',cardCompletionBlankText:'',setHelpAudioReadyKey(){},helpCardKey:'5.5:R4',
    });
    mount();assert.equal(typeof pending,'function');pending();
    assert.equal(spoken.text,currentCard.audio_text);assert.equal(image,null);
    spoken.options.onAudioCompleted();assert.equal(image,shared.replyImageAfterPrompt(currentCard));
  }
});

test('both clients keep answers blocked until the response image loads for this exact card and replay', () => {
  const replyImage = shared.replyImageAfterPrompt(cards[0]);
  for (const file of [nativeFile,webFile]) {
    let loadedPromptImageKey = null;
    const promptImageLoadKeyRef = {current:'card-1:replay-1:response'};
    const loader = key => callback(file,'onPromptImageReady',null,{
      promptImageLoadKey:key,promptImageLoadKeyRef,
      setLoadedPromptImageKey:key=>{loadedPromptImageKey=key;},
    });
    const pending = (active=replyImage) => value(file,'replyScenePending',{
      replyImage,activeTurnImageUrl:active,playingTurnImageUrl:active,
      promptImageLoadKey:promptImageLoadKeyRef.current,loadedPromptImageKey,
    });
    const firstFrame = loader('card-1:replay-1:first');
    const response = loader(promptImageLoadKeyRef.current);
    assert.equal(pending(),true,'A URL update is not a loaded image.');
    firstFrame();assert.equal(pending(),true,'The initiating image cannot unlock reply choices.');
    response();assert.equal(pending(),false);
    assert.equal(pending(cards[0].prompt_image_url),true,'Replay must return to the initiating image.');
    promptImageLoadKeyRef.current='card-1:replay-2:response';
    assert.equal(pending(),true,'A replay needs its own loaded response.');
    response();assert.equal(pending(),true,'A late load from the previous attempt cannot unlock replay.');
    loader(promptImageLoadKeyRef.current)();assert.equal(pending(),false);
    promptImageLoadKeyRef.current='card-2:replay-2:response';
    response();assert.equal(pending(),true,'Navigation invalidates old loaded-image callbacks.');
  }
});

test('native never reveals a response from an unstarted or cancelled prompt request', () => {
  for (const state of ['unstarted','cancelled','completed']) {
    let image=null;
    const context={currentCard:cards[0],replyImageAfterPrompt:shared.replyImageAfterPrompt,
      courseAudioPlaybackStatus:{playing:false,didJustFinish:true,error:null},
      promptAutoplayAwaitingRef:{current:true},promptAutoplayWasPlayingRef:{current:true},
      promptAutoplayFallbackTimerRef:{current:null},clearTimeout(){},setPromptAutoplayFinished(){},
      audioPlaybackRequestRef:{current:3},
      audioPlaybackStartedRequestRef:{current:state==='completed'?3:state==='cancelled'?2:null},
      setActiveTurnImageUrl:value=>{image=value;}};
    callback(nativeFile,null,'const replyImage = replyImageAfterPrompt(currentCard)',context)();
    assert.equal(image,state==='completed'?shared.replyImageAfterPrompt(cards[0]):null);
  }
});

test('native late healthy completion can still reveal the response after the recovery timeout', () => {
  let fallback, image=null;
  const currentCard=cards[0];
  const context={currentCard,replyImageAfterPrompt:shared.replyImageAfterPrompt,
    isAppActive:true,isCompletedSectionPicker:false,isPageTurning:false,sectionBriefing:null,
    isPronunciation:false,cardAudio:{ready:true},result:null,missionExperience:false,
    promptAudio:currentCard.audio_text,promptHasVisualBlank:false,completionPromptSource:null,promptTurnSequence:null,
    promptAutoplayAwaitingRef:{current:false},promptAutoplayWasPlayingRef:{current:false},
    promptAutoplayFallbackTimerRef:{current:null},COURSE_AUDIO_FALLBACK_MS:15000,
    setPromptAutoplayFinished(){},setReplyImageAttempt(){},setActiveTurnImageUrl:v=>{image=v;},
    setTimeout(fn,ms){if(ms===15000)fallback=fn;return 1;},clearTimeout(){}};
  callback(nativeFile,null,'promptAutoplayFallbackTimerRef.current = setTimeout',context)();
  assert.equal(typeof fallback,'function');fallback();
  assert.equal(context.promptAutoplayAwaitingRef.current,true);
  assert.equal(image,null,'Recovery timeout cannot reveal the response.');
  const status={playing:true,didJustFinish:false,error:null};
  const observe=callback(nativeFile,null,'const replyImage = replyImageAfterPrompt(currentCard)',{
    ...context,courseAudioPlaybackStatus:status,audioPlaybackRequestRef:{current:2},
    audioPlaybackStartedRequestRef:{current:2},
  });
  observe();status.playing=false;status.didJustFinish=true;observe();
  assert.equal(image,shared.replyImageAfterPrompt(currentCard),'Actual completion still reveals the late response.');
});

test('the native and web prompt images connect their keyed load event to reply readiness', () => {
  const element=(type,props,...children)=>({type,props:{...props,children}});
  function renderExpression(file, select, context) {
    const source=fs.readFileSync(path.join(root,file),'utf8');
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let expression;
    function visit(node){if(select(node,ast))expression=node;ts.forEachChild(node,visit);}
    visit(ast);assert.ok(expression,file);
    const exports={};
    vm.runInNewContext(ts.transpileModule('exports.tree = '+expression.getText(ast),{
      compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020},
    }).outputText,{exports,React:{createElement:element},...context});
    return exports.tree;
  }
  let nativeLoaded=0,webLoaded=0;
  const common={replyImage:'reply.webp',promptImageLoadKey:'card:attempt:reply.webp',
    currentCard:cards[0],activeTurnImageUrl:'reply.webp',result:null};
  const native=renderExpression('mobile/src/components/LessonCardView.tsx',
    (n,a)=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(a)==='OptionMediaImage'
      &&n.getText(a).includes('promptImageLoadKey'),{
        ...common,OptionMediaImage:'OptionMediaImage',card:cards[0],isWrittenRecognize:()=>false,
        onPromptImageReady:()=>nativeLoaded++,
      });
  assert.equal(native.props.key,common.promptImageLoadKey);
  assert.equal(native.props.imageUrl,'reply.webp');native.props.onLoad();assert.equal(nativeLoaded,1);
  const web=renderExpression(webFile,(n,a)=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(a)==='img'
    &&n.getText(a).includes('promptImageLoadKey'),{
      ...common,lessonOptionImageSrc:x=>x,isMissionExperience:false,cardIndex:0,
      fitWrittenRecognition:false,isLockedMissionFinale:false,writtenMediaHeight:null,
      onPromptImageReady:()=>webLoaded++,
    });
  assert.equal(web.props.key,common.promptImageLoadKey);
  assert.equal(web.props.src,'reply.webp');web.props.onLoad();assert.equal(webLoaded,1);
});

test('web confirmed-completion callback is never fired for failed or cancelled audio', async () => {
  for (const outcome of ['finished','failed','cancelled']) {
    let completed=0; const sequence={current:0};
    const speak=callback(webFile,'speakText',null,{
      window:{}, hasVisualAudioPlaceholder:()=>false, sanitizeCourseAudioText:t=>t,
      speechSequenceRef:sequence, clearSpeechTimers(){}, stopAudioPlayback(){},
      getCourseAudioUrl:()=>'/immutable.mp3', console:{info(){}},
      playAudioUrl:()=>outcome==='failed' ? Promise.reject(Error('unavailable')) : Promise.resolve(),
    });
    speak('I do not like milk.',{audioAssetId:'bound-prompt',onAudioCompleted:()=>completed++,onEnd(){}});
    if(outcome==='cancelled')sequence.current++;
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(completed,outcome==='finished'?1:0);
  }
});
