export type CardAttempt = {
  attemptedCards: Set<number>;
  firstTry: boolean;
};

export type CardCompletion = {
  completedCards: Set<number>;
  newlyCompleted: boolean;
  scoreDelta: 0 | 1;
};

export function registerCardAttempt(
  current: ReadonlySet<number>,
  cardIndex: number,
): CardAttempt {
  const firstTry = !current.has(cardIndex);
  const attemptedCards = new Set(current);
  attemptedCards.add(cardIndex);
  return { attemptedCards, firstTry };
}

export function registerCardCompletion(
  current: ReadonlySet<number>,
  cardIndex: number,
  awardPoint: boolean,
): CardCompletion {
  if (current.has(cardIndex)) {
    return {
      completedCards: new Set(current),
      newlyCompleted: false,
      scoreDelta: 0,
    };
  }

  const completedCards = new Set(current);
  completedCards.add(cardIndex);
  return {
    completedCards,
    newlyCompleted: true,
    scoreDelta: awardPoint ? 1 : 0,
  };
}
