import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChoiceOption, LessonCard } from '../types';
import { placeSentenceWord, sentenceHint, sentenceLayout, sentenceSlots } from '../sentenceConstruction';
import { LessonMediaFrame } from './LessonMediaFrame';
import { OptionMediaImage } from './OptionMediaImage';

type Bounds = { x: number; y: number; width: number; height: number };
type Props = {
  card: LessonCard;
  selected: string[];
  result: 'correct' | 'wrong' | null;
  disabled: boolean;
  showHelp?: boolean;
  onChange: (ids: string[]) => void;
  onReplay: () => void;
};

function WordTile({ option, disabled, width, height, textSize, onPlace, measureTargets, viewportKey, allowDrag } : {
  option: ChoiceOption; disabled: boolean; width: number; height: number; textSize: number;
  onPlace: (id: string, slot?: number) => void;
  measureTargets: (callback: (slots: Bounds[], area: Bounds | null) => void) => void;
  viewportKey: string; allowDrag: boolean;
}) {
  const offset = useRef(new Animated.ValueXY()).current;
  const tile = useRef<View>(null);
  const origin = useRef<Bounds | null>(null);
  const area = useRef<Bounds | null>(null);
  const targets = useRef<Bounds[]>([]);
  const dragged = useRef(false);
  const [moving, setMoving] = useState(false);
  const cancel = () => { offset.setValue({ x: 0, y: 0 }); setMoving(false); origin.current = null; };
  useEffect(() => { cancel(); }, [viewportKey, disabled]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => allowDrag && !disabled && Math.hypot(gesture.dx, gesture.dy) > 6,
    onPanResponderGrant: () => {
      dragged.current = true;
      setMoving(true);
      measureTargets((slots, bounds) => { targets.current = slots; area.current = bounds; });
      tile.current?.measureInWindow((x, y, w, h) => { origin.current = { x, y, width: w, height: h }; });
    },
    onPanResponderMove: (_, gesture) => {
      const o = origin.current; const a = area.current;
      if (!o || !a) return;
      offset.setValue({
        x: Math.max(a.x - o.x, Math.min(gesture.dx, a.x + a.width - o.x - o.width)),
        y: Math.max(a.y - o.y, Math.min(gesture.dy, a.y + a.height - o.y - o.height)),
      });
    },
    onPanResponderRelease: (event) => {
      if (origin.current) {
        const { pageX: x, pageY: y } = event.nativeEvent;
        const slot = targets.current.findIndex((b) => b && x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height);
        if (slot >= 0) onPlace(option.id, slot);
      }
      cancel();
    },
    onPanResponderTerminate: cancel,
    onPanResponderTerminationRequest: () => true,
  }), [allowDrag, disabled, measureTargets, onPlace, option.id, offset, viewportKey]);
  return <Animated.View {...pan.panHandlers} style={{ width, zIndex: moving ? 20 : 0, transform: offset.getTranslateTransform() }}>
    <Pressable ref={tile} disabled={disabled} accessibilityRole="button"
      accessibilityLabel={`Ficha ${option.label}`}
      accessibilityHint={allowDrag ? 'Toca para colocar en el siguiente espacio, o arrastra a un espacio vacío.' : 'Toca para colocar en el siguiente espacio.'}
      accessibilityState={{ disabled }}
      onPressIn={() => { dragged.current = false; }}
      onPress={() => { if (!dragged.current) onPlace(option.id); }}
      style={[styles.tile, { minHeight: height }, disabled ? styles.used : null]}>
      <Text style={[styles.word, { fontSize: textSize }]}>{option.label}</Text>
    </Pressable>
  </Animated.View>;
}

export function SentenceConstruction({ card, selected, result, disabled, showHelp, onChange, onReplay }: Props) {
  const viewport = useWindowDimensions();
  const [translated, setTranslated] = useState(false);
  const [size, setSize] = useState({ width: viewport.width - 12, height: viewport.height - 240 });
  const root = useRef<View>(null);
  const slotsRef = useRef<Array<View | null>>([]);
  const history = useRef<string[]>([]);
  const slots = sentenceSlots(card, selected);
  const landscape = viewport.width > viewport.height && viewport.height < 600;
  const layout = sentenceLayout(landscape ? size.width * 0.48 : size.width - 40, size.height, viewport.fontScale, slots.length);
  const locked = disabled || result === 'correct';
  const punctuation = card.prompt.split('___').slice(1);
  const place = (id: string, index?: number) => {
    if (locked) return;
    const next = placeSentenceWord(card, slots, id, index);
    if (!next.some((value, i) => value !== slots[i])) return;
    history.current.push(id);
    onChange(next);
  };
  const remove = (index: number) => {
    if (locked) return;
    history.current = history.current.filter((id) => id !== slots[index]);
    onChange(slots.map((id, i) => i === index ? '' : id));
  };
  const measureTargets = (callback: (bounds: Bounds[], area: Bounds | null) => void) => {
    root.current?.measureInWindow((x, y, width, height) => {
      const bounds: Bounds[] = [];
      let pending = slots.length;
      slotsRef.current.forEach((view, index) => {
        if (!view) { if (--pending === 0) callback(bounds, { x, y, width, height }); return; }
        view.measureInWindow((sx, sy, sw, sh) => {
          bounds[index] = { x: sx, y: sy, width: sw, height: sh };
          if (--pending === 0) callback(bounds, { x, y, width, height });
        });
      });
    });
  };
  const compact = layout.scrollBank || landscape;
  const CardContainer = compact ? ScrollView : View;
  return <View ref={root} style={[styles.root, landscape ? styles.landscape : null]} onLayout={(event) => setSize(event.nativeEvent.layout)}>
    <View style={[styles.importance, landscape ? styles.importanceLandscape : null]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mostrar traducción"
        style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => setTranslated(!translated)}>
        <Text style={styles.instruction}>{translated ? card.spanish_translation : 'Escucha y forma la frase.'}</Text>
      </Pressable>
      <ScrollView style={styles.slotScroll} contentContainerStyle={styles.slots} accessibilityLabel="Frase en construcción" persistentScrollbar>
        {slots.map((id, index) => <Pressable key={index} ref={(view) => { slotsRef.current[index] = view; }}
          disabled={locked || !id} accessibilityRole="button"
          accessibilityLabel={`Espacio ${index + 1}: ${card.options.find((option) => option.id === id)?.label || 'vacío'}`}
          accessibilityHint={id ? 'Toca para devolver esta palabra.' : 'Arrastra una palabra aquí o toca una ficha.'}
          onPress={() => remove(index)}
          style={[styles.slot, { minWidth: layout.tileWidth, minHeight: layout.tileHeight },
            result === 'correct' ? styles.correct : null]}>
          <Text style={[styles.word, { fontSize: layout.textSize }]}>
            {card.options.find((option) => option.id === id)?.label || '___'}{punctuation[index]?.trim()}
          </Text>
        </Pressable>)}
      </ScrollView>
      <Pressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="Repetir frase en inglés" style={styles.replay}>
        <Ionicons name="volume-high" color="#278c73" size={28} />
      </Pressable>
    </View>
    <CardContainer style={[styles.card, !compact ? styles.cardContent : null]}
      {...(compact ? { contentContainerStyle: styles.cardContent, persistentScrollbar: true } : {})}>
      <LessonMediaFrame maxHeight={Math.max(112, layout.imageHeight)}>
        <OptionMediaImage imageUrl={card.prompt_image_url} accessibilityLabel="Persona de la frase" />
      </LessonMediaFrame>
      <Text style={styles.hint}>{showHelp ? 'Escucha con el altavoz. Toca las fichas en orden; toca una palabra colocada para devolverla. Toca la instrucción para traducir.' : compact ? 'Toca cada palabra arriba.' : 'Toca o arrastra cada palabra arriba.'}</Text>
      <View style={styles.bank}>
        {card.options.map((option) => <WordTile key={option.id} option={option}
          disabled={locked || slots.includes(option.id)} width={layout.tileWidth} height={layout.tileHeight}
          textSize={layout.textSize} allowDrag={!compact} onPlace={place} measureTargets={measureTargets}
          viewportKey={`${viewport.width}:${viewport.height}:${viewport.fontScale}:${size.width}:${size.height}`} />)}
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.control} disabled={locked || !slots.some(Boolean)}
          accessibilityRole="button" accessibilityLabel="Deshacer última palabra"
          onPress={() => remove(slots.indexOf(history.current.filter((id) => slots.includes(id)).at(-1) || ''))}><Text style={styles.controlText}>Deshacer</Text></Pressable>
        <Pressable style={styles.control} disabled={locked || !slots.some(Boolean)}
          accessibilityRole="button" onPress={() => onChange(slots.map(() => ''))}>
          <Text style={styles.controlText}>Reiniciar</Text></Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.feedback}>
        {result === 'correct' ? '¡Muy bien!' : result === 'wrong' ? sentenceHint(card, slots) : ' '}
      </Text>
    </CardContainer>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, gap: 6, width: '100%' },
  landscape: { flexDirection: 'row' },
  importanceLandscape: { width: '48%', maxHeight: '100%', paddingRight: 40 },
  slotScroll: { flexGrow: 0, flexShrink: 1 },
  importance: { flexShrink: 1, maxHeight: '50%', paddingVertical: 8, paddingLeft: 8, paddingRight: 48, borderRadius: 24, borderWidth: 2, borderColor: '#e9d6b8', backgroundColor: '#fcf9f3' },
  instruction: { fontSize: 14, textAlign: 'center', fontWeight: '700', color: '#67583f', marginBottom: 6 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  slot: { borderBottomWidth: 2, borderColor: '#b5a389', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 8 },
  correct: { backgroundColor: '#dbf3db', borderColor: '#279487' },
  replay: { position: 'absolute', right: 0, top: '35%', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  cardContent: { gap: 6, padding: 10 },
  card: { flex: 1, minHeight: 0, borderRadius: 24, borderWidth: 2, borderColor: '#eadfce', backgroundColor: '#fffdfa' },
  hint: { color: '#67583f', fontSize: 14, textAlign: 'center' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, padding: 2 },
  tile: { borderRadius: 15, borderWidth: 2, borderColor: '#b9a8df', backgroundColor: '#f3effc', padding: 8, alignItems: 'center', justifyContent: 'center' },
  used: { opacity: 0.3 },
  word: { fontWeight: '800', color: '#6947ad', textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexShrink: 0 },
  control: { minHeight: 48, minWidth: 80, padding: 10, justifyContent: 'center' },
  controlText: { color: '#2f6f9f', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  feedback: { flexShrink: 0, fontSize: 16, color: '#665134', textAlign: 'center', minHeight: 24 },
});
