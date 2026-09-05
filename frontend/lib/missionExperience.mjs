function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isMissionLesson(lesson) {
  if (
    !lesson
    || lesson.experience_type !== "mission"
    || !Number.isInteger(lesson.content_revision)
    || lesson.content_revision < 1
    || !lesson.mission
    || !Array.isArray(lesson.mission.chapters)
    || lesson.mission.chapters.length === 0
    || !Array.isArray(lesson.cards)
    || lesson.cards.length === 0
  ) {
    return false;
  }

  const requiredPresentation = [
    lesson.mission.label,
    lesson.mission.title,
    lesson.mission.briefing,
    lesson.mission.completion_title,
    lesson.mission.completion_message,
  ];
  if (!requiredPresentation.every(hasText)) return false;

  const chapters = lesson.mission.chapters;
  const chapterIds = chapters.map((chapter) => chapter?.id);
  if (
    chapters.some((chapter) => (
      !hasText(chapter?.id)
      || !hasText(chapter?.title)
      || !hasText(chapter?.objective)
    ))
    || new Set(chapterIds).size !== chapterIds.length
  ) {
    return false;
  }

  const declaredChapterIds = new Set(chapterIds);
  const cardChapterIds = lesson.cards.map((card) => card?.mission_chapter_id);
  if (cardChapterIds.some((id) => !declaredChapterIds.has(id))) return false;

  const chapterRuns = cardChapterIds.filter((id, index) => id !== cardChapterIds[index - 1]);
  return chapterRuns.length === chapterIds.length
    && chapterRuns.every((id, index) => id === chapterIds[index]);
}

export function missionChapterProgress(lesson, currentCardIndex) {
  if (!isMissionLesson(lesson)) return [];

  const finalCardIndex = lesson.cards.length - 1;
  const activeCardIndex = Math.min(Math.max(currentCardIndex, 0), finalCardIndex);
  const activeChapterId = lesson.cards[activeCardIndex].mission_chapter_id;

  return lesson.mission.chapters.map((chapter) => {
    const cardIndexes = lesson.cards.flatMap((card, index) => (
      card.mission_chapter_id === chapter.id ? [index] : []
    ));
    const startIndex = cardIndexes[0];
    const endIndex = cardIndexes[cardIndexes.length - 1];
    const completedCardCount = cardIndexes.filter((index) => index < currentCardIndex).length;

    return {
      ...chapter,
      cardCount: cardIndexes.length,
      completedCardCount,
      endIndex,
      isActive: chapter.id === activeChapterId,
      isComplete: currentCardIndex > endIndex,
      isUnlocked: currentCardIndex >= startIndex,
      startIndex,
    };
  });
}
