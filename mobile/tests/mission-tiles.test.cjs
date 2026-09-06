const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = path.resolve(__dirname, '..');
const board = fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'MissionTileBoard.tsx'), 'utf8');
const state = fs.readFileSync(path.join(mobileRoot, 'src', 'missionTileState.ts'), 'utf8');
const cardView = fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'LessonCardView.tsx'), 'utf8');
const lessonScreen = fs.readFileSync(path.join(mobileRoot, 'src', 'screens', 'LessonScreen.tsx'), 'utf8');
const verifier = fs.readFileSync(path.join(mobileRoot, 'scripts', 'verify-interaction-paths.ps1'), 'utf8');

test('mission construction has complete equivalent tap and drag paths', () => {
  assert.match(board, /PanResponder\.create/);
  assert.match(board, /measureInWindow/);
  assert.match(board, /Promise\.all\(\[/, 'Every release must freshly measure the bank and every target.');
  assert.match(board, /placeMissionTileForCard\(/);
  assert.match(board, /moveMissionTileForCard\(/);
  assert.match(board, /removeMissionTileForCard\(/);
  assert.match(board, /onPress=\{\(\) => placeFromBank\(option\.id\)\}/);
  assert.match(board, /onPress=\{\(\) => removeFromSlot\(index\)\}/);
  assert.match(board, /name: 'decrement'/);
  assert.match(board, /name: 'increment'/);
  assert.match(board, /onMove=\{\(offset\) => commit\(/);
  assert.match(board, /bankBounds && boundsContain\(bankBounds, pageX, pageY\)/);
  assert.match(board, /useSafeAreaInsets\(\)/);
  assert.match(board, /rightEdge - origin\.x - origin\.width/);
  assert.match(board, /bottomEdge - origin\.y - origin\.height/);
});

test('mission construction is editable and checks only on explicit learner action', () => {
  assert.doesNotMatch(board, /instructionFor|card\.instruction_es/);
  assert.match(lessonScreen, /const missionInstruction = missionExperience \? currentCard\?\.instruction_es\?\.trim\(\)/);
  assert.match(lessonScreen, /const localizedPrompt = useMissionInstruction[\s\S]*?missionInstruction/);
  assert.match(board, />Comprobar</);
  assert.match(board, /disabled=\{disabled \|\| !canCheck\}/);
  assert.match(board, />Deshacer</);
  assert.match(board, />Reiniciar</);
  assert.doesNotMatch(
    board,
    /La respuesta se conserva\. Mueve o quita/,
    'The board must not duplicate the shared slot-specific teaching hint with generic feedback.',
  );
  assert.match(board, /missionTileBoardCanCheck\(card, effectiveSlots\)/);
  assert.match(lessonScreen, /const checkMissionTileSelection = \(\) =>/);
  assert.match(lessonScreen, /if \(!missionTileBoardCanCheck\(currentCard, missionTileSlots\)\) return;/);
  assert.match(lessonScreen, /choose\([^\n]+nextSelectedIds\);/);
  assert.match(lessonScreen, /const changeMissionTileSelection = [\s\S]*?setResult\(null\)/);
  assert.match(lessonScreen, /missionConstruction:[\s\S]*?slots: missionTileSlots/);
});

test('target labels and responsive safety remain visible on phones and tablets', () => {
  assert.match(board, /card\.mission_targets\?\.\[index\]/);
  assert.match(board, /target\?\.label \|\| `Lugar \$\{index \+ 1\}`/);
  assert.match(board, /flexWrap: 'wrap'/);
  assert.match(board, /minHeight: 48/);
  assert.match(board, /width <= 360 \|\| fontScale > 1\.15/);
  assert.match(board, /missionTileSlotWidthForCard\(card, width, fontScale\)/);
  assert.match(state, /viewportWidth <= 360 \|\| fontScale > 1\.15/);
  assert.match(state, /isShortThreeTileSequence[\s\S]*?return '31%'/);
  assert.match(state, /missionTileBoardMode\(card\) === 'targets' && correctIds\.length === 3[\s\S]*?return '31%'/);
  assert.match(state, /viewportWidth >= 720/);
  assert.match(board, /tileText:[^\n]*fontSize: 16/);
  assert.match(board, /tileTextTablet:[^\n]*fontSize: 22/);
  assert.match(board, /targetLabel:[^\n]*fontSize: 16/);
  assert.match(board, /targetLabelTablet:[^\n]*fontSize: 22/);
  assert.doesNotMatch(board, /numberOfLines=\{3\}|minimumFontScale|adjustsFontSizeToFit/);
  assert.match(board, /android_hyphenationFrequency="none"/);
  assert.match(lessonScreen, /scrollEnabled=\{!missionDragActive\}/);
  assert.match(cardView, /isMissionTileInteraction\(card\.interaction_type\)/);
  assert.match(cardView, /missionTargetImageMaxHeightForCard\(/);
  assert.match(cardView, /missionTargetImageHeight \?\? Math\.min\(/);
  assert.match(lessonScreen, /needsAccessibleScrolling \|\| isMissionTileCard \|\| \(missionExperience && viewportHeight < 860\)/);
  assert.match(cardView, /MissionTileBoard/);
  assert.match(
    cardView,
    /accessibilityLabel=\{card\.visual_description_es \|\| card\.answer_audio_text \|\| card\.prompt/,
    'Mission hero images must expose the authored Spanish spatial description before answer-text fallbacks.',
  );
});

test('protected interaction verification includes state and UI contracts', () => {
  assert.match(verifier, /src\/missionTileState\.ts/);
  assert.match(verifier, /node tests\/mission-tile-state\.test\.cjs/);
  assert.match(verifier, /node tests\/mission-tiles\.test\.cjs/);
  assert.match(verifier, /node tests\/mission-opening\.test\.cjs/);
});
