type NativePlayer = {
  replace(source: { uri: string }): void; play(): void; pause(): void;
  addListener(event: 'playbackStatusUpdate', listener: (status: {
    playing: boolean; isLoaded: boolean; isBuffering: boolean; didJustFinish: boolean; error?: string | null;
  }) => void): { remove(): void };
};

export function playNativeTutorSegment(player: NativePlayer, uri: string, signal: AbortSignal, onStarted: () => void, prepare: () => Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    let started = false, settled = false;
    const startup = setTimeout(() => finish(new Error('Audio startup timed out')), 10000);
    const watchdog = setTimeout(() => finish(new Error('Audio playback timed out')), 120000);
    let subscription: { remove(): void } | undefined;
    const cancel = () => finish(new Error('Audio cancelled'));
    function finish(error?: Error) {
      if (settled) return;
      settled = true; clearTimeout(startup); clearTimeout(watchdog);
      subscription?.remove(); signal.removeEventListener('abort', cancel);
      if (error) { try { player.pause(); } catch {} reject(error); } else resolve();
    }
    if (signal.aborted) { cancel(); return; }
    signal.addEventListener('abort', cancel, { once: true });
    try {
      // The startup deadline also covers Android audio-mode preparation.
      void prepare().then(() => {
        if (settled) return;
        subscription = player.addListener('playbackStatusUpdate', status => {
          if (status.error) { finish(new Error('Audio playback failed')); return; }
          if (!started && status.playing && status.isLoaded && !status.isBuffering) {
            started = true; clearTimeout(startup); onStarted();
          }
          if (started && status.didJustFinish) finish();
        });
        player.replace({ uri }); player.play();
      }).catch(() => finish(new Error('Audio playback failed')));
    } catch { finish(new Error('Audio playback failed')); }
  });
}

export function playWebTutorSegment(audio: HTMLAudioElement, url: string, signal: AbortSignal, onStarted: () => void) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const startup = setTimeout(() => finish(new Error('Audio startup timed out')), 10000);
    const watchdog = setTimeout(() => finish(new Error('Audio playback timed out')), 120000);
    const cancel = () => finish(new Error('Audio cancelled'));
    function finish(error?: Error) {
      if (settled) return;
      settled = true; clearTimeout(startup); clearTimeout(watchdog);
      audio.onplaying = null; audio.onended = null; audio.onerror = null;
      signal.removeEventListener('abort', cancel);
      if (error) { audio.pause(); reject(error); } else resolve();
    }
    if (signal.aborted) { cancel(); return; }
    signal.addEventListener('abort', cancel, { once: true });
    audio.onplaying = () => { clearTimeout(startup); onStarted(); };
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error('Audio playback failed'));
    audio.src = url;
    audio.play().catch(() => finish(new Error('Audio playback failed')));
  });
}
