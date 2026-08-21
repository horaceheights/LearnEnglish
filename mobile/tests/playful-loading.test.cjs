const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const loaderSource = fs.readFileSync(path.join(mobileRoot, 'src/components/PlayfulLoading.tsx'), 'utf8');
const appSource = fs.readFileSync(path.join(mobileRoot, 'App.tsx'), 'utf8');
const courseSource = fs.readFileSync(path.join(mobileRoot, 'src/screens/CourseScreen.tsx'), 'utf8');
const lessonSource = fs.readFileSync(path.join(mobileRoot, 'src/screens/LessonScreen.tsx'), 'utf8');
const learnerLoadingSource = [loaderSource, appSource, courseSource, lessonSource].join('\n');

assert.match(loaderSource, /Animated\.loop\(/, 'The shared loader must include a playful animation.');
assert.match(loaderSource, /useReducedMotion\(\)/, 'The loading animation must respect reduced-motion settings.');
assert.match(loaderSource, /accessibilityRole="progressbar"/, 'The loader must expose an accessible progress state.');

for (const [name, source] of [
  ['cold start', appSource],
  ['course', courseSource],
  ['lesson', lessonSource],
]) {
  assert.match(source, /<PlayfulLoading label=/, `${name} loading must use the shared playful loader.`);
}

assert.doesNotMatch(
  learnerLoadingSource,
  /servidor.{0,30}(?:despert|conect)|esperando.{0,30}servidor/i,
  'Learner-facing loading states must not describe backend server behavior.',
);

console.log('Playful loading checks passed.');
