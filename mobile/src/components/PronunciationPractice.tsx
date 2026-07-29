import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { scorePronunciation } from '../api';
import type { PronunciationResult } from '../types';
import { CourseAudioButton } from './CourseAudioButton';

type Props = { phrase: string; onPassed: () => void };

export function PronunciationPractice({ phrase, onPassed }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordingPlayer = useAudioPlayer(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [message, setMessage] = useState('Listen, then record yourself saying the sentence.');
  const [error, setError] = useState('');
  const [isScoring, setIsScoring] = useState(false);

  useEffect(() => {
    setRecordingUri(null);
    setResult(null);
    setError('');
    setMessage('Listen, then record yourself saying the sentence.');
  }, [phrase]);

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
      const nextResult = await scorePronunciation(recordingUri, phrase);
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
  const passed = typeof overallScore === 'number' && overallScore >= 60;
  const disabled = !recordingUri || recorderState.isRecording;

  return (
    <View style={styles.container}>
      <CourseAudioButton label="Hear the sentence" text={phrase} />
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
        <View style={[styles.scorePanel, passed ? styles.passedPanel : styles.practicePanel]}>
          <Text style={styles.score}>{Math.round(overallScore)}</Text>
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreTitle}>{passed ? 'Nice work!' : 'Try it once more'}</Text>
            <Text style={styles.scoreText}>Heard: {result?.recognized_text || 'No transcription'}</Text>
            {weakestWord ? (
              <Text style={styles.scoreText}>
                Practice “{weakestWord.word}” ({Math.round(weakestWord.quality_score ?? 0)})
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      {passed ? (
        <Pressable accessibilityRole="button" onPress={onPassed} style={styles.continueButton}>
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, marginTop: 22 },
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
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#17251f',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
