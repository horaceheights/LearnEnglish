import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
export function LiamAvatar({ speaking = false, active = true }: { speaking?: boolean; active?: boolean }) {
  const reduced = useReducedMotion();
  const mouth = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!speaking || !active || reduced) { mouth.setValue(1); return; }
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(mouth, { toValue: 2, duration: 190, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(mouth, { toValue: .7, duration: 150, useNativeDriver: true }),
    ]));
    motion.start();
    return () => { motion.stop(); mouth.setValue(1); };
  }, [active, mouth, reduced, speaking]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
    <View style={styles.shirt} /><View style={styles.face}><View style={styles.hair} />
      <View style={styles.eyes}><View style={styles.eye} /><View style={styles.eye} /></View>
      <Animated.View style={[styles.mouth, { transform: [{ scaleY: mouth }] }]} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: '#cbe4dc', borderWidth: 2, borderColor: '#96c4b4', marginRight: 8 },
  face: { position: 'absolute', left: 16, top: 8, width: 31, height: 40, backgroundColor: '#e5ac84', borderRadius: 14 },
  hair: { position: 'absolute', left: -2, top: -3, width: 35, height: 15, borderTopLeftRadius: 16, borderTopRightRadius: 18, borderBottomRightRadius: 5, backgroundColor: '#513e35', transform: [{ rotate: '-7deg' }] },
  eyes: { position: 'absolute', left: 7, right: 7, top: 20, flexDirection: 'row', justifyContent: 'space-between' },
  eye: { width: 3, height: 4, borderRadius: 2, backgroundColor: '#40332e' },
  mouth: { position: 'absolute', left: 10, top: 29, width: 12, height: 4, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: '#8f4940' },
  shirt: { position: 'absolute', left: 8, top: 44, width: 48, height: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#27796b' },
});
