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
export const COMPLETION_RETRY_HELP = 'Lee la pista y toca Reintentar.';

export type PromptInteractionMode = 'gestures' | 'translation-on-tap' | 'visual-instruction' | 'replay-on-tap';

function hasOnlyTextOptions(card: LessonCard) {
  return card.options.length > 0 && card.options.every((option) => !option.image_url);
}

function hasImageOptions(card: LessonCard) {
  return card.options.some((option) => Boolean(option.image_url));
}

export function listeningHelpText(card?: LessonCard | null, replayOnPrompt = false): string | null {
  if (!card || card.mission_game || !LISTENING_STAGES.has(card.stage)) return null;
  return `Estamos entrenando tu oído. Escucha la frase y elige ${hasImageOptions(card) ? 'la imagen correcta' : 'la palabra o frase correcta'}. Toca ${replayOnPrompt ? 'la frase' : 'la bocina'} para repetirla.`;
}

/**
 * Gives the learner the exact action required by the current card without
 * revealing its answer. Card structure is used as a fallback for new stages.
 */
function cardHelpInstruction(card: LessonCard) {
  if (card.stage === 'Use' && !card.mission_game && (card.correct_option_ids?.length || 0) > 1) {
    const goal = card.interaction_type === 'complete-sentence'
      ? 'Escucha la frase completa y coloca las palabras en ese orden.'
      : `Escucha la frase completa. Coloca las ${card.correct_option_ids!.length === 2 ? 'dos' : card.correct_option_ids!.length} palabras que faltan en el orden de la frase.`;
    return `${goal} Toca o arrastra para colocar. Arrastra entre espacios para cambiar el orden; toca una palabra colocada para devolverla.`;
  }
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
  const listening = listeningHelpText(card, promptInteractionMode === 'replay-on-tap');
  if (listening) return listening;
  const promptReminder = promptInteractionMode === 'visual-instruction'
    ? VISUAL_INSTRUCTION_REMINDER
    : promptInteractionMode === 'replay-on-tap'
      ? 'Recuerda: toca la frase para escucharla otra vez.'
    : promptInteractionMode === 'translation-on-tap'
      ? DEDICATED_REPLAY_REMINDER
      : PROMPT_GESTURE_REMINDER;
  return `${cardHelpInstruction(card)} ${promptReminder}`;
}
