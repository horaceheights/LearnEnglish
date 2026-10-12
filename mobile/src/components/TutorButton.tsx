import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function TutorButton({ onPress, more = false, active = true, compact = false }: { onPress: () => void; more?: boolean; active?: boolean; compact?: boolean }) {
  const reducedMotion = useReducedMotion();
  const glow = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    if (reducedMotion || !active || more) { glow.setValue(0.25); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.7, duration: 1800, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.25, duration: 1800, useNativeDriver: true }),
    ]));
    animation.start(); return () => animation.stop();
  }, [active, glow, more, reducedMotion]);
  return <Pressable accessibilityRole="button" accessibilityLabel={more ? 'Saber más con el tutor IA' : 'Abrir tutor IA'}
    onPress={onPress} style={[styles.button, more && styles.more, compact && styles.compact]}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, { opacity: glow }]} />
    <View style={styles.icon}><Ionicons name="chatbubble-outline" color="#176f73" size={24} />
      <Ionicons name="sparkles" color="#176f73" size={12} style={styles.sparkle} /></View>
    {!compact ? <Text maxFontSizeMultiplier={1.3} style={styles.text}>{more ? 'Saber más' : 'IA'}</Text> : null}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 48, minWidth: 58, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1, borderColor: '#85bdb0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#fffdf7' },
  more: { alignSelf: 'center', paddingHorizontal: 16, marginTop: 5 },
  compact: { width: 48, minWidth: 48, paddingHorizontal: 0 },
  glow: { backgroundColor: '#b3e5d8', borderRadius: 15 },
  icon: { width: 26, height: 26 }, sparkle: { position: 'absolute', right: 2, top: 5 },
  text: { color: '#176f73', fontSize: 15, fontWeight: '800' },
});
