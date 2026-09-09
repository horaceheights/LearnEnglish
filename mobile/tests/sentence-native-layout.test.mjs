import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import Yoga from 'yoga-layout';
import { sentenceLayout } from '../src/sentenceConstruction.ts';

const source = fs.readFileSync(new URL('../src/components/SentenceConstruction.tsx', import.meta.url), 'utf8');
const styles = vm.runInNewContext(source.slice(source.lastIndexOf('const styles = ') + 15).replace(/;\s*$/, ''),
  { StyleSheet: { create: value => value } });

test('native Yoga bounds both construction panes while enlarged content remains scrollable', () => {
  for (const [width, height] of [[320, 568], [390, 844], [740, 360], [800, 1280], [1280, 800]]) {
    for (const scale of [1, 1.3, 1.5, 2]) {
      const landscape = width > height && height < 600;
      const usableWidth = width - 12;
      const usableHeight = height - (landscape ? 128 : 240) - 12;
      const layout = sentenceLayout(landscape ? usableWidth * .48 : usableWidth - 40, usableHeight, scale, 6);
      const config = Yoga.Config.create(); config.setUseWebDefaults(false);
      const make = () => Yoga.Node.create(config);
      const root = make(); root.setWidth(usableWidth); root.setHeight(usableHeight);
      root.setFlexDirection(landscape ? Yoga.FLEX_DIRECTION_ROW : Yoga.FLEX_DIRECTION_COLUMN);
      root.setGap(Yoga.GUTTER_ALL, styles.root.gap);
      const importance = make(); importance.setFlexShrink(styles.importance.flexShrink);
      importance.setMaxHeightPercent(landscape ? 100 : 50);
      importance.setPadding(Yoga.EDGE_VERTICAL, styles.importance.paddingVertical);
      if (landscape) importance.setWidthPercent(48);
      root.insertChild(importance, 0);
      const instruction = make(); instruction.setHeight(Math.max(48, 34 * scale));
      importance.insertChild(instruction, 0);
      const slots = make(); slots.setFlexGrow(styles.slotScroll.flexGrow); slots.setFlexShrink(styles.slotScroll.flexShrink);
      slots.setMeasureFunc(() => ({ width: usableWidth * (landscape ? .48 : 1) - 56,
        height: layout.rows * (layout.tileHeight + styles.slots.gap) }));
      importance.insertChild(slots, 1);
      const card = make(); card.setFlex(styles.card.flex); card.setMinHeight(styles.card.minHeight);
      // Native ScrollView clips to its measured pane, while its content retains
      // natural size and can scroll to every 48dp word/control and the full hint.
      card.setOverflow(Yoga.OVERFLOW_SCROLL); root.insertChild(card, 1);
      const content = make(); content.setHeight(6 * layout.tileHeight + 220 * scale);
      card.insertChild(content, 0);
      root.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
      for (const pane of [importance, card]) {
        assert.ok(pane.getComputedLeft() + pane.getComputedWidth() <= usableWidth + 1, `${width} / ${scale}: width`);
        assert.ok(pane.getComputedTop() + pane.getComputedHeight() <= usableHeight + 1, `${height} / ${scale}: height`);
        assert.ok(pane.getComputedHeight() >= 48, `${height} / ${scale}: reachable pane`);
      }
      assert.equal(content.getComputedHeight(), 6 * layout.tileHeight + 220 * scale, 'Scrollable content retains every full-size word, control, and hint.');
      root.freeRecursive(); config.free();
    }
  }
});
