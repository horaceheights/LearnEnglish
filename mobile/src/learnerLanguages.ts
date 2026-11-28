// The languages a learner studies, chosen at onboarding (user decision 2026-11-28,
// docs/product/multilingual-architecture.md). Each entry is one target language with
// its own help language and practice goal; goal, progress and price are per language.
// This module has only type imports so the vm-based tests can use it; callers pass
// the course index (`generated/course-catalogs.json`).
import type { UiLanguage } from './uiText';

export type LearnerLanguage = {
  target: UiLanguage;
  help: UiLanguage;
  dailyMinutes: number;
  daysPerWeek: number;
  startedAt: string;
};

export type CourseIndexEntry = {
  id: string;
  level: string;
  title: string;
  lessonIds: string[];
  targetLanguage?: string;
  helpLanguages?: string[];
  uiLanguage?: string;
};

export type LanguageOffer = {
  target: UiLanguage;
  /** Help languages offered by every course of this target; empty means "coming soon". */
  help: UiLanguage[];
  courseIds: string[];
};

/** Onboarding order: the four taught languages. */
export const TARGET_ORDER: readonly UiLanguage[] = ['en', 'es', 'de', 'fr'];

/** Each language named in itself, so a learner recognizes their own. */
export const LANGUAGE_NATIVE_NAMES: Readonly<Record<UiLanguage, string>> = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
};

const LANGUAGE_NAMES: Readonly<Partial<Record<UiLanguage, Readonly<Record<UiLanguage, string>>>>> = {
  es: { en: 'inglés', es: 'español', de: 'alemán', fr: 'francés' },
  en: { en: 'English', es: 'Spanish', de: 'German', fr: 'French' },
};

/** A language's name in the help language (English until German and French copy exists). */
export function languageName(language: UiLanguage, helpLanguage: UiLanguage): string {
  return (LANGUAGE_NAMES[helpLanguage] || LANGUAGE_NAMES.en!)[language];
}

export const DAILY_MINUTE_CHOICES: readonly number[] = [5, 10, 15, 20, 30];
export const DEFAULT_DAILY_MINUTES = 10;
export const DEFAULT_DAYS_PER_WEEK = 5;

const isLanguage = (value: unknown): value is UiLanguage => (TARGET_ORDER as readonly unknown[]).includes(value);

/**
 * What onboarding can offer. A help language appears only when every course of
 * the target lists it, so a learner never reaches a level without help text.
 */
export function languageOffers(catalogs: readonly CourseIndexEntry[]): LanguageOffer[] {
  return TARGET_ORDER.map(target => {
    const courses = catalogs.filter(course => course.targetLanguage === target);
    const help = courses.length
      ? TARGET_ORDER.filter(language => language !== target
        && courses.every(course => (course.helpLanguages || []).includes(language)))
      : [];
    return { target, help, courseIds: courses.map(course => course.id) };
  });
}

/** Valid, de-duplicated learner languages from a stored profile. */
export function learnerLanguages(profile: { languages?: unknown }): LearnerLanguage[] {
  if (!Array.isArray(profile.languages)) return [];
  const seen = new Set<string>();
  return profile.languages.filter((entry): entry is LearnerLanguage => {
    if (!entry || typeof entry !== 'object') return false;
    const { target, help, dailyMinutes, daysPerWeek } = entry as LearnerLanguage;
    if (!isLanguage(target) || !isLanguage(help) || target === help || seen.has(target)) return false;
    if (typeof dailyMinutes !== 'number' || !Number.isFinite(dailyMinutes) || dailyMinutes <= 0) return false;
    if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) return false;
    seen.add(target);
    return true;
  });
}

/** Existing and new learners both go through onboarding until they pick a language. */
export function needsOnboarding(profile: { languages?: unknown }): boolean {
  return learnerLanguages(profile).length === 0;
}

/** The language the learner is studying now: the saved choice, else the first. */
export function activeLearnerLanguage(profile: { languages?: unknown; activeTarget?: unknown }): LearnerLanguage | null {
  const languages = learnerLanguages(profile);
  return languages.find(entry => entry.target === profile.activeTarget) || languages[0] || null;
}

/** The learner's entry for one target language, if they study it. */
export function learnerLanguageFor(profile: { languages?: unknown }, target?: UiLanguage | null): LearnerLanguage | null {
  return target ? learnerLanguages(profile).find(entry => entry.target === target) || null : null;
}

/** Add or replace one language and make it the active one. */
export function withLearnerLanguage<T extends { languages?: unknown }>(profile: T, language: LearnerLanguage): T & { languages: LearnerLanguage[]; activeTarget: UiLanguage } {
  const others = learnerLanguages(profile).filter(entry => entry.target !== language.target);
  return { ...profile, languages: [...others, language], activeTarget: language.target };
}

/**
 * The language of screens shown before a learner has picked a help language: the
 * device language when its screen text exists (Spanish, English), else English.
 */
export function deviceHelpLanguage(locale: string | null = deviceLocale()): UiLanguage {
  const language = (locale || '').toLowerCase().split(/[-_]/)[0];
  return language === 'es' ? 'es' : 'en';
}

/** The device's locale, or '' when the runtime cannot say. */
export function deviceLocale(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().locale || ''; } catch { return ''; }
}
