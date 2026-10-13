import { useCallback, useEffect, useRef, useState } from 'react';
import type { TutorMessage } from '../lessonTutor';

/** Reveal a new reply on actual playback, explicit silence, or recoverable failure. */
export function useTutorReplyReveal(messages: TutorMessage[], contextKey: string, enabled: boolean, ready: boolean) {
  const identities = useRef(new WeakMap<TutorMessage, number>());
  const sequence = useRef(0);
  const [released, setReleased] = useState<Set<string>>(() => new Set());
  const last = messages.at(-1);
  if (last && !identities.current.has(last)) identities.current.set(last, ++sequence.current);
  const latestKey = last ? `${contextKey}:${messages.length}:${identities.current.get(last)}` : '';
  const latest = useRef(latestKey); latest.current = latestKey;
  const reveal = useCallback((key = latest.current) => {
    if (key) setReleased(previous => previous.has(key) ? previous : new Set([...previous, key]));
  }, []);
  useEffect(() => { setReleased(new Set()); }, [contextKey]);
  useEffect(() => { if (ready && !enabled) reveal(); }, [ready, enabled, latestKey, reveal]);
  return { latestKey, reveal, waiting: last?.role === 'assistant' && !(ready && !enabled) && !released.has(latestKey) };
}
