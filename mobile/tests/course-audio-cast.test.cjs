const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const course = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'a1-course.json'),
  'utf8',
));
const profileSource = fs.readFileSync(
  path.join(repositoryRoot, 'backend', 'app', 'course_audio_profile.py'),
  'utf8',
);

assert.equal(course.length, 70, 'The cast audit must cover the complete 70-lesson A1 course.');

const narratorVoiceIds = profileSource.match(/NARRATOR_VOICE_IDS = \{([\s\S]*?)\n\}/)?.[1];
assert.ok(narratorVoiceIds, 'The persistent render profile must pin provider voice IDs.');
assert.match(
  narratorVoiceIds,
  /"female-warm": "EXAVITQu4vr4xnSDxMaL"/,
  'Sarah must remain the exact approved voice behind Ana and female characters.',
);
assert.match(
  narratorVoiceIds,
  /"male-conversational": "TX3LPaxmHKxFdv7VOQHJ"/,
  'Liam must remain the exact approved voice behind male characters.',
);

const speakerNarrators = profileSource.match(/SPEAKER_NARRATORS = \{([\s\S]*?)\n\}/)?.[1];
assert.ok(speakerNarrators, 'The persistent render profile must declare its provider-neutral cast.');
for (const femaleRole of ['ana', 'sofia', 'female-character']) {
  assert.match(
    speakerNarrators,
    new RegExp(`"${femaleRole}": "female-warm"`),
    `${femaleRole} must keep the approved Sarah voice.`,
  );
}
for (const maleRole of ['luis', 'diego', 'male-character']) {
  assert.match(
    speakerNarrators,
    new RegExp(`"${maleRole}": "male-conversational"`),
    `${maleRole} must use the approved Liam voice.`,
  );
}
assert.doesNotMatch(
  speakerNarrators,
  /"male-warm"/,
  'No active course role may route to the retired Brian voice.',
);

const semanticRoles = new Set(['teacher', 'question', 'answer']);
const femaleRoles = new Set(['ana', 'sofia', 'female-character']);
const maleRoles = new Set(['luis', 'diego', 'male-character']);
const supportedRoles = new Set([...semanticRoles, ...femaleRoles, ...maleRoles]);
const namedCounts = { ana: 0, female: 0, male: 0 };
let assetCount = 0;

for (const lesson of course) {
  for (const [cardIndex, card] of lesson.cards.entries()) {
    assert.ok(
      Array.isArray(card.audio_assets) && card.audio_assets.length > 0,
      `${lesson.id} card ${cardIndex + 1} must carry immutable audio assets.`,
    );
    for (const asset of card.audio_assets) {
      assetCount += 1;
      assert.ok(
        supportedRoles.has(asset.speaker_role),
        `${lesson.id} card ${cardIndex + 1} uses unsupported speaker role ${asset.speaker_role}.`,
      );
      assert.doesNotMatch(
        asset.speaker_role,
        /^(?:female|male)-(?:teacher|warm|conversational)$/,
        'Mobile lesson data must store semantic roles, never provider narrator names.',
      );
      if (asset.speaker_role === 'ana') namedCounts.ana += 1;
      if (femaleRoles.has(asset.speaker_role)) namedCounts.female += 1;
      if (maleRoles.has(asset.speaker_role)) namedCounts.male += 1;
    }
  }
}

assert.ok(assetCount > 0, 'The generated course must expose its persistent audio catalog.');
assert.ok(namedCounts.ana > 0, 'The generated catalog must exercise Ana\'s consistent Sarah role.');
assert.ok(namedCounts.female > 0, 'The generated catalog must exercise female-character casting.');
assert.ok(namedCounts.male > 0, 'The generated catalog must exercise male-character casting.');

console.log(
  `Course audio cast checks passed for ${assetCount} immutable assets `
    + `(${namedCounts.ana} Ana, ${namedCounts.male} male-character).`,
);
