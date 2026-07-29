import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CourseAudioButton } from './CourseAudioButton';

type Props = {
  phrase: string;
  level: string;
  userId?: string;
  onPassed: () => void;
};

export function PronunciationPractice({ phrase, level, userId, onPassed }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordingPlayer = useAudioPlayer(null);
  const modelPlayer = useAudioPlayer(null);
  const modelStatus = useAudioPlayerStatus(modelPlayer);
  const autoRecordStarted = useRef(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [message, setMessage] = useState('Listen, then record yourself saying the sentence.');
  const [error, setError] = useState('');
  const [isScoring, setIsScoring] = useState(false);

  useEffect(() => {
    setRecordingUri(null);
    setResult(null);
    setError('');
    setMessage('Listen to the model…');
    autoRecordStarted.current = false;
    modelPlayer.replace(courseAudioUrl(phrase, 'pronunciation_slow', 'split-ing'));
    modelPlayer.play();
  }, [modelPlayer, phrase]);

  const overallScore = result?.text_score?.quality_score;
  const weakestWord = useMemo(
    () =>
      result?.text_score?.word_score_list
        ?.filter((word) => typeof word.quality_score === 'number')
        .toSorted((left, right) => (left.quality_score ?? 100) - (right.quality_score ?? 100))[0],
    [result],
  );

  const startRecording = async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone needed', 'Allow SpanGlish to use the microphone for pronunciation practice.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    setRecordingUri(null);
    setResult(null);
    setError('');
    setMessage('Listening…');
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    await recorder.stop();
    setRecordingUri(recorder.uri);
    setMessage(recorder.uri ? 'Recording ready.' : 'The recording could not be saved.');
  };

  const playRecording = () => {
    if (!recordingUri) return;
    recordingPlayer.replace(recordingUri);
    recordingPlayer.play();
  };

  const gradeRecording = async () => {
    if (!recordingUri) return;
    setIsScoring(true);
    setError('');
    setMessage('Checking your pronunciation…');
    try {
      const nextResult = await scorePronunciation(recordingUri, phrase, userId);
      setResult(nextResult);
      setMessage('Score received.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not score this recording.');
      setMessage('Try scoring again.');
    } finally {
      setIsScoring(false);
    }
  };

  const seconds = Math.max(0, Math.round(recorderState.durationMillis / 1000));
  const accuracy = result?.text_score?.azure_scores?.accuracy ?? overallScore;
  const completeness = result?.text_score?.azure_scores?.completeness;
  const passAccuracy = level.toUpperCase().includes('A1') ? 30 : 65;
  const minimumCompleteness = level.toUpperCase().includes('A1') ? 60 : 75;
  const passed =
    typeof accuracy === 'number' &&
    accuracy >= passAccuracy &&
    (typeof completeness !== 'number' || completeness >= minimumCompleteness);
  const disabled = !recordingUri || recorderState.isRecording;

  useEffect(() => {
    if (!modelStatus.didJustFinish || autoRecordStarted.current) return;
    autoRecordStarted.current = true;
    void startRecording();
  }, [modelStatus.didJustFinish]);

  useEffect(() => {
    if (!passed) return undefined;
    const timer = setTimeout(onPassed, 650);
    return () => clearTimeout(timer);
  }, [onPassed, passed]);

  return (
    <View style={styles.container}>
      <Text style={styles.phrase}>{phrase}</Text>
      <CourseAudioButton
        label="Replay model"
        mode="pronunciation_slow"
        text={phrase}
        variant="split-ing"
      />
      <Text style={styles.message}>
        {recorderState.isRecording ? `Recording · ${seconds}s` : message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={recorderState.isRecording ? stopRecording : startRecording}
        style={({ pressed }) => [
          styles.primaryButton,
          recorderState.isRecording ? styles.stopButton : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {recorderState.isRecording ? '■  Stop recording' : '●  Start recording'}
        </Text>
      </Pressable>
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={playRecording}
          style={[styles.secondaryButton, disabled ? styles.disabled : null]}
        >
          <Text style={styles.secondaryText}>▶ Playback</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || isScoring}
          onPress={gradeRecording}
          style={[styles.secondaryButton, disabled || isScoring ? styles.disabled : null]}
        >
          <Text style={styles.secondaryText}>{isScoring ? 'Checking…' : 'Get score'}</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {typeof overallScore === 'number' ? (
        <>
          <View style={[styles.scorePanel, passed ? styles.passedPanel : styles.practicePanel]}>
            <Text style={styles.score}>{Math.round(overallScore)}</Text>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreTitle}>{passed ? 'Nice.' : 'Inténtalo otra vez'}</Text>
              <Text style={styles.scoreText}>Escuché: {result?.recognized_text || 'No pude reconocer la frase'}</Text>
              {weakestWord ? (
                <Text style={styles.scoreText}>
                  Practica “{weakestWord.word}” ({Math.round(weakestWord.quality_score ?? 0)})
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.words}>
            {result?.text_score?.word_score_list?.map((word, index) => {
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
  container: { gap: 14, marginTop: 22 },
  phrase: { color: '#24333a', fontSize: 22, fontWeight: '900', lineHeight: 28, textAlign: 'center' },
  message: { color: '#66736d', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#287a57',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
  },
  stopButton: { backgroundColor: '#b94b44' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#287a57',
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryText: { color: '#287a57', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.72 },
  error: { color: '#b94b44', fontSize: 13, lineHeight: 19 },
  scorePanel: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', padding: 16 },
  passedPanel: { backgroundColor: '#eaf6ee' },
  practicePanel: { backgroundColor: '#fff3df' },
  score: { color: '#287a57', fontSize: 42, fontWeight: '900', minWidth: 68 },
  scoreDetails: { flex: 1, gap: 3, marginLeft: 12 },
  scoreTitle: { color: '#17251f', fontSize: 16, fontWeight: '800' },
  scoreText: { color: '#52625a', fontSize: 12, lineHeight: 17 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' },
  word: { borderRadius: 10, color: '#24333a', fontSize: 16, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 7 },
});
