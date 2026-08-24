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
  /Math\.min\(defaultPortraitImageOptionWidth, \(optionImageHeight \* \(3 \/ 2\)\) \+ 24\)/,
  'Portrait image choices must scale from the available height without changing the 3:2 ratio.',
);
assert.match(
  source,
  /width: constrainedPortraitImageOptionWidth \?\? optionWidth/,
  'The height-constrained width must be applied to every portrait image option.',
);
assert.match(
  source,
  /optionImageThreeByTwoFrame:\s*\{ aspectRatio:\s*3 \/ 2, overflow:\s*'hidden' \}/,
  'The shared option frame must remain 3:2.',
);

console.log('Portrait image choices preserve visible teaching feedback.');
