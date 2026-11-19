import courseCatalogs from './generated/course-catalogs.json';

/**
 * A course taught in another language declares the speech locale its
 * pronunciation practice must use. English courses declare none and keep the
 * locale the backend token provides.
 */
export function speechLocaleForLevel(level: string): string | undefined {
  const course = courseCatalogs.find(entry => entry.level === level);
  return course && 'speechLocale' in course && typeof course.speechLocale === 'string'
    ? course.speechLocale
    : undefined;
}
