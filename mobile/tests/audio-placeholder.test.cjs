const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '../src/config.ts');
const sourceMapPath = path.resolve(__dirname, '../src/courseAudioSources.ts');
const generatedRoot = path.resolve(__dirname, '../src/generated');
const bundledRoot = path.resolve(__dirname, '../assets/course-audio/completion-prompts');
const configSource = fs.readFileSync(configPath, 'utf8');
const sourceMap = fs.readFileSync(sourceMapPath, 'utf8');
const compiledConfigPath = process.argv[2];

assert.match(
  configSource,
  /throw new Error\('Completion placeholders require bundled silent-pause audio\.'\)/,
  'The remote course-audio URL boundary must reject every completion placeholder.',
);

assert.match(
  sourceMap,
  /return BUNDLED_COMPLETION_PROMPTS\[completionPromptKey\(text\)\] \?\? SILENT_COMPLETION_PROMPT/,
  'Blank prompts must resolve to bundled audio with a silence-only fail-safe.',
);

assert.match(
  sourceMap,
  /return courseAudioUrl\(text, mode, variant, provider, narrator\)/,
  'Only text without a visual blank may reach the remote course-audio URL.',
);

function completionPromptKey(text) {
  return String(text || '')
    .replace(/\s*_{2,}\s*[.,!?]?/g, ' {blank} ')
    .replace(/\s+/g, ' ')
    .trim();
}

const mappedPrompts = new Map(
  [...sourceMap.matchAll(/^\s*'([^']+)': require\('\.\.\/assets\/course-audio\/completion-prompts\/([a-f0-9]+\.mp3)'\),$/gm)]
    .map((match) => [match[1], match[2]]),
);
const referencedPrompts = new Set();

for (const filename of fs.readdirSync(generatedRoot)) {
  if (!filename.endsWith('.json')) continue;
  const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, filename), 'utf8'));
  for (const card of lesson.cards) {
    const promptAudio = card.audio_text ?? card.prompt ?? '';
    if (!/_{2,}/.test(promptAudio)) continue;
    const key = completionPromptKey(promptAudio);
    referencedPrompts.add(key);
    const audioFile = mappedPrompts.get(key);
    assert.ok(audioFile, `${filename} has no bundled completion audio for: ${key}`);
    const audioPath = path.join(bundledRoot, audioFile);
    assert.ok(fs.existsSync(audioPath), `${audioFile} is missing from bundled completion audio.`);
    assert.ok(fs.statSync(audioPath).size > 10_000, `${audioFile} is not a valid checked-in audio clip.`);
  }
}

assert.ok(referencedPrompts.size > 0, 'Generated lessons must exercise completion-audio guardrails.');

if (compiledConfigPath) {
  const { courseAudioUrl } = require(path.resolve(compiledConfigPath));
  assert.throws(
    () => courseAudioUrl('It is a ___.'),
    /Completion placeholders require bundled silent-pause audio/,
    'Literal underscores must be rejected before the remote audio URL is built.',
  );
  assert.throws(
    () => courseAudioUrl('It is a ...'),
    /Completion placeholders require bundled silent-pause audio/,
    'Ellipsis placeholders must be rejected before the remote audio URL is built.',
  );
  assert.doesNotThrow(
    () => courseAudioUrl('It is a park.'),
    'Completed answers without placeholders must remain valid remote audio requests.',
  );
}

console.log(`Verified ${referencedPrompts.size} bundled completion prompts without TTS placeholders.`);
