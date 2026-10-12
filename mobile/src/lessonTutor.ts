import type { Lesson, LessonCard } from './types';

// Rollout configuration, not a separate lesson implementation. Match server policy.
export const TUTOR_LESSON_IDS = ['lesson-1-people-actions'] as const;
export const tutorEnabled = (lessonId: string) => (TUTOR_LESSON_IDS as readonly string[]).includes(lessonId);
export const TUTOR_SUGGESTIONS = ['Explica la gramática más a fondo', 'Dame otro ejemplo', 'Explícalo más fácil'];
export type TutorContext = {
  lesson_id: string; slide_id: string; content_revision: number; selected_option_ids: string[];
};
export type TutorMessage = { role: 'user' | 'assistant'; content: string };
export type TutorTransport = (context: TutorContext, message: string, history: TutorMessage[], signal: AbortSignal) => Promise<{ reply: string }>;

export function tutorCardContext(lesson: Lesson, card: LessonCard, result: 'correct' | 'wrong' | null, selected: string[]): TutorContext {
  return { lesson_id: lesson.id, slide_id: card.slide_id || '', content_revision: lesson.content_revision,
    selected_option_ids: result ? selected.filter(Boolean) : [] };
}

export function tutorContextKey(context: TutorContext) {
  return JSON.stringify(context);
}

export function tutorOpeningQuestion(context: TutorContext) {
  return context.selected_option_ids.length
    ? 'Explícame mi respuesta y la diferencia con la esperada. Dame dos ejemplos sencillos si ayudan.'
    : 'Dame una pista para entender esta tarjeta, sin decirme cuál respuesta elegir.';
}
