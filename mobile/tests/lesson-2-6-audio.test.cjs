const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const config = require(process.argv[2]);
const mobileRoot = path.resolve(__dirname, '..');
const audioName = 'one-corrected.mp3';
const audioPath = path.join(mobileRoot, 'assets', 'course-audio', audioName);
const audioSources = fs.readFileSync(path.join(mobileRoot, 'src', 'courseAudioSources.ts'), 'utf8');
const lesson = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'lesson-2-6-numbers-1-10.json'),
  'utf8',
));

const recognizeOne = lesson.cards.find(
  (card) => card.stage === 'Recognize' && card.audio_text === 'One',
);
assert.ok(recognizeOne, 'Lesson 2.6 must retain the Recognize card targeted by the corrected One take.');
assert.equal(
  config.courseAudioVoice('lesson-2-6-numbers-1-10', recognizeOne.stage),
  'female-warm',
  'Lesson 2.6 Recognize must resolve to the narrator keyed by the corrected One take.',
);
assert.equal(
  config.courseAudioVoice('lesson-2-6-numbers-1-10', 'Learn'),
  'female-teacher',
  'The corrected Recognize take must not change the Learn narrator.',
);
assert.equal(
  config.courseAudioVoice('lesson-2-6-numbers-1-10', 'Speak'),
  'female-teacher',
  'The corrected Recognize take must not change the Speak narrator.',
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
assert.match(
  audioSources,
  /'One\\nprompt\\nprompt\\nfemale-warm': require\('\.\.\/assets\/course-audio\/one-corrected\.mp3'\)/,
  'Only the intended female-warm Recognize prompt should use the corrected One take.',
);

console.log('Lesson 2.6 One audio checks passed.');
