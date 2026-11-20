import type { Lesson, LessonCard } from './types';
import type { UiLanguage } from './uiText';
import { isWrittenRecognize } from './lessonPromptPresentation';
import { optionTranslationsAvailable } from './optionTranslations';

/** The first Aprende card models the task; introduce help on the next card. */
export function isFirstSectionHelpIntroduction(lesson: Lesson | null | undefined, cardIndex: number): boolean {
  // Every standard and review lesson introduces help, however long its unit is;
  // the unit-closing mission is identified by its data, not by lesson number 10.
  return cardIndex === 1
    && Boolean(lesson)
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
export const COMPLETION_RETRY_HELP_ENGLISH = 'Read the hint and tap Retry.';

export function completionRetryHelp(language: UiLanguage = 'es') {
  return language === 'en' ? COMPLETION_RETRY_HELP_ENGLISH : COMPLETION_RETRY_HELP;
}

// Courses for English speakers (uiLanguage "en", 2026-11-19) get the same help in English.
const pick = (language: UiLanguage, spanish: string, english: string) => (language === 'en' ? english : spanish);
const ENGLISH_NOUNS: Record<string, string> = { pregunta: 'question', palabra: 'word', frase: 'sentence', imagen: 'picture' };

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

export function listeningHelpText(card?: LessonCard | null, replayOnPrompt = false, language: UiLanguage = 'es'): string | null {
  if (!card || card.mission_game || !LISTENING_STAGES.has(card.stage)) return null;
  if (language === 'en') return englishListeningHelpText(card, replayOnPrompt);
  const instruction = `Escucha y elige la ${hasImageOptions(card) ? 'imagen' : textChoiceNoun(card)} correcta.`;
  const hasPromptAudio = Boolean(card.audio_text?.trim() || card.audio_turns?.length
    || card.audio_assets?.some(asset => asset.purpose === 'prompt'));
  // Help explains the controls actually present (2026-11-18 Traducir button), in two sentences at most.
  const translate = optionTranslationsAvailable(card) ? `Traducir para ver las ${textChoiceNoun(card)}s en español` : '';
  if (!hasPromptAudio) return translate ? `${instruction} Toca ${translate}.` : instruction;
  const replay = `Toca ${replayOnPrompt ? 'la frase' : 'la bocina'} para repetir`;
  return translate ? `${instruction} ${replay} o ${translate}.` : `${instruction} ${replay}.`;
}

function englishListeningHelpText(card: LessonCard, replayOnPrompt: boolean): string {
  const noun = ENGLISH_NOUNS[hasImageOptions(card) ? 'imagen' : textChoiceNoun(card)];
  const instruction = `Listen and choose the right ${noun}.`;
  const hasPromptAudio = Boolean(card.audio_text?.trim() || card.audio_turns?.length
    || card.audio_assets?.some(asset => asset.purpose === 'prompt'));
  const translate = optionTranslationsAvailable(card) ? `Translate to see the ${ENGLISH_NOUNS[textChoiceNoun(card)]}s in English` : '';
  if (!hasPromptAudio) return translate ? `${instruction} Tap ${translate}.` : instruction;
  const replay = `Tap ${replayOnPrompt ? 'the sentence' : 'the speaker'} to replay`;
  return translate ? `${instruction} ${replay} or ${translate}.` : `${instruction} ${replay}.`;
}

/**
 * Gives the learner the exact action required by the current card without
 * revealing its answer. Card structure is used as a fallback for new stages.
 */
function cardHelpInstruction(card: LessonCard, promptInteractionMode: PromptInteractionMode, language: UiLanguage) {
  if (card.stage === 'Use' && !card.mission_game && (card.correct_option_ids?.length || 0) > 1) {
    if (language === 'en') {
      const goal = card.interaction_type === 'complete-sentence'
        ? 'Listen and put the words in order by tapping or dragging.'
        : `Listen and put the ${card.correct_option_ids!.length === 2 ? 'two' : card.correct_option_ids!.length} missing words in order by tapping or dragging.`;
      return `${goal} Tap a placed word to send it back.`;
    }
    const goal = card.interaction_type === 'complete-sentence'
      ? 'Escucha y coloca las palabras en orden, tocando o arrastrando.'
      : `Escucha y coloca las ${card.correct_option_ids!.length === 2 ? 'dos' : card.correct_option_ids!.length} palabras que faltan en orden, tocando o arrastrando.`;
    return `${goal} Toca una palabra colocada para devolverla.`;
  }
  if (PRONUNCIATION_STAGES.has(card.stage)) {
    return pick(language, 'Escucha y, después de la señal, repite en voz alta.', 'Listen and, after the signal, repeat aloud.');
  }

  if (card.options.length === 1) {
    if (promptInteractionMode === 'translation-on-tap') {
      return pick(language, 'Escucha y aprende. Toca la frase para ver la traducción.', 'Listen and learn. Tap the sentence to see the translation.');
    }
    if (promptInteractionMode === 'gestures') {
      return pick(language, 'Escucha y aprende. Toca dos veces la frase para ver la traducción.', 'Listen and learn. Double-tap the sentence to see the translation.');
    }
    return pick(language, 'Escucha y aprende.', 'Listen and learn.');
  }

  if (GRAMMAR_STAGES.has(card.stage) || card.prompt.includes('__')) {
    return card.prompt_image_url
      ? pick(language, 'Mira la imagen y toca la palabra que falta.', 'Look at the picture and tap the missing word.')
      : pick(language, 'Toca la palabra que completa la frase.', 'Tap the word that completes the sentence.');
  }

  if (hasOnlyTextOptions(card)) {
    if (card.prompt_image_url || IMAGE_TO_TEXT_STAGES.has(card.stage)) {
      const goal = textChoiceNoun(card) === 'pregunta'
        ? pick(language, 'Mira la imagen y toca la pregunta que corresponde.', 'Look at the picture and tap the matching question.')
        : pick(language, `Mira la imagen y toca la ${textChoiceNoun(card)} que la describe.`,
          `Look at the picture and tap the ${ENGLISH_NOUNS[textChoiceNoun(card)]} that describes it.`);
      // Help explains the controls actually present (2026-11-18 Traducir button).
      return optionTranslationsAvailable(card)
        ? pick(language, `${goal} Toca Traducir para ver las ${textChoiceNoun(card)}s en español.`,
          `${goal} Tap Translate to see the ${ENGLISH_NOUNS[textChoiceNoun(card)]}s in English.`)
        : goal;
    }
    return pick(language, 'Lee la indicación y toca la respuesta correcta.', 'Read the instruction and tap the right answer.');
  }

  if (card.stage === 'Recognize') {
    if (isWrittenRecognize(card)) {
      const target = card.prompt.trim().split(/\r?\n/).pop() || '';
      const noun = target.endsWith('?') ? 'pregunta' : /\s/.test(target) ? 'frase' : 'palabra';
      return pick(language, `Lee la ${noun} y toca la imagen que corresponde.`, `Read the ${ENGLISH_NOUNS[noun]} and tap the matching picture.`);
    }
    return pick(language, 'Lee y escucha. Toca la imagen que corresponde.', 'Read and listen. Tap the matching picture.');
  }

  if (card.stage === 'Action Introduction' || card.stage === 'Family Action Practice') {
    return pick(language, 'Escucha y toca la imagen de esa acción.', 'Listen and tap the picture of that action.');
  }

  if (VOCABULARY_STAGES.has(card.stage)) {
    return pick(language, 'Lee y escucha. Toca la imagen que corresponde.', 'Read and listen. Tap the matching picture.');
  }

  if (card.stage === 'Plural Challenge' || card.stage === 'Family Sentences') {
    return pick(language, 'Lee la frase y toca la imagen que corresponde.', 'Read the sentence and tap the matching picture.');
  }

  if (hasImageOptions(card)) {
    return pick(language, 'Lee y escucha. Toca la imagen que corresponde.', 'Read and listen. Tap the matching picture.');
  }

  return pick(language, 'Lee la indicación y toca la respuesta correcta.', 'Read the instruction and tap the right answer.');
}

export function lessonHelpText(
  card: LessonCard,
  promptInteractionMode: PromptInteractionMode = 'gestures',
  language: UiLanguage = 'es',
) {
  return listeningHelpText(card, promptInteractionMode === 'replay-on-tap' || promptInteractionMode === 'gestures', language)
    || cardHelpInstruction(card, promptInteractionMode, language);
}
