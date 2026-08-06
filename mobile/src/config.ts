export const API_BASE_URL = 'https://learnenglish-fxki.onrender.com';
export const PRIVACY_POLICY_URL = `${API_BASE_URL}/privacy`;
export const ACCOUNT_DELETION_URL = `${API_BASE_URL}/delete-account`;
export const FIRST_LESSON_ID = 'lesson-1-people-actions';
export const SECOND_LESSON_ID = 'lesson-2-pronouns';
export const THIRD_LESSON_ID = 'lesson-4-family-members';
export const READY_CUE_URL = `${API_BASE_URL}/api/audio/ready-cue`;
export const COURSE_AUDIO_PROFILE = 'a1-provider-comparison-v9';
export type CourseAudioProvider = 'openai' | 'elevenlabs' | 'elevenlabs-premium' | 'azure';

export function courseAudioProvider(lessonId: string): CourseAudioProvider {
  if (lessonId === FIRST_LESSON_ID) return 'azure';
  if (lessonId === SECOND_LESSON_ID) return 'elevenlabs';
  if (lessonId === THIRD_LESSON_ID) return 'elevenlabs-premium';
  return 'openai';
}

export function absoluteMediaUrl(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

export function courseAudioUrl(
  text: string,
  mode = 'prompt',
  variant = 'default',
  provider: CourseAudioProvider = 'openai',
): string {
  const query = new URLSearchParams({
    text,
    mode,
    lang: 'en-US',
    variant,
    profile: COURSE_AUDIO_PROFILE,
    provider,
  });
  return `${API_BASE_URL}/api/audio/course?${query.toString()}`;
}
