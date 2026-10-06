const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { createAccountSyncStore, createAccountSyncCoordinator } = require(process.argv[2]);
const { setAccountSession, setAccessTokenProvider, accountHeaders } = require(path.join(path.dirname(process.argv[2]), 'accountSession.js'));
const { createScopedLessonResults } = require(path.join(path.dirname(process.argv[2]), 'scopedLessonResults.js'));
const { createLessonResultStore } = require(path.join(path.dirname(process.argv[2]), 'lessonResultStore.js'));
const { importLegacyAccount } = require(path.join(path.dirname(process.argv[2]), 'legacyAccountImport.js'));
const storage = () => {
  const data = new Map();
  return { data, getItem: async key => data.get(key) || null, setItem: async (key, value) => data.set(key, value) };
};
const run = index => ({ sessionId: 'run-1', cardCount: 5, contentRevision: 2, cardIndex: index,
  furthestCardIndex: index, score: index, attemptedCards: [], completedCards: [], wrongCards: [], completionPending: false });

test('a token resolved after an account switch cannot be attached to a request', async () => {
  let release;
  setAccountSession({ userId: 'alice', generation: 'g1', profileVersion: 1 });
  setAccessTokenProvider(() => new Promise(resolve => release = resolve));
  const request = accountHeaders();
  setAccountSession({ userId: 'bob', generation: 'g1', profileVersion: 1 });
  release('alice-token'); await assert.rejects(request, /cuenta cambió/);
  setAccountSession(null); setAccessTokenProvider(null);
});

test('concurrent refreshes coalesce and an old account response never reaches listeners', async () => {
  let release; let calls = 0; const received = [];
  const coordinator = createAccountSyncCoordinator(() => { calls++; return new Promise(resolve => release = resolve); });
  coordinator.subscribe(snapshot => received.push(snapshot));
  setAccountSession({ userId: 'alice', generation: 'g1', profileVersion: 1 });
  const first = coordinator.sync(); assert.equal(first, coordinator.sync()); assert.equal(calls, 1);
  setAccountSession({ userId: 'bob', generation: 'g1', profileVersion: 1 });
  release({ user: { id: 'alice' } }); await first; assert.deepEqual(received, []);
  const second = coordinator.sync(); assert.equal(calls, 2);
  release({ user: { id: 'bob' } }); await second; assert.equal(received[0].user.id, 'bob');
  setAccountSession(null);
});

test('a delayed completion acknowledgement stays in its captured reset generation', async () => {
  const results = createScopedLessonResults(storage());
  const result = { id: 'run-1', userId: 'alice', lessonId: 'lesson-1', totalCards: 5, initialScore: 5,
    missedCards: [], ungradedCards: [], recoveredCards: [], completedAt: '2026-10-05T00:00:00Z' };
  setAccountSession({ userId: 'alice', generation: 'g1', profileVersion: 1 }); await results.save(result);
  let release; let started; const waiting = new Promise(resolve => started = resolve);
  const pending = results.sync('alice', async sent => { started(); return new Promise(resolve => release = () => resolve(sent)); });
  await waiting; setAccountSession({ userId: 'alice', generation: 'g2', profileVersion: 1 }); release(); await pending;
  assert.deepEqual(await results.list('alice'), []);
  setAccountSession({ userId: 'alice', generation: 'g1', profileVersion: 1 });
  await results.sync('alice', async () => assert.fail('already acknowledged in its original generation'));
  assert.equal((await results.list('alice')).length, 1); setAccountSession(null);
});

test('a checkpoint arriving while the conflict choice is open requires a fresh choice', async () => {
  const store = createAccountSyncStore(storage());
  await store.save('alice:g1', 'lesson-1', run(3));
  await store.accept('alice:g1', [{ lessonId: 'lesson-1', revision: 1, run: run(1) }]);
  let choices = 0;
  const loaded = await store.load('alice:g1', 'lesson-1', async (_local, remote) => {
    choices++;
    if (choices === 1) {
      assert.equal(remote.cardIndex, 1);
      await store.accept('alice:g1', [{ lessonId: 'lesson-1', revision: 2, run: run(2) }]);
    } else assert.equal(remote.cardIndex, 2);
    return 'remote';
  });
  assert.equal(choices, 2); assert.deepEqual(loaded, run(2));
});

test('offline writes survive recreation and another account cannot read them', async () => {
  const disk = storage(); const first = createAccountSyncStore(disk);
  await first.save('alice:epoch-1', 'lesson-1', run(2));
  await assert.rejects(first.sync('alice:epoch-1', async () => { throw Error('offline'); }));
  const reopened = createAccountSyncStore(disk);
  assert.deepEqual(await reopened.load('alice:epoch-1', 'lesson-1'), run(2));
  assert.equal(await reopened.load('bob:epoch-1', 'lesson-1'), null);
  assert.equal(await reopened.load('alice:epoch-2', 'lesson-1'), null);
});

test('two devices require an explicit choice, then converge using the server revision', async () => {
  const first = createAccountSyncStore(storage()); const second = createAccountSyncStore(storage());
  let remote = { lessonId: 'lesson-1', revision: 0, run: null };
  const send = async entry => {
    if (entry.revision !== remote.revision) throw Object.assign(Error('conflict'), { detail: { ...remote, code: 'checkpoint_conflict' } });
    remote = { lessonId: entry.lessonId, run: entry.run, revision: remote.revision + 1 }; return remote;
  };
  await first.save('alice:g1', 'lesson-1', run(1));
  await second.save('alice:g1', 'lesson-1', run(3));
  await first.sync('alice:g1', send); await second.sync('alice:g1', send);
  assert.deepEqual(remote.run, run(1));
  let chose = false;
  assert.deepEqual(await second.load('alice:g1', 'lesson-1', async (local, other) => {
    chose = true; assert.deepEqual(local, run(3)); assert.deepEqual(other, run(1)); return 'local';
  }), run(3));
  assert.ok(chose);
  await second.sync('alice:g1', send); assert.deepEqual(remote.run, run(3));
  await first.accept('alice:g1', [remote]); assert.deepEqual(await first.load('alice:g1', 'lesson-1'), run(3));
});

test('a delayed acknowledgement does not clear a newer checkpoint', async () => {
  const store = createAccountSyncStore(storage()); await store.save('alice:g1', 'lesson-1', run(1));
  let release; let started; const waiting = new Promise(resolve => started = resolve); const sent = [];
  const sync = store.sync('alice:g1', async checkpoint => {
    sent.push(checkpoint.run.cardIndex);
    if (sent.length === 1) { started(); await new Promise(resolve => release = resolve); }
    return { ...checkpoint, revision: checkpoint.revision + 1 };
  });
  await waiting; await store.save('alice:g1', 'lesson-1', run(4)); release(); await sync;
  assert.deepEqual(sent, [1, 4]); assert.deepEqual(await store.load('alice:g1', 'lesson-1'), run(4));
});

test('remote tombstones replace only acknowledged local checkpoints', async () => {
  const store = createAccountSyncStore(storage());
  await store.accept('alice:g1', [{ lessonId: 'lesson-1', revision: 1, run: run(2) }]);
  await store.accept('alice:g1', [{ lessonId: 'lesson-1', revision: 2, run: null }]);
  assert.equal(await store.load('alice:g1', 'lesson-1'), null);
  await store.save('alice:g1', 'lesson-1', run(3));
  await store.accept('alice:g1', [{ lessonId: 'lesson-1', revision: 3, run: null }]);
  assert.deepEqual(await store.load('alice:g1', 'lesson-1', async () => 'local'), run(3));
});

test('damaged local storage fails visibly and retains original bytes', async () => {
  const disk = storage(); await disk.setItem('spanglish-account-checkpoints-v1:alice:g1', '{broken');
  const store = createAccountSyncStore(disk);
  await assert.rejects(store.save('alice:g1', 'lesson-1', run(1)));
  assert.equal(await disk.getItem('spanglish-account-checkpoints-v1:alice:g1'), '{broken');
});

test('remote results merge unique corrections without suppressing a pending local correction', async () => {
  const store = createLessonResultStore(storage());
  const result = { id: 'run-1', userId: 'alice', lessonId: 'lesson-1', totalCards: 5, initialScore: 2,
    missedCards: [2, 3, 4], ungradedCards: [], recoveredCards: [2], completedAt: '2026-10-05T00:00:00Z', reviewAvailable: true };
  await store.save(result);
  await store.importRemote('alice', [{ ...result, recoveredCards: [3] }]);
  let sent; await store.sync('alice', async result => { sent = result; return result; });
  assert.deepEqual(sent.recoveredCards, [2, 3]); assert.equal(sent.initialScore, 2);
  await assert.rejects(store.importRemote('alice', [{ ...result, userId: 'bob' }]));
});

test('importing legacy device history is retry-safe and cannot claim a second destination', async () => {
  const disk = storage(); const result = { id: 'legacy-run', userId: 'old', lessonId: 'lesson-1', totalCards: 5,
    initialScore: 2, missedCards: [2, 3, 4], ungradedCards: [], recoveredCards: [], completedAt: '2026-10-05T00:00:00Z', reviewAvailable: true };
  await disk.setItem('spanglish-lesson-results-v1:old', JSON.stringify([{ result, synced: true }]));
  await disk.setItem('spanglish-lesson-resume-v1:old:lesson-1', JSON.stringify({ ...run(2), sessionId: 'legacy-run' }));
  const ids = [];
  const save = async result => ids.push(result.id);
  const args = [disk, { userId: 'old', displayName: 'Old' }, 'alice', [{ id: 'lesson-1' }], save];
  await assert.rejects(importLegacyAccount(...args, async () => { throw Error('disk full'); }));
  await importLegacyAccount(...args, async (_lessonId, run) => assert.equal(run.sessionId, ids[0]));
  assert.equal(ids[0], ids[1]); assert.notEqual(ids[0], 'legacy-run');
  await importLegacyAccount(...args, async () => assert.fail('already imported'));
  await assert.rejects(importLegacyAccount(disk, { userId: 'old', displayName: 'Old' }, 'bob', [], save, async () => {}));
  assert.ok(await disk.getItem('spanglish-lesson-results-v1:old'));
});

test('server JSON property order does not create a false checkpoint conflict', async () => {
  const store = createAccountSyncStore(storage()); const local = run(2);
  const sorted = Object.fromEntries(Object.entries(local).sort(([a], [b]) => a.localeCompare(b)));
  await store.save('alice:g1', 'lesson-1', local);
  await store.accept('alice:g1', [{ lessonId: 'lesson-1', revision: 1, run: sorted }]);
  await store.sync('alice:g1', async () => assert.fail('already acknowledged'));
  assert.deepEqual(await store.load('alice:g1', 'lesson-1', async () => assert.fail('no conflict')), local);
});

test('an obsolete lesson preserves its run without blocking another lesson', async () => {
  const store = createAccountSyncStore(storage());
  await store.save('alice:g1', 'old-lesson', run(1)); await store.save('alice:g1', 'new-lesson', run(2));
  const sent = [];
  await store.sync('alice:g1', async entry => {
    sent.push(entry.lessonId);
    if (entry.lessonId === 'old-lesson') throw Object.assign(Error('obsolete'), { detail: { code: 'checkpoint_obsolete' } });
    return { ...entry, revision: 1 };
  });
  assert.deepEqual(sent, ['old-lesson', 'new-lesson']);
  assert.deepEqual(await store.load('alice:g1', 'old-lesson'), run(1));
  await store.sync('alice:g1', async () => assert.fail('obsolete run remains retained'));
});

test('server completion order selects the latest result despite a device clock in the future', async () => {
  const { localResultProgress, mergeCourseProgress } = require(path.join(path.dirname(process.argv[2]), 'lessonResult.js'));
  const store = createLessonResultStore(storage());
  const result = { id: 'old', userId: 'alice', lessonId: 'lesson-1', totalCards: 5, initialScore: 5,
    missedCards: [], ungradedCards: [], recoveredCards: [], completedAt: '2030-01-01T00:00:00Z', serverOrder: 1 };
  const latest = { ...result, id: 'new', initialScore: 2, missedCards: [2,3,4], serverOrder: 2, completedAt: '2026-10-05T00:00:00Z' };
  await store.importRemote('alice', [result, latest]);
  assert.equal((await store.latest('alice', 'lesson-1', 5)).id, 'new');
  const progress = localResultProgress(await store.list('alice'));
  assert.equal(progress['lesson-1'].score, 2); assert.equal(progress['lesson-1'].passed, true);
  const merged = mergeCourseProgress([{ ...progress['lesson-1'], score: 5, finished_order: 1, completed_at: result.completedAt }], progress);
  assert.equal(merged['lesson-1'].score, 2);
});
