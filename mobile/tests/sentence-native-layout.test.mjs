import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import Yoga from 'yoga-layout';
import { sentenceLayout } from '../src/sentenceConstruction.ts';

const source = fs.readFileSync(new URL('../src/components/SentenceConstruction.tsx', import.meta.url), 'utf8');
const styles = vm.runInNewContext(source.slice(source.lastIndexOf('const styles = ') + 15).replace(/;\s*$/, ''),
  { StyleSheet: { create: value => value } });

test('wide native glyphs grow word tiles and wrap whole tiles instead of splitting words', () => {
  assert.match(source, /styles\.wordTile, \{ minWidth: width/);
  assert.match(source, /<Text numberOfLines=\{1\} style=\{\[styles\.word,/);
  for (const width of [280, 350, 680]) {
    for (const scale of [1, 1.3, 1.5, 2]) {
      const config = Yoga.Config.create(); config.setUseWebDefaults(false);
      const bank = Yoga.Node.create(config);
      bank.setWidth(width); bank.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
      bank.setFlexWrap(Yoga.WRAP_WRAP); bank.setGap(Yoga.GUTTER_ALL, styles.bank.gap);
      const nodes = [];
      // Exercise a font whose bold "woman" is wider than the old 5 * .62em estimate.
      for (const naturalWidth of [80, 80, 34, 13, 18, 17].map(value => value * scale)) {
        const wrapper = Yoga.Node.create(config);
        wrapper.setMinWidth(sentenceLayout(width, 600, scale, 6).tileWidth);
        wrapper.setFlexShrink(styles.wordTile.flexShrink);
        const tile = Yoga.Node.create(config);
        tile.setAlignItems(Yoga.ALIGN_CENTER); tile.setJustifyContent(Yoga.JUSTIFY_CENTER);
        tile.setPadding(Yoga.EDGE_ALL, styles.tile.padding);
        tile.setBorder(Yoga.EDGE_ALL, styles.tile.borderWidth);
        const label = Yoga.Node.create(config);
        label.setFlexShrink(styles.word.flexShrink);
        label.setMeasureFunc((available, mode) => ({
          width: mode === Yoga.MEASURE_MODE_UNDEFINED ? naturalWidth : Math.min(available, naturalWidth),
          height: 22 * scale,
        }));
        tile.insertChild(label, 0); wrapper.insertChild(tile, 0); bank.insertChild(wrapper, nodes.length);
        nodes.push({ wrapper, label, naturalWidth });
      }
      bank.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
      for (const { wrapper, label, naturalWidth } of nodes) {
        assert.ok(label.getComputedWidth() >= naturalWidth - 1, 'The complete label fits without clipping or ellipsis.');
        assert.ok(wrapper.getComputedLeft() + wrapper.getComputedWidth() <= width + 1, 'Whole tiles stay inside the bank.');
        assert.ok(label.getComputedHeight() <= Math.ceil(22 * scale) + 1, `${width}/${scale}: one text line with edge rounding.`);
      }
      assert.ok(nodes[0].wrapper.getComputedWidth() >= nodes[0].naturalWidth + 20 - 1);
      bank.freeRecursive(); config.free();
    }
  }
});

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

test('long completed words and punctuation fit native slots when replay moves into the instruction row', () => {
  assert.match(source, /onWidth\(option\.id, event\.nativeEvent\.layout\.width\)/);
  assert.match(source, /wideSlots \? styles\.importanceWide/);
  assert.match(source, /wideSlots \? styles\.replayAbove/);
  for (const paneWidth of [308, 301, 378, 500]) {
    for (const scale of [1, 1.3, 1.5, 2]) {
      // Native bold grandparents plus its period, measured wider than the old
      // five-letter estimate. Use the actual full-width mode's padding/border.
      const textWidth = 128 * scale;
      const config = Yoga.Config.create(); config.setUseWebDefaults(false);
      const pane = Yoga.Node.create(config); pane.setWidth(paneWidth);
      pane.setPadding(Yoga.EDGE_LEFT, styles.importance.paddingLeft);
      pane.setPadding(Yoga.EDGE_RIGHT, styles.importanceWide.paddingRight);
      pane.setBorder(Yoga.EDGE_ALL, styles.importance.borderWidth);
      const slot = Yoga.Node.create(config); slot.setFlexShrink(styles.slot.flexShrink);
      slot.setAlignSelf(Yoga.ALIGN_CENTER);
      slot.setPadding(Yoga.EDGE_HORIZONTAL, styles.slot.paddingHorizontal);
      const word = Yoga.Node.create(config);
      word.setMeasureFunc(() => ({ width: textWidth, height: 24 * scale }));
      slot.insertChild(word, 0); pane.insertChild(slot, 0);
      pane.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
      assert.ok(word.getComputedWidth() >= textWidth - 1);
      assert.ok(slot.getComputedLeft() >= styles.importance.paddingLeft);
      assert.ok(slot.getComputedLeft() + slot.getComputedWidth() <= paneWidth - styles.importanceWide.paddingRight);
      assert.ok(styles.replayAbove.top + styles.replay.height <= styles.importance.paddingVertical + 48);
      pane.freeRecursive(); config.free();
    }
  }
});
