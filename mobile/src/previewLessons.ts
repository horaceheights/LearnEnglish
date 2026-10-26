import * as Updates from 'expo-updates';

import bundledCourses from './generated/all-courses.json';
import courseCatalogs from './generated/course-catalogs.json';
import type { ChoiceOption, Lesson, LessonSummary } from './types';

const PREVIEW_LESSONS: Record<string, Lesson> = Object.fromEntries(
  (bundledCourses as Lesson[]).map((lesson) => [lesson.id, lesson]),
);
export const previewCourseCatalogs = courseCatalogs;
const lessonCourses = new Map(courseCatalogs.flatMap(course => course.lessonIds.map(id => [id, course.id] as const)));

function shuffledOptions(options: ChoiceOption[]): ChoiceOption[] {
  const shuffled = options.map((option) => ({ ...option }));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function lessonCopy(lesson: Lesson): Lesson {
  return {
    ...lesson,
    vocabulary: [...lesson.vocabulary],
    cards: lesson.cards.map((card) => ({
      ...card,
      options: shuffledOptions(card.options),
    })),
  };
}

/**
 * Preview must be able to review new lesson content before the shared Render
 * backend changes. Production continues to use the backend lesson catalog.
 */
export function getPreviewLesson(lessonId: string): Lesson | null {
  if (Updates.channel !== 'preview') return null;
  const lesson = PREVIEW_LESSONS[lessonId];
  return lesson ? lessonCopy(lesson) : null;
}

export function getPreviewLessonMetadata(lessonId: string): Lesson | null {
  if (Updates.channel !== 'preview') return null;
  return PREVIEW_LESSONS[lessonId] || null;
}

export function mergePreviewLessonSummaries(backendLessons: LessonSummary[]): LessonSummary[] {
  if (Updates.channel !== 'preview') return backendLessons;

  const summaries: LessonSummary[] = [];
  for (const lesson of Object.values(PREVIEW_LESSONS)) {
    const { cards: _cards, goal: _goal, vocabulary: _vocabulary, ...summary } = lesson;
    summaries.push({ ...summary, course_id: lessonCourses.get(lesson.id) });
  }

  // The exporter preserves configured course order and numeric lesson order.
  return summaries;
}
