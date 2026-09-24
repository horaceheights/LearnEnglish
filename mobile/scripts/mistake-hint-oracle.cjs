// Report the choice-card mistakes that the app's hint resolver can only answer
// generically. The content engine uses this to avoid proposing wrong options whose
// contrast the learner would not have explained (see the contextual-help guardrail).
//
// Usage: node mobile/scripts/mistake-hint-oracle.cjs < lesson.json
// Prints a JSON list of [correct label, wrong label] pairs.
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const ts = require(path.join(mobileRoot, 'node_modules', 'typescript'));

function load(name) {
  const source = fs.readFileSync(path.join(mobileRoot, 'src', `${name}.ts`), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('exports', 'require', 'module', output)(
    module.exports,
    (id) => (id.startsWith('./') ? load(id.slice(2)) : require(id)),
    module,
  );
  return module.exports;
}

const { lessonMistakeHint } = load('lessonMistakeHints');
// The same limits mobile/tests/lesson-mistake-hints.test.cjs enforces on choice cards.
const GENERIC = /^La respuesta es|^Aquí corresponde|Lee la explicación|Reintentar/i;
const constructions = new Set(['complete2', 'complete3', 'complete4', 'complete-sentence']);

const lesson = JSON.parse(fs.readFileSync(0, 'utf8'));
const unexplained = [];
for (const card of lesson.cards || []) {
  if ((card.options || []).length < 2 || constructions.has(card.interaction_type)) continue;
  const correct = card.options.find((option) => option.id === card.correct_option_id);
  for (const wrong of card.options) {
    if (wrong.id === card.correct_option_id) continue;
    const hint = lessonMistakeHint(card, [wrong.id]);
    if (!hint.trim() || GENERIC.test(hint) || hint.length > 140) unexplained.push([correct.label, wrong.label]);
  }
}
process.stdout.write(JSON.stringify(unexplained));
