import * as Updates from 'expo-updates';

import lessonOne from './generated/lesson-1-people-actions.json';
import type { ChoiceOption, Lesson } from './types';

const PREVIEW_LESSONS: Record<string, Lesson> = {
  [lessonOne.id]: lessonOne as Lesson,
};

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
