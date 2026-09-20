// Execute production TSX and its onLayout updates with native Yoga defaults.
// Audio/network/effects are inert. Text metrics are conservative estimates;
// installed Android screenshots remain the final font/rendering check.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import Yoga from 'yoga-layout';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
export const element = (type, props = {}, key) => ({ type, props, key });
const flat = value => Array.isArray(value) ? Object.assign({}, ...value.map(flat)) : value || {};
const textOf = value => Array.isArray(value) ? value.map(textOf).join('') : typeof value === 'object' && value ? textOf(value.props?.children) : value == null || typeof value === 'boolean' ? '' : String(value);
export function lessonHarness(viewport, options = {}) {
  const stats = { audioPlayers: 0 };
  const modules = new Map(), states = new Map(), styleCache = new Map();
  let current, hook = 0, dirty, updates = [];
  const state = initial => {
    const key = `${current}:${hook++}`;
    if (!states.has(key)) states.set(key, typeof initial === 'function' ? initial() : initial);
    return [states.get(key), next => {
      const value = typeof next === 'function' ? next(states.get(key)) : next;
      if (JSON.stringify(value) !== JSON.stringify(states.get(key))) { updates.push([key, states.get(key), value]); states.set(key, value); dirty = true; }
    }];
  };
  const react = { useState: state, useRef: value => state({ current: value })[0], useMemo: fn => fn(), useCallback: fn => fn, useEffectEvent: fn => fn,
    useEffect: () => {}, useLayoutEffect: () => {}, Fragment: 'Fragment' };
  class Value { setValue() {} interpolate() { return 0; } getTranslateTransform() { return []; } }
  const rn = { Modal: props => props.visible ? element('Fragment', { children: props.children }) : null, View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Image: 'Image',
    useWindowDimensions: () => viewport, StyleSheet: { create: x => x, absoluteFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } },
    Animated: { Value, ValueXY: Value, View: 'View', Text: 'Text' }, Easing: {}, PanResponder: { create: () => ({ panHandlers: {} }) } };
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file = ['.ts', '.tsx', '.json'].map(ext => file + ext).find(fs.existsSync);
    if (!file) throw Error('Missing production dependency');
    if (modules.has(file)) return modules.get(file);
    const api = {}; modules.set(file, api);
    let source = fs.readFileSync(file, 'utf8');
    if (options.pronunciation && file.endsWith('PronunciationPractice.tsx')) {
      const scenario = options.pronunciation;
      source = source.replace("useState<Phase>('model')", `useState<Phase>(${JSON.stringify(scenario.phase)})`)
        .replace('const [serviceUnavailable, setServiceUnavailable] = useState(false)', `const [serviceUnavailable, setServiceUnavailable] = useState(${Boolean(scenario.unavailable)})`)
        .replace('useState<PronunciationResult | null>(null)', `useState<PronunciationResult | null>(${JSON.stringify(scenario.result || null)})`);
    }
    if (options.sourceTransform) source = options.sourceTransform(file, source);
    if (file.endsWith('.json')) return JSON.parse(source);
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(compiled, { exports: api, console, setTimeout, clearTimeout, require: id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' };
      if (id === 'react-native') return rn;
      if (id === 'react-native-safe-area-context') return { useSafeAreaInsets: () => options.insets || { top: 0, bottom: 0, left: 0, right: 0 } };
      if (id === '@expo/vector-icons') return { Ionicons: p => element('View', { style: { width: p.size, height: p.size } }) };
      if (/\.(wav|mp3|webp|png)$/.test(id)) return id;
      if (id === 'expo-file-system') return { File: class {} };
      if (id === 'expo-audio') return { RecordingPresets: { HIGH_QUALITY: {} },
        createAudioPlayer: () => { stats.audioPlayers++; return {}; }, createAudioPlaylist: () => ({}), useAudioPlaylistStatus: () => ({}),
        useAudioPlayer: () => ({}), useAudioPlayerStatus: () => ({}), useAudioRecorder: () => ({}), useAudioRecorderState: () => ({}) };
      if (id.endsWith('/api') || id.endsWith('/diagnostics') || id.endsWith('/lessonAudioCache') || id.includes('spanglish-speech/src')) return new Proxy({}, { get: () => () => false });
      if (id === 'expo-video') return { VideoView: 'View', useVideoPlayer: () => ({}) };
      if (id.endsWith('/useReducedMotion')) return { useReducedMotion: () => true };
      if (id.endsWith('/actionVideos')) return { lessonActionVideo: () => null };
      if (id.endsWith('/config')) return { lessonVideoUrl: x => x };
      if (id.endsWith('/OptionMediaImage')) return { OptionMediaImage: () => element('Image', { style: rn.StyleSheet.absoluteFill }) };
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id));
      throw Error(`Unmocked native dependency ${id}`);
    } }, { filename: file });
    return api;
  }
  function styles(file) {
    if (styleCache.has(file)) return styleCache.get(file);
    const source = fs.readFileSync(path.resolve(root, file), 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression;
    ast.forEachChild(node => { if (ts.isVariableStatement(node)) for (const d of node.declarationList.declarations) if (d.name.getText(ast) === 'styles') expression = d.initializer.getText(ast); });
    const value = vm.runInNewContext(expression, { StyleSheet: rn.StyleSheet, ...load('components/LessonMediaFrame.tsx') });
    styleCache.set(file, value); return value;
  }
  function render(factory, width, height, preserveState = false) {
    if (!preserveState) states.clear();
    let records, yogaRoot, config;
    for (let pass = 0; pass < 8; pass++) {
      dirty = false; updates = []; records = []; config = Yoga.Config.create(); config.setUseWebDefaults(false);
      function build(item, address) {
        if (item == null || typeof item === 'boolean') return [];
        if (Array.isArray(item)) return item.flatMap((x, i) => build(x, `${address}/${x?.key ?? i}`));
        if (typeof item.type === 'function') {
          const previous = current, oldHook = hook; current = address; hook = 0;
          const result = item.type(item.props); current = previous; hook = oldHook;
          return build(result, address + '/render');
        }
        if (item.type === 'Fragment') return build(item.props.children, address + '/fragment');
        const props = item.props || {}, node = Yoga.Node.create(config);
        const style = flat(typeof props.style === 'function' ? props.style({ pressed: false }) : props.style);
        const record = { node, props, style, type: item.type, text: item.type === 'Text' ? textOf(props.children) : '' };
        records.push(record);
        for (const [key, value] of Object.entries(style)) {
          if (value == null) continue;
          const dimensions = { width: 'Width', height: 'Height', minWidth: 'MinWidth', minHeight: 'MinHeight', maxWidth: 'MaxWidth', maxHeight: 'MaxHeight', flexBasis: 'FlexBasis' };
          if (dimensions[key]) { const name = 'set' + dimensions[key]; if (typeof value === 'number') node[name](value); else if (String(value).endsWith('%')) node[name + 'Percent'](parseFloat(value)); }
          if (['flex', 'flexGrow', 'flexShrink', 'aspectRatio'].includes(key)) node['set' + key[0].toUpperCase() + key.slice(1)](value);
          const enums = { flexDirection: ['FlexDirection', 'FLEX_DIRECTION'], flexWrap: ['FlexWrap', 'WRAP'], justifyContent: ['JustifyContent', 'JUSTIFY'], alignItems: ['AlignItems', 'ALIGN'], alignSelf: ['AlignSelf', 'ALIGN'], alignContent: ['AlignContent', 'ALIGN'], position: ['PositionType', 'POSITION_TYPE'] };
          if (enums[key]) { const [method, prefix] = enums[key]; node['set' + method](Yoga[prefix + '_' + value.toUpperCase().replaceAll('-', '_')]); }
          for (const kind of ['padding', 'margin', 'border']) {
            if (!key.startsWith(kind) || typeof value !== 'number' || (kind === 'border' && !key.endsWith('Width'))) continue;
            const suffix = key.slice(kind.length).replace('Width', '') || 'All';
            const edge = Yoga['EDGE_' + suffix.toUpperCase()];
            if (edge !== undefined) node['set' + kind[0].toUpperCase() + kind.slice(1)](edge, value);
          }
          if (['top', 'bottom', 'left', 'right'].includes(key) && typeof value === 'number') node.setPosition(Yoga['EDGE_' + key.toUpperCase()], value);
          if (['gap', 'columnGap', 'rowGap'].includes(key)) node.setGap(Yoga[key === 'gap' ? 'GUTTER_ALL' : key === 'rowGap' ? 'GUTTER_ROW' : 'GUTTER_COLUMN'], value);
        }
        if (item.type === 'Text') node.setMeasureFunc(record.measure = (w, wm, h, hm) => {
          const scale = Math.min(viewport.fontScale, props.maxFontSizeMultiplier || Infinity);
          const base = (style.fontSize || 14) * scale;
          const limit = wm === Yoga.MEASURE_MODE_UNDEFINED ? Infinity : w;
          const measure = size => {
            const wordWidth = word => [...word].reduce((n, c) => n + (/[MW@]/.test(c) ? .9 : /[ilI.,!':;]/.test(c) ? .3 : .56), 0) * size;
            let line = 0, max = 0, lines = 1;
            for (const word of record.text.split(/(\s+)/)) {
              if (word.includes('\n')) { lines += word.split('\n').length - 1; max = Math.max(max, line); line = 0; continue; }
              const next = wordWidth(word);
              if (line && line + next > limit + 1) { max = Math.max(max, line); line = 0; lines++; }
              line += next;
            }
            return { width: Math.max(max, line), height: lines * (style.lineHeight ? style.lineHeight * scale : size * 1.22), lines };
          };
          let size = base, measured = measure(size);
          while (props.adjustsFontSizeToFit && size > base * (props.minimumFontScale || 1) + .1
            && (measured.width > limit || measured.lines > (props.numberOfLines || Infinity) || (hm !== Yoga.MEASURE_MODE_UNDEFINED && measured.height > h))) {
            size = Math.max(base * props.minimumFontScale, size - .25); measured = measure(size);
          }
          record.textHeight = measured.height; record.fontSize = size; record.textWidth = measured.width;
          return { width: Math.min(limit, measured.width), height: measured.height };
        });
        else build(props.children, address + '/children').forEach((child, i) => node.insertChild(child, i));
        return [node];
      }
      yogaRoot = build(factory(), 'root')[0]; yogaRoot.setWidth(width); yogaRoot.setHeight(height);
      yogaRoot.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
      for (const record of records) {
        const box = record.node.getComputedLayout(); record.box = { ...box };
        record.measure?.(box.width, Yoga.MEASURE_MODE_EXACTLY, box.height, Yoga.MEASURE_MODE_EXACTLY);
        let parent = record.node.getParent();
        while (parent) { record.box.left += parent.getComputedLeft(); record.box.top += parent.getComputedTop(); parent = parent.getParent(); }
        record.props.onLayout?.({ nativeEvent: { layout: box } });
      }
      yogaRoot.freeRecursive(); config.free();
      if (!dirty) break;
      if (pass === 7) throw Error('Native lesson measurements did not settle: ' + JSON.stringify(updates));
    }
    return records;
  }
  return { load, styles, render, stats };
}
