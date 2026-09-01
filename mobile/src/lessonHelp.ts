import type { LessonCard } from './types';

const PRONUNCIATION_STAGES = new Set([
  'Pronunciation',
  'Pronunciation Practice',
  'Speak',
]);

const LISTENING_STAGES = new Set([
  'Listen',
  'Listen To Picture',
]);

const GRAMMAR_STAGES = new Set([
  'Grammar',
  'New Grammar',
  'Use',
]);

const IMAGE_TO_TEXT_STAGES = new Set([
  'Picture To Text',
  'What Is It?',
]);

const VOCABULARY_STAGES = new Set([
  'Learn',
  'New Vocab',
  'New Words',
]);

const PROMPT_GESTURE_REMINDER = 'Recuerda: toca la frase una vez para repetirla y dos veces para ver su traducción.';
const DEDICATED_REPLAY_REMINDER = 'Recuerda: toca la frase para ver su traducción y el botón de sonido para escucharla otra vez.';
const VISUAL_INSTRUCTION_REMINDER = 'Recuerda: la instrucción en español es solo visual. Usa el botón de sonido para escuchar la frase en inglés cuando esté disponible.';

export type PromptInteractionMode = 'gestures' | 'translation-on-tap' | 'visual-instruction';

function hasOnlyTextOptions(card: LessonCard) {
  return card.options.length > 0 && card.options.every((option) => !option.image_url);
}

function hasImageOptions(card: LessonCard) {
  return card.options.some((option) => Boolean(option.image_url));
}

/**
 * Gives the learner the exact action required by the current card without
 * revealing its answer. Card structure is used as a fallback for new stages.
 */
function cardHelpInstruction(card: LessonCard) {
  if (PRONUNCIATION_STAGES.has(card.stage)) {
    return 'Escucha el ejemplo. Después de la señal, repite la frase en voz alta; la app grabará y calificará tu pronunciación.';
  }

  if (card.options.length === 1) {
    return 'Escucha la palabra o frase y observa la imagen. La tarjeta avanzará sola cuando termine el audio.';
  }

  if (LISTENING_STAGES.has(card.stage)) {
    return hasImageOptions(card)
      ? 'Escucha la frase completa. Después, toca la imagen que representa lo que escuchaste. Usa el botón de sonido para oírla otra vez.'
      : 'Escucha la frase completa. Después, toca la palabra o frase que corresponde. Usa el botón de sonido para oírla otra vez.';
  }

  if (GRAMMAR_STAGES.has(card.stage) || card.prompt.includes('__')) {
    return card.prompt_image_url
      ? 'Mira la imagen y lee la oración. Toca la palabra que completa correctamente el espacio.'
      : 'Lee la oración completa. Toca la palabra que completa correctamente el espacio.';
  }

  if (hasOnlyTextOptions(card)) {
    if (card.prompt_image_url || IMAGE_TO_TEXT_STAGES.has(card.stage)) {
      return 'Mira la imagen y lee todas las opciones. Toca la frase que describe correctamente la imagen.';
    }
    return 'Lee la indicación y todas las opciones. Toca la palabra o frase que responde correctamente.';
  }

  if (card.stage === 'Recognize') {
    return 'Lee y escucha la palabra o frase de arriba. Toca la imagen que coincide con su significado.';
  }

  if (card.stage === 'Action Introduction' || card.stage === 'Family Action Practice') {
    return 'Lee y escucha la acción de arriba. Toca la imagen que muestra esa acción.';
  }

  if (VOCABULARY_STAGES.has(card.stage)) {
    return 'Lee y escucha la palabra o frase nueva. Toca la imagen que corresponde.';
  }

  if (card.stage === 'Plural Challenge' || card.stage === 'Family Sentences') {
    return 'Lee y escucha la oración completa. Toca la imagen que muestra esa situación.';
  }

  if (hasImageOptions(card)) {
    return 'Lee y escucha la frase de arriba. Después, toca la imagen que corresponde.';
  }

  return 'Lee la indicación y todas las opciones. Toca la palabra o frase correcta.';
}

export function lessonHelpText(
  card: LessonCard,
  promptInteractionMode: PromptInteractionMode = 'gestures',
) {
  const promptReminder = promptInteractionMode === 'visual-instruction'
    ? VISUAL_INSTRUCTION_REMINDER
    : promptInteractionMode === 'translation-on-tap'
      ? DEDICATED_REPLAY_REMINDER
      : PROMPT_GESTURE_REMINDER;
  return `${cardHelpInstruction(card)} ${promptReminder}`;
}
