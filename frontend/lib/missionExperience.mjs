function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function missionAnswerWatchdogDelay(estimatedPlaybackMs) {
  const safeEstimate = Math.max(0, finiteNumber(estimatedPlaybackMs));
  return Math.min(60000, Math.max(8000, safeEstimate + 3000));
}

export function clampMissionDragPreview({
  clientX,
  clientY,
  grabOffsetX,
  grabOffsetY,
  tileWidth,
  tileHeight,
  viewportLeft = 0,
  viewportTop = 0,
  viewportWidth,
  viewportHeight,
  padding = 8,
}) {
  const safePadding = Math.max(0, finiteNumber(padding));
  const safeViewportLeft = finiteNumber(viewportLeft);
  const safeViewportTop = finiteNumber(viewportTop);
  const safeViewportWidth = Math.max(0, finiteNumber(viewportWidth));
  const safeViewportHeight = Math.max(0, finiteNumber(viewportHeight));
  const usableWidth = Math.max(0, safeViewportWidth - safePadding * 2);
  const usableHeight = Math.max(0, safeViewportHeight - safePadding * 2);
  const width = Math.min(Math.max(0, finiteNumber(tileWidth)), usableWidth);
  const height = Math.min(Math.max(0, finiteNumber(tileHeight)), usableHeight);
  const minLeft = safeViewportLeft + safePadding;
  const minTop = safeViewportTop + safePadding;
  const maxLeft = minLeft + Math.max(0, usableWidth - width);
  const maxTop = minTop + Math.max(0, usableHeight - height);
  const desiredLeft = finiteNumber(clientX) - finiteNumber(grabOffsetX);
  const desiredTop = finiteNumber(clientY) - finiteNumber(grabOffsetY);

  return {
    height,
    left: Math.min(Math.max(desiredLeft, minLeft), maxLeft),
    top: Math.min(Math.max(desiredTop, minTop), maxTop),
    width,
  };
}

export const MISSION_TILE_INTERACTIONS = Object.freeze([
  "mission-word-parts",
  "mission-unlock",
  "mission-match",
  "mission-sentence",
  "mission-truth-stamp",
  "mission-finale",
]);

export function isMissionTileInteraction(interactionType) {
  return MISSION_TILE_INTERACTIONS.includes(interactionType);
}

export function missionTargetsForCard(card) {
  if (!Array.isArray(card?.mission_targets)) return [];

  const optionIds = new Set((card.options || []).map((option) => option?.id));
  const seenTargetIds = new Set();
  const seenCorrectIds = new Set();
  const targets = [];

  for (const target of card.mission_targets) {
    if (
      !hasText(target?.id)
      || !hasText(target?.label)
      || !hasText(target?.correct_option_id)
      || !optionIds.has(target.correct_option_id)
      || seenTargetIds.has(target.id)
      || seenCorrectIds.has(target.correct_option_id)
    ) {
      return [];
    }
    seenTargetIds.add(target.id);
    seenCorrectIds.add(target.correct_option_id);
    targets.push(target);
  }

  return targets;
}

export function missionCorrectOptionIds(card) {
  const targets = missionTargetsForCard(card);
  if (targets.length) return targets.map((target) => target.correct_option_id);
  if (Array.isArray(card?.correct_option_ids) && card.correct_option_ids.length) {
    return [...card.correct_option_ids];
  }
  return hasText(card?.correct_option_id) ? [card.correct_option_id] : [];
}

export function missionCorrectionHint(card, placements) {
  const correctIds = missionCorrectOptionIds(card);
  const firstWrongIndex = correctIds.findIndex((expectedId, index) => placements?.[index] !== expectedId);
  if (firstWrongIndex < 0) return "";

  const options = Array.isArray(card?.options) ? card.options : [];
  const expectedLabel = options.find((option) => option?.id === correctIds[firstWrongIndex])?.label;
  if (!hasText(expectedLabel)) return "";

  const actualLabel = options.find((option) => option?.id === placements?.[firstWrongIndex])?.label
    || "el espacio vacío";
  const target = missionTargetsForCard(card)[firstWrongIndex];
  const position = target?.label || `el espacio ${firstWrongIndex + 1}`;
  return `Revisa ${position}: cambia «${actualLabel}» por «${expectedLabel}».`;
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
