export type SavedLessonRun = {
  attemptedCards: number[];
  cardCount: number;
  cardIndex: number;
  completedCards: number[];
  completionPending: boolean;
  furthestCardIndex: number;
  score: number;
  sessionId: string;
  wrongCards: number[];
  contentRevision?: number;
  earnedCards?: number[];
  ungradedCards?: number[];
  reviewQueue?: number[];
  resultId?: string;
};

type LessonResumeStorage = {
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type LessonResumePersistence = {
  clear: () => Promise<void>;
  flush: () => Promise<void>;
  save: (run: SavedLessonRun) => Promise<void>;
};

function validCardIndexes(indexes: unknown, cardCount: number) {
  if (!Array.isArray(indexes)) return [];
  return indexes.filter((index): index is number => (
    Number.isInteger(index) && index >= 0 && index < cardCount
  ));
}

export function parseSavedLessonRun(
  value: string | null,
  cardCount: number,
  contentRevision?: number,
): SavedLessonRun | null {
  if (!value) return null;
  try {
    const saved = JSON.parse(value) as Partial<SavedLessonRun>;
    if (saved.cardCount !== cardCount || !Number.isInteger(saved.cardIndex)) return null;
    if (contentRevision !== undefined && saved.contentRevision !== contentRevision) return null;
    const cardIndex = Math.min(Math.max(saved.cardIndex || 0, 0), Math.max(cardCount - 1, 0));
    return {
      attemptedCards: validCardIndexes(saved.attemptedCards, cardCount),
      cardCount,
      cardIndex,
      completedCards: validCardIndexes(saved.completedCards, cardCount),
      completionPending: saved.completionPending === true,
      furthestCardIndex: Math.min(
        Math.max(Number.isInteger(saved.furthestCardIndex) ? saved.furthestCardIndex! : cardIndex, cardIndex),
        Math.max(cardCount - 1, 0),
      ),
      score: Math.min(Math.max(Number.isInteger(saved.score) ? saved.score! : 0, 0), cardCount),
      sessionId: typeof saved.sessionId === 'string' ? saved.sessionId : '',
      wrongCards: validCardIndexes(saved.wrongCards, cardCount),
      ...(contentRevision === undefined ? {} : { contentRevision }),
      ...(Array.isArray(saved.earnedCards) ? { earnedCards: validCardIndexes(saved.earnedCards, cardCount) } : {}),
      ...(Array.isArray(saved.ungradedCards) ? { ungradedCards: validCardIndexes(saved.ungradedCards, cardCount) } : {}),
      ...(Array.isArray(saved.reviewQueue) ? { reviewQueue: validCardIndexes(saved.reviewQueue, cardCount) } : {}),
      ...(typeof saved.resultId === 'string' ? { resultId: saved.resultId } : {}),
    };
  } catch {
    return null;
  }
}

export function createLessonResumePersistence(
  storage: LessonResumeStorage,
  storageKey: string,
): LessonResumePersistence {
  let requestedRevision = 0;
  let persistedRevision = 0;
  let latestValue: string | null = null;
  let inFlight: Promise<void> | null = null;

  const drain = (): Promise<void> => {
    if (inFlight) return inFlight;
    if (persistedRevision === requestedRevision) return Promise.resolve();

    const run = async () => {
      while (persistedRevision < requestedRevision) {
        const targetRevision = requestedRevision;
        const targetValue = latestValue;
        if (targetValue === null) {
          await storage.removeItem(storageKey);
        } else {
          await storage.setItem(storageKey, targetValue);
        }
        persistedRevision = targetRevision;
      }
    };

    const attempt = run();
    inFlight = attempt.then(
      () => {
        inFlight = null;
      },
      (error) => {
        inFlight = null;
        throw error;
      },
    );
    return inFlight;
  };

  return {
    clear() {
      latestValue = null;
      requestedRevision += 1;
      return drain();
    },
    flush() {
      return drain();
    },
    save(run) {
      latestValue = JSON.stringify(run);
      requestedRevision += 1;
      return drain();
    },
  };
}
