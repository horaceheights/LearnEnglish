const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = require(process.argv[2]);

const mobileRoot = path.resolve(__dirname, '..');
const imageName = 'they_boy_girl_are_running.webp';
const audioName = 'are-female-teacher.mp3';
const theyAudioName = 'they-female-warm.mp3';
const imagePath = path.join(mobileRoot, 'assets', 'lesson-assets', imageName);
const audioPath = path.join(mobileRoot, 'assets', 'course-audio', audioName);
const theyAudioPath = path.join(mobileRoot, 'assets', 'course-audio', theyAudioName);
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const audioSources = fs.readFileSync(path.join(mobileRoot, 'src', 'courseAudioSources.ts'), 'utf8');
const lessonScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'), 'utf8');
const lesson = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'lesson-3-two-people.json'),
  'utf8',
));

assert.ok(fs.existsSync(imagePath), 'The Lesson 1.3 Are still must travel in the Preview OTA.');
assert.ok(fs.statSync(imagePath).size > 100_000, 'The bundled Are still appears incomplete.');
assert.ok(
  imageSources.includes(`require('../assets/lesson-assets/${imageName}')`),
  'The Lesson 1.3 Are still needs a literal Metro require.',
);

assert.ok(fs.existsSync(audioPath), 'The corrected Are pronunciation must travel in the Preview OTA.');
assert.ok(fs.statSync(audioPath).size > 10_000, 'The corrected Are pronunciation appears incomplete.');
assert.ok(
  audioSources.includes(`require('../assets/course-audio/${audioName}')`),
  'The corrected Are pronunciation needs a literal Metro require.',
);
assert.match(
  audioSources,
  /'Are\\nprompt\\nprompt\\nfemale-teacher'/,
  'Only the intended female-teacher Are prompt should use the corrected take.',
);
assert.ok(fs.existsSync(theyAudioPath), 'The shortened They pronunciation must travel in the Preview OTA.');
assert.ok(fs.statSync(theyAudioPath).size > 10_000, 'The shortened They pronunciation appears incomplete.');
assert.ok(
  audioSources.includes(`require('../assets/course-audio/${theyAudioName}')`),
  'The shortened They pronunciation needs a literal Metro require.',
);
assert.match(
  audioSources,
  /'They\\nprompt\\nprompt\\nfemale-warm'/,
  'Only the intended female-warm Recognize prompt should use the shortened They take.',
);
assert.ok(
  lesson.cards.some((card) => card.stage === 'Recognize' && card.audio_text === 'They'),
  'Lesson 1.3 must retain the exact Recognize prompt targeted by the corrected take.',
);
assert.equal(
  config.courseAudioVoice('lesson-3-two-people', 'Recognize'),
  'female-warm',
  'Lesson 1.3 Recognize must resolve to the narrator keyed by the corrected They take.',
);
assert.match(
  lessonScreen,
  /courseAudioSource\(text, mode, variant, audioProvider, audioVoice\)/,
  'Lesson playback must resolve approved bundled pronunciation takes before remote TTS.',
);

console.log('Lesson 1.3 corrected media checks passed.');
