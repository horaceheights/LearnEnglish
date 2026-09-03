const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const instructionSource = fs.readFileSync(
  path.join(mobileRoot, 'src/lessonInstructions.ts'),
  'utf8',
);
const screenSource = fs.readFileSync(
  path.join(mobileRoot, 'src/screens/LessonScreen.tsx'),
  'utf8',
);
const course = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src/generated/a1-course.json'),
  'utf8',
));
const guardrails = fs.readFileSync(
  path.join(repositoryRoot, 'docs/product/project-guardrails.md'),
  'utf8',
);
const interactionVerifier = fs.readFileSync(
  path.join(mobileRoot, 'scripts/verify-interaction-paths.ps1'),
  'utf8',
);
const resolverSource = instructionSource.slice(
  instructionSource.indexOf('export function completionEquivalenceFocusWords'),
  instructionSource.indexOf('export function pronunciationInstruction'),
);

const subjectPronouns = new Set(['he', 'she', 'they', 'it']);
const nounToPronounCompletions = course.flatMap((lesson) => (
  lesson.cards.flatMap((card, cardIndex) => {
    if (card.stage !== 'Use' && card.stage !== 'Grammar') return [];
    const correctOption = card.options.find((option) => option.id === card.correct_option_id);
    const selectedAnswer = correctOption?.label?.trim().toLowerCase() || '';
    if (!subjectPronouns.has(selectedAnswer)) return [];
    const clauses = card.prompt.trim().match(
      /^(.+?)\s+(is|are)\s+(.+?)(?:,\s*|\s+and\s+)(?:_{2,}|\[blank\])\s+(is|are)\s+(.+)$/i,
    );
    if (!clauses) return [];
    const expectedBe = selectedAnswer === 'they' ? 'are' : 'is';
    if (clauses[2].toLowerCase() !== expectedBe || clauses[4].toLowerCase() !== expectedBe) return [];
    return [{ answer: selectedAnswer, cardIndex, lessonId: lesson.id, prompt: card.prompt }];
  })
));

assert.ok(
  nounToPronounCompletions.some(({ answer, prompt }) => (
    answer === 'he' && prompt === 'The boy is eating, ___ is eating.'
  )),
  'The guardrail must include the current repeated-predicate boy-to-he completion.',
);

assert.match(
  instructionSource,
  /export function completionEquivalenceFocusWords\(prompt: string, selectedAnswer: string\)[\s\S]*EQUIVALENT_SUBJECT_PRONOUNS\.has\(normalizedAnswer\)[\s\S]*\(\?:,\\s\*\|\\s\+and\\s\+\)/,
  'Equivalence emphasis must be selected from the prompt structure and selected pronoun.',
);
assert.match(
  instructionSource,
  /antecedentBe !== pronounBe \|\| PRONOUN_BE_FORMS\[normalizedAnswer\] !== pronounBe/,
  'Both clauses and the selected pronoun must use matching is/are agreement.',
);
assert.match(
  instructionSource,
  /SUBJECT_FOCUS_STOP_WORDS = new Set\(\['a', 'an', 'and', 'the'\]\)[\s\S]*filter\(\(word\) => !SUBJECT_FOCUS_STOP_WORDS\.has\(word\)\)/,
  'Articles and conjunctions must remain outside the semantic emphasis.',
);
assert.doesNotMatch(
  resolverSource,
  /lesson-2-pronouns|The woman is drinking|cardIndex/,
  'The shared equivalence resolver must not hardcode the annotated lesson, prompt, or card position.',
);
assert.match(
  screenSource,
  /const equivalenceFocusWords = grammarCompleted && selectedLabels\.length === 1\s*\? completionEquivalenceFocusWords\(currentCard\.prompt, selectedLabels\[0\]\)\s*: \[\];/,
  'Antecedent emphasis must remain hidden until the completion is finished.',
);
assert.match(
  screenSource,
  /new Set\(\['is', 'are', \.\.\.selectedFocusWords, \.\.\.equivalenceFocusWords\]\)/,
  'The antecedent and selected pronoun must share the established completion focus set.',
);
assert.match(
  screenSource,
  /highlight:\s*\{\s*color:\s*'#d99b00',\s*fontWeight:\s*'900'\s*\}/,
  'Equivalent words must share the established gold concept-emphasis style.',
);
assert.match(
  guardrails,
  /correct two-clause noun-to-pronoun substitution completion[\s\S]*same gold concept emphasis[\s\S]*inserted pronoun and the meaningful antecedent word or words[\s\S]*rather than lesson IDs, card indexes, fixed person-word lists, or media identity/,
  'Durable product memory must define the structural equivalence-emphasis rule.',
);
assert.match(
  guardrails,
  /Do not color articles or conjunctions, do not reveal the relationship before completion, and do not extend the rule to unrelated completion sentences/,
  'Durable product memory must bound the visual rule to the approved teaching relationship.',
);
assert.match(
  interactionVerifier,
  /node tests\/completion-equivalence-emphasis\.test\.cjs/,
  'Preview interaction verification must run the equivalence-emphasis guardrail.',
);

console.log(`Shared gold equivalence emphasis covers ${nounToPronounCompletions.length} current noun-to-pronoun completion cards.`);
