import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

const MASCOT = require('../../assets/mascots/serious/squirrel-professor-celebrating-v1.png');

// Presentation only: answer audio and advancement stay owned by the lesson.
export function useConstructionCelebration(active: boolean) {
  const reduceMotion = useReducedMotion();
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    lift.setValue(0);
    if (!active || reduceMotion) return;
    const animation = Animated.sequence([
      Animated.timing(lift, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 420, easing: Easing.bounce, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [active, lift, reduceMotion]);
  return lift;
}

export function ConstructionCelebration({ lift, compact = false }: { lift: Animated.Value; compact?: boolean }) {
  return <View testID="construction-celebration" style={[styles.root, compact ? styles.compact : null]}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      pointerEvents="none" style={[styles.scene, compact ? styles.sceneCompact : null]}>
      <Text style={[styles.star, styles.leftStar]}>✦</Text>
      <Animated.View style={{ transform: [
        { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
        { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
      ] }}>
        <Image source={MASCOT} resizeMode="contain" style={compact ? styles.mascotCompact : styles.mascot} />
      </Animated.View>
      <Text style={[styles.star, styles.rightStar]}>✦</Text>
    </View>
    <View accessible accessibilityLiveRegion="polite" accessibilityLabel="¡Perfecto! ¡Buen trabajo!" style={styles.copy}>
      <Text maxFontSizeMultiplier={compact ? 1.3 : undefined} style={[styles.title, compact ? styles.titleCompact : null]}>¡Perfecto!</Text>
      <Text maxFontSizeMultiplier={compact ? 1.3 : undefined} style={[styles.message, compact ? styles.messageCompact : null]}>¡Buen trabajo!</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 8 },
  compact: { flexDirection: 'row', gap: 12, paddingVertical: 0 },
  scene: { width: 152, height: 124, alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 },
  sceneCompact: { width: 96, height: 80 },
  mascot: { width: 112, height: 112 },
  mascotCompact: { width: 72, height: 72 },
  star: { position: 'absolute', fontSize: 22, color: '#d29b23' },
  leftStar: { left: 0, top: 20 },
  rightStar: { right: 0, top: 8 },
  copy: { flexShrink: 1, alignItems: 'center' },
  title: { color: '#17623f', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  titleCompact: { fontSize: 24 },
  message: { color: '#17623f', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  messageCompact: { fontSize: 20 },
});
