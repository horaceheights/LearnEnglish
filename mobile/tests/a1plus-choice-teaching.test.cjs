const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, filename);
const { lessonMistakeHint } = require('../src/lessonMistakeHints.ts');
const { relationalChoiceHint } = require('../src/choiceTeaching.ts');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/a1plus-unit1-choices.json'), 'utf8'));
const byId = new Map(fixture.cards.map(card => [card.slide_id.replace('a1plus-unit-1-', ''), card]));
const wrongOptions = card => card.options.filter(option => option.id !== card.correct_option_id);
const hint = (id, index = 0) => lessonMistakeHint(byId.get(id), wrongOptions(byId.get(id))[index].id);

test('every repaired bank and every distractor has bounded specific feedback', () => {
  assert.equal(fixture.sourceContentSha256, 'fbba411138f55793f8891245cf979c35ec0bcaa433e25b1298432284bf2e97bb');
  assert.equal(fixture.cards.length, 174);
  let attempts = 0, threeChoiceCards = 0, decisions = 0;
  for (const card of fixture.cards) {
    if (card.options.length === 3) threeChoiceCards++;
    if (card.mission_game?.kind === 'conversation-decision') decisions++;
    for (const option of wrongOptions(card)) {
      const result = lessonMistakeHint(card, option.id);
      assert.ok(result.length > 0 && result.length <= 140, `${card.slide_id}/${option.id}: ${result}`);
      assert.doesNotMatch(result, /^(La respuesta es|Aquí corresponde)|undefined|“\s*”|_{2,}/, `${card.slide_id}: ${result}`);
      // Review prose is deliberately not a runtime source of feedback.
      assert.equal(lessonMistakeHint({...card, hint_es: 'PRIVATE BYPASS', feedbackByOption: {[option.id]: 'PRIVATE BYPASS'}}, option.id), result);
      attempts++;
    }
  }
  assert.equal(attempts, 179);
  assert.equal(threeChoiceCards, 5);
  assert.equal(decisions, 13);
});

test('meeting-time explanations use availability evidence without claiming an inferred time was heard', () => {
  assert.match(hint('1.3-A07'), /Cenar es a las siete.+antes.+seis/);
  assert.doesNotMatch(hint('1.3-A07'), /escuch|oíste|audio dice|frase escuchada/);
  assert.match(hint('1.1-A03'), /trabajo termina.+siete.+seis.+demasiado pronto/);
  assert.match(hint('1.12-06'), /trabajo termina.+seis.+cinco.+ocho/);
  assert.match(hint('1.11-21'), /día disponible.+domingo.+sábado/);
  const card = {...byId.get('1.3-A07'), audio_text: '', audio_turns: [], context_es: ''};
  assert.equal(relationalChoiceHint(card, card.options.find(o => o.id === card.correct_option_id), wrongOptions(card)[0]), '', 'No availability evidence must remain unsupported, not invented.');
});

test('missing-information questions distinguish the information and the event requested', () => {
  assert.match(hint('1.1-A04'), /Falta saber cuándo llegar a casa.+cuándo terminar de trabajar/);
  assert.match(hint('1.6-A01'), /pide hora.+falta frecuencia.+How often/);
  assert.match(hint('1.8-A01'), /pide momento.+falta lugar.+Where/);
  assert.match(hint('1.8-A09'), /levantarse de la cama.+despertarse/);
  assert.match(hint('1.12-05'), /pide hora.+falta motivo/);
  assert.match(hint('1.12-10b'), /Usually.+rutina.+hoy.+Today/);
});

test('reports retain speaker assignments, negation, and both ends of a time interval', () => {
  assert.match(hint('1.2-A01'), /Ana.+ocho.+nueve.+quién/);
  assert.match(hint('1.2-A02'), /Ella.+cinco.+seis.+quién/);
  assert.match(hint('1.7-R02'), /negación descarta las cinco.+descarta las seis/);
  assert.doesNotMatch(hint('1.7-R02'), /hora.+es las cinco/);
  assert.match(hint('1.7-R04'), /niega la acción.+la afirma/);
  assert.match(hint('1.7-R05'), /negación descarta casa.+descarta biblioteca/);
  assert.match(hint('1.11-18', 0), /To.+final.+seis.+siete/);
  assert.match(hint('1.11-18', 1), /From.+inicio.+nueve.+ocho/);
});

test('frequency and current exceptions do not collapse to unrelated word contrasts', () => {
  assert.match(hint('1.5-A03'), /habitualmente.+casa.+biblioteca/);
  assert.match(hint('1.5-A05'), /Every day.+todos los días.+noche.+frecuencia/);
  assert.match(hint('1.5-A06'), /dónde estudia siempre.+no si estudia todos los días/);
  assert.match(hint('1.10-11'), /hoy.+biblioteca.+casa.+rutina/);
  assert.match(hint('1.5-R06'), /habitualmente en casa.+habitualmente en biblioteca/);
  assert.match(hint('1.5-R07'), /solo algunos días.+todos los días/);
});

test('order contrasts explain temporal order and multiword actions, never quantity or particle location', () => {
  for (const id of ['1.3-A03', '1.3-A04', '1.4-A07', '1.4-A08', '1.11-25', '1.11-26', '1.11-28', '1.12-16']) {
    assert.match(hint(id), /invierte el orden.+primero.+después/, id);
    assert.doesNotMatch(hint(id), /cantidad|color|objeto/, id);
  }
  assert.match(hint('1.4-A02'), /take off.+quitarse.+put on.+ponerse/);
  assert.doesNotMatch(hint('1.4-A02'), /encima|superficie/);
  assert.match(hint('1.4-R03'), /texto pide.+take a shower.+ducharse/);
  assert.doesNotMatch(hint('1.4-R03'), /imagen.+muestra|take.+tomar/);
  assert.equal(fixture.reviewLimitations[0].slide_id, byId.get('1.4-R03').slide_id, 'Phrase teaching does not approve a setting-only image as action evidence.');
});

test('conversation decisions use ordinary contrast teaching and keep semantic image identities', () => {
  assert.match(hint('1.12-02a'), /Luis.+cinco.+seis.+quién/);
  assert.match(hint('1.12-11'), /Ana.+casa.+Ana.+biblioteca/);
  assert.match(hint('1.12-12'), /lugar de hoy.+biblioteca.+casa/);
  for (const card of fixture.cards.filter(c => c.mission_game)) {
    const wrong = wrongOptions(card)[0];
    assert.equal(lessonMistakeHint(card, wrong.id), lessonMistakeHint({...card, mission_game: undefined}, wrong.id));
  }
});

test('all 2369 established A1 ordinary wrong-choice outputs remain unchanged', () => {
  const course = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/generated/a1-course.json'), 'utf8'));
  const results = course.flatMap(lesson => lesson.cards).filter(card => card.options.length >= 2 && !card.interaction_type?.startsWith('complete'))
    .flatMap(card => wrongOptions(card).map(option => [card.slide_id, option.id, lessonMistakeHint(card, option.id)]));
  assert.equal(results.length, 2369);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex'), fixture.a1BaselineSha256);
});
