import type { AudioSource } from 'expo-audio';

import {
  completionPromptAudioUrl,
  courseAudioUrl,
  type CourseAudioProvider,
  type CourseAudioVoice,
} from './config';
import type { LessonCard } from './types';

// Metro needs literal require calls so corrected, approved pronunciation takes
// can replace a malformed generated clip immediately in a Preview OTA.
const BUNDLED_COURSE_AUDIO: Record<string, AudioSource> = {
  'Are\nprompt\nprompt\nfemale-teacher': require('../assets/course-audio/are-female-teacher.mp3'),
  'One\nprompt\nprompt\nfemale-warm': require('../assets/course-audio/one-corrected.mp3'),
  'They\nprompt\nprompt\nfemale-warm': require('../assets/course-audio/they-female-warm.mp3'),
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

export function completionPromptAudioSource(
  card: LessonCard,
  provider: CourseAudioProvider,
  narrator: CourseAudioVoice,
): AudioSource | null {
  const correctOption = card.options.find((option) => option.id === card.correct_option_id);
  const fullText = card.answer_audio_text?.trim() ?? '';
  const blankText = correctOption?.label?.trim() ?? '';
  if (!fullText || !blankText) return null;

  try {
    return completionPromptAudioUrl(
      card.prompt,
      fullText,
      blankText,
      'prompt',
      'completion-prompt',
      provider,
      narrator,
    );
  } catch {
    // Invalid authored content must fail silent. Never fall back to sending a
    // visual placeholder or an unfinished phrase to a speech provider.
    return null;
  }
}
