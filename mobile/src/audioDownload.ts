type AudioFetcher = (url: string, options: { signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

// Bound the whole response body, not merely receipt of the HTTP headers.
export async function downloadAudioBytes(url: string, fetchAudio: AudioFetcher, timeoutMs = 12000) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchAudio(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Audio download HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!bytes.length) throw new Error('Audio download was empty');
        return bytes;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Audio download timed out'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function prepareAudioAssets<T>(assets: readonly T[], prepare: (asset: T) => Promise<unknown>) {
  let next = 0;
  let loaded = true;
  await Promise.all(Array.from({ length: Math.min(4, assets.length) }, async () => {
    // Stop scheduling more work after a failed transfer, so Retry is not held
    // behind an entire card's worth of serial timeouts on a weak connection.
    while (loaded && next < assets.length) {
      const asset = assets[next++];
      try { if (!await prepare(asset)) loaded = false; }
      catch { loaded = false; }
    }
  }));
  return loaded;
}
