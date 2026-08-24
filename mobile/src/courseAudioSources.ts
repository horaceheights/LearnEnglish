import type { AudioSource } from 'expo-audio';

import {
  courseAudioUrl,
  type CourseAudioProvider,
  type CourseAudioVoice,
} from './config';

// Metro needs literal require calls so corrected, approved pronunciation takes
// can replace a malformed generated clip immediately in a Preview OTA.
const BUNDLED_COURSE_AUDIO: Record<string, AudioSource> = {
  'Are\nprompt\nprompt\nfemale-teacher': require('../assets/course-audio/are-female-teacher.mp3'),
};

export function courseAudioSource(
  text: string,
  mode: string,
  variant: string,
  provider: CourseAudioProvider,
  narrator: CourseAudioVoice,
): AudioSource {
  const key = [text.trim(), mode, variant, narrator].join('\n');
  return BUNDLED_COURSE_AUDIO[key]
    ?? courseAudioUrl(text, mode, variant, provider, narrator);
}
