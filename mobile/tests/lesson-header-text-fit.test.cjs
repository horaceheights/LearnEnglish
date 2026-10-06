const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const courseContract = require('./courseContract.cjs');

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

assert.equal(course.length, courseContract.lessonCount, 'The adaptive header guardrail must cover the complete A1 course.');
assert.ok(
  authoredHeaderPrompts.some(({ prompt }) => prompt === 'The boy and the girl are writing. ___ ___ writing.'),
  'The guardrail fixture must include the annotated overflowing completion prompt.',
);
assert.ok(
  authoredHeaderPrompts.some(({ prompt }) => prompt.length >= 50),
  'The guardrail must cover authored headers longer than the annotated completion prompt.',
);

assert.match(
  screenSource,
  /<Text\s+maxFontSizeMultiplier=\{usesLessonPhoneLandscape \? 1\.3 : undefined\}\s+adjustsFontSizeToFit=\{!useCompactHeaderInstruction\}\s+minimumFontScale=\{useCompactHeaderInstruction \? undefined : usesLessonPhoneLandscape \? 16 \/ \(24 \* Math\.min\(fontScale, 1\.3\)\) : writtenRecognize \? 16 \/ \(promptFontSize \* fontScale\) : 0\.45\}\s+numberOfLines=\{usesLessonPhoneLandscape \? 4 : 2\}/,
  'Authored phrases retain native fitting and the landscape 16dp floor; written recognition also has a 16dp portrait floor.',
);

// Exercise the production expression rather than restating its arithmetic.
// Written presentation is a distinct portrait path; the established modes keep their
// compact instruction, normal phrase and capped landscape behavior.
const minimumScaleExpression = screenSource.match(
  /adjustsFontSizeToFit=\{!useCompactHeaderInstruction\}\s+minimumFontScale=\{([^{}]+)\}/,
)?.[1];
assert.ok(minimumScaleExpression, 'The authored header must retain an explicit text-fitting floor.');
const minimumScale = new Function(
  'useCompactHeaderInstruction', 'usesLessonPhoneLandscape', 'fontScale', 'writtenRecognize', 'promptFontSize',
  `return ${minimumScaleExpression};`,
);
for (const fontScale of [1, 1.3, 2]) {
  for (const promptFontSize of [26, 32, 36]) {
    const portraitScale = minimumScale(false, false, fontScale, true, promptFontSize);
    assert.ok(Math.abs(promptFontSize * fontScale * portraitScale - 16) < 1e-9,
      'Written portrait English must stop at an effective 16dp size.');
    assert.equal(minimumScale(false, false, fontScale, false, promptFontSize), 0.45,
      'Ordinary authored portrait phrases retain their established fitting range.');
  }
  for (const writtenRecognize of [false, true]) {
    const landscapeScale = minimumScale(false, true, fontScale, writtenRecognize, 24);
    assert.ok(Math.abs(24 * Math.min(fontScale, 1.3) * landscapeScale - 16) < 1e-9,
      'Every authored landscape mode keeps the effective 16dp floor with capped system scaling.');
    for (const landscape of [false, true]) {
      assert.equal(minimumScale(true, landscape, fontScale, writtenRecognize, 14), undefined,
        'Compact instructions retain their own fixed typography instead of authored-phrase shrinking.');
    }
  }
}
assert.match(
  screenSource,
  /lineHeight: usesLessonPhoneLandscape \|\| writtenRecognize \? undefined : promptLineHeight/,
  'Written and landscape text may fit their native leading; ordinary portrait phrases preserve established leading.',
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
  /middle importance box shows authored English learning content[\s\S]*start at the established responsive size[\s\S]*native largest-text-that-fits behavior[\s\S]*never use one smaller fixed size for every phrase[\s\S]*never permit clipping, overflow, or an ellipsis/,
  'Durable product memory must define adaptive fitting rather than a fixed smaller font.',
);
assert.match(
  guardrails,
  /Listen uses semibold 14 dp `¡Escucha y elige la frase!`[\s\S]*`¡Escucha y elige la foto!`[\s\S]*Speak.*semibold 14 dp `¡Escucha y repite!`[\s\S]*Recognize.*semibold 14 dp `¡Elige la frase que corresponde a la imagen!`/,
  'Durable product memory must keep compact instruction typography separate from authored phrase fitting.',
);
assert.match(
  interactionVerifier,
  /node tests\/lesson-header-text-fit\.test\.cjs/,
  'Preview interaction verification must run the lesson-header text-fit guardrail.',
);

console.log(`Adaptive fitting protects ${authoredHeaderPrompts.length} authored lesson headers across all ${course.length} lessons, with a 16dp landscape floor.`);
