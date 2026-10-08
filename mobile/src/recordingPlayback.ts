/** Progress, rather than total clip length, determines whether learner playback stalled. */
export type RecordingPlaybackProgress = { position: number; progressedAt: number };
export function recordingPlaybackState(
  status: { currentTime: number; duration: number; didJustFinish: boolean },
  progress: RecordingPlaybackProgress,
  now: number,
  stallMs = 8000,
): 'playing' | 'finished' | 'stalled' {
  if (status.currentTime > progress.position + 0.01) {
    progress.position = status.currentTime;
    progress.progressedAt = now;
  }
  if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) return 'finished';
  return now - progress.progressedAt >= stallMs ? 'stalled' : 'playing';
}
