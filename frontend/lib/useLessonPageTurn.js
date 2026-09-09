"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_TURN_MS = 520;

export default function useLessonPageTurn({ onStart, onFinish }) {
  const pageRef = useRef(null);
  const busy = useRef(false);
  const animation = useRef(null);
  const timer = useRef(null);
  const callbacks = useRef({ onStart, onFinish });
  callbacks.current = { onStart, onFinish };
  const [isPageTurning, setIsPageTurning] = useState(false);

  const finish = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = null;
    animation.current?.cancel();
    animation.current = null;
    if (busy.current) callbacks.current.onFinish();
    busy.current = false;
    setIsPageTurning(false);
  }, []);

  const startPageTurn = useCallback((direction = 1) => {
    if (busy.current) return false;
    if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    busy.current = true;
    setIsPageTurning(true);
    callbacks.current.onStart();
    const origin = direction > 0 ? "left center" : "right center";
    animation.current = pageRef.current?.animate?.([
      { opacity: 0.45, transformOrigin: origin, transform: `perspective(1200px) translateX(${direction * 42}%) rotateY(${direction * -48}deg) rotateZ(${direction * 3}deg)` },
      { opacity: 1, transformOrigin: origin, transform: "perspective(1200px) translateX(0) rotateY(0) rotateZ(0)" },
    ], { duration: PAGE_TURN_MS, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" });
    timer.current = window.setTimeout(finish, PAGE_TURN_MS);
    return true;
  }, [finish]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cancelWhenHidden = () => { if (document.hidden) finish(); };
    const cancelWhenReduced = () => { if (preference.matches) finish(); };
    document.addEventListener("visibilitychange", cancelWhenHidden);
    preference.addEventListener("change", cancelWhenReduced);
    return () => {
      document.removeEventListener("visibilitychange", cancelWhenHidden);
      preference.removeEventListener("change", cancelWhenReduced);
      finish();
    };
  }, [finish]);

  return { pageRef, busy, isPageTurning, startPageTurn };
}
