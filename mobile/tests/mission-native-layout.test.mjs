import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import Yoga from 'yoga-layout';

function styles(file) {
  const source = fs.readFileSync(new URL('../src/components/' + file, import.meta.url), 'utf8');
  return vm.runInNewContext(source.slice(source.lastIndexOf('const styles = ') + 15).replace(/;\s*$/, ''),
    { StyleSheet: { create: x => x } });
}
const game = styles('MissionGameSurface.tsx');
const voice = styles('MissionVoicePresentation.tsx');
function nativeLayout(copyStyle) {
  const config = Yoga.Config.create(); config.setUseWebDefaults(false);
  const node = () => Yoga.Node.create(config);
  const root = node(); root.setWidth(210); root.setHeight(284);
  root.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
  const header = node(); header.setHeight(110); root.insertChild(header, 0);
  const panel = node(); panel.setPadding(Yoga.EDGE_VERTICAL, game.instructionPanelLandscape.paddingVertical);
  panel.setPadding(Yoga.EDGE_HORIZONTAL, game.instructionPanelLandscape.paddingHorizontal);
  panel.setBorder(Yoga.EDGE_ALL, game.instructionPanel.borderWidth); root.insertChild(panel, 1);
  const copy = node(); copy.setFlex(copyStyle.flex); copy.setFlexBasisAuto();
  copy.setFlexGrow(copyStyle.flexGrow); copy.setFlexShrink(copyStyle.flexShrink); panel.insertChild(copy, 0);
  const meta = node(); meta.setMinHeight(game.instructionMetaLandscape.minHeight); copy.insertChild(meta, 0);
  const text = node(); text.setMargin(Yoga.EDGE_TOP, game.instruction.marginTop);
  // Native four-line feedback at 130% system text, as allowed by the real Text.
  text.setMeasureFunc(() => ({ width: 180, height: game.instruction.lineHeight * 4 * 1.3 }));
  copy.insertChild(text, 1);
  root.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
  const result = { copyHeight: copy.getComputedHeight(), panelHeight: panel.getComputedHeight(),
    bottom: panel.getComputedTop() + copy.getComputedTop() + text.getComputedTop() + text.getComputedHeight() };
  root.freeRecursive(); config.free(); return result;
}
test('real native Yoga rejects the previous flex shorthand and keeps landscape feedback inside the phone', () => {
  const actual = { ...game.instructionCopy, ...game.instructionCopyLandscape };
  const broken = nativeLayout({ ...actual, flex: 1 });
  assert.equal(broken.copyHeight, 0, 'reproduce the shipped native-only collapse');
  assert.ok(broken.bottom > 284);
  const fixed = nativeLayout(actual);
  assert.ok(fixed.copyHeight >= 48 + 98);
  assert.ok(fixed.bottom <= 284);
});
test('voice result reserves natural copy height and gives the remaining height to the complete image', () => {
  assert.equal(voice.surface.flex, 1);
  assert.equal(voice.sceneSlot.flex, 1);
  assert.equal(voice.sceneSlot.minHeight, 0);
  assert.equal(voice.console.flexShrink, 0);
  assert.notEqual(voice.console.flexDirection, 'row', 'answer cannot share the icon/replay row');
  assert.equal(voice.replay.minHeight, 48);
  for (const [width, height] of [[320,300],[360,400],[260,264],[520,350]]) {
    for (const scale of [1,1.3]) {
      const config = Yoga.Config.create(); config.setUseWebDefaults(false);
      const root = Yoga.Node.create(config); root.setWidth(width); root.setHeight(height);
      root.setGap(Yoga.GUTTER_ALL,voice.surface.gap);
      const scene=Yoga.Node.create(config);scene.setFlex(voice.sceneSlot.flex);scene.setMinHeight(0);root.insertChild(scene,0);
      const result=Yoga.Node.create(config);result.setFlexShrink(voice.console.flexShrink);
      result.setHeight(16 + 24 + 4 + voice.answer.lineHeight*2*scale + 4 + voice.message.lineHeight*2*scale);
      root.insertChild(result,1);root.calculateLayout(undefined,undefined,Yoga.DIRECTION_LTR);
      assert.ok(scene.getComputedHeight()>0);
      assert.ok(result.getComputedTop()+result.getComputedHeight()<=height+0.01);
      root.freeRecursive();config.free();
    }
  }
});
