import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { clampTutorPosition, initialTutorPosition, tutorDragMoved, type TutorBounds, type TutorPoint } from '../tutorPresentation';
import { TutorActivity } from './TutorActivity';

export function FloatingTutorButton({ onPress, visible, topInset = 0 }: { onPress: () => void; visible: boolean; topInset?: number }) {
  const [bounds, setBounds] = useState<TutorBounds>({ left: 6, top: 6, right: 54, bottom: 54 });
  const [point, setPoint] = useState<TutorPoint | null>(null);
  const current = useRef({ bounds, point: point ?? initialTutorPosition(bounds) });
  current.current = { bounds, point: clampTutorPosition(point ?? initialTutorPosition(bounds), bounds) };
  const origin = useRef<TutorPoint | null>(null);
  const moved = useRef(false);
  useEffect(() => { if (origin.current) moved.current = true; origin.current = null; }, [bounds, visible]);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => tutorDragMoved(gesture.dx, gesture.dy),
    onPanResponderGrant: () => { origin.current = current.current.point; moved.current = true; },
    onPanResponderMove: (_, gesture) => {
      if (!origin.current) return;
      setPoint(clampTutorPosition({ x: origin.current.x + gesture.dx, y: origin.current.y + gesture.dy }, current.current.bounds));
    },
    onPanResponderRelease: () => { origin.current = null; },
    onPanResponderTerminate: () => { origin.current = null; },
    onPanResponderTerminationRequest: () => false,
  }), []);
  if (!visible) return null;
  const position = current.current.point;
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { top: topInset }]} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    setBounds(previous => previous.right === width - 6 && previous.bottom === height - 6 ? previous
      : { left: 6, top: 6, right: width - 6, bottom: height - 6 });
  }}>
    <View {...responder.panHandlers} style={[styles.position, { left: position.x, top: position.y }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir tutor IA" accessibilityHint="Toca para preguntar. Arrastra para mover el botón."
        onPressIn={() => { moved.current = false; }} onPress={() => { if (!moved.current) onPress(); }}
        accessibilityActions={[{ name: 'increment', label: 'Mover hacia abajo' }, { name: 'decrement', label: 'Mover hacia arriba' },
          { name: 'left', label: 'Mover a la izquierda' }, { name: 'right', label: 'Mover a la derecha' }, { name: 'reset', label: 'Volver a la posición inicial' }]}
        onAccessibilityAction={event => {
          const action = event.nativeEvent.actionName;
          if (action === 'reset') { setPoint(null); return; }
          const { point: p, bounds: b } = current.current;
          setPoint(clampTutorPosition({ x: p.x + (action === 'left' ? -48 : action === 'right' ? 48 : 0),
            y: p.y + (action === 'increment' ? 48 : action === 'decrement' ? -48 : 0) }, b));
        }} style={styles.button}><TutorActivity /></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  position: { position: 'absolute', zIndex: 20, width: 48, height: 48 },
  button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
