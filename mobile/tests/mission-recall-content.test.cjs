const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const root = path.resolve(__dirname, '../..');
const lesson = require('../src/generated/lesson-10-family-mission.json');
const expected = require('./fixtures/mission-action-cues.json');
test('varied action cues agree with the selected person, spoken turn and feedback', () => {
  for (const [slide, cues] of Object.entries(expected)) {
    const card = lesson.cards.find(c => c.slide_id === slide);
    for (const [target, text] of Object.entries(cues)) {
      const index = card.mission_game.cues.findIndex(c => c.target_id === target);
      const cue = card.mission_game.cues[index];
      assert.equal(cue.text, text);
      assert.equal(cue.answer_text, text);
      assert.equal(card.options.find(o => o.id === cue.option_id).label, text);
      assert.equal(card.audio_turns[index].text, text);
      assert.equal(card.audio_assets.find(a => a.purpose === 'prompt-turn-' + (index + 1)).text, text);
    }
  }
});
test('recall gates play one female visitor question, keep a private answer, and bundle two distinct reviewed shots', () => {
  const hashes = [
    'bf2356f8e5002db30c7134a4d25d6d3fe8c00688a3e9d178d186744686184145',
    '58e12a32ce95295ab7ff682f89926a8d2f4fd45aa4cf5ea970a05c289854845b',
    'adf78c24749613524c68b2ccdc5bee3f4fdbe755efd0b4dbbf2b6f834cdac0c2',
    'e564e11667e01a24cdb7a1bbf8e7180514858765a422bcb269007d552e0b0d96',
  ];
  lesson.cards.slice(18).forEach((card,i) => {
    assert.equal(card.audio_turns.length, 1);
    const turn = card.audio_turns[0];
    assert.equal(turn.text, card.mission_game.cue_audio_text);
    assert.equal(turn.speaker_role, 'female-character');
    assert.notEqual(turn.text, card.audio_text);
    assert.notEqual(turn.image_url, card.options[0].image_url);
    for (const prefix of ['Lessons/Lesson1/images','frontend/public/lesson-assets','mobile/assets/lesson-assets']) {
      const bytes = fs.readFileSync(path.join(root,prefix,path.basename(turn.image_url)));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hashes[i]);
    }
    const asset = card.audio_assets.find(a => a.purpose === 'prompt-turn-1');
    assert.equal(asset.text, turn.text);
    assert.equal(asset.image_ref, turn.image_url);
    assert.equal(asset.speaker_role, turn.speaker_role);
  });
});
