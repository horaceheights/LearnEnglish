import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { File } from 'expo-file-system';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  type RecordingOptions,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Updates from 'expo-updates';

import { saveLessonFeedback, transcribeFeedback } from '../api';
import { captureDiagnosticError } from '../diagnostics';
import {
  addSpeechListener,
  nativeRecordingAvailable,
  startNativeRecording,
  stopNativeRecording,
  type SpeechLevelEvent,
} from '../../modules/spanglish-speech/src';

const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { ...RecordingPresets.HIGH_QUALITY.android, sampleRate: 16000 },
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, sampleRate: 16000 },
  isMeteringEnabled: true,
};

const CLARITY_OPTIONS = ['Muy fácil', 'Fácil', 'Algo confusa', 'Muy confusa'];
const SUPPORT_OPTIONS = ['Sí, ambos', 'Solo imágenes', 'Solo audio', 'Ninguno'];
const READY_CUE = require('../../assets/sfx/ready-cue-v2.mp3');
const READY_CUE_VOLUME = 0.38;

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
  const recorderState = useAudioRecorderState(recorder, 100);
  const cuePlayer = useAudioPlayer(READY_CUE, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const mountedRef = useRef(true);
  const [clarity, setClarity] = useState('');
  const [support, setSupport] = useState('');
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'recording' | 'transcribing'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [nativeRecordingLevel, setNativeRecordingLevel] = useState(0.18);
  const recordingActiveRef = useRef(false);
  const nativeRecordingActiveRef = useRef(false);
  const isPortrait = viewportHeight >= viewportWidth;
  const recordingLevel = nativeRecordingActiveRef.current
    ? nativeRecordingLevel
    : Math.max(0.18, Math.min(1, ((recorderState.metering ?? -60) + 60) / 38));

  useEffect(() => {
    if (!nativeRecordingAvailable) return undefined;
    const levelSubscription = addSpeechListener<SpeechLevelEvent>('onSpeechLevel', (event) => {
      if (!nativeRecordingActiveRef.current) return;
      setNativeRecordingLevel(Math.max(0.18, Math.min(1, (event.levelDb + 60) / 34)));
    });
    return () => levelSubscription.remove();
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    if (recordingActiveRef.current) {
      recordingActiveRef.current = false;
      if (nativeRecordingActiveRef.current) {
        nativeRecordingActiveRef.current = false;
        void stopNativeRecording()
          .then(({ uri }) => {
            if (uri) new File(uri).delete();
          })
          .catch(() => undefined);
      } else {
        void recorder.stop().catch(() => undefined);
      }
    }
  }, [recorder]);

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return;
    setPhase('preparing');
    setError('');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPhase('idle');
        Alert.alert(
          'Micrófono necesario',
          permission.canAskAgain
            ? 'Permite el micrófono para enviar un comentario hablado.'
            : 'El permiso está desactivado. Abre Ajustes y activa el micrófono para SpanGlish.',
          permission.canAskAgain
            ? [{ text: 'Entendido' }]
            : [
                { style: 'cancel', text: 'Cancelar' },
                { onPress: () => void Linking.openSettings(), text: 'Abrir Ajustes' },
              ],
        );
        return;
      }
      // Play the ready cue before opening the microphone. Keeping this player
      // active prevents its completion from shutting down the iOS recorder.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
      await new Promise((resolve) => setTimeout(resolve, 120));
      cuePlayer.volume = READY_CUE_VOLUME;
      cuePlayer.play();
      await new Promise((resolve) => setTimeout(resolve, 260));
      cuePlayer.pause();
      setNativeRecordingLevel(0.18);
      if (nativeRecordingAvailable) {
        await startNativeRecording();
        nativeRecordingActiveRef.current = true;
      } else {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldRouteThroughEarpiece: false,
        });
        await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
        recorder.record();
      }
      recordingActiveRef.current = true;
      if (mountedRef.current) setPhase('recording');
    } catch (recordingError) {
      if (nativeRecordingActiveRef.current) {
        nativeRecordingActiveRef.current = false;
        void stopNativeRecording().catch(() => undefined);
      }
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
    let recordingUri = '';
    try {
      if (nativeRecordingActiveRef.current) {
        nativeRecordingActiveRef.current = false;
        recordingUri = (await stopNativeRecording()).uri;
      } else {
        await recorder.stop();
        recordingUri = recorder.uri || '';
      }
      recordingActiveRef.current = false;
      if (!recordingUri) throw new Error('No recording was produced.');
      const transcript = await transcribeFeedback(recordingUri);
      if (mountedRef.current) setComment(transcript);
    } catch (transcriptionError) {
      captureDiagnosticError(transcriptionError, 'feedback_transcription');
      if (mountedRef.current) setError('No pudimos transcribirlo. Puedes grabar otra vez.');
    } finally {
      recordingActiveRef.current = false;
      if (recordingUri) {
        try {
          new File(recordingUri).delete();
        } catch {
          // Voice feedback recordings are disposable after transcription.
        }
      }
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
    <ScrollView
      contentContainerStyle={[styles.page, isPortrait ? styles.pagePortrait : null]}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
    >
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>TU OPINIÓN NOS AYUDA</Text>
          <Text style={styles.title}>Ayúdanos a mejorar esta lección</Text>
        </View>
      </View>

      <View style={[styles.questionsRow, isPortrait ? styles.questionsColumn : null]}>
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

      <View style={[styles.voiceCard, isPortrait ? styles.voiceCardPortrait : null]}>
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
        <View
          accessibilityLabel={phase === 'recording' ? 'El micrófono está escuchando' : undefined}
          accessibilityLiveRegion="polite"
          style={[styles.recordingSignal, phase === 'recording' ? styles.recordingSignalActive : null]}
        >
          <View style={[styles.recordingDot, phase === 'recording' ? styles.recordingDotActive : null]} />
          <View style={styles.wave} accessibilityElementsHidden>
            {[0.62, 0.88, 1, 0.82, 0.58].map((weight, index) => (
              <View
                key={`${weight}-${index}`}
                style={[
                  styles.waveBar,
                  {
                    height: 28 * weight,
                    transform: [{
                      scaleY: phase === 'recording'
                        ? Math.max(0.2, recordingLevel * (index % 2 ? 0.86 : 1.12))
                        : 0.2,
                    }],
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.recordingLabel}>
            {phase === 'recording' ? 'Escuchando…' : 'Listo para escuchar'}
          </Text>
        </View>
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
      <View style={styles.skipRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving || phase !== 'idle'}
          onPress={onDone}
          style={[styles.skipButton, isSaving || phase !== 'idle' ? styles.disabled : null]}
        >
          <Text style={styles.skipText}>Ahora no</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  scroll: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { flexGrow: 1, gap: 10, padding: 14 },
  pagePortrait: { paddingBottom: 28 },
  headingRow: { alignItems: 'stretch' },
  eyebrow: { color: '#2f8f62', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#24333a', fontSize: 25, fontWeight: '900', marginTop: 3 },
  skipRow: { alignItems: 'center' },
  skipButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, maxWidth: '100%', borderColor: '#d7c8aa', borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 10 },
  skipText: { color: '#58656a', fontSize: 13, fontWeight: '800' },
  questionsRow: { flexDirection: 'row', gap: 10 },
  questionsColumn: { flexDirection: 'column' },
  questionCard: { backgroundColor: '#fff', borderColor: '#e2d8c8', borderRadius: 16, borderWidth: 1, flex: 1, padding: 12 },
  questionTitle: { color: '#24333a', fontSize: 15, fontWeight: '900' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  option: { backgroundColor: '#f6f1e8', borderColor: '#ded2bd', borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  optionSelected: { backgroundColor: '#dff4e7', borderColor: '#2f8f62', borderWidth: 2 },
  optionText: { color: '#4c5b60', fontSize: 12, fontWeight: '800' },
  optionTextSelected: { color: '#17623f' },
  voiceCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e2d8c8', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 },
  voiceCardPortrait: { alignItems: 'stretch', flexDirection: 'column' },
  voiceCopy: { flex: 1 },
  hint: { color: '#6d797d', fontSize: 11, marginTop: 4 },
  voiceButton: { alignItems: 'center', backgroundColor: '#2f8f62', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 110, paddingHorizontal: 14 },
  voiceButtonRecording: { backgroundColor: '#c64f45' },
  voiceButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  recordingSignal: { alignItems: 'center', flexDirection: 'row', gap: 7, minWidth: 150, opacity: 0.55 },
  recordingSignalActive: { opacity: 1 },
  recordingDot: { backgroundColor: '#aeb6b8', borderRadius: 7, height: 11, width: 11 },
  recordingDotActive: { backgroundColor: '#d95c52' },
  wave: { alignItems: 'center', flexDirection: 'row', gap: 3, height: 30 },
  waveBar: { backgroundColor: '#d95c52', borderRadius: 3, width: 4 },
  recordingLabel: { color: '#58656a', fontSize: 11, fontWeight: '800' },
  transcript: { backgroundColor: '#f8f5ef', borderColor: '#ddd2c0', borderRadius: 10, borderWidth: 1, color: '#24333a', flex: 1.2, fontSize: 12, minHeight: 58, padding: 9, textAlignVertical: 'top' },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', minHeight: 48 },
  error: { color: '#a34842', flex: 1, fontSize: 12, fontWeight: '700' },
  submitButton: { alignItems: 'center', backgroundColor: '#e96f42', borderRadius: 13, justifyContent: 'center', minHeight: 46, minWidth: 190, paddingHorizontal: 18 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
