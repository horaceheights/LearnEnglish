// Help text in the learner's help language (user decision 2026-11-28,
// docs/product/multilingual-architecture.md). This module has only type imports
// so pure helpers and the vm-based tests can use it.
import type { Lesson, LessonCard } from './types';
import type { UiLanguage } from './uiText';

/**
 * Lesson files keep their reviewed help text in the legacy fields
 * (`spanish_translation`, mission `*_es`, mission briefing text), written in the
 * course's default help language. Each further help language sits beside the
 * field as `<field>_i18n: { de: "…", fr: "…" }`, so lesson files never move
 * existing text.
 */
export const HELP_TEXT_I18N_SUFFIX = '_i18n';

type HelpValue = string | string[];

function localized(value: unknown, helpLanguage: UiLanguage): unknown {
  if (Array.isArray(value)) return value.map(item => localized(item, helpLanguage));
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(source)) {
    if (key.endsWith(HELP_TEXT_I18N_SUFFIX)) continue;
    const translations = source[`${key}${HELP_TEXT_I18N_SUFFIX}`];
    if (translations && typeof translations === 'object' && !Array.isArray(translations)) {
      const translated = (translations as Partial<Record<UiLanguage, HelpValue>>)[helpLanguage];
      // A missing translation hides the help text rather than showing another
      // language. Onboarding only offers complete pairs, so learners never see
      // the gap; QA's help-language switch shows it.
      result[key] = translated ?? (Array.isArray(field) ? [] : typeof field === 'string' ? '' : field);
    } else {
      result[key] = localized(field, helpLanguage);
    }
  }
  return result;
}

/**
 * The lesson with every help text in `helpLanguage`. A lesson read in its
 * course's default help language is returned unchanged.
 */
export function localizeLesson<T extends Lesson>(lesson: T, helpLanguage: UiLanguage, defaultHelpLanguage: UiLanguage): T {
  if (helpLanguage === defaultHelpLanguage) return lesson;
  return localized(lesson, helpLanguage) as T;
}

/**
 * The help language each hand-written mistake-explanation module is written in:
 * English lessons explain in Spanish (choiceTeaching, constructionTeaching);
 * German and Spanish lessons explain in English (germanTeaching, spanishTeaching).
 */
export function writtenMistakeHelpLanguage(card: Pick<LessonCard, 'target_language'>): UiLanguage {
  return card.target_language === 'de' || card.target_language === 'es' ? 'en' : 'es';
}

/**
 * Whether a card's pair has hand-written mistake explanations. Every other pair
 * shows the approved fallback (user decision 2026-11-28): the correct answer
 * with its help-language translation.
 */
export function hasWrittenMistakeHelp(card: Pick<LessonCard, 'target_language'>, helpLanguage?: UiLanguage | null) {
  return !helpLanguage || helpLanguage === writtenMistakeHelpLanguage(card);
}
