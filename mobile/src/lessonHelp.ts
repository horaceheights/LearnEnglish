import type { Lesson, LessonCard } from './types';

/** The first Aprende card models the task; introduce help on the next card. */
export function isFirstSectionHelpIntroduction(lesson: Lesson | null | undefined, cardIndex: number): boolean {
  return cardIndex === 1
    && /^\d+\.[1-9]$/.test(lesson?.sub_lesson_id ?? '')
    && lesson?.experience_type !== 'mission'
    && lesson?.cards[0]?.stage === 'Learn'
    && lesson.cards[0].options.length === 1
    && lesson.cards[1]?.stage === 'Learn'
    && lesson.cards[1].options.length === 1;
}

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

export const COMPLETION_RETRY_HELP = 'Lee la pista y toca Reintentar.';

export type PromptInteractionMode = 'gestures' | 'translation-on-tap' | 'visual-instruction' | 'replay-on-tap';

function hasOnlyTextOptions(card: LessonCard) {
  return card.options.length > 0 && card.options.every((option) => !option.image_url);
}

function hasImageOptions(card: LessonCard) {
  return card.options.some((option) => Boolean(option.image_url));
}

function textChoiceNoun(card: LessonCard) {
  const labels = card.options.map(option => option.label?.trim() || '');
  if (labels.length && labels.every(label => label.endsWith('?'))) return 'pregunta';
  if (labels.length && labels.every(label => label && !/\s/.test(label))) return 'palabra';
  return 'frase';
}

export function listeningHelpText(card?: LessonCard | null, replayOnPrompt = false): string | null {
  if (!card || card.mission_game || !LISTENING_STAGES.has(card.stage)) return null;
  const instruction = `Escucha y elige la ${hasImageOptions(card) ? 'imagen' : textChoiceNoun(card)} correcta.`;
  const hasPromptAudio = Boolean(card.audio_text?.trim() || card.audio_turns?.length
    || card.audio_assets?.some(asset => asset.purpose === 'prompt'));
  return hasPromptAudio ? `${instruction} Toca ${replayOnPrompt ? 'la frase' : 'la bocina'} para repetir.` : instruction;
}

/**
 * Gives the learner the exact action required by the current card without
 * revealing its answer. Card structure is used as a fallback for new stages.
 */
function cardHelpInstruction(card: LessonCard, promptInteractionMode: PromptInteractionMode) {
  if (card.stage === 'Use' && !card.mission_game && (card.correct_option_ids?.length || 0) > 1) {
    const goal = card.interaction_type === 'complete-sentence'
      ? 'Escucha y coloca las palabras en orden, tocando o arrastrando.'
      : `Escucha y coloca las ${card.correct_option_ids!.length === 2 ? 'dos' : card.correct_option_ids!.length} palabras que faltan en orden, tocando o arrastrando.`;
    return `${goal} Toca una palabra colocada para devolverla.`;
  }
  if (PRONUNCIATION_STAGES.has(card.stage)) {
    return 'Escucha y, después de la señal, repite en voz alta.';
  }

  if (card.options.length === 1) {
    if (promptInteractionMode === 'translation-on-tap') {
      return 'Escucha y aprende. Toca la frase para ver la traducción.';
    }
    if (promptInteractionMode === 'gestures') {
      return 'Escucha y aprende. Toca dos veces la frase para ver la traducción.';
    }
    return 'Escucha y aprende.';
  }

  if (GRAMMAR_STAGES.has(card.stage) || card.prompt.includes('__')) {
    return card.prompt_image_url
      ? 'Mira la imagen y toca la palabra que falta.'
      : 'Toca la palabra que completa la frase.';
  }

  if (hasOnlyTextOptions(card)) {
    if (card.prompt_image_url || IMAGE_TO_TEXT_STAGES.has(card.stage)) {
      return textChoiceNoun(card) === 'pregunta'
        ? 'Mira la imagen y toca la pregunta que corresponde.'
        : `Mira la imagen y toca la ${textChoiceNoun(card)} que la describe.`;
    }
    return 'Lee la indicación y toca la respuesta correcta.';
  }

  if (card.stage === 'Recognize') {
    return 'Lee y escucha. Toca la imagen que corresponde.';
  }

  if (card.stage === 'Action Introduction' || card.stage === 'Family Action Practice') {
    return 'Escucha y toca la imagen de esa acción.';
  }

  if (VOCABULARY_STAGES.has(card.stage)) {
    return 'Lee y escucha. Toca la imagen que corresponde.';
  }

  if (card.stage === 'Plural Challenge' || card.stage === 'Family Sentences') {
    return 'Lee la frase y toca la imagen que corresponde.';
  }

  if (hasImageOptions(card)) {
    return 'Lee y escucha. Toca la imagen que corresponde.';
  }

  return 'Lee la indicación y toca la respuesta correcta.';
}

export function lessonHelpText(
  card: LessonCard,
  promptInteractionMode: PromptInteractionMode = 'gestures',
) {
  return listeningHelpText(card, promptInteractionMode === 'replay-on-tap' || promptInteractionMode === 'gestures')
    || cardHelpInstruction(card, promptInteractionMode);
}
