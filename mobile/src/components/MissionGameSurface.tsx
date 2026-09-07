import { Ionicons } from '@expo/vector-icons';
import { Animated, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChoiceOption, LessonCard, MissionGame, MissionGameTarget } from '../types';
import { OptionMediaImage } from './OptionMediaImage';

type Placement = { optionId: string; targetId: string };
type Result = 'correct' | 'wrong' | null;

type Props = {
  card: LessonCard & { mission_game: MissionGame };
  interactionReady: boolean;
  onMisstep: (optionIds: string[]) => void;
  onReplayEnglish: () => void;
  onReplayInstruction: () => void;
  onSubmit: (optionIds: string[]) => void;
  result: Result;
};

type Bounds = { height: number; width: number; x: number; y: number };

const KIND_LABELS: Record<MissionGame['kind'], string> = {
  'action-sequence': 'SIGUE LA RUTA',
  finale: 'REUNIÓN FINAL',
  hotspot: 'BUSCA EN LA ESCENA',
  'label-placement': 'COLOCA LAS SEÑALES',
  'not-correction': 'REPARA LA PISTA',
  'relationship-link': 'CONECTA LA FAMILIA',
  speak: 'RETO DE VOZ',
  'who-dialogue': 'RESPONDE QUIÉN ES',
};

function expectedPlacements(game: MissionGame): Placement[] {
  return game.targets.flatMap((target) => target.accepted_option_ids.map((optionId) => ({
    optionId,
    targetId: target.id,
  })));
}

function samePlacement(left: Placement, right: Placement) {
  return left.optionId === right.optionId && left.targetId === right.targetId;
}

function validatePlacements(game: MissionGame, placements: Placement[]) {
  const expected = expectedPlacements(game);
  if (game.validation === 'ordered') {
    const prefix: Placement[] = [];
    for (let index = 0; index < Math.min(placements.length, expected.length); index += 1) {
      if (!samePlacement(placements[index], expected[index])) break;
      prefix.push(placements[index]);
    }
    return {
      complete: placements.length === expected.length && prefix.length === expected.length,
      retained: prefix,
      expected,
    };
  }
  const retained = placements.filter((placement) => expected.some((item) => samePlacement(item, placement)));
  return {
    complete: placements.length === expected.length && retained.length === expected.length,
    retained,
    expected,
  };
}

function percent(value: number): `${number}%` {
  return `${Math.round(value * 10000) / 100}%`;
}

function DraggableOption({ disabled, onDrop, onPress, option, placed }: {
  disabled: boolean;
  onDrop: (optionId: string, pageX: number, pageY: number) => void;
  onPress: (optionId: string) => void;
  option: ChoiceOption;
  placed: boolean;
}) {
  const drag = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const { height, width } = useWindowDimensions();
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => !disabled && !placed && (
      Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5
    ),
    onPanResponderGrant: () => setDragging(true),
    onPanResponderMove: (_event, gesture) => drag.setValue({
      x: Math.max(-width * 0.8, Math.min(width * 0.8, gesture.dx)),
      y: Math.max(-height * 0.65, Math.min(height * 0.65, gesture.dy)),
    }),
    onPanResponderRelease: (event) => {
      onDrop(option.id, event.nativeEvent.pageX, event.nativeEvent.pageY);
      setDragging(false);
      Animated.spring(drag, { damping: 18, stiffness: 220, toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      setDragging(false);
      Animated.spring(drag, { damping: 18, stiffness: 220, toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    },
    onPanResponderTerminationRequest: () => false,
  }), [disabled, drag, height, onDrop, option.id, placed, width]);

  return (
    <Animated.View {...panResponder.panHandlers} style={[styles.optionMotion, dragging ? styles.optionDragging : null, { transform: drag.getTranslateTransform() }]}>
      <Pressable
        accessibilityHint={placed ? 'Toca para retirar esta señal.' : 'Toca para seleccionarla o arrástrala hasta su destino.'}
        accessibilityLabel={option.label || option.id}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: placed }}
        disabled={disabled}
        onPress={() => onPress(option.id)}
        style={({ pressed }) => [styles.optionChip, placed ? styles.optionChipPlaced : null, pressed ? styles.pressed : null]}
      >
        <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2} style={styles.optionText}>
          {option.label || option.id}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function MissionGameSurface({
  card,
  interactionReady,
  onMisstep,
  onReplayEnglish,
  onReplayInstruction,
  onSubmit,
  result,
}: Props) {
  const game = card.mission_game;
  const imageRef = useRef<View | null>(null);
  const imageBounds = useRef<Bounds | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const expected = useMemo(() => expectedPlacements(game), [game]);
  const directScene = game.kind === 'hotspot' || game.kind === 'action-sequence';
  const directChoice = game.kind === 'not-correction' || game.kind === 'who-dialogue';
  const disabled = !interactionReady || result === 'correct';

  useEffect(() => {
    setPlacements([]);
    setSelectedOptionId(null);
    setMessage('');
  }, [card.slide_id]);

  const measureImage = useCallback(() => {
    imageRef.current?.measureInWindow((x, y, width, height) => {
      imageBounds.current = { height, width, x, y };
    });
  }, []);

  const placementForTarget = useCallback((targetId: string) => (
    placements.filter((placement) => placement.targetId === targetId)
  ), [placements]);

  const finishIfComplete = useCallback((next: Placement[]) => {
    const validation = validatePlacements(game, next);
    if (validation.complete) onSubmit(validation.expected.map((placement) => placement.optionId));
  }, [game, onSubmit]);

  const activateDirectTarget = useCallback((target: MissionGameTarget) => {
    if (disabled) return;
    const nextExpected = expected[placements.length];
    if (!nextExpected || nextExpected.targetId !== target.id) {
      setMessage('Ese no es el siguiente paso. Tus aciertos siguen guardados.');
      onMisstep([target.id]);
      return;
    }
    const next = [...placements, nextExpected];
    setPlacements(next);
    setMessage(next.length < expected.length ? `Bien. Ahora sigue el paso ${next.length + 1}.` : '');
    finishIfComplete(next);
  }, [disabled, expected, finishIfComplete, onMisstep, placements]);

  const placeOption = useCallback((optionId: string, targetId: string) => {
    if (disabled) return;
    const target = game.targets.find((candidate) => candidate.id === targetId);
    if (!target) return;
    setPlacements((current) => {
      const withoutOption = current.filter((placement) => placement.optionId !== optionId);
      const capacity = Math.max(1, target.accepted_option_ids.length);
      const atTarget = withoutOption.filter((placement) => placement.targetId === targetId);
      const withoutDisplaced = atTarget.length >= capacity
        ? withoutOption.filter((placement) => placement !== atTarget[atTarget.length - 1])
        : withoutOption;
      return [...withoutDisplaced, { optionId, targetId }];
    });
    setSelectedOptionId(null);
    setMessage('Señal colocada. Puedes moverla o comprobar.');
  }, [disabled, game.targets]);

  const targetAt = useCallback((optionId: string, pageX: number, pageY: number) => {
    const bounds = imageBounds.current;
    if (!bounds) return null;
    const x = (pageX - bounds.x) / bounds.width;
    const y = (pageY - bounds.y) / bounds.height;
    const matches = game.targets.filter((target) => (
      x >= target.rect.x && x <= target.rect.x + target.rect.width
      && y >= target.rect.y && y <= target.rect.y + target.rect.height
    ));
    return matches.find((target) => target.accepted_option_ids.includes(optionId))
      || matches.sort((left, right) => left.rect.width * left.rect.height - right.rect.width * right.rect.height)[0]
      || null;
  }, [game.targets]);

  const handleDrop = useCallback((optionId: string, pageX: number, pageY: number) => {
    const target = targetAt(optionId, pageX, pageY);
    if (!target) {
      setMessage('Suelta la señal dentro de una zona marcada.');
      return;
    }
    placeOption(optionId, target.id);
  }, [placeOption, targetAt]);

  const handleOptionPress = useCallback((optionId: string) => {
    if (disabled) return;
    const existing = placements.find((placement) => placement.optionId === optionId);
    if (existing) {
      setPlacements((current) => current.filter((placement) => placement.optionId !== optionId));
      setSelectedOptionId(null);
      setMessage('Señal retirada. Puedes colocarla de nuevo.');
      return;
    }
    if (directChoice) {
      setPlacements([{ optionId, targetId: game.targets[0]?.id || 'answer' }]);
      setSelectedOptionId(optionId);
      setMessage('Toca Comprobar para confirmar tu respuesta.');
      return;
    }
    setSelectedOptionId(optionId);
    setMessage('Ahora toca su destino en la imagen.');
  }, [directChoice, disabled, game.targets, placements]);

  const handleTargetPress = useCallback((target: MissionGameTarget) => {
    if (directScene) {
      activateDirectTarget(target);
      return;
    }
    if (!selectedOptionId) {
      setMessage('Primero toca una señal. Después toca su destino.');
      return;
    }
    placeOption(selectedOptionId, target.id);
  }, [activateDirectTarget, directScene, placeOption, selectedOptionId]);

  const check = useCallback(() => {
    const validation = validatePlacements(game, placements);
    if (validation.complete) {
      onSubmit(validation.expected.map((placement) => placement.optionId));
      return;
    }
    if (placements.length > validation.retained.length) {
      onMisstep(placements.map((placement) => placement.optionId));
      setPlacements(validation.retained);
      setSelectedOptionId(null);
      setMessage('Retiramos solo lo incorrecto. Tus aciertos siguen en su lugar.');
      return;
    }
    setMessage(`Aún ${expected.length - placements.length === 1 ? 'falta una respuesta' : `faltan ${expected.length - placements.length} respuestas`}.`);
  }, [expected.length, game, onMisstep, onSubmit, placements]);

  return (
    <View style={styles.surface}>
      <View style={styles.instructionPanel}>
        <View style={styles.instructionCopy}>
          <Text style={styles.kindLabel}>{KIND_LABELS[game.kind]}</Text>
          <Text style={styles.instruction}>{game.instruction_es}</Text>
        </View>
        <View style={styles.audioActions}>
          <Pressable accessibilityLabel="Escuchar instrucción" accessibilityRole="button" onPress={onReplayInstruction} style={styles.audioButton}>
            <Ionicons color="#24594e" name="bulb" size={19} />
          </Pressable>
          <Pressable accessibilityLabel="Escuchar pista en inglés" accessibilityRole="button" onPress={onReplayEnglish} style={styles.audioButton}>
            <Ionicons color="#24594e" name="volume-high" size={19} />
          </Pressable>
        </View>
      </View>

      <View onLayout={measureImage} ref={imageRef} style={styles.imageFrame}>
        <OptionMediaImage imageUrl={card.prompt_image_url} />
        <View pointerEvents={disabled ? 'none' : 'auto'} style={StyleSheet.absoluteFill}>
          {game.targets.map((target, index) => {
            const placed = placementForTarget(target.id);
            const complete = placed.length > 0 && placed.every((item) => target.accepted_option_ids.includes(item.optionId));
            const next = expected[placements.length]?.targetId === target.id;
            return (
              <Pressable
                accessibilityHint={directScene ? `Paso ${index + 1}` : 'Destino para una señal'}
                accessibilityLabel={target.label_es}
                accessibilityRole="button"
                accessibilityState={{ disabled, selected: complete }}
                disabled={disabled}
                key={target.id}
                onPress={() => handleTargetPress(target)}
                style={[
                  styles.target,
                  {
                    height: percent(target.rect.height),
                    left: percent(target.rect.x),
                    top: percent(target.rect.y),
                    width: percent(target.rect.width),
                  },
                  complete ? styles.targetComplete : null,
                  next ? styles.targetNext : null,
                ]}
              >
                <View style={[styles.targetBadge, complete ? styles.targetBadgeComplete : null]}>
                  <Text style={styles.targetBadgeText}>{complete ? '✓' : directScene ? `${index + 1}` : target.label_es}</Text>
                </View>
                {placed.map((placement) => (
                  <Pressable
                    accessibilityLabel={`Retirar ${card.options.find((option) => option.id === placement.optionId)?.label || placement.optionId}`}
                    accessibilityRole="button"
                    key={placement.optionId}
                    onPress={() => handleOptionPress(placement.optionId)}
                    style={styles.placedLabel}
                  >
                    <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={2} style={styles.placedLabelText}>
                      {card.options.find((option) => option.id === placement.optionId)?.label}
                    </Text>
                    <Ionicons color="#fff" name="close-circle" size={16} />
                  </Pressable>
                ))}
              </Pressable>
            );
          })}
        </View>
      </View>

      {!directScene ? (
        <View accessibilityLabel="Señales disponibles" style={[styles.optionBank, directChoice ? styles.choiceBank : null]}>
          {card.options.map((option) => (
            <DraggableOption
              disabled={disabled}
              key={option.id}
              onDrop={handleDrop}
              onPress={handleOptionPress}
              option={option}
              placed={placements.some((placement) => placement.optionId === option.id)}
            />
          ))}
        </View>
      ) : null}

      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

      {!directScene ? (
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" disabled={disabled || placements.length === 0} onPress={() => {
            setPlacements((current) => current.slice(0, -1));
            setSelectedOptionId(null);
            setMessage('Deshicimos solo el último movimiento.');
          }} style={[styles.control, disabled || placements.length === 0 ? styles.controlDisabled : null]}>
            <Ionicons color="#315f57" name="arrow-undo" size={18} />
            <Text style={styles.controlText}>Deshacer</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={disabled || placements.length === 0} onPress={() => {
            setPlacements([]);
            setSelectedOptionId(null);
            setMessage('Este reto está limpio; los retos anteriores siguen guardados.');
          }} style={[styles.control, disabled || placements.length === 0 ? styles.controlDisabled : null]}>
            <Ionicons color="#315f57" name="refresh" size={18} />
            <Text style={styles.controlText}>Reiniciar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={disabled || placements.length === 0} onPress={check} style={[styles.check, disabled || placements.length === 0 ? styles.controlDisabled : null]}>
            <Text style={styles.checkText}>Comprobar</Text>
            <Ionicons color="#fff" name="checkmark" size={19} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { alignSelf: 'center', gap: 9, maxWidth: 860, width: '100%' },
  instructionPanel: { alignItems: 'center', backgroundColor: '#fffdf7', borderColor: '#bed9d0', borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', gap: 8, paddingHorizontal: 11, paddingVertical: 9 },
  instructionCopy: { flex: 1, minWidth: 0 },
  kindLabel: { color: '#d26d47', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  instruction: { color: '#263e3a', fontSize: 14, fontWeight: '800', lineHeight: 19, marginTop: 2 },
  audioActions: { flexDirection: 'row', gap: 5 },
  audioButton: { alignItems: 'center', backgroundColor: '#eaf5f1', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  imageFrame: { aspectRatio: 3 / 2, backgroundColor: '#dbe8e2', borderColor: '#fff', borderRadius: 20, borderWidth: 4, maxHeight: 510, overflow: 'hidden', position: 'relative', width: '100%' },
  target: { alignItems: 'center', borderColor: 'rgba(255,255,255,0.92)', borderRadius: 14, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', minHeight: 44, minWidth: 44, position: 'absolute' },
  targetNext: { backgroundColor: 'rgba(243,178,72,0.20)', borderColor: '#ffd578', borderWidth: 3 },
  targetComplete: { backgroundColor: 'rgba(47,143,114,0.18)', borderColor: '#63c59f', borderStyle: 'solid' },
  targetBadge: { backgroundColor: 'rgba(30,69,62,0.88)', borderRadius: 999, maxWidth: '92%', paddingHorizontal: 7, paddingVertical: 4 },
  targetBadgeComplete: { backgroundColor: '#2f8f72' },
  targetBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  placedLabel: { alignItems: 'center', backgroundColor: 'rgba(30,88,75,0.94)', borderRadius: 9, flexDirection: 'row', gap: 4, maxWidth: '94%', paddingHorizontal: 6, paddingVertical: 4 },
  placedLabelText: { color: '#fff', flexShrink: 1, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  optionBank: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  choiceBank: { alignItems: 'stretch', flexDirection: 'column' },
  optionMotion: { maxWidth: 300, minWidth: 118 },
  optionDragging: { elevation: 12, zIndex: 50 },
  optionChip: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e0b866', borderRadius: 13, borderWidth: 2, justifyContent: 'center', minHeight: 50, paddingHorizontal: 10, paddingVertical: 7 },
  optionChipPlaced: { backgroundColor: '#dfe9e5', borderColor: '#9eb7ae', opacity: 0.68 },
  optionText: { color: '#24594e', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  message: { color: '#8b4d2e', fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 7 },
  control: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#b8cec7', borderRadius: 13, borderWidth: 1.5, flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 48, paddingHorizontal: 7 },
  controlDisabled: { opacity: 0.42 },
  controlText: { color: '#315f57', fontSize: 12, fontWeight: '900' },
  check: { alignItems: 'center', backgroundColor: '#e66f45', borderRadius: 13, flex: 1.2, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 48, paddingHorizontal: 8 },
  checkText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.76, transform: [{ translateY: 2 }] },
});
