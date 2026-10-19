import type { LessonSummary } from './types';
import type { TutorContext, TutorMessage } from './lessonTutor';
export type PracticeMode = 'short' | 'extended';
export type PracticeContext = TutorContext & { review_mode: PracticeMode; review_unit_id: string };
export const PRACTICE_START = 'Iniciar el repaso con Liam.';
export const PRACTICE_LIMITS = { short: 3, extended: 6 } as const;
// Deferred until after the MVP (2026-10-19). Keep both clients' menu/result
// entries off; preserve the prototype for a separately approved later phase.
export const PRACTICE_POC_UNITS: readonly string[] = [];
export const practiceAvailable = (lesson?: LessonSummary) => Boolean(lesson?.unit_id && PRACTICE_POC_UNITS.includes(lesson.unit_id));
export const practiceUnitLabel = (lesson: LessonSummary) => `Unidad ${lesson.unit_id?.match(/\d+/)?.[0] || ''}`.trim();
export function practiceAfterLesson(lesson: LessonSummary, catalog: LessonSummary[]) {
  return practiceAvailable(lesson) && catalog.filter(item => item.unit_id === lesson.unit_id).at(-1)?.id === lesson.id;
}
export function practiceContext(lesson: LessonSummary, mode: PracticeMode): PracticeContext {
  return { lesson_id: lesson.id, content_revision: lesson.content_revision,
    slide_id: '', selected_option_ids: [], review_mode: mode, review_unit_id: lesson.unit_id || '' };
}
export function practiceProgress(messages: TutorMessage[], mode: PracticeMode, busy: boolean, error: string) {
  const answers = messages.filter(message => message.role === 'user').length;
  const limit = PRACTICE_LIMITS[mode];
  return { answers, limit, complete: !busy && !error && answers >= limit && messages.at(-1)?.role === 'assistant' };
}
export type PracticePresentation = {
  answers: number; limit: number; complete: boolean;
  speak: (context: TutorContext, text: string, signal: AbortSignal, onAudio: (audio: string) => void) => Promise<unknown>;
  transcribe: (context: TutorContext, audio: string, format: string, signal: AbortSignal) => Promise<string>;
};
