import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';

const LOADING_MASCOT = require('../../assets/mascots/serious/listening-frames-normalized/listening-06.png');

type Props = {
  label: string;
};

export function PlayfulLoading({ label }: Props) {
  const reduceMotion = useReducedMotion();
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    motion.stopAnimation();
    if (reduceMotion) {
      motion.setValue(0.5);
      return undefined;
    }

    motion.setValue(0);
    const animation = Animated.loop(
      Animated.timing(motion, {
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [motion, reduceMotion]);

  const mascotLift = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -10, 0],
  });
  const mascotTilt = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-2deg', '2deg', '-2deg'],
  });
  const leftCardLift = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [4, -5, 4],
  });
  const rightCardLift = motion.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-5, 4, -5],
  });

  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessible
      style={styles.container}
    >
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.scene}
      >
        <Animated.View style={[styles.card, styles.leftCard, { transform: [{ translateY: leftCardLift }, { rotate: '-8deg' }] }]}>
          <Text style={styles.cardEyebrow}>ENGLISH</Text>
          <Text style={styles.cardWord}>HELLO!</Text>
        </Animated.View>
        <Animated.Image
          resizeMode="contain"
          source={LOADING_MASCOT}
          style={[styles.mascot, { transform: [{ translateY: mascotLift }, { rotate: mascotTilt }] }]}
        />
        <Animated.View style={[styles.card, styles.rightCard, { transform: [{ translateY: rightCardLift }, { rotate: '8deg' }] }]}>
          <Text style={styles.cardEyebrow}>READY?</Text>
          <Text style={[styles.cardWord, styles.goWord]}>GO!</Text>
        </Animated.View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.dots}>
        {[0, 0.18, 0.36].map((offset, index) => {
          const peak = Math.min(offset + 0.25, 0.78);
          const rest = Math.min(offset + 0.5, 0.92);
          return (
            <Animated.View
              key={offset}
              style={[
                styles.dot,
                index === 1 ? styles.dotMiddle : index === 2 ? styles.dotLast : null,
                {
                  opacity: motion.interpolate({
                    inputRange: [0, peak, rest, 1],
                    outputRange: [0.35, 1, 0.35, 0.35],
                  }),
                  transform: [{
                    scale: motion.interpolate({
                      inputRange: [0, peak, rest, 1],
                      outputRange: [0.85, 1.25, 0.85, 0.85],
                    }),
                  }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  scene: { height: 146, position: 'relative', width: 264 },
  mascot: { height: 132, left: 66, position: 'absolute', top: 8, width: 132, zIndex: 2 },
  card: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2,
    elevation: 3,
    justifyContent: 'center',
    minHeight: 70,
    paddingHorizontal: 10,
    position: 'absolute',
    shadowColor: '#24333a',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    top: 38,
    width: 88,
  },
  leftCard: { backgroundColor: '#ffe1ad', borderColor: '#e6a84a', left: 2 },
  rightCard: { backgroundColor: '#dff4ef', borderColor: '#8bc9ba', right: 2 },
  cardEyebrow: { color: '#6f604e', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  cardWord: { color: '#c94d24', fontSize: 15, fontWeight: '900', marginTop: 4 },
  goWord: { color: '#16766f' },
  label: { color: '#24333a', fontSize: 18, fontWeight: '900', lineHeight: 23, marginTop: 3, textAlign: 'center' },
  dots: { flexDirection: 'row', marginTop: 11 },
  dot: { backgroundColor: '#e96f42', borderRadius: 5, height: 9, width: 9 },
  dotMiddle: { backgroundColor: '#e6a84a', marginLeft: 7 },
  dotLast: { backgroundColor: '#16766f', marginLeft: 7 },
});
