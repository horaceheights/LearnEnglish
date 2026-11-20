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

test('installed listening cards explain the heard evidence, including the reported meeting card', () => {
  const lessons = require('../src/generated/a1-plus-course.json');
  const cards = lessons.filter(lesson => lesson.experience_type !== 'mission')
    .flatMap(lesson => lesson.cards.filter(card => card.stage === 'Listen'));
  // Lesson 1.2 was rebuilt on 2026-10-29 with ten Listen cards instead of five, lesson 1.4 on
  // 2026-11-04 with ten instead of eight, lesson 1.1 on 2026-11-10 with nine instead of ten,
  // lesson 1.3 on 2026-11-10 with ten instead of seven, lesson 1.5 on 2026-11-11 with ten
  // instead of six, lesson 1.6 on 2026-11-12 with ten instead of seven, lesson 1.7 on
  // 2026-11-13 with ten instead of eight, and lesson 1.8 on 2026-11-18 with ten instead of fourteen.
  // On 2026-11-18 1.9 was rebuilt with ten instead of six, 1.10 built with ten (it replaced a lesson
  // with five), 1.11 with ten (it replaced the old review's 23), and the new 1.12 review has twenty;
  // the old 1.12 mission became the 1.13 mission, which has no Listen stage.
  // On 2026-11-19 A1+ Unit 2 began: 2.1-2.5 have ten Listen cards each, and so do 2.6-2.10; on 2026-11-20
  // 2.11-2.13 added ten each and the 2.14 review twenty (the 2.15 mission has no Listen stage).
  assert.equal(cards.length, 279);
  for (const card of cards) {
    assert.ok(!card.context_es, `${card.slide_id}: Spanish scenario text returned.`);
    for (const option of wrongOptions(card)) {
      const feedback = lessonMistakeHint(card, option.id);
      assert.ok(feedback.length > 0 && feedback.length <= 140, `${card.slide_id}: ${feedback}`);
      const answer = card.options.find(option => option.id === card.correct_option_id).label || '';
      if (answer.endsWith('?') && card.audio_text.includes(answer)) {
        assert.doesNotMatch(feedback, /falta saber|falta (?:la hora|el lugar|el momento|la frecuencia)/i,
          'A heard-question contrast must not pretend the learner is choosing missing information.');
      }
    }
  }
  // The reported card was 1.1's A10; 1.1 was rebuilt on 2026-11-10 (what people look like), so the
  // exact card is kept as a fixture and its feedback stays pinned.
  const reported = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/a1plus-reported-meeting-card.json'), 'utf8')).card;
  assert.equal(reported.audio_text, "Let's meet at eight.");
  assert.deepEqual((reported.audio_turns ?? []).map(turn => turn.text), []);
  assert.equal(reported.options.find(option => option.id === reported.correct_option_id).label, reported.audio_text);
  assert.doesNotMatch(lessonMistakeHint(reported, wrongOptions(reported)[0].id), /trabajo|disponib|llegar|pronto/i);
});

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

// A1 1.10 Pets (2026-11-14) added 31 outputs 1.11 Friends and People added 30 and the extended Unit 1 review 9; each time the earlier
// outputs were proven byte-identical first. A1 2.11 Big and Small (2026-11-14) added 25 and the extended Unit 2 review 6, proven the same way.
// A1 4.11 Everyday Verbs (2026-11-14) added 31 and the extended Unit 4 review 7, proven the same way.
// A1 4.12 Tomorrow and the Week (2026-11-14) added 27 and the extended Unit 4 review 11, proven the same way.
// A1 5.11 Buying Things with its four review constructions moved the total to 2572; the earlier outputs were proven byte-identical first.
// A1 5.12 Numbers 30 to 100 with its two review constructions moved the total to 2598; the earlier outputs were proven byte-identical first.
// A1 5.12 Numbers 30 to 100 with its two review constructions moved the total to 2598; the earlier outputs were proven byte-identical first.
// A1 3.13 Phone Number and Address with its two review constructions moved the total to 2629; the earlier outputs were proven byte-identical first.
// A1 2.12 In the Classroom with its eight review cards moved the total to 2659; the earlier outputs were proven byte-identical first.
// A1 2.13 More Colors with its five review cards moved the total to 2685; the earlier outputs were proven byte-identical first.
// A1 4.13 to 4.15 (months and more at home) with sixteen review cards moved the total to 2783; the earlier outputs were proven byte-identical first.
// A1 5.13 More Food and 5.14 At the Table with eight review constructions moved the total to 2834; the earlier outputs were proven byte-identical first.
// The last seven gap lessons (3.14, 6.13, 7.9 to 7.13) moved the total to 3013; the earlier outputs were proven byte-identical first.
// The 2026-11-17 gap-lesson mission beats moved the total to 3055; the earlier outputs were proven byte-identical first.
// The 2026-11-17 remade gap-lesson mission beats moved the total to 3067; the earlier outputs were proven byte-identical first.
// The 2026-11-17 Unit 1 pets and friends mission beats moved the total to 3073; the earlier outputs were proven byte-identical first.
// 2026-11-18: 7.9 gained good and bad (3070); outside 7.9 only the five Good morning / goodbye hints changed, by decision, to name the whole greeting.
// 2026-11-18: the alphabet lessons 3.15 and 3.16 added 55 (3125); the earlier 3070 were proven byte-identical first.
test('all 3125 established A1 ordinary wrong-choice outputs remain unchanged', () => {
  const course = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/generated/a1-course.json'), 'utf8'));
  const results = course.flatMap(lesson => lesson.cards).filter(card => card.options.length >= 2 && !card.interaction_type?.startsWith('complete'))
    .flatMap(card => wrongOptions(card).map(option => [card.slide_id, option.id, lessonMistakeHint(card, option.id)]));
  assert.equal(results.length, 3125);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex'), fixture.a1BaselineSha256);
});
