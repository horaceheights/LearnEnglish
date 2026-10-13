const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function load(file, mocks = {}, fetchMock) {
  const api = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', 'fetch', code)(id => { assert.ok(id in mocks, id); return mocks[id]; }, api, fetchMock);
  return api;
}
const speech = load('mobile/src/tutorSpeechStream.ts');
const initial = { userId: 'learner-a', generation: 'g1', profileVersion: 1 };
function harness(platform, duringFetch) {
  const account = load('mobile/src/accountSession.ts');
  account.setAccountSession({ ...initial }); account.setAccessTokenProvider(async () => 'test-token');
  const fetchMock = async () => duringFetch(account);
  const api = platform === 'native'
    ? load('mobile/src/tutorApi.ts', { 'expo/fetch': { fetch: fetchMock }, './config': { API_BASE_URL: 'https://fixture.invalid', APP_API_KEY: 'fixture' }, './accountSession': account, './tutorSpeechStream': speech })
    : load('frontend/lib/tutorApi.js', { './api': { getApiBaseUrl: () => 'https://fixture.invalid' }, '../../mobile/src/accountSession': account, '../../mobile/src/tutorSpeechStream': speech }, fetchMock);
  return { account, api };
}
for (const platform of ['native', 'web']) {
  test(`${platform}: account refresh and profile updates survive token acquisition and response decoding`, async () => {
    const h = harness(platform, async account => {
      account.setAccountSession({ ...initial, profileVersion: 3 });
      return { ok: true, json: async () => { account.setAccountSession({ ...initial, profileVersion: 4 }); return { reply: 'Pista' }; } };
    });
    h.account.setAccessTokenProvider(async () => { h.account.setAccountSession({ ...initial, profileVersion: 2 }); return 'test-token'; });
    assert.equal((await h.api.askTutor({}, 'Ayuda', [])).reply, 'Pista');
  });
  test(`${platform}: real switch, reset and sign-out/back-in reject stale responses`, async () => {
    for (const action of [a => a.setAccountSession({ ...initial, userId: 'b' }), a => a.setAccountSession({ ...initial, generation: 'g2' }), a => { a.setAccountSession(null); a.setAccountSession({ ...initial }); }]) {
      const h = harness(platform, async account => ({ ok: true, json: async () => { action(account); return { reply: 'Private reply' }; } }));
      await assert.rejects(h.api.askTutor({}, 'Ayuda', []), /La cuenta cambió/);
    }
  });
  test(`${platform}: streamed speech accepts refresh and rejects a switch between chunks`, async () => {
    for (const changed of [false, true]) {
      let controller;
      const h = harness(platform, async () => new Response(new ReadableStream({ start(c) { controller = c; } }), { headers: { 'content-type': 'application/x-ndjson' } }));
      const seen = [];
      const pending = h.api.speakTutor({}, 'Texto', new AbortController().signal, bytes => seen.push([...bytes]));
      await new Promise(resolve => setImmediate(resolve));
      h.account.setAccountSession({ ...initial, userId: changed ? 'b' : initial.userId });
      controller.enqueue(new TextEncoder().encode('{"type":"audio","index":0,"audio":"AQI="}\n{"type":"done"}\n')); controller.close();
      if (changed) { await assert.rejects(pending, /La cuenta cambió/); assert.deepEqual(seen, []); }
      else { await pending; assert.deepEqual(seen, [[1, 2]]); }
    }
  });
}
test('speech stream parses split lines and rejects truncated, reordered or failed streams', async () => {
  async function run(lines) {
    const seen = [];
    const body = new ReadableStream({ start(c) { for (const text of lines) c.enqueue(new TextEncoder().encode(text)); c.close(); } });
    await speech.readTutorSpeech(new Response(body, { headers: { 'content-type': 'application/x-ndjson' } }), new AbortController().signal, () => {}, bytes => seen.push([...bytes]));
    return seen;
  }
  assert.deepEqual(await run(['{"type":"audio","index":0,', '"audio":"AQI="}\n', '{"type":"done"}\n']), [[1,2]]);
  for (const content of ['{"type":"error"}\n', '{"type":"audio","index":1,"audio":"AQI="}\n', '{"type":"audio","index":0,"audio":"AQI="}\n', '{"type":"done"}\n']) await assert.rejects(run([content]));
});
