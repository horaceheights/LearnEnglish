const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

const appSource = source('../App.tsx');
const courseSource = source('../src/screens/CourseScreen.tsx');
const lessonSource = source('../src/screens/LessonScreen.tsx');
const loginSource = source('../src/screens/LoginScreen.tsx');
const profileSource = source('../src/screens/ProfileScreen.tsx');
const brandHeaderSource = source('../src/components/BrandHeader.tsx');
const webSource = source('../../frontend/components/LessonPlayer.js');
const webSceneSource = source('../../frontend/app/test-scenes/page.js');
const guardrailSource = source('../../docs/product/project-guardrails.md');

assert.match(appSource, /<LoginScreen[\s\S]*?onHome=\{\(\) => setScreen\(\{ name: 'course' \}\)\}/);
assert.match(appSource, /<LessonScreen[\s\S]*?onHome=\{\(\) => setScreen\(\{ name: 'course' \}\)\}/);
assert.match(appSource, /<CourseScreen[\s\S]*?onHome=\{\(\) => setScreen\(\{ name: 'course' \}\)\}/);
assert.match(loginSource, /<BrandHeader[\s\S]*?onLogoPress=\{onHome\}/);
assert.match(profileSource, /<BrandHeader[\s\S]*?onLogoPress=\{onCancel\}/);
assert.match(brandHeaderSource, /accessibilityLabel="Ir a Inicio"/);
assert.match(courseSource, /accessibilityLabel="Ir a Inicio"[\s\S]*?onPress=\{onHome\}[\s\S]*?spanglish-header-logo/);

assert.match(lessonSource, /accessibilityLabel="Salir de la lección e ir a Inicio"/);
assert.match(lessonSource, /'¿Salir de la lección\?'/);
assert.match(lessonSource, /'¿Quieres salir de la lección y volver a Inicio\?'/);
assert.ok(
  (lessonSource.match(/confirmLessonExit\('home'\)/g) || []).length >= 2,
  'Mobile lesson logos in portrait and landscape must request confirmation before going home.',
);

assert.ok(
  (webSource.match(/<SpanGlishLogo[^>]*onClick=/g) || []).length >= 3,
  'Every full web logo must be clickable.',
);
assert.match(webSource, /window\.confirm\('¿Quieres salir de la lección y volver a Inicio\?'\)/);
assert.match(webSource, /<MiniSpanGlishLogo onClick=\{confirmLessonExit\}/);
assert.match(webSceneSource, /<Link href="\/" aria-label="SpanGlish — Ir a Inicio">[\s\S]*?spanglish-logo\.svg/);
assert.match(guardrailSource, /Every learner-facing SpanGlish logo is an accessible navigation control back to home/);

console.log('Logo home navigation checks passed.');
