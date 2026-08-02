export const API_BASE_URL = 'https://learnenglish-fxki.onrender.com';
export const FIRST_LESSON_ID = 'lesson-1-people-actions';
export const READY_CUE_URL = `${API_BASE_URL}/api/audio/ready-cue`;
export const COURSE_AUDIO_PROFILE = 'a1-syllable-v3';

export function absoluteMediaUrl(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export function courseAudioUrl(
  text: string,
  mode = 'prompt',
  variant = 'default',
): string {
  const query = new URLSearchParams({
    text,
    mode,
    lang: 'en-US',
    variant,
    profile: COURSE_AUDIO_PROFILE,
  });
  return `${API_BASE_URL}/api/audio/course?${query.toString()}`;
}
