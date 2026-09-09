import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

export const PAGE_TURN_MS = 520;

// Animate the arriving activity without retaining another live media/microphone tree.
export function useLessonPageTurn({
  active, reduceMotion, width, onStart, onFinish,
}: {
  active: boolean;
  reduceMotion: boolean;
  width: number;
  onStart: () => void;
  onFinish: () => void;
}) {
  const turn = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onStart, onFinish });
  callbacks.current = { onStart, onFinish };
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const finish = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    turn.stopAnimation();
    turn.setValue(0);
    if (busy.current) callbacks.current.onFinish();
    busy.current = false;
    setIsPageTurning(false);
  }, [turn]);

  const startPageTurn = useCallback((nextDirection: 1 | -1 = 1) => {
    if (busy.current || !active) return false;
    if (reduceMotion) return true;
    busy.current = true;
    setIsPageTurning(true);
    setDirection(nextDirection);
    turn.setValue(nextDirection);
    callbacks.current.onStart();
    Animated.timing(turn, {
      toValue: 0,
      duration: PAGE_TURN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Speech release is bounded even if a native animation callback is lost.
    timer.current = setTimeout(finish, PAGE_TURN_MS);
    return true;
  }, [active, finish, reduceMotion, turn]);

  useEffect(() => {
    if (!active || reduceMotion) finish();
  }, [active, finish, reduceMotion]);
  useEffect(() => finish, [finish]);

  return {
    busy, isPageTurning, startPageTurn,
    pageTurnStyle: {
      opacity: turn.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.45, 1, 0.45] }),
      transformOrigin: direction > 0 ? 'left center' : 'right center',
      transform: [
        { perspective: 1200 },
        { translateX: turn.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width * 0.42, 0, width * 0.42] }) },
        { rotateY: turn.interpolate({ inputRange: [-1, 0, 1], outputRange: ['48deg', '0deg', '-48deg'] }) },
        { rotateZ: turn.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-3deg', '0deg', '3deg'] }) },
      ],
    },
  };
}
