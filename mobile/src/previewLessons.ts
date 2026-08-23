import * as Updates from 'expo-updates';

import lessonOne from './generated/lesson-1-people-actions.json';
import lessonTwo from './generated/lesson-2-pronouns.json';
import lessonThree from './generated/lesson-3-two-people.json';
import lessonFour from './generated/lesson-4-children-siblings.json';
import lessonFive from './generated/lesson-5-parents-grandparents.json';
import lessonSix from './generated/lesson-6-family-actions.json';
import lessonSeven from './generated/lesson-7-is-are-not.json';
import lessonEight from './generated/lesson-8-who.json';
import lessonNine from './generated/lesson-9-unit-review.json';
import lessonTen from './generated/lesson-10-family-mission.json';
import lessonEleven from './generated/lesson-11-places-around-me.json';
import lessonTwelve from './generated/lesson-12-streets-and-transportation.json';
import lessonThirteen from './generated/lesson-13-common-objects.json';
import lessonFourteen from './generated/lesson-14-what-is-it.json';
import lessonFifteen from './generated/lesson-15-this-and-that.json';
import lessonSixteen from './generated/lesson-16-numbers-1-10.json';
import lessonSeventeen from './generated/lesson-17-basic-colors.json';
import lessonEighteen from './generated/lesson-18-count-and-describe.json';
import lessonNineteen from './generated/lesson-19-unit-2-review.json';
import lessonTwenty from './generated/lesson-20-around-me-mission.json';
import type { ChoiceOption, Lesson, LessonSummary } from './types';

const PREVIEW_LESSONS: Record<string, Lesson> = {
  [lessonOne.id]: lessonOne as Lesson,
  [lessonTwo.id]: lessonTwo as Lesson,
  [lessonThree.id]: lessonThree as Lesson,
  [lessonFour.id]: lessonFour as Lesson,
  [lessonFive.id]: lessonFive as Lesson,
  [lessonSix.id]: lessonSix as Lesson,
  [lessonSeven.id]: lessonSeven as Lesson,
  [lessonEight.id]: lessonEight as Lesson,
  [lessonNine.id]: lessonNine as Lesson,
  [lessonTen.id]: lessonTen as Lesson,
  [lessonEleven.id]: lessonEleven as Lesson,
  [lessonTwelve.id]: lessonTwelve as Lesson,
  [lessonThirteen.id]: lessonThirteen as Lesson,
  [lessonFourteen.id]: lessonFourteen as Lesson,
  [lessonFifteen.id]: lessonFifteen as Lesson,
  [lessonSixteen.id]: lessonSixteen as Lesson,
  [lessonSeventeen.id]: lessonSeventeen as Lesson,
  [lessonEighteen.id]: lessonEighteen as Lesson,
  [lessonNineteen.id]: lessonNineteen as Lesson,
  [lessonTwenty.id]: lessonTwenty as Lesson,
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
      const [leftUnit = 999, leftNumber = 999] = (left.sub_lesson_id || '')
        .split('.')
        .map(Number);
      const [rightUnit = 999, rightNumber = 999] = (right.sub_lesson_id || '')
        .split('.')
        .map(Number);
      return leftUnit - rightUnit || leftNumber - rightNumber;
    });
}
