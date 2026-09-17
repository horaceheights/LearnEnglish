const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Exercise the same modules used by both clients without writing build files.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText, filename);
const { constructionTeachingPlan, constructionMistakeHint, isOrderedCompletion, awaitingConstructionRetry } = require('../src/constructionTeaching.ts');
const { lessonMistakeHint } = require('../src/lessonMistakeHints.ts');
const { sentenceHint } = require('../src/sentenceConstruction.ts');
const { lessonHelpText } = require('../src/lessonHelp.ts');

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

// Reviewed grammar oracle, deliberately independent of the resolver's role tables.
const progressiveVerbs = ['eating', 'drinking', 'reading', 'writing', 'running', 'walking', 'swimming', 'sitting', 'sleeping', 'playing', 'studying', 'working', 'cooking', 'talking', 'watching', 'listening'];

test('She sleeping is teaches auxiliary + main verb, not a subject description', () => {
  const result = hint('She is sleeping.', 1, 2);
  assert.equal(result, 'Pusiste “sleeping” donde va “is”. “is” es el auxiliar y “sleeping” el verbo principal en -ing. Primero “is” y después “sleeping”: “is sleeping”.');
  assert.match(hint('She is sleeping.', 0, 1), /el sujeto “She” va antes de “is”, el auxiliar del verbo “sleeping”/);
  assert.doesNotMatch(hint('She is sleeping.', 0, 2), /descrip|describe/);
  const partial = { ...construction('She is sleeping.'), interaction_type: 'complete2', prompt: 'She ___ ___.',
    correct_option_ids: ['1', '2'], options: construction('She is sleeping.').options.slice(1) };
  assert.equal(lessonMistakeHint(partial, ['2', '1']), result);
});

test('every reviewed progressive action keeps auxiliary, subject and negation roles distinct', () => {
  for (const action of progressiveVerbs) for (const [subject, auxiliary] of [['I', 'am'], ['She', 'is'], ['They', 'are']]) {
    const affirmative = `${subject} ${auxiliary} ${action}.`;
    const verbHint = hint(affirmative, 1, 2);
    assert.ok(verbHint.includes(`“${auxiliary}” es el auxiliar y “${action}” el verbo principal en -ing`), verbHint);
    assert.doesNotMatch(verbHint, /descrip|describe|qué es el sujeto/);
    const subjectHint = hint(affirmative, 0, 1);
    assert.ok(subjectHint.includes(`el sujeto “${subject}” va antes de “${auxiliary}”, el auxiliar`), subjectHint);
    const negative = `${subject} ${auxiliary} not ${action}.`;
    for (const pair of [[1, 3], [2, 3], [1, 2]]) {
      const result = hint(negative, ...pair);
      assert.ok(result.includes(`“${auxiliary}” es el auxiliar y “${action}” el verbo principal en -ing`), result);
      assert.ok(result.includes(`“Not” va entre ambos: “${auxiliary} not ${action}”`), result);
      assert.doesNotMatch(result, /descrip|describe/);
    }
  }
});

test('copular descriptions and non-progressive -ing uses do not become auxiliaries', () => {
  for (const [target, a, b] of [['She is tired.', 1, 2], ['She is a girl.', 1, 2],
    ['The book is on the table.', 2, 3], ['It is a living room.', 1, 2], ['I like listening to music.', 1, 2]]) {
    const result = hint(target, a, b);
    assert.ok(result, target);
    assert.doesNotMatch(result, /auxiliar|verbo en -ing/, `${target}: ${result}`);
  }
});

test('the screenshot teaches article placement, with both words present', () => {
  const card = { ...construction('He is a boy.'), interaction_type: 'complete2', prompt: 'He is ___ ___.',
    correct_option_ids: ['2', '3'], options: construction('He is a boy.').options.slice(2) };
  const result = lessonMistakeHint(card, ['3', '2']);
  assert.match(result, /Pusiste “boy” donde va “a”.+“a boy”.+“a”.+“boy”.+delante/);
  assert.doesNotMatch(result, /vocal|consonante|“an”|“\s*”/);
  assert.equal(result, sentenceHint(card, ['3', '2']));
});

test('the explanation changes with the mistaken relationship, not merely the target sentence', () => {
  assert.match(hint('I like apples.', 0, 1), /“I”.+quién realiza.+antes de “like”/);
  assert.match(hint('I like apples.', 1, 2), /Después de “like”.+lo que nos gusta.+“apples”/);
  assert.match(hint('He is a boy.', 0, 1), /afirmación.+“He”.+“is”.+descripción/);
  assert.match(hint('He is a boy.', 1, 2), /Después de “is”.+“a boy”.+describe/);
  assert.match(hint('Two blue cars.', 1, 2), /cantidad.+color.+nombre/);
  assert.match(hint('What is your name?', 0, 1), /pregunta.+“What”.+“is”.+verbo va antes/);
  assert.match(hint('How old are you?', 0, 1), /“How old”.+edad.+“How”.+antes/);
  assert.match(hint('I do not like milk.', 2, 3), /“Not”.+después de “do”.+antes de “like”/);
  assert.match(hint('The bus leaves at eight.', 3, 4), /“at”.+antes de “eight”.+cuándo/);
  assert.match(hint('I like listening to music.', 3, 4), /“to”.+“music”.+lo que escuchamos/);
  assert.match(hint('Do you want to read?', 3, 4), /“To”.+“want”.+antes del siguiente verbo/);
  assert.match(hint('Thank you.', 0, 1), /gracias.+“thank”.+antes de “you”/);
});

test('correct prefixes, identical occurrences, partial attempts and the second sentence retain context', () => {
  const card = construction('A woman. She is a woman.');
  const duplicateSwap = swap(card, 1, 5);
  assert.equal(sentenceHint(card, duplicateSwap), '');
  assert.equal(sentenceHint(card, ['0']), '');
  assert.equal(sentenceHint(card, ['0', '', '2', '3', '4', '5']), '');
  assert.match(sentenceHint(card, swap(card, 2, 3)), /Pusiste “is” donde va “She”.+“She”.+“is”/);
  const multiple = swap(card, 0, 1); [multiple[2], multiple[3]] = [multiple[3], multiple[2]];
  assert.match(sentenceHint(card, multiple), /^Pusiste “woman” donde va “A”/);
});

test('unsupported generated patterns fail the authoring contract instead of inventing a rule', () => {
  const card = construction('If I had known, I would have called.');
  assert.equal(constructionTeachingPlan(card).supported, false);
  assert.equal(sentenceHint(card, swap(card, 0, 1)), '');
  const mismatch = { ...construction('He is a boy.'), answer_audio_text: 'She is a girl.' };
  assert.equal(constructionTeachingPlan(mismatch).supported, false);
});

test('before-answer help names partial versus full construction and the actual controls', () => {
  const full = construction('He is a boy.');
  const partial = { ...full, interaction_type: 'complete2', correct_option_ids: ['2', '3'], prompt: 'He is ___ ___.' };
  assert.match(lessonHelpText(partial, 'translation-on-tap'), /dos palabras.+orden.+botón de sonido/);
  assert.match(lessonHelpText(full, 'translation-on-tap'), /palabras en ese orden.+devolverla/);
  assert.doesNotMatch(lessonHelpText(full), /Toca la palabra que completa/);
});

test('a wrong construction waits for explicit retry while listening and missions retain their own lifecycle', () => {
  const card = construction('She is a girl.');
  assert.equal(awaitingConstructionRetry(card, 'wrong'), true);
  assert.equal(awaitingConstructionRetry({ ...card, interaction_type: 'complete2' }, 'wrong'), true);
  assert.equal(awaitingConstructionRetry(card, null), false);
  assert.equal(awaitingConstructionRetry(card, 'correct'), false);
  assert.equal(awaitingConstructionRetry({ ...card, stage: 'Listen' }, 'wrong'), false);
  assert.equal(awaitingConstructionRetry({ ...card, mission_game: {} }, 'wrong'), false);
  const mobile = fs.readFileSync(path.join(__dirname, '../src/screens/LessonScreen.tsx'), 'utf8');
  const web = fs.readFileSync(path.join(__dirname, '../../frontend/components/LessonPlayer.js'), 'utf8');
  for (const source of [mobile, web]) {
    assert.match(source, /const evaluateChoiceSelection = [\s\S]*?awaitingConstructionRetry\(currentCard,/);
    assert.match(source, /onRetry=\{resetMissionSelection\}/);
    const reset = source.slice(source.indexOf('const resetMissionSelection ='), source.indexOf('const resetMissionSelection =') + 600);
    assert.doesNotMatch(reset, /setScore|setWrongAttempts|setAttemptedCards|setCompletedCards|recordAttempt|logCardAttempt/,
      'Retry clears the current construction, never its attempt history or lesson score.');
  }
  const overlay = fs.readFileSync(path.join(__dirname, '../src/components/SentenceHelpOverlay.tsx'), 'utf8');
  for (const file of ['../src/components/SentenceConstruction.tsx', '../../frontend/components/SentenceConstruction.js']) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert.match(source, /const locked = (?:disabled \|\| )?result !== null/);
    assert.match(source, /result !== ['"]wrong['"] \? <(?:View|div)/, 'Undo must not dismiss a graded mistake.');
    assert.match(source, /history\.current = \[\];[^\n]+onRetry\(\)/, 'Retry clears movement history before resetting the attempt.');
    assert.match(source, /Reintentar/);
    assert.match(source, /styles\.wrongIcon[^<]*>×/, 'A wrong grade needs an explicit X, not color alone.');
    assert.match(source, /Respuesta incorrecta/, 'The wrong state needs an accessible label.');
    assert.match(source, /result === ['"]correct['"] \? ['"]¡Muy bien!/, 'A locked wrong answer is not successful.');
  }
  assert.match(overlay, /const listening = listeningHelpText\(card\)/);
  assert.match(mobile, /<SentenceHelpOverlay\s+card=\{currentCard\}/);
});

test('every generated construction has explanations for every slot and every legal two-word swap', () => {
  const directory = path.join(__dirname, '../src/generated');
  const files = fs.readdirSync(directory).filter(file => /^lesson-.*\.json$/.test(file));
  let cards = 0, attempts = 0, progressiveChecks = 0;
  for (const file of files) {
    const lesson = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
    for (const card of lesson.cards.filter(c => c.stage === 'Use' && !c.mission_game)) {
      const context = `${file}/${card.slide_id}: ${card.answer_audio_text}`;
      assert.ok(isOrderedCompletion(card), context);
      const plan = constructionTeachingPlan(card);
      assert.ok(plan.supported, `Add a reviewed teaching pattern before publishing ${context}`);
      assert.equal(plan.explanations.length, card.correct_option_ids.length, context);
      assert.ok(plan.explanations.every(Boolean), context);
      const tokens = plan.target.match(/[a-z]+(?:'[a-z]+)?/gi).map(word => word.toLowerCase());
      tokens.forEach((word, tokenIndex) => {
        if (!['am', 'is', 'are'].includes(word)) return;
        const actionIndex = tokenIndex + (tokens[tokenIndex + 1] === 'not' ? 2 : 1);
        if (!progressiveVerbs.includes(tokens[actionIndex])) return;
        const auxiliarySlot = plan.tokenSlots.indexOf(tokenIndex);
        const actionSlot = plan.tokenSlots.indexOf(actionIndex);
        if (auxiliarySlot < 0 || actionSlot < 0) return;
        const result = sentenceHint(card, swap(card, auxiliarySlot, actionSlot));
        assert.match(result, /es el auxiliar y .+ el verbo principal en -ing/, `${context}: ${result}`);
        assert.doesNotMatch(result, /descrip|describe|qué es el sujeto/, `${context}: ${result}`);
        progressiveChecks++;
      });
      assert.equal(lessonMistakeHint(card, card.correct_option_ids), '', context);
      cards++;
      const verify = attempt => {
        const actual = attempt.map(id => card.options.find(option => option.id === id).label);
        const first = plan.labels.findIndex((word, i) => word !== actual[i]);
        const result = lessonMistakeHint(card, attempt);
        assert.equal(result, sentenceHint(card, attempt), context);
        if (first < 0) { assert.equal(result, '', context); return; }
        assert.ok(result.startsWith(`Pusiste “${actual[first]}” donde va “${plan.labels[first]}”.`), `${context}: ${result}`);
        assert.match(result, /antes|después|primero|delante|entre|abre|abren|al final/i, `${context}: ${result}`);
        assert.doesNotMatch(result, /“\s*”|undefined|_{2,}|\[(?:blank|pausa)\]|sonido de|singular|plural|Escucha otra vez\. La palabra/, `${context}: ${result}`);
        assert.ok(result.length <= 230, `${context}: ${result.length} characters: ${result}`);
        attempts++;
      };
      for (let a = 0; a < plan.labels.length; a++) for (let b = a + 1; b < plan.labels.length; b++) verify(swap(card, a, b));
      verify([...card.correct_option_ids].reverse());
      verify([...card.correct_option_ids.slice(1), card.correct_option_ids[0]]);
    }
  }
  assert.equal(files.length, 70);
  assert.ok(cards >= 459, 'Do not silently reduce the course audit.');
  assert.ok(progressiveChecks > 0, 'The course must exercise progressive grammar semantics.');
  console.log(`Teaching guardrail checked ${cards} constructions, ${attempts} reachable wrong attempts and ${progressiveChecks} progressive verb pairs across ${files.length} lessons.`);
});
