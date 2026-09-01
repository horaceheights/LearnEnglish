const assert = require('node:assert/strict');

const { lessonHelpText } = require(process.argv[2]);

function card(overrides = {}) {
  return {
    prompt: 'The boy',
    stage: 'Recognize',
    correct_option_id: 'a',
    options: [
      { id: 'a', image_url: '/boy.png', label: 'the boy' },
      { id: 'b', image_url: '/girl.png', label: 'the girl' },
    ],
    audio_text: 'The boy',
    answer_audio_text: null,
    prompt_image_url: '',
    ...overrides,
  };
}

assert.match(
  lessonHelpText(card()),
  /Lee y escucha.+Toca la imagen.+significado/,
  'Recognize phrase-to-image cards must describe both steps.',
);

assert.match(
  lessonHelpText(card({
    options: [
      { id: 'a', image_url: '', label: 'The boy is eating.' },
      { id: 'b', image_url: '', label: 'The boy is sleeping.' },
    ],
    prompt: '',
    prompt_image_url: '/boy-eating.png',
  })),
  /Mira la imagen.+Toca la frase.+describe/,
  'Recognize image-to-text cards must not use the phrase-to-image instruction.',
);

assert.match(
  lessonHelpText(card({ stage: 'Listen' })),
  /Escucha la frase completa.+toca la imagen.+botón de sonido/,
  'Listen help must explain selection and replay.',
);

assert.match(
  lessonHelpText(card({
    stage: 'Grammar',
    prompt: 'The boy __ eating.',
    options: [
      { id: 'a', image_url: '', label: 'is' },
      { id: 'b', image_url: '', label: 'are' },
    ],
    prompt_image_url: '/boy-eating.png',
  })),
  /Mira la imagen.+completa correctamente el espacio/,
  'Grammar help must explain how to complete the blank.',
);

assert.match(
  lessonHelpText(card({ stage: 'Speak', options: [card().options[0]] })),
  /Escucha el ejemplo.+Después de la señal.+grabará.+calificará/,
  'Pronunciation help must explain the full recording sequence.',
);

assert.match(
  lessonHelpText(card({ stage: 'Learn', options: [card().options[0]] })),
  /observa la imagen.+avanzará sola/,
  'Automatic teaching cards must not tell the learner to select their only option.',
);

assert.match(
  lessonHelpText(card({ stage: 'Action Introduction' })),
  /acción.+imagen que muestra esa acción/,
  'Action cards must name the action-matching task.',
);

assert.match(
  lessonHelpText(card({ stage: 'Plural Challenge' })),
  /oración completa.+muestra esa situación/,
  'Plural sentence cards must explain sentence-to-scene matching.',
);

assert.match(
  lessonHelpText(card({ stage: 'Future Image Stage' })),
  /frase de arriba.+toca la imagen/,
  'Unknown image-choice stages must receive a structure-aware fallback.',
);

assert.match(
  lessonHelpText(card({
    stage: 'Future Text Stage',
    options: [
      { id: 'a', image_url: '', label: 'one' },
      { id: 'b', image_url: '', label: 'two' },
    ],
  })),
  /Lee la indicación.+Toca la palabra o frase/,
  'Unknown text-choice stages must receive a structure-aware fallback.',
);

assert.match(
  lessonHelpText(card()),
  /Recuerda: toca la frase una vez para repetirla y dos veces para ver su traducción\.$/,
  'Every help response must remind learners about the one-tap replay and two-tap translation gestures.',
);

assert.match(
  lessonHelpText(card(), 'translation-on-tap'),
  /Recuerda: toca la frase para ver su traducción y el botón de sonido para escucharla otra vez\.$/,
  'Dedicated replay controls must replace the legacy gesture reminder.',
);

assert.match(
  lessonHelpText(card({ prompt: '' }), 'visual-instruction'),
  /la instrucción en español es solo visual.+botón de sonido.+frase en inglés cuando esté disponible\.$/,
  'Visual Spanish instructions must never be described as spoken prompt audio.',
);

console.log('Lesson help instruction checks passed.');
