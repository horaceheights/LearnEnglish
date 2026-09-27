const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// An exchange shows each speaker's picture while it plays. On an answer-choice card that added
// a third, larger picture above the choices and showed the answer (Unit 3 review, 2026-09-26),
// so there the voices take turns and the card stays as authored.
const mobileRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(mobileRoot, '..');
const source = fs.readFileSync(path.join(mobileRoot, 'src', 'lessonTurnImages.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleExports = {};
new Function('exports', 'require', compiled)(moduleExports, require);
const { visibleTurnImageUrl } = moduleExports;
const course = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'src', 'generated', 'a1-course.json'), 'utf8'));

const speaker = '/lesson-assets/speaker.webp';

test('a speaker picture never appears on an answer-choice card without its own prompt picture', () => {
  for (const [stage, interaction_type] of [['Recognize', 't2i2'], ['Listen', 'a2i2'], ['Listen', 'a2t2'], ['Listen', 'listen-text']]) {
    assert.equal(visibleTurnImageUrl({ stage, interaction_type, prompt_image_url: '' }, speaker), null, interaction_type);
  }
  assert.equal(
    visibleTurnImageUrl({ stage: 'Recognize', interaction_type: 'i2t2', prompt_image_url: '/lesson-assets/scene.webp' }, speaker),
    speaker,
    'a picture-and-sentence card still shows each speaker after the answer',
  );
  for (const [stage, interaction_type] of [['Learn', 'teach'], ['Speak', 'speak'], ['Speak', 'repeat'], ['Recognize', 'mission-game'], ['Speak', 'mission-speak']]) {
    assert.equal(visibleTurnImageUrl({ stage, interaction_type, prompt_image_url: '' }, speaker), speaker, interaction_type);
  }
  assert.equal(visibleTurnImageUrl({ stage: 'Learn', interaction_type: 'teach', prompt_image_url: '' }, null), null);
  assert.equal(visibleTurnImageUrl(undefined, speaker), null, 'no card, no picture');
});

test('no card in the course lets a spoken turn cover or reveal its choices', () => {
  const hidden = [];
  for (const lesson of course) {
    for (const card of lesson.cards) {
      for (const turn of [...(card.audio_turns ?? []), ...(card.answer_audio_turns ?? [])]) {
        const shown = visibleTurnImageUrl(card, turn.image_url);
        const choice = (card.stage === 'Recognize' || card.stage === 'Listen') && !card.interaction_type.startsWith('mission-');
        if (choice && !card.prompt_image_url) {
          assert.equal(shown, null, `${lesson.sub_lesson_id} ${card.slide_id} must keep its choices uncovered.`);
          hidden.push(`${lesson.sub_lesson_id} ${card.slide_id}`);
        } else {
          assert.equal(shown, turn.image_url, `${lesson.sub_lesson_id} ${card.slide_id} keeps showing each speaker.`);
        }
      }
    }
  }
  // The Unit 3 exchanges on picture and listening cards, and Lesson 7.7 A6.
  for (const slide of ['3.1 R9', '3.1 A8', '3.1 A9', '3.3 R1', '3.4 R9', '3.8 R5', '3.9 A4', '7.7 A6']) {
    assert.ok(hidden.includes(slide), `${slide} must play its voices without covering the choices.`);
  }
});

test('mobile and web resolve the shown picture through the shared rule', () => {
  const mobileCard = fs.readFileSync(path.join(mobileRoot, 'src', 'components', 'LessonCardView.tsx'), 'utf8');
  assert.match(mobileCard, /const activeTurnImageUrl = visibleTurnImageUrl\(card, playingTurnImageUrl\);/);
  const webPlayer = fs.readFileSync(path.join(repositoryRoot, 'frontend', 'components', 'LessonPlayer.js'), 'utf8');
  assert.match(webPlayer, /from "\.\.\/\.\.\/mobile\/src\/lessonTurnImages"/);
  assert.match(webPlayer, /const activeTurnImageUrl = visibleTurnImageUrl\(currentCard, playingTurnImageUrl\);/);
});
