export type PronunciationAudioPreloadResult = {
  attempts: number;
  error?: unknown;
  loaded: boolean;
};

export async function preloadPronunciationAudioWithRetry(
  preloadAudio: () => Promise<boolean>,
  maxAttempts = 2,
): Promise<PronunciationAudioPreloadResult> {
  const attemptsAllowed = Math.max(1, maxAttempts);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attemptsAllowed; attempt += 1) {
    try {
      if (await preloadAudio()) return { attempts: attempt, loaded: true };
    } catch (error) {
      lastError = error;
    }
  }

  return { attempts: attemptsAllowed, error: lastError, loaded: false };
}
