export const MISSION_SCENE_ASPECT_RATIO = 3 / 2;
export const MISSION_SCENE_BORDER_WIDTH = 4;
export const MISSION_PERSON_TARGET_SIZE = 58;

const COLLECTIVE_TARGET_LABELS = new Set(['Grupo', 'Pareja', 'Familia']);

export type MissionSceneFrame = {
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
};

export function fitMissionSceneFrame(
  availableWidth: number,
  availableHeight: number,
  borderWidth = MISSION_SCENE_BORDER_WIDTH,
): MissionSceneFrame {
  const safeWidth = Math.max(0, availableWidth);
  const safeHeight = Math.max(0, availableHeight);
  const borderInset = Math.max(0, borderWidth) * 2;
  const maxCanvasWidth = Math.max(0, safeWidth - borderInset);
  const maxCanvasHeight = Math.max(0, safeHeight - borderInset);

  if (!maxCanvasWidth || !maxCanvasHeight) {
    return { canvasHeight: 0, canvasWidth: 0, height: 0, width: 0 };
  }

  const canvasWidth = Math.min(
    maxCanvasWidth,
    maxCanvasHeight * MISSION_SCENE_ASPECT_RATIO,
  );
  const canvasHeight = canvasWidth / MISSION_SCENE_ASPECT_RATIO;

  return {
    canvasHeight,
    canvasWidth,
    height: canvasHeight + borderInset,
    width: canvasWidth + borderInset,
  };
}

export function isCollectiveMissionTarget(labelEs: string): boolean {
  return COLLECTIVE_TARGET_LABELS.has(labelEs);
}

export function missionPersonTargetSize(canvasWidth: number): number {
  return Math.min(MISSION_PERSON_TARGET_SIZE, Math.max(44, canvasWidth * 0.17));
}

export function missionTargetTouchWidth(canvasWidth: number, collective: boolean): number {
  const personSize = missionPersonTargetSize(canvasWidth);
  if (!collective) return personSize;
  return Math.min(132, Math.max(personSize + 22, canvasWidth * 0.24));
}
