import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { bubbleLayout, type SpeakerAnchor } from '../speakerBubble';

/**
 * A small speech bubble over the person who is talking (user decision, 2026-11-12). It is drawn
 * from Views only, never an Image, sits above the photo without catching touches, and pulses while
 * that person's voice plays.
 */
export function SpeakerBubble({ anchor, speaking = false }: { anchor: SpeakerAnchor | null; speaking?: boolean }) {
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!speaking) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.18, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, speaking]);

  if (!anchor) return null;
  const layout = bubbleLayout(anchor, frame.width, frame.height);
  const dot = layout ? Math.max(3, Math.round(layout.width * 0.12)) : 0;
  return <View pointerEvents="none" style={styles.layer}
    onLayout={event => {
      const { width, height } = event.nativeEvent.layout;
      if (width !== frame.width || height !== frame.height) setFrame({ width, height });
    }}>
    {layout ? <Animated.View accessible accessibilityRole="image" accessibilityLabel="Persona que habla"
      testID="speaker-bubble"
      style={[styles.bubble, {
        left: layout.left, top: layout.top, width: layout.width, height: layout.height + layout.tail,
        transform: [{ translateY: (layout.height + layout.tail) / 2 }, { scale: pulse },
          { translateY: -(layout.height + layout.tail) / 2 }],
      }]}>
      <View style={[styles.tail, {
        width: layout.tail * 1.25, height: layout.tail * 1.25,
        left: Math.min(Math.max(layout.tailX, layout.width * 0.38), layout.width * 0.62) - (layout.tail * 1.25) / 2, top: layout.height - (layout.tail * 1.25) / 2 - 1,
      }]} />
      <View style={[styles.body, { height: layout.height, borderRadius: layout.height * 0.4, gap: dot * 0.7 }]}>
        {DOT_COLORS.map((color, index) => <View key={index} style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />)}
      </View>
    </Animated.View> : null}
  </View>;
}

const DOT_COLORS = ['#e8613c', '#2f7fd8', '#e8613c'];

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 4 },
  bubble: { position: 'absolute' },
  body: {
    position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fffef9', borderWidth: 1.5, borderColor: '#173e3b',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  tail: {
    position: 'absolute', backgroundColor: '#fffef9', borderColor: '#173e3b', borderRightWidth: 1.5, borderBottomWidth: 1.5,
    transform: [{ rotate: '45deg' }], elevation: 3,
  },
});
