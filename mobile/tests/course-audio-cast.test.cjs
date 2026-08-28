const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = require(process.argv[2]);
const mobileRoot = path.resolve(__dirname, '..');
const course = JSON.parse(fs.readFileSync(
  path.join(mobileRoot, 'src', 'generated', 'a1-course.json'),
  'utf8',
));

assert.equal(
  config.COURSE_AUDIO_PROFILE,
  'a1-elevenlabs-cast-v15-liam-use',
  'The audited no-Brian course cast must keep its versioned profile.',
);
assert.equal(course.length, 70, 'The cast audit must cover the complete 70-lesson A1 course.');

const routedCards = [];
for (const lesson of course) {
  for (const [cardIndex, card] of lesson.cards.entries()) {
    routedCards.push({
      lessonId: lesson.id,
      cardNumber: cardIndex + 1,
      stage: card.stage,
      narrator: config.courseAudioVoice(lesson.id, card.stage),
    });
  }
}

const brianCards = routedCards.filter((card) => card.narrator === 'male-warm');
assert.deepEqual(
  brianCards,
  [],
  'Brian (male-warm) must not remain on any active A1 course route.',
);

const useCards = routedCards.filter((card) => String(card.stage).trim().toLowerCase() === 'use');
assert.ok(useCards.length > 0, 'The cast audit did not find any Use cards.');
assert.ok(
  useCards.every((card) => card.narrator === 'male-conversational'),
  'Every Use card must route to the verified Liam narrator.',
);

console.log(`Course audio cast checks passed for ${routedCards.length} cards.`);
