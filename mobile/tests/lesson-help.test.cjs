const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lessonHelpText, COMPLETION_RETRY_HELP } = require(process.argv[2]);

function card(overrides = {}) {
  return {
    prompt: 'The boy', stage: 'Recognize', correct_option_id: 'a',
    options: [
      { id: 'a', image_url: '/boy.png', label: 'the boy' },
      { id: 'b', image_url: '/girl.png', label: 'the girl' },
    ],
    audio_text: 'The boy', answer_audio_text: null, prompt_image_url: '',
    ...overrides,
  };
}
const textOptions = (...labels) => labels.map((label, index) => ({ id: String(index), label, image_url: '' }));
const imageToText = card({ prompt: '', audio_text: null, prompt_image_url: '/boy-eating.png',
  options: textOptions('The boy is eating.', 'The boy is sleeping.') });
const modes = ['gestures', 'translation-on-tap', 'visual-instruction', 'replay-on-tap'];

// The approved screenshot example stays equally short on both clients,
// regardless of their different prompt-control modes.
for (const mode of modes) {
  assert.equal(lessonHelpText(imageToText, mode), 'Mira la imagen y toca la frase que la describe.');
  assert.doesNotMatch(lessonHelpText(imageToText, mode), /repetir|bocina|sonido|traducción/);
}
assert.match(lessonHelpText({ ...imageToText, options: textOptions('Boy', 'Girl') }), /toca la palabra que la describe/);
assert.match(lessonHelpText({ ...imageToText, options: textOptions('Who is he?', 'Who is she?') }), /toca la pregunta que corresponde/);
assert.match(lessonHelpText(card()), /Lee y escucha.+Toca la imagen que corresponde/);

// Listening alone needs a compact replay reminder; name the actual control.
assert.equal(lessonHelpText(card({ stage: 'Listen' }), 'visual-instruction'),
  'Escucha y elige la imagen correcta. Toca la bocina para repetir.');
for (const mode of ['gestures', 'replay-on-tap']) {
  assert.match(lessonHelpText(card({ stage: 'Listen' }), mode), /Toca la frase para repetir/);
}
assert.match(lessonHelpText(card({ stage: 'Listen', options: textOptions('Reading', 'Writing') })), /elige la palabra correcta/);
assert.match(lessonHelpText(card({ stage: 'Listen', options: textOptions('He is reading.', 'He is writing.') })), /elige la frase correcta/);
assert.doesNotMatch(lessonHelpText(card({ stage: 'Listen', audio_text: null })), /repetir|bocina/);
assert.match(lessonHelpText(card({ stage: 'Listen', audio_text: null, audio_turns: [{ text: 'Hello.' }] })), /repetir/);

assert.match(lessonHelpText(card({ stage: 'Grammar', prompt: 'The boy __ eating.',
  prompt_image_url: '/boy-eating.png', options: textOptions('is', 'are') })), /Mira la imagen.+palabra que falta/);
assert.match(lessonHelpText(card({ stage: 'Speak', options: [card().options[0]] })), /Escucha.+después de la señal.+repite en voz alta/);
assert.match(lessonHelpText(card({ stage: 'Learn', options: [card().options[0]] })), /Mira y escucha.+avanza sola/);
assert.match(lessonHelpText(card({ stage: 'Action Introduction' })), /toca la imagen de esa acción/);
assert.match(lessonHelpText(card({ stage: 'Plural Challenge' })), /Lee la frase.+imagen que corresponde/);
assert.match(lessonHelpText(card({ stage: 'Future Image Stage' })), /Toca la imagen que corresponde/);
assert.match(lessonHelpText(card({ stage: 'Future Text Stage', options: textOptions('one', 'two') })), /toca la respuesta correcta/);
assert.equal(COMPLETION_RETRY_HELP, 'Lee la explicación y toca Reintentar.');

// Guard the compact standard against future per-stage boilerplate. Exercise
// the actual generated course, including the screenshot's image-to-text cards.
const generated = path.join(__dirname, '../src/generated');
let checked = 0;
for (const file of fs.readdirSync(generated).filter(name => /^lesson-.*\.json$/.test(name))) {
  const lesson = JSON.parse(fs.readFileSync(path.join(generated, file), 'utf8'));
  for (const current of lesson.cards.filter(card => !card.mission_game)) {
    for (const mode of modes) {
      const help = lessonHelpText(current, mode);
      const context = `${file}/${current.slide_id}/${mode}: ${help}`;
      assert.ok(help.split(/\s+/).length <= 25, context);
      assert.ok(help.split(/[.!?]+/).filter(part => part.trim()).length <= 2, context);
      assert.doesNotMatch(help, /Recuerda:|solo visual|cuando esté disponible|grabará|calificará/, context);
      if (!['Listen', 'Listen To Picture'].includes(current.stage)) {
        assert.doesNotMatch(help, /para repetir|bocina|botón de sonido/, context);
      }
      checked++;
    }
  }
}
assert.ok(checked > 1000, 'The course-wide copy guard must inspect the real course.');
console.log(`Compact contextual help checks passed (${checked} course/control combinations).`);
