const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const lesson = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'lesson-2-6-numbers-1-10.json'),
  'utf8',
));
const registry = JSON.parse(fs.readFileSync(
  path.join(repositoryRoot, 'backend', 'approved-course-audio', 'registry.json'),
  'utf8',
));
const approvedHash = '802f1c7d7e2d8a3e868f89f7d99fdb106f0f3b7fd4876cfe088634e4b9e9f432';

const standaloneOneCards = lesson.cards.filter(
  (card) => card.prompt === 'One' && card.audio_text === 'One',
);
assert.deepEqual(
  standaloneOneCards.map((card) => card.stage),
  ['Learn', 'Recognize', 'Speak'],
  'Every standalone One slide must remain covered by the corrected take.',
);

const oneAssets = standaloneOneCards.flatMap((card) => card.audio_assets.filter(
  (asset) => asset.text === 'One',
));
assert.equal(oneAssets.length, 6, 'The reviewed One override must bind exactly six immutable assets.');
assert.equal(new Set(oneAssets.map((asset) => asset.id)).size, 6, 'Every One contract needs its own asset ID.');

const contractCounts = new Map();
for (const asset of oneAssets) {
  const contract = `${asset.speaker_role}|${asset.mode}|${asset.variant}`;
  contractCounts.set(contract, (contractCounts.get(contract) || 0) + 1);
  assert.equal(
    registry.bindings[asset.id]?.take_id,
    approvedHash,
    `${asset.id} must bind to the exact reviewed One bytes.`,
  );
}
assert.deepEqual(
  Object.fromEntries([...contractCounts.entries()].sort()),
  {
    'answer|prompt|answer': 3,
    'teacher|prompt|prompt': 2,
    'teacher|pronunciation_slow|split-ing': 1,
  },
  'The One override must stay limited to the approved Learn, Recognize, and Speak contracts.',
);

const approvedTake = registry.takes[approvedHash];
assert.ok(approvedTake, 'The approved One take must remain in the persistent registry.');
assert.equal(approvedTake.audio_sha256, approvedHash);
assert.equal(approvedTake.text, 'One');
assert.equal(approvedTake.bytes, 12_141);
assert.equal(approvedTake.provenance.source, 'reviewed-exact-audio-override');
assert.equal(approvedTake.provenance.provider, null, 'Unknown provider provenance must remain truthful.');
assert.equal(approvedTake.provenance.model_id, null, 'Unknown model provenance must remain truthful.');
assert.equal(approvedTake.provenance.voice_id, null, 'Unknown voice provenance must remain truthful.');
assert.equal(approvedTake.provenance.character_cost, null, 'The reviewed local override spent no API credits.');

const approvedTakePath = path.join(
  repositoryRoot,
  'backend',
  'approved-course-audio',
  approvedTake.file,
);
assert.ok(fs.existsSync(approvedTakePath), 'The persistent One take must exist in static storage.');
assert.equal(fs.statSync(approvedTakePath).size, 12_141, 'The persistent One take size changed.');
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync(approvedTakePath)).digest('hex'),
  approvedHash,
  'The persistent One take changed without review.',
);

console.log('Lesson 2.6 persistent One audio checks passed for all six immutable assets.');
