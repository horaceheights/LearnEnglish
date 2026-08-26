export const API_BASE_URL = 'https://learnenglish-fxki.onrender.com';
// Identifies this app to the backend so a stranger's script can't call
// the API directly. It is not a per-user secret -- it ships inside the
// compiled app like any client-embedded key -- but it stops opportunistic
// abuse of the paid speech/audio endpoints and of learner data endpoints.
export const APP_API_KEY = 'Lka_Ecgoda6om-OagWcyG0AK-zrmiD1c';
export const VIDEO_BASE_URL = 'https://learn-english-orcin.vercel.app';
export const PRIVACY_POLICY_URL = `${API_BASE_URL}/privacy`;
export const ACCOUNT_DELETION_URL = `${API_BASE_URL}/delete-account`;
export const FIRST_LESSON_ID = 'lesson-1-people-actions';
export const SECOND_LESSON_ID = 'lesson-2-pronouns';
export const THIRD_LESSON_ID = 'lesson-3-two-people';
export const FOURTH_LESSON_ID = 'lesson-4-children-siblings';
export const FIFTH_LESSON_ID = 'lesson-5-parents-grandparents';
// Keep an explicit extension in native audio URLs. AVPlayer on iOS can fail
// extensionless media endpoints even when their Content-Type is correct.
export const READY_CUE_URL = `${API_BASE_URL}/api/audio/ready-cue.wav?key=${APP_API_KEY}`;
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
    (lessonId === FOURTH_LESSON_ID || lessonId === FIFTH_LESSON_ID) &&
    (normalizedStage.includes('action') || normalizedStage.includes('listen'))
  ) {
    return 'female-teacher';
  }
  if (
    normalizedStage.includes('pronunciation') ||
    normalizedStage === 'speak' ||
    normalizedStage === 'learn' ||
    normalizedStage.includes('vocab') ||
    normalizedStage.includes('new word')
  ) {
    return 'female-teacher';
  }
  if (
    normalizedStage.includes('action') ||
    normalizedStage === 'use' ||
    normalizedStage.includes('grammar') ||
    normalizedStage.includes('pattern') ||
    normalizedStage.includes('negation')
  ) {
    return lessonId === SECOND_LESSON_ID ? 'male-conversational' : 'male-warm';
  }
  if (
    normalizedStage.includes('plural') ||
    normalizedStage === 'recognize' ||
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
    return lessonId === FOURTH_LESSON_ID || lessonId === FIFTH_LESSON_ID ? 'female-teacher' : 'male-conversational';
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

const LESSON_VIDEO_CACHE_VERSION = '20260824-two-card-match-v7';

export function lessonVideoUrl(name: string): string {
  return `${VIDEO_BASE_URL}/lesson-assets/${encodeURIComponent(name)}?v=${LESSON_VIDEO_CACHE_VERSION}`;
}

export function hasVisualAudioPlaceholder(text: string): boolean {
  return /_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/i.test(String(text || ''));
}

export function completionPromptAudioUrl(
  visualPrompt: string,
  fullText: string,
  blankText: string,
  mode = 'prompt',
  variant = 'completion-prompt',
  provider: CourseAudioProvider = 'elevenlabs-premium',
  narrator: CourseAudioVoice = 'female-teacher',
): string {
  const visual = String(visualPrompt || '');
  const completed = String(fullText || '').trim();
  const answer = String(blankText || '').trim();
  const placeholders = [...visual.matchAll(/_+|\.{3}|…|\{\s*blank\s*\}|\[\s*(?:blank|pause)\s*\]/gi)];
  if (placeholders.length !== 1) {
    throw new Error('Completion prompt audio requires exactly one visual placeholder.');
  }
  if (!completed || !answer || hasVisualAudioPlaceholder(completed) || hasVisualAudioPlaceholder(answer)) {
    throw new Error('Completion prompt audio requires clean completed and blank text.');
  }

  const placeholder = placeholders[0];
  const prefix = visual.slice(0, placeholder.index);
  const suffix = visual.slice((placeholder.index ?? 0) + placeholder[0].length);
  if (`${prefix}${answer}${suffix}`.trim() !== completed) {
    throw new Error('Completion prompt audio must match the full completed sentence exactly.');
  }

  const query = new URLSearchParams({
    visual_prompt: visual,
    full_text: completed,
    blank_text: answer,
    mode,
    lang: 'en-US',
    variant,
    profile: COURSE_AUDIO_PROFILE,
    provider,
    narrator,
    key: APP_API_KEY,
  });
  return `${API_BASE_URL}/api/audio/course-completion.mp3?${query.toString()}`;
}

export function sanitizeCourseAudioText(text: string): string {
  const spokenText = String(text || '').replace(/\s+/g, ' ').trim();
  if (hasVisualAudioPlaceholder(spokenText)) {
    throw new Error('Completion placeholders are visual only and cannot be sent to course audio.');
  }
  return spokenText;
}

export function courseAudioUrl(
  text: string,
  mode = 'prompt',
  variant = 'default',
  provider: CourseAudioProvider = 'openai',
  narrator: CourseAudioVoice = 'female-teacher',
): string {
  const spokenText = sanitizeCourseAudioText(text);
  const query = new URLSearchParams({
    text: spokenText,
    mode,
    lang: 'en-US',
    variant,
    profile: COURSE_AUDIO_PROFILE,
    provider,
    narrator,
    key: APP_API_KEY,
  });
  return `${API_BASE_URL}/api/audio/course.mp3?${query.toString()}`;
}
