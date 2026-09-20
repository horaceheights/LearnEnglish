import assert from 'node:assert/strict';
import test from 'node:test';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';

const noop = () => {};
function renderResult(width, height, score, extra = {}) {
  const h = lessonHarness({width,height,fontScale:extra.fontScale || 1}, {sourceTransform: (file, source) => {
    if (!file.endsWith('LessonResultScreen.tsx')) return source;
    // Inert audio, and measure ScrollView's content using its production style.
    return source.replace("import { useMissionSoundEffects } from '../missionSoundEffects';", 'const useMissionSoundEffects = () => ({playMissionSound: () => {},stopMissionSound: () => {}});')
      .replaceAll('Animated.Image', 'View')
      .replaceAll('<ScrollView', '<View').replaceAll('</ScrollView>', '</View>')
      .replace('style={styles.page} contentContainerStyle={styles.pageContent}', 'style={[styles.page, styles.pageContent]}');
  }});
  const { LessonResultScreen } = h.load('components/LessonResultScreen.tsx');
  return h.render(() => e(LessonResultScreen, {result:{id:'r',userId:'u',lessonId:'l',totalCards:10,initialScore:score,
    missedCards:Array.from({length:10-score},(_,i)=>score+i),ungradedCards:[],recoveredCards:[],completedAt:'2026-09-20T10:00:00Z'},
    lessonLabel:'UNIT 1 | LESSON 1.10',hasNext:true,width,height,active:true,celebrate:false,saving:false,error:'',
    onNext:noop,onLessons:noop,onRestart:noop,onReview:noop,onExit:noop,onRetrySave:noop,...extra}), width,height);
}

for (const [width,height] of [[390,844],[320,640],[844,390],[1024,768]]) {
  for (const score of [7,8,10]) test(`native result ${score*10}% at ${width}x${height} has reachable actions and unclipped text`, () => {
    const records=renderResult(width,height,score);
    assert.ok(records.some(r=>r.text===`${score*10}%`));
    for (const r of records) {
      assert.ok(r.box.left>=-1 && r.box.left+r.box.width<=width+1, `horizontal overflow: ${r.text || r.type}`);
      if (r.type==='Text') assert.ok(r.textHeight<=r.box.height+1.5, `clipped ${r.text}`);
      if (r.type==='Pressable') assert.ok(r.box.height>=48 && r.box.width>=48, `small action ${r.props.accessibilityLabel}`);
    }
    const labels=records.filter(r=>r.type==='Pressable').map(r=>r.props.accessibilityLabel);
    assert.equal(labels.includes('Continuar'),score>=8);
    assert.equal(labels.includes('Repasar solo los errores. Recomendado'),score<8);
  });
}
test('a storage failure disables leaving and presents a save retry',()=>{
  const records=renderResult(390,844,8,{error:'Sin espacio'});
  const actions=records.filter(r=>r.type==='Pressable');
  assert.ok(actions.slice(0,-1).every(r=>r.props.disabled));
  assert.equal(actions.at(-1).props.disabled,false);
  assert.ok(records.some(r=>r.text==='Guardar de nuevo'));
});
