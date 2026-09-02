const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const screenSource = fs.readFileSync(
  path.join(mobileRoot, 'src/screens/LessonScreen.tsx'),
  'utf8',
);
const journeySource = fs.readFileSync(
  path.join(mobileRoot, 'src/components/StageJourney.tsx'),
  'utf8',
);
const themeSource = fs.readFileSync(
  path.join(mobileRoot, 'src/lessonStageTheme.ts'),
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

const expectedStages = ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'];
for (const lesson of course) {
  const stageSegments = lesson.cards.reduce((segments, card) => {
    if (segments[segments.length - 1] !== card.stage) segments.push(card.stage);
    return segments;
  }, []);
  assert.deepEqual(
    stageSegments,
    expectedStages,
    `${lesson.id} must preserve the five journey segments that define the shared header colors.`,
  );
}

assert.match(
  themeSource,
  /export const LESSON_STAGE_COLORS = \[\s*'#4f7cac',\s*'#df765b',\s*'#8865b4',\s*'#279487',\s*'#d99b20'/,
  'The shared palette must preserve the approved Learn, Recognize, Listen, Speak, and Use colors.',
);
assert.match(
  themeSource,
  /export function lessonStageColorForCard\(cards: LessonCard\[\], currentIndex: number\)[\s\S]*cards\[index\]\.stage !== cards\[index - 1\]\.stage[\s\S]*lessonStageColorForSegment\(segmentIndex\)/,
  'The header color must be derived from the active contiguous stage segment.',
);
assert.match(
  journeySource,
  /import \{ LESSON_STAGE_COLORS, lessonStageColorForSegment \} from '\.\.\/lessonStageTheme';/,
  'The journey must import the shared stage palette.',
);
assert.match(
  journeySource,
  /const color = lessonStageColorForSegment\(index\);/,
  'Every journey segment must use the shared color resolver.',
);
assert.doesNotMatch(
  journeySource,
  /const STAGE_COLORS =/,
  'StageJourney must not retain a private palette that can drift from the header.',
);
assert.match(
  screenSource,
  /const activeStageColor = lessonStageColorForCard\(lesson\?\.cards \?\? \[\], cardIndex\);/,
  'The lesson header must resolve its color from the current card segment.',
);
assert.match(
  screenSource,
  /<Text accessibilityRole="header" style=\{\[[\s\S]*?styles\.stage,[\s\S]*?activeStageColor \? \{ color: activeStageColor \} : null,[\s\S]*?\]\}>/,
  'The illustrated-panel section label must receive the active journey-segment color.',
);
assert.doesNotMatch(
  screenSource,
  /stageListenInstruction/,
  'The header must not special-case purple for Listen or apply it to every section.',
);
assert.match(
  screenSource,
  /const promptFontSize = useCompactHeaderInstruction\s*\? 14\s*:\s*basePromptFontSize/,
  'Learning phrases must retain the established responsive third-line size.',
);
assert.ok(
  course.some((lesson) => lesson.cards.some((card) => card.prompt === 'He is a man.')),
  'The color guardrail must cover the approved learning-phrase example.',
);
assert.match(
  guardrails,
  /exact color of its matching journey segment[\s\S]*Learn blue `#4f7cac`[\s\S]*Recognize coral `#df765b`[\s\S]*Listen purple `#8865b4`[\s\S]*Speak teal `#279487`[\s\S]*Use gold `#d99b20`/,
  'Durable product memory must record the section-specific color mapping.',
);
assert.match(
  guardrails,
  /Color every active mobile section label with the exact color of its matching journey segment/,
  'Durable product memory must protect the shared section-color rule.',
);
assert.match(
  interactionVerifier,
  /node tests\/lesson-section-header-color\.test\.cjs/,
  'Preview interaction verification must run the section-color guardrail.',
);

console.log(`All ${course.length} lessons share journey/header section colors while preserving learning-phrase typography.`);
