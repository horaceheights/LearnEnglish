const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createLessonResumePersistence,
  parseSavedLessonRun,
} = require(process.argv[2]);

function savedRun(overrides = {}) {
  return {
    attemptedCards: [0, 1],
    cardCount: 5,
    cardIndex: 2,
    completedCards: [0, 1],
    completionPending: false,
    furthestCardIndex: 2,
    score: 2,
    sessionId: 'session-1',
    wrongCards: [],
    ...overrides,
  };
}

async function main() {
  const legacyRun = savedRun();
  delete legacyRun.completionPending;
  assert.equal(
    parseSavedLessonRun(JSON.stringify(legacyRun), 5).completionPending,
    false,
    'Existing checkpoints must remain backward compatible.',
  );

  const completedRun = parseSavedLessonRun(JSON.stringify(savedRun({
    cardIndex: 4,
    completedCards: [0, 1, 2, 3, 4],
    completionPending: true,
    furthestCardIndex: 4,
    score: 4,
  })), 5);
  assert.equal(
    completedRun.completionPending,
    true,
    'A locally completed lesson must survive until server completion is acknowledged.',
  );
  assert.equal(
    parseSavedLessonRun(JSON.stringify(savedRun()), 6),
    null,
    'A checkpoint from a different lesson-card revision must not be restored.',
  );
  assert.equal(
    parseSavedLessonRun(JSON.stringify(savedRun()), 5, 2),
    null,
    'A legacy checkpoint must not restore into a versioned mission experience.',
  );
  assert.equal(
    parseSavedLessonRun(JSON.stringify(savedRun({ contentRevision: 1 })), 5, 2),
    null,
    'A checkpoint from an older mission content revision must not be restored.',
  );
  assert.deepEqual(
    parseSavedLessonRun(JSON.stringify(savedRun({ contentRevision: 2 })), 5, 2),
    savedRun({ contentRevision: 2 }),
    'A checkpoint from the current mission content revision must restore normally.',
  );
  const missionDraftRun = savedRun({
    contentRevision: 2,
    missionConstruction: {
      cardIndex: 2,
      result: 'wrong',
      slots: ['father', null, 'mother'],
    },
    missionOpeningPhase: 'complete',
  });
  assert.deepEqual(
    parseSavedLessonRun(JSON.stringify(missionDraftRun), 5, 2),
    missionDraftRun,
    'A sparse in-progress construction and its wrong state must survive a restart.',
  );
  assert.equal(
    parseSavedLessonRun(JSON.stringify(savedRun({
      contentRevision: 2,
      missionConstruction: { cardIndex: 8, result: 'wrong', slots: ['outside'] },
      missionOpeningPhase: 'not-a-phase',
    })), 5, 2).missionConstruction,
    undefined,
    'Invalid mission-only state must fail closed without discarding valid lesson progress.',
  );
  assert.equal(
    parseSavedLessonRun(JSON.stringify(savedRun({
      contentRevision: 2,
      missionConstruction: {
        cardIndex: 2,
        result: null,
        slots: Array.from({ length: 9 }, (_value, index) => `tile-${index}`),
      },
    })), 5, 2).missionConstruction,
    undefined,
    'Resume data must honor the reviewed eight-tile mission board maximum.',
  );
  assert.deepEqual(
    parseSavedLessonRun(JSON.stringify(savedRun({ contentRevision: 1 })), 5),
    savedRun(),
    'Standard lessons must keep their existing card-count-based resume behavior.',
  );

  const writes = [];
  let releaseFirstWrite;
  const firstWriteBlocked = new Promise((resolve) => {
    releaseFirstWrite = resolve;
  });
  const coalescingStorage = {
    async removeItem(key) {
      writes.push({ key, type: 'remove' });
    },
    async setItem(key, value) {
      writes.push({ key, type: 'set', value: JSON.parse(value) });
      if (writes.length === 1) await firstWriteBlocked;
    },
  };
  const persistence = createLessonResumePersistence(coalescingStorage, 'lesson-key');
  const firstSave = persistence.save(savedRun({ cardIndex: 1 }));
  const latestSave = persistence.save(savedRun({ cardIndex: 3, furthestCardIndex: 3 }));
  releaseFirstWrite();
  await Promise.all([firstSave, latestSave]);
  assert.deepEqual(
    writes.map((write) => write.type === 'set' ? write.value.cardIndex : write.type),
    [1, 3],
    'A newer card checkpoint queued during a write must be persisted after the older one.',
  );

  const clearAfterSave = persistence.clear();
  await clearAfterSave;
  assert.equal(writes.at(-1).type, 'remove', 'Checkpoint removal must run after pending saves.');

  let shouldFail = true;
  const retryWrites = [];
  const retryStorage = {
    async removeItem() {},
    async setItem(_key, value) {
      retryWrites.push(JSON.parse(value).cardIndex);
      if (shouldFail) {
        shouldFail = false;
        throw new Error('temporary storage failure');
      }
    },
  };
  const retryPersistence = createLessonResumePersistence(retryStorage, 'retry-key');
  await assert.rejects(retryPersistence.save(savedRun({ cardIndex: 4, furthestCardIndex: 4 })));
  await retryPersistence.flush();
  assert.deepEqual(
    retryWrites,
    [4, 4],
    'A failed local write must remain pending so a later lifecycle flush can retry it.',
  );

  const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
  const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');
  assert.match(
    lessonScreenSource,
    /completionPending: isComplete/,
    'The completion screen must be represented in the durable local checkpoint.',
  );
  assert.match(
    lessonScreenSource,
    /missionOpeningPhase/,
    'The pre-card studio briefing phase must be part of the durable checkpoint.',
  );
  assert.match(
    lessonScreenSource,
    /missionConstruction:[\s\S]*?slots: missionTileSlots/,
    'Partial tile placement must be persisted without forcing a board reset.',
  );
  assert.match(
    lessonScreenSource,
    /sanitizeMissionTileSlots\(savedRun\.missionConstruction\.slots, nextCard\)/,
    'Restored mission tiles must be checked against the current card before rendering.',
  );
  assert.match(
    lessonScreenSource,
    /setIsComplete\(savedRun\?\.completionPending \?\? false\)/,
    'A pending offline completion must restore the completion screen, not card one.',
  );
  assert.match(
    lessonScreenSource,
    /if \(nextState !== 'active'\) void flushLessonResume\(\)/,
    'Backgrounding must explicitly flush the latest local checkpoint.',
  );
  assert.match(
    lessonScreenSource,
    /finishLessonSession\([\s\S]*?\.then\(\(\) => \{[\s\S]*?return clearLessonResume\(\)/,
    'The local completion checkpoint may clear only after server completion succeeds.',
  );
  assert.doesNotMatch(
    lessonScreenSource,
    /if \(isComplete\) \{\s+void AsyncStorage\.removeItem\(lessonResumeStorageKey\)/,
    'Entering the completion screen must not immediately delete offline progress.',
  );

  console.log('Lesson resume durability checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
