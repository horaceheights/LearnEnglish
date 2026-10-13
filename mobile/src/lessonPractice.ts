import type { Lesson } from './types';
import type { TutorContext, TutorMessage } from './lessonTutor';
export type PracticeMode = 'short' | 'extended';
export type PracticeContext = TutorContext & { review_mode: PracticeMode };
export const PRACTICE_START = 'Iniciar el repaso con Liam.';
export const PRACTICE_LIMITS = { short: 3, extended: 6 } as const;
// Rollout configuration only; the engine and server context are lesson-independent.
export const PRACTICE_POC_LESSONS = ['lesson-1-people-actions'];
export const practiceAvailable = (lesson?: Lesson) => Boolean(lesson && PRACTICE_POC_LESSONS.includes(lesson.id));
export function practiceContext(lesson: Lesson, mode: PracticeMode): PracticeContext {
  return { lesson_id: lesson.id, content_revision: lesson.content_revision,
    slide_id: lesson.cards[0].slide_id || '', selected_option_ids: [], review_mode: mode };
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
