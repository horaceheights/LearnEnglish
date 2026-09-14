import type { Lesson, MissionGame } from './types';

export type MissionVoiceProgress = {
  question: string;
  step: number;
  total: number;
  heading: string;
  instruction: string;
  successLabel: string;
};
export function missionVoiceProgress(lesson: Lesson | null | undefined, cardIndex: number): MissionVoiceProgress | null;
export function missionChallengeLabel(game?: MissionGame): string;
export function missionFinale(lesson: Lesson | null | undefined): { imageUrl: string; phrase: string };
