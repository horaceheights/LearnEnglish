const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const imageName = 'they_boy_girl_are_running.webp';
const audioName = 'are-female-teacher.mp3';
const imagePath = path.join(mobileRoot, 'assets', 'lesson-assets', imageName);
const audioPath = path.join(mobileRoot, 'assets', 'course-audio', audioName);
const imageSources = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonImageSources.ts'), 'utf8');
const audioSources = fs.readFileSync(path.join(mobileRoot, 'src', 'courseAudioSources.ts'), 'utf8');
const lessonScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'), 'utf8');

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
assert.match(
  lessonScreen,
  /courseAudioSource\(text, mode, variant, audioProvider, audioVoice\)/,
  'Lesson playback must resolve approved bundled pronunciation takes before remote TTS.',
);

console.log('Lesson 1.3 Are media checks passed.');
