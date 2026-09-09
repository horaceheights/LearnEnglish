import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import Yoga from 'yoga-layout';
import { promptChoiceLineCount, promptChoiceRowHeight } from '../src/promptChoiceLayout.ts';

const source = fs.readFileSync(new URL('../src/components/LessonCardView.tsx', import.meta.url), 'utf8');
const styles = vm.runInNewContext(source.slice(source.lastIndexOf('const styles = ') + 15), {
  StyleSheet: { create: x => x }, LESSON_MEDIA_FRAME_STYLE: {}, LESSON_MEDIA_VIEWPORT_STYLE: {},
});
const labels = ['He is a boy.', 'She is a girl.', 'He is a man.'];
const rowHeight = (height, width, scale, feedback = 58, choices = labels) => promptChoiceRowHeight({
  availableHeight: height, feedbackHeight: feedback, labels: choices, textWidth: width - 92,
  fontSize: 28, fontScale: Math.min(scale, 1.15), minimumFontSize: 16, preferredRowHeight: 94,
});

test('short sentences reserve one line without reducing their allowed wrapping', () => {
  for (const label of labels) assert.equal(promptChoiceLineCount(label, 301, 28), 1);
  assert.ok(promptChoiceLineCount('The grandfather and the grandmother are grandparents.', 228, 28) > 1);
  assert.match(source, /numberOfLines=\{optionTextLineLimit\}/);
  assert.match(source, /minimumFontScale=\{textOptionMinimumFontScale\}/);
});

test('native Yoga gives the screenshot pattern at least double its former 70dp frame', () => {
  for (const width of [360, 393, 430]) for (const height of [400, 434, 500]) {
    for (const scale of [1, 1.15, 1.3]) for (const feedback of [58, 90]) {
      const row = rowHeight(height, width, scale, feedback);
      const image = Math.min(230, height - row * 3 - 20 - feedback - 30);
      const minimumImage = height - feedback >= 334 ? 140 : 110;
      assert.ok(image >= minimumImage - 0.01, `${width}/${height}/${scale}/${feedback}: ${image}`);
      assert.ok(row >= 48);
      assert.ok(row - 18 >= 16 * Math.min(scale, 1.15) * 1.25);
      const root = Yoga.Node.create(); root.setWidth(width - 20); root.setHeight(height);
      root.setPadding(Yoga.EDGE_TOP, styles.card.paddingTop);
      root.setPadding(Yoga.EDGE_BOTTOM, styles.card.paddingBottom);
      root.setPadding(Yoga.EDGE_HORIZONTAL, styles.card.paddingHorizontal);
      const photo = Yoga.Node.create(); photo.setHeight(image); photo.setWidth((image - 24) * 1.5 + 24);
      photo.setAlignSelf(Yoga.ALIGN_CENTER); photo.setMargin(Yoga.EDGE_TOP, styles.promptImageFrameDensePortrait.marginTop);
      root.insertChild(photo, 0);
      const bank = Yoga.Node.create(); bank.setGap(Yoga.GUTTER_ROW, styles.optionsHorizontalPhrases.rowGap);
      bank.setMargin(Yoga.EDGE_TOP, styles.optionsHorizontalPhrases.marginTop); root.insertChild(bank, 1);
      for (let i = 0; i < 3; i++) { const tile = Yoga.Node.create(); tile.setHeight(row); bank.insertChild(tile, i); }
      const feedbackNode = Yoga.Node.create(); feedbackNode.setHeight(feedback - 12);
      feedbackNode.setMargin(Yoga.EDGE_TOP, styles.feedback.marginTop); root.insertChild(feedbackNode, 2);
      root.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
      assert.ok(feedbackNode.getComputedTop() + feedbackNode.getComputedHeight() <= height);
      assert.equal(bank.getChild(0).getComputedHeight(), bank.getChild(2).getComputedHeight());
      root.freeRecursive();
    }
  }
});

test('long answers retain their font floor and the helper is scoped to the affected layout', () => {
  const choices = ['The grandparents and the grandchildren are family.', 'The parents and the children are a family.'];
  const row = rowHeight(434, 393, 1.3, 90, choices);
  for (const label of choices) {
    const lines = promptChoiceLineCount(label, 301, 16 * 1.15);
    assert.ok(row >= lines * 16 * 1.15 * 1.25 + 18);
  }
  assert.match(source, /balancesPromptWithChoices = !isLandscape && !isPronunciation && !isMissionTile/);
  assert.match(source, /!useCompactCompletionTiles && Boolean\(activeTurnImageUrl \|\| card.prompt_image_url\)/);
  assert.match(source, /hasTextOnlyOptions && !allowVerticalGrowth/);
  assert.match(source, /: uniformTextOptionHeight;/);
});
