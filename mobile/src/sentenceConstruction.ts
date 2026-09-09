import type { LessonCard } from './types';

export const isSentenceConstruction = (card: LessonCard | null | undefined) =>
  card?.interaction_type === 'complete-sentence';

export function sentenceSlots(card: LessonCard, selected: string[]) {
  return (card.correct_option_ids || []).map((_, index) => selected[index] || '');
}

export function sentenceIsCorrect(card: LessonCard, selected: string[]) {
  const expected = card.correct_option_ids || [];
  const label = (id: string) => card.options.find((option) => option.id === id)?.label;
  return selected.length === expected.length
    && new Set(selected).size === selected.length
    && selected.every((id, index) => Boolean(id) && label(id) === label(expected[index]));
}

export function placeSentenceWord(card: LessonCard, selected: string[], id: string, slot?: number) {
  const next = sentenceSlots(card, selected);
  const index = slot ?? next.indexOf('');
  if (!card.options.some((option) => option.id === id) || next.includes(id)
      || index < 0 || index >= next.length || next[index]) return next;
  next[index] = id;
  return next;
}

export function sentenceHint(card: LessonCard, selected: string[]) {
  const expected = card.correct_option_ids || [];
  const label = (id: string) => card.options.find((option) => option.id === id)?.label;
  const index = expected.findIndex((id, i) => label(id) !== label(selected[i]));
  return index < 0 ? '' : `Escucha otra vez. La palabra ${index + 1} es «${label(expected[index])}».`;
}

// Derived from the measured activity area, with a fixed readable target floor.
export function sentenceLayout(width: number, height: number, fontScale: number, count: number) {
  const textSize = Math.min(width, height) >= 540 ? 22 : 18;
  const tileWidth = Math.max(72, Math.ceil(5 * textSize * 0.62 * fontScale + 20));
  const columns = Math.max(1, Math.min(count, Math.floor((width - 32) / (tileWidth + 6))));
  const rows = Math.ceil(count / columns);
  const tileHeight = Math.max(48, Math.ceil(textSize * fontScale * 1.4 + 20));
  const controlsHeight = Math.max(48, Math.ceil(16 * fontScale * 1.4 + 20));
  const reserved = rows * (tileHeight + 6) * 2 + controlsHeight + 156;
  return { textSize, tileWidth, tileHeight, columns, rows,
    imageHeight: Math.max(0, Math.min(300, height - reserved)),
    scrollBank: height < reserved + 100 };
}
