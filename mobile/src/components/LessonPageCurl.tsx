import React, { useMemo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { CURL_SAMPLES, CURL_STRIPS, curlStrip } from '../pageCurlGeometry';
import type { PageSnapshot } from '../hooks/useLessonPageTurn';

const inputs = Array.from({ length: CURL_SAMPLES }, (_, i) => i / (CURL_SAMPLES - 1));

export function LessonPageCurl({ snapshot, turn, onReady }: {
  snapshot: PageSnapshot; turn: Animated.Value; onReady: () => void;
}) {
  const { width, height, uri, direction } = snapshot;
  const strips = useMemo(() => Array.from({ length: CURL_STRIPS }, (_, index) => {
    const frames = inputs.map(progress => curlStrip(index, progress, width, direction));
    const interpolate = (key: keyof ReturnType<typeof curlStrip>) => turn.interpolate({
      inputRange: inputs, outputRange: frames.map(frame => frame[key]),
    });
    return { index, x: interpolate('x'), scaleX: interpolate('scaleX'), scaleY: interpolate('scaleY'),
      back: interpolate('back'), shade: interpolate('shade') };
  }), [direction, turn, width]);
  const sliceWidth = width / CURL_STRIPS;

  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={styles.overlay}>
    {strips.map(strip => {
      const sourceIndex = direction > 0 ? strip.index : CURL_STRIPS - 1 - strip.index;
      return <Animated.View key={strip.index} style={{
        position: 'absolute', left: -sliceWidth / 2, top: 0, width: sliceWidth + 1.2, height,
        transformOrigin: [sliceWidth / 2, height / 2, 0],
        overflow: 'hidden', backgroundColor: '#fffdf7',
        transform: [{ translateX: strip.x }, { scaleX: strip.scaleX }, { scaleY: strip.scaleY }],
      }}>
        <Image source={{ uri }} resizeMode="stretch" fadeDuration={0}
          onLoad={strip.index === 0 ? onReady : undefined}
          style={{ position: 'absolute', left: -sourceIndex * sliceWidth, top: 0, width, height }} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fffdf7', opacity: strip.back }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#253042', opacity: strip.shade }]} />
      </Animated.View>;
    })}
  </View>;
}

const styles = StyleSheet.create({ overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', zIndex: 20 } });
