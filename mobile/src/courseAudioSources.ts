import type { AudioSource } from 'expo-audio';

import {
  courseAudioAssetIdFromVoice,
  courseAudioAssetUrl,
  type CourseAudioProvider,
  type CourseAudioVoice,
} from './config';
import type { CourseAudioAsset, CourseAudioTurn, LessonCard } from './types';

export type CourseAudioTurnPlayback = {
  asset: CourseAudioAsset;
  turn: CourseAudioTurn;
};

export function courseAudioAssetSource(asset: CourseAudioAsset): AudioSource {
  return courseAudioAssetUrl(asset.id);
}

export function courseAudioSource(
  text: string,
  mode: string,
  variant: string,
  provider: CourseAudioProvider,
  narrator: CourseAudioVoice,
): AudioSource {
  const assetId = courseAudioAssetIdFromVoice(narrator);
  if (
    provider !== 'persistent-asset'
    || mode !== 'pronunciation_slow'
    || variant !== 'split-ing'
    || !text.trim()
    || !assetId
  ) {
    throw new Error('Pronunciation audio requires an exact immutable persistent asset.');
  }
  return courseAudioAssetUrl(assetId);
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
  if (exact || normalizedText || mode || variant) return exact ?? null;
  return card.audio_assets.find((asset) => asset.purpose === purpose) ?? null;
}

/** Resolve authored dialogue into exact immutable audio/image pairs. */
export function findCourseAudioTurnSequence(
  card: LessonCard,
  purpose: 'prompt' | 'answer',
): CourseAudioTurnPlayback[] | null {
  const turns = purpose === 'prompt' ? card.audio_turns : card.answer_audio_turns;
  if (!turns?.length) return null;

  const sequence: CourseAudioTurnPlayback[] = [];
  const claimedAssetIds = new Set<string>();
  for (const [index, turn] of turns.entries()) {
    const turnPurpose = `${purpose}-turn-${index + 1}`;
    const matches = card.audio_assets.filter((asset) => (
      asset.purpose === turnPurpose
      && asset.text === turn.text
      && asset.speaker_role === turn.speaker_role
      && asset.image_ref === turn.image_url
    ));
    if (matches.length !== 1 || claimedAssetIds.has(matches[0].id)) return null;
    claimedAssetIds.add(matches[0].id);
    sequence.push({ asset: matches[0], turn });
  }
  return sequence;
}

export function completionPromptAudioSource(
  card: LessonCard,
): AudioSource | null {
  const asset = findCourseAudioAsset(card, 'prompt', 'prompt', 'completion-prompt');
  return asset ? courseAudioAssetSource(asset) : null;
}
