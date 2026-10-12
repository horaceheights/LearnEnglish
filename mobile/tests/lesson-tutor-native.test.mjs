import assert from 'node:assert/strict';
import test from 'node:test';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';
const noop = () => {};
for (const viewport of [{width:390,height:844,fontScale:1},{width:360,height:640,fontScale:1.6},
  {width:740,height:360,fontScale:1},{width:844,height:390,fontScale:1.6}]) {
  test(`tutor composer and close remain usable at ${JSON.stringify(viewport)}`, () => {
    const h = lessonHarness(viewport, {insets:{top:24,bottom:24,left:0,right:0}});
    const {LessonTutorSheet} = h.load('components/LessonTutorSheet.tsx');
    const records=h.render(()=>e(LessonTutorSheet,{context:{lesson_id:'lesson-1-people-actions',slide_id:'R1',content_revision:3,selected_option_ids:[]},
      title:'Lección 1.1 · Reconoce',answer:'',active:true,
      tutor:{visible:true,messages:[],busy:false,error:'',close:noop,retry:noop,send:noop}}),viewport.width,viewport.height);
    for(const label of ['Cerrar tutor y volver a la lección','Grabar pregunta','Enviar pregunta','Respuestas con voz']) {
      const control=records.find(r=>r.props.accessibilityLabel===label);
      assert.ok(control, label);
      const b=control.box;
      assert.ok(b.width>=48 && b.height>=48,label+' must remain a 48-point target');
      assert.ok(b.left>=0 && b.left+b.width<=viewport.width+1,label+' horizontal clipping');
      assert.ok(b.top>=24 && b.top+b.height<=viewport.height-24+1,label+' safe-area clipping');
    }
    const scroll=records.find(r=>r.type==='ScrollView');
    assert.ok(scroll.box.height>=60,'Conversation must retain visible space');
  });
}

test('floating tutor is draggable without opening, remains reachable after resize, and has a non-drag path', () => {
  const viewport = { width: 390, height: 500, fontScale: 1 };
  const h = lessonHarness(viewport);
  const { FloatingTutorButton } = h.load('components/FloatingTutorButton.tsx');
  let opens = 0;
  const draw = (width, height, preserve = true) => h.render(() => e(FloatingTutorButton, { visible: true, onPress: () => opens++ }), width, height, preserve);
  let records = draw(390, 500, false);
  let control = records.find(r => r.props.accessibilityLabel === 'Abrir tutor IA');
  assert.ok(control.box.left > 300 && control.box.top < 50, 'Starts at the upper right of the answer area.');
  control.props.onPressIn();
  const gesture = records.find(r => r.props.onMoveShouldSetPanResponder);
  assert.equal(gesture.props.onMoveShouldSetPanResponder(null, { dx: 3, dy: 2 }), false);
  assert.equal(gesture.props.onMoveShouldSetPanResponder(null, { dx: -80, dy: 120 }), true);
  gesture.props.onPanResponderGrant();
  gesture.props.onPanResponderMove(null, { dx: -80, dy: 120 });
  gesture.props.onPanResponderRelease();
  control.props.onPress();
  assert.equal(opens, 0, 'Dragging never opens the tutor.');
  records = draw(390, 500);
  control = records.find(r => r.props.accessibilityLabel === 'Abrir tutor IA');
  assert.ok(control.box.left < 300 && control.box.top > 100);
  control.props.onPressIn(); control.props.onPress(); assert.equal(opens, 1);
  records = draw(220, 110);
  control = records.find(r => r.props.accessibilityLabel === 'Abrir tutor IA');
  assert.ok(control.box.left >= 0 && control.box.left + 48 <= 220);
  assert.ok(control.box.top >= 0 && control.box.top + 48 <= 110);
  control.props.onAccessibilityAction({ nativeEvent: { actionName: 'reset' } });
  records = draw(220, 110);
  control = records.find(r => r.props.accessibilityLabel === 'Abrir tutor IA');
  assert.ok(control.box.left > 150 && control.box.top < 40);
});
