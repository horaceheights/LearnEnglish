import { promptChoiceLineCount } from './promptChoiceLayout';

// The safe-area parent owns the viewport. Children size from its measured slot,
// never from the natural height of overflowing lesson content.
export const isPhoneLandscape = (width: number, height: number) => width > height && height < 600;

// Picture choices keep the shared dark 4dp frame border but a thinner 4dp inset
// than other lesson media (8dp), so the pictures themselves are slightly larger
// without changing their aspect ratio (user direction, 2026-09-25).
export const IMAGE_CHOICE_INSET = 4;

export function imageChoiceLayout(width: number, height: number, count: number, portrait: boolean) {
  const aspect = portrait && count === 4 ? 4 / 5 : 3 / 2;
  const gap = 10;
  const chrome = 2 * (4 + IMAGE_CHOICE_INSET); // shared 4dp border + the choice inset on each side
  const candidates = portrait ? [count === 2 ? 1 : Math.min(2, count)]
    : count === 4 ? [2, 4] : [Math.max(1, count)];
  const layouts = candidates.map(columns => {
    const rows = Math.ceil(count / columns);
    const optionWidth = Math.max(0, Math.min(
      (width - (columns - 1) * gap) / columns,
      ((height - (rows - 1) * gap) / rows - chrome) * aspect + chrome,
    ));
    const optionHeight = (optionWidth - chrome) / aspect + chrome;
    return { columns, rows, aspect, gap, optionWidth, optionHeight,
      width: columns * optionWidth + (columns - 1) * gap,
      height: rows * optionHeight + (rows - 1) * gap };
  });
  return layouts.reduce((best, next) => next.optionWidth > best.optionWidth ? next : best);
}

export function landscapePromptIsWide(text: string, availableWidth: number) {
  const railWidth = Math.min(260, Math.max(180, availableWidth * .28));
  return promptChoiceLineCount(text, railWidth - 24, 16) > 4;
}
