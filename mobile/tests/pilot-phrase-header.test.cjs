const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const mobileScreenSource = fs.readFileSync(mobileScreenPath, 'utf8');

assert.match(
  mobileScreenSource,
  /const isTheyPhrasePilotCard = isPortrait[\s\S]*?lesson\?\.id === 'lesson-3-two-people'[\s\S]*?currentCard\?\.stage === 'Recognize'[\s\S]*?currentCard\.prompt\.trim\(\) === 'They'[\s\S]*?currentCard\.correct_option_id === 'pair'/,
  'The phrase-emphasis pilot must remain limited to the requested Lesson 1.3 Recognize “They” portrait card.',
);

assert.match(
  mobileScreenSource,
  /isTheyPhrasePilotCard \? \([\s\S]*?styles\.pilotLessonContext[\s\S]*?\{lessonLocation\}[\s\S]*?lessonStageLabel\(lesson\.id, currentCard\.stage\)/,
  'The pilot card must place lesson and stage context beneath the portrait journey strip.',
);

assert.match(
  mobileScreenSource,
  /isTheyPhrasePilotCard \? styles\.lessonStatusPhrasePilot[\s\S]*?lessonStatusPhrasePilot: \{ flexBasis: 50, flexShrink: 0, minHeight: 50 \}/,
  'The pilot journey strip must reserve its full height so the lesson context cannot overlap it.',
);

assert.match(
  mobileScreenSource,
  /!isTheyPhrasePilotCard \? \([\s\S]*?\{lessonLocation\}[\s\S]*?lessonStageLabel\(lesson\.id, currentCard\.stage\)/,
  'All non-pilot cards must retain the established lesson and stage context in the phrase header.',
);

assert.match(
  mobileScreenSource,
  /isTheyPhrasePilotCard \? styles\.contentHeaderPhrasePilot/,
  'The pilot phrase box must use its compact phrase-only treatment.',
);

assert.match(
  mobileScreenSource,
  /if \(isTheyPhrasePilotCard\) \{[\s\S]*?openSentenceTranslation\(\);[\s\S]*?return;/,
  'One tap on the pilot phrase must show its translation without replaying the prompt.',
);

assert.match(
  mobileScreenSource,
  /isListen \|\| isTheyPhrasePilotCard[\s\S]*?styles\.pilotReplayButton[\s\S]*?styles\.pilotReplayIcon/,
  'The pilot phrase must expose its dedicated edge-mounted replay control.',
);

assert.match(
  mobileScreenSource,
  /isTheyPhrasePilotCard[\s\S]*?\? 'Ellos \/ Ellas'[\s\S]*?: sentenceTranslation/,
  'The pilot phrase must use the approved inclusive Spanish translation.',
);

assert.match(
  mobileScreenSource,
  /pilotReplayButton:[\s\S]*?height: 44[\s\S]*?right: -8[\s\S]*?width: 44/,
  'The pilot replay touch surface must overlap the phrase-card edge at the approved size.',
);

assert.match(
  mobileScreenSource,
  /pilotReplayIcon:[\s\S]*?height: 28[\s\S]*?right: 0[\s\S]*?width: 28/,
  'The visible teal replay icon must use the approved 28-pixel size and outer-right bias.',
);

console.log('Pilot phrase header checks passed.');
