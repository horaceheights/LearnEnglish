/** One immutable first attempt, followed by unique, recoverable activities. */
export type LessonResult = {
  id: string;
  userId: string;
  lessonId: string;
  contentRevision?: number;
  totalCards: number;
  initialScore: number;
  missedCards: number[];
  ungradedCards: number[];
  recoveredCards: number[];
  completedAt: string;
  reviewAvailable?: boolean;
};

export function newLessonRunId(): string {
  // Identifies a local run, including runs begun offline; it is not a credential.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 3) | 8).toString(16);
  });
}

export function uniqueCardIndexes(indexes: readonly number[], total: number): number[] {
  return [...new Set(indexes.filter((index) => Number.isInteger(index) && index >= 0 && index < total))]
    .sort((left, right) => left - right);
}

export function parseLessonResult(value: unknown): LessonResult | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as LessonResult;
  if (!result.id || !result.userId || !result.lessonId || !Number.isInteger(result.totalCards)
    || result.totalCards <= 0 || !Number.isInteger(result.initialScore) || result.initialScore < 0
    || !Array.isArray(result.missedCards) || !Array.isArray(result.ungradedCards)
    || !Array.isArray(result.recoveredCards) || !Number.isFinite(Date.parse(result.completedAt))) return null;
  const missedCards = uniqueCardIndexes(result.missedCards, result.totalCards);
  const ungradedCards = uniqueCardIndexes(result.ungradedCards, result.totalCards);
  if (result.initialScore > result.totalCards || missedCards.some((index) => ungradedCards.includes(index))
    || (result.reviewAvailable !== false && result.initialScore + missedCards.length + ungradedCards.length !== result.totalCards)) return null;
  const eligible = new Set([...missedCards, ...ungradedCards]);
  const recoveredCards = uniqueCardIndexes(result.recoveredCards, result.totalCards);
  if (recoveredCards.some((index) => !eligible.has(index))) return null;
  return { ...result, missedCards, ungradedCards, recoveredCards };
}

export function remainingReviewCards(result: LessonResult): number[] {
  if (result.reviewAvailable === false) return [];
  const recovered = new Set(result.recoveredCards);
  return [...result.missedCards, ...result.ungradedCards].filter((index) => !recovered.has(index))
    .sort((left, right) => left - right);
}

export function resultSummary(result: LessonResult) {
  const score = Math.min(result.totalCards, result.initialScore + new Set(result.recoveredCards).size);
  const pending = result.ungradedCards.filter((index) => !result.recoveredCards.includes(index)).length;
  return {
    score,
    percentage: result.totalCards > 0 ? Math.floor(score * 100 / result.totalCards) : 0,
    passed: result.totalCards > 0 && pending === 0 && score * 100 >= result.totalCards * 80,
    pending,
    afterReview: result.recoveredCards.length > 0,
  };
}

export function recoverLessonCard(result: LessonResult, cardIndex: number): LessonResult {
  if (!remainingReviewCards(result).includes(cardIndex)) return result;
  return { ...result, recoveredCards: [...result.recoveredCards, cardIndex].sort((left, right) => left - right) };
}

export function mergeLessonResult(previous: LessonResult, incoming: LessonResult): LessonResult {
  const baseline = (result: LessonResult) => resultSignature({ ...result, recoveredCards: [] });
  if (baseline(previous) !== baseline(incoming)) throw new Error('El resultado inicial no puede cambiar.');
  return { ...previous, recoveredCards: uniqueCardIndexes([...previous.recoveredCards, ...incoming.recoveredCards], previous.totalCards) };
}

export function resultSignature(result: LessonResult): string {
  return JSON.stringify([result.id, result.userId, result.lessonId, result.contentRevision ?? null,
    result.totalCards, result.initialScore, result.missedCards, result.ungradedCards,
    result.recoveredCards, result.completedAt, result.reviewAvailable !== false]);
}

export function nextCourseLesson<T extends { id: string }>(lessons: readonly T[], lessonId: string): T | null {
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 ? lessons[index + 1] ?? null : null;
}

export function localResultProgress(results: readonly LessonResult[]) {
  const progress: Record<string, {
    lesson_id: string; completed: true; passed: boolean; score: number; initial_score: number;
    total_cards: number; percentage: number; completed_at: string;
  }> = {};
  for (const result of [...results].sort((left, right) => left.completedAt.localeCompare(right.completedAt))) {
    const summary = resultSummary(result);
    const previous = progress[result.lessonId];
    progress[result.lessonId] = {
      lesson_id: result.lessonId, completed: true, passed: Boolean(previous?.passed || summary.passed),
      score: summary.score, initial_score: result.initialScore, total_cards: result.totalCards,
      percentage: summary.percentage, completed_at: result.completedAt,
    };
  }
  return progress;
}

export function mergeCourseProgress<T extends { lesson_id: string; passed: boolean; completed_at: string }>(remote: readonly T[], local: Record<string, T>): Record<string, T> {
  const merged = Object.fromEntries(remote.map((progress) => [progress.lesson_id, progress]));
  for (const [id, progress] of Object.entries(local)) {
    const server = merged[id];
    merged[id] = !server ? progress : {
      ...(server.completed_at > progress.completed_at ? server : progress),
      passed: server.passed || progress.passed,
    };
  }
  return merged;
}
