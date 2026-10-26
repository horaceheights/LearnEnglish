const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText, filename);
const { constructionTeachingPlan, constructionMistakeHint } = require('../src/constructionTeaching.ts');
const { lessonMistakeHint } = require('../src/lessonMistakeHints.ts');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/a1plus-unit1-constructions.json'), 'utf8'));

function construction(target) {
  const labels = target.match(/[a-z]+(?:'[a-z]+)?/gi);
  const options = labels.map((label, index) => ({ id: String(index), label, image_url: '' }));
  return { stage: 'Use', interaction_type: 'complete-sentence', prompt: target.replace(/[a-z]+(?:'[a-z]+)?/gi, '___'),
    options, correct_option_id: '0', correct_option_ids: options.map(option => option.id), answer_audio_text: target, audio_text: target };
}
function swap(card, a, b) {
  const attempt = [...card.correct_option_ids];
  [attempt[a], attempt[b]] = [attempt[b], attempt[a]];
  return attempt;
}
function hint(target, a, b) {
  const card = construction(target);
  return constructionMistakeHint(card, swap(card, a, b));
}

test('all 90 audited constructions explain every reachable pair swap and preserve complete attempts', () => {
  assert.equal(fixture.sourceContentSha256, 'fbba411138f55793f8891245cf979c35ec0bcaa433e25b1298432284bf2e97bb');
  assert.equal(fixture.cards.length, 90);
  let attempts = 0;
  let equivalent = 0;
  for (const card of fixture.cards) {
    const context = `${card.slide_id}: ${card.answer_audio_text}`;
    const plan = constructionTeachingPlan(card);
    assert.equal(plan.supported, true, context);
    assert.equal(plan.explanations.length, card.correct_option_ids.length, context);
    assert.ok(plan.explanations.every(Boolean), context);
    assert.equal(lessonMistakeHint(card, card.correct_option_ids), '', context);
    assert.equal(lessonMistakeHint(card, card.correct_option_ids.slice(1)), '', `unfinished ${context}`);
    assert.equal(lessonMistakeHint(card, [...card.correct_option_ids.slice(1), 'unknown-tile']), '', `missing tile ${context}`);
    const verify = attempt => {
      const actual = attempt.map(id => card.options.find(option => option.id === id).label);
      const first = plan.labels.findIndex((word, index) => word !== actual[index]);
      const explanation = lessonMistakeHint(card, attempt);
      assert.equal(explanation, constructionMistakeHint(card, attempt), context);
      if (first < 0) {
        assert.equal(explanation, '', context);
        equivalent++;
        return;
      }
      assert.ok(explanation.startsWith(`Pusiste “${actual[first]}” donde va “${plan.labels[first]}”.`), `${context}: ${explanation}`);
      assert.match(explanation, /antes|después|primero|delante|entre|abre|abren|al final/i, `${context}: ${explanation}`);
      assert.doesNotMatch(explanation, /undefined|“\s*”|_{2,}|La respuesta es|Revisa el orden|siempre debes|nunca puede/, context);
      assert.ok(explanation.length <= 230, `${context}: ${explanation.length} characters: ${explanation}`);
      attempts++;
    };
    for (let a = 0; a < plan.labels.length; a++) for (let b = a + 1; b < plan.labels.length; b++) verify(swap(card, a, b));
    verify([...card.correct_option_ids].reverse());
    verify([...card.correct_option_ids.slice(1), card.correct_option_ids[0]]);
  }
  assert.ok(equivalent > 0, 'Repeated words must remain interchangeable.');
  console.log(`A1+ construction coverage: ${fixture.cards.length} cards, ${attempts} wrong attempts, ${equivalent} equivalent attempts.`);
});

test('routine questions teach question words, auxiliary, subject and the base action', () => {
  assert.match(hint('What time do you finish work?', 0, 1), /What time.+hora.+antes del auxiliar/);
  assert.match(hint('How often do you study?', 0, 1), /How often.+frecuencia/);
  assert.match(hint('Where does Ana study?', 1, 2), /auxiliar.+does.+antes del sujeto.+Ana/);
  assert.match(hint('When does Luis work?', 2, 3), /sujeto.+Luis.+antes de.+work.+forma base/);
  assert.match(hint('Does Ana finish work at five?', 0, 1), /auxiliar.+Does.+antes del sujeto.+Ana/);
  assert.match(hint('Why does Luis take off his jacket?', 3, 4), /take off.+quitarse/);
  assert.match(hint('Yes, he does.', 1, 2), /sujeto.+he.+antes de.+does.+auxiliar/);
  assert.match(hint("She doesn't finish work at five.", 1, 2), /doesn't.+niega.+antes de.+finish.+forma base/);
  for (const target of ['Where does Ana studies?', 'When do Luis work?', "She doesn't finishes work.", "I doesn't work."]) {
    assert.equal(constructionTeachingPlan(construction(target)).supported, false, target);
  }
});

test('routine chunks explain their full meaning rather than isolated particles', () => {
  assert.match(hint('I put on my jacket.', 1, 2), /put on.+ponerse/);
  assert.match(hint('I take off my shoes.', 1, 2), /take off.+quitarse/);
  assert.doesNotMatch(hint('I take off my shoes.', 1, 2), /tomar|transporte/);
  assert.match(hint('I get up at seven.', 1, 2), /get up.+levantarse/);
  assert.match(hint('I take a shower.', 2, 3), /a.+acompaña al nombre.+shower.+delante/);
  assert.match(hint("Let's meet at the library.", 0, 1), /proponer.+Let's.+actividad/);
  assert.match(hint('Why not?', 0, 1), /motivo de un rechazo.+primero.+Why.+después.+not/);
});

test('frequency, time ranges and movable time phrases explain the authored model accurately', () => {
  assert.match(hint('She never studies at night.', 1, 2), /En este modelo.+never.+frecuencia.+antes del verbo.+studies/);
  assert.match(hint('Ana usually studies at home.', 0, 1), /Ana.+antes de.+usually.+frecuencia/);
  assert.match(hint('I work from eight to five.', 2, 4), /from.+hora inicial.+to.+hora final/);
  assert.match(hint('I work from eight to five.', 4, 5), /To.+hora final.+antes de.+five/);
  assert.match(hint('Today he is studying at the library.', 0, 1), /En este modelo.+Today.+antes del sujeto/);
  assert.match(hint('Today he is studying at the library.', 2, 3), /auxiliar.+antes del verbo.+studying/);
  assert.match(hint('Is she studying at home today?', 1, 2), /sujeto.+she.+studying/);
  assert.match(hint('I arrive home before dinner.', 3, 4), /before.+antes de.+dinner.+momento de referencia/);
});

test('before, after, contrast and reason clauses retain local grammar and explain cross-clause swaps', () => {
  assert.match(hint('I finish work before I arrive home.', 3, 4), /before.+primera acción ocurre antes de la segunda/);
  assert.match(hint('I arrive home after I finish work.', 3, 4), /after.+primera acción ocurre después de la segunda/);
  assert.match(hint('Ana leaves home, but Luis arrives home.', 3, 4), /but.+segunda parte contrasta/);
  assert.match(hint('I am tired because I work.', 3, 4), /because.+segunda parte da el motivo/);
  assert.match(hint('Because it is cold.', 0, 1), /Because.+antes del motivo.+Why/);
  assert.match(hint('I finish work before I arrive home.', 5, 6), /arrive.+home/);
  assert.doesNotMatch(hint('I finish work before I arrive home.', 5, 6), /before.+primera acción/);
  for (const target of ['If I had known, I would have called.', 'I finish work before flying.', 'Because flibbertigibbet.']) {
    assert.equal(constructionTeachingPlan(construction(target)).supported, false, target);
  }
});
