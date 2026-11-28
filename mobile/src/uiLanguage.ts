import { createContext, useContext } from 'react';

import courseCatalogs from './generated/course-catalogs.json';
import { isUiLanguage, type UiLanguage } from './uiText';

export type { UiLanguage } from './uiText';

// User decision (2026-11-19): a course taught to English speakers (German,
// Spanish) runs its app screens in English. A course declares this with
// `uiLanguage` in backend/courses.json; the English courses declare nothing and
// keep the Spanish app shell. That declared language is the course's default
// help language. Since 2026-11-28 a course also names the language it teaches
// (`targetLanguage`) and every help language whose content is complete
// (`helpLanguages`); see docs/product/multilingual-architecture.md.
type CourseCatalog = {
  id: string;
  level: string;
  lessonIds: string[];
  targetLanguage?: string;
  helpLanguages?: string[];
  uiLanguage?: string;
};
const catalogs = courseCatalogs as CourseCatalog[];

function languageOf(course?: CourseCatalog): UiLanguage {
  const declared = course?.uiLanguage;
  return isUiLanguage(declared) ? declared : 'es';
}

function courseByIdOrLevel(courseIdOrLevel?: string | null) {
  return courseIdOrLevel
    ? catalogs.find(course => course.id === courseIdOrLevel || course.level === courseIdOrLevel)
    : undefined;
}

function courseOfLesson(lessonId?: string | null) {
  return lessonId ? catalogs.find(course => course.lessonIds.includes(lessonId)) : undefined;
}

/** Default help language of a course, by its id or its level. */
export function uiLanguageForCourse(courseIdOrLevel?: string | null): UiLanguage {
  return languageOf(courseByIdOrLevel(courseIdOrLevel));
}

/** Default help language of the course that owns a lesson. */
export function uiLanguageForLesson(lessonId?: string | null): UiLanguage {
  return languageOf(courseOfLesson(lessonId));
}

/** The language a course teaches. */
export function targetLanguageForCourse(courseIdOrLevel?: string | null): UiLanguage | null {
  const target = courseByIdOrLevel(courseIdOrLevel)?.targetLanguage;
  return isUiLanguage(target) ? target : null;
}

/** Help languages a course offers: only those whose content is complete. */
export function helpLanguagesForCourse(courseIdOrLevel?: string | null): UiLanguage[] {
  return (courseByIdOrLevel(courseIdOrLevel)?.helpLanguages || []).filter(isUiLanguage);
}

/** The language taught by the course that owns a lesson. */
export function targetLanguageForLesson(lessonId?: string | null): UiLanguage | null {
  const target = courseOfLesson(lessonId)?.targetLanguage;
  return isUiLanguage(target) ? target : null;
}

/**
 * The help language a lesson runs in: the learner's choice when the lesson's
 * course offers it, else the course's default help language. QA may force any
 * language to preview an incomplete pair.
 */
export function helpLanguageForLesson(lessonId: string | null | undefined, chosen?: UiLanguage | null, qaOverride?: UiLanguage | null): UiLanguage {
  if (qaOverride) return qaOverride;
  const course = courseOfLesson(lessonId);
  return chosen && (course?.helpLanguages || []).includes(chosen) ? chosen : languageOf(course);
}

export const UiLanguageContext = createContext<UiLanguage>('es');

export function useUiLanguage(): UiLanguage {
  return useContext(UiLanguageContext);
}
