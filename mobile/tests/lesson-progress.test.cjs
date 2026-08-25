const assert = require('node:assert/strict');

const {
  prepareCardChoice,
  registerCardAttempt,
  registerCardCompletion,
} = require(process.argv[2]);

const firstAttempt = registerCardAttempt(new Set(), 3);
assert.equal(firstAttempt.firstTry, true, 'A new card must be a first try.');
assert.deepEqual([...firstAttempt.attemptedCards], [3]);

const immediateRetry = registerCardAttempt(firstAttempt.attemptedCards, 3);
assert.equal(immediateRetry.firstTry, false, 'A synchronous retry must not remain a first try.');

const firstCompletion = registerCardCompletion(new Set(), 3, firstAttempt.firstTry);
assert.equal(firstCompletion.newlyCompleted, true);
assert.equal(firstCompletion.scoreDelta, 1, 'A first-try completion should award one point.');

const duplicateCompletion = registerCardCompletion(firstCompletion.completedCards, 3, true);
assert.equal(duplicateCompletion.newlyCompleted, false);
assert.equal(duplicateCompletion.scoreDelta, 0, 'The same card must never score twice.');

const retryCompletion = registerCardCompletion(new Set(), 3, immediateRetry.firstTry);
assert.equal(retryCompletion.newlyCompleted, true);
assert.equal(retryCompletion.scoreDelta, 0, 'A completion after a failed try must not award a point.');

const skippedPronunciation = registerCardCompletion(new Set(), 7, false);
assert.equal(skippedPronunciation.scoreDelta, 0, 'Skipped pronunciation must complete without scoring.');

const completedCardReview = prepareCardChoice(new Set([3]), new Set([3]), 3);
assert.equal(completedCardReview.reviewingCompletedCard, true);
assert.equal(completedCardReview.shouldRecordAttempt, false, 'Review attempts must not be logged as new attempts.');
assert.equal(completedCardReview.firstTry, false, 'A completed-card review can never earn a first-try point.');
assert.deepEqual([...completedCardReview.attemptedCards], [3]);

const newCardChoice = prepareCardChoice(new Set([3]), new Set([3]), 4);
assert.equal(newCardChoice.reviewingCompletedCard, false);
assert.equal(newCardChoice.shouldRecordAttempt, true);
assert.equal(newCardChoice.firstTry, true);
assert.deepEqual([...newCardChoice.attemptedCards], [3, 4]);

console.log('Lesson interaction scoring checks passed.');
