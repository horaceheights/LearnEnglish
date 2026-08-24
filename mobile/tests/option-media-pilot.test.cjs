const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const cardView = fs.readFileSync(path.join(mobileRoot, 'src/components/LessonCardView.tsx'), 'utf8');
const lessonPlayer = fs.readFileSync(path.join(repositoryRoot, 'frontend/components/LessonPlayer.js'), 'utf8');
const lesson = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'src/generated/lesson-7-is-are-not.json'), 'utf8'));
const pilotName = 'family_grandparents_sitting_3x2_pilot.webp';
const pilotPath = path.join(mobileRoot, 'assets/lesson-assets', pilotName);

const pilotCards = lesson.cards.filter((card) =>
  card.options.some((option) => option.image_url?.includes(pilotName)),
);

assert.equal(pilotCards.length, 2, 'the pilot must stay limited to the two reviewed Lesson 1.7 comparisons');
assert.ok(pilotCards.every((card) => card.options.length === 2), 'the pilot must use two-option cards');
assert.ok(fs.existsSync(pilotPath), 'the 3:2 grandparents pilot image must be bundled');
assert.match(cardView, /useThreeByTwoOptionMediaPilot\s*\?\s*\([\s\S]*?styles\.optionImageThreeByTwoFrame[\s\S]*?resizeMode="cover"/);
assert.match(cardView, /optionImageThreeByTwoFrame:\s*\{\s*aspectRatio:\s*3\s*\/\s*2,\s*overflow:\s*'hidden'\s*\}/);
assert.match(cardView, /optionImageThreeByTwoFill:\s*\{\s*height:\s*'100%',\s*width:\s*'100%'\s*\}/);
assert.match(cardView, /useThreeByTwoFrame=\{useThreeByTwoOptionMediaPilot\}/);
assert.match(cardView, /useThreeByTwoFrame\s*\?\s*styles\.actionMediaThreeByTwo\s*:\s*\{\s*height\s*\}/);
assert.match(cardView, /actionMediaThreeByTwo:\s*\{\s*aspectRatio:\s*3\s*\/\s*2\s*\}/);
assert.match(cardView, /resizeMode=\{useThreeByTwoFrame\s*\?\s*'cover'\s*:\s*'contain'\}/);
assert.match(lessonPlayer, /useThreeByTwoOptionMediaPilot[\s\S]*?aspectRatio:\s*"3 \/ 2"[\s\S]*?objectFit:\s*"cover"/);

console.log('Lesson 1.7 uses the isolated 3:2 option-media pilot on web and mobile.');
