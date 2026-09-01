const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');

assert.match(
  lessonScreenSource,
  /const handlePromptPress = useCallback\(\(\) => \{[\s\S]*?if \(useCompactHeaderInstruction \|\| !visiblePromptAudio\.trim\(\)\) return;[\s\S]*?openSentenceTranslation\(\);/,
  'One tap on authored English content must open its Spanish translation.',
);

assert.doesNotMatch(
  lessonScreenSource,
  /DOUBLE_TAP_DELAY_MS|lastPromptTapRef|promptTapTimerRef/,
  'The shared phrase box must not retain the old delayed double-tap gesture.',
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
