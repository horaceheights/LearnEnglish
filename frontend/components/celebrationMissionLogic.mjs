export function expectedMissionPlacements(game) {
  if (!game?.targets?.length) return [];

  return game.targets.flatMap((target) => (
    (target.accepted_option_ids || []).map((optionId) => ({
      optionId,
      targetId: target.id,
    }))
  ));
}

export function validateMissionPlacements(game, placements) {
  const expected = expectedMissionPlacements(game);
  const normalized = Array.isArray(placements) ? placements : [];
  const expectedOptionIds = expected.map((placement) => placement.optionId);
  const expectedByOption = new Map(
    expected.map((placement, index) => [
      placement.optionId,
      { ...placement, index },
    ])
  );
  const seenOptions = new Set();

  const annotated = normalized.map((placement, sequenceIndex) => {
    const contract = expectedByOption.get(placement.optionId);
    const duplicate = seenOptions.has(placement.optionId);
    seenOptions.add(placement.optionId);
    const correctTarget = Boolean(contract) && contract.targetId === placement.targetId;
    const correctOrder = game?.validation !== "ordered"
      || contract?.index === sequenceIndex;

    return {
      ...placement,
      correct: Boolean(contract) && !duplicate && correctTarget && correctOrder,
    };
  });

  let retainedPlacements;
  if (game?.validation === "ordered") {
    const firstIncorrectIndex = annotated.findIndex((placement) => !placement.correct);
    retainedPlacements = firstIncorrectIndex < 0
      ? annotated
      : annotated.slice(0, firstIncorrectIndex);
  } else {
    retainedPlacements = annotated.filter((placement) => placement.correct);
  }

  retainedPlacements = retainedPlacements.map(({ correct: _correct, ...placement }) => placement);
  const complete = expected.length > 0
    && annotated.length === expected.length
    && annotated.every((placement) => placement.correct);

  return {
    complete,
    expectedCount: expected.length,
    expectedOptionIds,
    incorrectCount: annotated.filter((placement) => !placement.correct).length,
    missingCount: Math.max(0, expected.length - annotated.length),
    retainedPlacements,
  };
}

export function isDirectSceneMissionKind(kind) {
  return kind === "hotspot" || kind === "action-sequence";
}

export function isChoiceMissionKind(kind) {
  return kind === "not-correction" || kind === "who-dialogue";
}

export function isSpeechMissionKind(kind) {
  return kind === "speak" || kind === "finale";
}
