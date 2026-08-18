import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { File } from 'expo-file-system';
import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  type RecordingOptions,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';

import { getPronunciationStreamingToken, scorePronunciation } from '../api';
import { absoluteMediaUrl, courseAudioUrl, lessonVideoUrl, type CourseAudioProvider, type CourseAudioVoice } from '../config';
import {
  addDiagnosticBreadcrumb,
  captureDiagnosticError,
  isExpectedConnectivityError,
  setDiagnosticOperation,
} from '../diagnostics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  assessedPhraseProgress,
  liveSyllableEvidence,
  paceIndependentAccuracy,
  referenceSyllables,
  speechTokens,
} from '../pronunciationEngine';
import type { PronunciationResult } from '../types';
import {
  addSpeechListener,
  nativeStreamingAvailable,
  nativeStreamingImplementationVersion,
  startNativeSpeech,
  stopNativeSpeech,
  type SpeechErrorEvent,
  type SpeechLevelEvent,
  type SpeechProgressEvent,
  type SpeechResultEvent,
  type SpeechStateEvent,
} from '../../modules/spanglish-speech/src';

type Props = {
  audioProvider: CourseAudioProvider;
  audioVoice: CourseAudioVoice;
  phrase: string;
  imageHeight: number;
  imageLabel?: string;
  imageUrl?: string;
  isAppActive: boolean;
  isOffline: boolean;
  videoName?: string | null;
  level: string;
  userId?: string;
  onAttempted?: () => void;
  onPassed: () => void;
  onUnavailable: () => void;
};

type Phase = 'model' | 'ready' | 'listening' | 'checking' | 'retry' | 'success' | 'permission';
const MAX_AUTOMATIC_ATTEMPTS = 2;
const GRADING_REVIEW_MS = 3000;
const RECORDING_REVEAL_MS = 650;
const RECORDING_LOAD_TIMEOUT_MS = 4000;
const MODEL_AUDIO_LOAD_TIMEOUT_MS = 12000;
const NO_SPEECH_LISTEN_MS = 3000;
const IOS_SPEECH_END_SILENCE_MS = 1200;
const MAX_NO_SPEECH_ROUNDS = 3;
const NO_SPEECH_REPLAY_DELAY_MS = 900;
const MIN_CONFIRMED_VOICE_MS = 160;
const MIN_SINGLE_WORD_ACTIVE_VOICE_MS = 160;
const MIN_PHRASE_ACTIVE_VOICE_MS = 240;
const MIN_ACTIVE_VOICE_SAMPLES = 3;
const MIN_VOICE_LEVEL_RANGE_DB = 1.5;
const MIN_VOICE_PEAK_DB = -46;
const SPEECH_THRESHOLD_FLOOR_DB = -48;
const SPEECH_ABOVE_NOISE_DB = 6;
const VOICE_PEAK_ABOVE_THRESHOLD_DB = 2;
const MIN_AZURE_SNR_DB = 8;
const MIN_AZURE_SPEECH_MS = 250;
const MIN_AZURE_RECOGNITION_CONFIDENCE = 0.2;
const READY_CUE = require('../../assets/ready-cue.wav');
const SUCCESS_CHIME = require('../../assets/success-chime.wav');

function showMicrophonePermissionAlert(canAskAgain: boolean) {
  const message = canAskAgain
    ? 'Permite que SpanGlish use el micrófono para continuar automáticamente.'
    : 'El permiso está desactivado. Abre Ajustes y activa el micrófono para SpanGlish.';
  Alert.alert(
    'Micrófono necesario',
    message,
    canAskAgain
      ? [{ text: 'Entendido' }]
      : [
          { style: 'cancel', text: 'Cancelar' },
          { onPress: () => void Linking.openSettings(), text: 'Abrir Ajustes' },
        ],
  );
}

function isExpectedNoSpeechRecognition(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : JSON.stringify(error ?? {});
  return /InitialSilenceTimeout|BabbleTimeout|NoMatch|no usable speech|no pudimos entender/i.test(message);
}

function azureSignalEvidence(json: string): {
  confidence?: number;
  durationMs?: number;
  recognized: boolean;
  reliable: boolean;
  snr?: number;
  status?: number | string;
} {
  try {
    const payload = JSON.parse(json || '{}') as {
      DisplayText?: string;
      Duration?: number;
      RecognitionStatus?: number | string;
      SNR?: number;
      NBest?: Array<{
        Confidence?: number;
        Display?: string;
        Lexical?: string;
        SNR?: number;
      }>;
    };
    const best = payload.NBest?.[0];
    const confidence = best?.Confidence;
    const snr = typeof payload.SNR === 'number' ? payload.SNR : best?.SNR;
    const durationMs = typeof payload.Duration === 'number' ? payload.Duration / 10_000 : undefined;
    const recognizedText = payload.DisplayText ?? best?.Display ?? best?.Lexical ?? '';
    const status = payload.RecognitionStatus;
    const statusSucceeded = status === 0 || String(status).toLowerCase() === 'success';
    const recognized = statusSucceeded && recognizedText.trim().length > 0;
    return {
      confidence,
      durationMs,
      recognized,
      reliable: recognized
        && typeof snr === 'number'
        && snr >= MIN_AZURE_SNR_DB
        && typeof durationMs === 'number'
        && durationMs >= MIN_AZURE_SPEECH_MS
        && (typeof confidence !== 'number' || confidence >= MIN_AZURE_RECOGNITION_CONFIDENCE),
      snr,
      status,
    };
  } catch {
    return { recognized: false, reliable: false };
  }
}

function exerciseTypeForPhrase(value: string) {
  const count = speechTokens(value).length;
  if (count <= 1) return 'WORD';
  if (count <= 4) return 'SHORT_PHRASE';
  return 'SENTENCE';
}

const SPEECH_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    sampleRate: 16000,
  },
  isMeteringEnabled: true,
};

const LISTENING_MASCOT_FRAMES = [
  require('../../assets/mascots/serious/listening-frames-normalized/listening-01.png'),
  require('../../assets/mascots/serious/listening-frames-normalized/listening-02.png'),
  require('../../assets/mascots/serious/listening-frames-normalized/listening-03.png'),
  require('../../assets/mascots/serious/listening-frames-normalized/listening-04.png'),
  require('../../assets/mascots/serious/listening-frames-normalized/listening-05.png'),
  require('../../assets/mascots/serious/listening-frames-normalized/listening-06.png'),
] as const;

const LISTENING_MASCOT_FRAME_MS = [180, 130, 120, 110, 110] as const;

const GRADING_MASCOT_FRAMES = [
  require('../../assets/mascots/serious/grading-frames-normalized/grading-01.png'),
  require('../../assets/mascots/serious/grading-frames-normalized/grading-02.png'),
  require('../../assets/mascots/serious/grading-frames-normalized/grading-03.png'),
  require('../../assets/mascots/serious/grading-frames-normalized/grading-04.png'),
  require('../../assets/mascots/serious/grading-frames-normalized/grading-05.png'),
  require('../../assets/mascots/serious/grading-frames-normalized/grading-06.png'),
] as const;

const GRADING_MASCOT_FRAME_MS = [240, 160, 160, 190, 320, 650] as const;

export function PronunciationPractice({
  audioProvider,
  audioVoice,
  phrase,
  imageHeight,
  imageLabel,
  imageUrl,
  isAppActive,
  isOffline,
  videoName,
  level,
  userId,
  onAttempted,
  onPassed,
  onUnavailable,
}: Props) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const practiceVideoPlayer = useVideoPlayer(
    videoName ? { uri: lessonVideoUrl(videoName), useCaching: true } : null,
    (instance) => {
      instance.loop = true;
      instance.muted = true;
      if (videoName && !reduceMotion) instance.play();
    },
  );
  const recorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);

  useEffect(() => {
    if (!videoName || reduceMotion) {
      practiceVideoPlayer.pause();
    } else {
      practiceVideoPlayer.play();
    }
  }, [practiceVideoPlayer, reduceMotion, videoName]);
  // These players are used by callbacks that span preload, animation, and
  // recording transitions. Own them explicitly so Expo cannot release their
  // native SharedObjects between React effect cycles on iOS.
  const [modelPlayer, setModelPlayer] = useState(() => createAudioPlayer(null, {
    keepAudioSessionActive: true,
  }));
  const modelPlayerRef = useRef(modelPlayer);
  const retiredModelPlayersRef = useRef<ReturnType<typeof createAudioPlayer>[]>([]);
  const activeReadyCuePlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const activeAttemptPlaybackRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const successChimePlayer = useAudioPlayer(SUCCESS_CHIME, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const modelStatus = useAudioPlayerStatus(modelPlayer);
  const [phase, setPhase] = useState<Phase>('model');
  const [message, setMessage] = useState('Escucha la frase.');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [liveLevel, setLiveLevel] = useState(0);
  const [recognizedSyllableKeys, setRecognizedSyllableKeys] = useState<string[]>([]);
  const [continueAfterCoaching, setContinueAfterCoaching] = useState(false);
  const [noSpeechFailure, setNoSpeechFailure] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [reviewingRecording, setReviewingRecording] = useState(false);
  const [gradingFrame, setGradingFrame] = useState(0);
  const [listeningFrame, setListeningFrame] = useState(0);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const heardSpeech = useRef(false);
  const noSpeechRound = useRef(0);
  const silenceStartedAt = useRef<number | null>(null);
  const captureFinishing = useRef(false);
  const modelWasPlaying = useRef(false);
  const modelLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingCapture = useRef(false);
  const streamingStartedAt = useRef(0);
  const lastVoiceAt = useRef(0);
  const noiseFloorDb = useRef(-60);
  const voiceCandidateStartedAt = useRef<number | null>(null);
  const voiceCandidatePeakDb = useRef(-160);
  const voiceActiveDurationMs = useRef(0);
  const voiceActiveSampleCount = useRef(0);
  const voiceEvidenceMinDb = useRef(0);
  const voiceEvidencePeakDb = useRef(-160);
  const voiceLastActiveSampleAt = useRef<number | null>(null);
  const liveProgressComplete = useRef(false);
  const liveMatchedCountRef = useRef(0);
  const liveRecognizedText = useRef('');
  const scoredSyllableKeysRef = useRef(new Set<string>());
  const phraseCompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successChimePlayed = useRef(false);
  const gradedAdvanceHandled = useRef(false);
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const successAnimation = useRef(new Animated.Value(1)).current;
  const waveAnimations = useRef(
    [0, 1, 2, 3, 4].map(() => new Animated.Value(0.3)),
  ).current;

  const interpreted = result?.feature_flags?.pedagogicalScoring === false ? undefined : result?.interpreted;
  const overallScore = interpreted?.pedagogicalScore ?? (result ? paceIndependentAccuracy(result) : undefined);
  const accuracy = interpreted?.soundAccuracy ?? overallScore;
  const completeness = interpreted?.completeness ?? result?.text_score?.azure_scores?.completeness;
  const passAccuracy = level.toUpperCase().includes('A1') ? 30 : 65;
  const minimumCompleteness = level.toUpperCase().includes('A1') ? 60 : 75;
  const passed = interpreted?.passed ?? (
    typeof accuracy === 'number'
    && accuracy >= passAccuracy
    && (typeof completeness !== 'number' || completeness >= minimumCompleteness)
  );
  const statusIsActive = phase === 'listening' || phase === 'checking';
  const statusIsAnimated = statusIsActive && !reduceMotion && !(phase === 'listening' && streamingCapture.current);
  const expectedTokens = useMemo(() => speechTokens(phrase), [phrase]);
  const expectedSyllables = useMemo(() => referenceSyllables(phrase), [phrase]);
  const recognizedSyllableKeySet = useMemo(
    () => new Set(recognizedSyllableKeys),
    [recognizedSyllableKeys],
  );
  const finalWordFeedback = useMemo(() => {
    const wordScores = result?.text_score?.word_score_list ?? [];
    return expectedTokens.map((token, index) => {
      const wordResult = wordScores[index];
      const errorType = wordResult?.error_type?.toLowerCase();
      const good = errorType === 'omission'
        ? false
        : typeof wordResult?.quality_score === 'number'
          ? wordResult.quality_score >= 65
          : wordScores.length === 0 && passed;
      return { good, token };
    });
  }, [expectedTokens, passed, result]);
  const listeningMascotWidth = 94;
  const listeningMascotHeight = 104;
  const isLandscape = viewportWidth > viewportHeight;
  const isCurrentRun = useCallback(
    (runId: number) => mountedRef.current && runIdRef.current === runId,
    [],
  );

  const resetVoiceEvidence = useCallback(() => {
    voiceCandidateStartedAt.current = null;
    voiceCandidatePeakDb.current = -160;
    voiceActiveDurationMs.current = 0;
    voiceActiveSampleCount.current = 0;
    voiceEvidenceMinDb.current = 0;
    voiceEvidencePeakDb.current = -160;
    voiceLastActiveSampleAt.current = null;
  }, []);

  const recordActiveVoiceSample = useCallback((levelDb: number, sampleAt: number) => {
    const previousSampleAt = voiceLastActiveSampleAt.current;
    if (previousSampleAt !== null) {
      voiceActiveDurationMs.current += Math.min(150, Math.max(0, sampleAt - previousSampleAt));
    }
    voiceLastActiveSampleAt.current = sampleAt;
    voiceActiveSampleCount.current += 1;
    voiceEvidencePeakDb.current = Math.max(voiceEvidencePeakDb.current, levelDb);
    voiceEvidenceMinDb.current = voiceActiveSampleCount.current === 1
      ? levelDb
      : Math.min(voiceEvidenceMinDb.current, levelDb);
  }, []);

  const voiceEvidence = useCallback(() => {
    const requiredActiveMs = expectedTokens.length <= 1
      ? MIN_SINGLE_WORD_ACTIVE_VOICE_MS
      : MIN_PHRASE_ACTIVE_VOICE_MS;
    const levelRangeDb = voiceEvidencePeakDb.current - voiceEvidenceMinDb.current;
    const strong = heardSpeech.current
      && voiceActiveDurationMs.current >= requiredActiveMs
      && voiceActiveSampleCount.current >= MIN_ACTIVE_VOICE_SAMPLES
      && voiceEvidencePeakDb.current >= MIN_VOICE_PEAK_DB
      && levelRangeDb >= MIN_VOICE_LEVEL_RANGE_DB;
    return {
      activeMs: Math.round(voiceActiveDurationMs.current),
      levelRangeDb: Math.round(levelRangeDb * 10) / 10,
      peakDb: Math.round(voiceEvidencePeakDb.current),
      samples: voiceActiveSampleCount.current,
      strong,
    };
  }, [expectedTokens.length]);

  const playAttemptRecording = useCallback(async (recordingUri: string, runId: number) => {
    await new Promise((resolve) => setTimeout(resolve, RECORDING_REVEAL_MS));
    if (!isCurrentRun(runId)) return;

    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!isCurrentRun(runId)) return;

      player = createAudioPlayer(recordingUri, { keepAudioSessionActive: true });
      activeAttemptPlaybackRef.current = player;
      const loadStartedAt = Date.now();
      while (
        !player.isLoaded
        && Date.now() - loadStartedAt < RECORDING_LOAD_TIMEOUT_MS
        && isCurrentRun(runId)
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!isCurrentRun(runId) || !player.isLoaded) {
        throw new Error('The learner recording did not load for playback.');
      }

      player.play();
      let playbackStarted = false;
      const playbackStartedAt = Date.now();
      const maximumPlaybackMs = Math.max(5000, (player.duration || 30) * 1000 + 2000);
      while (Date.now() - playbackStartedAt < maximumPlaybackMs && isCurrentRun(runId)) {
        if (player.playing) playbackStarted = true;
        const reachedEnd = player.duration > 0
          && player.currentTime >= Math.max(0, player.duration - 0.05);
        if (reachedEnd || (playbackStarted && !player.playing)) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      addDiagnosticBreadcrumb('pronunciation_recording_played_back', {
        attempt: attemptRef.current + 1,
        duration_ms: player.duration > 0 ? Math.round(player.duration * 1000) : undefined,
      });
    } catch (playbackError) {
      addDiagnosticBreadcrumb('pronunciation_recording_playback_failed', {
        attempt: attemptRef.current + 1,
        message: playbackError instanceof Error ? playbackError.message : String(playbackError),
      });
    } finally {
      if (activeAttemptPlaybackRef.current === player) activeAttemptPlaybackRef.current = null;
      if (player) {
        try {
          player.pause();
          player.release();
        } catch {
          // Playback may already be released during screen teardown.
        }
      }
    }
  }, [isCurrentRun]);

  const discardLocalRecording = useCallback(async () => {
    try {
      await recorder.stop();
      if (recorder.uri) new File(recorder.uri).delete();
    } catch {
      // The fallback recorder may not have been prepared or may already be stopped.
    }
  }, [recorder]);

  const discardNativeRecording = useCallback(async () => {
    try {
      const nativeResult = await stopNativeSpeech();
      if (nativeResult.uri) new File(nativeResult.uri).delete();
    } catch {
      // Native streaming may already be stopped or unavailable.
    }
  }, []);

  const stopTransientPlayback = useCallback(() => {
    try {
      modelPlayerRef.current.pause();
      successChimePlayer.pause();
    } catch {
      // A short player may already have completed while interruption begins.
    }
    const readyCuePlayer = activeReadyCuePlayerRef.current;
    activeReadyCuePlayerRef.current = null;
    if (readyCuePlayer) {
      try {
        readyCuePlayer.pause();
        readyCuePlayer.release();
      } catch {
        // The cue may already be released.
      }
    }
    const attemptPlayback = activeAttemptPlaybackRef.current;
    activeAttemptPlaybackRef.current = null;
    if (attemptPlayback) {
      try {
        attemptPlayback.pause();
        attemptPlayback.release();
      } catch {
        // The learner recording may already have completed.
      }
    }
  }, [successChimePlayer]);

  const showUnavailableState = useCallback((reason = 'La pronunciación necesita internet para reproducir y calificar tu voz.') => {
    runIdRef.current += 1;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (modelLoadTimer.current) clearTimeout(modelLoadTimer.current);
    modelLoadTimer.current = null;
    if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
    phraseCompleteTimer.current = null;
    if (streamingCapture.current) void discardNativeRecording();
    streamingCapture.current = false;
    captureFinishing.current = false;
    stopTransientPlayback();
    void discardLocalRecording();
    addDiagnosticBreadcrumb('pronunciation_service_unavailable', {
      attempt: attemptRef.current + 1,
    });
    setResult(null);
    setReviewingRecording(false);
    setNoSpeechFailure(false);
    setServiceUnavailable(true);
    setPhase('retry');
    setMessage(reason);
  }, [discardLocalRecording, discardNativeRecording, stopTransientPlayback]);

  const pauseForInterruption = useCallback(() => {
    runIdRef.current += 1;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (modelLoadTimer.current) clearTimeout(modelLoadTimer.current);
    modelLoadTimer.current = null;
    if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
    phraseCompleteTimer.current = null;
    if (streamingCapture.current) void discardNativeRecording();
    streamingCapture.current = false;
    captureFinishing.current = false;
    stopTransientPlayback();
    void discardLocalRecording();
    addDiagnosticBreadcrumb('pronunciation_interrupted');
    setResult(null);
    setReviewingRecording(false);
    setNoSpeechFailure(false);
    setServiceUnavailable(false);
    setPhase('retry');
    setMessage('La práctica se pausó. Volveremos a empezar esta frase.');
  }, [discardLocalRecording, discardNativeRecording, stopTransientPlayback]);

  const playModel = useCallback(async (runId = runIdRef.current) => {
    if (!isCurrentRun(runId)) return;
    if (!isAppActive) {
      pauseForInterruption();
      return;
    }
    if (isOffline) {
      showUnavailableState();
      return;
    }
    if (streamingCapture.current) void discardNativeRecording();
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (modelLoadTimer.current) clearTimeout(modelLoadTimer.current);
    modelLoadTimer.current = null;
    setResult(null);
    setReviewingRecording(false);
    gradedAdvanceHandled.current = false;
    successChimePlayed.current = false;
    setContinueAfterCoaching(false);
    setNoSpeechFailure(false);
    setServiceUnavailable(false);
    setPhase('model');
    setMessage(attemptRef.current ? 'Escucha otra vez…' : 'Escucha la frase.');
    heardSpeech.current = false;
    silenceStartedAt.current = null;
    captureFinishing.current = false;
    streamingCapture.current = false;
    liveProgressComplete.current = false;
    liveMatchedCountRef.current = 0;
    liveRecognizedText.current = '';
    scoredSyllableKeysRef.current.clear();
    if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
    phraseCompleteTimer.current = null;
    lastVoiceAt.current = 0;
    noiseFloorDb.current = -60;
    resetVoiceEvidence();
    setLiveLevel(0);
    setRecognizedSyllableKeys([]);
    modelWasPlaying.current = false;
    setDiagnosticOperation('pronunciation_model_playback');
    addDiagnosticBreadcrumb('pronunciation_model_started', { attempt: attemptRef.current + 1 });
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (!isCurrentRun(runId)) return;
      const nextPlayer = createAudioPlayer(
        courseAudioUrl(
          phrase,
          'pronunciation_slow',
          'split-ing',
          audioProvider,
          audioVoice,
        ),
        { keepAudioSessionActive: true },
      );
      if (!isCurrentRun(runId)) {
        nextPlayer.release();
        return;
      }
      const previousPlayer = modelPlayerRef.current;
      try {
        previousPlayer.pause();
      } catch {
        // A previous clip may already have ended while the next one is created.
      }
      retiredModelPlayersRef.current.push(previousPlayer);
      modelPlayerRef.current = nextPlayer;
      setModelPlayer(nextPlayer);
      nextPlayer.play();
      modelLoadTimer.current = setTimeout(() => {
        modelLoadTimer.current = null;
        if (!isCurrentRun(runId) || modelWasPlaying.current) return;
        captureDiagnosticError(
          new Error('Pronunciation model audio did not start before the timeout.'),
          'pronunciation_model_timeout',
          { attempt: attemptRef.current + 1 },
          'warning',
        );
        showUnavailableState('No pudimos reproducir la frase. Revisa tu conexión e inténtalo otra vez.');
      }, MODEL_AUDIO_LOAD_TIMEOUT_MS);
    } catch (playbackError) {
      if (!isCurrentRun(runId)) return;
      captureDiagnosticError(playbackError, 'pronunciation_model_playback', {
        attempt: attemptRef.current + 1,
      });
      showUnavailableState('No pudimos reproducir la frase. Revisa tu conexión e inténtalo otra vez.');
    }
  }, [audioProvider, audioVoice, discardNativeRecording, isAppActive, isCurrentRun, isOffline, pauseForInterruption, phrase, resetVoiceEvidence, showUnavailableState]);

  const playReadyCueAndWait = useCallback(async (runId: number) => {
    const previousCuePlayer = activeReadyCuePlayerRef.current;
    if (previousCuePlayer) {
      try {
        previousCuePlayer.pause();
        previousCuePlayer.release();
      } catch {
        // A completed cue may already have released its native playback state.
      }
    }
    const cuePlayer = createAudioPlayer(READY_CUE, {
      keepAudioSessionActive: true,
    });
    activeReadyCuePlayerRef.current = cuePlayer;
    cuePlayer.volume = 1;
    for (
      let attemptIndex = 0;
      attemptIndex < 30 && !cuePlayer.isLoaded && isCurrentRun(runId);
      attemptIndex += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!isCurrentRun(runId) || !cuePlayer.isLoaded) {
      if (activeReadyCuePlayerRef.current === cuePlayer) activeReadyCuePlayerRef.current = null;
      cuePlayer.release();
      return null;
    }
    cuePlayer.play();
    const cueStartedAt = Date.now();
    let playbackStartedAt: number | null = null;
    let expectedDurationMs = 180;

    while (Date.now() - cueStartedAt < 1200 && isCurrentRun(runId)) {
      if (cuePlayer.duration > 0) {
        expectedDurationMs = Math.max(1, cuePlayer.duration * 1000);
      }
      if (cuePlayer.playing && playbackStartedAt === null) {
        playbackStartedAt = Date.now();
      }
      const effectiveStartedAt = playbackStartedAt ?? cueStartedAt;
      const reachedExpectedEnd = Date.now() >= effectiveStartedAt + expectedDurationMs + 25;
      const reachedPlayerEnd = cuePlayer.duration > 0
        && cuePlayer.currentTime >= Math.max(0, cuePlayer.duration - 0.01);
      if (reachedExpectedEnd || reachedPlayerEnd) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    if (!isCurrentRun(runId)) {
      if (activeReadyCuePlayerRef.current === cuePlayer) activeReadyCuePlayerRef.current = null;
      cuePlayer.pause();
      cuePlayer.release();
      return null;
    }
    cuePlayer.pause();
    if (activeReadyCuePlayerRef.current === cuePlayer) activeReadyCuePlayerRef.current = null;
    cuePlayer.release();
    const cueEndedAt = Date.now();
    addDiagnosticBreadcrumb('pronunciation_ready_cue_finished', {
      cue_duration_ms: cueEndedAt - cueStartedAt,
    });
    return cueEndedAt;
  }, [isCurrentRun]);

  const scheduleRetry = useCallback((reason: string, runId = runIdRef.current) => {
    if (!isCurrentRun(runId)) return;
    setPhase('retry');
    setMessage(`${reason} Volvemos a intentarlo…`);
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    if (attemptRef.current >= MAX_AUTOMATIC_ATTEMPTS) {
      setContinueAfterCoaching(true);
      setPhase('success');
      setMessage(`${reason} Seguimos practicando.`);
      return;
    }
    // Keep the grade and coaching visible before starting the next attempt.
    retryTimer.current = setTimeout(() => playModel(runId), GRADING_REVIEW_MS);
  }, [isCurrentRun, playModel]);

  const completeGradedAttempt = useCallback(async (
    accepted: boolean,
    feedbackMessage: string,
    recordingUri: string,
    runId: number,
  ) => {
    if (!isCurrentRun(runId)) return;
    const reviewStartedAt = Date.now();
    let shouldAdvance = accepted;
    setReviewingRecording(true);

    if (accepted) {
      setPhase('success');
      setMessage(feedbackMessage);
    } else {
      attemptRef.current += 1;
      setAttempt(attemptRef.current);
      shouldAdvance = attemptRef.current >= MAX_AUTOMATIC_ATTEMPTS;
      if (shouldAdvance) {
        setContinueAfterCoaching(true);
        setPhase('success');
        setMessage(`${feedbackMessage} Seguimos practicando.`);
      } else {
        setPhase('retry');
        setMessage(`${feedbackMessage} Volvemos a intentarlo…`);
      }
    }

    await playAttemptRecording(recordingUri, runId);
    const remainingReviewMs = GRADING_REVIEW_MS - (Date.now() - reviewStartedAt);
    if (remainingReviewMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingReviewMs));
    }
    if (!isCurrentRun(runId)) return;

    setReviewingRecording(false);
    if (shouldAdvance) {
      gradedAdvanceHandled.current = true;
      onPassed();
    } else {
      await playModel(runId);
    }
  }, [isCurrentRun, onPassed, playAttemptRecording, playModel]);

  const handleNoSpeech = useCallback((runId = runIdRef.current) => {
    if (!isCurrentRun(runId)) return;
    noSpeechRound.current += 1;
    setResult(null);
    setPhase('retry');
    setMessage('No puedo escucharte.');
    if (noSpeechRound.current >= MAX_NO_SPEECH_ROUNDS) {
      setNoSpeechFailure(true);
      return;
    }
    setNoSpeechFailure(false);
    retryTimer.current = setTimeout(() => playModel(runId), NO_SPEECH_REPLAY_DELAY_MS);
  }, [isCurrentRun, playModel]);

  const evaluateResult = useCallback((nextResult: PronunciationResult) => {
    const nextInterpreted = nextResult.feature_flags?.pedagogicalScoring === false
      ? undefined
      : nextResult.interpreted;
    const nextAccuracy = nextInterpreted?.soundAccuracy ?? paceIndependentAccuracy(nextResult);
    const nextCompleteness = nextInterpreted?.completeness ?? nextResult.text_score?.azure_scores?.completeness;
    const accepted = nextInterpreted?.passed ?? (
      typeof nextAccuracy === 'number'
      && nextAccuracy >= passAccuracy
      && (typeof nextCompleteness !== 'number' || nextCompleteness >= minimumCompleteness)
    );
    return { accepted, nextAccuracy, nextCompleteness };
  }, [minimumCompleteness, passAccuracy]);

  const finishNativeCapture = useCallback(async (reason: 'score' | 'no-speech' = 'score') => {
    const runId = runIdRef.current;
    if (!isCurrentRun(runId) || captureFinishing.current || !streamingCapture.current) return;
    const evidence = voiceEvidence();
    const shouldScore = reason === 'score' && evidence.strong;
    console.info('[SpanGlish] Pronunciation voice gate', {
      ...evidence,
      requestedReason: reason,
      route: shouldScore ? 'grade' : 'no-speech',
    });
    if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
    phraseCompleteTimer.current = null;
    captureFinishing.current = true;
    streamingCapture.current = false;
    if (shouldScore) {
      setDiagnosticOperation('pronunciation_grading_streaming');
    } else {
      // Older dev clients can take several seconds to resolve stopAsync.
      // Show the intended silence feedback immediately while they finish.
      setPhase('retry');
      setMessage('No puedo escucharte.');
    }
    let recordingUri = '';
    try {
      const recorderStopStartedAt = Date.now();
      const nativeResult = await stopNativeSpeech();
      const recorderFinalizeMs = Date.now() - recorderStopStartedAt;
      recordingUri = nativeResult.uri;
      if (!isCurrentRun(runId)) return;
      if (!shouldScore || !heardSpeech.current) {
        handleNoSpeech(runId);
        return;
      }
      const signalEvidence = azureSignalEvidence(nativeResult.json);
      // Continuous recognition returns the most recent finalized segment,
      // which can be a short suffix such as "-ning". The complete recording
      // is still checked by the backend below, so only legacy one-shot builds
      // need this per-segment gate before upload.
      if (nativeStreamingImplementationVersion < 3 && !signalEvidence.reliable) {
        addDiagnosticBreadcrumb('pronunciation_signal_rejected', {
          confidence: signalEvidence.confidence,
          duration_ms: signalEvidence.durationMs,
          snr_db: signalEvidence.snr,
          status: signalEvidence.status,
        });
        handleNoSpeech(runId);
        return;
      }
      if (!recordingUri) {
        addDiagnosticBreadcrumb('pronunciation_recording_missing', {
          attempt: attemptRef.current + 1,
          streaming: true,
        });
        handleNoSpeech(runId);
        return;
      }
      const nextResult = await scorePronunciation(recordingUri, phrase, userId, {
        recorderFinalizeMs,
        level,
        exerciseType: exerciseTypeForPhrase(phrase),
      });
      if (!isCurrentRun(runId)) return;
      const resultConfidence = nextResult.diagnostics?.recognitionConfidence;
      const resultSnr = nextResult.diagnostics?.snr;
      if (
        nextResult.feedback?.code === 'NO_SPEECH'
        || nextResult.feedback?.code === 'RECORDING_UNCLEAR'
        || nextResult.feedback?.code === 'SYSTEM_UNCERTAIN'
        || (typeof resultSnr === 'number' && resultSnr < MIN_AZURE_SNR_DB)
        || (typeof resultConfidence === 'number'
          && resultConfidence < MIN_AZURE_RECOGNITION_CONFIDENCE)
      ) {
        addDiagnosticBreadcrumb('pronunciation_streaming_result_rejected', {
          confidence: resultConfidence,
          feedback_code: nextResult.feedback?.code,
          snr_db: resultSnr,
        });
        handleNoSpeech(runId);
        return;
      }
      noSpeechRound.current = 0;
      setPhase('checking');
      setMessage('Calificando…');
      nextResult._timing = {
        ...nextResult._timing,
        recorder_finalize_ms: recorderFinalizeMs,
      };
      setResult(nextResult);
      onAttempted?.();
      const { accepted, nextAccuracy, nextCompleteness } = evaluateResult(nextResult);
      addDiagnosticBreadcrumb(accepted ? 'pronunciation_streaming_accepted' : 'pronunciation_streaming_retry', {
        accuracy: typeof nextAccuracy === 'number' ? Math.round(nextAccuracy) : undefined,
        attempt: attemptRef.current + 1,
        completeness: nextCompleteness,
        matched_words: liveMatchedCountRef.current,
        total_words: expectedTokens.length,
      });
      await completeGradedAttempt(
        accepted,
        nextResult.feedback?.messages.es ?? (accepted ? 'Muy bien.' : 'Inténtalo otra vez.'),
        recordingUri,
        runId,
      );
    } catch (scoreError) {
      if (!isCurrentRun(runId)) return;
      if (!shouldScore || !heardSpeech.current || isExpectedNoSpeechRecognition(scoreError)) {
        addDiagnosticBreadcrumb('pronunciation_no_speech', {
          attempt: attemptRef.current + 1,
          provider_rejected_speech: isExpectedNoSpeechRecognition(scoreError),
        });
        handleNoSpeech(runId);
        return;
      }
      captureDiagnosticError(scoreError, 'pronunciation_grading_streaming', {
        attempt: attemptRef.current + 1,
        phrase_length: phrase.length,
      });
      if (isExpectedConnectivityError(scoreError)) {
        showUnavailableState('No pudimos calificar tu voz. Revisa tu conexión a internet.');
        return;
      }
      handleNoSpeech(runId);
    } finally {
      if (recordingUri) {
        try {
          new File(recordingUri).delete();
        } catch {
          // This is a disposable Android cache file and may already be gone.
        }
      }
    }
  }, [completeGradedAttempt, evaluateResult, expectedTokens.length, handleNoSpeech, isCurrentRun, level, onAttempted, phrase, showUnavailableState, userId, voiceEvidence]);

  const finishCapture = useCallback(async (shouldScore: boolean) => {
    const runId = runIdRef.current;
    if (!isCurrentRun(runId)) return;
    if (captureFinishing.current) return;
    const evidence = voiceEvidence();
    // iOS metering is useful for responsive UI, but it is not reliable enough
    // to decide whether a valid recording should be discarded. Let the server
    // inspect the finalized audio whenever the listening window completed.
    const hasGradeableVoice = shouldScore;
    console.info('[SpanGlish] Pronunciation voice gate', {
      ...evidence,
      requestedReason: shouldScore ? 'score' : 'no-speech',
      route: hasGradeableVoice ? 'verify-recording' : 'no-speech',
    });
    captureFinishing.current = true;
    if (hasGradeableVoice) {
      setDiagnosticOperation('pronunciation_grading');
    } else {
      setPhase('retry');
      setMessage('No puedo escucharte.');
    }
    let recordingUri = '';
    try {
      const recorderStopStartedAt = Date.now();
      await recorder.stop();
      if (!isCurrentRun(runId)) return;
      const recorderFinalizeMs = Date.now() - recorderStopStartedAt;
      recordingUri = recorder.uri || '';
      if (!hasGradeableVoice || !recordingUri) {
        handleNoSpeech(runId);
        return;
      }
      if (!evidence.strong) {
        addDiagnosticBreadcrumb('pronunciation_recording_uploaded_without_local_voice', {
          active_ms: evidence.activeMs,
          level_range_db: evidence.levelRangeDb,
          peak_db: evidence.peakDb,
          samples: evidence.samples,
        });
      }
      const nextResult = await scorePronunciation(recordingUri, phrase, userId, {
        recorderFinalizeMs,
        level,
        exerciseType: exerciseTypeForPhrase(phrase),
      });
      if (!isCurrentRun(runId)) return;
      const resultConfidence = nextResult.diagnostics?.recognitionConfidence;
      const resultSnr = nextResult.diagnostics?.snr;
      if (
        nextResult.feedback?.code === 'NO_SPEECH'
        || nextResult.feedback?.code === 'RECORDING_UNCLEAR'
        || nextResult.feedback?.code === 'SYSTEM_UNCERTAIN'
        || (typeof resultSnr === 'number' && resultSnr < MIN_AZURE_SNR_DB)
        || (typeof resultConfidence === 'number'
          && resultConfidence < MIN_AZURE_RECOGNITION_CONFIDENCE)
      ) {
        addDiagnosticBreadcrumb('pronunciation_recording_signal_rejected', {
          confidence: resultConfidence,
          feedback_code: nextResult.feedback?.code,
          snr_db: resultSnr,
        });
        handleNoSpeech(runId);
        return;
      }
      noSpeechRound.current = 0;
      setPhase('checking');
      setMessage('Calificando…');
      nextResult._timing = {
        ...nextResult._timing,
        recorder_finalize_ms: recorderFinalizeMs,
      };
      console.info('[SpanGlish] Pronunciation timing', nextResult._timing);
      setResult(nextResult);
      onAttempted?.();
      const { accepted, nextAccuracy } = evaluateResult(nextResult);
      if (accepted) {
        addDiagnosticBreadcrumb('pronunciation_accepted', {
          accuracy: typeof nextAccuracy === 'number' ? Math.round(nextAccuracy) : undefined,
          attempt: attemptRef.current + 1,
        });
      } else {
        addDiagnosticBreadcrumb('pronunciation_retry', {
          accuracy: typeof nextAccuracy === 'number' ? Math.round(nextAccuracy) : undefined,
          attempt: attemptRef.current + 1,
        });
      }
      await completeGradedAttempt(
        accepted,
        nextResult.feedback?.messages.es ?? (accepted ? 'Muy bien.' : 'Inténtalo otra vez.'),
        recordingUri,
        runId,
      );
    } catch (scoreError) {
      if (!isCurrentRun(runId)) return;
      if (isExpectedNoSpeechRecognition(scoreError)) {
        addDiagnosticBreadcrumb('pronunciation_no_speech', {
          attempt: attemptRef.current + 1,
          provider_rejected_speech: true,
        });
        handleNoSpeech(runId);
        return;
      }
      captureDiagnosticError(scoreError, 'pronunciation_grading', {
        attempt: attemptRef.current + 1,
        phrase_length: phrase.length,
      });
      if (isExpectedConnectivityError(scoreError)) {
        showUnavailableState('No pudimos calificar tu voz. Revisa tu conexión a internet.');
        return;
      }
      handleNoSpeech(runId);
    } finally {
      if (recordingUri) {
        try {
          new File(recordingUri).delete();
        } catch {
          // Pronunciation recordings are disposable after server grading.
        }
      }
    }
  }, [completeGradedAttempt, evaluateResult, handleNoSpeech, isCurrentRun, level, onAttempted, phrase, recorder, showUnavailableState, userId, voiceEvidence]);

  const startListening = useCallback(async () => {
    const runId = runIdRef.current;
    if (!isCurrentRun(runId)) return;
    if (!isAppActive) {
      pauseForInterruption();
      return;
    }
    if (isOffline) {
      showUnavailableState();
      return;
    }
    try {
      setDiagnosticOperation('microphone_permission');
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!isCurrentRun(runId)) return;
      if (!permission.granted) {
        setPhase('permission');
        setMessage('Necesitamos permiso para escuchar tu pronunciación.');
        showMicrophonePermissionAlert(permission.canAskAgain);
        return;
      }
      // Keep the ready cue in a playback-only session. On iOS, playing a cue
      // after preparing the recorder can deactivate/reconfigure AVAudioSession
      // when the cue finishes, leaving the prepared recorder capturing silence.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!isCurrentRun(runId)) return;
      heardSpeech.current = false;
      setNoSpeechFailure(false);
      silenceStartedAt.current = null;
      resetVoiceEvidence();
      captureFinishing.current = false;
      const streamingToken = nativeStreamingAvailable
        ? await getPronunciationStreamingToken()
        : null;
      setPhase('ready');
      setMessage('Prepárate…');
      // Ensure no model-audio tail can leak into the learner's microphone
      // window before the ready cue establishes the three-second boundary.
      modelPlayer.pause();
      let cueEndedAt = Date.now();
      try {
        const playedCueEndedAt = await playReadyCueAndWait(runId);
        if (!playedCueEndedAt || !isCurrentRun(runId)) return;
        cueEndedAt = playedCueEndedAt;
      } catch (cueError) {
        addDiagnosticBreadcrumb('pronunciation_ready_cue_skipped', {
          reason: cueError instanceof Error ? cueError.message : String(cueError),
        });
      }
      if (!isCurrentRun(runId)) return;
      setDiagnosticOperation('microphone_prepare');
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
      });
      if (!isCurrentRun(runId)) return;
      if (!streamingToken) {
        await recorder.prepareToRecordAsync(SPEECH_RECORDING_OPTIONS);
        if (!isCurrentRun(runId)) return;
      }
      if (streamingToken) {
        streamingCapture.current = true;
        streamingStartedAt.current = cueEndedAt;
        lastVoiceAt.current = 0;
        resetVoiceEvidence();
        liveProgressComplete.current = false;
        liveMatchedCountRef.current = 0;
        liveRecognizedText.current = '';
        if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
        phraseCompleteTimer.current = null;
        setLiveLevel(0);
        setRecognizedSyllableKeys([]);
        setPhase('listening');
        setMessage('Ahora tú…');
        await startNativeSpeech({
          locale: streamingToken.locale,
          referenceText: phrase,
          region: streamingToken.region,
          token: streamingToken.token,
        });
      } else {
        recorder.record();
        setPhase('listening');
        setMessage('Ahora tú…');
      }
      setDiagnosticOperation('pronunciation_recording');
      addDiagnosticBreadcrumb('pronunciation_recording_started', {
        attempt: attemptRef.current + 1,
        streaming: Boolean(streamingToken),
      });
    } catch (recordingError) {
      if (!isCurrentRun(runId)) return;
      if (streamingCapture.current) void discardNativeRecording();
      streamingCapture.current = false;
      captureDiagnosticError(recordingError, 'microphone_prepare', {
        attempt: attemptRef.current + 1,
      });
      if (isExpectedConnectivityError(recordingError)) {
        showUnavailableState('No pudimos iniciar la pronunciación. Revisa tu conexión a internet.');
      } else {
        scheduleRetry('No pudimos abrir el micrófono.', runId);
      }
    }
  }, [discardNativeRecording, isAppActive, isCurrentRun, isOffline, modelPlayer, pauseForInterruption, phrase, playReadyCueAndWait, recorder, resetVoiceEvidence, scheduleRetry, showUnavailableState]);

  useEffect(() => {
    if (!nativeStreamingAvailable) return undefined;
    const levelSubscription = addSpeechListener<SpeechLevelEvent>('onSpeechLevel', (event) => {
      if (!streamingCapture.current) return;
      const now = Date.now();
      const speechThreshold = Math.max(
        SPEECH_THRESHOLD_FLOOR_DB,
        noiseFloorDb.current + SPEECH_ABOVE_NOISE_DB,
      );
      const active = event.active && event.levelDb >= speechThreshold;
      if (!heardSpeech.current && !active) {
        noiseFloorDb.current = noiseFloorDb.current * 0.9 + event.levelDb * 0.1;
      }
      setLiveLevel(Math.max(0.08, Math.min(1, (event.levelDb + 60) / 34)));
      if (active) {
        recordActiveVoiceSample(event.levelDb, now);
        if (heardSpeech.current) {
          lastVoiceAt.current = now;
          return;
        }
        if (voiceCandidateStartedAt.current === null) {
          voiceCandidateStartedAt.current = now;
          voiceCandidatePeakDb.current = event.levelDb;
        } else {
          voiceCandidatePeakDb.current = Math.max(voiceCandidatePeakDb.current, event.levelDb);
        }
        const candidateDuration = now - voiceCandidateStartedAt.current;
        const hasVoicePeak = voiceCandidatePeakDb.current >= speechThreshold + VOICE_PEAK_ABOVE_THRESHOLD_DB;
        if (candidateDuration >= MIN_CONFIRMED_VOICE_MS && hasVoicePeak) {
          heardSpeech.current = true;
          lastVoiceAt.current = now;
          setMessage('Te escucho…');
          addDiagnosticBreadcrumb('pronunciation_voice_confirmed', {
            duration_ms: candidateDuration,
            noise_floor_db: Math.round(noiseFloorDb.current),
            peak_db: Math.round(voiceCandidatePeakDb.current),
          });
          if (liveProgressComplete.current && voiceEvidence().strong && !phraseCompleteTimer.current) {
            phraseCompleteTimer.current = setTimeout(() => {
              phraseCompleteTimer.current = null;
              void finishNativeCapture();
            }, 250);
          }
        }
      } else if (!heardSpeech.current) {
        voiceLastActiveSampleAt.current = null;
        voiceCandidateStartedAt.current = null;
        voiceCandidatePeakDb.current = -160;
      } else {
        voiceLastActiveSampleAt.current = null;
      }
    });
    const progressSubscription = addSpeechListener<SpeechProgressEvent>('onSpeechProgress', (event) => {
      if (!streamingCapture.current || !event.text) return;
      liveRecognizedText.current = event.text;
      if (!voiceEvidence().strong) return;
      const syllableEvidence = liveSyllableEvidence(phrase, '', event.text);
      const observedTokens = speechTokens(event.text);
      const lastObservedToken = observedTokens.at(-1);
      const predictedWordIndex = lastObservedToken
        ? expectedTokens.findIndex((token) => token === lastObservedToken)
        : -1;
      const predictedWordSyllableKeys = new Set(
        expectedSyllables
          .filter((syllable) => syllable.wordIndex === predictedWordIndex)
          .map((syllable) => syllable.key),
      );
      // Azure can predict an entire reference word from a different sound.
      // Keep the current full-word hypothesis neutral until scored evidence
      // arrives; prior completed words and explicit fragments remain green.
      const newlyRecognizedKeys = syllableEvidence.recognizedKeys.filter(
        (key) => !predictedWordSyllableKeys.has(key),
      );
      setRecognizedSyllableKeys((current) => [
        ...new Set([...current, ...newlyRecognizedKeys]),
      ]);
    });
    const resultSubscription = addSpeechListener<SpeechResultEvent>('onSpeechResult', (event) => {
      if (!streamingCapture.current || !event.text) return;
      liveRecognizedText.current = event.text;
      const signalEvidence = azureSignalEvidence(event.json);
      // A short finalized suffix may be under the final-grade duration gate,
      // but it can safely update live progress because exact syllable mapping
      // and Azure pronunciation scores are checked below.
      if (!signalEvidence.recognized) {
        liveProgressComplete.current = false;
        addDiagnosticBreadcrumb('pronunciation_live_signal_rejected', {
          confidence: signalEvidence.confidence,
          duration_ms: signalEvidence.durationMs,
          snr_db: signalEvidence.snr,
          status: signalEvidence.status,
        });
        return;
      }
      const progress = assessedPhraseProgress(
        phrase,
        event.text,
        event.json,
        liveMatchedCountRef.current,
      );
      liveMatchedCountRef.current = progress.matchedCount;
      if (!voiceEvidence().strong) {
        liveProgressComplete.current = progress.completed;
        addDiagnosticBreadcrumb('pronunciation_result_waiting_for_voice', {
          matched_words: progress.matchedCount,
          total_words: expectedTokens.length,
        });
        return;
      }
      const syllableEvidence = liveSyllableEvidence(phrase, event.json, event.segmentText);
      syllableEvidence.recognizedKeys.forEach((key) => scoredSyllableKeysRef.current.add(key));
      const allSyllablesConfirmed = expectedSyllables.length > 0
        && expectedSyllables.every((syllable) => scoredSyllableKeysRef.current.has(syllable.key));
      liveProgressComplete.current = progress.completed || allSyllablesConfirmed;
      setRecognizedSyllableKeys((current) => [
        ...new Set([...current, ...syllableEvidence.recognizedKeys]),
      ]);
      if (liveProgressComplete.current && !phraseCompleteTimer.current) {
        // The finalized result is already available. Retain a small audio tail
        // before stopping so the final consonant or suffix is never clipped.
        phraseCompleteTimer.current = setTimeout(() => {
          phraseCompleteTimer.current = null;
          void finishNativeCapture();
        }, 250);
      }
    });
    const errorSubscription = addSpeechListener<SpeechErrorEvent>('onSpeechError', (event) => {
      if (!streamingCapture.current) return;
      if (/InitialSilenceTimeout/i.test(event.message)) return;
      captureDiagnosticError(new Error(event.message), 'pronunciation_streaming');
    });
    const stateSubscription = addSpeechListener<SpeechStateEvent>('onSpeechState', (event) => {
      addDiagnosticBreadcrumb('native_audio_state', {
        channels: event.channels,
        input_route: event.inputRoute,
        output_route: event.outputRoute,
        sample_rate: event.sampleRate,
        state: event.state,
      });
    });
    return () => {
      levelSubscription.remove();
      progressSubscription.remove();
      resultSubscription.remove();
      errorSubscription.remove();
      stateSubscription.remove();
    };
  }, [expectedSyllables, expectedTokens, finishNativeCapture, phrase, recordActiveVoiceSample, voiceEvidence]);

  useEffect(() => {
    if (phase !== 'listening' || !streamingCapture.current) return undefined;
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - streamingStartedAt.current;
      if (!heardSpeech.current) {
        if (elapsed >= NO_SPEECH_LISTEN_MS) {
          void finishNativeCapture('no-speech');
        }
        return;
      }
      const quietFor = lastVoiceAt.current ? now - lastVoiceAt.current : 0;
      const phraseFinished = liveProgressComplete.current && heardSpeech.current && quietFor >= 750;
      const speechEndedWithoutExactMatch = heardSpeech.current && quietFor >= 3500;
      const hardLimitMs = Math.min(Math.max(expectedTokens.length * 3500, 15_000), 30_000);
      if (phraseFinished || speechEndedWithoutExactMatch || elapsed >= hardLimitMs) {
        void finishNativeCapture(voiceEvidence().strong ? 'score' : 'no-speech');
      }
    }, 100);
    return () => clearInterval(timer);
  }, [expectedTokens.length, finishNativeCapture, phase, voiceEvidence]);

  useEffect(() => {
    if (!statusIsAnimated) {
      pulseAnimation.stopAnimation();
      pulseAnimation.setValue(0);
      waveAnimations.forEach((animation) => {
        animation.stopAnimation();
        animation.setValue(0.3);
      });
      return undefined;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          duration: 425,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          duration: 425,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const wave = Animated.loop(
      Animated.stagger(
        75,
        waveAnimations.map((animation) =>
          Animated.sequence([
            Animated.timing(animation, {
              duration: 230,
              easing: Easing.inOut(Easing.ease),
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(animation, {
              duration: 230,
              easing: Easing.inOut(Easing.ease),
              toValue: 0.3,
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );
    pulse.start();
    wave.start();
    return () => {
      pulse.stop();
      wave.stop();
    };
  }, [pulseAnimation, statusIsAnimated, waveAnimations]);

  useEffect(() => {
    successAnimation.stopAnimation();
    if (!result || !passed || reduceMotion) {
      successAnimation.setValue(1);
      return undefined;
    }

    successAnimation.setValue(0.82);
    const celebration = Animated.sequence([
      Animated.spring(successAnimation, {
        friction: 4,
        tension: 180,
        toValue: 1.12,
        useNativeDriver: true,
      }),
      Animated.spring(successAnimation, {
        friction: 5,
        tension: 140,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    celebration.start();
    return () => celebration.stop();
  }, [passed, reduceMotion, result, successAnimation]);

  useEffect(() => {
    if (phase !== 'listening') {
      setListeningFrame(0);
      return undefined;
    }

    if (reduceMotion) {
      setListeningFrame(LISTENING_MASCOT_FRAMES.length - 1);
      return undefined;
    }

    let cancelled = false;
    let currentFrame = 0;
    let frameTimer: ReturnType<typeof setTimeout> | undefined;
    setListeningFrame(0);

    const advanceFrame = () => {
      if (cancelled || currentFrame >= LISTENING_MASCOT_FRAMES.length - 1) return;
      currentFrame += 1;
      setListeningFrame(currentFrame);
      if (currentFrame < LISTENING_MASCOT_FRAMES.length - 1) {
        frameTimer = setTimeout(advanceFrame, LISTENING_MASCOT_FRAME_MS[currentFrame]);
      }
    };

    frameTimer = setTimeout(advanceFrame, LISTENING_MASCOT_FRAME_MS[0]);
    return () => {
      cancelled = true;
      if (frameTimer) clearTimeout(frameTimer);
    };
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (phase !== 'checking' || reduceMotion) {
      setGradingFrame(0);
      return undefined;
    }

    let cancelled = false;
    let currentFrame = 0;
    let frameTimer: ReturnType<typeof setTimeout> | undefined;
    setGradingFrame(0);

    const advanceFrame = () => {
      if (cancelled) return;
      currentFrame = (currentFrame + 1) % GRADING_MASCOT_FRAMES.length;
      setGradingFrame(currentFrame);
      frameTimer = setTimeout(advanceFrame, GRADING_MASCOT_FRAME_MS[currentFrame]);
    };

    frameTimer = setTimeout(advanceFrame, GRADING_MASCOT_FRAME_MS[0]);
    return () => {
      cancelled = true;
      if (frameTimer) clearTimeout(frameTimer);
    };
  }, [phase, reduceMotion]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (modelLoadTimer.current) clearTimeout(modelLoadTimer.current);
      modelLoadTimer.current = null;
      if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
      phraseCompleteTimer.current = null;
      if (streamingCapture.current) void discardNativeRecording();
      streamingCapture.current = false;
      try {
        modelPlayerRef.current.pause();
      } catch {
        // The native object may already be unavailable during app teardown.
      }
      const activeReadyCuePlayer = activeReadyCuePlayerRef.current;
      activeReadyCuePlayerRef.current = null;
      if (activeReadyCuePlayer) {
        try {
          activeReadyCuePlayer.pause();
          activeReadyCuePlayer.release();
        } catch {
          // The native object may already be unavailable during app teardown.
        }
      }
      const activeAttemptPlayback = activeAttemptPlaybackRef.current;
      activeAttemptPlaybackRef.current = null;
      if (activeAttemptPlayback) {
        try {
          activeAttemptPlayback.pause();
          activeAttemptPlayback.release();
        } catch {
          // The recording player may already have completed and released itself.
        }
      }
      try {
        modelPlayerRef.current.release();
      } catch {
        // Release is idempotent from the component's point of view.
      }
      retiredModelPlayersRef.current.forEach((player) => {
        try {
          player.release();
        } catch {
          // Retired players may already be unavailable during app teardown.
        }
      });
      retiredModelPlayersRef.current = [];
    };
  }, [discardNativeRecording]);

  useEffect(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    attemptRef.current = 0;
    noSpeechRound.current = 0;
    setAttempt(0);
    playModel(runId);
    return () => {
      if (runIdRef.current === runId) runIdRef.current += 1;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (modelLoadTimer.current) clearTimeout(modelLoadTimer.current);
      modelLoadTimer.current = null;
      if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
      phraseCompleteTimer.current = null;
      if (streamingCapture.current) void discardNativeRecording();
      streamingCapture.current = false;
    };
  }, [discardNativeRecording, phrase, playModel]);

  useEffect(() => {
    if (phase !== 'model') return;
    if (modelStatus.error && (modelLoadTimer.current || modelWasPlaying.current)) {
      if (modelLoadTimer.current) clearTimeout(modelLoadTimer.current);
      modelLoadTimer.current = null;
      modelWasPlaying.current = false;
      showUnavailableState('No pudimos reproducir la frase. Revisa tu conexión e inténtalo otra vez.');
      return;
    }
    if (modelStatus.playing) {
      modelWasPlaying.current = true;
      if (modelLoadTimer.current) clearTimeout(modelLoadTimer.current);
      modelLoadTimer.current = null;
    }
    if (modelStatus.didJustFinish && modelWasPlaying.current) {
      modelWasPlaying.current = false;
      void startListening();
    }
  }, [modelStatus.didJustFinish, modelStatus.error, modelStatus.playing, phase, showUnavailableState, startListening]);

  useEffect(() => {
    if (phase !== 'listening' || streamingCapture.current || !recorderState.isRecording) return;
    const levelDb = recorderState.metering ?? -160;
    const elapsed = recorderState.durationMillis;
    const speechThreshold = Math.max(
      SPEECH_THRESHOLD_FLOOR_DB,
      noiseFloorDb.current + SPEECH_ABOVE_NOISE_DB,
    );
    const active = levelDb >= speechThreshold;
    if (!heardSpeech.current && !active) {
      noiseFloorDb.current = noiseFloorDb.current * 0.9 + levelDb * 0.1;
    }
    if (active) {
      recordActiveVoiceSample(levelDb, elapsed);
      if (heardSpeech.current) {
        silenceStartedAt.current = null;
      } else {
        if (voiceCandidateStartedAt.current === null) {
          voiceCandidateStartedAt.current = elapsed;
          voiceCandidatePeakDb.current = levelDb;
        } else {
          voiceCandidatePeakDb.current = Math.max(voiceCandidatePeakDb.current, levelDb);
        }
        const candidateDuration = elapsed - voiceCandidateStartedAt.current;
        if (
          candidateDuration >= MIN_CONFIRMED_VOICE_MS
          && voiceCandidatePeakDb.current >= speechThreshold + VOICE_PEAK_ABOVE_THRESHOLD_DB
        ) {
          heardSpeech.current = true;
          silenceStartedAt.current = null;
          setMessage('Te escucho…');
        }
      }
    } else if (!heardSpeech.current) {
      voiceLastActiveSampleAt.current = null;
      voiceCandidateStartedAt.current = null;
      voiceCandidatePeakDb.current = -160;
    } else if (heardSpeech.current && elapsed > 900) {
      voiceLastActiveSampleAt.current = null;
      if (silenceStartedAt.current === null) silenceStartedAt.current = Date.now();
      if (Date.now() - silenceStartedAt.current >= IOS_SPEECH_END_SILENCE_MS) {
        void finishCapture(true);
      }
    }
    if (!heardSpeech.current) {
      if (elapsed >= NO_SPEECH_LISTEN_MS) void finishCapture(false);
      return;
    }
    const maximumMs = Math.min(Math.max(phrase.length * 260, 8000), 15_000);
    if (elapsed >= maximumMs) void finishCapture(true);
  }, [
    finishCapture,
    phase,
    phrase.length,
    recordActiveVoiceSample,
    recorderState.durationMillis,
    recorderState.isRecording,
    recorderState.metering,
    voiceEvidence,
  ]);

  useEffect(() => {
    if (phase !== 'success' || !passed || successChimePlayed.current) return;
    successChimePlayed.current = true;
    void successChimePlayer.seekTo(0)
      .then(() => successChimePlayer.play())
      .catch(() => {
        // Celebration audio should never interrupt automatic lesson progress.
      });
  }, [passed, phase, successChimePlayer]);

  useEffect(() => {
    if (
      phase !== 'success'
      || (!passed && !continueAfterCoaching)
      || reviewingRecording
      || gradedAdvanceHandled.current
    ) return undefined;
    // Give the learner time to read the final grade and advice before the
    // lesson advances to the next slide.
    const timer = setTimeout(onPassed, GRADING_REVIEW_MS);
    return () => clearTimeout(timer);
  }, [continueAfterCoaching, onPassed, passed, phase, reviewingRecording]);

  const statusColor = serviceUnavailable
    ? '#9a5b12'
    : phase === 'listening'
    ? '#d95c52'
    : phase === 'checking'
      ? '#76559e'
      : phase === 'success'
        ? '#2f8f62'
        : '#697177';

  const gradingMascot = phase === 'checking' ? (
    <View style={styles.gradingMascotWrap}>
      <Image
        accessibilityLabel="La profesora ardilla está calificando"
        resizeMode="contain"
        source={GRADING_MASCOT_FRAMES[gradingFrame]}
        style={styles.gradingMascot}
      />
    </View>
  ) : null;

  const listeningMascot = phase === 'listening' ? (
    <View
      accessible
      accessibilityLabel="Escuchando"
      style={[styles.listeningMascotWrap, { height: listeningMascotHeight, width: listeningMascotWidth }]}
    >
      <Image
        resizeMode="contain"
        source={LISTENING_MASCOT_FRAMES[listeningFrame]}
        style={[
          styles.listeningMascot,
          { height: listeningMascotHeight, width: listeningMascotWidth },
        ]}
      />
    </View>
  ) : null;

  const activeMascot = listeningMascot ?? gradingMascot;

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <View style={isLandscape ? styles.landscapeMediaRow : styles.portraitMediaRow}>
          {/* Guardrail: equal side columns keep the centered image and mascot from ever overlapping. */}
          {isLandscape ? <View style={styles.mascotColumn}>{activeMascot}</View> : null}
          {videoName && !reduceMotion ? (
            <View
              style={[
                styles.practiceMedia,
                { height: imageHeight },
                isLandscape ? styles.practiceImageLandscape : null,
              ]}
            >
              <Image
                accessibilityLabel={imageLabel || phrase}
                resizeMode="contain"
                source={{ uri: absoluteMediaUrl(imageUrl) }}
                style={styles.practiceMediaLayer}
              />
              <VideoView
                accessible={false}
                contentFit="contain"
                nativeControls={false}
                player={practiceVideoPlayer}
                pointerEvents="none"
                surfaceType="textureView"
                style={styles.practiceMediaLayer}
              />
            </View>
          ) : (
            <Image
              accessibilityLabel={imageLabel || phrase}
              resizeMode="contain"
              source={{ uri: absoluteMediaUrl(imageUrl) }}
              style={[styles.practiceImage, { height: imageHeight }, isLandscape ? styles.practiceImageLandscape : null]}
            />
          )}
          {isLandscape ? <View style={styles.mascotColumn} /> : null}
        </View>
      ) : null}
      <Pressable
        accessibilityHint="Reproduce nuevamente el ejemplo en inglés"
        accessibilityLabel="Repetir audio"
        accessibilityRole="button"
        disabled={phase === 'checking' || phase === 'listening' || phase === 'ready' || reviewingRecording}
        onPress={() => phase === 'permission' ? void startListening() : playModel()}
      >
        {phase === 'listening' ? (
          <View style={styles.liveAssessment}>
            <Text style={styles.phrase}>{phrase}</Text>
            <View
              accessibilityLabel={expectedSyllables.map((syllable) => (
                `${syllable.label}, ${recognizedSyllableKeySet.has(syllable.key) ? 'reconocida' : 'pendiente'}`
              )).join('. ')}
              style={styles.syllableSlots}
            >
              {expectedSyllables.map((syllable) => {
                const recognized = recognizedSyllableKeySet.has(syllable.key);
                return (
                  <Text
                    key={syllable.key}
                    style={[
                      styles.syllableSlot,
                      recognized ? styles.syllableSlotRecognized : styles.syllableSlotMissing,
                    ]}
                  >
                    {syllable.label}
                  </Text>
                );
              })}
            </View>
          </View>
        ) : <Text style={styles.phrase}>{phrase}</Text>}
      </Pressable>
      <View style={styles.statusRow}>
        {!isLandscape ? gradingMascot : null}
        <View style={styles.signalStack}>
          <View style={styles.signalRow}>
            <Animated.View
              style={[
                styles.statusDot,
                {
                  backgroundColor: statusColor,
                  opacity: statusIsAnimated
                    ? pulseAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })
                    : statusIsActive ? 0.9 : 1,
                  transform: [{
                    scale: statusIsAnimated
                      ? pulseAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] })
                      : 1,
                  }],
                },
              ]}
            />
            <View style={styles.wave} accessibilityElementsHidden>
              {[12, 22, 30, 22, 12].map((height, index) => (
                <Animated.View
                  key={`${height}-${index}`}
                  style={[
                    styles.waveBar,
                    {
                      backgroundColor: statusColor,
                      height,
                      opacity: statusIsActive ? 1 : 0.35,
                      transform: [{
                        scaleY: phase === 'listening' && streamingCapture.current
                          ? Math.max(0.18, Math.min(1, liveLevel * (index % 2 ? 0.8 : 1.1)))
                          : statusIsAnimated ? waveAnimations[index] : statusIsActive ? 0.7 : 0.27,
                      }],
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
        {!isLandscape ? listeningMascot : null}
        <Text style={[styles.message, { color: statusColor }]}>{message}</Text>
      </View>
      {attempt > 0 && phase !== 'success' ? <Text style={styles.attempt}>Intento {attempt + 1}</Text> : null}
      {serviceUnavailable ? (
        <View style={styles.offlineActions}>
          <Pressable
            accessibilityLabel={isOffline ? 'Esperando conexión para reintentar' : 'Reintentar pronunciación'}
            accessibilityRole="button"
            disabled={isOffline}
            onPress={() => void playModel()}
            style={({ pressed }) => [
              styles.retryNoSpeech,
              isOffline ? styles.offlineRetryDisabled : null,
              pressed ? styles.retryNoSpeechPressed : null,
            ]}
          >
            <Text style={styles.retryNoSpeechText}>{isOffline ? 'Esperando conexión' : 'Reintentar'}</Text>
          </Pressable>
          <Pressable
            accessibilityHint="Continúa la lección sin sumar esta tarjeta al puntaje"
            accessibilityLabel="Continuar sin calificar pronunciación"
            accessibilityRole="button"
            onPress={onUnavailable}
            style={({ pressed }) => [styles.offlineContinue, pressed ? styles.retryNoSpeechPressed : null]}
          >
            <Text style={styles.offlineContinueText}>Continuar sin calificar</Text>
          </Pressable>
        </View>
      ) : noSpeechFailure ? (
        <Pressable
          accessibilityLabel="Reintentar pronunciación"
          accessibilityRole="button"
          onPress={() => {
            noSpeechRound.current = 0;
            void playModel();
          }}
          style={({ pressed }) => [styles.retryNoSpeech, pressed ? styles.retryNoSpeechPressed : null]}
        >
          <Text style={styles.retryNoSpeechText}>Reintentar</Text>
        </Pressable>
      ) : null}
      {result ? (
        <>
          <View style={[styles.scorePanel, passed ? styles.passedPanel : styles.practicePanel]}>
            <View style={styles.scoreDetails}>
              <Animated.Text
                style={[
                  styles.scoreTitle,
                  passed ? { transform: [{ scale: successAnimation }] } : null,
                ]}
              >
                {passed ? '✨ ' : ''}
                {result.feedback?.messages.es ?? (passed ? '¡Muy bien!' : 'Escucha e inténtalo de nuevo.')}
                {passed ? ' ✨' : ''}
              </Animated.Text>
            </View>
          </View>
          <View
            accessibilityLabel={`Resultado: ${finalWordFeedback.map(({ good, token }) => {
              return `${token}, ${good ? 'bien' : 'necesita mejorar'}`;
            }).join('. ')}`}
            style={styles.words}
          >
            {finalWordFeedback.map(({ good, token }, index) => {
              return (
                <Text
                  key={`${token}-${index}`}
                  style={[styles.word, good ? styles.wordGood : styles.wordNeedsImprovement]}
                >
                  {token}
                </Text>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, marginTop: 4 },
  landscapeMediaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', width: '100%' },
  mascotColumn: { alignItems: 'center', justifyContent: 'center', width: 112 },
  portraitMediaRow: { alignItems: 'center', width: '100%' },
  practiceImage: { alignSelf: 'center', width: '100%' },
  practiceImageLandscape: { flex: 1, minWidth: 0, width: undefined },
  practiceMedia: {
    alignSelf: 'center',
    backgroundColor: '#f2ebde',
    borderRadius: 17,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  practiceMediaLayer: {
    bottom: 0,
    height: '100%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
  phrase: { color: '#24333a', fontSize: 18, fontWeight: '900', lineHeight: 22, textAlign: 'center' },
  liveAssessment: { alignItems: 'center', gap: 3 },
  syllableSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  syllableSlot: { borderRadius: 7, borderWidth: 1.5, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  syllableSlotRecognized: { backgroundColor: '#dff4e7', borderColor: '#2f8f62', color: '#17623f' },
  syllableSlotMissing: { backgroundColor: '#ffffff', borderColor: '#b8c3c8', color: '#64747b' },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minHeight: 32 },
  signalStack: { alignItems: 'center', marginRight: 8 },
  signalRow: { alignItems: 'center', flexDirection: 'row' },
  listeningMascotWrap: { height: 104, position: 'relative', width: 94 },
  listeningMascot: { height: 94, width: 94 },
  gradingMascotWrap: { height: 104, position: 'relative', width: 94 },
  gradingMascot: { height: 104, width: 94 },
  statusDot: { borderRadius: 6, height: 11, marginRight: 10, width: 11 },
  wave: { alignItems: 'center', flexDirection: 'row', gap: 3, height: 28, marginRight: 8 },
  waveBar: { borderRadius: 3, width: 4 },
  message: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
  attempt: { color: '#8a4f00', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  retryNoSpeech: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#2f8f62', borderRadius: 13, justifyContent: 'center', minHeight: 42, paddingHorizontal: 22 },
  retryNoSpeechPressed: { opacity: 0.78 },
  retryNoSpeechText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  offlineActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  offlineRetryDisabled: { backgroundColor: '#899397', opacity: 0.75 },
  offlineContinue: { alignItems: 'center', backgroundColor: '#fff4dc', borderColor: '#c88b35', borderRadius: 13, borderWidth: 1.5, justifyContent: 'center', minHeight: 42, paddingHorizontal: 18 },
  offlineContinueText: { color: '#7a480d', fontSize: 13, fontWeight: '900' },
  scorePanel: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', padding: 10 },
  passedPanel: { backgroundColor: '#eaf6ee' },
  practicePanel: { backgroundColor: '#fff3df' },
  scoreDetails: { flex: 1, gap: 2 },
  scoreTitle: { color: '#17251f', fontSize: 13, fontWeight: '900', lineHeight: 18, textAlign: 'center' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  word: { borderRadius: 7, color: '#24333a', fontSize: 13, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4 },
  wordGood: { backgroundColor: '#dff4e7', color: '#17623f' },
  wordNeedsImprovement: { backgroundColor: '#fff2cf', color: '#8a5b10' },
});
