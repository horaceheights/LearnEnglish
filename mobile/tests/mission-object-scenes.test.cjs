const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const { fitMissionHeadScene, missionCueOrder } = require('../src/missionTargetInteraction');
const lesson = JSON.parse(fs.readFileSync(path.join(root, 'backend/lessons/unit_2/lesson-2-10-around-me-mission.yaml'), 'utf8'));
const proof = JSON.parse(fs.readFileSync(path.join(root, 'docs/qa/unit-2-mission-media-v4.json'), 'utf8'));

test('all 36 object targets bind the reviewed pixels, coordinates and English clues', () => {
  let cues = 0;
  for (const card of lesson.cards.filter(c => c.stage === 'Listen')) {
    const record = proof.assets.find(r => r.runtime_filename === path.basename(card.prompt_image_url));
    assert.ok(record);
    for (const directory of ['Lessons/Lesson1/images', 'mobile/assets/lesson-assets', 'frontend/public/lesson-assets']) {
      const pixels = fs.readFileSync(path.join(root, directory, record.runtime_filename));
      assert.equal(crypto.createHash('sha256').update(pixels).digest('hex'), record.runtime_sha256);
    }
    const game = card.mission_game;
    game.targets.forEach((target, i) => {
      assert.equal(target.subject_kind, 'object');
      assert.deepEqual(target.rect, record.agent_review.targets[i].rect);
      assert.deepEqual(target.head_anchors, record.agent_review.targets[i].head_anchors);
      assert.equal(game.cues.filter(c => c.target_id === target.id).length, 1);
    });
    cues += game.cues.length;
    const order = missionCueOrder(game, () => .17);
    assert.deepEqual([...order].sort(), game.cues.map((_, i) => i));
  }
  assert.equal(cues, 36);
});

test('object rail preserves the full photograph, all member anchors and non-overlapping 48dp controls', () => {
  for (const card of lesson.cards.filter(c => c.stage === 'Listen')) {
    for (const [width, height] of [[328,410], [440,190], [650,190], [560,280], [960,430]]) {
      const frame = fitMissionHeadScene(width, height, card.mission_game.targets);
      assert.ok(frame && frame.height <= height, card.slide_id);
      assert.equal(frame.imageWidth / frame.imageHeight, 1.5);
      assert.ok(frame.imageX >= 0 && frame.imageY >= 0);
      assert.ok(frame.imageX+frame.imageWidth <= width && frame.imageY+frame.imageHeight <= height);
      for (const marker of frame.markers) {
        const target = card.mission_game.targets.find(t => t.id === marker.id);
        assert.equal(marker.heads.length, target.head_anchors.length);
        assert.equal(marker.collective, target.head_anchors.length > 1);
        assert.equal(marker.leaderHeads.length, 1, 'No fan of lines across countable objects');
        assert.ok(marker.width >= 48 && marker.height >= 48);
        assert.ok(marker.x >= 0 && marker.y >= 0 && marker.x+marker.width <= width && marker.y+marker.height <= height);
        for (const other of frame.markers) if (other.id !== marker.id) {
          assert.ok(marker.x+marker.width <= other.x || other.x+other.width <= marker.x || marker.y+marker.height <= other.y || other.y+other.height <= marker.y);
        }
      }
      if (width === 650) assert.equal(frame.imageWidth, 273, 'Object image must not lose height to an overhead row');
    }
  }
});

test('Unit 1 never opts into object geometry and retains its existing leader behavior', () => {
  const unitOne = JSON.parse(fs.readFileSync(path.join(root, 'mobile/src/generated/lesson-10-family-mission.json'), 'utf8'));
  for (const card of unitOne.cards.filter(c => c.mission_game.kind !== 'voice-gate')) {
    assert.ok(card.mission_game.targets.every(t => !t.subject_kind));
    const frame = fitMissionHeadScene(650, 190, card.mission_game.targets);
    assert.ok(frame.markers.every(m => !m.leaderHeads && !m.leaderFrom));
  }
});
