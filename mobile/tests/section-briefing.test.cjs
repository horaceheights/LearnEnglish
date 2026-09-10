const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const test = require('node:test');

const sourceRoot = path.join(__dirname, '../src');
const moduleCache = new Map();

// The briefing logic is shared pure TypeScript. Transpile it with its local
// dependencies so the checks run against the real module, not a copy.
function loadSharedModule(relativeName) {
  const resolved = path.join(sourceRoot, `${relativeName}.ts`);
  if (moduleCache.has(resolved)) return moduleCache.get(resolved);
  const compiled = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleExports = {};
  moduleCache.set(resolved, moduleExports);
  const localRequire = (specifier) => {
    if (!specifier.startsWith('./')) {
      throw new Error(`Shared briefing logic must not import ${specifier}.`);
    }
    return loadSharedModule(specifier.slice(2));
  };
  // Evaluate in this realm so the values it returns are ordinary host objects.
  const factory = new Function('exports', 'module', 'require', compiled);
  factory(moduleExports, { exports: moduleExports }, localRequire);
  return moduleExports;
}

const { lessonStageSegments, sectionBriefingForBoundary } = loadSharedModule('lessonSectionBriefing');

const generated = path.join(sourceRoot, 'generated');
const lesson = JSON.parse(fs.readFileSync(path.join(generated, 'lesson-1-people-actions.json'), 'utf8'));
const mission = JSON.parse(fs.readFileSync(path.join(generated, 'lesson-10-family-mission.json'), 'utf8'));

const screen = fs.readFileSync(path.join(sourceRoot, 'screens/LessonScreen.tsx'), 'utf8');
const briefingComponent = fs.readFileSync(path.join(sourceRoot, 'components/LessonSectionBriefing.tsx'), 'utf8');
const briefingLogic = fs.readFileSync(path.join(sourceRoot, 'lessonSectionBriefing.ts'), 'utf8');

test('lesson 1.1 keeps its authored 42 cards and five contiguous stages', () => {
  assert.equal(lesson.cards.length, 42, 'A briefing must never be added to the authored card list.');
  const segments = lessonStageSegments(lesson.cards);
  assert.deepEqual(
    segments.map((segment) => segment.stage),
    ['Learn', 'Recognize', 'Listen', 'Speak', 'Use'],
  );
  assert.deepEqual(segments.map((segment) => segment.end - segment.start + 1), [10, 10, 8, 7, 7]);
});

test('a briefing appears at every stage boundary and nowhere else', () => {
  const boundaries = [];
  for (let index = 0; index < lesson.cards.length; index += 1) {
    if (sectionBriefingForBoundary(lesson, index)) boundaries.push(index);
  }
  assert.deepEqual(boundaries, [9, 19, 27, 34]);

  const opening = sectionBriefingForBoundary(lesson, null);
  assert.equal(opening.kind, 'opening');
  assert.equal(opening.nextCardIndex, 0);
  assert.equal(opening.doneStage, null);
  assert.equal(opening.nextStage, 'Learn');

  // The last card ends the lesson through the existing completion flow.
  assert.equal(sectionBriefingForBoundary(lesson, lesson.cards.length - 1), null);
});

test('each bridge names the finished section and prepares the next one', () => {
  const expected = [
    { done: 'Learn', doneLabel: 'Aprende', next: 'Recognize', nextLabel: 'Reconoce', count: 10 },
    { done: 'Recognize', doneLabel: 'Reconoce', next: 'Listen', nextLabel: 'Comprensión auditiva', count: 8 },
    { done: 'Listen', doneLabel: 'Comprensión auditiva', next: 'Speak', nextLabel: 'Habla', count: 7 },
    { done: 'Speak', doneLabel: 'Habla', next: 'Use', nextLabel: 'Completa', count: 7 },
  ];
  [9, 19, 27, 34].forEach((fromIndex, position) => {
    const briefing = sectionBriefingForBoundary(lesson, fromIndex);
    assert.equal(briefing.kind, 'bridge');
    assert.equal(briefing.doneStage, expected[position].done);
    assert.equal(briefing.doneLabel, expected[position].doneLabel);
    assert.equal(briefing.nextStage, expected[position].next);
    assert.equal(briefing.nextLabel, expected[position].nextLabel);
    assert.equal(briefing.nextCount, expected[position].count);
    assert.equal(briefing.nextCardIndex, fromIndex + 1);
    assert.ok(briefing.doneSummary, 'Every bridge tells the learner what they just practised.');
    assert.ok(briefing.nextIntro && briefing.nextMechanic, 'Every bridge explains the next task.');
    assert.match(briefing.accentColor, /^#[0-9a-f]{6}$/i);
  });
});

test('the automatic Learn section and the microphone are announced before they start', () => {
  const opening = sectionBriefingForBoundary(lesson, null);
  assert.match(opening.nextMechanic, /autom[áa]tica/i, 'The opening must say the Learn section plays by itself.');
  assert.ok(opening.doneChips.includes('boy'), 'The opening previews the lesson vocabulary.');

  const speakBridge = sectionBriefingForBoundary(lesson, 27);
  assert.match(speakBridge.nextMechanic, /micr[óo]fono/i, 'The Speak bridge must warn about the microphone.');
});

test('finished sections summarise real lesson language', () => {
  const afterLearn = sectionBriefingForBoundary(lesson, 9);
  assert.ok(afterLearn.doneChips.length > 0);
  afterLearn.doneChips.forEach((chip) => {
    assert.ok(lesson.vocabulary.includes(chip), `${chip} must come from the authored vocabulary.`);
  });

  const afterSpeak = sectionBriefingForBoundary(lesson, 34);
  assert.ok(afterSpeak.doneChips.length > 0);
  afterSpeak.doneChips.forEach((chip) => {
    assert.doesNotMatch(chip, /_/, 'A chip must never show a completion blank marker.');
  });
});

test('consecutive briefings do not repeat the same phrases', () => {
  // Sections practise the same story, so taking the first few labels made two
  // briefings in a row look identical. Chips sample across the whole section.
  const chipSets = [9, 19, 27, 34]
    .map((fromIndex) => sectionBriefingForBoundary(lesson, fromIndex).doneChips.join('|'));
  for (let index = 1; index < chipSets.length; index += 1) {
    assert.notEqual(chipSets[index], chipSets[index - 1]);
  }
  chipSets.forEach((set) => assert.ok(set.length > 0));
});

test('missions and malformed lessons never produce a briefing', () => {
  assert.equal(sectionBriefingForBoundary(mission, null), null);
  assert.equal(sectionBriefingForBoundary(mission, 5), null);
  assert.equal(sectionBriefingForBoundary(null, null), null);
  assert.equal(sectionBriefingForBoundary({ ...lesson, cards: [] }, null), null);
  const singleStage = { ...lesson, cards: lesson.cards.slice(0, 5) };
  assert.equal(sectionBriefingForBoundary(singleStage, null), null);
});

test('an unknown stage falls back instead of throwing', () => {
  const odd = {
    ...lesson,
    cards: [
      { ...lesson.cards[0], stage: 'Mystery' },
      { ...lesson.cards[1], stage: 'Another' },
    ],
  };
  const briefing = sectionBriefingForBoundary(odd, 0);
  assert.ok(briefing.nextIntro && briefing.nextMechanic && briefing.doneSummary);
});

test('the briefing surface is reachable, readable and reduced-motion safe', () => {
  assert.match(briefingComponent, /useReducedMotion/);
  assert.match(briefingComponent, /accessibilityRole="button"/);
  assert.match(briefingComponent, /Continuar/);
  assert.match(briefingComponent, /minHeight: 54/);
  assert.match(briefingComponent, /ScrollView/, 'Enlarged text must stay reachable.');
  assert.match(briefingComponent, /<StageJourney/, 'The journey strip shows which section changed.');
  // Support copy is visual only. Reading authored text to build chips is fine;
  // playing or synthesising anything from this surface is not.
  const playback = /playAudio|playAudioSource|playAudioSequence|createAudioPlayer|playMissionSound|expo-audio/i;
  assert.doesNotMatch(briefingComponent, playback);
  assert.doesNotMatch(briefingLogic, playback);
});

test('briefings follow forward progress only', () => {
  assert.match(
    screen,
    /completedLessonMode === 'standard' && !qaMode && !missionExperience\s+\?\s+sectionBriefingForBoundary\(lesson, cardIndex\)/,
    'Review, QA and mission runs must not interrupt with a briefing.',
  );
  assert.match(
    screen,
    /if \(briefing\) \{[\s\S]*?setSectionBriefing\(briefing\);\s+return;\s+\}\s+commitAdvance\(\);/,
    'A boundary shows its briefing before the page turns; every other advance is unchanged.',
  );
  assert.match(
    screen,
    /openingBriefingShownRef\.current = Boolean\(savedRun\) \|\| nextCardIndex > 0 \|\| Boolean\(previouslyCompleted\)/,
    'A restored run resumes on its card instead of reopening the lesson briefing.',
  );
  assert.match(screen, /\|\| isPageTurning\s+\|\| sectionBriefing/, 'Prompt audio waits behind a briefing.');
  assert.match(
    screen,
    /if \(sectionBriefingRef\.current\) return;/,
    'An automatic Learn card must not advance itself behind the opening briefing.',
  );
  // The page-turn cue still belongs to the actual slide change.
  assert.equal((screen.match(/playMissionSound\('page-turn'\)/g) || []).length, 1);
});

test('a briefing replaces the page turn at that boundary instead of wrapping it', () => {
  // The briefing branch returns before the card tree, so `pageRef` is unmounted
  // while it is on screen and `startPageTurn` takes its plain-navigate path. The
  // full-screen change of surface is the transition; no curl or cue runs around it.
  const briefingBranch = screen.indexOf('if (sectionBriefing) {');
  const cardPageRef = screen.indexOf('ref={pageRef}');
  assert.ok(briefingBranch > 0 && cardPageRef > 0);
  assert.ok(
    briefingBranch < cardPageRef,
    'The briefing must render in place of the card so only one activity tree is live.',
  );
  assert.match(
    screen,
    /if \(briefing\) \{[\s\S]*?setSectionBriefing\(briefing\);\s+return;/,
    'Reaching a boundary must not also start a page turn.',
  );
  assert.match(screen, /addDiagnosticBreadcrumb\('lesson_section_briefing_shown'/);
});

test('the automatic Learn card shows its countdown', () => {
  assert.match(screen, /const AUTOMATIC_CARD_DWELL_MS = 3000;/);
  assert.match(screen, /}, AUTOMATIC_CARD_DWELL_MS\);/, 'The advance timer owns the announced window.');
  assert.match(screen, /duration: AUTOMATIC_CARD_DWELL_MS/, 'The visible countdown drains over that same window.');
  assert.match(screen, /Automático/);
  assert.match(screen, /startAutomaticCountdown\(\);/);
  assert.match(
    screen,
    /if \(reduceMotion\) \{\s+automaticCountdown\.setValue\(1\);/,
    'Reduced motion shows a settled pill instead of an animation.',
  );
});

test('the first full construction explains its new mechanic once', () => {
  const overlay = fs.readFileSync(path.join(sourceRoot, 'components/SentenceHelpOverlay.tsx'), 'utf8');
  assert.match(overlay, /variant = 'prompt'/);
  assert.match(overlay, /¡Ahora armas la frase!/);
  assert.match(screen, /variant="construction"/);
  assert.match(screen, /const CONSTRUCTION_HELP_STORAGE_PREFIX = 'spanglish-construction-help-v1';/);
  assert.match(
    screen,
    /if \(!isSentenceCard \|\| constructionHelpStatus !== 'pending' \|\| sectionBriefing \|\| isPageTurning\) return;/,
    'The construction coach waits for a settled construction card.',
  );
});
