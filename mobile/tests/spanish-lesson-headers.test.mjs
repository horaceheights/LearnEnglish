// The lesson header is Spanish in every unit, as it was first in Lesson 1.1:
// the section name (Aprende, Reconoce, Escucha, Habla, Completa) and the
// instruction in the importance box. English appears there only as lesson content.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { lessonHarness } from './native-lesson-harness.mjs';

const course = JSON.parse(fs.readFileSync(new URL('../src/generated/a1-course.json', import.meta.url), 'utf8'));
const instructions = lessonHarness({ width: 390, height: 844, fontScale: 1 }).load('lessonInstructions.ts');

test('every card in every unit shows a Spanish section name', () => {
  const english = [];
  for (const lesson of course) {
    for (const card of lesson.cards) {
      const label = instructions.lessonStageLabel(lesson.id, card.stage);
      const short = instructions.lessonStageShortLabel(lesson.id, card.stage);
      if (label === card.stage || short === card.stage) english.push(`${lesson.id} ${card.slide_id} ${card.stage}`);
    }
  }
  assert.deepEqual(english, []);
  assert.equal(instructions.lessonStageLabel('lesson-2-2-streets-and-transportation', 'Use'), 'Completa');
  assert.equal(instructions.lessonStageLabel('lesson-2-1-places-around-me', 'Recognize'), 'Reconoce');
});

test('an empty Recognize prompt asks for the word or the phrase in Spanish', () => {
  const lesson = id => course.find(item => item.id === id);
  const card = (id, slide) => lesson(id).cards.find(item => item.slide_id === slide);
  // Since the 2026-09-24 reuse pass the word-choice example is 2.6's numeral card (Two or One).
  const colors = card('lesson-2-6-numbers-1-10', 'R2');
  const park = card('lesson-2-1-places-around-me', 'R7');
  assert.equal(colors.prompt, '');
  assert.equal(park.prompt, '');
  assert.equal(instructions.lessonHeaderPromptText('lesson-2-6-numbers-1-10', 'Recognize', '', colors.options),
    '¡Elige la palabra correcta!');
  assert.equal(instructions.lessonHeaderPromptText('lesson-2-1-places-around-me', 'Recognize', '', park.options),
    '¡Elige la frase correcta!');
  assert.equal(instructions.lessonHeaderPromptText('lesson-2-1-places-around-me', 'Recognize', 'A boy', park.options),
    'A boy', 'authored English content stays as the lesson wrote it');
});
