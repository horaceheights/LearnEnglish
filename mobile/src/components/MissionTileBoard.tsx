import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  emptyMissionTileSlots,
  isGuidedNoFailMissionCard,
  missionTileBoardCanCheck,
  missionTileSlotWidthForCard,
  moveMissionTileForCard,
  orderedMissionCorrectIds,
  placeMissionTileForCard,
  removeMissionTileForCard,
  type MissionTileSlots,
} from '../missionTileState';
import type { LessonCard } from '../types';

type WindowBounds = { height: number; width: number; x: number; y: number };
export type MissionTileEdit = 'move' | 'place' | 'remove' | 'reset' | 'undo';

type Props = {
  card: LessonCard;
  disabled: boolean;
  onChange: (slots: MissionTileSlots, edit: MissionTileEdit) => void;
  onCheck: () => void;
  onDragStateChange?: (dragging: boolean) => void;
  result: 'correct' | 'wrong' | null;
  slots: MissionTileSlots;
};

function boundsContain(bounds: WindowBounds, x: number, y: number) {
  return x >= bounds.x
    && x <= bounds.x + bounds.width
    && y >= bounds.y
    && y <= bounds.y + bounds.height;
}

function measureView(view: View | null): Promise<WindowBounds | null> {
  return new Promise((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }
    view.measureInWindow((x, y, width, height) => resolve({ height, width, x, y }));
  });
}

function sameSlots(left: MissionTileSlots, right: MissionTileSlots) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function DraggableTile({
  disabled,
  contextLabel,
  label,
  onDrop,
  onDraggingChange,
  onMove,
  onPress,
  sourceIndex,
}: {
  disabled: boolean;
  contextLabel?: string;
  label: string;
  onDrop: (pageX: number, pageY: number, sourceIndex: number | null) => void;
  onDraggingChange: (active: boolean, sourceIndex: number | null) => void;
  onMove?: (offset: -1 | 1) => void;
  onPress: () => void;
  sourceIndex: number | null;
}) {
  const drag = useRef(new Animated.ValueXY()).current;
  const tileRef = useRef<View | null>(null);
  const originRef = useRef<WindowBounds | null>(null);
  const [dragging, setDragging] = useState(false);
  const { fontScale, height, width } = useWindowDimensions();
  const isTabletViewport = Math.min(width, height) >= 540;
  const useSingleColumn = width <= 360 || fontScale > 1.15;
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const returnTile = useCallback(() => {
    setDragging(false);
    onDraggingChange(false, sourceIndex);
    if (reduceMotion) {
      drag.setValue({ x: 0, y: 0 });
      return;
    }
    Animated.spring(drag, {
      damping: 18,
      stiffness: 230,
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  }, [drag, onDraggingChange, reduceMotion, sourceIndex]);

  useEffect(() => {
    drag.stopAnimation();
    drag.setValue({ x: 0, y: 0 });
    setDragging(false);
    onDraggingChange(false, sourceIndex);
  }, [drag, height, onDraggingChange, sourceIndex, width]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => (
      !disabled && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5)
    ),
    onPanResponderGrant: () => {
      setDragging(true);
      originRef.current = null;
      onDraggingChange(true, sourceIndex);
      tileRef.current?.measureInWindow((x, y, tileWidth, tileHeight) => {
        originRef.current = { height: tileHeight, width: tileWidth, x, y };
      });
    },
    onPanResponderMove: (_event, gesture) => {
      const origin = originRef.current;
      if (!origin) return;
      const leftEdge = Math.max(8, insets.left + 8);
      const rightEdge = width - Math.max(8, insets.right + 8);
      const topEdge = Math.max(8, insets.top + 8);
      const bottomEdge = height - Math.max(8, insets.bottom + 8);
      drag.setValue({
        x: Math.max(leftEdge - origin.x, Math.min(gesture.dx, rightEdge - origin.x - origin.width)),
        y: Math.max(topEdge - origin.y, Math.min(gesture.dy, bottomEdge - origin.y - origin.height)),
      });
    },
    onPanResponderRelease: (event) => {
      onDrop(event.nativeEvent.pageX, event.nativeEvent.pageY, sourceIndex);
      returnTile();
    },
    onPanResponderTerminate: returnTile,
    onPanResponderTerminationRequest: () => false,
  }), [
    disabled,
    drag,
    height,
    insets.bottom,
    insets.left,
    insets.right,
    insets.top,
    onDraggingChange,
    onDrop,
    returnTile,
    sourceIndex,
    width,
  ]);

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.tileMotion,
        useSingleColumn ? styles.tileMotionLargeText : null,
        dragging ? styles.tileDragging : null,
        { transform: drag.getTranslateTransform() },
      ]}
    >
      <Pressable
        accessibilityHint={sourceIndex === null
          ? 'Toca para colocarla o arrástrala a un espacio.'
          : 'Toca para quitarla, o arrástrala para moverla o devolverla.'}
        accessibilityLabel={`${contextLabel ? `${contextLabel}: ` : ''}Ficha ${label}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityActions={sourceIndex === null ? undefined : [
          { label: 'Mover al lugar anterior', name: 'decrement' },
          { label: 'Mover al lugar siguiente', name: 'increment' },
        ]}
        disabled={disabled}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'decrement') onMove?.(-1);
          if (nativeEvent.actionName === 'increment') onMove?.(1);
        }}
        onPress={onPress}
        ref={tileRef}
        style={({ pressed }) => [
          styles.tile,
          sourceIndex === null ? styles.bankTile : styles.placedTile,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text
          android_hyphenationFrequency="none"
          style={[styles.tileText, isTabletViewport ? styles.tileTextTablet : null]}
          textBreakStrategy="simple"
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function MissionTileBoard({
  card,
  disabled,
  onChange,
  onCheck,
  onDragStateChange,
  result,
  slots,
}: Props) {
  const { fontScale, height, width } = useWindowDimensions();
  const guidedNoFail = isGuidedNoFailMissionCard(card);
  const slotCount = orderedMissionCorrectIds(card).length;
  const effectiveSlots = useMemo(
    () => slots.length === slotCount ? slots : emptyMissionTileSlots(slotCount),
    [slotCount, slots],
  );
  const [activeSlotIndex, setActiveSlotIndex] = useState(() => (
    Math.max(0, effectiveSlots.findIndex((value) => !value))
  ));
  const [history, setHistory] = useState<MissionTileSlots[]>([]);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null | undefined>(undefined);
  const slotRefs = useRef<Array<View | null>>([]);
  const bankRef = useRef<View | null>(null);
  const optionById = useMemo(
    () => new Map(card.options.map((option) => [option.id, option])),
    [card.options],
  );
  const selected = useMemo(
    () => new Set(effectiveSlots.filter((value): value is string => Boolean(value))),
    [effectiveSlots],
  );
  const availableOptions = useMemo(
    () => card.options.filter((option) => !selected.has(option.id)),
    [card.options, selected],
  );
  const canCheck = missionTileBoardCanCheck(card, effectiveSlots);
  const isTabletViewport = Math.min(width, height) >= 540;
  const useSingleColumn = width <= 360 || fontScale > 1.15;
  const slotWidth = missionTileSlotWidthForCard(card, width, fontScale);

  useEffect(() => {
    setHistory([]);
    setActiveSlotIndex(Math.max(0, effectiveSlots.findIndex((value) => !value)));
  // The screen normally remounts per card; this protects direct QA card changes too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.slide_id]);

  const onTileDraggingChange = useCallback((active: boolean, sourceIndex: number | null) => {
    setDragSourceIndex(active ? sourceIndex : undefined);
    onDragStateChange?.(active);
  }, [onDragStateChange]);

  const commit = useCallback((next: MissionTileSlots, edit: MissionTileEdit) => {
    if (disabled || sameSlots(next, effectiveSlots)) return;
    setHistory((current) => [...current.slice(-19), [...effectiveSlots]]);
    const firstEmpty = next.findIndex((value) => !value);
    if (firstEmpty >= 0) setActiveSlotIndex(firstEmpty);
    onChange(next, edit);
  }, [disabled, effectiveSlots, onChange]);

  const placeFromBank = useCallback((optionId: string, targetIndex = activeSlotIndex) => {
    commit(placeMissionTileForCard(card, effectiveSlots, optionId, targetIndex), 'place');
  }, [activeSlotIndex, card, commit, effectiveSlots]);

  const removeFromSlot = useCallback((index: number) => {
    commit(removeMissionTileForCard(card, effectiveSlots, index), 'remove');
  }, [card, commit, effectiveSlots]);

  const handleDrop = useCallback(async (
    pageX: number,
    pageY: number,
    sourceIndex: number | null,
    bankOptionId?: string,
  ) => {
    const [bankBounds, ...slotBounds] = await Promise.all([
      measureView(bankRef.current),
      ...effectiveSlots.map((_slot, index) => measureView(slotRefs.current[index] || null)),
    ]);
    const targetIndex = slotBounds.findIndex((bounds) => Boolean(bounds && boundsContain(bounds, pageX, pageY)));
    if (targetIndex >= 0) {
      if (sourceIndex === null && bankOptionId) placeFromBank(bankOptionId, targetIndex);
      else if (sourceIndex !== null) commit(
        moveMissionTileForCard(card, effectiveSlots, sourceIndex, targetIndex),
        'move',
      );
      return;
    }
    if (sourceIndex !== null && bankBounds && boundsContain(bankBounds, pageX, pageY)) {
      removeFromSlot(sourceIndex);
    }
  }, [card, commit, effectiveSlots, placeFromBank, removeFromSlot]);

  const undo = useCallback(() => {
    if (disabled || history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setActiveSlotIndex(Math.max(0, previous.findIndex((value) => !value)));
    onChange(previous, 'undo');
  }, [disabled, history, onChange]);

  const reset = useCallback(() => {
    commit(emptyMissionTileSlots(slotCount), 'reset');
    setActiveSlotIndex(0);
  }, [commit, slotCount]);

  return (
    <View style={[styles.board, height < 700 ? styles.boardCompact : null]}>
      <Text style={[styles.detail, isTabletViewport ? styles.detailTablet : null]}>
        {guidedNoFail
          ? 'Toca las sílabas en orden. Cada ficha avanza solo cuando corresponde.'
          : card.mission_targets?.length
          ? 'Toca un lugar y después una ficha. También puedes arrastrar.'
          : 'Toca una ficha para colocarla. Toca una colocada para quitarla.'}
      </Text>
      <View
        accessibilityLabel={`Respuesta: ${effectiveSlots.map((id) => id ? optionById.get(id)?.label || id : 'vacío').join(', ')}`}
        accessibilityLiveRegion="polite"
        style={[
          styles.answerArea,
          result === 'correct' ? styles.answerAreaCorrect : null,
          result === 'wrong' ? styles.answerAreaWrong : null,
        ]}
      >
        {effectiveSlots.map((optionId, index) => {
          const target = card.mission_targets?.[index];
          const option = optionId ? optionById.get(optionId) : null;
          return (
            <Pressable
              accessible={!option}
              accessibilityHint={option
                ? 'Toca la ficha para quitarla.'
                : 'Selecciona este lugar y después toca una ficha disponible.'}
              accessibilityLabel={`${target?.label || `Lugar ${index + 1}`}: ${option?.label || 'vacío'}`}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: activeSlotIndex === index }}
              disabled={disabled}
              key={target?.id || `slot-${index}`}
              onPress={option ? undefined : () => {
                if (!guidedNoFail || index === effectiveSlots.findIndex((value) => !value)) {
                  setActiveSlotIndex(index);
                }
              }}
              ref={(view) => { slotRefs.current[index] = view; }}
              style={[
                styles.slot,
                { width: slotWidth },
                activeSlotIndex === index ? styles.slotActive : null,
                target ? styles.targetSlot : null,
              ]}
            >
              {target ? (
                <Text style={[styles.targetLabel, isTabletViewport ? styles.targetLabelTablet : null]}>
                  {target.label}
                </Text>
              ) : null}
              {option ? (
                <DraggableTile
                  contextLabel={target?.label || `Lugar ${index + 1}`}
                  disabled={disabled}
                  label={option.label || option.id}
                  onDraggingChange={onTileDraggingChange}
                  onDrop={(pageX, pageY, source) => void handleDrop(pageX, pageY, source)}
                  onMove={(offset) => commit(
                    moveMissionTileForCard(card, effectiveSlots, index, index + offset),
                    'move',
                  )}
                  onPress={() => removeFromSlot(index)}
                  sourceIndex={index}
                />
              ) : (
                <View pointerEvents="none" style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>＋</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View
        accessibilityLabel="Fichas disponibles"
        ref={bankRef}
        style={[
          styles.bank,
          dragSourceIndex !== undefined && dragSourceIndex !== null ? styles.bankRemoveTarget : null,
        ]}
      >
        {availableOptions.length ? availableOptions.map((option) => (
          <DraggableTile
            disabled={disabled}
            key={option.id}
            label={option.label || option.id}
            onDraggingChange={onTileDraggingChange}
            onDrop={(pageX, pageY, source) => void handleDrop(pageX, pageY, source, option.id)}
            onPress={() => placeFromBank(option.id)}
            sourceIndex={null}
          />
        )) : (
          <Text style={styles.bankEmptyText}>
            {dragSourceIndex !== undefined && dragSourceIndex !== null
              ? 'Suelta aquí para quitar la ficha'
              : 'Todas las fichas están colocadas'}
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Deshacer último cambio"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || history.length === 0 }}
          disabled={disabled || history.length === 0}
          onPress={undo}
          style={({ pressed }) => [styles.secondaryButton, disabled || history.length === 0 ? styles.disabled : null, pressed ? styles.pressed : null]}
        >
          <Ionicons color="#6d4a1f" name="arrow-undo" size={17} />
          <Text style={styles.secondaryButtonText}>Deshacer</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Reiniciar respuesta"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || !effectiveSlots.some(Boolean) }}
          disabled={disabled || !effectiveSlots.some(Boolean)}
          onPress={reset}
          style={({ pressed }) => [styles.secondaryButton, disabled || !effectiveSlots.some(Boolean) ? styles.disabled : null, pressed ? styles.pressed : null]}
        >
          <Ionicons color="#6d4a1f" name="refresh" size={17} />
          <Text style={styles.secondaryButtonText}>Reiniciar</Text>
        </Pressable>
        <Pressable
          accessibilityHint={canCheck ? 'Revisa tu respuesta.' : 'Coloca una ficha en cada lugar primero.'}
          accessibilityLabel="Comprobar respuesta"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || !canCheck }}
          disabled={disabled || !canCheck}
          onPress={onCheck}
          style={({ pressed }) => [styles.checkButton, disabled || !canCheck ? styles.disabled : null, pressed ? styles.pressed : null]}
        >
          <Text style={styles.checkButtonText}>Comprobar</Text>
          <Ionicons color="#fff" name="checkmark-circle" size={19} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { alignItems: 'center', alignSelf: 'center', marginTop: 4, maxWidth: 720, width: '100%' },
  boardCompact: { marginTop: 1 },
  detail: { color: '#5f625f', fontSize: 14, fontWeight: '700', lineHeight: 19, marginTop: 2, textAlign: 'center' },
  detailTablet: { fontSize: 18, lineHeight: 24 },
  answerArea: {
    alignItems: 'stretch', backgroundColor: '#fff9e9', borderColor: '#d6b65a', borderRadius: 16,
    borderStyle: 'dashed', borderWidth: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 7,
    justifyContent: 'center', marginTop: 7, minHeight: 64, padding: 7, width: '100%',
  },
  answerAreaCorrect: { backgroundColor: '#eaf6ee', borderColor: '#3c996c', borderStyle: 'solid' },
  answerAreaWrong: { backgroundColor: '#fbeceb', borderColor: '#c95e55', borderStyle: 'solid' },
  slot: {
    alignItems: 'stretch', backgroundColor: '#fff', borderColor: '#cbb98f', borderRadius: 11,
    borderWidth: 1, justifyContent: 'center', minHeight: 58, minWidth: 0, padding: 4,
  },
  targetSlot: { minHeight: 76 },
  slotActive: { borderColor: '#e76f43', borderWidth: 3, padding: 2 },
  targetLabel: { color: '#765729', fontSize: 16, fontWeight: '900', lineHeight: 21, marginBottom: 3, textAlign: 'center' },
  targetLabelTablet: { fontSize: 22, lineHeight: 28 },
  emptySlot: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 48 },
  emptySlotText: { color: '#af9c72', fontSize: 27, fontWeight: '500', lineHeight: 30 },
  bank: {
    alignItems: 'center', backgroundColor: '#eef7f4', borderColor: '#b8d7cf', borderRadius: 15,
    borderWidth: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center',
    marginTop: 8, minHeight: 61, padding: 6, width: '100%',
  },
  bankRemoveTarget: { backgroundColor: '#fff0eb', borderColor: '#e18a6c', borderStyle: 'dashed' },
  bankEmptyText: { color: '#50736b', fontSize: 12, fontWeight: '800', paddingVertical: 12, textAlign: 'center' },
  tileMotion: { flexGrow: 1, maxWidth: 210, minWidth: 74 },
  tileMotionLargeText: { maxWidth: '100%', minWidth: '100%' },
  tileDragging: { elevation: 14, zIndex: 40 },
  tile: {
    alignItems: 'center', borderBottomWidth: 4, borderRadius: 11, justifyContent: 'center',
    minHeight: 48, minWidth: 0, paddingHorizontal: 6, paddingVertical: 4, width: '100%',
  },
  bankTile: { backgroundColor: '#fff', borderColor: '#75aa9e' },
  placedTile: { backgroundColor: '#fff6d8', borderColor: '#c49a3f' },
  pressed: { opacity: 0.76, transform: [{ translateY: 2 }] },
  tileText: { color: '#185e53', fontSize: 16, fontWeight: '900', lineHeight: 21, textAlign: 'center' },
  tileTextTablet: { fontSize: 22, lineHeight: 28 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 8, width: '100%' },
  secondaryButton: {
    alignItems: 'center', backgroundColor: '#f5eee2', borderColor: '#c8a875', borderRadius: 12,
    borderWidth: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 48,
    minWidth: 104, paddingHorizontal: 11,
  },
  secondaryButtonText: { color: '#6d4a1f', fontSize: 13, fontWeight: '900' },
  checkButton: {
    alignItems: 'center', backgroundColor: '#287f68', borderColor: '#176b5d', borderRadius: 12,
    borderWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 48,
    minWidth: 128, paddingHorizontal: 14,
  },
  checkButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.4 },
});
