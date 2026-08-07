import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { courseAudioUrl, READY_CUE_URL, type CourseAudioProvider, type CourseAudioVoice } from '../config';
import {
  addDiagnosticBreadcrumb,
  captureDiagnosticError,
  isExpectedConnectivityError,
  setDiagnosticOperation,
} from '../diagnostics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  alignExpectedPhrase,
  assessedPhraseProgress,
  paceIndependentAccuracy,
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
  level: string;
  userId?: string;
  onPassed: () => void;
};

type Phase = 'model' | 'ready' | 'listening' | 'checking' | 'retry' | 'success' | 'permission';

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

export function PronunciationPractice({ audioProvider, audioVoice, phrase, level, userId, onPassed }: Props) {
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
  const [liveMatchedCount, setLiveMatchedCount] = useState(0);
  const [liveTentativeCount, setLiveTentativeCount] = useState(0);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const heardSpeech = useRef(false);
  const silenceStartedAt = useRef<number | null>(null);
  const captureFinishing = useRef(false);
  const modelWasPlaying = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingCapture = useRef(false);
  const streamingStartedAt = useRef(0);
  const lastVoiceAt = useRef(0);
  const noiseFloorDb = useRef(-60);
  const liveProgressComplete = useRef(false);
  const liveMatchedCountRef = useRef(0);
  const liveRecognizedText = useRef('');
  const phraseCompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const earBlinkAnimation = useRef(new Animated.Value(1)).current;
  const gradingMascotAnimation = useRef(new Animated.Value(0)).current;
  const waveAnimations = useRef(
    [0, 1, 2, 3, 4].map(() => new Animated.Value(0.3)),
  ).current;

  const overallScore = result ? paceIndependentAccuracy(result) : undefined;
  const accuracy = overallScore;
  const completeness = result?.text_score?.azure_scores?.completeness;
  const passAccuracy = level.toUpperCase().includes('A1') ? 30 : 65;
  const minimumCompleteness = level.toUpperCase().includes('A1') ? 60 : 75;
  const passed =
    typeof accuracy === 'number' &&
    accuracy >= passAccuracy &&
    (typeof completeness !== 'number' || completeness >= minimumCompleteness);
  const statusIsActive = phase === 'listening' || phase === 'checking';
  const statusIsAnimated = statusIsActive && !reduceMotion && !(phase === 'listening' && streamingCapture.current);
  const expectedTokens = useMemo(() => speechTokens(phrase), [phrase]);
  const currentWordIndex = useMemo(() => {
    if (!expectedTokens.length || liveMatchedCount >= expectedTokens.length) return -1;
    // A partial transcript may tentatively recognize the word being spoken.
    // Keep the pointer on that word until finalized pronunciation evidence
    // confirms it, then advance to the next expected word.
    if (liveTentativeCount > liveMatchedCount) {
      return Math.min(liveTentativeCount - 1, expectedTokens.length - 1);
    }
    return liveMatchedCount;
  }, [expectedTokens.length, liveMatchedCount, liveTentativeCount]);
  const weakestWord = useMemo(
    () => {
      const scoredWords = result?.text_score?.word_score_list
        ?.filter((word) => typeof word.quality_score === 'number');
      return scoredWords
        ? [...scoredWords].sort(
          (left, right) => (left.quality_score ?? 100) - (right.quality_score ?? 100),
        )[0]
        : undefined;
    },
    [result],
  );

  const isCurrentRun = useCallback(
    (runId: number) => mountedRef.current && runIdRef.current === runId,
    [],
  );

  const playModel = useCallback((runId = runIdRef.current) => {
    if (!isCurrentRun(runId)) return;
    if (streamingCapture.current) void stopNativeSpeech();
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setResult(null);
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
    setLiveLevel(0);
    setLiveMatchedCount(0);
    setLiveTentativeCount(0);
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
  }, [audioProvider, audioVoice, isCurrentRun, modelPlayer, phrase]);

  const scheduleRetry = useCallback((reason: string, runId = runIdRef.current) => {
    if (!isCurrentRun(runId)) return;
    setPhase('retry');
    setMessage(`${reason} Volvemos a intentarlo…`);
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    retryTimer.current = setTimeout(() => playModel(runId), 1700);
  }, [isCurrentRun, playModel]);

  const finishNativeCapture = useCallback(async () => {
    const runId = runIdRef.current;
    if (!isCurrentRun(runId) || captureFinishing.current || !streamingCapture.current) return;
    if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
    phraseCompleteTimer.current = null;
    captureFinishing.current = true;
    streamingCapture.current = false;
    setPhase('checking');
    setMessage('Calificando…');
    setDiagnosticOperation('pronunciation_grading_streaming');
    let recordingUri = '';
    try {
      const recorderStopStartedAt = Date.now();
      const nativeResult = await stopNativeSpeech();
      const recorderFinalizeMs = Date.now() - recorderStopStartedAt;
      recordingUri = nativeResult.uri;
      if (!isCurrentRun(runId)) return;
      if (!recordingUri) {
        scheduleRetry('No pude completar la evaluación.', runId);
        return;
      }
      const nextResult = await scorePronunciation(recordingUri, phrase, userId, {
        recorderFinalizeMs,
      });
      if (!isCurrentRun(runId)) return;
      nextResult._timing = {
        ...nextResult._timing,
        recorder_finalize_ms: recorderFinalizeMs,
      };
      setResult(nextResult);
      const nextAccuracy = paceIndependentAccuracy(nextResult);
      const nextCompleteness = nextResult.text_score?.azure_scores?.completeness;
      const accepted =
        typeof nextAccuracy === 'number' &&
        nextAccuracy >= passAccuracy &&
        (typeof nextCompleteness !== 'number' || nextCompleteness >= minimumCompleteness);
      addDiagnosticBreadcrumb(accepted ? 'pronunciation_streaming_accepted' : 'pronunciation_streaming_retry', {
        accuracy: typeof nextAccuracy === 'number' ? Math.round(nextAccuracy) : undefined,
        attempt: attemptRef.current + 1,
        completeness: nextCompleteness,
        matched_words: liveMatchedCountRef.current,
        total_words: expectedTokens.length,
      });
      if (accepted) {
        setPhase('success');
        setMessage('Muy bien.');
        return;
      }
      const weakest = nextResult.text_score?.word_score_list
        ?.filter((word) => typeof word.quality_score === 'number')
        .sort((left, right) => (left.quality_score ?? 100) - (right.quality_score ?? 100))[0];
      scheduleRetry(weakest?.word ? `Practica “${weakest.word}”.` : 'Inténtalo otra vez.', runId);
    } catch (scoreError) {
      if (!isCurrentRun(runId)) return;
      captureDiagnosticError(scoreError, 'pronunciation_grading_streaming', {
        attempt: attemptRef.current + 1,
        phrase_length: phrase.length,
      });
      scheduleRetry('No pudimos revisar esa grabación.', runId);
    } finally {
      if (recordingUri) {
        try {
          new File(recordingUri).delete();
        } catch {
          // This is a disposable Android cache file and may already be gone.
        }
      }
    }
  }, [expectedTokens.length, isCurrentRun, minimumCompleteness, passAccuracy, phrase, scheduleRetry, userId]);

  const finishCapture = useCallback(async (shouldScore: boolean) => {
    const runId = runIdRef.current;
    if (!isCurrentRun(runId)) return;
    if (captureFinishing.current) return;
    captureFinishing.current = true;
    setDiagnosticOperation('pronunciation_grading');
    setPhase('checking');
    setMessage('Calificando…');
    try {
      const recorderStopStartedAt = Date.now();
      await recorder.stop();
      if (!isCurrentRun(runId)) return;
      const recorderFinalizeMs = Date.now() - recorderStopStartedAt;
      const uri = recorder.uri;
      if (!shouldScore || !uri) {
        scheduleRetry('No te pude escuchar.', runId);
        return;
      }
      const nextResult = await scorePronunciation(uri, phrase, userId, {
        recorderFinalizeMs,
      });
      if (!isCurrentRun(runId)) return;
      nextResult._timing = {
        ...nextResult._timing,
        recorder_finalize_ms: recorderFinalizeMs,
      };
      console.info('[SpanGlish] Pronunciation timing', nextResult._timing);
      setResult(nextResult);
      const nextAccuracy = paceIndependentAccuracy(nextResult);
      const nextCompleteness = nextResult.text_score?.azure_scores?.completeness;
      const accepted =
        typeof nextAccuracy === 'number' &&
        nextAccuracy >= passAccuracy &&
        (typeof nextCompleteness !== 'number' || nextCompleteness >= minimumCompleteness);
      if (accepted) {
        addDiagnosticBreadcrumb('pronunciation_accepted', {
          accuracy: Math.round(nextAccuracy),
          attempt: attemptRef.current + 1,
        });
        setPhase('success');
        setMessage('Muy bien.');
      } else {
        const scoredWords = nextResult.text_score?.word_score_list
          ?.filter((word) => typeof word.quality_score === 'number');
        const weakest = scoredWords
          ? [...scoredWords].sort(
            (left, right) => (left.quality_score ?? 100) - (right.quality_score ?? 100),
          )[0]
          : undefined;
        scheduleRetry(
          weakest?.word ? `Practica “${weakest.word}”.` : 'Inténtalo otra vez.',
          runId,
        );
      }
    } catch (scoreError) {
      if (!isCurrentRun(runId)) return;
      captureDiagnosticError(scoreError, 'pronunciation_grading', {
        attempt: attemptRef.current + 1,
        phrase_length: phrase.length,
      });
      scheduleRetry(
        scoreError instanceof Error && /conexión|internet/i.test(scoreError.message)
          ? 'Revisa tu conexión a internet.'
          : 'No pudimos revisar esa grabación.',
        runId,
      );
    }
  }, [isCurrentRun, minimumCompleteness, passAccuracy, phrase, recorder, scheduleRetry, userId]);

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
      silenceStartedAt.current = null;
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
      await readyCuePlayer.seekTo(0).catch(() => undefined);
      if (!isCurrentRun(runId)) return;
      readyCuePlayer.play();
      await new Promise((resolve) => setTimeout(resolve, 260));
      if (!isCurrentRun(runId)) return;
      if (streamingToken) {
        streamingCapture.current = true;
        streamingStartedAt.current = Date.now();
        lastVoiceAt.current = 0;
        liveProgressComplete.current = false;
        liveMatchedCountRef.current = 0;
        liveRecognizedText.current = '';
        if (phraseCompleteTimer.current) clearTimeout(phraseCompleteTimer.current);
        phraseCompleteTimer.current = null;
        setLiveLevel(0);
        setLiveMatchedCount(0);
        setLiveTentativeCount(0);
        await startNativeSpeech({
          locale: streamingToken.locale,
          referenceText: phrase,
          region: streamingToken.region,
          token: streamingToken.token,
        });
      } else {
        recorder.record();
      }
      setDiagnosticOperation('pronunciation_recording');
      addDiagnosticBreadcrumb('pronunciation_recording_started', {
        attempt: attemptRef.current + 1,
        streaming: Boolean(streamingToken),
      });
      setPhase('listening');
      setMessage('Ahora tú…');
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
  }, [isCurrentRun, phrase, readyCuePlayer, readyCuePreload, recorder, scheduleRetry]);

  useEffect(() => {
    if (!nativeStreamingAvailable) return undefined;
    const levelSubscription = addSpeechListener<SpeechLevelEvent>('onSpeechLevel', (event) => {
      if (!streamingCapture.current) return;
      const now = Date.now();
      if (!heardSpeech.current) {
        noiseFloorDb.current = noiseFloorDb.current * 0.9 + event.levelDb * 0.1;
      }
      const speechThreshold = Math.max(-54, noiseFloorDb.current + (heardSpeech.current ? 7 : 10));
      const active = event.levelDb >= speechThreshold;
      setLiveLevel(Math.max(0.08, Math.min(1, (event.levelDb + 60) / 34)));
      if (active) {
        heardSpeech.current = true;
        lastVoiceAt.current = now;
      }
    });
    const progressSubscription = addSpeechListener<SpeechProgressEvent>('onSpeechProgress', (event) => {
      if (!streamingCapture.current || !event.text) return;
      heardSpeech.current = true;
      liveRecognizedText.current = event.text;
      const progress = alignExpectedPhrase(phrase, event.text);
      // Azure's partial transcript can predict a complete final word from only
      // its opening sound. Keep the final word pending until the recognizer
      // emits a finalized result so suffixes such as -ing, -s, and -ed are kept.
      const tentativeCount = Math.min(
        progress.matchedCount,
        Math.max(0, expectedTokens.length - 1),
      );
      // Partial recognition is only a prediction. Show it as tentative, but
      // never turn a whole word green until pronunciation evidence confirms
      // its syllables/phonemes in a finalized result.
      setLiveTentativeCount(tentativeCount);
    });
    const resultSubscription = addSpeechListener<SpeechResultEvent>('onSpeechResult', (event) => {
      if (!streamingCapture.current || !event.text) return;
      liveRecognizedText.current = event.text;
      const progress = assessedPhraseProgress(
        phrase,
        event.text,
        event.json,
        liveMatchedCountRef.current,
      );
      liveProgressComplete.current = progress.completed;
      liveMatchedCountRef.current = progress.matchedCount;
      setLiveMatchedCount(progress.matchedCount);
      setLiveTentativeCount(progress.matchedCount);
      if (progress.completed && !phraseCompleteTimer.current) {
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
      captureDiagnosticError(new Error(event.message), 'pronunciation_streaming');
    });
    return () => {
      levelSubscription.remove();
      progressSubscription.remove();
      resultSubscription.remove();
      errorSubscription.remove();
    };
  }, [expectedTokens.length, finishNativeCapture, phrase]);

  useEffect(() => {
    if (phase !== 'listening' || !streamingCapture.current) return undefined;
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - streamingStartedAt.current;
      const quietFor = lastVoiceAt.current ? now - lastVoiceAt.current : 0;
      const phraseFinished = liveProgressComplete.current && heardSpeech.current && quietFor >= 750;
      const speechEndedWithoutExactMatch = heardSpeech.current && quietFor >= 3500;
      const hardLimitMs = Math.min(Math.max(expectedTokens.length * 3500, 15_000), 30_000);
      if (phraseFinished || speechEndedWithoutExactMatch || elapsed >= hardLimitMs) {
        void finishNativeCapture();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [expectedTokens.length, finishNativeCapture, phase]);

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
    if (phase !== 'listening' || reduceMotion) {
      earBlinkAnimation.stopAnimation();
      earBlinkAnimation.setValue(1);
      return undefined;
    }

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(earBlinkAnimation, {
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(earBlinkAnimation, {
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [earBlinkAnimation, phase, reduceMotion]);

  useEffect(() => {
    if (phase !== 'checking' || reduceMotion) {
      gradingMascotAnimation.stopAnimation();
      gradingMascotAnimation.setValue(0);
      return undefined;
    }

    const gradingMotion = Animated.loop(
      Animated.sequence([
        Animated.timing(gradingMascotAnimation, {
          duration: 360,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(gradingMascotAnimation, {
          duration: 360,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    gradingMotion.start();
    return () => gradingMotion.stop();
  }, [gradingMascotAnimation, phase, reduceMotion]);

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
    if (levelDb > -43) {
      heardSpeech.current = true;
      silenceStartedAt.current = null;
    } else if (heardSpeech.current && elapsed > 900) {
      if (silenceStartedAt.current === null) silenceStartedAt.current = Date.now();
      if (Date.now() - silenceStartedAt.current >= 1800) void finishCapture(true);
    }
    const maximumMs = Math.min(Math.max(phrase.length * 260, 8000), 15_000);
    if (elapsed >= maximumMs) void finishCapture(heardSpeech.current);
  }, [
    finishCapture,
    phase,
    phrase.length,
    recorderState.durationMillis,
    recorderState.isRecording,
    recorderState.metering,
  ]);

  useEffect(() => {
    if (phase !== 'success' || !passed) return undefined;
    const timer = setTimeout(onPassed, 650);
    return () => clearTimeout(timer);
  }, [onPassed, passed, phase]);

  const statusColor = phase === 'listening'
    ? '#d95c52'
    : phase === 'checking'
      ? '#76559e'
      : phase === 'success'
        ? '#2f8f62'
        : '#697177';

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`Repetir modelo: ${phrase}`}
        accessibilityRole="button"
        disabled={phase === 'checking' || phase === 'listening' || phase === 'ready'}
        onPress={() => phase === 'permission' ? void startListening() : playModel()}
      >
        {phase === 'listening' && nativeStreamingAvailable ? (
          <View style={styles.liveWords}>
            {expectedTokens.map((token, index) => (
              <View key={`${token}-${index}`} style={styles.liveWordSlot}>
                <Text
                  style={[
                    styles.liveWord,
                    index < liveTentativeCount ? styles.liveWordTentative : undefined,
                    index < liveMatchedCount ? styles.liveWordHeard : undefined,
                  ]}
                >
                  {token}
                </Text>
                <View
                  accessibilityElementsHidden
                  style={[styles.currentWordArrow, index === currentWordIndex ? null : styles.currentWordArrowHidden]}
                >
                  <View style={styles.currentWordArrowHead} />
                  <View style={styles.currentWordArrowStem} />
                </View>
              </View>
            ))}
          </View>
        ) : <Text style={styles.phrase}>{phrase}</Text>}
      </Pressable>
      <View style={styles.statusRow}>
        {phase === 'checking' ? (
          <Animated.Image
            accessibilityLabel="La profesora ardilla está calificando"
            resizeMode="contain"
            source={require('../../assets/mascots/squirrel-professor-grading.png')}
            style={[
              styles.gradingMascot,
              {
                transform: [
                  {
                    rotate: gradingMascotAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-1.5deg', '1.5deg'],
                    }),
                  },
                  {
                    translateY: gradingMascotAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, -2] }),
                  },
                ],
              },
            ]}
          />
        ) : null}
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
          {phase === 'listening' ? (
            <Animated.Text
              accessibilityLabel="Escuchando"
              style={[
                styles.listeningEar,
                {
                  opacity: earBlinkAnimation,
                  transform: [{
                    scale: earBlinkAnimation.interpolate({ inputRange: [0.3, 1], outputRange: [0.9, 1.08] }),
                  }],
                },
              ]}
            >
              👂
            </Animated.Text>
          ) : null}
        </View>
        <Text style={[styles.message, { color: statusColor }]}>{message}</Text>
      </View>
      {attempt > 0 && phase !== 'success' ? <Text style={styles.attempt}>Intento {attempt + 1}</Text> : null}
      {result && typeof overallScore === 'number' ? (
        <>
          <View style={[styles.scorePanel, passed ? styles.passedPanel : styles.practicePanel]}>
            <Text style={styles.score}>{Math.round(overallScore)}</Text>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreTitle}>{passed ? 'Muy bien.' : 'Inténtalo otra vez'}</Text>
              <Text style={styles.scoreText}>Escuché: {result.recognized_text || 'No pude reconocer la frase'}</Text>
              {weakestWord ? (
                <Text style={styles.scoreText}>
                  Practica “{weakestWord.word}” ({Math.round(weakestWord.quality_score ?? 0)})
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.words}>
            {result.text_score?.word_score_list?.map((word, index) => {
              const wordScore = word.quality_score;
              const color =
                typeof wordScore !== 'number'
                  ? '#f5f1e9'
                  : wordScore >= 65
                    ? '#d8f3df'
                    : wordScore >= 25
                      ? '#fff1c7'
                      : '#ffe0dc';
              return (
                <Text key={`${word.word}-${index}`} style={[styles.word, { backgroundColor: color }]}>
                  {word.word}
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
  phrase: { color: '#24333a', fontSize: 18, fontWeight: '900', lineHeight: 22, textAlign: 'center' },
  liveWords: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  liveWordSlot: { alignItems: 'center' },
  liveWord: { borderColor: 'transparent', borderRadius: 8, borderWidth: 2, color: '#24333a', fontSize: 18, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 3 },
  liveWordTentative: { backgroundColor: '#fff2cf', borderColor: '#e1b85c', color: '#8a5b10' },
  liveWordHeard: { backgroundColor: '#dff4e7', borderColor: '#2f8f62', color: '#17623f' },
  currentWordArrow: { alignItems: 'center', height: 23, justifyContent: 'center', marginTop: 1, width: 22 },
  currentWordArrowHead: {
    borderBottomColor: '#83d6a4',
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    height: 0,
    width: 0,
  },
  currentWordArrowStem: { backgroundColor: '#83d6a4', borderRadius: 3, height: 10, width: 5 },
  currentWordArrowHidden: { opacity: 0 },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minHeight: 32 },
  signalStack: { alignItems: 'center', marginRight: 8 },
  signalRow: { alignItems: 'center', flexDirection: 'row' },
  listeningEar: { fontSize: 50, height: 58, lineHeight: 58, marginTop: -2, textAlign: 'center' },
  gradingMascot: { height: 96, marginRight: 8, width: 76 },
  statusDot: { borderRadius: 6, height: 11, marginRight: 10, width: 11 },
  wave: { alignItems: 'center', flexDirection: 'row', gap: 3, height: 28, marginRight: 8 },
  waveBar: { borderRadius: 3, width: 4 },
  message: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
  attempt: { color: '#8a4f00', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  scorePanel: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', padding: 7 },
  passedPanel: { backgroundColor: '#eaf6ee' },
  practicePanel: { backgroundColor: '#fff3df' },
  score: { color: '#287a57', fontSize: 30, fontWeight: '900', minWidth: 52 },
  scoreDetails: { flex: 1, gap: 1, marginLeft: 7 },
  scoreTitle: { color: '#17251f', fontSize: 13, fontWeight: '800' },
  scoreText: { color: '#52625a', fontSize: 10, lineHeight: 13 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  word: { borderRadius: 7, color: '#24333a', fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4 },
});
