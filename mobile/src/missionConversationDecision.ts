import type { ChoiceOption } from './types';

export const CONVERSATION_DECISION_INSTRUCTION = 'Escucha y elige cómo continuar.';
export type DecisionPhase = 'choosing' | 'wrong' | 'responding' | 'response-error' | 'completion' | 'finished';
export type DecisionState = { phase: DecisionPhase; selectedId: string | null; options: ChoiceOption[] };

/** A visit owns its option order and response transaction, independently of layout. */
export function createConversationDecision(options: ChoiceOption[], correctId: string, completion: boolean, callbacks: {
  ready: () => boolean;
  active: () => boolean;
  submit: (ids: string[]) => void;
  retry: () => void;
  response: () => Promise<boolean>;
  advance: () => void;
  changed: (state: DecisionState) => void;
}, random = Math.random) {
  const order = [...options];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let state: DecisionState = { phase: 'choosing', selectedId: null, options: order };
  let paused = false, disposed = false, operation = 0;
  const update = (next: Partial<DecisionState>) => {
    state = { ...state, ...next };
    if (!disposed) callbacks.changed(state);
  };
  const advance = () => {
    update({ phase: 'finished' });
    callbacks.advance();
  };
  const respond = async () => {
    const request = ++operation;
    update({ phase: 'responding' });
    let played = false;
    try { played = await callbacks.response(); } catch { /* Retain the beat and offer replay. */ }
    if (disposed || request !== operation) return;
    if (!played || paused || !callbacks.active()) { update({ phase: 'response-error' }); return; }
    if (completion) update({ phase: 'completion' });
    else advance();
  };
  return {
    get state() { return state; },
    activate() { disposed = false; },
    choose(id: string) {
      if (disposed || paused || !callbacks.ready() || state.phase !== 'choosing' || !order.some(option => option.id === id)) return;
      // Commit the lock before invoking scoring or any potentially synchronous callback.
      update({ selectedId: id, phase: id === correctId ? 'responding' : 'wrong' });
      callbacks.submit([id]);
      if (id === correctId) void respond();
    },
    retry() {
      if (disposed || paused || state.phase !== 'wrong') return;
      callbacks.retry();
      update({ phase: 'choosing', selectedId: null });
    },
    retryResponse() {
      if (!disposed && !paused && state.phase === 'response-error') void respond();
    },
    continue() {
      if (!disposed && !paused && callbacks.active() && state.phase === 'completion') advance();
    },
    pause(value: boolean) {
      paused = value;
      if (paused && state.phase === 'responding') {
        operation++;
        update({ phase: 'response-error' });
      }
    },
    dispose() {
      disposed = true;
      operation++;
      if (state.phase === 'responding') state = { ...state, phase: 'response-error' };
    },
  };
}

/** Web playback advances only on actual audio completion, never fallback onEnd. */
export function playDecisionTurns<T>(turns: readonly T[], play: (turn: T, completed: () => void, failed: () => void) => void,
  timeoutMs = 30000) {
  let settled = false, index = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let resolve!: (played: boolean) => void;
  const promise = new Promise<boolean>(done => { resolve = done; });
  const finish = (played: boolean) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve(played);
  };
  const next = () => {
    if (settled) return;
    if (index === turns.length) { finish(turns.length > 0); return; }
    const turnIndex = index;
    clearTimeout(timer);
    timer = setTimeout(() => finish(false), timeoutMs);
    try {
      play(turns[index], () => {
        if (settled || index !== turnIndex) return;
        index++;
        next();
      }, () => { if (index === turnIndex) finish(false); });
    } catch { finish(false); }
  };
  next();
  return { promise, cancel: () => finish(false) };
}

/** Expo reports each track finishing. Unlock only after the final ordered track. */
export function createDecisionPlaybackGate(trackCount: number) {
  let armed = false, settled = false;
  const heard = new Set<number>();
  let resolve!: (played: boolean) => void;
  const promise = new Promise<boolean>(done => { resolve = done; });
  const finish = (played: boolean) => {
    if (settled) return;
    settled = true;
    resolve(played);
  };
  return {
    promise,
    arm() { armed = true; },
    fail() { finish(false); },
    observe(status: { playing: boolean; didJustFinish: boolean; currentIndex: number; trackCount: number; error?: unknown }) {
      if (!armed || settled) return;
      if (status.error || status.trackCount !== trackCount) { finish(false); return; }
      if (status.playing && (status.currentIndex === 0 || heard.has(status.currentIndex - 1))) heard.add(status.currentIndex);
      if (status.didJustFinish && status.currentIndex === trackCount - 1 && heard.size === trackCount) finish(true);
    },
  };
}
