import type { MissionGame, MissionGameTarget } from './types';
export type HeadMarker = {
  id: string; x: number; y: number; width: number; height: number;
  collective: boolean; heads: { x: number; y: number }[];
};
export type HeadScene = {
  width: number; height: number; imageWidth: number; imageHeight: number;
  imageX: number; imageY: number; markers: HeadMarker[];
};
export function missionCueOrder(game?: MissionGame, random?: () => number): number[];
export function fitMissionHeadScene(width: number, height: number, targets: MissionGameTarget[]): HeadScene | null;
