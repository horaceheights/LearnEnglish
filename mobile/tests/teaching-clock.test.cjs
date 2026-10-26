const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/teachingClock.ts'), 'utf8');
const mod = { exports: {} };
new Function('exports', 'module', ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText)(mod.exports, mod);
const { clockAngles, visibleClockCues, cardClockCues } = mod.exports;

test('half-hour moves both hands; invalid authored times cannot be inferred', () => {
  assert.deepEqual(clockAngles({ hour: 12, minute: 30 }), { hour: 15, minute: 180 });
  assert.deepEqual(clockAngles({ hour: 7, minute: 0 }), { hour: 210, minute: 0 });
  for (const cue of [{ hour: 0, minute: 0 }, { hour: 13, minute: 0 }, { hour: 1, minute: 60 }, { hour: true, minute: 0 }]) {
    assert.throws(() => clockAngles(cue));
  }
});

test('time evidence stays hidden during listening and decisions until correct', () => {
  const cue = [{ hour: 7, minute: 0 }];
  for (const card of [{ stage: 'Listen' }, { stage: 'Mission', mission_game: { kind: 'conversation-decision' } }]) {
    assert.deepEqual(visibleClockCues(card, cue, false), []);
    assert.deepEqual(visibleClockCues(card, cue, true), cue);
  }
  assert.deepEqual(visibleClockCues({ stage: 'Recognize' }, cue, false), cue);
});

test('a new turn on the same photograph clears or changes the preceding clock', () => {
  const first = { image_url: 'same.webp', clock_cues: [{ hour: 7, minute: 0 }] };
  const card = { audio_turns: [first] };
  assert.deepEqual(cardClockCues(card), first.clock_cues);
  assert.deepEqual(cardClockCues(card, { image_url: 'same.webp' }), []);
  const next = { image_url: 'same.webp', clock_cues: [{ hour: 8, minute: 0 }] };
  assert.deepEqual(cardClockCues(card, next), next.clock_cues);
});
