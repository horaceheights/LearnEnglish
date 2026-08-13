import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { File } from 'expo-file-system';
import {
  AudioModule,
  preload,
  RecordingPresets,
  setAudioModeAsync,
  type RecordingOptions,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { getPronunciationStreamingToken, scorePronunciation } from '../api';
import { absoluteMediaUrl, courseAudioUrl, READY_CUE_URL, type CourseAudioProvider, type CourseAudioVoice } from '../config';
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
  startNativeSpeech,
  stopNativeSpeech,
  type SpeechErrorEvent,
  type SpeechLevelEvent,
  type SpeechProgressEvent,
  type SpeechResultEvent,
} from '../../modules/spanglish-speech/src';

type Props = {
  audioProvider: CourseAudioProvider;
  audioVoice: CourseAudioVoice;
  phrase: string;
  imageHeight: number;
  imageLabel?: string;
  imageUrl?: string;
  level: string;
  userId?: string;
  onAttempted?: () => void;
  onPassed: () => void;
};

type Phase = 'model' | 'ready' | 'listening' | 'checking' | 'retry' | 'success' | 'permission';
const MAX_AUTOMATIC_ATTEMPTS = 2;
const NO_SPEECH_LISTEN_MS = 3000;
const MAX_NO_SPEECH_ROUNDS = 3;
const NO_SPEECH_REPLAY_DELAY_MS = 900;
const MIN_CONFIRMED_VOICE_MS = 240;
const MIN_SINGLE_WORD_ACTIVE_VOICE_MS = 280;
const MIN_PHRASE_ACTIVE_VOICE_MS = 420;
const MIN_VOICE_LEVEL_RANGE_DB = 3;
const MIN_AZURE_SNR_DB = 8;
const MIN_AZURE_SPEECH_MS = 250;
const MIN_AZURE_RECOGNITION_CONFIDENCE = 0.2;

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
    return {
      confidence,
      durationMs,
      reliable: statusSucceeded
        && recognizedText.trim().length > 0
        && typeof snr === 'number'
        && snr >= MIN_AZURE_SNR_DB
        && typeof durationMs === 'number'
        && durationMs >= MIN_AZURE_SPEECH_MS
        && (typeof confidence !== 'number' || confidence >= MIN_AZURE_RECOGNITION_CONFIDENCE),
      snr,
      status,
    };
  } catch {
    return { reliable: false };
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
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    sampleRate: 16000,
  },
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
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
  level,
  userId,
  onAttempted,
  onPassed,
}: Props) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const recorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const modelPlayer = useAudioPlayer(null);
  const readyCuePlayer = useAudioPlayer(null);
  const [readyCuePreload] = useState(() =>
    preload(READY_CUE_URL).catch(() => undefined),
  );
  const modelStatus = useAudioPlayerStatus(modelPlayer);
  const [phase, setPhase] = useState<Phase>('model');
  const [message, setMessage] = useState('Escucha la frase.');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [liveLevel, setLiveLevel] = useState(0);
  const [recognizedSyllableKeys, setRecognizedSyllableKeys] = useState<string[]>([]);
  const [continueAfterCoaching, setContinueAfterCoaching] = useState(false);
  const [noSpeechFailure, setNoSpeechFailure] = useState(false);
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
  const phraseCompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      && voiceActiveSampleCount.current >= 4
      && voiceEvidencePeakDb.current >= -37
      && levelRangeDb >= MIN_VOICE_LEVEL_RANGE_DB;
    return {
      activeMs: Math.round(voiceActiveDurationMs.current),
      levelRangeDb: Math.round(levelRangeDb * 10) / 10,
      peakDb: Math.round(voiceEvidencePeakDb.current),
      samples: voiceActiveSampleCount.current,
      strong,
    };
  }, [expectedTokens.length]);

  const playModel = useCallback((runId = runIdRef.current) => {
    if (!isCurrentRun(runId)) return;
    if (streamingCapture.current) void stopNativeSpeech();
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setResult(null);
    setContinueAfterCoaching(false);
    setNoSpeechFailure(false);
    setPhase('model');
    setMessage(attemptRef.current ? 'Escucha otra vez…' : 'Escucha la frase.');
    heardSpeech.current = false;
    silenceStartedAt.current = null;
    captureFinishing.current = false;
    streamingCapture.current = false;
    liveProgressComplete.current = false;
    liveMatchedCountRef.current = 0;
    liveRecognizedText.current = '';
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
    modelPlayer.replace(courseAudioUrl(
      phrase,
      'pronunciation_slow',
      'split-ing',
      audioProvider,
      audioVoice,
    ));
    if (!isCurrentRun(runId)) return;
    modelPlayer.play();
  }, [audioProvider, audioVoice, isCurrentRun, modelPlayer, phrase, resetVoiceEvidence]);

  const playReadyCueAndWait = useCallback(async (runId: number) => {
    await readyCuePlayer.seekTo(0).catch(() => undefined);
    if (!isCurrentRun(runId)) return null;
    readyCuePlayer.play();
    const cueStartedAt = Date.now();
    let playbackStartedAt: number | null = null;
    let expectedDurationMs = 180;

    while (Date.now() - cueStartedAt < 1200 && isCurrentRun(runId)) {
      if (readyCuePlayer.duration > 0) {
        expectedDurationMs = Math.max(1, readyCuePlayer.duration * 1000);
      }
      if (readyCuePlayer.playing && playbackStartedAt === null) {
        playbackStartedAt = Date.now();
      }
      const effectiveStartedAt = playbackStartedAt ?? cueStartedAt;
      const reachedExpectedEnd = Date.now() >= effectiveStartedAt + expectedDurationMs + 25;
      const reachedPlayerEnd = readyCuePlayer.duration > 0
        && readyCuePlayer.currentTime >= Math.max(0, readyCuePlayer.duration - 0.01);
      if (reachedExpectedEnd || reachedPlayerEnd) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    if (!isCurrentRun(runId)) return null;
    readyCuePlayer.pause();
    const cueEndedAt = Date.now();
    addDiagnosticBreadcrumb('pronunciation_ready_cue_finished', {
      cue_duration_ms: cueEndedAt - cueStartedAt,
    });
    return cueEndedAt;
  }, [isCurrentRun, readyCuePlayer]);

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
    retryTimer.current = setTimeout(() => playModel(runId), 3000);
  }, [isCurrentRun, playModel]);

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
      if (!signalEvidence.reliable) {
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
      if (accepted) {
        setPhase('success');
        setMessage(nextResult.feedback?.messages.es ?? 'Muy bien.');
        return;
      }
      scheduleRetry(nextResult.feedback?.messages.es ?? 'Inténtalo otra vez.', runId);
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
        scheduleRetry('Revisa tu conexión a internet.', runId);
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
  }, [evaluateResult, expectedTokens.length, handleNoSpeech, isCurrentRun, level, onAttempted, phrase, scheduleRetry, userId, voiceEvidence]);

  const finishCapture = useCallback(async (shouldScore: boolean) => {
    const runId = runIdRef.current;
    if (!isCurrentRun(runId)) return;
    if (captureFinishing.current) return;
    const evidence = voiceEvidence();
    const hasGradeableVoice = shouldScore && evidence.strong;
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
    try {
      const recorderStopStartedAt = Date.now();
      await recorder.stop();
      if (!isCurrentRun(runId)) return;
      const recorderFinalizeMs = Date.now() - recorderStopStartedAt;
      const uri = recorder.uri;
      if (!hasGradeableVoice || !uri) {
        handleNoSpeech(runId);
        return;
      }
      const nextResult = await scorePronunciation(uri, phrase, userId, {
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
        setPhase('success');
        setMessage(nextResult.feedback?.messages.es ?? 'Muy bien.');
      } else {
        scheduleRetry(nextResult.feedback?.messages.es ?? 'Inténtalo otra vez.', runId);
      }
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
        scheduleRetry('Revisa tu conexión a internet.', runId);
        return;
      }
      handleNoSpeech(runId);
    }
  }, [evaluateResult, handleNoSpeech, isCurrentRun, level, onAttempted, phrase, recorder, scheduleRetry, userId, voiceEvidence]);

  const startListening = useCallback(async () => {
    const runId = runIdRef.current;
    if (!isCurrentRun(runId)) return;
    try {
      setDiagnosticOperation('microphone_permission');
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!isCurrentRun(runId)) return;
      if (!permission.granted) {
        setPhase('permission');
        setMessage('Necesitamos permiso para escuchar tu pronunciación.');
        Alert.alert('Micrófono necesario', 'Permite que SpanGlish use el micrófono para continuar automáticamente.');
        return;
      }
      setDiagnosticOperation('microphone_prepare');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!isCurrentRun(runId)) return;
      heardSpeech.current = false;
      setNoSpeechFailure(false);
      silenceStartedAt.current = null;
      resetVoiceEvidence();
      captureFinishing.current = false;
      const streamingToken = nativeStreamingAvailable
        ? await getPronunciationStreamingToken()
        : null;
      if (!streamingToken) await recorder.prepareToRecordAsync(SPEECH_RECORDING_OPTIONS);
      if (!isCurrentRun(runId)) return;
      setPhase('ready');
      setMessage('Prepárate…');
      await readyCuePreload;
      if (!isCurrentRun(runId)) return;
      if (!readyCuePlayer.isLoaded) {
        readyCuePlayer.replace(READY_CUE_URL);
      }
      for (
        let attemptIndex = 0;
        attemptIndex < 30 && !readyCuePlayer.isLoaded && isCurrentRun(runId);
        attemptIndex += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!isCurrentRun(runId)) return;
      if (!readyCuePlayer.isLoaded) {
        throw new Error('Ready cue did not load.');
      }
      // Ensure no model-audio tail can leak into the learner's microphone
      // window before the ready cue establishes the three-second boundary.
      modelPlayer.pause();
      const cueEndedAt = await playReadyCueAndWait(runId);
      if (!cueEndedAt || !isCurrentRun(runId)) return;
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
      if (streamingCapture.current) void stopNativeSpeech();
      streamingCapture.current = false;
      captureDiagnosticError(recordingError, 'microphone_prepare', {
        attempt: attemptRef.current + 1,
      });
      scheduleRetry(
        isExpectedConnectivityError(recordingError)
          ? 'Tu conexión está débil.'
          : 'No pudimos abrir el micrófono.',
        runId,
      );
    }
  }, [isCurrentRun, modelPlayer, phrase, playReadyCueAndWait, readyCuePlayer, readyCuePreload, recorder, resetVoiceEvidence, scheduleRetry]);

  useEffect(() => {
    if (!nativeStreamingAvailable) return undefined;
    const levelSubscription = addSpeechListener<SpeechLevelEvent>('onSpeechLevel', (event) => {
      if (!streamingCapture.current) return;
      const now = Date.now();
      const speechThreshold = Math.max(-42, noiseFloorDb.current + 10);
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
        const hasVoicePeak = voiceCandidatePeakDb.current >= speechThreshold + 5;
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
      if (!signalEvidence.reliable) {
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
      liveProgressComplete.current = progress.completed;
      liveMatchedCountRef.current = progress.matchedCount;
      if (!voiceEvidence().strong) {
        addDiagnosticBreadcrumb('pronunciation_result_waiting_for_voice', {
          matched_words: progress.matchedCount,
          total_words: expectedTokens.length,
        });
        return;
      }
      const syllableEvidence = liveSyllableEvidence(phrase, event.json, event.segmentText);
      setRecognizedSyllableKeys((current) => [
        ...new Set([...current, ...syllableEvidence.recognizedKeys]),
      ]);
      if (progress.completed && voiceEvidence().strong && !phraseCompleteTimer.current) {
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
    return () => {
      levelSubscription.remove();
      progressSubscription.remove();
      resultSubscription.remove();
      errorSubscription.remove();
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
      if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
      phraseCompleteTimer.current = null;
      if (streamingCapture.current) void stopNativeSpeech();
      streamingCapture.current = false;
    };
  }, []);

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
      if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
      phraseCompleteTimer.current = null;
      if (streamingCapture.current) void stopNativeSpeech();
      streamingCapture.current = false;
    };
  }, [phrase, playModel]);

  useEffect(() => {
    if (phase !== 'model') return;
    if (modelStatus.playing) modelWasPlaying.current = true;
    if (modelStatus.didJustFinish && modelWasPlaying.current) {
      modelWasPlaying.current = false;
      void startListening();
    }
  }, [modelStatus.didJustFinish, modelStatus.playing, phase, startListening]);

  useEffect(() => {
    if (phase !== 'listening' || streamingCapture.current || !recorderState.isRecording) return;
    const levelDb = recorderState.metering ?? -160;
    const elapsed = recorderState.durationMillis;
    const speechThreshold = Math.max(-42, noiseFloorDb.current + 10);
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
        if (candidateDuration >= MIN_CONFIRMED_VOICE_MS && voiceCandidatePeakDb.current >= speechThreshold + 5) {
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
      if (Date.now() - silenceStartedAt.current >= 1800) {
        void finishCapture(voiceEvidence().strong);
      }
    }
    if (!heardSpeech.current) {
      if (elapsed >= NO_SPEECH_LISTEN_MS) void finishCapture(false);
      return;
    }
    const maximumMs = Math.min(Math.max(phrase.length * 260, 8000), 15_000);
    if (elapsed >= maximumMs) void finishCapture(voiceEvidence().strong);
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
    if (phase !== 'success' || (!passed && !continueAfterCoaching)) return undefined;
    const timer = setTimeout(onPassed, 3000);
    return () => clearTimeout(timer);
  }, [continueAfterCoaching, onPassed, passed, phase]);

  const statusColor = phase === 'listening'
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
          <Image
            accessibilityLabel={imageLabel || phrase}
            resizeMode="contain"
            source={{ uri: absoluteMediaUrl(imageUrl) }}
            style={[styles.practiceImage, { height: imageHeight }, isLandscape ? styles.practiceImageLandscape : null]}
          />
          {isLandscape ? <View style={styles.mascotColumn} /> : null}
        </View>
      ) : null}
      <Pressable
        accessibilityHint="Reproduce nuevamente el ejemplo en inglés"
        accessibilityLabel="Repetir audio"
        accessibilityRole="button"
        disabled={phase === 'checking' || phase === 'listening' || phase === 'ready'}
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
      {noSpeechFailure ? (
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
