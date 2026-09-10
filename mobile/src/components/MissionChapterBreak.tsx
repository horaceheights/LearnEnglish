import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import type { MissionChapterBreak as MissionChapterBreakContent } from '../missionChapterBreak';

type Props = {
  content: MissionChapterBreakContent;
  onDone: () => void;
};

// Long enough to read two short lines without hurrying, short enough that it
// never becomes a screen to get past. The mission runs continuously, so this
// closes itself.
const VISIBLE_MS = 5200;

export function MissionChapterBreak({ content, onDone }: Props) {
  const reducedMotion = useReducedMotion();
  const enter = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const countdown = useRef(new Animated.Value(0)).current;
  // onDone identity can move between renders; the countdown must not restart
  // when it does, or a re-render would hold the moment open indefinitely.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(enter, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }

    // The bar is the timer rather than a decoration beside one, so what the
    // learner watches fill is exactly what decides when the mission resumes.
    // Width cannot be driven natively, which is the cost of that honesty.
    const countdownRun = Animated.timing(countdown, {
      duration: VISIBLE_MS,
      easing: Easing.linear,
      toValue: 1,
      useNativeDriver: false,
    });
    countdownRun.start(({ finished }) => {
      if (finished) onDoneRef.current();
    });
    return () => countdownRun.stop();
  }, [countdown, enter, reducedMotion]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.overlay,
        {
          opacity: enter,
          transform: [{
            translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
          }],
        },
      ]}
    >
      {/* Tapping moves on early rather than dismissing to nothing, so a learner
          who has already read it is never made to wait. */}
      <Pressable
        accessibilityHint="Toca para continuar la misión."
        accessibilityLabel={`Acto ${content.actNumber} de ${content.actCount} completado: ${content.doneTitle}. Sigue: ${content.nextTitle}. ${content.nextObjective}`}
        accessibilityRole="button"
        onPress={onDone}
        style={styles.card}
      >
        <View style={styles.doneRow}>
          <Ionicons color="#ffd489" name="checkmark-circle" size={22} />
          <Text style={styles.doneLabel}>
            {`ACTO ${content.actNumber} DE ${content.actCount} COMPLETADO`}
          </Text>
        </View>
        <Text style={styles.doneTitle}>{content.doneTitle}</Text>

        <View style={styles.rule} />

        <Text style={styles.nextLabel}>AHORA SIGUE</Text>
        <Text style={styles.nextTitle}>{content.nextTitle}</Text>
        <Text style={styles.nextObjective}>{content.nextObjective}</Text>

        <View style={styles.countdownTrack}>
          <Animated.View
            style={[
              styles.countdownFill,
              {
                width: countdown.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.countdownLabel}>Empieza en un momento…</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(14,40,36,0.93)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 18,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  card: { alignItems: 'center', gap: 5, maxWidth: 460, width: '100%' },
  doneRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  doneLabel: { color: '#ffd489', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  doneTitle: { color: '#fff', fontSize: 21, fontWeight: '900', lineHeight: 25, textAlign: 'center' },
  rule: { backgroundColor: 'rgba(255,212,137,0.55)', borderRadius: 2, height: 2, marginVertical: 11, width: 54 },
  nextLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  nextTitle: { color: '#8fe3c2', fontSize: 19, fontWeight: '900', lineHeight: 23, textAlign: 'center' },
  nextObjective: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
    textAlign: 'center',
  },
  countdownTrack: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    height: 4,
    marginTop: 18,
    overflow: 'hidden',
    width: '62%',
  },
  countdownFill: { backgroundColor: '#ffd489', borderRadius: 999, height: '100%' },
  countdownLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 7,
  },
});
