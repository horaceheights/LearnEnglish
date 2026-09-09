import React, { useMemo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { CURL_SAMPLES, CURL_STRIPS, curlFold, curlShadow, curlStrip } from '../pageCurlGeometry';
import type { PageSnapshot } from '../hooks/useLessonPageTurn';

const inputs = Array.from({ length: CURL_SAMPLES }, (_, i) => i / (CURL_SAMPLES - 1));
// The sheet darkens the page it uncovers. Without a gradient the penumbra is
// stacked from a few fixed bands and only its position and strength animate.
const SHADOW_BANDS = 14;
const SHADOW_SPREAD = 0.11;
// Paper is thin enough to pass a little of its own print through the reverse.
const BACK_OPACITY = 0.94;

export function LessonPageCurl({ snapshot, turn, onReady }: {
  snapshot: PageSnapshot; turn: Animated.Value; onReady: () => void;
}) {
  const { width, height, uri, direction } = snapshot;
  const strips = useMemo(() => Array.from({ length: CURL_STRIPS }, (_, index) => {
    const frames = inputs.map(progress => curlStrip(index, progress, width, direction));
    const interpolate = (key: keyof ReturnType<typeof curlStrip>) => turn.interpolate({
      inputRange: inputs, outputRange: frames.map(frame => frame[key]),
    });
    return { index, x: interpolate('x'), y: interpolate('y'), scaleX: interpolate('scaleX'),
      scaleY: interpolate('scaleY'), back: interpolate('back'), shade: interpolate('shade'),
      gloss: interpolate('gloss') };
  }), [direction, turn, width]);
  const shadow = useMemo(() => {
    const folds = inputs.map(progress => {
      const fold = curlFold(progress, width);
      return direction > 0 ? fold : width - fold;
    });
    return {
      x: turn.interpolate({ inputRange: inputs, outputRange: folds }),
      opacity: turn.interpolate({ inputRange: inputs, outputRange: inputs.map(curlShadow) }),
    };
  }, [direction, turn, width]);
  const sliceWidth = width / CURL_STRIPS;
  const shadowWidth = width * SHADOW_SPREAD;
  const bandWidth = shadowWidth / SHADOW_BANDS;

  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={styles.overlay}>
    {/* Painted before the sheet so the page never casts a shadow onto itself. */}
    <Animated.View style={{ position: 'absolute', top: 0, height, width: shadowWidth,
      left: direction > 0 ? -shadowWidth : 0, opacity: shadow.opacity,
      transform: [{ translateX: shadow.x }] }}>
      {Array.from({ length: SHADOW_BANDS }, (_, band) => {
        // Reaches full strength against the fold; curlShadow sets the overall depth,
        // so these bands must only shape the falloff.
        const nearness = direction > 0 ? (band + 1) / SHADOW_BANDS : (SHADOW_BANDS - band) / SHADOW_BANDS;
        return <View key={band} style={{ position: 'absolute', top: 0, height, left: band * bandWidth,
          width: bandWidth + 0.5, backgroundColor: `rgba(37,48,66,${(nearness * nearness).toFixed(3)})` }} />;
      })}
    </Animated.View>
    {strips.map(strip => {
      const sourceIndex = direction > 0 ? strip.index : CURL_STRIPS - 1 - strip.index;
      return <Animated.View key={strip.index} style={{
        position: 'absolute', left: -sliceWidth / 2, top: 0, width: sliceWidth + 1.2, height,
        transformOrigin: [sliceWidth / 2, height / 2, 0],
        overflow: 'hidden', backgroundColor: '#fffdf7',
        transform: [{ translateX: strip.x }, { translateY: strip.y },
          { scaleX: strip.scaleX }, { scaleY: strip.scaleY }],
      }}>
        <Image source={{ uri }} resizeMode="stretch" fadeDuration={0}
          onLoad={strip.index === 0 ? onReady : undefined}
          style={{ position: 'absolute', left: -sourceIndex * sliceWidth, top: 0, width, height }} />
        <Animated.View style={[StyleSheet.absoluteFill,
          { backgroundColor: `rgba(255,253,247,${BACK_OPACITY})`, opacity: strip.back }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#253042', opacity: strip.shade }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fffef6', opacity: strip.gloss }]} />
      </Animated.View>;
    })}
  </View>;
}

const styles = StyleSheet.create({ overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', zIndex: 20 } });
