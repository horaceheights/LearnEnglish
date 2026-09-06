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
  missionConstruction?: {
    cardIndex: number;
    result: 'wrong' | null;
    slots: Array<string | null>;
  };
  missionOpeningPhase?: 'briefing' | 'tutorial' | 'complete';
};

type LessonResumeStorage = {
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

const MAX_MISSION_TILE_SLOTS = 8;

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

function validMissionConstruction(value: unknown, cardCount: number) {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<NonNullable<SavedLessonRun['missionConstruction']>>;
  if (
    !Number.isInteger(candidate.cardIndex)
    || candidate.cardIndex! < 0
    || candidate.cardIndex! >= cardCount
    || !Array.isArray(candidate.slots)
    || candidate.slots.length > MAX_MISSION_TILE_SLOTS
    || candidate.slots.some((slot) => slot !== null && (typeof slot !== 'string' || !slot.trim()))
  ) return null;
  return {
    cardIndex: candidate.cardIndex!,
    result: candidate.result === 'wrong' ? 'wrong' as const : null,
    slots: candidate.slots.map((slot) => slot === null ? null : slot.trim()),
  };
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
    const missionConstruction = validMissionConstruction(saved.missionConstruction, cardCount);
    const missionOpeningPhase = saved.missionOpeningPhase === 'briefing'
      || saved.missionOpeningPhase === 'tutorial'
      || saved.missionOpeningPhase === 'complete'
      ? saved.missionOpeningPhase
      : null;
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
      ...(missionConstruction ? { missionConstruction } : {}),
      ...(missionOpeningPhase ? { missionOpeningPhase } : {}),
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
