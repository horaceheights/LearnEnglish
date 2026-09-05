"use client";

import { useCallback, useEffect, useRef } from "react";

const STATIC_SFX_PATHS = Object.freeze({
  missionFinale: "/sfx/mission-finale-v1.mp3",
  pageRestored: "/sfx/page-restored-v1.mp3",
  pageTurn: "/sfx/page-turn-v1.mp3",
  readyCue: "/sfx/ready-cue-v2.mp3",
  tilePlace: "/sfx/tile-place-v1.mp3",
  tryAgain: "/sfx/try-again-v1.mp3",
  voiceStamp: "/sfx/voice-stamp-v1.mp3",
});

const MINIMUM_DEBOUNCE_MS = 80;

export default function useStaticSfx({ enabled = true, muted = false } = {}) {
  const activeAudioRef = useRef(null);
  const cancelActivePlaybackRef = useRef(null);
  const lastPlayedAtRef = useRef(new Map());
  const reduceStimulationRef = useRef(false);

  const stop = useCallback(() => {
    if (cancelActivePlaybackRef.current) {
      cancelActivePlaybackRef.current();
      return;
    }
    const activeAudio = activeAudioRef.current;
    if (!activeAudio) return;
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudioRef.current = null;
  }, []);

  useEffect(() => {
    const stimulationQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateStimulationPreference = () => {
      reduceStimulationRef.current = stimulationQuery.matches;
      if (stimulationQuery.matches) stop();
    };

    updateStimulationPreference();
    stimulationQuery.addEventListener?.("change", updateStimulationPreference);
    return () => stimulationQuery.removeEventListener?.("change", updateStimulationPreference);
  }, [stop]);

  useEffect(() => {
    if (!enabled || muted) stop();
  }, [enabled, muted, stop]);

  useEffect(() => stop, [stop]);

  const play = useCallback((cue, options = {}) => {
    if (
      !enabled
      || muted
      || reduceStimulationRef.current
      || typeof window === "undefined"
      || typeof window.Audio !== "function"
    ) {
      return Promise.resolve(false);
    }

    const source = STATIC_SFX_PATHS[cue];
    if (!source) return Promise.resolve(false);

    const now = window.performance?.now?.() ?? Date.now();
    const debounceMs = Math.max(MINIMUM_DEBOUNCE_MS, options.debounceMs ?? 120);
    const lastPlayedAt = lastPlayedAtRef.current.get(cue) ?? Number.NEGATIVE_INFINITY;
    if (now - lastPlayedAt < debounceMs) return Promise.resolve(false);

    const activeAudio = activeAudioRef.current;
    if (activeAudio) {
      if (options.restart === false) return Promise.resolve(false);
      stop();
    }

    lastPlayedAtRef.current.set(cue, now);
    const audio = new window.Audio(source);
    audio.preload = "auto";
    audio.volume = Math.min(1, Math.max(0, options.volume ?? 0.55));
    activeAudioRef.current = audio;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId;
      let cancel;
      const finish = (played) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        if (activeAudioRef.current === audio) activeAudioRef.current = null;
        if (cancelActivePlaybackRef.current === cancel) cancelActivePlaybackRef.current = null;
        resolve(played);
      };
      cancel = () => {
        audio.pause();
        audio.currentTime = 0;
        finish(false);
      };

      cancelActivePlaybackRef.current = cancel;
      audio.addEventListener("ended", () => finish(true), { once: true });
      audio.addEventListener("error", () => finish(false), { once: true });
      timeoutId = window.setTimeout(cancel, Math.max(250, options.timeoutMs ?? 4000));
      audio.play().catch(() => finish(false));
    });
  }, [enabled, muted, stop]);

  return { play, stop };
}
