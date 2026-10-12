import { useCallback, useEffect, useRef } from 'react';

/** Freeze an in-card mission transition while help/tutor/background interrupts it. */
export function useMissionTransition(paused: boolean, cardKey: string | undefined) {
  const pending = useRef<{ action: () => void; remaining: number; started: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const stop = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current); timer.current = null;
      if (pending.current) pending.current.remaining = Math.max(0, pending.current.remaining - (Date.now() - pending.current.started));
    }
  }, []);
  const start = useCallback(() => {
    if (pausedRef.current || !pending.current || timer.current !== null) return;
    pending.current.started = Date.now();
    timer.current = setTimeout(() => {
      timer.current = null;
      const work = pending.current;
      pending.current = null;
      work?.action();
    }, pending.current.remaining);
  }, []);
  const cancel = useCallback(() => { stop(); pending.current = null; }, [stop]);
  const schedule = useCallback((action: () => void, delay: number) => {
    cancel(); pending.current = { action, remaining: delay, started: Date.now() }; start();
  }, [cancel, start]);
  useEffect(() => { if (paused) stop(); else start(); }, [paused, start, stop]);
  useEffect(() => cancel, [cardKey, cancel]);
  return schedule;
}
