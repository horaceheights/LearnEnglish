import type { LessonCard } from './types';

type RecognitionPrompt = Pick<LessonCard, 'stage' | 'prompt' | 'audio_text' | 'prompt_presentation'>;
type RecognitionAnswer = RecognitionPrompt
  & Pick<LessonCard, 'answer_audio_text' | 'correct_option_id' | 'options'>;

// Null keeps the ordinary prompt-audio fallback. An authored empty string
// deliberately makes a written recognition task silent before selection.
export function isSilentWrittenRecognize(card?: RecognitionPrompt | null) {
  return card?.stage === 'Recognize'
    && Boolean(card.prompt.trim())
    && typeof card.audio_text === 'string'
    && !card.audio_text.trim();
}

// Written presentation is independent of whether its cue is pronounced.
// Existing explicitly silent authored cards keep their reading presentation.
export function isWrittenRecognize(card?: RecognitionPrompt | null) {
  return card?.stage === 'Recognize' && Boolean(card.prompt.trim())
    && (card.prompt_presentation === 'written' || isSilentWrittenRecognize(card));
}

export function recognizeAnswerReplayText(card: RecognitionAnswer | null | undefined, correct: boolean) {
  if (!card || !correct || card.stage !== 'Recognize') return '';
  if (isSilentWrittenRecognize(card)) return card.answer_audio_text?.trim() || '';
  if (card.prompt.trim()) return '';
  return card.answer_audio_text?.trim()
    || card.options.find((option) => option.id === card.correct_option_id)?.label?.trim()
    || '';
}
