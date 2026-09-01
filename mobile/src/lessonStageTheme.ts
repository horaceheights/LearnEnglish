import type { LessonCard } from './types';

export const LESSON_STAGE_COLORS = [
  '#4f7cac',
  '#df765b',
  '#8865b4',
  '#279487',
  '#d99b20',
  '#577590',
  '#b85d87',
  '#638b52',
] as const;

export function lessonStageColorForSegment(segmentIndex: number) {
  const normalizedIndex = Math.max(0, segmentIndex) % LESSON_STAGE_COLORS.length;
  return LESSON_STAGE_COLORS[normalizedIndex];
}

export function lessonStageColorForCard(cards: LessonCard[], currentIndex: number) {
  if (cards.length === 0) return undefined;

  const boundedIndex = Math.min(Math.max(currentIndex, 0), cards.length - 1);
  let segmentIndex = 0;

  for (let index = 1; index <= boundedIndex; index += 1) {
    if (cards[index].stage !== cards[index - 1].stage) segmentIndex += 1;
  }

  return lessonStageColorForSegment(segmentIndex);
}
