import type { LessonCard } from './types';

type TurnImageCard = Pick<LessonCard, 'stage' | 'interaction_type' | 'prompt_image_url'>;

/** Authored visual evidence for a reply choice, revealed after the initiating line. */
export function replyImageAfterPrompt(card: LessonCard | null | undefined) {
  return card?.reply_image_timing === 'after-prompt' && card.stage === 'Recognize'
    && card.prompt_image_url && card.answer_audio_turns?.length === 1
    ? card.answer_audio_turns[0].image_url : null;
}

// Recognize and Listen cards ask the learner to choose an answer. Missions stage their own
// scenes, so their choice beats keep showing each speaker.
function isAnswerChoiceCard(card: TurnImageCard) {
  return (card.stage === 'Recognize' || card.stage === 'Listen')
    && !(card.interaction_type ?? '').startsWith('mission-');
}

/**
 * The picture to show while an exchange plays, or null to keep the card as authored.
 *
 * On Learn and Speak cards the speaker's picture is the content, so each turn shows its own.
 * On an answer-choice card a speaker's picture may only replace the card's own prompt picture
 * (after the answer, on picture-and-sentence cards). It never adds a picture to a card whose
 * answers are pictures or sentences: there it covered the choices and showed the answer
 * (Unit 3 review, 2026-09-26). The voices still take turns.
 */
export function visibleTurnImageUrl(card: TurnImageCard | null | undefined, activeTurnImageUrl: string | null | undefined) {
  if (!activeTurnImageUrl || !card) return null;
  if (isAnswerChoiceCard(card) && !card.prompt_image_url) return null;
  return activeTurnImageUrl;
}

/** Automatic teaching has one media slot; the current speaker replaces its photo. */
export function teachingOptionImageUrl(
  card: Pick<LessonCard, 'stage' | 'interaction_type' | 'options'>,
  activeTurnImageUrl: string | null | undefined,
) {
  return card.interaction_type === 'teach' && card.options.length === 1
    ? activeTurnImageUrl || null : null;
}
