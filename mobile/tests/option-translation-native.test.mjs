// Traducir layout (2026-11-18): while the Spanish shows, every written tile grows by
// the same band, the English keeps its 16dp/22dp floor, and nothing clips.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';

const catalog = JSON.parse(fs.readFileSync(new URL('../src/generated/all-courses.json', import.meta.url), 'utf8'));
const writtenChoices = catalog.flatMap(lesson => lesson.cards.map(card => ({ ...card, lessonId: lesson.id, lessonLevel: lesson.level })))
  .filter(card => ['Recognize', 'Listen'].includes(card.stage) && !card.mission_game && card.options.length >= 2
    && card.options.every(option => !option.image_url && option.spanish_translation));
const photoToSentence = writtenChoices.filter(card => card.stage === 'Recognize' && card.prompt_image_url);
const listenChoices = writtenChoices.filter(card => card.stage === 'Listen');
const longest = [...photoToSentence].sort((a, b) =>
  Math.max(...b.options.map(o => o.spanish_translation.length)) - Math.max(...a.options.map(o => o.spanish_translation.length)))[0];
const cards = [
  photoToSentence.find(card => card.lessonId === 'a1plus-unit-1-lesson-1-8' && card.options.length === 3),
  photoToSentence.find(card => card.lessonId === 'lesson-1-people-actions' && card.options.length === 3),
  photoToSentence.find(card => card.options.length === 2),
  longest,
  listenChoices.find(card => !card.prompt_image_url && card.options.length === 3),
  listenChoices.find(card => card.prompt_image_url && card.options.length === 3),
  [...listenChoices].sort((a, b) =>
    Math.max(...b.options.map(o => o.spanish_translation.length)) - Math.max(...a.options.map(o => o.spanish_translation.length)))[0],
];
const noop = () => {};

test('every written tile grows by the same Spanish band without clipping or shrinking the English', () => {
  assert.ok(cards.every(Boolean), 'Fixtures come from the shipped catalog.');
  for (const viewport of [{ width: 360, height: 780, fontScale: 1 }, { width: 390, height: 844, fontScale: 1.3 },
    { width: 800, height: 1280, fontScale: 1 }]) {
    const floor = Math.min(viewport.width, viewport.height) >= 540 ? 22 : 16;
    for (const card of cards) {
      const heights = {};
      for (const visible of [false, true]) {
        const h = lessonHarness(viewport);
        const { LessonCardView } = h.load('components/LessonCardView.tsx');
        const width = viewport.width - 20;
        const records = h.render(() => e('View', { style: { flex: 1 }, children: e(LessonCardView, {
          card, lessonId: card.lessonId, level: card.lessonLevel, result: null, selectedId: null, selectedIds: [],
          showHelp: false, userId: 'layout-test', onSelect: noop, onResetSelection: noop, optionsInteractive: true,
          onPronunciationPassed: noop, onPronunciationUnavailable: noop, onGrammarAnimationComplete: noop,
          optionTranslationsVisible: visible, allowVerticalGrowth: true,
        }) }), width, 2400);
        const context = `${card.lessonId}/${card.slide_id} ${viewport.width}x${viewport.height}@${viewport.fontScale} visible=${visible}`;
        const tiles = card.options.map(option => records.find(r => r.type === 'Pressable' && r.props.accessibilityLabel === option.label));
        assert.ok(tiles.every(Boolean), `${context}: every choice renders as a tile.`);
        const tileHeights = tiles.map(tile => tile.box.height);
        assert.ok(Math.max(...tileHeights) - Math.min(...tileHeights) <= 1, `${context}: equal tiles ${tileHeights}`);
        heights[visible] = Math.min(...tileHeights);
        card.options.forEach((option, index) => {
          const tile = tiles[index].box;
          const english = records.find(r => r.type === 'Text' && r.text === option.label);
          assert.ok(english.fontSize >= floor - 0.01, `${context}: English keeps its ${floor}dp floor (${english.fontSize}).`);
          assert.ok(english.textHeight <= english.box.height + 1.5, `${context}: English fits.`);
          const spanish = records.find(r => r.type === 'Text' && r.text === option.spanish_translation);
          assert.equal(Boolean(spanish), visible, `${context}: Spanish shows only while Traducir is open.`);
          if (spanish) {
            assert.ok(spanish.textHeight <= spanish.box.height + 1.5, `${context}: Spanish fits: ${option.spanish_translation}`);
            assert.ok(spanish.box.top >= english.box.top + english.box.height - 1, `${context}: Spanish sits under the English.`);
            assert.ok(spanish.box.top + spanish.box.height <= tile.top + tile.height + 1
              && spanish.box.left >= tile.left - 1 && spanish.box.left + spanish.box.width <= tile.left + tile.width + 1,
            `${context}: Spanish stays inside its tile.`);
          }
        });
      }
      assert.ok(heights[true] > heights[false], `${card.slide_id}: tiles grow while the Spanish shows.`);
    }
  }
});
