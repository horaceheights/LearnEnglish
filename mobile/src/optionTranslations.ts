import type { ChoiceOption, LessonCard } from './types';

// User decision (2026-11-18): a Recognize card that shows one photo above
// written choices offers a labelled Traducir button. On demand only, before or
// after answering, it shows each choice's authored Spanish under its English for
// the ordinary three-second sentence-translation window. It never opens by itself.
export const OPTION_TRANSLATION_BUTTON_LABEL = 'Traducir';

type OptionTranslationCard = Pick<LessonCard, 'stage' | 'prompt_image_url' | 'options' | 'mission_game'>;

function writtenChoice(option: ChoiceOption) {
  return !option.image_url?.trim() && Boolean(option.label?.trim());
}

/** True only when every written choice under the photo carries authored Spanish. */
export function recognizeOptionTranslationsAvailable(card?: OptionTranslationCard | null): boolean {
  return Boolean(card)
    && card!.stage === 'Recognize'
    && !card!.mission_game
    && Boolean(card!.prompt_image_url?.trim())
    && card!.options.length >= 2
    && card!.options.every(option => writtenChoice(option) && Boolean(option.spanish_translation?.trim()));
}

export const OPTION_TRANSLATION_MAX_LINES = 3;

/**
 * Lines the longest Spanish needs at the given width, so every tile in the bank
 * grows by the same height while the translations show (equal tiles, no clipping).
 */
export function optionTranslationLineCount(
  options: ChoiceOption[],
  textWidth: number,
  fontSize: number,
): number {
  const longest = Math.max(0, ...options.map(option => option.spanish_translation?.trim().length ?? 0));
  if (!longest) return 0;
  const charactersPerLine = Math.max(8, Math.floor(textWidth / (fontSize * 0.56)));
  return Math.min(OPTION_TRANSLATION_MAX_LINES, Math.ceil((longest * 1.1) / charactersPerLine));
}

/** The Spanish shown under one choice while the Traducir window is open. */
export function optionTranslationText(option: ChoiceOption, visible: boolean): string {
  return visible ? option.spanish_translation?.trim() ?? '' : '';
}
