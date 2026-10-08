import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { element, lessonHarness } from './native-lesson-harness.mjs';

const course = JSON.parse(fs.readFileSync(new URL('../src/generated/a1-course.json', import.meta.url), 'utf8'));
const lesson = course.find(item => item.id === 'lesson-4-9-unit-4-review');

test('review dialogue and clock render exactly one native photograph throughout both turns', () => {
  for (const viewport of [{width: 360, height: 780, fontScale: 1}, {width: 780, height: 360, fontScale: 1.3}]) {
    const harness = lessonHarness(viewport);
    const { LessonCardView } = harness.load('components/LessonCardView.tsx');
    for (const slide of ['L7', 'L8']) {
      const card = lesson.cards.find(item => item.slide_id === slide);
      for (const activeTurnImageUrl of [null, ...card.audio_turns.map(turn => turn.image_url)]) {
        const records = harness.render(() => element(LessonCardView, {
          card, activeTurnImageUrl, level: lesson.level, lessonId: lesson.id, vocabulary: [],
          isAppActive: true, isOffline: false, selectedId: null, result: null, showHelp: false,
          audioProvider: 'elevenlabs', audioVoice: 'female', optionsInteractive: false,
          onSelect() {}, onPronunciationPassed() {}, onPronunciationUnavailable() {}, onGrammarAnimationComplete() {},
        }), viewport.width - 24, viewport.height - 160);
        assert.equal(records.filter(row => row.type === 'Image').length, 1, `${slide}: ${activeTurnImageUrl}`);
      }
    }
  }
});
