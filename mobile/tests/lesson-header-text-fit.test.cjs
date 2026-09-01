const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
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

const authoredHeaderPrompts = course.flatMap((lesson) => (
  lesson.cards
    .filter((card) => card.stage !== 'Speak' && card.prompt.trim())
    .map((card) => ({ lessonId: lesson.id, prompt: card.prompt, stage: card.stage }))
));

assert.equal(course.length, 70, 'The adaptive header guardrail must cover the complete A1 course.');
assert.ok(
  authoredHeaderPrompts.some(({ prompt }) => prompt === 'The woman is drinking, ___ is drinking.'),
  'The guardrail fixture must include the annotated overflowing completion prompt.',
);
assert.ok(
  authoredHeaderPrompts.some(({ prompt }) => prompt.length >= 50),
  'The guardrail must cover authored headers longer than the annotated completion prompt.',
);

assert.match(
  screenSource,
  /<Text\s+adjustsFontSizeToFit=\{isTheyPhrasePilotCard \|\| !useCompactHeaderInstruction\}\s+minimumFontScale=\{isTheyPhrasePilotCard \? 0\.66 : useCompactHeaderInstruction \? undefined : 0\.45\}\s+numberOfLines=\{2\}/,
  'Authored lesson headers, including the pilot phrase box, must use native largest-text-that-fits behavior within two lines.',
);
assert.match(
  screenSource,
  /const promptFontSize = useCompactHeaderInstruction\s*\? 14\s*:\s*basePromptFontSize \* \(correctContrastPrompt \? 0\.76 : 1\)/,
  'Dynamic fitting must begin at the established responsive size while compact instructions remain 14 dp.',
);
assert.doesNotMatch(
  screenSource,
  /ellipsizeMode=["']tail["']/,
  'Teaching prompts must not opt into tail ellipsis.',
);
assert.match(
  guardrails,
  /Authored third-line lesson text must start at its established responsive size[\s\S]*native largest-text-that-fits behavior[\s\S]*never use one smaller fixed size for every phrase[\s\S]*never permit clipping, overflow, or an ellipsis/,
  'Durable product memory must define adaptive fitting rather than a fixed smaller font.',
);
assert.match(
  guardrails,
  /compact Spanish instruction lines remain fixed at 14 dp because they are a separate instruction standard/,
  'Durable product memory must keep compact instruction typography separate from authored phrase fitting.',
);
assert.match(
  interactionVerifier,
  /node tests\/lesson-header-text-fit\.test\.cjs/,
  'Preview interaction verification must run the lesson-header text-fit guardrail.',
);

console.log(`Adaptive two-line fitting protects ${authoredHeaderPrompts.length} authored lesson headers across all 70 lessons.`);
