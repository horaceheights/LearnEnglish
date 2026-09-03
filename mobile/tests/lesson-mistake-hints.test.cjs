const assert = require('node:assert/strict');

const { lessonMistakeHint } = require(process.argv[2]);

function card(target, correctLabel, wrongLabel = 'wrong') {
  return {
    prompt: target,
    stage: 'Use',
    correct_option_id: 'correct',
    options: [
      { id: 'correct', image_url: '', label: correctLabel },
      { id: 'wrong', image_url: '', label: wrongLabel },
    ],
    audio_text: target,
    answer_audio_text: null,
    prompt_image_url: '',
  };
}

assert.match(
  lessonMistakeHint(card('The girl is reading.', 'is'), 'wrong'),
  /la niña.+singular.+“is”/,
  'A singular girl sentence should explain why it uses is.',
);

assert.match(
  lessonMistakeHint(card('The children are playing.', 'are'), 'wrong'),
  /los niños.+plural.+“are”/,
  'A plural children sentence should explain why it uses are.',
);

assert.match(
  lessonMistakeHint(card('Who are they?', 'are'), 'wrong'),
  /ellos o ellas.+plural.+“are”/,
  'A question with they should still explain the plural subject.',
);

assert.match(
  lessonMistakeHint(card('They are not sitting.', 'not'), 'wrong'),
  /“Not”.+no está ocurriendo/,
  'A negative sentence should explain what not communicates.',
);

assert.match(
  lessonMistakeHint(card('Running', 'Running', 'Walking'), 'wrong'),
  /running.+corriendo.+walking.+caminando/,
  'Action choices must teach the actual vocabulary contrast.',
);

const identityCard = {
  prompt: 'Who are they?',
  stage: 'Recognize',
  correct_option_id: 'parents',
  options: [
    { id: 'parents', image_url: '', label: 'They are the parents.' },
    { id: 'grandparents', image_url: '', label: 'They are the grandparents.' },
  ],
  audio_text: 'Who are they?',
  answer_audio_text: 'They are the parents.',
  prompt_image_url: '/lesson-assets/family_parents.webp',
};

assert.equal(
  lessonMistakeHint(identityCard, 'grandparents'),
  'La imagen muestra a los padres, no a los abuelos.',
  'Identity choices should explain the exact family-member mismatch.',
);

assert.equal(
  lessonMistakeHint({
    ...identityCard,
    prompt: 'Who is she? She is the mother.',
    correct_option_id: 'mother',
    options: [
      { id: 'mother', image_url: '/lesson-assets/family_mother.webp', label: 'She is the mother.' },
      { id: 'grandmother', image_url: '/lesson-assets/family_grandmother.webp', label: 'She is the grandmother.' },
    ],
    audio_text: 'Who is she? She is the mother.',
    answer_audio_text: '',
    prompt_image_url: '',
  }, 'grandmother'),
  'La imagen muestra a la madre, no a la abuela.',
  'Audio-to-image identity choices should explain the exact mismatch too.',
);

console.log('Lesson mistake hint checks passed.');

const fs = require('node:fs');
const path = require('node:path');
assert.match(lessonMistakeHint(card('___ adult.', 'An', 'A'), 'wrong'), /an.+adult.+sonido de vocal/);
assert.match(lessonMistakeHint(card('___ university.', 'A', 'An'), 'wrong'), /a.+university.+sonido de consonante/);
assert.match(lessonMistakeHint(card('___ hour.', 'An', 'A'), 'wrong'), /an.+hour.+sonido de vocal/);
assert.match(lessonMistakeHint({...card('What ___ it?', 'is', 'are'), answer_audio_text: 'What is it?'}, 'wrong'), /it.+singular/);
assert.match(lessonMistakeHint({...card('Where ___ you from?', 'are', 'is'), answer_audio_text: 'Where are you from?'}, 'wrong'), /you.+una sola persona/);
assert.match(lessonMistakeHint({...card('There [blank] two chairs.', 'are', 'is'), answer_audio_text: 'There are two chairs.'}, 'wrong'), /hay.+varias cosas/);
assert.match(lessonMistakeHint(card('The girl is reading.', 'The girl is reading.', 'The girl is writing.'), 'wrong'), /reading.+leyendo.+writing.+escribiendo/);
assert.doesNotMatch(lessonMistakeHint(card('The girl is reading.', 'The girl is reading.', 'The girl is writing.'), 'wrong'), /singular/);
const multi = {...card('She is the ___. They are the ___.', 'grandmother', 'grandfather'),
  correct_option_ids: ['correct', 'plural'],
  options: [...card('', 'grandmother', 'grandfather').options, {id: 'plural', label: 'grandparents', image_url: ''}],
  answer_audio_text: 'She is the grandmother. They are the grandparents.'};
assert.match(lessonMistakeHint(multi, ['wrong', 'plural']), /grandmother.+abuela.+grandfather.+abuelo/);
assert.match(lessonMistakeHint(multi, ['correct', 'wrong']), /grandparents.+abuelos/);
// Exercise every distractor and every ordered completion slot in the full course.
const generated = path.join(__dirname, '../src/generated');
let checked = 0;
const files = fs.readdirSync(generated).filter(name => /^lesson-.*\.json$/.test(name));
assert.equal(files.length, 70);
for (const file of files) {
  const lesson = JSON.parse(fs.readFileSync(path.join(generated, file), 'utf8'));
  for (const c of lesson.cards) {
    if (c.options.length < 2) continue;
    const correctIds = c.correct_option_ids?.length ? c.correct_option_ids : [c.correct_option_id];
    for (let slot = 0; slot < correctIds.length; slot++) for (const wrong of c.options) {
      if (wrong.id === correctIds[slot]) continue;
      const attempt = [...correctIds]; attempt[slot] = wrong.id;
      const hint = lessonMistakeHint(c, attempt);
      const context = `${file}/${c.slide_id}/${slot}/${wrong.id}: ${hint}`;
      assert.doesNotMatch(hint, /Mira de nuevo|Observa otra vez|Traducción no disponible|undefined|\[(?:blank|pausa)\]|_{2,}|: \.$/, context);
      assert.match(hint, /significa|porque|usamos|reemplaza|indica|se refiere|primero|orden|va |van |antes|después|no está|muestra|La respuesta|corresponde|incluye|forma|con “|Con “|La edad|habla|pregunta/i, context);
      assert.ok(hint.length <= 230, context);
      checked++;
    }
  }
}
const webSource = fs.readFileSync(path.join(__dirname, '../../frontend/components/LessonPlayer.js'), 'utf8');
assert.match(webSource, /import \{ lessonMistakeHint as getLessonMistakeHint \} from "..\/..\/mobile\/src\/lessonMistakeHints"/);
assert.match(webSource, /selectedOptionIds.length \? selectedOptionIds : selectedOptionId/);
console.log(`Checked ${checked} wrong attempts across ${files.length} lessons using the shared web/mobile resolver.`);

assert.match(lessonMistakeHint({...card('I do [blank] like milk.', 'not', 'am'), answer_audio_text: 'I do not like milk.'}, 'wrong'), /entre “do” y “like”/);
assert.match(lessonMistakeHint({...card('I study English ___ Monday.', 'on', 'in'), answer_audio_text: 'I study English on Monday.'}, 'wrong'), /días de la semana/);
assert.match(lessonMistakeHint({...card('I wake up ___ the morning.', 'in', 'on'), answer_audio_text: 'I wake up in the morning.'}, 'wrong'), /partes del día/);
assert.match(lessonMistakeHint({...card('It is an [blank].', 'apple', 'egg'), spanish_translation: 'Es una [pausa].', answer_audio_text: 'It is an apple.'}, 'wrong'), /apple.+manzana.+egg.+huevo/);
