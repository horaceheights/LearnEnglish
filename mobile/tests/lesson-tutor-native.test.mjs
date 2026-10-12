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
    for(const label of ['Cerrar tutor y volver a la lección','Grabar pregunta','Enviar pregunta']) {
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
