import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

const TARGET_PHRASE = 'The boy is running.';
const API_BASE_URL = 'https://learnenglish-fxki.onrender.com';

type WordScore = {
  word?: string;
  quality_score?: number;
  error_type?: string;
};

type PronunciationResult = {
  recognized_text?: string;
  text_score?: {
    quality_score?: number;
    word_score_list?: WordScore[];
    azure_scores?: {
      accuracy?: number;
      fluency?: number;
      completeness?: number;
    };
  };
};

export default function App() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [message, setMessage] = useState('Tap the microphone and read the sentence.');
  const [isScoring, setIsScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<PronunciationResult | null>(null);
  const [scoreError, setScoreError] = useState('');

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
  }, []);

  const startRecording = async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone needed', 'Allow SpanGlish to use the microphone so it can hear your pronunciation.');
      return;
    }

    setRecordingUri(null);
    setScoreResult(null);
    setScoreError('');
    setMessage('Listening…');
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    await recorder.stop();
    const uri = recorder.uri;
    setRecordingUri(uri);
    setMessage(uri ? 'Recording ready. Listen to your attempt.' : 'The recording could not be saved.');
  };

  const playRecording = () => {
    if (!recordingUri) {
      return;
    }
    player.replace(recordingUri);
    player.play();
  };

  const scoreRecording = async () => {
    if (!recordingUri) {
      return;
    }

    setIsScoring(true);
    setScoreError('');
    setScoreResult(null);
    setMessage('Azure is checking your pronunciation…');

    const formData = new FormData();
    formData.append('text', TARGET_PHRASE);
    formData.append('provider', 'azure');
    formData.append('audio', new File(recordingUri), 'pronunciation.m4a');

    try {
      const response = await fetch(`${API_BASE_URL}/api/pronunciation/score`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        const detail = typeof payload?.detail === 'string' ? payload.detail : JSON.stringify(payload?.detail || payload);
        throw new Error(detail || `Scoring failed with status ${response.status}.`);
      }
      setScoreResult(payload);
      setMessage('Pronunciation score received.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Could not score this recording.';
      setScoreError(detail);
      setMessage('Scoring failed. Your recording is still available.');
    } finally {
      setIsScoring(false);
    }
  };

  const seconds = Math.max(0, Math.round(recorderState.durationMillis / 1000));
  const overallScore = scoreResult?.text_score?.quality_score;
  const weakestWord = scoreResult?.text_score?.word_score_list
    ?.filter((word) => typeof word.quality_score === 'number')
    .sort((left, right) => (left.quality_score ?? 100) - (right.quality_score ?? 100))[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f2e9" />
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <Text style={styles.brand}>SPANGLISH</Text>
          <Text style={styles.title}>Pronunciation practice</Text>
          <Text style={styles.subtitle}>Read the sentence naturally and clearly.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>SAY THIS</Text>
          <Text style={styles.phrase}>{TARGET_PHRASE}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, recorderState.isRecording && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {recorderState.isRecording ? `Recording · ${seconds}s` : message}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={recorderState.isRecording ? stopRecording : startRecording}
            style={({ pressed }) => [
              styles.recordButton,
              recorderState.isRecording && styles.stopButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.recordIcon}>{recorderState.isRecording ? '■' : '●'}</Text>
            <Text style={styles.recordButtonText}>
              {recorderState.isRecording ? 'Stop recording' : 'Start recording'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!recordingUri || recorderState.isRecording}
            onPress={playRecording}
            style={({ pressed }) => [
              styles.playButton,
              !recordingUri && styles.buttonDisabled,
              pressed && recordingUri ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.playButtonText}>▶  Play my recording</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!recordingUri || recorderState.isRecording || isScoring}
            onPress={scoreRecording}
            style={({ pressed }) => [
              styles.scoreButton,
              (!recordingUri || isScoring) && styles.buttonDisabled,
              pressed && recordingUri ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.scoreButtonText}>
              {isScoring ? 'Checking pronunciation…' : 'Score pronunciation'}
            </Text>
          </Pressable>

          {scoreError ? <Text style={styles.errorText}>{scoreError}</Text> : null}

          {scoreResult && typeof overallScore === 'number' ? (
            <View style={styles.resultPanel}>
              <View>
                <Text style={styles.resultLabel}>YOUR SCORE</Text>
                <Text style={styles.scoreValue}>{Math.round(overallScore)}</Text>
              </View>
              <View style={styles.resultDetails}>
                <Text style={styles.resultText}>
                  Heard: {scoreResult.recognized_text || 'No transcription'}
                </Text>
                {weakestWord ? (
                  <Text style={styles.resultText}>
                    Practice: {weakestWord.word} ({Math.round(weakestWord.quality_score ?? 0)})
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>Pronunciation scoring comes next.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f2e9',
  },
  container: {
    flexGrow: 1,
    gap: 32,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 28,
  },
  brand: {
    color: '#287a57',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  title: {
    color: '#17251f',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 12,
  },
  subtitle: {
    color: '#66736d',
    fontSize: 17,
    lineHeight: 24,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e4ded2',
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#1c2e26',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  label: {
    color: '#8a958f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  phrase: {
    color: '#17251f',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 39,
    marginTop: 14,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 24,
    marginTop: 30,
  },
  statusDot: {
    backgroundColor: '#b8c0bc',
    borderRadius: 6,
    height: 10,
    marginRight: 10,
    width: 10,
  },
  statusDotActive: {
    backgroundColor: '#d95c52',
  },
  statusText: {
    color: '#66736d',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  recordButton: {
    alignItems: 'center',
    backgroundColor: '#287a57',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 18,
  },
  stopButton: {
    backgroundColor: '#b94b44',
  },
  recordIcon: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 10,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  playButton: {
    alignItems: 'center',
    borderColor: '#287a57',
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 54,
  },
  playButtonText: {
    color: '#287a57',
    fontSize: 16,
    fontWeight: '700',
  },
  scoreButton: {
    alignItems: 'center',
    backgroundColor: '#17251f',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 54,
  },
  scoreButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    color: '#b94b44',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  resultPanel: {
    alignItems: 'center',
    backgroundColor: '#eef6f1',
    borderRadius: 18,
    flexDirection: 'row',
    marginTop: 16,
    padding: 16,
  },
  resultLabel: {
    color: '#66736d',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  scoreValue: {
    color: '#287a57',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
  },
  resultDetails: {
    flex: 1,
    gap: 5,
    marginLeft: 20,
  },
  resultText: {
    color: '#33463d',
    fontSize: 13,
    lineHeight: 18,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  footer: {
    color: '#8a958f',
    fontSize: 13,
    textAlign: 'center',
  },
});
