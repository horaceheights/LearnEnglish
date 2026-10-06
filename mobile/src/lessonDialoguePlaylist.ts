import type { AudioPlaylist, AudioPlaylistStatus } from 'expo-audio';

// Android emits an error in its status event although Expo's public type omits it.
export type DialoguePlaylistStatus = AudioPlaylistStatus & { error: unknown | null };

export function createDialoguePlaylistController(
  initial: AudioPlaylist,
  createPlaylist: () => AudioPlaylist,
  onStatus: (status: DialoguePlaylistStatus) => void,
) {
  let current = initial;
  let failure: unknown | null = null;
  let released = false;
  const observe = (playlist: AudioPlaylist) => playlist.addListener('playlistStatusUpdate', (status) => {
    if (released || current !== playlist) return;
    const nativeError = (status as AudioPlaylistStatus & { error?: unknown }).error;
    if (nativeError) failure = nativeError;
    onStatus({ ...status, error: failure });
  });
  let subscription: ReturnType<typeof observe> | null = observe(current);

  const releasePlaylist = (playlist: AudioPlaylist) => {
    try { playlist.pause(); } catch { /* A failed native player may already be unavailable. */ }
    try { playlist.release(); } catch { /* Teardown must not prevent an observed replacement playing. */ }
  };

  return {
    replaceTracks(sources: string[]) {
      if (released) throw new Error('The dialogue playlist has been released.');
      if (failure) {
        // Expo cannot prepare an Android playlist again after STATE_IDLE.
        // A replacement constructor prepares it; subscribe before any play call.
        const replacement = createPlaylist();
        let nextSubscription: ReturnType<typeof observe>;
        try {
          nextSubscription = observe(replacement);
        } catch (error) {
          releasePlaylist(replacement);
          throw error;
        }
        const previous = current;
        subscription?.remove();
        current = replacement;
        subscription = nextSubscription;
        failure = null;
        releasePlaylist(previous);
        onStatus({ ...current.currentStatus, error: null });
      }
      current.pause();
      current.clear();
      sources.forEach((uri) => current.add({ uri }));
      return current;
    },
    stopObserving() {
      subscription?.remove();
      subscription = null;
    },
    release() {
      if (released) return;
      released = true;
      subscription?.remove();
      subscription = null;
      releasePlaylist(current);
    },
  };
}
