import * as Updates from 'expo-updates';

import a1Course from './generated/a1-course.json';
import type { ChoiceOption, Lesson, LessonSummary } from './types';

const PREVIEW_LESSONS: Record<string, Lesson> = Object.fromEntries(
  (a1Course as Lesson[]).map((lesson) => [lesson.id, lesson]),
);

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
    summaries.push(summary);
  }

  return summaries
    .sort((left, right) => {
      const leftParts = (left.sub_lesson_id || '').split('.').map(Number);
      const rightParts = (right.sub_lesson_id || '').split('.').map(Number);
      return (leftParts[0] || 999) - (rightParts[0] || 999)
        || (leftParts[1] || 999) - (rightParts[1] || 999);
    });
}
