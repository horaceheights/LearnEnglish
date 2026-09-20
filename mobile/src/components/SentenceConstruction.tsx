import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LessonCard } from '../types';
import {
  availableSentenceWords, placeSentenceWord, returnSentenceWord, sentenceHint,
  sentenceLayout, sentenceParts, sentenceSlots, tileFlightPath,
  type TileBounds, type TileFlightPath,
} from '../sentenceConstruction';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { LessonMediaFrame } from './LessonMediaFrame';
import { OptionMediaImage } from './OptionMediaImage';
import { isPhoneLandscape } from '../lessonViewportLayout';
import { lessonHelpText } from '../lessonHelp';
import { ConstructionCelebration, useConstructionCelebration } from './ConstructionCelebration';

type Bounds = TileBounds;
type Flight = { label: string; path: TileFlightPath; slot: number };
type Drag = { id: string; label: string; area?: Bounds; slotArea?: Bounds; cardArea?: Bounds; targets: Bounds[]; bank?: Bounds; width: number; height: number };
const FLIGHT_MS = 220;
type Props = {
  card: LessonCard; selected: string[]; result: 'correct' | 'wrong' | null;
  disabled: boolean; showHelp?: boolean; helpOpen?: boolean;
  onChange: (ids: string[]) => void; onReplay: () => void; onRetry: () => void;
};

type WordProps = {
  id: string; label: string; slot?: number; suffix?: string; disabled: boolean;
  width: number; height: number; textSize: number; active: boolean; hidden: boolean; correct: boolean;
  count: number;
  maxFontSizeMultiplier?: number;
  register: (view: View | null) => void;
  onWidth: (id: string, width: number) => void;
  onPress: (id: string, slot?: number, from?: Bounds) => void;
  onPlace: (id: string, slot: number) => void;
  onStart: (id: string, label: string, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onDrop: (x: number, y: number) => void;
  onCancel: () => void;
  onTranslate?: () => void;
};

function WordTile(props: WordProps) {
  const latest = useRef(props); latest.current = props;
  const tile = useRef<View | null>(null);
  const sourceBounds = useRef<Bounds | undefined>(undefined);
  const dragged = useRef(false);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Boolean(latest.current.id) && !latest.current.disabled && Math.hypot(gesture.dx, gesture.dy) > 6,
    onPanResponderGrant: (_, gesture) => {
      dragged.current = true;
      const p = latest.current;
      p.onStart(p.id, p.label, gesture.moveX, gesture.moveY);
    },
    onPanResponderMove: (_, gesture) => latest.current.onMove(gesture.moveX, gesture.moveY),
    onPanResponderRelease: event => latest.current.onDrop(event.nativeEvent.pageX, event.nativeEvent.pageY),
    onPanResponderTerminate: () => latest.current.onCancel(),
    onPanResponderTerminationRequest: () => false,
  }), []);
  const { id, label, slot, suffix, disabled, width, height, textSize, active, hidden, correct } = props;
  return <View {...pan.panHandlers} onLayout={(event) => props.onWidth(id, event.nativeEvent.layout.width)}
    style={[styles.wordTile, { minWidth: width }]}>
    <Pressable ref={(view) => { tile.current = view; props.register(view); }} disabled={disabled && !props.onTranslate}
      accessibilityRole={id ? 'button' : 'text'}
      accessibilityLabel={props.onTranslate ? `${label}. Mostrar traducción` : slot === undefined ? `Ficha ${label}` : `Espacio ${slot + 1}: ${label || 'vacío'}`}
      accessibilityHint={disabled ? undefined : slot === undefined ? 'Toca para colocar, o arrastra a un espacio.' : 'Toca para devolver, o arrastra para mover esta palabra.'}
      accessibilityActions={id && !disabled ? [
        ...Array.from({ length: props.count }, (_, index) => ({ name: `place-${index}`, label: `Mover al espacio ${index + 1}` })),
        ...(slot === undefined ? [] : [{ name: 'return', label: 'Devolver a las palabras disponibles' }]),
      ] : []}
      onAccessibilityAction={({ nativeEvent }) => {
        if (disabled) return;
        if (nativeEvent.actionName === 'return') props.onPress(id, slot);
        else if (nativeEvent.actionName.startsWith('place-')) props.onPlace(id, Number(nativeEvent.actionName.slice(6)));
      }}
      onPressIn={() => {
        dragged.current = false;
        sourceBounds.current = undefined;
        tile.current?.measureInWindow((x, y, w, h) => { sourceBounds.current = { x, y, width: w, height: h }; });
      }}
      onPress={() => { if (props.onTranslate) props.onTranslate(); else if (id && !dragged.current) props.onPress(id, slot, sourceBounds.current); }}
      style={[slot === undefined ? styles.tile : styles.slot, props.maxFontSizeMultiplier ? styles.tilePhoneLandscape : null, { minHeight: height }, active ? styles.target : null, correct ? styles.correct : null]}>
      <Text numberOfLines={1} maxFontSizeMultiplier={props.maxFontSizeMultiplier} style={[styles.word, { fontSize: textSize }, hidden ? styles.arriving : null]}>{label || '___'}{suffix}</Text>
    </Pressable>
  </View>;
}

export function SentenceConstruction({ card, selected, result, disabled, showHelp, helpOpen, onChange, onReplay, onRetry }: Props) {
  const viewport = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const celebrationLift = useConstructionCelebration(result === 'correct');
  const [translated, setTranslated] = useState(false);
  const [wordWidths, setWordWidths] = useState<Record<string, number>>({});
  const [feedbackHeight, setFeedbackHeight] = useState(24);
  const [size, setSize] = useState({ width: viewport.width - 12, height: viewport.height - 240 });
  const [flight, setFlight] = useState<Flight | null>(null);
  const [moving, setMoving] = useState<{ id: string; label: string } | null>(null);
  const [hover, setHover] = useState<number | 'bank' | null>(null);
  const position = useRef(new Animated.ValueXY()).current;
  const flightValue = useRef(new Animated.Value(0)).current;
  const flightAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const flightRun = useRef(0);
  const drag = useRef<Drag | null>(null);
  const root = useRef<View>(null);
  const bank = useRef<View>(null);
  const slotPane = useRef<View | ScrollView | null>(null);
  const cardPane = useRef<View | ScrollView | null>(null);
  const slotsRef = useRef<Array<View | null>>([]);
  const history = useRef<string[][]>([]);
  const slots = sentenceSlots(card, selected);
  const words = availableSentenceWords(card, slots);
  const parts = sentenceParts(card);
  const landscape = isPhoneLandscape(viewport.width, viewport.height);
  const layout = landscape
    ? { ...sentenceLayout(size.width, size.height, Math.min(1.3, viewport.fontScale), slots.length, feedbackHeight),
        textSize: 16, tileWidth: 48, tileHeight: 48, scrollBank: false, imageHeight: 0 }
    : sentenceLayout(size.width - 40, size.height, viewport.fontScale, slots.length, feedbackHeight);
  const paneWidth = size.width;
  const wideSlots = Math.max(0, ...card.options.map(option => wordWidths[option.id] || 0))
    + layout.textSize * viewport.fontScale > paneWidth - 60;
  const locked = disabled || result !== null;
  const mistakeHint = result === 'wrong' ? sentenceHint(card, slots) : '';
  const measureWord = (id: string, width: number) => {
    if (id) setWordWidths(previous => previous[id] === width ? previous : { ...previous, [id]: width });
  };
  const cancel = () => { drag.current = null; setMoving(null); setHover(null); };
  const stopFlight = () => { flightRun.current++; flightAnimation.current?.stop(); flightAnimation.current = null; setFlight(null); };
  useEffect(() => () => { flightRun.current++; flightAnimation.current?.stop(); }, []);
  useEffect(() => { cancel(); stopFlight(); }, [card.slide_id, viewport.width, viewport.height, viewport.fontScale, showHelp, helpOpen, disabled]);
  useEffect(() => { if (result !== null) cancel(); }, [result]);

  const startFlight = (id: string, target: number, from?: Bounds) => {
    if (!from) return;
    const run = flightRun.current;
    // Capture the source before it leaves the bank; measure the destination after
    // committing. Missing geometry never delays the actual answer or validation.
    requestAnimationFrame(() => root.current?.measureInWindow((x, y) => {
      slotsRef.current[target]?.measureInWindow((sx, sy, width, height) => {
        if (run !== flightRun.current) return;
        const path = tileFlightPath(from, { x: sx, y: sy, width, height }, { x, y });
        if (!path) return;
        const label = card.options.find(option => option.id === id)?.label || '';
        flightValue.setValue(0); setFlight({ label, path, slot: target });
        const animation = Animated.timing(flightValue, { duration: FLIGHT_MS, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true });
        flightAnimation.current = animation;
        animation.start(() => { if (run === flightRun.current) { flightAnimation.current = null; setFlight(null); } });
      });
    }));
  };
  const commit = (next: string[]) => {
    if (locked || next.every((id, index) => id === slots[index])) return false;
    stopFlight(); history.current.push([...slots]); onChange(next); return true;
  };
  const place = (id: string, index?: number, from?: Bounds) => {
    const next = placeSentenceWord(card, slots, id, index);
    const target = next.indexOf(id);
    if (commit(next) && !reduceMotion) startFlight(id, target, from);
  };
  const press = (id: string, slot?: number, from?: Bounds) => {
    if (slot === undefined) place(id, undefined, from);
    else commit(returnSentenceWord(card, slots, id));
  };
  const contains = (b: Bounds | undefined, x: number, y: number) => Boolean(b && x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height);
  const targetAt = (d: Drag, x: number, y: number): number | 'bank' | null => {
    if (!contains(d.area, x, y)) return null;
    const index = contains(d.slotArea, x, y) ? d.targets.findIndex(b => contains(b, x, y)) : -1;
    return index >= 0 ? index : contains(d.cardArea, x, y) && contains(d.bank, x, y) ? 'bank' : null;
  };
  const move = (x: number, y: number) => {
    const d = drag.current;
    if (!d?.area) return;
    const a = d.area;
    position.setValue({ x: Math.max(0, Math.min(x - a.x - d.width / 2, a.width - d.width)), y: Math.max(0, Math.min(y - a.y - d.height / 2, a.height - d.height)) });
    setHover(targetAt(d, x, y));
  };
  const start = (id: string, label: string, x: number, y: number) => {
    if (locked) return;
    stopFlight();
    const d: Drag = { id, label, targets: [], width: wordWidths[id] || layout.tileWidth, height: layout.tileHeight }; drag.current = d;
    root.current?.measureInWindow((rx, ry, width, height) => {
      if (drag.current !== d) return;
      d.area = { x: rx, y: ry, width, height }; move(x, y); setMoving({ id, label });
    });
    slotsRef.current.forEach((view, index) => view?.measureInWindow((sx, sy, width, height) => { d.targets[index] = { x: sx, y: sy, width, height }; }));
    (slotPane.current && 'getNativeScrollRef' in slotPane.current ? slotPane.current.getNativeScrollRef() : slotPane.current)?.measureInWindow((sx, sy, width, height) => { d.slotArea = { x: sx, y: sy, width, height }; });
    const pane = cardPane.current;
    const nativePane = pane && 'getNativeScrollRef' in pane ? pane.getNativeScrollRef() : pane;
    nativePane?.measureInWindow((cx, cy, width, height) => { d.cardArea = { x: cx, y: cy, width, height }; });
    bank.current?.measureInWindow((bx, by, width, height) => { d.bank = { x: bx, y: by, width, height }; });
  };
  const drop = (x: number, y: number) => {
    const d = drag.current;
    if (d) {
      const target = targetAt(d, x, y);
      if (target === 'bank') commit(returnSentenceWord(card, slots, d.id));
      else if (typeof target === 'number') place(d.id, target);
    }
    cancel();
  };
  const common = { disabled: locked, width: layout.tileWidth, height: layout.tileHeight, textSize: layout.textSize, count: slots.length, maxFontSizeMultiplier: landscape ? 1.3 : undefined,
    onWidth: measureWord, onPress: press, onPlace: place, onStart: start, onMove: move, onDrop: drop, onCancel: cancel };
  const compact = !landscape && layout.scrollBank;
  const CardContainer = compact ? ScrollView : View;
  const SlotsContainer = landscape ? View : ScrollView;
  const replayControl = <Pressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="Repetir frase en inglés"
    style={[styles.replay, wideSlots ? styles.replayAbove : null, landscape ? styles.replayPhoneLandscape : null]}>
    <Ionicons name="volume-high" color="#278c73" size={28} />
  </Pressable>;
  return <View ref={root} style={[styles.root, landscape ? styles.landscape : null]} onLayout={event => setSize(event.nativeEvent.layout)}>
    <View style={[styles.importance, landscape ? styles.importancePhoneLandscape : null, wideSlots && !landscape ? styles.importanceWide : null]}>
      <View style={[landscape ? styles.constructionToolbar : null,
        result === 'correct' && wideSlots && !landscape && !translated ? styles.successReplaySpace : null]}>
      {landscape && result !== 'correct' ? <Pressable accessibilityRole="button" accessibilityLabel={result === 'wrong' ? 'Reintentar' : 'Deshacer último movimiento'}
        disabled={result !== 'wrong' && (locked || !history.current.length)} style={styles.control}
        onPress={() => { if (result === 'wrong') { history.current = []; cancel(); stopFlight(); onRetry(); }
          else { const previous = history.current.pop(); if (previous && !locked) { stopFlight(); onChange(previous); } } }}>
        <Text maxFontSizeMultiplier={1.3} style={styles.controlText}>{result === 'wrong' ? 'Reintentar' : 'Deshacer'}</Text>
      </Pressable> : null}
      {result !== 'correct' || translated ? <Pressable accessibilityRole="button" accessibilityLabel="Mostrar traducción"
        style={{ minHeight: 48, justifyContent: 'center', flex: landscape ? 1 : undefined, paddingRight: wideSlots && !landscape ? 48 : 0 }} onPress={() => setTranslated(!translated)}>
        <Text maxFontSizeMultiplier={landscape ? 1.3 : undefined} style={styles.instruction}>{translated ? card.spanish_translation : 'Escucha y forma la frase.'}</Text>
      </Pressable> : null}
      {landscape ? replayControl : null}
      </View>
      <SlotsContainer ref={view => { slotPane.current = view; }}
        style={landscape ? styles.slots : styles.slotScroll} accessibilityLabel={result === 'correct' ? 'Frase completada' : 'Frase en construcción'}
        {...(!landscape ? { contentContainerStyle: styles.slots, persistentScrollbar: true, scrollEnabled: !moving } : {})}>
        {parts.map((part, index) => 'text' in part ? <Text key={`text-${index}`} maxFontSizeMultiplier={landscape ? 1.3 : undefined} style={[styles.scaffold, { fontSize: layout.textSize }]}>{part.text}</Text> :
          <WordTile key={`slot-${part.slot}`} {...common} slot={part.slot} suffix={part.suffix}
            id={slots[part.slot] || ''} label={card.options.find(option => option.id === slots[part.slot])?.label || ''}
            register={view => { slotsRef.current[part.slot] = view; }} active={hover === part.slot}
            hidden={moving?.id === slots[part.slot] || flight?.slot === part.slot} correct={result === 'correct'}
            onTranslate={result === 'correct' ? () => setTranslated(value => !value) : undefined} />)}
      </SlotsContainer>
      {!landscape ? replayControl : null}
    </View>
    <CardContainer ref={view => { cardPane.current = view; }} style={[styles.card, !compact ? styles.cardContent : null]}
      {...(compact ? { contentContainerStyle: styles.cardContent, persistentScrollbar: true, scrollEnabled: !moving } : {})}>
      {!landscape ? <LessonMediaFrame maxHeight={Math.max(112, layout.imageHeight)}>
        <OptionMediaImage imageUrl={card.prompt_image_url} accessibilityLabel="Imagen de la frase" />
      </LessonMediaFrame> : null}
      {result === 'correct' ? <ConstructionCelebration lift={celebrationLift} compact={landscape} /> : <>
      {!landscape && result !== 'wrong' ? <Text style={styles.hint}>{showHelp ? lessonHelpText(card, 'translation-on-tap') : 'Toca o arrastra. Devuelve aquí las palabras para corregir.'}</Text> : null}
      {(words.length > 0 || result !== 'wrong') ? <View ref={bank} collapsable={false} style={[styles.bank, hover === 'bank' ? styles.target : null]} accessibilityLabel="Palabras disponibles">
        {words.map(option => <WordTile key={option.id} {...common} id={option.id} label={option.label || ''}
          register={() => {}} active={false} hidden={moving?.id === option.id} correct={false} />)}
        {!words.length ? <Text style={styles.hint}>Devuelve aquí una palabra para corregir.</Text> : null}
      </View> : null}
      {!landscape && result !== 'wrong' ? <View style={styles.controls}>
        <Pressable style={styles.control} disabled={locked || !history.current.length} accessibilityRole="button" accessibilityLabel="Deshacer último movimiento"
          onPress={() => { const previous = history.current.pop(); if (previous && !locked) { stopFlight(); onChange(previous); } }}><Text style={styles.controlText}>Deshacer</Text></Pressable>
      </View> : null}
      <Text maxFontSizeMultiplier={landscape ? 1.3 : undefined} accessibilityLiveRegion="polite"
        adjustsFontSizeToFit={landscape} minimumFontScale={landscape ? 1 / Math.min(viewport.fontScale, 1.3) : undefined}
        numberOfLines={landscape ? 12 : undefined} style={[styles.feedback, landscape ? styles.feedbackPhoneLandscape : null]}
        accessibilityLabel={result === 'wrong' ? `Respuesta incorrecta. ${mistakeHint}` : undefined}
        onLayout={event => setFeedbackHeight(Math.ceil(event.nativeEvent.layout.height))}>
        {result === 'wrong' ? <><Text style={styles.wrongIcon}>× </Text>{mistakeHint}</> : ' '}
      </Text>
      {!landscape && result === 'wrong' ? <Pressable accessibilityRole="button" accessibilityLabel="Reintentar"
        style={[styles.control, styles.retryControl]} onPress={() => { history.current = []; cancel(); stopFlight(); onRetry(); }}>
        <Text style={[styles.controlText, styles.retryControlText]}>Reintentar</Text>
      </Pressable> : null}
      </>}
    </CardContainer>
    {moving ? <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
      style={[styles.lifted, { width: wordWidths[moving.id] || layout.tileWidth, minHeight: layout.tileHeight, transform: position.getTranslateTransform() }]}><Text numberOfLines={1} style={[styles.word, { fontSize: layout.textSize }]}>{moving.label}</Text></Animated.View> : null}
    {flight ? <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none"
      style={[styles.flight, { height: flight.path.height, left: flight.path.left, top: flight.path.top, width: flight.path.width,
        transform: [
          { translateX: flightValue.interpolate({ inputRange: [0, 1], outputRange: [flight.path.translateX, 0] }) },
          { translateY: flightValue.interpolate({ inputRange: [0, 1], outputRange: [flight.path.translateY, 0] }) },
          { scaleX: flightValue.interpolate({ inputRange: [0, 1], outputRange: [flight.path.scaleX, 1] }) },
          { scaleY: flightValue.interpolate({ inputRange: [0, 1], outputRange: [flight.path.scaleY, 1] }) },
        ] }]}><Text numberOfLines={1} style={[styles.word, { fontSize: layout.textSize }]}>{flight.label}</Text></Animated.View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, gap: 6, width: '100%' },
  landscape: { flexDirection: 'column' },
  importancePhoneLandscape: { maxHeight: '100%', flexShrink: 0, padding: 6 },
  constructionToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  successReplaySpace: { height: 48 },
  replayPhoneLandscape: { position: 'relative', top: 0, right: 0 },
  importanceLandscape: { width: '48%', maxHeight: '100%', paddingRight: 40 },
  importanceWide: { paddingRight: 8 },
  slotScroll: { flexGrow: 0, flexShrink: 1 },
  importance: { flexShrink: 1, maxHeight: '50%', paddingVertical: 8, paddingLeft: 8, paddingRight: 48, borderRadius: 24, borderWidth: 2, borderColor: '#e9d6b8', backgroundColor: '#fcf9f3' },
  instruction: { fontSize: 14, textAlign: 'center', fontWeight: '700', color: '#67583f', marginBottom: 6 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center' },
  slot: { flexShrink: 0, borderBottomWidth: 2, borderColor: '#b5a389', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 8 },
  scaffold: { color: '#26343b', fontWeight: '800' },
  arriving: { opacity: 0 },
  flight: { position: 'absolute', alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  lifted: { position: 'absolute', left: 0, top: 0, zIndex: 40, backgroundColor: '#f3effc', borderWidth: 2, borderColor: '#6947ad', borderRadius: 15, minHeight: 48, padding: 8, justifyContent: 'center' },
  target: { backgroundColor: '#e3f3ef', borderColor: '#278c73' },
  correct: { backgroundColor: '#dbf3db', borderColor: '#279487' },
  replay: { position: 'absolute', right: 0, top: '35%', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  replayAbove: { top: 8 },
  cardContent: { gap: 6, padding: 10 },
  card: { flex: 1, minHeight: 0, borderRadius: 24, borderWidth: 2, borderColor: '#eadfce', backgroundColor: '#fffdfa' },
  hint: { color: '#67583f', fontSize: 14, textAlign: 'center' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 4, minHeight: 56, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cfc2ab', borderRadius: 14 },
  wordTile: { flexShrink: 0 },
  tilePhoneLandscape: { paddingHorizontal: 4 },
  tile: { borderRadius: 15, borderWidth: 2, borderColor: '#b9a8df', backgroundColor: '#f3effc', padding: 8, alignItems: 'center', justifyContent: 'center' },
  word: { flexShrink: 0, fontWeight: '800', color: '#6947ad', textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexShrink: 0 },
  control: { minHeight: 48, minWidth: 80, padding: 10, justifyContent: 'center' },
  controlText: { color: '#2f6f9f', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  retryControl: { alignSelf: 'center', backgroundColor: '#278c73', borderRadius: 14, paddingHorizontal: 24 },
  retryControlText: { color: '#fff' },
  feedbackPhoneLandscape: { flex: 1, minHeight: 0, textAlignVertical: 'center' },
  feedback: { flexShrink: 0, fontSize: 16, color: '#665134', textAlign: 'center', minHeight: 24 },
  wrongIcon: { color: '#c95e55', fontSize: 22, fontWeight: '900' },
});
