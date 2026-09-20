import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';

const lessons = fs.readdirSync(new URL('../src/generated/', import.meta.url)).filter(name => name.startsWith('lesson-') && name.endsWith('.json'))
  .map(name => JSON.parse(fs.readFileSync(new URL('../src/generated/' + name, import.meta.url), 'utf8')));
const cards = lessons.flatMap(lesson => lesson.cards.map(card => ({ ...card, lessonId: lesson.id })));
const noop = () => {};

test('the screen routes every phone landscape and portrait image bank into the measured activity shell', () => {
  const source = fs.readFileSync(new URL('../src/screens/LessonScreen.tsx', import.meta.url), 'utf8');
  const h = lessonHarness({ width: 915, height: 412, fontScale: 1 });
  const { isPhoneLandscape } = h.load('lessonViewportLayout.ts');
  assert.ok(isPhoneLandscape(915, 412), 'wide phones must not miss the landscape layout');
  assert.ok(isPhoneLandscape(740, 360));
  assert.ok(!isPhoneLandscape(390, 844));
  assert.match(source, /needsAccessibleScrolling = !useCompactPhoneLayout && !imageChoiceSurface/);
  assert.match(source, /<SentenceHelpOverlay/);
  assert.match(source, /onPress=\{help.open\}/);
  assert.match(source, /showHelp=\{false\}/);
  assert.match(source, /key="activity-column"/);
  assert.match(source, /key="lesson-activity"/);
});

function within(records, width, height, context) {
  for (const r of records.slice(1)) {
    const b = r.box;
    const label = r.text || r.props.accessibilityLabel || r.type;
    assert.ok(b.left >= -1 && b.top >= -1 && b.left + b.width <= width + 1 && b.top + b.height <= height + 1,
      `${context}: ${label} outside ${width}x${height}: ${JSON.stringify(b)}`);
    assert.notEqual(r.type, 'ScrollView', `${context}: active content must not require a scroll surface`);
    if (r.text.trim()) assert.ok(r.textHeight <= b.height + 1.5, `${context}: clipped text ${label}: ${r.textHeight} in ${JSON.stringify(b)}`);
    if (r.type === 'Pressable' && r.props.accessibilityRole === 'button') assert.ok(b.width >= 47 && b.height >= 47, `${context}: undersized ${label}: ${JSON.stringify(b)}`);
  }
}

function lessonFactory(h, card, viewport, result = null, selected = [], showHelp = false) {
  const screen = h.styles('screens/LessonScreen.tsx');
  const { LessonCardView } = h.load('components/LessonCardView.tsx');
  const { SentenceConstruction } = h.load('components/SentenceConstruction.tsx');
  const { LessonLandscapeRail } = h.load('components/LessonLandscapeRail.tsx');
  const { isPhoneLandscape, landscapePromptIsWide } = h.load('lessonViewportLayout.ts');
  const landscape = isPhoneLandscape(viewport.width, viewport.height);
  const helpSheet = landscape || (viewport.height >= viewport.width && card.stage !== 'Speak' && card.options.length > 0 && card.options.every(o => o.image_url));
  const construction = card.interaction_type === 'complete-sentence' || card.stage === 'Use' && card.interaction_type === 'complete2';
  const body = construction ? e(SentenceConstruction, { card, selected, result, disabled: false, onChange: noop, onReplay: noop, onRetry: noop })
    : e(LessonCardView, { card, lessonId: card.lessonId, result, selectedId: selected[0] || null, selectedIds: selected,
      level: 'A1', showHelp: false, userId: 'layout-test', onSelect: noop, onResetSelection: noop, optionsInteractive: card.options.length > 1,
      onPronunciationPassed: noop, onPronunciationUnavailable: noop, onGrammarAnimationComplete: noop });
  const instructional = ['Listen', 'Speak'].includes(card.stage) || !card.prompt;
  const displayPrompt = card.stage === 'Listen' ? '¡Escucha y elige la frase!' : card.stage === 'Speak' ? '¡Escucha y repite!' : card.prompt || '¡Elige la frase correcta!';
  const widePrompt = landscape && !instructional && !construction && landscapePromptIsWide(card.prompt, viewport.width - 56);
  const header = e('View', { style: [screen.contentHeader, landscape ? screen.contentHeaderRail : screen.contentHeaderPortrait], children: [
    e('Text', { adjustsFontSizeToFit: landscape && !instructional, minimumFontScale: 16 / (24 * Math.min(viewport.fontScale, 1.3)), maxFontSizeMultiplier: 1.3, style: { height: landscape ? (!instructional ? 80 : 44) : undefined, fontSize: landscape ? (!instructional ? 24 : 14) : 28, fontWeight: '800', textAlign: 'center' }, children: displayPrompt }),
    ...(landscape ? [e('Pressable', { accessibilityRole: 'button', style: { height: 48, width: 48 }, children: e('Text', { children: 'Audio' }) })] : []),
  ] });
  const chrome = landscape ? e(LessonLandscapeRail, { location: 'UNIT 1 | LESSON 1.3', stage: { Learn: 'APRENDE', Recognize: 'RECONOCE', Listen: 'ESCUCHA', Speak: 'HABLA', Use: 'COMPLETA' }[card.stage], color: '#df765b', progress: '12 / 42',
    onBack: noop, onHome: noop, onMenu: noop, imageUrl: construction ? card.prompt_image_url : null, children: construction || widePrompt ? null : header })
    : e('View', { style: { gap: 7 }, children: [e('View', { style: screen.qaToolbar }), e('View', { style: { height: 174 } }), header] });
  return () => e('View', { style: { paddingTop: landscape ? 0 : 24, paddingBottom: 24, paddingHorizontal: landscape ? 24 : 0 }, children:
    e('View', { style: [screen.page, landscape ? screen.pageCompact : screen.pagePortrait], children:
      e('View', { style: [screen.lessonBody, landscape ? screen.lessonBodyLandscape : null], children: [chrome,
        e('View', { style: screen.activityColumn, children: [widePrompt ? header : null, e('View', { style: screen.cardCarousel, children: body }, 'lesson-activity')] })] }) }) });
}

test('both portrait screenshot grids keep the lower images and full success/retry text above Android navigation', () => {
  const examples = cards.filter(c => ['The boy and the girl', 'They are writing.'].includes(c.prompt) && c.stage === 'Recognize' && c.options.length === 4);
  assert.equal(examples.length, 2);
  for (const [width, height] of [[360, 740], [390, 844], [412, 915]]) for (const fontScale of [1, 1.3, 2]) {
    const viewport = { width, height, fontScale }, h = lessonHarness(viewport);
    for (const card of examples) for (const result of [null, 'correct', 'wrong']) for (const showHelp of [false, true]) {
      const selection = result === 'correct' ? card.correct_option_id : card.options.find(o => o.id !== card.correct_option_id).id;
      const records = h.render(lessonFactory(h, card, viewport, result, [selection], showHelp), width, height);
      within(records, width, height - 24, `${width}/${height}/${fontScale}/${card.prompt}/${result}`);
      const images = records.filter(r => r.type === 'Pressable' && card.options.some(o => r.props.accessibilityLabel === (o.label || `Answer option ${o.id}`)));
      assert.equal(images.length, 4);
      assert.equal(new Set(images.map(r => r.box.top)).size, 2, 'exactly two rows');
      assert.equal(new Set(images.map(r => r.box.left)).size, 2, 'exactly two columns');
    }
  }
});

test('landscape standard activities fit the full safe area, including wide phones, all options and feedback', () => {
  assert.equal(lessons.length, 70);
  const examples = cards.filter(c => !c.mission_game && c.stage !== 'Speak' && !c.interaction_type?.startsWith('mission-'));
  // Run every content shape with the longest prompt/choice labels first.
  const unique = [...new Map(examples.map(c => [JSON.stringify([c.stage, c.interaction_type, c.prompt, c.options.map(o => [o.label, Boolean(o.image_url)])]), c])).values()];
  for (const [width, height] of [[740, 360], [915, 412]]) for (const fontScale of [1, 1.3, 2]) {
    const viewport = { width, height, fontScale }, h = lessonHarness(viewport);
    for (const card of unique) for (const result of card.stage === 'Learn' ? [null] : [null, 'wrong']) {
      const construction = card.interaction_type === 'complete-sentence' || card.stage === 'Use' && card.interaction_type === 'complete2';
      const selected = result ? construction ? [...card.correct_option_ids].reverse() : [card.options.find(o => o.id !== card.correct_option_id)?.id] : [];
      let records;
      try { records = h.render(lessonFactory(h, card, viewport, result, selected), width, height); }
      catch (error) { error.message += `: ${width}/${height}/${fontScale}/${card.lessonId}/${card.slide_id}/${result}`; throw error; }
      within(records, width, height - 24, `${width}/${height}/${fontScale}/${card.lessonId}/${card.slide_id}/${result}`);
    }
  }
});


test('ordinary speaking keeps model, microphone status, grading and recovery inside short landscape', () => {
  const examples = cards.filter(c => c.stage === 'Speak' && !c.mission_game)
    .sort((a, b) => (b.audio_text || b.prompt).length - (a.audio_text || a.prompt).length).slice(0, 14);
  for (const fontScale of [1, 1.3, 2]) for (const phase of ['model', 'ready', 'listening', 'checking', 'retry', 'success', 'unavailable']) {
    const viewport = { width: 740, height: 360, fontScale };
    const result = ['success', 'retry'].includes(phase) ? { interpreted: { passed: phase === 'success', pedagogicalScore: 80 },
      feedback: { messages: { es: phase === 'success' ? '¡Muy bien! La frase está completa.' : 'Escucha de nuevo y practica las palabras marcadas.' } } } : null;
    const h = lessonHarness(viewport, { pronunciation: { phase: phase === 'unavailable' ? 'retry' : phase, unavailable: phase === 'unavailable', result } });
    for (const card of examples) {
      const records = h.render(lessonFactory(h, card, viewport), viewport.width, viewport.height);
      within(records, viewport.width, viewport.height - 24, `${fontScale}/${phase}/${card.lessonId}/${card.slide_id}`);
    }
  }
});

test('correct constructions fit the celebration and completed words inside the landscape safe area', () => {
  const examples = cards.filter(c => !c.mission_game && c.stage === 'Use' && ['complete2', 'complete-sentence'].includes(c.interaction_type));
  for (const [width, height] of [[740, 360], [915, 412]]) for (const fontScale of [1, 1.3, 2]) {
    const viewport = { width, height, fontScale }, h = lessonHarness(viewport);
    for (const card of examples) {
      const records = h.render(lessonFactory(h, card, viewport, 'correct', card.correct_option_ids), width, height);
      within(records, width, height - 24, `${width}/${height}/${fontScale}/${card.lessonId}/${card.slide_id}/correct`);
      assert.equal(records.filter(r => r.props.testID === 'construction-celebration').length, 1);
    }
  }
});

test('the native screenshot regression actually rejects the former width-driven 4:5 grid', () => {
  const viewport = { width: 360, height: 740, fontScale: 1 };
  const card = cards.find(c => c.prompt === 'They are writing.' && c.stage === 'Recognize' && c.options.length === 4);
  const h = lessonHarness(viewport, { sourceTransform: (file, source) => file.endsWith('LessonCardView.tsx')
    ? source.replace('width: boundedImageChoices?.optionWidth ?? constrainedPortraitImageOptionWidth', 'width: constrainedPortraitImageOptionWidth')
      .replace('boundedImageChoices ? { alignSelf:', 'false ? { alignSelf:') : source });
  assert.throws(() => within(h.render(lessonFactory(h, card, viewport, 'correct', [card.correct_option_id]), viewport.width, viewport.height),
    viewport.width, viewport.height - 24, 'old grid'), /outside/);
});


test('rotation keeps the live pronunciation player and partially placed sentence words', () => {
  const viewport = { width: 740, height: 360, fontScale: 1 };
  const h = lessonHarness(viewport, { pronunciation: { phase: 'listening' } });
  const speaking = cards.find(c => c.stage === 'Speak' && !c.mission_game);
  h.render(lessonFactory(h, speaking, viewport), viewport.width, viewport.height);
  const players = h.stats.audioPlayers;
  assert.ok(players > 0);
  Object.assign(viewport, { width: 390, height: 844 });
  h.render(lessonFactory(h, speaking, viewport), viewport.width, viewport.height, true);
  Object.assign(viewport, { width: 740, height: 360 });
  within(h.render(lessonFactory(h, speaking, viewport), viewport.width, viewport.height, true), 740, 336, 'rotation');
  assert.equal(h.stats.audioPlayers, players, 'rotation must not recreate the owned audio player');
  const construction = cards.find(c => c.interaction_type === 'complete-sentence');
  const selected = construction.correct_option_ids.slice(0, 2);
  h.render(lessonFactory(h, construction, viewport, null, selected), 740, 360);
  Object.assign(viewport, { width: 390, height: 844 });
  h.render(lessonFactory(h, construction, viewport, null, selected), 390, 844, true);
  Object.assign(viewport, { width: 740, height: 360 });
  const records = h.render(lessonFactory(h, construction, viewport, null, selected), 740, 360, true);
  selected.forEach((id, index) => assert.ok(records.some(r => r.props.accessibilityLabel ===
    `Espacio ${index + 1}: ${construction.options.find(o => o.id === id).label}`)));
});


test('avatar help keeps acknowledgement buttons inside native safe areas, including long construction copy', () => {
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [667, 320], [800, 1280], [1280, 800]]) {
    for (const fontScale of [1, 1.3, 2]) for (const mode of ['help', 'reminder']) {
      const insets = { top: 24, bottom: 24, left: width > height ? 44 : 0, right: width > height ? 24 : 0 };
      const h = lessonHarness({ width, height, fontScale }, { insets,
        // Model the ScrollView's native content container separately from its
        // bounded viewport. Overflowing help copy is intentionally scrollable.
        sourceTransform: (file, source) => file.endsWith('SentenceHelpOverlay.tsx')
          ? source.replace('<ScrollView style={styles.scroll} contentContainerStyle={styles.calloutBody}>',
              '<ScrollView style={styles.scroll}><View style={styles.calloutBody}>').replace('</ScrollView>', '</View></ScrollView>') : source,
      });
      const { SentenceHelpOverlay } = h.load('components/SentenceHelpOverlay.tsx');
      const { lessonHelpText } = h.load('lessonHelp.ts');
      const construction = cards.find(card => card.interaction_type === 'complete-sentence');
      const records = h.render(() => e(SentenceHelpOverlay, {
        mode, message: lessonHelpText(construction, 'translation-on-tap'), onDismiss: noop, onSuppress: noop,
      }), width, height);
      const buttons = records.filter(r => r.type === 'Pressable' && !r.props.accessibilityLabel);
      assert.equal(buttons.length, mode === 'help' ? 2 : 1);
      for (const button of buttons) {
        assert.ok(button.box.width >= 48 && button.box.height >= 48);
        assert.ok(button.box.left >= insets.left && button.box.left + button.box.width <= width - insets.right + 1);
        assert.ok(button.box.top >= insets.top && button.box.top + button.box.height <= height - insets.bottom,
          `${width}x${height}/${fontScale}/${mode}: ${JSON.stringify(button.box)}`);
      }
      const scroll = records.find(r => r.type === 'ScrollView');
      assert.ok(scroll.box.height > 0);
      assert.ok(scroll.box.top + scroll.box.height <= buttons[0].box.top + 1);
      const text = records.filter(r => r.type === 'Text').map(r => r.text).join(' ');
      assert.match(text, mode === 'help' ? /coloca las palabras/ : /Si necesitas ayuda en el futuro/);
      if (mode === 'reminder') assert.match(text, /\?/);
    }
  }
});
