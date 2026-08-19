const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');

assert.match(
  lessonScreenSource,
  /const DOUBLE_TAP_DELAY_MS = 500;/,
  'Android must have enough time to deliver both completed presses in a double tap.',
);

assert.match(
  lessonScreenSource,
  /now - lastPromptTapRef\.current <= DOUBLE_TAP_DELAY_MS[\s\S]+?openSentenceTranslation\(\);/,
  'The second prompt tap must continue opening the Spanish translation.',
);

assert.match(
  lessonScreenSource,
  /const HELP_DISPLAY_MS = 5000;/,
  'Lesson help must remain visible for exactly five seconds.',
);

assert.match(
  lessonScreenSource,
  /if \(!showHelp\) return undefined;\s+const timer = setTimeout\(\(\) => setShowHelp\(false\), HELP_DISPLAY_MS\);\s+return \(\) => clearTimeout\(timer\);/,
  'Lesson help must auto-close and clean up its timer.',
);

assert.match(
  lessonScreenSource,
  /setShowHelp\(false\);\s+setShowSentenceCoachmark\(false\);/,
  'Changing cards must continue closing help immediately.',
);

console.log('Lesson help lifecycle checks passed.');
