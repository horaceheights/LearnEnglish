import { createContext, useContext } from 'react';

import courseCatalogs from './generated/course-catalogs.json';
import type { UiLanguage } from './uiText';

export type { UiLanguage } from './uiText';

// User decision (2026-11-19): a course taught to English speakers (German,
// Spanish) runs its app screens in English. A course declares this with
// `uiLanguage` in backend/courses.json; the English courses declare nothing and
// keep the Spanish app shell.
type CourseCatalog = { id: string; level: string; lessonIds: string[]; uiLanguage?: string };
const catalogs = courseCatalogs as CourseCatalog[];

function languageOf(course?: CourseCatalog): UiLanguage {
  return course?.uiLanguage === 'en' ? 'en' : 'es';
}

/** App language of a course, by its id or its level. */
export function uiLanguageForCourse(courseIdOrLevel?: string | null): UiLanguage {
  if (!courseIdOrLevel) return 'es';
  return languageOf(catalogs.find(course => course.id === courseIdOrLevel || course.level === courseIdOrLevel));
}

/** App language of the course that owns a lesson. */
export function uiLanguageForLesson(lessonId?: string | null): UiLanguage {
  if (!lessonId) return 'es';
  return languageOf(catalogs.find(course => course.lessonIds.includes(lessonId)));
}

export const UiLanguageContext = createContext<UiLanguage>('es');

export function useUiLanguage(): UiLanguage {
  return useContext(UiLanguageContext);
}
