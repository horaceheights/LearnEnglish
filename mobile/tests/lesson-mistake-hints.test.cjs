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
  /quién aparece y qué está haciendo/,
  'Non-grammar choices should receive a short visual-action hint.',
);

console.log('Lesson mistake hint checks passed.');
