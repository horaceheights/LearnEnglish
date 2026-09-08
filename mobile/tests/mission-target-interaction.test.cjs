const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { fitMissionHeadScene, missionCueOrder } = require('../src/missionTargetInteraction.js');
const mission = require('../src/generated/lesson-10-family-mission.json');
const anchors = require('../../scripts/mission-head-anchors.json');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8').replaceAll('\r', '');
const surface = read('../src/components/MissionGameSurface.tsx');
const screen = read('../src/screens/LessonScreen.tsx');
const web = read('../../frontend/components/LessonPlayer.js');

test('both clients use the same placement and shuffle algorithm', () => {
  assert.equal(read('../src/missionTargetInteraction.js'), read('../../frontend/lib/missionTargetInteraction.cjs'));
});

test('all 74 targets retain the reviewed crown anchors and group membership', () => {
  let count = 0;
  for (const card of mission.cards.slice(0,18)) for (const target of card.mission_game.targets) {
    assert.deepEqual(target.head_anchors, anchors[card.slide_id][target.id].map(([x,y]) => ({x,y})));
    assert.equal(target.head_anchors.length > 1, target.label_es !== 'Persona');
    count++;
  }
  assert.equal(count, 74);
});

test('actual markers fit, never overlap, and clear every reviewed face at all viewport sizes', () => {
  for (const [width,height] of [[296,410],[328,560],[388,680],[400,190],[650,190],[760,820],[960,430]]) {
    for (const card of mission.cards.slice(0,18)) {
      const l = fitMissionHeadScene(width,height,card.mission_game.targets);
      assert.ok(l, card.slide_id);
      assert.ok(l.height <= height && l.width <= width);
      assert.ok(Math.abs(l.imageWidth/l.imageHeight - 1.5) < .0001);
      assert.ok(l.imageX >= 4 && l.imageY >= 4);
      assert.ok(l.imageWidth >= (height < 240 ? 185 : Math.min(width-8,(height-115)*1.5)), card.slide_id+' image too small');
      for (const [i,m] of l.markers.entries()) {
        assert.ok(m.width >= 48 && m.height >= 48);
        assert.ok(m.x >= 0 && m.y >= 0 && m.x+m.width <= width && m.y+m.height <= height);
        for (const h of m.heads) assert.ok(m.y+m.height <= h.y-7);
        for (const o of l.markers.slice(i+1)) {
          assert.ok(m.x+m.width <= o.x || o.x+o.width <= m.x || m.y+m.height <= o.y || o.y+o.height <= m.y,
            card.slide_id+': overlapping touch areas');
        }
        for (const h of l.markers.flatMap(o=>o.heads)) {
          assert.ok(m.x+m.width <= h.x-l.imageWidth*.03 || m.x >= h.x+l.imageWidth*.03 ||
            m.y+m.height <= h.y || m.y >= h.y+l.imageHeight*.12, card.slide_id+': marker covers face');
        }
      }
    }
  }
});

test('shuffle keeps all targets and their exact audio indices, without changing authored content', () => {
  let seed=17;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for (const card of mission.cards.slice(0,18)) {
    const before=JSON.stringify(card), permutations=new Set();
    for(let run=0;run<30;run++) {
      const order=missionCueOrder(card.mission_game,random);
      permutations.add(order.join(','));
      assert.deepEqual([...order].sort((a,b)=>a-b),card.mission_game.cues.map((_,i)=>i));
      if(card.mission_game.tutorial_mode) assert.equal(order[0],0);
      for(const i of order) assert.equal(card.audio_turns[i].text,card.mission_game.cues[i].text);
    }
    assert.ok(permutations.size>2);
    assert.equal(JSON.stringify(card),before);
  }
  assert.ok(screen.includes('promptTurnSequence?.[missionOrder[cueIndex] ?? cueIndex]'));
  assert.ok(web.includes('cardAudioTurnSequence(currentCard, "prompt")?.[missionOrder[cueIndex] ?? cueIndex]'));
  assert.ok(surface.includes('game.cues[cueOrder[cueIndex] ?? cueIndex]'));
  assert.ok(screen.includes('[currentCard?.mission_game, cardRunId]'));
});

test('a correct dot plays once, leaves time for the effect, and retains canonical scoring', () => {
  assert.ok(surface.includes('onTargetFound()'));
  assert.ok(surface.includes('selectionLockRef.current = true'));
  assert.ok(surface.includes('}, 2200)'));
  assert.ok(screen.includes("onTargetFound={() => playMissionSound('tile-place')}"));
  assert.ok(surface.includes('onSubmit(game.cues.map((cue) => cue.option_id))'));
  assert.ok(screen.includes('if (!usesMissionGameSurface) playMissionSound'));
});
