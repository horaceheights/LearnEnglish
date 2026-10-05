import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';

const source = fs.readFileSync(new URL('../src/screens/LessonScreen.tsx', import.meta.url), 'utf8');
const header = source.slice(source.indexOf('  const lessonPromptHeader = ('), source.indexOf('  const lessonChrome = ('));
assert.ok(header.includes('styles.promptRowPhraseBox'), 'Exercise the production header TSX.');

// Execute the actual header with inert callbacks, retaining its native styles
// and Text fit rules. Lesson networking and audio playback are separate tests.
const headerModule = `
import { View, Text, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isSilentWrittenRecognize, recognizeAnswerReplayText } from '../lessonPromptPresentation';
export function Header({ currentCard, result, viewport, styles, showSentenceTranslation }) {
  const { width, height, fontScale } = viewport;
  const usesLessonPhoneLandscape = width > height && height < 600;
  const useCompactPhoneLayout = usesLessonPhoneLandscape;
  const isPortrait = height >= width;
  const isMissionGameCard = false, isSentenceCard = false, isCompletedSectionPicker = false;
  const useCompactHeaderInstruction = false, useCompactRecognizeInstruction = false;
  const useCompactListenInstruction = false, useCompactSpeakInstruction = false;
  const isPronunciation = false, promptHasVisualBlank = false;
  const visiblePromptText = currentCard.prompt, pronunciationModelText = '';
  const silentWrittenRecognize = isSilentWrittenRecognize(currentCard);
  const phraseReplayText = recognizeAnswerReplayText(currentCard, result === 'correct');
  const phraseReplayAvailable = Boolean(phraseReplayText);
  const promptFontSize = 28, promptLineHeight = 34;
  const visibleSentenceTranslation = currentCard.spanish_translation;
  const translationOpacity = 1, promptTapTargetRef = { current: null };
  const help = { interact() {} }, courseAudioPlaybackStatus = { playing: false };
  const openSentenceTranslation = () => {}, handlePromptPress = () => {}, handleReplayButtonPress = () => {};
  const renderPrompt = () => currentCard.prompt;
  ${header}
  return lessonPromptHeader;
}`;

test('native silent recognition keeps both English lines and translation reachable through retry and feedback', () => {
  const card = {
    stage: 'Recognize', prompt: 'What day is it today?\nMonday', audio_text: '',
    spanish_translation: '¿Qué día es hoy?\nLunes', answer_audio_text: 'Today is Monday.',
    correct_option_id: 'monday', options: [{ id: 'monday', label: '' }, { id: 'tuesday', label: '' }],
  };
  for (const [width, height] of [[320, 568], [390, 844], [740, 360], [915, 412]]) {
    for (const fontScale of [1, 1.3, 2]) for (const result of [null, 'wrong', 'correct']) {
      const viewport = { width, height, fontScale };
      const h = lessonHarness(viewport, { sourceTransform: (file, code) => file.endsWith('LessonScreen.tsx') ? headerModule : code });
      const styles = h.styles('screens/LessonScreen.tsx');
      const { Header } = h.load('screens/LessonScreen.tsx');
      const landscape = width > height;
      const paneWidth = landscape ? 230 : width - 20;
      const records = h.render(() => e('View', { children: e(Header, {
        currentCard: card, result, viewport, styles, showSentenceTranslation: true,
      }) }), paneWidth, 220);
      const prompt = records.find(r => r.type === 'Text' && r.text === card.prompt);
      assert.ok(prompt, `${width}/${fontScale}/${result}: complete written question and word remain present.`);
      assert.ok(prompt.textHeight <= prompt.box.height + 1.5, 'The English text fits its native measured slot.');
      assert.ok(prompt.fontSize >= 15.99, 'Fitted English retains the effective 16dp reading floor.');
      const translation = records.find(r => r.type === 'Pressable' && r.props.accessibilityLabel === `Mostrar traducción de ${card.prompt}`);
      assert.ok(translation && !translation.props.disabled, 'Translation is available without prompt audio.');
      const replay = records.filter(r => r.type === 'Pressable' && r.props.accessibilityRole === 'button' && r.props.accessibilityLabel?.startsWith('Repetir:'));
      assert.equal(replay.length, result === 'correct' ? 1 : 0, 'Only a correct selection exposes answer replay.');
      if (replay.length) {
        assert.equal(replay[0].props.accessibilityLabel, 'Repetir: Today is Monday.');
        assert.ok(!replay[0].props.disabled);
      }
      for (const r of records.filter(r => r.type === 'Text')) {
        assert.ok(r.box.left >= -1 && r.box.left + r.box.width <= paneWidth + 1, 'All written content remains inside the header.');
        assert.ok(r.box.top + r.box.height <= 220, `${width}/${height}/${fontScale}/${result}: ${r.text} outside native header: ${JSON.stringify(r.box)}`);
      }
    }
  }
});

test('native picture recognition shows the full English response only after a correct selection', () => {
  const card = {
    stage: 'Recognize', prompt: 'What day is it today?\nMonday', audio_text: '',
    answer_audio_text: 'Today is Monday.', prompt_image_url: '', interaction_type: 't2i2',
    correct_option_id: 'monday', options: [
      { id: 'monday', label: '', image_url: '/board-monday.webp' },
      { id: 'tuesday', label: '', image_url: '/board-tuesday.webp' },
    ],
  };
  for (const fontScale of [1, 1.3, 2]) for (const result of [null, 'wrong', 'correct']) {
    const viewport = { width: 390, height: 844, fontScale };
    const h = lessonHarness(viewport);
    const { LessonCardView } = h.load('components/LessonCardView.tsx');
    const records = h.render(() => e(LessonCardView, {
      card, result, selectedId: result === 'correct' ? 'monday' : result === 'wrong' ? 'tuesday' : null,
      selectedIds: [], lessonId: 'fixture', level: 'A1', userId: 'fixture', showHelp: false,
      optionsInteractive: true, onSelect() {},
    }), 370, 450);
    const response = records.find(r => r.type === 'Text' && r.text.includes('Today is Monday.'));
    assert.equal(Boolean(response), result === 'correct', 'Initial choice and retry never display the answer.');
    if (response) {
      assert.ok(response.textHeight <= response.box.height + 1.5);
      assert.ok(response.box.top + response.box.height <= 450, 'The full written answer fits the same card as its pictures.');
    }
  }
});
