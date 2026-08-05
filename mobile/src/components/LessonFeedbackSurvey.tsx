import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  type RecordingOptions,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import * as Updates from 'expo-updates';

import { saveLessonFeedback, transcribeFeedback } from '../api';
import { READY_CUE_URL } from '../config';
import { captureDiagnosticError } from '../diagnostics';

const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { ...RecordingPresets.HIGH_QUALITY.android, sampleRate: 16000 },
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, sampleRate: 16000 },
};

const CLARITY_OPTIONS = ['Muy fácil', 'Fácil', 'Algo confusa', 'Muy confusa'];
const SUPPORT_OPTIONS = ['Sí, ambos', 'Solo imágenes', 'Solo audio', 'Ninguno'];

type Props = {
  userId: string;
  sessionId?: string;
  lessonId: string;
  score: number;
  totalCards: number;
  viewportWidth: number;
  viewportHeight: number;
  onDone: () => void;
};

export function LessonFeedbackSurvey({
  userId,
  sessionId,
  lessonId,
  score,
  totalCards,
  viewportWidth,
  viewportHeight,
  onDone,
}: Props) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const cuePlayer = useAudioPlayer(null);
  const mountedRef = useRef(true);
  const [clarity, setClarity] = useState('');
  const [support, setSupport] = useState('');
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'recording' | 'transcribing'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    mountedRef.current = false;
    if (recorder.isRecording) void recorder.stop().catch(() => undefined);
  }, [recorder]);

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return;
    setPhase('preparing');
    setError('');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPhase('idle');
        Alert.alert('Micrófono necesario', 'Permite el micrófono para enviar un comentario hablado.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      if (!cuePlayer.isLoaded) cuePlayer.replace(READY_CUE_URL);
      await new Promise((resolve) => setTimeout(resolve, 120));
      cuePlayer.play();
      await new Promise((resolve) => setTimeout(resolve, 260));
      recorder.record();
      if (mountedRef.current) setPhase('recording');
    } catch (recordingError) {
      captureDiagnosticError(recordingError, 'feedback_recording_start');
      if (mountedRef.current) {
        setPhase('idle');
        setError('No pudimos abrir el micrófono. Inténtalo otra vez.');
      }
    }
  }, [cuePlayer, phase, recorder]);

  const stopAndTranscribe = useCallback(async () => {
    if (phase !== 'recording') return;
    setPhase('transcribing');
    setError('');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording was produced.');
      const transcript = await transcribeFeedback(uri);
      if (mountedRef.current) setComment(transcript);
    } catch (transcriptionError) {
      captureDiagnosticError(transcriptionError, 'feedback_transcription');
      if (mountedRef.current) setError('No pudimos transcribirlo. Puedes grabar otra vez.');
    } finally {
      if (mountedRef.current) setPhase('idle');
    }
  }, [phase, recorder]);

  const submit = useCallback(async () => {
    if (!clarity || !support || isSaving) {
      if (!clarity || !support) setError('Selecciona una respuesta para las primeras dos preguntas.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await saveLessonFeedback({
        appVersion: String(Updates.runtimeVersion || '1.5.0'),
        clarityRating: clarity,
        commentText: comment,
        learningSupport: support,
        lessonId,
        score,
        sessionId,
        totalCards,
        updateId: Updates.updateId || 'embedded',
        userId,
        viewportHeight,
        viewportWidth,
      });
      onDone();
    } catch (saveError) {
      captureDiagnosticError(saveError, 'feedback_save', { lesson_id: lessonId });
      setError('No pudimos guardar tus comentarios. Inténtalo otra vez.');
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [clarity, comment, isSaving, lessonId, onDone, score, sessionId, support, totalCards, userId, viewportHeight, viewportWidth]);

  return (
    <View style={styles.page}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>ENCUESTA PILOTO · SOLO HORACE</Text>
          <Text style={styles.title}>Ayúdanos a mejorar esta lección</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onDone} style={styles.skipButton}>
          <Text style={styles.skipText}>Ahora no</Text>
        </Pressable>
      </View>

      <View style={styles.questionsRow}>
        <Question
          options={CLARITY_OPTIONS}
          selected={clarity}
          title="1. ¿Qué tan fácil fue entender esta lección?"
          onSelect={setClarity}
        />
        <Question
          options={SUPPORT_OPTIONS}
          selected={support}
          title="2. ¿Las imágenes y el audio te ayudaron?"
          onSelect={setSupport}
        />
      </View>

      <View style={styles.voiceCard}>
        <View style={styles.voiceCopy}>
          <Text style={styles.questionTitle}>3. ¿Qué te confundió o qué podemos mejorar?</Text>
          <Text style={styles.hint}>Opcional · habla con confianza; guardaremos el texto, no la grabación.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={phase === 'preparing' || phase === 'transcribing'}
          onPress={phase === 'recording' ? stopAndTranscribe : startRecording}
          style={[styles.voiceButton, phase === 'recording' ? styles.voiceButtonRecording : null]}
        >
          {phase === 'preparing' || phase === 'transcribing' ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.voiceButtonText}>{phase === 'recording' ? '■ Terminar' : '● Hablar'}</Text>
          )}
        </Pressable>
        <TextInput
          multiline
          onChangeText={setComment}
          placeholder="Tu comentario aparecerá aquí…"
          style={styles.transcript}
          value={comment}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.error}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving || phase !== 'idle'}
          onPress={submit}
          style={[styles.submitButton, isSaving || phase !== 'idle' ? styles.disabled : null]}
        >
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Enviar comentarios</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function Question({
  options,
  selected,
  title,
  onSelect,
}: {
  options: string[];
  selected: string;
  title: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionTitle}>{title}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.option, selected === option ? styles.optionSelected : null]}
          >
            <Text style={[styles.optionText, selected === option ? styles.optionTextSelected : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#fbf7ef', flex: 1, gap: 10, padding: 14 },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#2f8f62', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#24333a', fontSize: 25, fontWeight: '900', marginTop: 3 },
  skipButton: { borderColor: '#d7c8aa', borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 10 },
  skipText: { color: '#58656a', fontSize: 13, fontWeight: '800' },
  questionsRow: { flexDirection: 'row', gap: 10 },
  questionCard: { backgroundColor: '#fff', borderColor: '#e2d8c8', borderRadius: 16, borderWidth: 1, flex: 1, padding: 12 },
  questionTitle: { color: '#24333a', fontSize: 15, fontWeight: '900' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  option: { backgroundColor: '#f6f1e8', borderColor: '#ded2bd', borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  optionSelected: { backgroundColor: '#dff4e7', borderColor: '#2f8f62', borderWidth: 2 },
  optionText: { color: '#4c5b60', fontSize: 12, fontWeight: '800' },
  optionTextSelected: { color: '#17623f' },
  voiceCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e2d8c8', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 },
  voiceCopy: { flex: 1 },
  hint: { color: '#6d797d', fontSize: 11, marginTop: 4 },
  voiceButton: { alignItems: 'center', backgroundColor: '#2f8f62', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 110, paddingHorizontal: 14 },
  voiceButtonRecording: { backgroundColor: '#c64f45' },
  voiceButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  transcript: { backgroundColor: '#f8f5ef', borderColor: '#ddd2c0', borderRadius: 10, borderWidth: 1, color: '#24333a', flex: 1.2, fontSize: 12, minHeight: 58, padding: 9, textAlignVertical: 'top' },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', minHeight: 48 },
  error: { color: '#a34842', flex: 1, fontSize: 12, fontWeight: '700' },
  submitButton: { alignItems: 'center', backgroundColor: '#e96f42', borderRadius: 13, justifyContent: 'center', minHeight: 46, minWidth: 190, paddingHorizontal: 18 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
