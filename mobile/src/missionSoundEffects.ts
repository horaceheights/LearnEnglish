import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createAudioPlayer, preload, setAudioModeAsync, type AudioSource } from 'expo-audio';

import { addDiagnosticBreadcrumb, captureDiagnosticError } from './diagnostics';
import type { LessonCard } from './types';

export type MissionSoundEvent =
  | 'tile-place'
  | 'page-restored'
  | 'page-turn'
  | 'voice-stamp'
  | 'mission-finale'
  | 'try-again';

const MISSION_SOUND_SOURCES: Record<MissionSoundEvent, AudioSource> = {
  'tile-place': require('../assets/sfx/tile-place-v1.mp3'),
  'page-restored': require('../assets/sfx/page-restored-v1.mp3'),
  'page-turn': require('../assets/sfx/page-turn-v1.mp3'),
  'voice-stamp': require('../assets/sfx/voice-stamp-v1.mp3'),
  'mission-finale': require('../assets/sfx/mission-finale-v1.mp3'),
  'try-again': require('../assets/sfx/try-again-v1.mp3'),
};

const SAME_EVENT_DEBOUNCE_MS = 140;
const MISSION_SOUND_VOLUMES: Record<MissionSoundEvent, number> = {
  'tile-place': 0.4,
  'page-restored': 0.4,
  'page-turn': 0.35,
  'voice-stamp': 0.38,
  'mission-finale': 0.46,
  'try-again': 0.35,
};

void Promise.all(Object.values(MISSION_SOUND_SOURCES).map((source) => preload(source))).catch(
  (preloadError) => captureDiagnosticError(
    preloadError,
    'mission_sound_effect_preload',
    {},
    'warning',
  ),
);

export function missionSuccessSoundEvent(card: Pick<LessonCard, 'stage'>): MissionSoundEvent {
  return card.stage === 'Speak' || card.stage === 'Pronunciation Practice'
    ? 'voice-stamp'
    : 'page-restored';
}

export function useMissionSoundEffects({
  enabled,
  isAppActive,
  reducedStimulation,
}: {
  enabled: boolean;
  isAppActive: boolean;
  reducedStimulation: boolean;
}) {
  const [player] = useState(() => createAudioPlayer(null, {
    keepAudioSessionActive: true,
  }));
  const activeRef = useRef(true);
  const requestRef = useRef(0);
  const lastEventRef = useRef<{ at: number; event: MissionSoundEvent } | null>(null);

  const stop = useCallback(() => {
    requestRef.current += 1;
    try {
      player.pause();
    } catch {
      // A short cue may already have completed.
    }
  }, [player]);

  const play = useCallback((event: MissionSoundEvent) => {
    if (
      !enabled
      || reducedStimulation
      || !isAppActive
      || AppState.currentState !== 'active'
    ) return;

    const now = Date.now();
    const previous = lastEventRef.current;
    if (previous?.event === event && now - previous.at < SAME_EVENT_DEBOUNCE_MS) return;
    lastEventRef.current = { at: now, event };

    // One shared player makes replacement atomic from the lesson's point of
    // view: a newer semantic cue cancels a pending or playing cue rather than
    // layering another sound on top of it.
    stop();
    const requestId = requestRef.current;
    const source = MISSION_SOUND_SOURCES[event];
    void preload(source).then(async () => {
      if (!activeRef.current || requestRef.current !== requestId) return;
      // Course speech remains audible in silent mode, but these decorative
      // effects must honor the device's mute/silent control.
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      });
      if (!activeRef.current || requestRef.current !== requestId) return;
      player.replace(source);
      player.volume = MISSION_SOUND_VOLUMES[event];
      player.play();
      addDiagnosticBreadcrumb('mission_sound_effect_started', { event });
    }).catch((playbackError) => {
      if (!activeRef.current || requestRef.current !== requestId) return;
      captureDiagnosticError(
        playbackError,
        'mission_sound_effect_playback',
        { event },
        'warning',
      );
    });
  }, [enabled, isAppActive, player, reducedStimulation, stop]);

  useEffect(() => {
    if (!enabled || reducedStimulation || !isAppActive) stop();
  }, [enabled, isAppActive, reducedStimulation, stop]);

  useEffect(() => () => {
    activeRef.current = false;
    stop();
    try {
      player.release();
    } catch {
      // The native player may already be unavailable during app teardown.
    }
  }, [player, stop]);

  return { playMissionSound: play, stopMissionSound: stop };
}
