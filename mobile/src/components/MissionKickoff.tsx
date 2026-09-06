import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  findNodeHandle,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { missionKickoffTopBarLayout } from '../missionTileState';
import type { MissionPresentation } from '../types';

export type MissionOpeningPhase = 'briefing' | 'tutorial' | 'complete';

type Props = {
  narrationAvailable: boolean;
  narrationPlaying: boolean;
  onBeginTutorial: () => void;
  onExit: () => void;
  onReplayNarration: () => void;
  onTutorialTilePlaced: () => void;
  onTutorialComplete: () => void;
  phase: Exclude<MissionOpeningPhase, 'complete'>;
  presentation: MissionPresentation;
  tutorialEnabled: boolean;
};

type Bounds = { height: number; width: number; x: number; y: number };

function contains(bounds: Bounds, x: number, y: number) {
  return x >= bounds.x && x <= bounds.x + bounds.width
    && y >= bounds.y && y <= bounds.y + bounds.height;
}

function Clapperboard() {
  return (
    <View accessible accessibilityLabel="Claqueta de estudio" accessibilityRole="image" style={styles.clapper}>
      <View style={styles.clapperTop}>
        {[0, 1, 2, 3, 4].map((index) => <View key={index} style={styles.clapperStripe} />)}
      </View>
      <View style={styles.clapperBody}>
        <Ionicons color="#f7cf63" name="videocam" size={30} />
        <Text style={styles.clapperText}>TOMA 1</Text>
      </View>
    </View>
  );
}

function LiveStudioPill({ stacked = false }: { stacked?: boolean }) {
  return (
    <View style={[styles.livePill, stacked ? styles.livePillStacked : null]}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>ESTUDIO EN VIVO</Text>
    </View>
  );
}

function TutorialTile({
  onPlaced,
  onDraggingChange,
  placed,
}: {
  onPlaced: () => void;
  onDraggingChange: (dragging: boolean) => void;
  placed: boolean;
}) {
  const drag = useRef(new Animated.ValueXY()).current;
  const tileRef = useRef<View | null>(null);
  const targetRef = useRef<View | null>(null);
  const originRef = useRef<Bounds | null>(null);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const finishDrag = useCallback(() => {
    onDraggingChange(false);
    if (reduceMotion) drag.setValue({ x: 0, y: 0 });
    else Animated.spring(drag, {
      damping: 18,
      stiffness: 230,
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  }, [drag, onDraggingChange, reduceMotion]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => (
      !placed && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5)
    ),
    onPanResponderGrant: () => {
      onDraggingChange(true);
      tileRef.current?.measureInWindow((x, y, tileWidth, tileHeight) => {
        originRef.current = { height: tileHeight, width: tileWidth, x, y };
      });
    },
    onPanResponderMove: (_event, gesture) => {
      const origin = originRef.current;
      if (!origin) return;
      const left = Math.max(8, insets.left + 8);
      const right = width - Math.max(8, insets.right + 8);
      const top = Math.max(8, insets.top + 8);
      const bottom = height - Math.max(8, insets.bottom + 8);
      drag.setValue({
        x: Math.max(left - origin.x, Math.min(gesture.dx, right - origin.x - origin.width)),
        y: Math.max(top - origin.y, Math.min(gesture.dy, bottom - origin.y - origin.height)),
      });
    },
    onPanResponderRelease: (event) => {
      const { pageX, pageY } = event.nativeEvent;
      targetRef.current?.measureInWindow((x, y, targetWidth, targetHeight) => {
        if (contains({ height: targetHeight, width: targetWidth, x, y }, pageX, pageY)) onPlaced();
      });
      finishDrag();
    },
    onPanResponderTerminate: finishDrag,
    onPanResponderTerminationRequest: () => false,
  }), [
    drag,
    finishDrag,
    height,
    insets.bottom,
    insets.left,
    insets.right,
    insets.top,
    onDraggingChange,
    onPlaced,
    placed,
    width,
  ]);

  return (
    <View style={styles.demoRow}>
      {!placed ? (
        <>
          <Animated.View {...responder.panHandlers} style={{ transform: drag.getTranslateTransform() }}>
            <Pressable
              accessibilityHint="Tócala o arrástrala al espacio vacío. Esta práctica no cuenta puntos."
              accessibilityLabel="Ficha de práctica Acción"
              accessibilityRole="button"
              onPress={onPlaced}
              ref={tileRef}
              style={({ pressed }) => [styles.demoSourceTile, pressed ? styles.pressed : null]}
            >
              <Text style={styles.demoSourceText}>ACCIÓN</Text>
            </Pressable>
          </Animated.View>
          <Ionicons color="#b6532f" name="arrow-down" size={26} />
        </>
      ) : null}
      <View ref={targetRef} style={[styles.demoTarget, placed ? styles.demoTargetComplete : null]}>
        {placed ? (
          <View style={styles.demoPlacedTile}>
            <Text style={styles.demoTileText}>ACCIÓN</Text>
            <Ionicons color="#fff" name="checkmark-circle" size={18} />
          </View>
        ) : (
          <>
            <Ionicons color="#ae9672" name="add-circle-outline" size={24} />
            <Text style={styles.demoTargetText}>SUELTA AQUÍ</Text>
          </>
        )}
      </View>
      {placed ? (
        <View accessibilityLiveRegion="polite" style={styles.demoSuccess}>
          <Ionicons color="#25755f" name="sparkles" size={23} />
          <Text style={styles.demoSuccessText}>¡Listo! Así se colocan las fichas.</Text>
        </View>
      ) : null}
    </View>
  );
}

export function MissionKickoff({
  narrationAvailable,
  narrationPlaying,
  onBeginTutorial,
  onExit,
  onReplayNarration,
  onTutorialTilePlaced,
  onTutorialComplete,
  phase,
  presentation,
  tutorialEnabled,
}: Props) {
  const { fontScale, height, width } = useWindowDimensions();
  const phaseHeadingRef = useRef<View | null>(null);
  const previousPhaseRef = useRef<typeof phase | null>(null);
  const [tutorialPlaced, setTutorialPlaced] = useState(false);
  const [tutorialDragging, setTutorialDragging] = useState(false);
  const compact = height < 700;
  const landscape = width > height;
  const stackTopBar = missionKickoffTopBarLayout(width, fontScale) === 'stacked';
  const phaseHeadingLabel = phase === 'briefing'
    ? 'Tu reto de producción. Revisa los objetivos antes de comenzar.'
    : 'Prueba de cámara. Practica cómo colocar una ficha; esta práctica no cuenta puntos.';

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;
    if (previousPhase === phase) return undefined;

    const timer = setTimeout(() => {
      const headingHandle = findNodeHandle(phaseHeadingRef.current);
      if (headingHandle) AccessibilityInfo.setAccessibilityFocus(headingHandle);
      else AccessibilityInfo.announceForAccessibility(phaseHeadingLabel);
    }, 120);
    return () => clearTimeout(timer);
  }, [phase, phaseHeadingLabel]);

  const placeTutorialTile = useCallback(() => {
    if (tutorialPlaced) return;
    setTutorialPlaced(true);
    onTutorialTilePlaced();
  }, [onTutorialTilePlaced, tutorialPlaced]);

  return (
    <ScrollView
      contentContainerStyle={[styles.page, compact ? styles.pageCompact : null]}
      scrollEnabled={!tutorialDragging}
      style={styles.scroll}
    >
      <View style={[styles.shell, landscape ? styles.shellLandscape : null]}>
        <View style={[styles.topRow, stackTopBar ? styles.topRowStacked : null]}>
          <View style={styles.topControlRow}>
            <Pressable accessibilityLabel="Salir del reto" accessibilityRole="button" onPress={onExit} style={styles.iconButton}>
              <Ionicons color="#fff" name="arrow-back" size={23} />
            </Pressable>
            {!stackTopBar ? <LiveStudioPill /> : null}
            <Pressable
              accessibilityHint={narrationAvailable ? 'Repite las instrucciones en español.' : 'La narración todavía no está disponible.'}
              accessibilityLabel="Repetir instrucciones"
              accessibilityRole="button"
              accessibilityState={{ disabled: !narrationAvailable }}
              disabled={!narrationAvailable}
              onPress={onReplayNarration}
              style={[styles.iconButton, !narrationAvailable ? styles.disabled : null]}
            >
              <Ionicons color="#fff" name={narrationPlaying ? 'volume-high' : 'volume-medium'} size={23} />
            </Pressable>
          </View>
          {stackTopBar ? <LiveStudioPill stacked /> : null}
        </View>

        <View style={styles.filmStrip}>
          {Array.from({ length: 12 }, (_value, index) => <View key={index} style={styles.filmHole} />)}
        </View>

        <View style={[styles.content, landscape ? styles.contentLandscape : null]}>
          <View style={styles.titleBlock}>
            <Clapperboard />
            <Text style={styles.label}>{presentation.label}</Text>
            <Text accessibilityRole="header" adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={2} style={styles.title}>
              {presentation.title}
            </Text>
            <Text style={styles.briefing}>{presentation.briefing}</Text>
          </View>

          {phase === 'briefing' ? (
            <View style={styles.panel}>
              <View
                accessible
                accessibilityLabel={phaseHeadingLabel}
                accessibilityRole="header"
                ref={phaseHeadingRef}
              >
                <Text accessible={false} style={styles.panelTitle}>Tu reto de producción</Text>
              </View>
              <Text style={styles.panelIntro}>Usarás todo lo aprendido en la unidad:</Text>
              <View style={styles.objectives}>
                {presentation.chapters.map((chapter, index) => (
                  <View key={chapter.id} style={styles.objectiveRow}>
                    <View style={styles.objectiveNumber}><Text style={styles.objectiveNumberText}>{index + 1}</Text></View>
                    <View style={styles.objectiveCopy}>
                      <Text style={styles.objectiveTitle}>{chapter.title}</Text>
                      <Text style={styles.objectiveText}>{chapter.objective}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {tutorialEnabled ? (
                <View style={styles.assurance}>
                  <Ionicons color="#2f765e" name="shield-checkmark" size={21} />
                  <Text style={styles.assuranceText}>Primero practicaremos el control. Esa práctica no cuenta puntos.</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={tutorialEnabled ? onBeginTutorial : onTutorialComplete}
                style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.primaryButtonText}>{tutorialEnabled ? 'Enséñame cómo jugar' : 'Comenzar reto'}</Text>
                <Ionicons color="#fff" name={tutorialEnabled ? 'arrow-forward' : 'play'} size={21} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.panel}>
              <View
                accessible
                accessibilityLabel={phaseHeadingLabel}
                accessibilityRole="header"
                ref={phaseHeadingRef}
              >
                <Text accessible={false} style={styles.panelTitle}>Prueba de cámara</Text>
              </View>
              <Text style={styles.tutorialInstruction}>
                Arrastra la ficha <Text style={styles.emphasis}>ACCIÓN</Text> al espacio vacío.
                También puedes tocarla. No hay forma de fallar.
              </Text>
              <TutorialTile
                onDraggingChange={setTutorialDragging}
                onPlaced={placeTutorialTile}
                placed={tutorialPlaced}
              />
              <Text style={styles.tutorialNote}>En el reto podrás mover, quitar y reordenar fichas antes de comprobar.</Text>
              <Pressable
                accessibilityHint={tutorialPlaced ? 'Abre la primera escena del reto.' : 'Completa primero la práctica de una ficha.'}
                accessibilityRole="button"
                accessibilityState={{ disabled: !tutorialPlaced }}
                disabled={!tutorialPlaced}
                onPress={onTutorialComplete}
                style={({ pressed }) => [styles.primaryButton, !tutorialPlaced ? styles.disabled : null, pressed ? styles.pressed : null]}
              >
                <Text style={styles.primaryButtonText}>Comenzar reto</Text>
                <Ionicons color="#fff" name="play" size={21} />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.filmStrip}>
          {Array.from({ length: 12 }, (_value, index) => <View key={index} style={styles.filmHole} />)}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#151b1f', flex: 1 },
  page: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: 12 },
  pageCompact: { justifyContent: 'flex-start', padding: 8 },
  shell: {
    backgroundColor: '#263238', borderColor: '#111719', borderRadius: 24, borderWidth: 2,
    elevation: 8, maxWidth: 780, overflow: 'hidden', shadowColor: '#000', shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.3, shadowRadius: 12, width: '100%',
  },
  shellLandscape: { maxWidth: 980 },
  topRow: { padding: 10 },
  topRowStacked: { gap: 8 },
  topControlRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  iconButton: { alignItems: 'center', backgroundColor: '#39484e', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  livePill: { alignItems: 'center', backgroundColor: '#101719', borderRadius: 999, flexDirection: 'row', gap: 7, minHeight: 34, paddingHorizontal: 13 },
  livePillStacked: { alignSelf: 'center', maxWidth: '100%', paddingHorizontal: 10 },
  liveDot: { backgroundColor: '#ef5b4d', borderRadius: 6, height: 12, width: 12 },
  liveText: { color: '#f7d067', flexShrink: 1, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center' },
  filmStrip: { backgroundColor: '#0c1113', flexDirection: 'row', gap: 10, justifyContent: 'space-around', paddingHorizontal: 8, paddingVertical: 6 },
  filmHole: { backgroundColor: '#d8b653', borderRadius: 2, height: 8, width: 14 },
  content: { alignItems: 'center', backgroundColor: '#f7f0df', gap: 11, padding: 15 },
  contentLandscape: { flexDirection: 'row', justifyContent: 'center' },
  titleBlock: { alignItems: 'center', flex: 1, maxWidth: 520 },
  clapper: { marginBottom: 5, width: 128 },
  clapperTop: { backgroundColor: '#13191c', flexDirection: 'row', height: 24, overflow: 'hidden', transform: [{ rotate: '-5deg' }] },
  clapperStripe: { backgroundColor: '#f4c95d', height: 42, marginLeft: 9, transform: [{ rotate: '28deg' }], width: 13 },
  clapperBody: { alignItems: 'center', backgroundColor: '#1d292e', borderColor: '#0f1416', borderRadius: 4, borderWidth: 2, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 54 },
  clapperText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  label: { color: '#ad5c22', fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginTop: 2, textAlign: 'center' },
  title: { color: '#24343a', fontSize: 32, fontWeight: '900', lineHeight: 36, marginTop: 2, textAlign: 'center' },
  briefing: { color: '#4a5b60', fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 4, maxWidth: 560, textAlign: 'center' },
  panel: { alignItems: 'stretch', backgroundColor: '#fffdf7', borderColor: '#d5bc7d', borderRadius: 20, borderWidth: 2, flex: 1, maxWidth: 620, padding: 14, width: '100%' },
  panelTitle: { color: '#24343a', fontSize: 22, fontWeight: '900', lineHeight: 26, textAlign: 'center' },
  panelIntro: { color: '#607076', fontSize: 15, lineHeight: 20, marginTop: 3, textAlign: 'center' },
  objectives: { gap: 7, marginTop: 10 },
  objectiveRow: { alignItems: 'center', backgroundColor: '#f3efe4', borderRadius: 12, flexDirection: 'row', gap: 9, minHeight: 54, padding: 7 },
  objectiveNumber: { alignItems: 'center', backgroundColor: '#c8582f', borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  objectiveNumberText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  objectiveCopy: { flex: 1 },
  objectiveTitle: { color: '#26393e', fontSize: 15, fontWeight: '900', lineHeight: 19 },
  objectiveText: { color: '#59676b', fontSize: 14, lineHeight: 19, marginTop: 1 },
  assurance: { alignItems: 'center', backgroundColor: '#e8f5ef', borderRadius: 11, flexDirection: 'row', gap: 8, marginTop: 10, padding: 9 },
  assuranceText: { color: '#315d50', flex: 1, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  tutorialInstruction: { color: '#4a595e', fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  emphasis: { color: '#b6532f', fontWeight: '900' },
  demoRow: { alignItems: 'center', gap: 12, marginTop: 14 },
  demoTarget: { alignItems: 'center', backgroundColor: '#f7f1df', borderColor: '#be9f55', borderRadius: 14, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', minHeight: 70, padding: 7, width: '100%' },
  demoTargetComplete: { backgroundColor: '#e7f5ed', borderColor: '#3b8d70', borderStyle: 'solid' },
  demoTargetText: { color: '#7b6b4d', fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  demoSourceTile: { alignItems: 'center', backgroundColor: '#fff', borderBottomColor: '#397f70', borderBottomWidth: 5, borderColor: '#70aa9c', borderRadius: 13, justifyContent: 'center', minHeight: 52, minWidth: 132, paddingHorizontal: 15 },
  demoSourceText: { color: '#1c6558', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  demoPlacedTile: { alignItems: 'center', backgroundColor: '#34866d', borderRadius: 10, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 48, paddingHorizontal: 17 },
  demoTileText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  demoSuccess: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 52 },
  demoSuccessText: { color: '#28614f', flexShrink: 1, fontSize: 14, fontWeight: '900' },
  tutorialNote: { color: '#666b69', fontSize: 14, fontWeight: '700', lineHeight: 19, marginTop: 10, textAlign: 'center' },
  primaryButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#c8582f', borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12, minHeight: 52, minWidth: 210, paddingHorizontal: 20 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.78, transform: [{ translateY: 2 }] },
});
