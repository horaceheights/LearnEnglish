const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const compiledAudioSourcesPath = process.argv[2];
if (!compiledAudioSourcesPath) {
  throw new Error('Expected the compiled persistent course-audio source module path.');
}

const {
  completionPromptAudioSource,
  courseAudioAssetSource,
  courseAudioSource,
  findCourseAudioAsset,
  findCourseAudioTurnSequence,
} = require(path.resolve(compiledAudioSourcesPath));

const assetId = 'lesson-test-c001-prompt-1234567890abcdef';
const expectedPath = `/api/audio/assets/${assetId}.mp3`;
const persistentSource = courseAudioSource(
  'Hello',
  'pronunciation_slow',
  'split-ing',
  'persistent-asset',
  `asset:${assetId}`,
);
assert.equal(new URL(persistentSource).pathname, expectedPath);
assert.equal(
  new URL(courseAudioAssetSource({ id: assetId })).pathname,
  expectedPath,
  'Card playback must resolve the same immutable asset URL.',
);

for (const [label, args] of [
  ['legacy provider', ['Hello', 'pronunciation_slow', 'split-ing', 'elevenlabs', `asset:${assetId}`]],
  ['empty asset ID', ['Hello', 'pronunciation_slow', 'split-ing', 'persistent-asset', 'asset:']],
  ['wrong mode', ['Hello', 'prompt', 'split-ing', 'persistent-asset', `asset:${assetId}`]],
  ['wrong variant', ['Hello', 'pronunciation_slow', 'prompt', 'persistent-asset', `asset:${assetId}`]],
]) {
  assert.throws(
    () => courseAudioSource(...args),
    /exact immutable persistent asset/,
    `${label} must not reach learner playback.`,
  );
}

const promptAsset = {
  id: assetId,
  purpose: 'prompt',
  text: 'Hello',
  mode: 'pronunciation_slow',
  variant: 'split-ing',
};
const completionAsset = {
  id: 'lesson-test-c002-prompt-fedcba0987654321',
  purpose: 'prompt',
  text: 'I am Ana.',
  mode: 'prompt',
  variant: 'completion-prompt',
};
const card = { audio_assets: [promptAsset, completionAsset] };
assert.equal(
  findCourseAudioAsset(card, 'prompt', 'pronunciation_slow', 'split-ing', 'Hello'),
  promptAsset,
);
assert.equal(
  findCourseAudioAsset(card, 'prompt', 'prompt', 'split-ing', 'Hello'),
  null,
  'An exact lookup must never fall back to a different card asset.',
);
assert.equal(
  new URL(completionPromptAudioSource(card)).pathname,
  `/api/audio/assets/${completionAsset.id}.mp3`,
  'Completion playback must resolve its pre-rendered masked clip.',
);

const dialogueTurns = [
  { text: 'What is your name?', speaker_role: 'male-character', image_url: '/lesson-assets/man.webp' },
  { text: 'My name is Ana.', speaker_role: 'ana', image_url: '/lesson-assets/ana.webp' },
];
const dialogueAssets = dialogueTurns.map((turn, index) => ({
  id: `lesson-test-c003-prompt-turn-${index + 1}-1234567890abcdef`,
  purpose: `prompt-turn-${index + 1}`,
  text: turn.text,
  speaker_role: turn.speaker_role,
  image_ref: turn.image_url,
}));
const dialogueCard = { audio_assets: dialogueAssets, audio_turns: dialogueTurns };
assert.deepEqual(
  findCourseAudioTurnSequence(dialogueCard, 'prompt'),
  dialogueTurns.map((turn, index) => ({ asset: dialogueAssets[index], turn })),
  'Dialogue playback must preserve authored turn order and exact image/voice bindings.',
);
assert.equal(
  findCourseAudioTurnSequence({
    ...dialogueCard,
    audio_assets: [{ ...dialogueAssets[0], image_ref: '/lesson-assets/wrong.webp' }, dialogueAssets[1]],
  }, 'prompt'),
  null,
  'A mismatched turn image must fail closed instead of playing another clip.',
);

const mobileSourceRoot = path.resolve(__dirname, '../src');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const sourceFiles = [];
const pendingDirectories = [mobileSourceRoot];
while (pendingDirectories.length > 0) {
  const directory = pendingDirectories.pop();
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) pendingDirectories.push(entryPath);
    else if (sourceExtensions.has(path.extname(entry.name))) sourceFiles.push(entryPath);
  }
}

for (const sourceFile of sourceFiles) {
  assert.doesNotMatch(
    fs.readFileSync(sourceFile, 'utf8'),
    /\/api\/audio\/course(?:-completion)?\.mp3/,
    `${path.relative(mobileSourceRoot, sourceFile)} must not expose learner live TTS.`,
  );
}

console.log(`Persistent course-audio source checks passed across ${sourceFiles.length} mobile source files.`);
