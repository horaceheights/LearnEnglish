import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { PAGE_TURN_MS } from '../pageCurlGeometry';
export { PAGE_TURN_MS } from '../pageCurlGeometry';

export type PageSnapshot = { uri: string; width: number; height: number; direction: 1 | -1 };
const CAPTURE_TIMEOUT_MS = 350;

export function useLessonPageTurn({ active, reduceMotion, viewportWidth, viewportHeight, onStart, onFinish }: {
  active: boolean; reduceMotion: boolean; onStart: () => void; onFinish: () => void;
  viewportWidth: number; viewportHeight: number;
}) {
  const pageRef = useRef<View>(null);
  const layout = useRef({ width: 0, height: 0 });
  const turn = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const capturedUri = useRef<string | null>(null);
  const callbacks = useRef({ onStart, onFinish });
  callbacks.current = { onStart, onFinish };
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);

  const finish = useCallback(() => {
    generation.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    turn.stopAnimation();
    if (capturedUri.current) releaseCapture(capturedUri.current);
    capturedUri.current = null;
    setSnapshot(null);
    if (busy.current) callbacks.current.onFinish();
    busy.current = false;
    setIsPageTurning(false);
    // A slow/unsupported capture or interrupted animation must never lose a valid advance.
    const navigate = pendingNavigation.current;
    pendingNavigation.current = null;
    navigate?.();
  }, [turn]);

  const revealPage = useCallback(() => {
    if (!busy.current || !capturedUri.current || !pendingNavigation.current) return;
    if (timer.current) clearTimeout(timer.current);
    const navigate = pendingNavigation.current;
    pendingNavigation.current = null;
    navigate();
    callbacks.current.onStart();
    Animated.timing(turn, {
      toValue: 1, duration: PAGE_TURN_MS,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
    }).start();
    timer.current = setTimeout(finish, PAGE_TURN_MS);
  }, [finish, turn]);

  const startPageTurn = useCallback((direction: 1 | -1, navigate: () => void) => {
    if (busy.current || !active) return false;
    if (reduceMotion || !pageRef.current || !layout.current.width || !layout.current.height) {
      navigate();
      return true;
    }
    busy.current = true;
    setIsPageTurning(true);
    pendingNavigation.current = navigate;
    turn.setValue(0);
    const run = ++generation.current;
    // Capture only this activity; never transmit or retain the image beyond this turn.
    timer.current = setTimeout(finish, CAPTURE_TIMEOUT_MS);
    const pixelWidth = Math.min(layout.current.width * 2, 1600);
    captureRef(pageRef, { format: 'png', result: 'tmpfile', handleGLSurfaceViewOnAndroid: true,
      width: pixelWidth, height: pixelWidth * layout.current.height / layout.current.width }).then(uri => {
      if (run !== generation.current) { releaseCapture(uri); return; }
      capturedUri.current = uri;
      setSnapshot({ uri, ...layout.current, direction });
    }).catch(() => { if (run === generation.current) finish(); });
    return true;
  }, [active, finish, reduceMotion, turn]);

  const onPageLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.layout;
    layout.current = { width, height };
  }, []);

  useEffect(() => { if (!active || reduceMotion) finish(); }, [active, finish, reduceMotion]);
  useEffect(() => { finish(); }, [finish, viewportHeight, viewportWidth]);
  useEffect(() => () => { pendingNavigation.current = null; finish(); }, [finish]);

  return { pageRef, onPageLayout, busy, isPageTurning, startPageTurn, snapshot, turn, revealPage };
}
