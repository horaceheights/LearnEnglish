import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { TutorActivityState } from '../tutorPresentation';

export function TutorActivity({ state = 'available', active = true, level = 0 }: {
  state?: TutorActivityState; active?: boolean; level?: number;
}) {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion || !active) { pulse.setValue(0); orbit.setValue(0); return; }
    const animation = Animated.parallel([
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.timing(orbit, { toValue: 1, duration: state === 'thinking' ? 1200 : 4200, easing: Easing.linear, useNativeDriver: true })),
    ]);
    animation.start();
    return () => { animation.stop(); orbit.setValue(0); };
  }, [active, orbit, pulse, reducedMotion, state]);
  const voice = state === 'speaking' || state === 'listening';
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.visual}>
    <Animated.View style={[styles.halo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.45] }) }] }]} />
    <Animated.View style={[styles.orbit, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
      <View style={styles.sparkleOne} /><View style={styles.sparkleTwo} />
    </Animated.View>
    <View style={styles.core}>
      {voice ? <View style={styles.wave}>{[0.45, 0.85, 1, 0.65, 0.4].map((height, index) =>
        <Animated.View key={index} style={[styles.bar, { height: 22 * height,
          transform: [{ scaleY: state === 'listening' ? Math.max(0.25, Math.min(1.3, level))
            : pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: index % 2 ? [0.4, 1, 0.6] : [1, 0.4, 1] }) }] }]} />)}</View>
        : <Ionicons name="sparkles" color="#ecfff7" size={23} />}
      <Text allowFontScaling={false} style={styles.label}>IA</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  visual: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  core: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#106e70', borderWidth: 2, borderColor: '#afffeb', alignItems: 'center', justifyContent: 'center', shadowColor: '#16cbb9', shadowOpacity: 0.65, shadowRadius: 9, elevation: 6 },
  halo: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#31e0c4', borderWidth: 2, borderColor: '#83ffe6' },
  orbit: { position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: '#4ce8d077', zIndex: 1 },
  sparkleOne: { position: 'absolute', top: -3, left: 23, width: 6, height: 6, borderRadius: 2, backgroundColor: '#fff7b3', transform: [{ rotate: '45deg' }] },
  sparkleTwo: { position: 'absolute', bottom: -2, left: 23, width: 4, height: 4, borderRadius: 2, backgroundColor: '#bcfff0' },
  label: { fontSize: 10, lineHeight: 11, fontWeight: '900', letterSpacing: 1, color: '#ecfff7' },
  wave: { height: 23, flexDirection: 'row', gap: 2, alignItems: 'center' }, bar: { width: 3, borderRadius: 2, backgroundColor: '#caffec' },
});
