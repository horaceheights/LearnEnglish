import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { resultSummary, remainingReviewCards, type LessonResult } from '../lessonResult';
import { useMissionSoundEffects } from '../missionSoundEffects';

const HAPPY = require('../../assets/mascots/serious/squirrel-professor-celebrating-v1.png');
const FRIENDLY = require('../../assets/mascots/serious/listening-frames-normalized/listening-06.png');
export const GOODBYE_MESSAGE = 'Te espero pronto para seguir practicando.';

function ResultMascot({ happy, moving, size }: { happy: boolean; moving: boolean; size: number }) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving) return;
    const animation = Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 400, easing: Easing.bounce, useNativeDriver: true }),
      Animated.timing(motion, { toValue: .6, duration: 190, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 400, easing: Easing.bounce, useNativeDriver: true }),
    ]);
    animation.start();
    return () => { animation.stop(); motion.setValue(0); };
  }, [motion, moving]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.mascotScene, { height: size + 18, width: size + 24 }]}>
    <View style={[styles.halo, { width: size * .8, height: size * .8, borderRadius: size }]} />
    <Animated.Image resizeMode="contain" source={happy ? HAPPY : FRIENDLY} style={{ width: size, height: size,
      transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
        { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', happy ? '-4deg' : '4deg'] }) }] }} />
  </View>;
}

export function LessonResultScreen({ result, lessonLabel, hasNext, onNext, onLessons, onRestart, onReview, onExit,
  width, height, active, celebrate, saving, error, onRetrySave, offline = false }: {
  result: LessonResult; lessonLabel: string; hasNext: boolean; onNext: () => void; onLessons: () => void;
  onRestart: () => void; onReview: () => void; onExit: () => void; width: number; height: number;
  active: boolean; celebrate: boolean; saving: boolean; error: string;
  onRetrySave: () => void;
  offline?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const summary = resultSummary(result);
  const landscape = width > height;
  const compact = height < 730;
  const burst = useRef(new Animated.Value(0)).current;
  const played = useRef(false);
  const { playMissionSound, stopMissionSound } = useMissionSoundEffects({ enabled: true, isAppActive: active, reducedStimulation: reduceMotion });
  useEffect(() => {
    if (!summary.passed || !celebrate || !active || reduceMotion || played.current) return;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced || played.current) return;
      played.current = true;
      playMissionSound('lesson-passed');
      Animated.timing(burst, { toValue: 1, duration: 2200, useNativeDriver: true }).start();
    });
    return () => { cancelled = true; stopMissionSound(); burst.stopAnimation(); };
  }, [active, burst, celebrate, playMissionSound, reduceMotion, stopMissionSound, summary.passed]);
  const actionsDisabled = saving || Boolean(error);
  const button = (label: string, onPress: () => void, primary = false, recommended = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={recommended ? `${label}. Recomendado` : label}
      disabled={actionsDisabled} onPress={onPress} style={[styles.button, primary ? styles.primary : null, actionsDisabled ? styles.disabled : null]}>
      <Text style={[styles.buttonText, primary ? styles.primaryText : null]}>{label}</Text>
      {recommended ? <Text style={styles.recommended}>RECOMENDADO</Text> : null}
    </Pressable>
  );
  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <View style={styles.brandRow}>
      <Pressable accessibilityRole="button" disabled={actionsDisabled} accessibilityLabel="SpanGlish. Volver a las lecciones" onPress={onLessons} style={styles.brandButton}>
        <Text style={styles.brand}>SpanGlish</Text>
      </Pressable>
      <Text style={styles.location}>{lessonLabel}</Text>
    </View>
    <View style={[styles.body, landscape ? styles.landscape : null]}>
      <View style={styles.hero}>
        <ResultMascot happy={summary.passed} moving={active && celebrate && !reduceMotion} size={landscape ? Math.min(235, height * .48) : compact ? 130 : 185} />
        {summary.passed && celebrate && !reduceMotion ? <View pointerEvents="none" accessible={false} style={styles.confetti}>
          {Array.from({ length: 12 }, (_, index) => <Animated.View key={index} style={[styles.particle, {
            left: `${8 + (index * 19) % 84}%`, backgroundColor: ['#e3b640', '#bd4226', '#369967'][index % 3],
            opacity: burst.interpolate({ inputRange: [0, .15, .85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, 130] }) },
              { rotate: `${index * 37}deg` }],
          }]} />)}
        </View> : null}
        <Text style={styles.eyebrow}>{summary.pending ? 'RESULTADO PENDIENTE' : summary.passed ? 'LECCIÓN APROBADA' : 'SIGAMOS PRACTICANDO'}</Text>
        <Text accessibilityRole="header" style={[styles.title, compact ? styles.titleCompact : null]}>
          {summary.pending ? 'Sigamos aprendiendo' : summary.passed ? hasNext ? '¡Lo lograste!' : '¡Curso completado!' : '¡Tú puedes!'}
        </Text>
        {!landscape && !summary.pending ? <Text style={[styles.score, compact ? styles.scoreCompact : null, summary.passed ? styles.passedScore : null]}>{summary.percentage}%</Text> : null}
      </View>
      <View style={styles.controls}>
        {landscape && !summary.pending ? <Text style={[styles.score, styles.scoreCompact, summary.passed ? styles.passedScore : null]}>{summary.percentage}%</Text> : null}
        <Text style={styles.caption}>{summary.pending ? 'Falta evaluar algunas actividades.' : summary.afterReview ? 'Resultado después del repaso' : 'Aciertos al primer intento'}</Text>
        <Text style={styles.message}>{summary.pending ? 'Puedes completarlas cuando tengas conexión.' : summary.passed ? 'Cada día hablas mejor.' : 'Un repaso te ayudará a mejorar.'}</Text>
        {!summary.passed ? <Text style={styles.question}>¿Qué quieres hacer?</Text> : null}
        <View style={styles.actions}>
          {summary.passed ? <>
            {hasNext ? button('Continuar', onNext, true) : null}
            {button('Volver a las lecciones', onLessons, !hasNext)}
            {summary.afterReview && remainingReviewCards(result).length ? button('Seguir repasando hasta el 100%', onReview) : null}
          </> : <>
            {button('Reintentar toda la lección', onRestart)}
            {remainingReviewCards(result).length ? button(summary.pending ? 'Completar actividades pendientes' : 'Repasar solo los errores', onReview, true, !summary.pending) : null}
          </>}
          <Pressable accessibilityRole="button" disabled={actionsDisabled} onPress={onExit} style={styles.exit}><Text style={styles.exitText}>Salir</Text></Pressable>
        </View>
        {saving ? <ActivityIndicator accessibilityLabel="Guardando progreso" color="#2a8059" /> : null}
        {offline && !saving && !error ? <Text style={styles.caption}>Tu progreso está guardado en este dispositivo. Se sincronizará cuando vuelva la conexión.</Text> : null}
        {result.reviewAvailable === false && !summary.passed ? <Text style={styles.caption}>Este intento anterior no tiene el detalle de errores. Reintenta la lección para activar el repaso.</Text> : null}
        {error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" disabled={saving} onPress={onRetrySave} style={styles.button}><Text style={styles.buttonText}>Guardar de nuevo</Text></Pressable></> : null}
      </View>
    </View>
  </ScrollView>;
}

export function LessonGoodbye({ onDone, width, height, active }: { onDone: () => void; width: number; height: number; active: boolean }) {
  const reduceMotion = useReducedMotion();
  const [screenReader, setScreenReader] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (!mounted) return;
      setScreenReader(enabled);
      if (enabled) AccessibilityInfo.announceForAccessibility(GOODBYE_MESSAGE);
    });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (screenReader !== false || !active) return;
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [active, onDone, screenReader]);
  return <ScrollView style={styles.page} contentContainerStyle={[styles.goodbye, width > height ? styles.landscape : null]}>
    <ResultMascot happy={false} moving={active && !reduceMotion} size={Math.min(240, height * .35)} />
    <View style={styles.controls}>
      <Text accessibilityRole="header" style={styles.title}>¡Nos vemos pronto!</Text>
      <Text style={styles.goodbyeMessage}>{GOODBYE_MESSAGE}</Text>
      <Text style={styles.caption}>Tu progreso está guardado.</Text>
      {screenReader ? <Pressable accessibilityRole="button" onPress={onDone} style={[styles.button, styles.primary]}><Text style={[styles.buttonText, styles.primaryText]}>Salir</Text></Pressable> : null}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fbf7ef' },
  pageContent: { flexGrow: 1, padding: 18, alignItems: 'center' },
  brandRow: { width: '100%', maxWidth: 900, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  brandButton: { minHeight: 48, justifyContent: 'center' }, brand: { fontSize: 17, fontWeight: '800', color: '#24333a' },
  location: { fontSize: 13, color: '#58656a', flexShrink: 1 },
  body: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 900, gap: 6, paddingVertical: 6 },
  landscape: { flexDirection: 'row', gap: 24 }, hero: { alignItems: 'center', flexShrink: 1, position: 'relative' },
  controls: { width: '100%', maxWidth: 380, flexShrink: 1, alignItems: 'center', gap: 5 },
  mascotScene: { justifyContent: 'center', alignItems: 'center' }, halo: { position: 'absolute', backgroundColor: '#f8e8bf' },
  confetti: { position: 'absolute', top: 0, width: '100%', height: 170 }, particle: { position: 'absolute', width: 7, height: 12, borderRadius: 2 },
  eyebrow: { color: '#2a8059', fontSize: 12, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginVertical: 4 },
  title: { fontSize: 30, fontWeight: '900', color: '#24333a', textAlign: 'center' }, titleCompact: { fontSize: 26 },
  score: { fontSize: 64, fontWeight: '900', color: '#24333a', textAlign: 'center' }, scoreCompact: { fontSize: 48 }, passedScore: { color: '#2a8059' },
  caption: { fontSize: 14, color: '#58656a', textAlign: 'center' }, message: { fontSize: 16, color: '#58656a', textAlign: 'center', marginVertical: 6 },
  question: { fontSize: 19, fontWeight: '800', color: '#24333a', textAlign: 'center', marginVertical: 4 },
  actions: { gap: 10, width: '100%', marginTop: 6 }, button: { minHeight: 50, borderWidth: 1.5, borderColor: '#dacdb6', borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#bd4226', borderColor: '#bd4226', borderBottomWidth: 4, borderBottomColor: '#94341e' },
  buttonText: { fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#24333a' }, primaryText: { color: '#fff' },
  recommended: { fontSize: 11, fontWeight: '800', letterSpacing: .7, color: '#fff', marginTop: 3 },
  exit: { minHeight: 48, justifyContent: 'center', alignItems: 'center' }, exitText: { fontSize: 16, fontWeight: '700', color: '#58656a' },
  disabled: { opacity: .6 }, error: { color: '#94341e', fontSize: 16, textAlign: 'center' },
  goodbye: { flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 24 },
  goodbyeMessage: { fontSize: 23, color: '#24333a', textAlign: 'center', marginVertical: 20 },
});
