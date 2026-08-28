const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const config = require(process.argv[2]);
const mobileRoot = path.resolve(__dirname, '..');
const audioName = 'one-corrected.mp3';
const audioPath = path.join(mobileRoot, 'assets', 'course-audio', audioName);
const audioSources = fs.readFileSync(path.join(mobileRoot, 'src', 'courseAudioSources.ts'), 'utf8');
const pronunciationPractice = fs.readFileSync(
  path.join(mobileRoot, 'src', 'components', 'PronunciationPractice.tsx'),
  'utf8',
);
const repositoryRoot = path.resolve(mobileRoot, '..');
const frontendApi = fs.readFileSync(path.join(repositoryRoot, 'frontend', 'lib', 'api.js'), 'utf8');
const lesson = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'lesson-2-6-numbers-1-10.json'),
  'utf8',
));

const standaloneOneCards = lesson.cards.filter(
  (card) => card.prompt === 'One' && card.audio_text === 'One',
);
assert.deepEqual(
  standaloneOneCards.map((card) => card.stage),
  ['Learn', 'Recognize', 'Speak'],
  'Every standalone One slide must remain covered by the corrected take.',
);
assert.equal(
  config.courseAudioVoice('lesson-2-6-numbers-1-10', 'Recognize'),
  'female-warm',
  'Lesson 2.6 Recognize must resolve to the narrator keyed by the corrected One take.',
);
assert.equal(
  config.courseAudioVoice('lesson-2-6-numbers-1-10', 'Learn'),
  'female-teacher',
  'Lesson 2.6 Learn must resolve to the teacher narrator keyed by the corrected One take.',
);
assert.equal(
  config.courseAudioVoice('lesson-2-6-numbers-1-10', 'Speak'),
  'female-teacher',
  'Lesson 2.6 Speak must resolve to the teacher narrator keyed by the corrected One take.',
);

assert.ok(fs.existsSync(audioPath), 'The corrected One take must travel in the Preview OTA.');
assert.ok(fs.statSync(audioPath).size > 10_000, 'The corrected One take appears incomplete.');
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync(audioPath)).digest('hex'),
  '802f1c7d7e2d8a3e868f89f7d99fdb106f0f3b7fd4876cfe088634e4b9e9f432',
  'The locally transcribed One take changed without review.',
);
assert.ok(
  audioSources.includes(`require('../assets/course-audio/${audioName}')`),
  'The corrected One take needs a literal Metro require.',
);
for (const key of [
  'One\\nprompt\\nprompt\\nfemale-teacher',
  'One\\nprompt\\nprompt\\nfemale-warm',
  'One\\npronunciation_slow\\nsplit-ing\\nfemale-teacher',
]) {
  assert.ok(
    audioSources.includes(`'${key}': require('../assets/course-audio/${audioName}')`),
    `${key} must use the corrected One take.`,
  );
}
assert.match(
  pronunciationPractice,
  /courseAudioSource\(\s*phrase,\s*'pronunciation_slow',\s*'split-ing',\s*audioProvider,\s*audioVoice,/,
  'Speak model playback must resolve the bundled corrected One take before remote TTS.',
);

const approvedHash = '802f1c7d7e2d8a3e868f89f7d99fdb106f0f3b7fd4876cfe088634e4b9e9f432';
for (const relativePath of [
  'frontend/public/audio-cache/bc06ace82c3184414aea5cc3441c86631e32e22d01c94435f08f3cd46c2bf130.mp3',
  'frontend/public/audio-cache/e1eed4d47b85db95b7e2f18adb1cd045ca2db713af9f89a14ee4542f8bedce23.mp3',
  'backend/storage/audio-cache/bc06ace82c3184414aea5cc3441c86631e32e22d01c94435f08f3cd46c2bf130.mp3',
  'backend/storage/audio-cache/e1eed4d47b85db95b7e2f18adb1cd045ca2db713af9f89a14ee4542f8bedce23.mp3',
]) {
  const cachedAudio = path.join(repositoryRoot, relativePath);
  assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(cachedAudio)).digest('hex'),
    approvedHash,
    `${relativePath} must contain the approved corrected One take.`,
  );
}
assert.match(
  frontendApi,
  /spokenText === "One"[\s\S]*?CORRECTED_ONE_ASSET_VERSION/,
  'Web playback must cache-bust the replaced standalone One assets.',
);

console.log('Lesson 2.6 One audio checks passed.');
