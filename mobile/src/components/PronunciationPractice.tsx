import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { scorePronunciation } from '../api';
import { courseAudioUrl } from '../config';
import type { PronunciationResult } from '../types';

type Props = {
  phrase: string;
  level: string;
  userId?: string;
  onPassed: () => void;
};

type Phase = 'model' | 'listening' | 'checking' | 'retry' | 'success' | 'permission';

const METERING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export function PronunciationPractice({ phrase, level, userId, onPassed }: Props) {
  const recorder = useAudioRecorder(METERING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const modelPlayer = useAudioPlayer(null);
  const modelStatus = useAudioPlayerStatus(modelPlayer);
  const [phase, setPhase] = useState<Phase>('model');
  const [message, setMessage] = useState('Escucha la frase.');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const heardSpeech = useRef(false);
  const silenceStartedAt = useRef<number | null>(null);
  const captureFinishing = useRef(false);
  const modelWasPlaying = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overallScore = result?.text_score?.quality_score;
  const accuracy = result?.text_score?.azure_scores?.accuracy ?? overallScore;
  const completeness = result?.text_score?.azure_scores?.completeness;
  const passAccuracy = level.toUpperCase().includes('A1') ? 30 : 65;
  const minimumCompleteness = level.toUpperCase().includes('A1') ? 60 : 75;
  const passed =
    typeof accuracy === 'number' &&
    accuracy >= passAccuracy &&
    (typeof completeness !== 'number' || completeness >= minimumCompleteness);
  const weakestWord = useMemo(
    () =>
      result?.text_score?.word_score_list
        ?.filter((word) => typeof word.quality_score === 'number')
        .toSorted((left, right) => (left.quality_score ?? 100) - (right.quality_score ?? 100))[0],
    [result],
  );

  const playModel = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setResult(null);
    setPhase('model');
    setMessage(attempt ? 'Escucha otra vez…' : 'Escucha la frase.');
    heardSpeech.current = false;
    silenceStartedAt.current = null;
    captureFinishing.current = false;
    modelWasPlaying.current = false;
    modelPlayer.replace(courseAudioUrl(phrase, 'pronunciation_slow', 'split-ing'));
    modelPlayer.play();
  }, [attempt, modelPlayer, phrase]);

  const scheduleRetry = useCallback((reason: string) => {
    setPhase('retry');
    setMessage(`${reason} Volvemos a intentarlo…`);
    setAttempt((current) => current + 1);
    retryTimer.current = setTimeout(playModel, 1700);
  }, [playModel]);

  const finishCapture = useCallback(async (shouldScore: boolean) => {
    if (captureFinishing.current) return;
    captureFinishing.current = true;
    setPhase('checking');
    setMessage('Checking…');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!shouldScore || !uri) {
        scheduleRetry('No te pude escuchar.');
        return;
      }
      const nextResult = await scorePronunciation(uri, phrase, userId);
      setResult(nextResult);
      const nextAccuracy = nextResult.text_score?.azure_scores?.accuracy ?? nextResult.text_score?.quality_score;
      const nextCompleteness = nextResult.text_score?.azure_scores?.completeness;
      const accepted =
        typeof nextAccuracy === 'number' &&
        nextAccuracy >= passAccuracy &&
        (typeof nextCompleteness !== 'number' || nextCompleteness >= minimumCompleteness);
      if (accepted) {
        setPhase('success');
        setMessage('Nice.');
      } else {
        const weakest = nextResult.text_score?.word_score_list
          ?.filter((word) => typeof word.quality_score === 'number')
          .toSorted((left, right) => (left.quality_score ?? 100) - (right.quality_score ?? 100))[0];
        scheduleRetry(weakest?.word ? `Practica “${weakest.word}”.` : 'Inténtalo otra vez.');
      }
    } catch {
      scheduleRetry('No pudimos revisar esa grabación.');
    }
  }, [minimumCompleteness, passAccuracy, phrase, recorder, scheduleRetry, userId]);

  const startListening = useCallback(async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setPhase('permission');
      setMessage('Necesitamos permiso para escuchar tu pronunciación.');
      Alert.alert('Micrófono necesario', 'Permite que SpanGlish use el micrófono para continuar automáticamente.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      heardSpeech.current = false;
      silenceStartedAt.current = null;
      captureFinishing.current = false;
      await recorder.prepareToRecordAsync(METERING_OPTIONS);
      recorder.record();
      setPhase('listening');
      setMessage('Ahora tú…');
    } catch {
      scheduleRetry('No pudimos abrir el micrófono.');
    }
  }, [recorder, scheduleRetry]);

  useEffect(() => {
    setAttempt(0);
    playModel();
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (recorder.isRecording) void recorder.stop();
    };
  }, [phrase]);

  useEffect(() => {
    if (phase !== 'model') return;
    if (modelStatus.playing) modelWasPlaying.current = true;
    if (modelStatus.didJustFinish && modelWasPlaying.current) {
      modelWasPlaying.current = false;
      void startListening();
    }
  }, [modelStatus.didJustFinish, modelStatus.playing, phase, startListening]);

  useEffect(() => {
    if (phase !== 'listening' || !recorderState.isRecording) return;
    const levelDb = recorderState.metering ?? -160;
    const elapsed = recorderState.durationMillis;
    if (levelDb > -43) {
      heardSpeech.current = true;
      silenceStartedAt.current = null;
    } else if (heardSpeech.current && elapsed > 900) {
      if (silenceStartedAt.current === null) silenceStartedAt.current = Date.now();
      if (Date.now() - silenceStartedAt.current >= 850) void finishCapture(true);
    }
    const maximumMs = Math.min(Math.max(phrase.length * 180, 4200), 7600);
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

  const statusColor = phase === 'listening' ? '#d95c52' : phase === 'success' ? '#2f8f62' : '#697177';

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={`Repetir modelo: ${phrase}`}
        accessibilityRole="button"
        disabled={phase === 'checking' || phase === 'listening'}
        onPress={phase === 'permission' ? startListening : playModel}
      >
        <Text style={styles.phrase}>{phrase}</Text>
      </Pressable>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.wave} accessibilityElementsHidden>
          {[12, 22, 30, 22, 12].map((height, index) => (
            <View
              key={`${height}-${index}`}
              style={[
                styles.waveBar,
                {
                  backgroundColor: statusColor,
                  height: phase === 'listening' ? height : 8,
                  opacity: phase === 'listening' ? 1 : 0.35,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.message, { color: statusColor }]}>{message}</Text>
      </View>
      {attempt > 0 && phase !== 'success' ? <Text style={styles.attempt}>Intento {attempt + 1}</Text> : null}
      {result && typeof overallScore === 'number' ? (
        <>
          <View style={[styles.scorePanel, passed ? styles.passedPanel : styles.practicePanel]}>
            <Text style={styles.score}>{Math.round(overallScore)}</Text>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreTitle}>{passed ? 'Nice.' : 'Inténtalo otra vez'}</Text>
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
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minHeight: 32 },
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
