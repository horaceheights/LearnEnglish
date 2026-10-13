import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { AudioModule, type AudioPlayer } from 'expo-audio';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { LIAM_HEIGHT, LIAM_LAYERS, LIAM_WIDTH, liamPose, liamSpeechLevel, type LiamLayer, type LiamState } from '../liamAnimation';

type Motion = Record<keyof ReturnType<typeof liamPose>, Animated.Value>;
function Layer({ layer, motion }: { layer: LiamLayer; motion: Motion }) {
  const { rotate, ...style } = layer.style;
  let movement: Animated.WithAnimatedValue<ViewStyle> = rotate ? { transform: [{ rotate: `${rotate}deg` }] } : {};
  if (layer.name === 'head') movement = { transformOrigin: '50% 95%', transform: [{ translateX: motion.x }, { translateY: motion.y }, { rotate: motion.roll.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] }) }] };
  if (layer.name === 'body') movement = { transform: [{ translateY: motion.breath }] };
  if (layer.name === 'eye') movement = { transform: [{ scaleY: motion.blink }] };
  if (layer.name === 'mouth') movement = { transform: [{ scaleY: motion.mouth }] };
  if (layer.name === 'brow') movement = { transform: [{ translateY: motion.brow }, { rotate: `${rotate || 0}deg` }] };
  return <Animated.View style={[style as ViewStyle, movement]}>{layer.children?.map((child, index) => <Layer key={index} layer={child} motion={motion} />)}</Animated.View>;
}

export function LiamAvatar({ speaking = false, active = true, state = speaking ? 'speaking' : 'idle', player, size = 184 }: {
  speaking?: boolean; active?: boolean; state?: LiamState; player?: AudioPlayer; size?: number;
}) {
  const reduced = useReducedMotion();
  const animationOrigin = useRef(Date.now());
  const sample = useRef<{ level: number; at: number } | null>(null);
  const motion = useRef<Motion>({ mouth: new Animated.Value(.12), blink: new Animated.Value(1),
    x: new Animated.Value(0), y: new Animated.Value(0), roll: new Animated.Value(0), brow: new Animated.Value(0), breath: new Animated.Value(0) }).current;
  useEffect(() => {
    sample.current = null;
    if (!active || !speaking || reduced || !player?.isAudioSamplingSupported) return;
    let cancelled = false;
    let subscription: { remove(): void } | undefined;
    void (async () => {
      // Playback sampling must never open a microphone permission prompt.
      if (Platform.OS === 'android' && !(await AudioModule.getRecordingPermissionsAsync()).granted) return;
      if (cancelled) return;
      subscription = player.addListener('audioSampleUpdate', data => {
        sample.current = { level: liamSpeechLevel(data.channels[0]?.frames || []), at: Date.now() };
      });
      player.setAudioSamplingEnabled(true);
    })().catch(() => { /* Speaking-gated motion remains available without samples. */ });
    return () => {
      cancelled = true; subscription?.remove(); sample.current = null;
      try { player.setAudioSamplingEnabled(false); } catch { /* Player may already be released. */ }
    };
  }, [active, player, reduced, speaking]);
  useEffect(() => {
    let frame = 0, last = 0, mouth = .12;
    const start = animationOrigin.current;
    const draw = () => {
      const now = Date.now();
      if (now - last >= 33) {
        const level = sample.current && now - sample.current.at < 300 ? sample.current.level : null;
        const pose = liamPose(now - start, state, level, reduced || !active);
        mouth += (pose.mouth - mouth) * .65; pose.mouth = mouth;
        for (const key of Object.keys(pose) as (keyof Motion)[]) motion[key].setValue(pose[key]);
        last = now;
      }
      if (active && !reduced) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active, motion, reduced, state]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[styles.stage, { width: size, height: size * LIAM_HEIGHT / LIAM_WIDTH }]}>
    <View style={[styles.canvas, { transform: [{ scale: size / LIAM_WIDTH }], left: (size - LIAM_WIDTH) / 2, top: (size * LIAM_HEIGHT / LIAM_WIDTH - LIAM_HEIGHT) / 2 }]}>
      <View style={styles.halo} />
      {LIAM_LAYERS.map((layer, index) => <Layer key={index} layer={layer} motion={motion} />)}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  stage: { overflow: 'hidden', borderRadius: 28 },
  canvas: { position: 'absolute', width: LIAM_WIDTH, height: LIAM_HEIGHT },
  halo: { position: 'absolute', top: 8, left: 5, width: 230, height: 230, borderRadius: 115, backgroundColor: '#daebe2', borderWidth: 1, borderColor: '#c1dace' },
});
