import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  fitMissionSceneFrame,
  isCollectiveMissionTarget,
  missionPersonTargetSize,
  MISSION_SCENE_BORDER_WIDTH,
  missionTargetTouchWidth,
} from '../missionSceneGeometry';
import type { LessonCard, MissionGame, MissionGameTarget } from '../types';
import { OptionMediaImage } from './OptionMediaImage';

type Result = 'correct' | 'wrong' | null;

type Props = {
  card: LessonCard & { mission_game: MissionGame };
  cueUnavailable: boolean;
  interactionReady: boolean;
  onCueRequest: (cueIndex: number) => void;
  onMisstep: (optionIds: string[]) => void;
  onSubmit: (optionIds: string[]) => void;
  result: Result;
};

const KIND_LABELS: Record<MissionGame['kind'], string> = {
  'action-hunt': 'ENCUENTRA LA ACCIÓN',
  'contrast-hunt': 'MIRA BIEN',
  'crowd-search': 'ENCUENTRA A LA PERSONA',
  'family-link': 'REÚNE A LA FAMILIA',
  'guided-search': 'PRIMER RETO',
  'voice-gate': 'RETO DE VOZ',
};

function percent(value: number): `${number}%` {
  return `${Math.round(value * 10000) / 100}%`;
}

function targetCenter(target: MissionGameTarget) {
  return {
    x: target.rect.x + target.rect.width / 2,
    y: target.rect.y + target.rect.height / 2,
  };
}

function TargetDot({
  disabled,
  isSolved,
  isWrong,
  onPress,
  sceneCanvasWidth,
  target,
}: {
  disabled: boolean;
  isSolved: boolean;
  isWrong: boolean;
  onPress: () => void;
  sceneCanvasWidth: number;
  target: MissionGameTarget;
}) {
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const center = targetCenter(target);
  const collective = isCollectiveMissionTarget(target.label_es);
  const targetHeight = missionPersonTargetSize(sceneCanvasWidth);
  const targetWidth = missionTargetTouchWidth(sceneCanvasWidth, collective);

  useEffect(() => {
    pulse.stopAnimation();
    if (reduceMotion || isSolved) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, {
        duration: 760,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        duration: 380,
        easing: Easing.in(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isSolved, pulse, reduceMotion]);

  return (
    <Pressable
      accessibilityHint="Escucha la frase y toca si describe a esta persona o grupo."
      accessibilityLabel={target.label_es || 'Persona'}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isSolved }}
      disabled={disabled || isSolved}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.targetHitArea,
        {
          left: percent(center.x),
          top: percent(center.y),
          height: targetHeight,
          transform: [{ translateX: -targetWidth / 2 }, { translateY: -targetHeight / 2 }],
          width: targetWidth,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          collective ? [styles.pulseRingCollective, { width: targetWidth - 8 }] : null,
          isWrong ? styles.pulseRingWrong : null,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0.06] }),
            transform: [{
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: collective ? [0.9, 1.18] : [0.78, 1.7],
              }),
            }],
          },
        ]}
      />
      <View style={[
        styles.targetDot,
        collective ? [styles.targetDotCollective, { width: targetWidth - 14 }] : null,
        isWrong ? styles.targetDotWrong : null,
        isSolved ? styles.targetDotSolved : null,
      ]}>
        <Ionicons
          color="#fff"
          name={isSolved ? 'checkmark' : collective ? 'people' : 'radio-button-on'}
          size={isSolved ? 22 : collective ? 18 : 16}
        />
      </View>
    </Pressable>
  );
}

export function MissionGameSurface({
  card,
  cueUnavailable,
  interactionReady,
  onCueRequest,
  onMisstep,
  onSubmit,
  result,
}: Props) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const game = card.mission_game;
  const [cueIndex, setCueIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [solvedTargetIds, setSolvedTargetIds] = useState<string[]>([]);
  const [wrongTargetId, setWrongTargetId] = useState<string | null>(null);
  const [sceneSlotSize, setSceneSlotSize] = useState({ height: 0, width: 0 });
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCue = game.cues[cueIndex] ?? game.cues[0];
  const heroImageUrl = card.prompt_image_url
    || card.options.find((option) => option.image_url)?.image_url
    || '';
  const guided = game.tutorial_mode === 'guided-no-fail';
  const useLandscapeGameRail = viewportWidth > viewportHeight && viewportHeight < 600;
  const resolving = Boolean(feedback);
  const disabled = !interactionReady || resolving || result === 'correct';
  const cueProgress = useMemo(
    () => `${Math.min(cueIndex + 1, game.cues.length)} de ${game.cues.length}`,
    [cueIndex, game.cues.length],
  );
  const sceneFrame = useMemo(
    () => fitMissionSceneFrame(
      sceneSlotSize.width,
      sceneSlotSize.height,
      MISSION_SCENE_BORDER_WIDTH,
    ),
    [sceneSlotSize.height, sceneSlotSize.width],
  );

  useEffect(() => {
    setCueIndex(0);
    setFeedback('');
    setSolvedTargetIds([]);
    setWrongTargetId(null);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, [card.slide_id]);

  useEffect(() => () => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  const chooseTarget = useCallback((target: MissionGameTarget) => {
    if (disabled || !currentCue) return;
    if (target.id !== currentCue.target_id) {
      setWrongTargetId(target.id);
      setFeedback('Escucha otra vez. Tus aciertos siguen guardados.');
      if (!guided) onMisstep([target.id]);
      transitionTimerRef.current = setTimeout(() => {
        setWrongTargetId(null);
        setFeedback('');
        onCueRequest(cueIndex);
      }, 850);
      return;
    }

    const nextSolved = [...new Set([...solvedTargetIds, target.id])];
    setSolvedTargetIds(nextSolved);
    setWrongTargetId(null);
    setFeedback(currentCue.answer_text);
    transitionTimerRef.current = setTimeout(() => {
      const nextCueIndex = cueIndex + 1;
      if (nextCueIndex < game.cues.length) {
        setCueIndex(nextCueIndex);
        setFeedback('');
        onCueRequest(nextCueIndex);
        return;
      }
      onSubmit(game.cues.map((cue) => cue.option_id));
    }, 720);
  }, [cueIndex, currentCue, disabled, game.cues, guided, onCueRequest, onMisstep, onSubmit, solvedTargetIds]);

  if (!currentCue || !heroImageUrl) return null;

  const instructionPanel = (
    <View style={styles.instructionPanel}>
      <View style={styles.instructionCopy}>
        <View style={styles.instructionMeta}>
          <Text style={styles.kindLabel}>{KIND_LABELS[game.kind]}</Text>
          <Text style={styles.cueProgress}>PISTA {cueProgress}</Text>
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={styles.instruction}>
          {game.instruction_es}
        </Text>
      </View>
      <Pressable
        accessibilityHint="Reproduce otra vez la frase en inglés."
        accessibilityLabel="Repetir la frase"
        accessibilityRole="button"
        disabled={resolving || result === 'correct'}
        hitSlop={7}
        onPress={() => onCueRequest(cueIndex)}
        style={({ pressed }) => [
          styles.audioButton,
          !interactionReady && !cueUnavailable ? styles.audioButtonPlaying : null,
          cueUnavailable ? styles.audioButtonRetry : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Ionicons
          color="#fff"
          name={cueUnavailable || interactionReady ? 'volume-high' : 'volume-medium'}
          size={23}
        />
      </Pressable>
    </View>
  );
  const progressDots = (
    <View style={styles.progressDots}>
      {game.cues.map((cue, index) => (
        <View
          accessibilityLabel={`Pista ${index + 1}`}
          key={cue.id}
          style={[
            styles.progressDot,
            index < cueIndex ? styles.progressDotDone : null,
            index === cueIndex ? styles.progressDotCurrent : null,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.surface, useLandscapeGameRail ? styles.surfaceLandscape : null]}>
      {useLandscapeGameRail ? (
        <View style={styles.landscapeRail}>
          {instructionPanel}
          {progressDots}
        </View>
      ) : instructionPanel}

      <View
        onLayout={({ nativeEvent }) => {
          const width = Math.round(nativeEvent.layout.width * 2) / 2;
          const height = Math.round(nativeEvent.layout.height * 2) / 2;
          setSceneSlotSize((current) => (
            current.width === width && current.height === height ? current : { height, width }
          ));
        }}
        style={[styles.sceneSlot, useLandscapeGameRail ? styles.sceneSlotLandscape : null]}
      >
        {sceneFrame.width > 0 && sceneFrame.height > 0 ? (
          <View style={[styles.imageFrame, { height: sceneFrame.height, width: sceneFrame.width }]}>
            <View style={styles.sceneCanvas}>
              <OptionMediaImage accessibilityLabel="Escena de la misión" imageUrl={heroImageUrl} />
              <View pointerEvents={disabled ? 'none' : 'auto'} style={StyleSheet.absoluteFill}>
                {game.targets.map((target) => (
                  <TargetDot
                    disabled={disabled}
                    isSolved={solvedTargetIds.includes(target.id)}
                    isWrong={wrongTargetId === target.id}
                    key={target.id}
                    onPress={() => chooseTarget(target)}
                    sceneCanvasWidth={sceneFrame.canvasWidth}
                    target={target}
                  />
                ))}
              </View>

              {!interactionReady && !feedback && !cueUnavailable ? (
                <View pointerEvents="none" style={styles.listeningBadge}>
                  <Ionicons color="#fff" name="ear" size={18} />
                  <Text style={styles.listeningText}>Escucha…</Text>
                </View>
              ) : null}

              {cueUnavailable && !feedback ? (
                <View accessibilityLiveRegion="assertive" pointerEvents="none" style={styles.retryBadge}>
                  <Ionicons color="#fff" name="volume-high" size={19} />
                  <Text style={styles.retryText}>No se escuchó. Toca 🔊 para repetir.</Text>
                </View>
              ) : null}

              {feedback ? (
                <View accessibilityLiveRegion="polite" pointerEvents="none" style={[
                  styles.feedback,
                  wrongTargetId ? styles.feedbackWrong : styles.feedbackCorrect,
                ]}>
                  <Ionicons color="#fff" name={wrongTargetId ? 'ear' : 'checkmark-circle'} size={22} />
                  <Text adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={2} style={styles.feedbackText}>
                    {feedback}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      {!useLandscapeGameRail ? progressDots : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { alignSelf: 'center', flex: 1, gap: 8, maxWidth: 900, minHeight: 0, width: '100%' },
  surfaceLandscape: { flexDirection: 'row' },
  landscapeRail: { flexBasis: '34%', flexGrow: 0, flexShrink: 1, gap: 8, justifyContent: 'space-between', maxWidth: 320, minWidth: 210 },
  instructionPanel: { alignItems: 'center', backgroundColor: '#fffdf7', borderColor: '#9bcdbf', borderRadius: 17, borderWidth: 1.5, flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  instructionCopy: { flex: 1, minWidth: 0 },
  instructionMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kindLabel: { color: '#d86643', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  cueProgress: { color: '#477069', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  instruction: { color: '#203c37', fontSize: 15, fontWeight: '900', lineHeight: 19, marginTop: 2 },
  audioButton: { alignItems: 'center', backgroundColor: '#278c73', borderRadius: 15, height: 48, justifyContent: 'center', width: 48 },
  audioButtonPlaying: { backgroundColor: '#d06845' },
  audioButtonRetry: { backgroundColor: '#b9553f' },
  sceneSlot: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 0, width: '100%' },
  sceneSlotLandscape: { width: 'auto' },
  imageFrame: { backgroundColor: '#dbe8e2', borderColor: '#fff', borderRadius: 22, borderWidth: MISSION_SCENE_BORDER_WIDTH, overflow: 'hidden' },
  sceneCanvas: { borderRadius: 18, flex: 1, overflow: 'hidden', position: 'relative' },
  targetHitArea: { alignItems: 'center', justifyContent: 'center', position: 'absolute' },
  pulseRing: { backgroundColor: 'rgba(255,255,255,0.72)', borderColor: '#f4c75f', borderRadius: 999, borderWidth: 3, height: 38, position: 'absolute', width: 38 },
  pulseRingCollective: { height: 42 },
  pulseRingWrong: { borderColor: '#e15d52' },
  targetDot: { alignItems: 'center', backgroundColor: '#245f53', borderColor: '#fff', borderRadius: 999, borderWidth: 3, elevation: 6, height: 38, justifyContent: 'center', shadowColor: '#173a34', shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.34, shadowRadius: 4, width: 38 },
  targetDotCollective: { height: 38 },
  targetDotWrong: { backgroundColor: '#c95048' },
  targetDotSolved: { backgroundColor: '#32a77e', borderColor: '#dcfff3' },
  listeningBadge: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(24,58,53,0.92)', borderRadius: 999, bottom: 14, flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingVertical: 7, position: 'absolute' },
  listeningText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  retryBadge: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(151,71,55,0.96)', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 2, bottom: 12, flexDirection: 'row', gap: 7, maxWidth: '92%', minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, position: 'absolute' },
  retryText: { color: '#fff', flexShrink: 1, fontSize: 15, fontWeight: '900', lineHeight: 19, textAlign: 'center' },
  feedback: { alignItems: 'center', alignSelf: 'center', borderColor: 'rgba(255,255,255,0.88)', borderRadius: 16, borderWidth: 2, bottom: 12, flexDirection: 'row', gap: 7, maxWidth: '92%', minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, position: 'absolute' },
  feedbackCorrect: { backgroundColor: 'rgba(29,126,96,0.96)' },
  feedbackWrong: { backgroundColor: 'rgba(151,71,55,0.96)' },
  feedbackText: { color: '#fff', flexShrink: 1, fontSize: 16, fontWeight: '900', lineHeight: 20, textAlign: 'center' },
  progressDots: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 9 },
  progressDot: { backgroundColor: '#d5ddd8', borderRadius: 999, height: 7, width: 7 },
  progressDotDone: { backgroundColor: '#56ae91' },
  progressDotCurrent: { backgroundColor: '#d77b4c', width: 22 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
});
