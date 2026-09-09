"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { capturePage, createPageCurl } from './pageCurl';
import { PAGE_TURN_MS } from '../../mobile/src/pageCurlGeometry';
export { PAGE_TURN_MS } from '../../mobile/src/pageCurlGeometry';

export default function useLessonPageTurn({ onStart, onFinish }) {
  const pageRef = useRef(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const overlay = useRef(null);
  const frame = useRef(null);
  const timer = useRef(null);
  const pendingNavigation = useRef(null);
  const callbacks = useRef({ onStart, onFinish });
  callbacks.current = { onStart, onFinish };
  const [isPageTurning, setIsPageTurning] = useState(false);

  const finish = useCallback(() => {
    generation.current += 1;
    window.clearTimeout(timer.current);
    timer.current = null;
    window.cancelAnimationFrame(frame.current);
    overlay.current?.remove();
    overlay.current = null;
    if (busy.current) callbacks.current.onFinish();
    busy.current = false;
    setIsPageTurning(false);
    const navigate = pendingNavigation.current;
    pendingNavigation.current = null;
    navigate?.();
  }, []);

  const startPageTurn = useCallback((direction, navigate) => {
    if (busy.current) return false;
    if (!pageRef.current || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate();
      return true;
    }
    busy.current = true;
    setIsPageTurning(true);
    pendingNavigation.current = navigate;
    const run = ++generation.current;
    timer.current = window.setTimeout(finish, 800);
    capturePage(pageRef.current).then(capture => {
      if (run !== generation.current) return;
      overlay.current = createPageCurl(capture, direction);
      window.clearTimeout(timer.current);
      pendingNavigation.current = null;
      navigate();
      callbacks.current.onStart();
      const start = performance.now();
      const draw = now => {
        if (run !== generation.current) return;
        const p = Math.min(1, (now - start) / PAGE_TURN_MS);
        const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        overlay.current.draw(eased);
        if (p < 1) frame.current = window.requestAnimationFrame(draw);
      };
      frame.current = window.requestAnimationFrame(draw);
      timer.current = window.setTimeout(finish, PAGE_TURN_MS);
    }).catch(() => { if (run === generation.current) finish(); });
    return true;
  }, [finish]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cancelWhenHidden = () => { if (document.hidden) finish(); };
    const cancelWhenReduced = () => { if (preference.matches) finish(); };
    document.addEventListener('visibilitychange', cancelWhenHidden);
    preference.addEventListener('change', cancelWhenReduced);
    window.addEventListener('resize', finish);
    window.addEventListener('scroll', finish, true);
    return () => {
      document.removeEventListener('visibilitychange', cancelWhenHidden);
      preference.removeEventListener('change', cancelWhenReduced);
      window.removeEventListener('resize', finish);
      window.removeEventListener('scroll', finish, true);
      pendingNavigation.current = null;
      finish();
    };
  }, [finish]);

  return { pageRef, busy, isPageTurning, startPageTurn };
}
