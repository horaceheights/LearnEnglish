// Onboarding and learner languages (user decision 2026-11-28,
// docs/product/multilingual-architecture.md): a learner picks the language to learn,
// the help language among complete pairs, minutes per day and days per week. Each
// language keeps its own goal; existing learners go through onboarding once.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const mobileRoot = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(mobileRoot, relative), 'utf8');
function load(relative) {
  const output = ts.transpileModule(read(relative), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: () => ({}) });
  return exports;
}

const api = load('src/learnerLanguages.ts');
const catalogs = JSON.parse(read('src/generated/course-catalogs.json'));
const plain = value => JSON.parse(JSON.stringify(value));
const german = { target: 'de', help: 'en', dailyMinutes: 10, daysPerWeek: 5, startedAt: '2026-11-28T00:00:00.000Z' };

test('onboarding offers each taught language with only its complete help languages', () => {
  const offers = plain(api.languageOffers(catalogs)).map(({ target, help }) => [target, help]);
  assert.deepEqual(offers, [['en', ['es']], ['es', ['en']], ['de', ['en']], ['fr', []]]);
});

test('a help language must be offered by every course of the target', () => {
  const offers = plain(api.languageOffers([
    { id: 'x1', level: 'X1', title: 'X1', lessonIds: [], targetLanguage: 'de', helpLanguages: ['en', 'es'] },
    { id: 'x2', level: 'X2', title: 'X2', lessonIds: [], targetLanguage: 'de', helpLanguages: ['en'] },
  ]));
  assert.deepEqual(offers.find(offer => offer.target === 'de').help, ['en']);
});

test('learners without a valid language go through onboarding, existing ones included', () => {
  assert.equal(api.needsOnboarding({}), true);
  assert.equal(api.needsOnboarding({ languages: [] }), true);
  assert.equal(api.needsOnboarding({ languages: [{ ...german, help: 'de' }] }), true);
  assert.equal(api.needsOnboarding({ languages: [{ ...german, daysPerWeek: 8 }] }), true);
  assert.equal(api.needsOnboarding({ languages: [german] }), false);
});

test('each language keeps its own goal and the newest choice becomes active', () => {
  const spanish = { ...german, target: 'es', dailyMinutes: 20, daysPerWeek: 3 };
  const first = api.withLearnerLanguage({ displayName: 'Ana' }, german);
  assert.equal(first.activeTarget, 'de');
  const second = api.withLearnerLanguage(first, spanish);
  assert.deepEqual(plain(api.learnerLanguages(second)).map(entry => [entry.target, entry.dailyMinutes]), [['de', 10], ['es', 20]]);
  assert.equal(api.activeLearnerLanguage(second).target, 'es');
  assert.equal(api.activeLearnerLanguage({ ...second, activeTarget: 'de' }).dailyMinutes, 10);
  assert.equal(api.learnerLanguageFor(second, 'es').daysPerWeek, 3);
  assert.equal(api.learnerLanguageFor(second, 'fr'), null);
});

test('screens before a help language follow the device: Spanish or English', () => {
  assert.equal(api.deviceHelpLanguage('es-MX'), 'es');
  assert.equal(api.deviceHelpLanguage('en_US'), 'en');
  assert.equal(api.deviceHelpLanguage('hi-IN'), 'en');
  assert.equal(api.deviceHelpLanguage(''), 'en');
});

test('language names follow the help language', () => {
  assert.equal(api.languageName('de', 'es'), 'alemán');
  assert.equal(api.languageName('de', 'en'), 'German');
  assert.equal(api.languageName('fr', 'de'), 'French');
});

test('the app routes every learner without a language through onboarding', () => {
  const app = read('App.tsx');
  assert.match(app, /if \(!activeLanguage \|\| screen\.name === 'add-language'\) \{/);
  assert.match(app, /<OnboardingScreen/);
  assert.match(app, /<CourseScreen\s+activeTarget=\{activeLanguage\.target\}\s+helpLanguage=\{activeLanguage\.help\}/);
  // QA forces a help language only on QA lessons.
  assert.match(app, /screen\.qaMode \? qaHelpLanguage : null/);
  assert.match(read('src/screens/EngineQAScreen.tsx'), /Idioma de ayuda/);
});
