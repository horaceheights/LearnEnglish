import type { LessonCard } from './types';

type TurnImageCard = Pick<LessonCard, 'stage' | 'interaction_type' | 'prompt_image_url'>;

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
