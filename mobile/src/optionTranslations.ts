import type { ChoiceOption, LessonCard } from './types';

// User decisions (2026-11-18): every slide where the learner picks written English
// offers a labelled Traducir button: Recognize and Listen text choices, and mission
// conversation decisions. On demand only, before or after answering, it shows each
// choice's authored Spanish under its English for the ordinary three-second
// sentence-translation window. It never opens by itself. Completa word tiles keep
// their own sentence tap instead.
export const OPTION_TRANSLATION_BUTTON_LABEL = 'Traducir';

const TRANSLATED_CHOICE_STAGES = new Set(['Recognize', 'Listen']);

type OptionTranslationCard = Pick<LessonCard, 'stage' | 'options' | 'mission_game'>;

function writtenChoice(option: ChoiceOption) {
  return !option.image_url?.trim() && Boolean(option.label?.trim());
}

/** A slide whose answer is one of two or more written English choices. */
export function writtenChoiceCard(card?: OptionTranslationCard | null): boolean {
  return Boolean(card)
    && TRANSLATED_CHOICE_STAGES.has(card!.stage)
    && (!card!.mission_game || card!.mission_game.kind === 'conversation-decision')
    && card!.options.length >= 2
    && card!.options.every(writtenChoice);
}

/** True only when every written choice carries authored Spanish. */
export function optionTranslationsAvailable(card?: OptionTranslationCard | null): boolean {
  return writtenChoiceCard(card) && card!.options.every(option => Boolean(option.spanish_translation?.trim()));
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
