/** Shared geometry and preferences for the optional lesson tutor. */
export const TUTOR_BUTTON_SIZE = 48;
export const TUTOR_DRAG_THRESHOLD = 6;
export const TUTOR_VOICE_PREFERENCE_KEY = 'spanglish:tutor:voice:v1';
export type TutorActivityState = 'available' | 'thinking' | 'listening' | 'speaking';
export type TutorPoint = { x: number; y: number };
export type TutorBounds = { left: number; top: number; right: number; bottom: number };

export function clampTutorPosition(point: TutorPoint, bounds: TutorBounds): TutorPoint {
  return {
    x: Math.max(bounds.left, Math.min(point.x, Math.max(bounds.left, bounds.right - TUTOR_BUTTON_SIZE))),
    y: Math.max(bounds.top, Math.min(point.y, Math.max(bounds.top, bounds.bottom - TUTOR_BUTTON_SIZE))),
  };
}
export function initialTutorPosition(bounds: TutorBounds): TutorPoint {
  return clampTutorPosition({ x: bounds.right - TUTOR_BUTTON_SIZE, y: bounds.top + 16 }, bounds);
}
export function tutorDragMoved(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > TUTOR_DRAG_THRESHOLD;
}
