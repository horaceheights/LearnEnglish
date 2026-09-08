const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { fitMissionHeadScene } = require('../src/missionTargetInteraction');
const mission = require('../src/generated/lesson-10-family-mission.json');
const read = p => fs.readFileSync(path.join(__dirname,p),'utf8');
const screen = read('../src/screens/LessonScreen.tsx');
const surface = read('../src/components/MissionGameSurface.tsx');
const header = read('../src/components/MissionLandscapeHeader.tsx');

test('phone listening landscape owns all chrome, including wide phones, without changing portrait or voice gates', () => {
  assert.match(screen, /usesMissionPhoneLandscape = usesMissionGameSurface && !isPortrait && viewportHeight < 600/);
  assert.match(screen, /!usesMissionPhoneLandscape \? qaToolbar : null/);
  assert.match(screen, /!usesMissionPhoneLandscape \? <View style=/);
  assert.match(screen, /landscapeHeader=\{usesMissionPhoneLandscape \?/);
  assert.match(screen, /currentCard\.mission_game\.kind !== 'voice-gate'/);
  assert.match(screen, /!usesMissionPhoneLandscape && needsTextAnswerScrolling/);
  assert.match(screen, /visible=\{showMissionLandscapeMenu\}/);
  assert.match(screen, /<ScrollView accessibilityViewIsModal/);
  assert.match(header, /height: 48, justifyContent: 'center', width: 48/);
});

test('landscape fits the whole native safe area, not the space below the old stacked header', () => {
  for (const [width,height] of [[568,320],[640,360],[740,360],[844,390],[915,412],[932,430]]) {
    // Conservative 24dp safe insets on both sides and below, plus page padding.
    const availableWidth=width-60, availableHeight=height-36;
    const rail=Math.min(280,Math.max(210,availableWidth*.3));
    for(const card of mission.cards.slice(0,18)) {
      const l=fitMissionHeadScene(availableWidth-rail-8,availableHeight,card.mission_game.targets);
      assert.ok(l,`${width}x${height}: ${card.slide_id}`);
      assert.ok(l.height<=availableHeight);
      assert.ok(l.imageWidth>=Math.min(260,(availableHeight-90)*1.5));
      assert.equal(l.markers.length,card.mission_game.cues.length);
      for(const m of l.markers) {
        assert.ok(m.width>=48 && m.height>=48);
        assert.ok(m.x>=0 && m.y>=0 && m.x+m.width<=l.width && m.y+m.height<=l.height);
        for(const h of m.heads) assert.ok(m.chest ? m.y>=h.y+l.imageHeight*.12 : m.y+m.height<h.y);
      }
    }
  }
});

test('rotation retains the same game instance and cue permutation; landscape feedback never covers the scene', () => {
  assert.match(screen, /key=\{`mission-\$\{cardIndex\}-\$\{cardRunId\}`\}/);
  assert.match(screen, /\[currentCard\?\.mission_game, cardRunId\]/);
  assert.match(surface, /\}, \[card\.slide_id\]\)/);
  assert.match(surface, /!useLandscapeGameRail && feedback \?/);
  assert.match(surface, /!useLandscapeGameRail && cueUnavailable && !feedback/);
  assert.match(surface, /!useLandscapeGameRail && !interactionReady/);
  assert.match(surface, /useLandscapeGameRail && feedback \? feedback/);
  assert.match(surface, /useLandscapeGameRail \? landscapeInstruction : game\.instruction_es/);
  assert.match(surface, /\{landscapeHeader\}/);
});
