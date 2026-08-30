const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const cardView = fs.readFileSync(
  path.join(mobileRoot, 'src/components/LessonCardView.tsx'),
  'utf8',
);
const lessonScreen = fs.readFileSync(
  path.join(mobileRoot, 'src/screens/LessonScreen.tsx'),
  'utf8',
);
const guardrails = fs.readFileSync(
  path.resolve(mobileRoot, '../docs/product/project-guardrails.md'),
  'utf8',
);
const interactionVerifier = fs.readFileSync(
  path.join(mobileRoot, 'scripts/verify-interaction-paths.ps1'),
  'utf8',
);

assert.match(
  lessonScreen,
  /lessonLocation:\s*\{[^}]*fontSize:\s*16[^}]*lineHeight:\s*20/,
  'The unit and lesson context must remain twice the original 8 dp label size.',
);
assert.match(
  lessonScreen,
  /stage:\s*\{[^}]*fontSize:\s*20[^}]*lineHeight:\s*24/,
  'Every active lesson section must remain twice the original 10 dp label size.',
);
assert.match(
  lessonScreen,
  /stageOnlyLabel:\s*\{\s*lineHeight:\s*24\s*\}/,
  'Stage-only Learn cards must not clip the enlarged section label.',
);

assert.match(
  cardView,
  /const landscapeImageColumnCount = useTabletImageGrid\s*\? 2\s*:\s*Math\.max\(1, card\.options\.length\)/,
  'Tablet four-card choices must remain a 2x2 grid while other landscape counts keep their authored row.',
);
assert.match(
  cardView,
  /const heightAwareThreeByTwoFrameWidth = Math\.max\([\s\S]*?optionImageHeight \* \(3 \/ 2\)\) \+ 24/,
  'Landscape 3:2 frames must cap their width from the measured remaining card height.',
);
assert.match(
  cardView,
  /width:\s*constrainedPortraitImageOptionWidth\s*\?\? constrainedLandscapeImageOptionWidth\s*\?\? optionWidth/,
  'Height-aware landscape sizing must apply without replacing the existing portrait constraint or authored option widths.',
);
assert.match(
  cardView,
  /const useFullWidthSingleActionVideo = useExpandedSingleActionVideo && !isTabletLandscape/,
  'Landscape tablet teaching videos must not override the shared height-aware single-card width cap.',
);
assert.match(
  cardView,
  /useFullWidthSingleActionVideo \? styles\.singleActionVideoOption : null/,
  'The full-width teaching-video style must remain scoped to phones.',
);
assert.match(
  cardView,
  /tabletImageGridWidth[\s\S]*?alignSelf:\s*'center',[\s\S]*?width:\s*tabletImageGridWidth/,
  'A height-capped tablet grid must stay centered and exactly two columns wide.',
);

assert.match(
  guardrails,
  /mobile unit\/lesson context at 16 dp and the active section label at 20 dp on both phones and tablets/,
  'The approved phone and tablet header scale must be durable product memory.',
);
assert.match(
  guardrails,
  /no one-, two-, three-, or four-card layout may overlap the header or extend beneath Android system navigation/,
  'The guardrail must explicitly cover overlay risk for every option count on tablets and phones.',
);
assert.match(
  interactionVerifier,
  /node tests\/tablet-lesson-layout\.test\.cjs/,
  'Preview interaction verification must always run the phone and tablet layout guardrail.',
);

console.log('Tablet and phone lesson headers stay readable while image-card layouts remain height-aware and non-overlapping.');
