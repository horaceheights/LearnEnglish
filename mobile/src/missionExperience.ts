import type { Lesson, MissionChapter, MissionLesson } from './types';

export type MissionChapterProgress = MissionChapter & {
  cardCount: number;
  completedCardCount: number;
  endIndex: number;
  isActive: boolean;
  isComplete: boolean;
  isUnlocked: boolean;
  startIndex: number;
};

export type LessonNavigationGroup = {
  cardIndexes: number[];
  description?: string;
  id: string;
  kind: 'chapter' | 'stage';
  label: string;
};

export function isMissionLesson(lesson: Lesson | null | undefined): lesson is MissionLesson {
  if (
    !lesson
    || lesson.experience_type !== 'mission'
    || !lesson.mission
    || !Number.isInteger(lesson.content_revision)
    || (lesson.content_revision || 0) < 1
    || !Array.isArray(lesson.mission.chapters)
    || lesson.mission.chapters.length === 0
  ) {
    return false;
  }

  const chapterIds = lesson.mission.chapters.map((chapter) => chapter.id);
  if (
    chapterIds.some((id) => typeof id !== 'string' || !id.trim())
    || new Set(chapterIds).size !== chapterIds.length
  ) {
    return false;
  }

  const declaredChapterIds = new Set(chapterIds);
  const cardChapterIds = lesson.cards.map((card) => card.mission_chapter_id);
  if (cardChapterIds.some((id) => typeof id !== 'string' || !declaredChapterIds.has(id))) {
    return false;
  }

  const chapterRuns = cardChapterIds.filter((id, index) => id !== cardChapterIds[index - 1]);
  return chapterRuns.length === chapterIds.length
    && chapterRuns.every((id, index) => id === chapterIds[index]);
}

export function missionChapterProgress(
  lesson: Lesson | null | undefined,
  currentCardIndex: number,
  completedCardIndexes: ReadonlySet<number>,
  furthestCardIndex = currentCardIndex,
): MissionChapterProgress[] {
  if (!isMissionLesson(lesson)) return [];

  const boundedCurrentIndex = Math.min(
    Math.max(currentCardIndex, 0),
    Math.max(lesson.cards.length - 1, 0),
  );
  const boundedFurthestIndex = Math.min(
    Math.max(furthestCardIndex, boundedCurrentIndex),
    Math.max(lesson.cards.length - 1, 0),
  );
  const activeChapterId = lesson.cards[boundedCurrentIndex]?.mission_chapter_id;

  return lesson.mission.chapters.map((chapter) => {
    const cardIndexes = lesson.cards.flatMap((card, index) => (
      card.mission_chapter_id === chapter.id ? [index] : []
    ));
    const completedCardCount = cardIndexes.filter((index) => completedCardIndexes.has(index)).length;
    const startIndex = cardIndexes[0] ?? 0;
    const endIndex = cardIndexes[cardIndexes.length - 1] ?? startIndex;

    return {
      ...chapter,
      cardCount: cardIndexes.length,
      completedCardCount,
      endIndex,
      isActive: chapter.id === activeChapterId,
      isComplete: cardIndexes.length > 0 && completedCardCount === cardIndexes.length,
      isUnlocked: startIndex <= boundedFurthestIndex,
      startIndex,
    };
  });
}

export function lessonNavigationGroups(
  lesson: Lesson | null | undefined,
): LessonNavigationGroup[] {
  if (!lesson) return [];

  if (isMissionLesson(lesson)) {
    return lesson.mission.chapters.map((chapter) => ({
      cardIndexes: lesson.cards.flatMap((card, index) => (
        card.mission_chapter_id === chapter.id ? [index] : []
      )),
      description: chapter.objective,
      id: chapter.id,
      kind: 'chapter',
      label: chapter.title,
    }));
  }

  const groups: LessonNavigationGroup[] = [];
  lesson.cards.forEach((card, index) => {
    const existing = groups.find((group) => group.id === card.stage);
    if (existing) {
      existing.cardIndexes.push(index);
      return;
    }
    groups.push({
      cardIndexes: [index],
      id: card.stage,
      kind: 'stage',
      label: card.stage,
    });
  });
  return groups;
}
