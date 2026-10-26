import type { CourseAudioTurn, LessonCard, TeachingClock } from './types';

export function clockAngles(cue: TeachingClock) {
  if (!Number.isInteger(cue.hour) || cue.hour < 1 || cue.hour > 12
    || !Number.isInteger(cue.minute) || cue.minute < 0 || cue.minute > 59) {
    throw new Error('A clock needs an explicitly authored time.');
  }
  return { hour: (cue.hour % 12) * 30 + cue.minute * 0.5, minute: cue.minute * 6 };
}

/** Listening and mission decisions never disclose assessed times upfront. */
export function visibleClockCues(card: LessonCard, cues: TeachingClock[] | undefined, correct: boolean) {
  if ((card.stage === 'Listen' || card.mission_game?.kind === 'conversation-decision') && !correct) return [];
  return cues ?? [];
}

export function cardClockCues(card: LessonCard, turn?: CourseAudioTurn | null) {
  // An explicit turn with no clock clears the previous turn's time evidence.
  return turn ? turn.clock_cues ?? [] : card.clock_cues ?? card.audio_turns?.[0]?.clock_cues ?? [];
}
