import photoSpeakers from './photoSpeakers.json';
import type { CourseAudioTurn, LessonCard } from './types';

/**
 * The speaker bubble (user decision, 2026-11-12) marks who is talking in a lesson photo that shows
 * two or more people, so a first-person line (*This is my older brother.*) points at its speaker.
 * The photo must still read on its own; the bubble is an app layer, never part of the picture.
 * Web and mobile share these rules.
 */
export type SpeakerAnchor = { x: number; y: number };
export type PhotoSpeakerRecord = {
  sha256: string;
  people: number;
  owner: string | null;
  anchors: Record<string, SpeakerAnchor>;
  observed: string;
};
export type PhotoSpeakerRegistry = { version: number; description: string; photos: Record<string, PhotoSpeakerRecord> };
export type BubbleLayout = { left: number; top: number; width: number; height: number; tail: number; tailX: number };

/** Lines in these voices are said by a pictured cast member; narration never gets a bubble. */
export const CAST_SPEAKERS = ['ana', 'luis', 'sofia', 'diego'] as const;
/** The complete runtime photo is 3:2, and every lesson frame shows it with a centred cover crop. */
export const PHOTO_ASPECT = 3 / 2;

const REGISTRY = photoSpeakers as PhotoSpeakerRegistry;

type SpeakerCard = Pick<LessonCard, 'stage' | 'interaction_type' | 'audio_speaker' | 'answer_audio_speaker'
  | 'audio_turns' | 'answer_audio_turns' | 'mission_game'>;

export function isCastSpeaker(role: string | null | undefined): boolean {
  return Boolean(role && (CAST_SPEAKERS as readonly string[]).includes(role));
}

function isMission(card: SpeakerCard) {
  return Boolean(card.mission_game) || (card.interaction_type ?? '').startsWith('mission-');
}

/** Whether any line on the card is said by a pictured cast member. */
export function cardHasCastLine(card: SpeakerCard | null | undefined): boolean {
  if (!card || isMission(card)) return false;
  return [card.audio_speaker, card.answer_audio_speaker,
    ...(card.audio_turns ?? []).map(turn => turn.speaker_role),
    ...(card.answer_audio_turns ?? []).map(turn => turn.speaker_role)].some(isCastSpeaker);
}

/**
 * Who says the line a card's own photo shows right now: the turn that is playing, otherwise the
 * card's single line. Missions keep their own markers.
 */
export function lineSpeaker(card: SpeakerCard | null | undefined, activeTurn?: Pick<CourseAudioTurn, 'speaker_role'> | null) {
  if (!card || isMission(card)) return null;
  if (activeTurn) return activeTurn.speaker_role || null;
  return card.audio_speaker || card.answer_audio_speaker || null;
}

/**
 * On a picture choice each photo marks its own speaker, the cast member whose line it was made for.
 * Marking only the voice that plays would single out the answer (only Diego's photo would carry a
 * bubble for *I have one brother.*).
 */
export function optionSpeaker(card: SpeakerCard | null | undefined, imageUrl: string | null | undefined) {
  if (!imageUrl || !cardHasCastLine(card)) return null;
  return REGISTRY.photos[imageUrl]?.owner ?? null;
}

/** The reviewed crown of `role` in the photo, or null when no bubble belongs on it. */
export function speakerAnchor(imageUrl: string | null | undefined, role: string | null | undefined): SpeakerAnchor | null {
  if (!imageUrl || !isCastSpeaker(role)) return null;
  const photo = REGISTRY.photos[imageUrl];
  // A one-person photo already shows who is talking.
  if (!photo || photo.people < 2) return null;
  return photo.anchors[role as string] ?? null;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Places the bubble in a frame that shows the 3:2 photo with a centred cover crop: its tail points
 * down at the crown and the bubble stays inside the frame. Returns null when the crown is cropped
 * away (the centred 4:5 grid cell keeps only the middle 53% of the photo's width).
 */
export function bubbleLayout(anchor: SpeakerAnchor | null | undefined, frameWidth: number, frameHeight: number): BubbleLayout | null {
  if (!anchor || !(frameWidth > 0) || !(frameHeight > 0)) return null;
  const photoHeight = Math.max(frameWidth / PHOTO_ASPECT, frameHeight);
  const photoWidth = photoHeight * PHOTO_ASPECT;
  const x = (frameWidth - photoWidth) / 2 + anchor.x * photoWidth;
  const y = (frameHeight - photoHeight) / 2 + anchor.y * photoHeight;
  if (x < 0 || x > frameWidth || y < 0 || y > frameHeight) return null;
  const width = clamp(frameWidth * 0.11, 24, 44);
  const height = Math.round(width * 0.7);
  const tail = Math.round(width * 0.24);
  const gap = Math.max(2, photoHeight * 0.012);
  const top = Math.max(2, y - gap - tail - height);
  const left = clamp(x - width / 2, 2, Math.max(2, frameWidth - width - 2));
  const tailX = clamp(x - left, width * 0.3, width * 0.7);
  return { left, top, width, height, tail, tailX };
}
