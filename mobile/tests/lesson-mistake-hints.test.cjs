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
