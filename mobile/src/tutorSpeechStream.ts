/** Bounded, ordered audio segments from one authenticated tutor request. */
export async function readTutorSpeech(
  response: Response, signal: AbortSignal, assertIdentity: () => void,
  onAudio: (base64: string) => void,
) {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson') || !response.body) throw new Error('Invalid speech stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '', total = 0, count = 0, complete = false;
  const check = () => { assertIdentity(); if (signal.aborted) throw new Error('Speech cancelled'); };
  try {
    while (true) {
      check();
      const { value, done } = await reader.read();
      check();
      if (done) break;
      total += value.length;
      if (total > 6 * 1024 * 1024) throw new Error('Speech too large');
      pending += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
        if (!line.trim()) continue;
        const item = JSON.parse(line);
        if (complete) throw new Error('Audio after completion');
        if (item.type === 'done' && count > 0) { complete = true; continue; }
        if (item.type !== 'audio' || item.index !== count || ++count > 2 || typeof item.audio !== 'string' || !item.audio) throw new Error('Invalid speech segment');
        if (item.audio.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(item.audio)) throw new Error('Invalid audio encoding');
        check();
        onAudio(item.audio);
      }
    }
    if (!complete || pending.trim()) throw new Error('Incomplete speech stream');
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Download the next sentence while the current one plays; never overlap voices. */
export function tutorSpeechQueue(play: (base64: string) => Promise<void>, cancel: () => void) {
  let tail = Promise.resolve();
  let failure: unknown;
  return {
    add(base64: string) {
      tail = tail.then(async () => { if (!failure) await play(base64); }).catch(error => { failure = error; cancel(); });
    },
    async finish() { await tail; if (failure) throw failure; },
  };
}
