const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const engine = fs.readFileSync(path.join(mobileRoot, 'src', 'pronunciationEngine.ts'), 'utf8');
assert.match(engine, /family:\s*\['fa', 'mi', 'ly'\]/);
assert.doesNotMatch(engine, /family:\s*\['fam', 'i', 'ly'\]/);

const course = require(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'));
const mission = course.find((lesson) => lesson.sub_lesson_id === '1.10');
assert.ok(mission, 'Unit 1.10 must remain embedded in the mobile course.');
const opener = mission.cards[0];
assert.deepEqual(
  opener.correct_option_ids.map((id) => opener.options.find((option) => option.id === id).label),
  ['FA', 'MI', 'LY'],
  'Spanish-speaking beginners must see the readable FA · MI · LY grouping.',
);
const chunkAudio = opener.audio_assets.filter((asset) => ['fa', 'mi', 'ly', 'fam', 'i'].includes(asset.text.toLowerCase()));
assert.deepEqual(chunkAudio, [], 'Visual chunks must never create isolated English pronunciation clips.');
assert.ok(
  opener.audio_assets.some((asset) => asset.purpose === 'answer' && asset.text.toLowerCase() === 'family'),
  'The completed whole English word must retain its reviewed answer audio.',
);

console.log('Mission syllable display and whole-word audio checks passed.');
