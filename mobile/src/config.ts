export const API_BASE_URL = 'https://learnenglish-fxki.onrender.com';
export const FIRST_LESSON_ID = 'lesson-1-people-actions';

export function absoluteMediaUrl(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export function courseAudioUrl(text: string): string {
  const query = new URLSearchParams({
    text,
    mode: 'lesson',
    lang: 'en',
    variant: 'default',
  });
  return `${API_BASE_URL}/api/audio/course?${query.toString()}`;
}
