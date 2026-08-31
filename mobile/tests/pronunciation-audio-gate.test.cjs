const assert = require('node:assert/strict');

const gateModulePath = process.argv[2];
if (!gateModulePath) throw new Error('Expected the compiled pronunciation audio gate module path.');

const { preloadPronunciationAudioWithRetry } = require(gateModulePath);

(async () => {
  const loadedCards = [];
  for (const cardId of ['speak-card-1', 'speak-card-2']) {
    const result = await preloadPronunciationAudioWithRetry(async () => {
      loadedCards.push(cardId);
      return true;
    });
    assert.deepEqual(result, { attempts: 1, loaded: true });
  }
  assert.deepEqual(loadedCards, ['speak-card-1', 'speak-card-2']);

  let attempts = 0;
  const recovered = await preloadPronunciationAudioWithRetry(async () => {
    attempts += 1;
    return attempts === 2;
  });
  assert.deepEqual(recovered, { attempts: 2, loaded: true });

  console.log('Pronunciation audio gate checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
