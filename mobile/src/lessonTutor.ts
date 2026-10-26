import type { Lesson, LessonCard } from './types';

// Every canonical lesson inherits the tutor; the server validates its ID/revision.
export const TUTOR_SUGGESTIONS = ['Explica la gramática más a fondo', 'Dame otro ejemplo', 'Explícalo más fácil'];
export type TutorContext = {
  lesson_id: string; slide_id: string; content_revision: number; selected_option_ids: string[];
  mission_cue_index?: number; mission_target_id?: string;
};
export type TutorMissionFocus = { slide_id: string; cue_index: number; target_id?: string };
export type TutorMessage = { role: 'user' | 'assistant'; content: string };
export type TutorTransport = (context: TutorContext, message: string, history: TutorMessage[], signal: AbortSignal) => Promise<{ reply: string }>;

export function tutorCardContext(lesson: Lesson, card: LessonCard, result: 'correct' | 'wrong' | null, selected: string[], mission?: TutorMissionFocus | null): TutorContext {
  const focus = card.mission_game && !['voice-gate', 'conversation-decision'].includes(card.mission_game.kind) && mission?.slide_id === card.slide_id ? mission : null;
  return { lesson_id: lesson.id, slide_id: card.slide_id || '', content_revision: lesson.content_revision,
    selected_option_ids: result && !focus ? selected.filter(Boolean) : [],
    ...(focus ? { mission_cue_index: focus.cue_index, ...(focus.target_id ? { mission_target_id: focus.target_id } : {}) } : {}) };
}

export function tutorSubmittedAnswer(card: LessonCard, context: TutorContext) {
  const target = context.mission_target_id && card.mission_game?.targets.find(item => item.id === context.mission_target_id);
  const ids = target ? target.accepted_option_ids : context.selected_option_ids;
  return ids.map(id => card.options.find(option => option.id === id)?.label || '').join(target ? ' / ' : ' ');
}

export function tutorContextKey(context: TutorContext) {
  return JSON.stringify(context);
}

export function tutorOpeningQuestion(context: TutorContext) {
  return context.selected_option_ids.length || context.mission_target_id
    ? 'Explica solo la diferencia clave de mi respuesta en una frase corta y añade dos ejemplos breves. Máximo 45 palabras en total; no copies ni traduzcas las frases completas.'
    : 'Dame una pista corta para entender esta tarjeta, sin decirme cuál respuesta elegir. Máximo 35 palabras, sin pregunta de cierre.';
}
