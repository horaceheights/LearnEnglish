import type { AudioSource } from 'expo-audio';

import { courseAudioAssetUrl } from './config';
import type { CourseAudioAsset, LessonCard } from './types';

export function courseAudioAssetSource(asset: CourseAudioAsset): AudioSource {
  return courseAudioAssetUrl(asset.id);
}

export function findCourseAudioAsset(
  card: LessonCard,
  purpose: string,
  mode?: string,
  variant?: string,
  text?: string,
): CourseAudioAsset | null {
  const normalizedText = text?.trim();
  const exact = card.audio_assets.find((asset) => (
    asset.purpose === purpose
    && (!mode || asset.mode === mode)
    && (!variant || asset.variant === variant)
    && (!normalizedText || asset.text === normalizedText)
  ));
  if (exact || normalizedText) return exact ?? null;
  return card.audio_assets.find((asset) => asset.purpose === purpose) ?? null;
}

export function completionPromptAudioSource(
  card: LessonCard,
): AudioSource | null {
  const asset = findCourseAudioAsset(card, 'prompt', 'prompt', 'completion-prompt');
  return asset ? courseAudioAssetSource(asset) : null;
}
