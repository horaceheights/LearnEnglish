export const API_BASE_URL = 'https://learnenglish-fxki.onrender.com';
export const PRIVACY_POLICY_URL = `${API_BASE_URL}/privacy`;
export const ACCOUNT_DELETION_URL = `${API_BASE_URL}/delete-account`;
export const FIRST_LESSON_ID = 'lesson-1-people-actions';
export const SECOND_LESSON_ID = 'lesson-2-pronouns';
export const THIRD_LESSON_ID = 'lesson-4-family-members';
export const FOURTH_LESSON_ID = 'lesson-4-family-members-continued';
export const READY_CUE_URL = `${API_BASE_URL}/api/audio/ready-cue`;
export const COURSE_AUDIO_PROFILE = 'a1-elevenlabs-cast-v14';
export type CourseAudioProvider = 'openai' | 'elevenlabs' | 'elevenlabs-premium' | 'azure';
export type CourseAudioVoice = 'female-teacher' | 'female-warm' | 'male-warm' | 'male-conversational';

export function courseAudioProvider(_lessonId: string): CourseAudioProvider {
  return 'elevenlabs-premium';
}

export function courseAudioVoice(lessonId: string, stage: string): CourseAudioVoice {
  const normalizedStage = stage.trim().toLowerCase();
  // The male-warm voice produced malformed multilingual audio for several
  // short Lesson 1.3 nouns (for example, extra speech after "A sister").
  // The approved teacher takes for the complete family set were verified by
  // transcription, so use them for both recognition and listening practice.
  if (
    (lessonId === THIRD_LESSON_ID || lessonId === FOURTH_LESSON_ID) &&
    (normalizedStage.includes('action') || normalizedStage.includes('listen'))
  ) {
    return 'female-teacher';
  }
  if (
    normalizedStage.includes('pronunciation') ||
    normalizedStage.includes('vocab') ||
    normalizedStage.includes('new word')
  ) {
    return 'female-teacher';
  }
  if (
    normalizedStage.includes('action') ||
    normalizedStage.includes('grammar') ||
    normalizedStage.includes('pattern') ||
    normalizedStage.includes('negation')
  ) {
    return lessonId === SECOND_LESSON_ID ? 'male-conversational' : 'male-warm';
  }
  if (
    normalizedStage.includes('plural') ||
    normalizedStage.includes('meaning') ||
    normalizedStage.includes('people') ||
    normalizedStage.includes('family') ||
    normalizedStage.includes('pronoun')
  ) {
    return 'female-warm';
  }
  if (
    normalizedStage.includes('listen') ||
    normalizedStage.includes('picture') ||
    normalizedStage.includes('what is it')
  ) {
    return lessonId === THIRD_LESSON_ID || lessonId === FOURTH_LESSON_ID ? 'female-teacher' : 'male-conversational';
  }

  // Keep uncategorized future stages stable while still alternating the cast.
  const checksum = `${lessonId}:${normalizedStage}`
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const cast: CourseAudioVoice[] = ['female-warm', 'male-warm', 'female-teacher', 'male-conversational'];
  return cast[checksum % cast.length];
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
  narrator: CourseAudioVoice = 'female-teacher',
): string {
  const query = new URLSearchParams({
    text,
    mode,
    lang: 'en-US',
    variant,
    profile: COURSE_AUDIO_PROFILE,
    provider,
    narrator,
  });
  return `${API_BASE_URL}/api/audio/course?${query.toString()}`;
}
