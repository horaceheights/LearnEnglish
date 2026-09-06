import type { LessonCard } from './types';

export type MissionTileSlot = string | null;
export type MissionTileSlots = MissionTileSlot[];
export type MissionTileBoardMode = 'sequence' | 'targets';
export type MissionTileSlotWidth = '100%' | '47%' | '31%' | '23%';

export const MISSION_TILE_INTERACTIONS = new Set([
  'mission-word-parts',
  'mission-unlock',
  'mission-match',
  'mission-sentence',
  'mission-truth-stamp',
  'mission-finale',
]);

export function isMissionTileInteraction(interactionType?: string | null) {
  return MISSION_TILE_INTERACTIONS.has(interactionType || '');
}

export function isGuidedNoFailMissionCard(card: LessonCard) {
  return card.interaction_type === 'mission-unlock'
    && card.mission_tutorial_mode === 'guided-no-fail';
}

export function shouldSuppressMissionTilePromptAudio(card: LessonCard) {
  return isMissionTileInteraction(card.interaction_type) && !card.audio_text?.trim();
}

export type MissionKickoffTopBarLayout = 'inline' | 'stacked';

export function missionKickoffTopBarLayout(
  viewportWidth: number,
  fontScale: number,
): MissionKickoffTopBarLayout {
  return viewportWidth <= 360 || fontScale > 1.15 ? 'stacked' : 'inline';
}

export function orderedMissionCorrectIds(card: LessonCard) {
  if (card.mission_targets?.length) {
    return card.mission_targets.map((target) => target.correct_option_id);
  }
  return card.correct_option_ids?.length
    ? card.correct_option_ids
    : [card.correct_option_id];
}

export function missionTileBoardMode(card: LessonCard): MissionTileBoardMode {
  return card.mission_targets?.length ? 'targets' : 'sequence';
}

function missionCorrectLabels(card: LessonCard) {
  const optionById = new Map(card.options.map((option) => [option.id, option]));
  return orderedMissionCorrectIds(card).map((optionId) => (
    optionById.get(optionId)?.label?.trim() || optionId
  ));
}

export function missionTileSlotWidthForCard(
  card: LessonCard,
  viewportWidth: number,
  fontScale: number,
): MissionTileSlotWidth {
  if (viewportWidth <= 360 || fontScale > 1.15) return '100%';

  const correctIds = orderedMissionCorrectIds(card);
  const isShortThreeTileSequence = missionTileBoardMode(card) === 'sequence'
    && correctIds.length === 3
    && missionCorrectLabels(card).every((label) => label.length <= 8);
  if (isShortThreeTileSequence) return '31%';

  if (viewportWidth >= 720) {
    if (missionTileBoardMode(card) === 'targets' && correctIds.length === 3) return '31%';
    if (correctIds.length > 6) return '23%';
    if (correctIds.length > 3) return '31%';
  }
  return '47%';
}

/**
 * Returns a scroll-safe outer height for mission stills whose labeled targets
 * depend on seeing two or more local panels. LessonMediaFrame converts this
 * height back into a 3:2 width, so the frame stays inside the usable viewport.
 */
export function missionTargetImageMaxHeightForCard(
  card: LessonCard,
  viewportWidth: number,
  viewportHeight: number,
  fontScale: number,
  showHelp: boolean,
): number | null {
  if (!isMissionTileInteraction(card.interaction_type) || (card.mission_targets?.length || 0) < 2) {
    return null;
  }

  const frameChrome = 24;
  const isLandscape = viewportWidth > viewportHeight;
  const horizontalInset = isLandscape ? 56 : 48;
  const usableFrameWidth = Math.min(720, Math.max(96, viewportWidth - horizontalInset));
  const heightFromWidth = frameChrome + ((usableFrameWidth - frameChrome) * (2 / 3));
  const heightFromViewport = isLandscape
    ? Math.max(168, Math.min(480, viewportHeight * 0.58))
    : Math.max(190, Math.min(480, viewportHeight * 0.48));
  let height = Math.min(heightFromWidth, heightFromViewport);
  if (fontScale > 1.15) height *= 0.84;
  if (showHelp) height *= 0.7;
  return Math.max(96, Math.round(height));
}

export function emptyMissionTileSlots(count: number): MissionTileSlots {
  return Array.from({ length: Math.max(0, count) }, () => null);
}

export function missionTileSlotsForCard(card: LessonCard): MissionTileSlots {
  return emptyMissionTileSlots(orderedMissionCorrectIds(card).length);
}

export function sanitizeMissionTileSlots(
  slots: unknown,
  card: LessonCard,
): MissionTileSlots {
  const count = orderedMissionCorrectIds(card).length;
  if (!Array.isArray(slots)) return emptyMissionTileSlots(count);
  const optionIds = new Set(card.options.map((option) => option.id));
  const used = new Set<string>();
  const clean = slots.slice(0, count).map((value) => {
    if (typeof value !== 'string' || !optionIds.has(value) || used.has(value)) return null;
    used.add(value);
    return value;
  });
  while (clean.length < count) clean.push(null);
  if (isGuidedNoFailMissionCard(card)) {
    const expected = orderedMissionCorrectIds(card);
    const correctPrefix: string[] = [];
    for (let index = 0; index < clean.length; index += 1) {
      if (!clean[index] || clean[index] !== expected[index]) break;
      correctPrefix.push(clean[index] as string);
    }
    return [
      ...correctPrefix,
      ...emptyMissionTileSlots(count - correctPrefix.length),
    ];
  }
  if (missionTileBoardMode(card) === 'sequence') {
    const compact = clean.filter((value): value is string => Boolean(value));
    return [...compact, ...emptyMissionTileSlots(count - compact.length)];
  }
  return clean;
}

function clampSlotIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(Math.round(index), 0), length - 1);
}

export function insertMissionTile(
  slots: MissionTileSlots,
  optionId: string,
  targetIndex: number,
  mode: MissionTileBoardMode,
): MissionTileSlots {
  if (!slots.length || !optionId) return [...slots];
  const index = clampSlotIndex(targetIndex, slots.length);
  const currentIndex = slots.indexOf(optionId);

  if (mode === 'targets') {
    const next = [...slots];
    if (currentIndex === index) return next;
    if (currentIndex >= 0) {
      const displaced = next[index];
      next[index] = optionId;
      next[currentIndex] = displaced;
      return next;
    }
    next[index] = optionId;
    return next;
  }

  const compact = slots.filter((value): value is string => Boolean(value) && value !== optionId);
  const insertionIndex = Math.min(index, compact.length);
  compact.splice(insertionIndex, 0, optionId);
  const bounded = compact.slice(0, slots.length);
  return [...bounded, ...emptyMissionTileSlots(slots.length - bounded.length)];
}

export function moveMissionTile(
  slots: MissionTileSlots,
  fromIndex: number,
  targetIndex: number,
  mode: MissionTileBoardMode,
): MissionTileSlots {
  const source = clampSlotIndex(fromIndex, slots.length);
  const optionId = slots[source];
  if (!optionId) return [...slots];
  return insertMissionTile(slots, optionId, targetIndex, mode);
}

export function placeMissionTileForCard(
  card: LessonCard,
  slots: MissionTileSlots,
  optionId: string,
  targetIndex: number,
): MissionTileSlots {
  const mode = missionTileBoardMode(card);
  if (!isGuidedNoFailMissionCard(card)) {
    return insertMissionTile(slots, optionId, targetIndex, mode);
  }

  const nextIndex = slots.findIndex((value) => !value);
  const expected = orderedMissionCorrectIds(card);
  if (nextIndex < 0 || targetIndex !== nextIndex || optionId !== expected[nextIndex]) {
    return [...slots];
  }
  return insertMissionTile(slots, optionId, nextIndex, mode);
}

export function moveMissionTileForCard(
  card: LessonCard,
  slots: MissionTileSlots,
  fromIndex: number,
  targetIndex: number,
): MissionTileSlots {
  if (isGuidedNoFailMissionCard(card)) return [...slots];
  return moveMissionTile(slots, fromIndex, targetIndex, missionTileBoardMode(card));
}

export function removeMissionTile(
  slots: MissionTileSlots,
  index: number,
  mode: MissionTileBoardMode,
): MissionTileSlots {
  const source = clampSlotIndex(index, slots.length);
  if (!slots[source]) return [...slots];
  if (mode === 'targets') {
    const next = [...slots];
    next[source] = null;
    return next;
  }
  const compact = slots.filter((value, slotIndex): value is string => (
    slotIndex !== source && Boolean(value)
  ));
  return [...compact, ...emptyMissionTileSlots(slots.length - compact.length)];
}

export function removeMissionTileForCard(
  card: LessonCard,
  slots: MissionTileSlots,
  index: number,
): MissionTileSlots {
  if (isGuidedNoFailMissionCard(card)) {
    const lastFilledIndex = slots.reduce(
      (last, value, slotIndex) => value ? slotIndex : last,
      -1,
    );
    if (index !== lastFilledIndex) return [...slots];
  }
  return removeMissionTile(slots, index, missionTileBoardMode(card));
}

export function orderedMissionTileIds(slots: MissionTileSlots): string[] {
  return slots.filter((value): value is string => Boolean(value));
}

export function missionTileBoardIsFull(slots: MissionTileSlots) {
  return slots.length > 0 && slots.every(Boolean);
}

export function missionTileBoardIsCorrect(card: LessonCard, slots: MissionTileSlots) {
  if (!missionTileBoardIsFull(slots)) return false;
  const expected = orderedMissionCorrectIds(card);
  return slots.every((optionId, index) => optionId === expected[index]);
}

export function missionTileBoardCanCheck(card: LessonCard, slots: MissionTileSlots) {
  if (!missionTileBoardIsFull(slots)) return false;
  return !isGuidedNoFailMissionCard(card) || missionTileBoardIsCorrect(card, slots);
}
