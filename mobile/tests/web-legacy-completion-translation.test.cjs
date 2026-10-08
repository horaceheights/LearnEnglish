const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const file = 'frontend/components/LessonPlayer.js';
const source = fs.readFileSync(path.join(root,file),'utf8');
const ast = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
const course = JSON.parse(fs.readFileSync(path.join(root,'mobile/src/generated/a1-course.json'),'utf8'));
const legacy = course.flatMap(lesson=>lesson.cards.filter(card=>card.stage==='Use' && card.interaction_type==='complete').map(card=>({lesson,card})));
const element=(type,props,...children)=>({type,props:{...props,children}});
function evaluate(node,context={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule('exports.value = '+node.getText(ast),{
    compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020},
  }).outputText,{exports,React:{createElement:element},...context});
  return exports.value;
}
function find(predicate) {
  let found;function visit(node){if(predicate(node))found=node;ts.forEachChild(node,visit);}
  visit(ast);assert.ok(found);return found;
}
const manualFlag=find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='manualCompletionTranslation').initializer;
const headerBranch=find(n=>ts.isConditionalExpression(n)&&n.condition.getText(ast)==='learnTranslation.enabled || manualCompletionTranslation');
function nodes(node,type) {
  if(!node||typeof node!=='object')return [];
  return [...(node.type===type?[node]:[]),...(node.props?.children||[]).flatMap(child=>nodes(child,type))];
}
function renderHeader(lesson,card,visible,onTranslate,onReplay) {
  return evaluate(headerBranch.whenTrue,{
    currentCard:card,activeLesson:lesson,learnTranslation:{enabled:false},
    teachingTranslationVisible:visible,manualCompletionTranslation:true,
    lessonLocationLabel:()=>lesson.sub_lesson_id,lessonStageLabel:()=> 'COMPLETA',
    titleStyle:{},renderHighlightedTitle:text=>text,cardReplayText:card.audio_text,
    openTeachingTranslation:onTranslate,playCurrentCardPrompt:onReplay,
  });
}

test('all four legacy Use cards select the existing translation header without changing construction cards',()=>{
  assert.deepEqual(legacy.map(({lesson,card})=>[lesson.id,card.slide_id]),[
    ['lesson-4-what-time-is-it','DU1'],['lesson-4-what-time-is-it','DU2'],
    ['lesson-4-what-time-is-it','DU3'],['lesson-4-what-time-is-it','DU4'],
  ]);
  for(const {card} of legacy) {
    assert.equal(evaluate(manualFlag,{currentCard:card,isSentenceCard:false}),true);
    assert.equal(evaluate(headerBranch.condition,{learnTranslation:{enabled:false},manualCompletionTranslation:true}),true);
    assert.match(card.prompt,/___/);assert.ok(card.spanish_translation);
  }
  assert.equal(evaluate(manualFlag,{currentCard:{stage:'Use'},isSentenceCard:true}),false);
  assert.equal(evaluate(manualFlag,{currentCard:{stage:'Recognize'},isSentenceCard:false}),false);
});

test('unfinished legacy sentences translate only on text tap, with independent English replay',()=>{
  for(const {lesson,card} of legacy) {
    let visible=false,replays=0;
    const translate=()=>{visible=true;};
    const replay=()=>{replays++;};
    const before=renderHeader(lesson,card,visible,translate,replay);
    assert.equal(nodes(before,'span').length,0,'No upfront Spanish or separate translation line.');
    const [textButton,speakerButton]=nodes(before,'button');
    assert.equal(textButton.props.onClick,translate);
    assert.equal(speakerButton.props.onClick,replay);
    speakerButton.props.onClick();
    assert.equal(visible,false);assert.equal(replays,1);
    textButton.props.onClick();
    const after=renderHeader(lesson,card,visible,translate,replay);
    const spanish=nodes(after,'span');
    assert.equal(spanish.length,1);
    assert.equal(spanish[0].props.children[0],card.spanish_translation);
    assert.equal(spanish[0].props['aria-hidden'],false);
    assert.equal(spanish[0].props['aria-live'],'polite');
    assert.equal(nodes(nodes(after,'button')[0],'span').length,1,'Spanish stays on the tapped sentence button.');
    assert.equal(replays,1,'Translation cannot trigger audio or selection.');
  }
});

test('the reused manual header translation expires after three seconds and repeated taps replace the timer',()=>{
  const open=find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='openTeachingTranslation').initializer;
  const timer={current:null},timers=new Map();let next=0,visibleKey='';
  const action=evaluate(open,{
    teachingTranslationTimer:timer,teachingCardKey:'lesson:DU1',
    setManualTeachingTranslationKey:key=>{visibleKey=key;},
    clearTimeout:id=>timers.delete(id),
    setTimeout:(callback,delay)=>{assert.equal(delay,3000);timers.set(++next,callback);return next;},
  });
  action();assert.equal(visibleKey,'lesson:DU1');assert.equal(timers.size,1);
  action();assert.equal(timers.size,1);
  timers.values().next().value();assert.equal(visibleKey,'');
});
