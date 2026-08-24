const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(mobileRoot, 'src/components/LessonCardView.tsx'), 'utf8');

assert.match(
  source,
  /const needsPortraitImageFeedbackSpace\s*=\s*!isLandscape\s*&&\s*!hasTextOnlyOptions\s*&&\s*optionsInteractive\s*&&\s*card\.options\.length >= 2/,
  'Portrait image-choice cards must reserve room for answer feedback.',
);
assert.match(
  source,
  /needsPortraitImageFeedbackSpace\s*\?\s*76\s*:\s*58/,
  'Image choices must reserve enough room for encouragement plus a two-line teaching hint.',
);
assert.match(
  source,
  /const constrainedPortraitImageOptionWidth = usePortraitImageStack\s*\?\s*Math\.min\(portraitImageContentWidth, \(optionImageHeight \* \(3 \/ 2\)\) \+ 24\)/,
  'Only the established two-card portrait stack may scale from available height.',
);
assert.match(
  source,
  /width: constrainedPortraitImageOptionWidth \?\? optionWidth/,
  'The height-constrained width must fall back to the established layout width.',
);
assert.doesNotMatch(
  source,
  /constrainedPortraitImageOptionWidth = usePortraitImageStack \|\| usePortraitImageGrid/,
  'Four-card portrait grids must never inherit the two-card stack width constraint.',
);
assert.match(
  source,
  /const usePortraitImageGrid = !isLandscape && !hasTextOnlyOptions && card\.options\.length >= 3[\s\S]*?const optionWidth =[\s\S]*?: '48%';/,
  'Four image choices must retain the established two-column width in portrait.',
);
assert.match(
  source,
  /options:\s*\{[\s\S]*?flexDirection: 'row'[\s\S]*?flexWrap: 'wrap'[\s\S]*?justifyContent: 'center'/,
  'Four image choices must retain the wrapping row container required for a 2x2 grid.',
);
assert.match(
  source,
  /optionImageThreeByTwoFrame:\s*\{ aspectRatio:\s*3 \/ 2, overflow:\s*'hidden' \}/,
  'The shared option frame must remain 3:2.',
);

console.log('Portrait image choices preserve the two-card stack, four-card 2x2 grid, and visible teaching feedback.');
