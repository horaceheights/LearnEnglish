import assert from 'node:assert/strict';
import test from 'node:test';
import { element as e, lessonHarness } from './native-lesson-harness.mjs';

function renderDialog(width = 390, height = 844, extra = {}, options = {}) {
  const h = lessonHarness({ width, height, fontScale: options.fontScale || 1 }, {
    insets: options.insets || { top: 24, bottom: 24, left: 0, right: 0 },
    sourceTransform: (file, source) => {
      if (!file.endsWith('LegacyProgressImportDialog.tsx')) return source;
      // Measure the same inner container that native ScrollView creates.
      let next = source.replace('<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>',
        '<ScrollView style={styles.scroll}><View style={styles.content}>').replace('</ScrollView>', '</View></ScrollView>');
      // Retain the actual Android-back callback for interaction assertions.
      if (options.captureBack) next = next.replace('<Modal ', '<View ').replace('</Modal>', '</View>');
      return next;
    },
  });
  const { LegacyProgressImportDialog } = h.load('components/LegacyProgressImportDialog.tsx');
  return h.render(() => e('View', { style: { flex: 1 }, children: e(LegacyProgressImportDialog, {
    visible: true, previousName: 'horace', accountName: 'Horacio', importing: false, error: '',
    onImport: () => {}, onSkip: () => {}, ...extra,
  }) }), width, height);
}

test('popup requires an explicit import or skip choice', () => {
  let imports = 0, skips = 0;
  const records = renderDialog(390, 844, { onImport: () => imports++, onSkip: () => skips++ });
  assert.equal(imports + skips, 0);
  assert.ok(records.some(r => r.props.accessibilityViewIsModal));
  assert.ok(records.some(r => r.text.includes('horace') && r.text.includes('Horacio')));
  const buttons = records.filter(r => r.type === 'Pressable');
  assert.equal(buttons.length, 2);
  buttons[0].props.onPress();
  assert.equal(imports, 1); assert.equal(skips, 0);
  buttons[1].props.onPress(); assert.equal(skips, 1);
});

test('hidden popup adds no notice or actions to the course layout', () => {
  const records = renderDialog(390, 844, { visible: false });
  assert.equal(records.filter(r => r.type === 'Text' || r.type === 'Pressable').length, 0);
});

test('Android back defers import; loading blocks exits and duplicate imports', () => {
  for (const importing of [false, true]) {
    let imports = 0, skips = 0;
    const records = renderDialog(390, 844, { importing, onImport: () => imports++, onSkip: () => skips++ }, { captureBack: true });
    records.find(r => r.props.onRequestClose).props.onRequestClose();
    assert.equal(skips, importing ? 0 : 1);
    const buttons = records.filter(r => r.type === 'Pressable');
    assert.ok(buttons.every(r => r.props.disabled === importing && r.props.accessibilityState.disabled === importing));
    if (importing) {
      buttons.forEach(r => r.props.onPress());
      assert.equal(imports + skips, 0);
      assert.ok(records.some(r => r.text === 'Conservando tu progreso…'));
    }
  }
});

test('import failure stays visible with an explicit retry', () => {
  let imports = 0;
  const records = renderDialog(320, 640, { error: 'No pudimos guardar tu progreso.', onImport: () => imports++ });
  assert.equal(records.find(r => r.props.accessibilityRole === 'alert').text, 'No pudimos guardar tu progreso.');
  assert.ok(records.some(r => r.text === 'Reintentar importación'));
  records.find(r => r.type === 'Pressable').props.onPress(); assert.equal(imports, 1);
});

for (const [width, height, fontScale, insets] of [
  [320, 640, 1, { top: 24, bottom: 24, left: 0, right: 0 }],
  [390, 844, 1.6, { top: 44, bottom: 34, left: 0, right: 0 }],
  [844, 390, 1.6, { top: 0, bottom: 24, left: 44, right: 44 }],
  [1024, 768, 1, { top: 24, bottom: 24, left: 0, right: 0 }],
]) test(`popup fits safe areas at ${width}x${height}, text scale ${fontScale}`, () => {
  const records = renderDialog(width, height, { previousName: 'María del Carmen', error: 'No pudimos importar tu progreso. Inténtalo otra vez.' }, { fontScale, insets });
  const panel = records.find(r => r.props.accessibilityViewIsModal);
  assert.ok(panel.box.top >= insets.top + 15);
  assert.ok(panel.box.top + panel.box.height <= height - insets.bottom - 15);
  assert.ok(panel.box.left >= insets.left + 15);
  assert.ok(panel.box.left + panel.box.width <= width - insets.right - 15);
  assert.ok(records.some(r => r.type === 'ScrollView'), 'long content and actions must remain scrollable');
  for (const r of records.filter(r => r.type === 'Text' || r.type === 'Pressable')) {
    assert.ok(r.box.left >= panel.box.left && r.box.left + r.box.width <= panel.box.left + panel.box.width + 1, `horizontal overflow: ${r.text}`);
    if (r.type === 'Text') assert.ok(r.textHeight <= r.box.height + 1.5, `clipped text: ${r.text}`);
    if (r.type === 'Pressable') assert.ok(r.box.height >= 48 && r.box.width >= 48, 'actions need 48dp touch targets');
  }
});
