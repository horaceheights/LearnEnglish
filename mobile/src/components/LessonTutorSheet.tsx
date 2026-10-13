import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TUTOR_SUGGESTIONS, tutorContextKey, type TutorContext } from '../lessonTutor';
import type { useLessonTutor } from '../hooks/useLessonTutor';
import { speakTutor, transcribeTutor } from '../tutorApi';
import { useTutorVoicePreference } from '../hooks/useTutorVoicePreference';
import { useTutorReplyReveal } from '../hooks/useTutorReplyReveal';
import { tutorSpeechQueue } from '../tutorSpeechStream';
import { playNativeTutorSegment } from '../tutorSpeechPlayback';
import { TutorActivity } from './TutorActivity';

type Props = { tutor: ReturnType<typeof useLessonTutor>; context: TutorContext; title: string; answer: string; active: boolean };
export function LessonTutorSheet({ tutor, context, title, answer, active }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const { enabled: voiceReplies, ready: voicePreferenceReady, setEnabled: setVoiceReplies } = useTutorVoicePreference(AsyncStorage);
  const [voiceError, setVoiceError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'recording' | 'transcribing' | 'loading' | 'speaking'>('idle');
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recording = useAudioRecorderState(recorder, 200);
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const scroll = useRef<ScrollView>(null);
  const run = useRef(0);
  const voiceAbort = useRef<AbortController | null>(null);
  const audioFile = useRef<File | null>(null);
  const recordingStarted = useRef(false);
  const recorderWork = useRef<Promise<void>>(Promise.resolve());
  const serializeRecorder = useCallback((work: () => Promise<void>) => {
    const task = recorderWork.current.catch(() => undefined).then(work);
    recorderWork.current = task.catch(() => undefined);
    return task;
  }, []);
  const lastSpoken = useRef('');
  const speechMessage = useRef('');
  const foreground = useRef(AppState.currentState === 'active');
  const visible = useRef(tutor.visible && active);
  visible.current = tutor.visible && active;
  const cardKey = tutorContextKey(context);
  const { latestKey, reveal, waiting } = useTutorReplyReveal(tutor.messages, cardKey, voiceReplies, voicePreferenceReady);

  const stopVoice = useCallback((revealPending = true) => {
    if (revealPending && speechMessage.current) reveal(speechMessage.current);
    speechMessage.current = '';
    run.current++; voiceAbort.current?.abort(); voiceAbort.current = null;
    try { player.pause(); } catch { /* May already be released on unmount. */ }
    if (recordingStarted.current) {
      recordingStarted.current = false;
      void serializeRecorder(async () => {
        await recorder.stop();
        if (recorder.uri) { try { new File(recorder.uri).delete(); } catch {} }
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
      }).catch(() => undefined);
    }
    if (audioFile.current) { try { audioFile.current.delete(); } catch {} audioFile.current = null; }
    setPhase('idle');
  }, [player, recorder, serializeRecorder, reveal]);
  useEffect(() => {
    if (!tutor.visible || !active) stopVoice();
    return stopVoice;
  }, [tutor.visible, active, cardKey, stopVoice]);
  useEffect(() => { setDraft(''); setVoiceError(''); lastSpoken.current = ''; }, [cardKey]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { foreground.current = state === 'active'; if (!foreground.current) stopVoice(); });
    return () => subscription.remove();
  }, [stopVoice]);
  const play = useCallback(async (text: string, messageKey = latestKey) => {
    stopVoice(false); setVoiceError(''); setPhase('loading');
    speechMessage.current = messageKey;
    const generation = run.current;
    const controller = new AbortController(); voiceAbort.current = controller;
    const timer = setTimeout(() => controller.abort(), 45000);
    const queue = tutorSpeechQueue(async base64 => {
      if (controller.signal.aborted || generation !== run.current || !visible.current || !foreground.current) return;
      const file = new File(Paths.cache, `lesson-tutor-${Date.now()}-${generation}.mp3`);
      file.write(base64, { encoding: 'base64' }); audioFile.current = file;
      try {
        setPhase('loading');
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
        if (controller.signal.aborted || generation !== run.current || !visible.current || !foreground.current) return;
        await playNativeTutorSegment(player, file.uri, controller.signal, () => {
          if (generation === run.current && visible.current && foreground.current) { reveal(messageKey); setPhase('speaking'); }
        });
        if (generation === run.current) setPhase('loading');
      } finally {
        try { file.delete(); } catch {}
        if (audioFile.current === file) audioFile.current = null;
      }
    }, () => controller.abort());
    try {
      await speakTutor(context, text, controller.signal, queue.add);
      clearTimeout(timer);
      await queue.finish();
      if (generation === run.current) setPhase('idle');
    } catch {
      controller.abort();
      await queue.finish().catch(() => undefined);
      if (generation === run.current && visible.current) {
        reveal(messageKey); setVoiceError('No pudimos reproducir la voz. Puedes leer la explicación.'); setPhase('idle');
      }
    } finally { clearTimeout(timer); if (generation === run.current) voiceAbort.current = null; }
  }, [context, latestKey, player, reveal, stopVoice]);
  useEffect(() => {
    const last = tutor.messages[tutor.messages.length - 1];
    const messageKey = latestKey;
    if (!tutor.visible || !active || !foreground.current || !voicePreferenceReady || !voiceReplies || tutor.busy || phase !== 'idle' || last?.role !== 'assistant' || lastSpoken.current === messageKey) return;
    lastSpoken.current = messageKey;
    void play(last.content);
  }, [active, latestKey, phase, play, tutor.busy, tutor.messages, tutor.visible, voicePreferenceReady, voiceReplies]);

  const startRecording = async () => {
    stopVoice(); setVoiceError(''); setPhase('preparing');
    const generation = run.current;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (generation !== run.current || !visible.current) return;
      if (!permission.granted) throw new Error('Permite el micrófono en Ajustes, o escribe tu pregunta.');
      await serializeRecorder(async () => {
        if (generation !== run.current || !visible.current) return;
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        if (generation !== run.current || !visible.current) {
          await recorder.stop();
          if (recorder.uri) { try { new File(recorder.uri).delete(); } catch {} }
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
          return;
        }
        recorder.record(); recordingStarted.current = true;
      });
      if (generation !== run.current || !visible.current) return;
      lastSpoken.current = latestKey;
      setPhase('recording');
    } catch (cause) {
      if (generation === run.current && visible.current) { setPhase('idle'); setVoiceError(cause instanceof Error ? cause.message : 'No pudimos abrir el micrófono.'); }
    }
  };
  const finishRecording = useCallback(async () => {
    if (!recordingStarted.current) return;
    recordingStarted.current = false; setPhase('transcribing');
    const generation = run.current;
    const controller = new AbortController(); voiceAbort.current = controller;
    const timer = setTimeout(() => controller.abort(), 45000);
    let file: File | null = null;
    try {
      let uri: string | null = null;
      await serializeRecorder(async () => {
        await recorder.stop();
        uri = recorder.uri;
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false });
      });
      if (!uri) throw new Error('No recording');
      file = new File(uri);
      const encoded = await file.base64();
      if (generation !== run.current || !visible.current) return;
      const text = await transcribeTutor(context, encoded, Platform.OS === 'web' ? 'webm' : 'm4a', controller.signal);
      if (generation === run.current && visible.current) setDraft(text);
    } catch {
      if (generation === run.current && visible.current) setVoiceError('No pudimos transcribir tu pregunta. Graba otra vez o escríbela.');
    } finally {
      clearTimeout(timer); if (file) { try { file.delete(); } catch {} }
      if (generation === run.current) { voiceAbort.current = null; setPhase('idle'); }
    }
  }, [context, recorder, serializeRecorder]);
  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = setTimeout(() => void finishRecording(), 60000);
    return () => clearTimeout(timer);
  }, [finishRecording, phase]);
  const send = async (text = draft) => {
    stopVoice(); setVoiceError('');
    if (await tutor.send(text)) setDraft('');
  };
  const close = () => { stopVoice(); tutor.close(); };
  const voiceBusy = phase === 'preparing' || phase === 'recording' || phase === 'transcribing';
  return <Modal visible={tutor.visible} transparent animationType="fade" onRequestClose={close}>
    <View style={[styles.backdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <View style={styles.heading}>
          <View style={styles.headingRow}><View style={styles.headingText}><Text accessibilityRole="header" style={styles.title}>Tutor IA</Text></View>
            <Pressable accessibilityRole="switch" accessibilityLabel="Respuestas con voz" accessibilityState={{ checked: voiceReplies }}
              onPress={() => { setVoiceReplies(!voiceReplies); if (voiceReplies && (phase === 'speaking' || phase === 'loading')) stopVoice(); }} style={styles.voiceToggle}>
              <Ionicons name={voiceReplies ? 'volume-high-outline' : 'volume-mute-outline'} size={23} color="#176f73" />
              <Text maxFontSizeMultiplier={1.3} style={styles.preferenceText}>{voiceReplies ? 'Voz' : 'Sin voz'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar tutor y volver a la lección" onPress={close} style={styles.iconButton}><Ionicons name="close" size={26} color="#245f53" /></Pressable>
          </View><Text style={styles.subheading}>{title} · Lección en pausa</Text>
        </View>
        <ScrollView ref={scroll} style={styles.messages} contentContainerStyle={styles.messageContent} keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {answer ? <Text style={styles.context}>Tu respuesta: {answer}</Text> : <Text style={styles.context}>Una pista para esta tarjeta. Tú eliges la respuesta.</Text>}
          {tutor.messages.map((message, index) => waiting && index === tutor.messages.length - 1 ? null : <View key={index} style={[styles.bubble, message.role === 'user' && styles.userBubble]}>
            <Text selectable style={styles.message}>{message.content}</Text>
            {message.role === 'assistant' ? <Pressable accessibilityRole="button" accessibilityLabel="Escuchar explicación" disabled={voiceBusy}
              onPress={() => void play(message.content)} style={styles.speaker}><Ionicons name="volume-medium-outline" size={24} color="#176f73" /></Pressable> : null}
          </View>)}
          {tutor.busy || waiting || phase === 'loading' || phase === 'speaking' ? <View style={[styles.status, (tutor.busy || waiting) && styles.pending]}>
            <TutorActivity state={phase === 'speaking' && playback.playing ? 'speaking' : 'thinking'} active={tutor.visible && active} />
            <Text accessibilityLiveRegion="polite" style={styles.statusText}>{tutor.busy ? 'Pensando…' : waiting || phase === 'loading' ? 'Preparando voz…' : 'Hablando…'}</Text></View> : null}
          {tutor.error ? <View accessibilityLiveRegion="polite"><Text style={styles.error}>{tutor.error}</Text><Pressable accessibilityRole="button" onPress={tutor.retry} style={styles.chip}><Text style={styles.chipText}>Reintentar</Text></Pressable></View> : null}
          {!tutor.busy && !waiting && tutor.messages.length > 0 ? <View style={styles.suggestions}>{TUTOR_SUGGESTIONS.map(text => <Pressable key={text} accessibilityRole="button" disabled={voiceBusy}
            onPress={() => void send(text)} style={styles.chip}><Text style={styles.chipText}>{text}</Text></Pressable>)}</View> : null}
        </ScrollView>
        <View style={styles.composer}>
          {voiceError ? <View><Text accessibilityLiveRegion="polite" style={styles.error}>{voiceError}</Text>{tutor.messages.at(-1)?.role === 'assistant' ? <Pressable accessibilityRole="button" accessibilityLabel="Reintentar voz" onPress={() => void play(tutor.messages.at(-1)!.content)} style={styles.chip}><Text style={styles.chipText}>Reintentar voz</Text></Pressable> : null}</View> : null}
          {voiceBusy ? <View style={styles.recording}>
            <Text accessibilityLiveRegion="polite" style={styles.statusText}>{phase === 'recording' ? `Grabando… ${Math.floor(recording.durationMillis / 1000)} s` : phase === 'transcribing' ? 'Transcribiendo…' : 'Abriendo micrófono…'}</Text>
            {phase === 'recording' ? <><View style={styles.recordingVisual}><TutorActivity state="listening" active={tutor.visible && active} level={Math.max(0.2, ((recording.metering ?? -60) + 60) / 45)} /></View><Pressable accessibilityRole="button" onPress={() => void finishRecording()} style={styles.finish}><Text style={styles.finishText}>Terminar grabación</Text></Pressable></> : <ActivityIndicator color="#176f73" />}
            <Pressable accessibilityRole="button" onPress={() => stopVoice()} style={styles.chip}><Text style={styles.chipText}>Cancelar</Text></Pressable>
          </View> : <View style={styles.inputRow}>
            <TextInput accessibilityLabel="Tu pregunta para el tutor" placeholder="Escribe tu pregunta…" multiline maxLength={1200} value={draft} onChangeText={setDraft} style={styles.input} />
            <Pressable accessibilityRole="button" accessibilityLabel="Grabar pregunta" disabled={tutor.busy} onPress={() => void startRecording()} style={styles.iconButton}><Ionicons name="mic-outline" size={25} color="#176f73" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Enviar pregunta" disabled={tutor.busy || !draft.trim()} onPress={() => void send()} style={[styles.send, (tutor.busy || !draft.trim()) && styles.disabled]}><Ionicons name="send" size={23} color="white" /></Pressable>
          </View>}
          {phase === 'speaking' || phase === 'loading' ? <Pressable accessibilityRole="button" onPress={() => stopVoice()} style={styles.chip}><Text style={styles.chipText}>Detener voz</Text></Pressable> : null}
          <Text style={styles.notice}>Tutor con IA · Puede equivocarse. Se necesita internet.</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#163b5c66', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, width: '100%', maxWidth: 680, maxHeight: 880, borderRadius: 24, backgroundColor: '#fffdf7', overflow: 'hidden' },
  heading: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e8e4d8' },
  headingRow: { flexDirection: 'row', alignItems: 'center' },
  voiceToggle: { minWidth: 64, minHeight: 48, borderRadius: 14, backgroundColor: '#eaf0e6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  headingText: { flex: 1 }, title: { color: '#245f53', fontSize: 23, fontWeight: '900' }, subheading: { color: '#5a7069', fontSize: 13, marginTop: 2 },
  messages: { flex: 1, minHeight: 0 }, messageContent: { gap: 12, padding: 16 }, context: { backgroundColor: '#fff0d6', borderRadius: 14, padding: 12, color: '#52655d', fontSize: 15 },
  bubble: { alignSelf: 'flex-start', maxWidth: '96%', backgroundColor: '#eaf0e6', padding: 14, borderRadius: 18 }, userBubble: { alignSelf: 'flex-end', backgroundColor: '#f8ddc8' },
  message: { color: '#203c37', fontSize: 17, lineHeight: 25 }, speaker: { alignSelf: 'flex-end', minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center' }, statusText: { color: '#176f73', fontSize: 16, fontWeight: '700' },
  pending: { minHeight: 130, justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { minHeight: 48, borderWidth: 1, borderColor: '#b8d3c8', borderRadius: 16, padding: 10, justifyContent: 'center', alignSelf: 'flex-start' }, chipText: { color: '#176f73', fontSize: 15, fontWeight: '700' },
  composer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderTopWidth: 1, borderColor: '#e8e4d8' }, preferenceText: { color: '#176f73', fontSize: 12, fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 4, alignItems: 'center' }, input: { flex: 1, minHeight: 48, maxHeight: 100, backgroundColor: 'white', borderWidth: 1, borderColor: '#b8d3c8', borderRadius: 16, paddingHorizontal: 12, fontSize: 16, color: '#203c37' },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, send: { width: 48, height: 48, backgroundColor: '#278c73', borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.4 },
  error: { color: '#a34842', fontSize: 15, paddingVertical: 4 }, notice: { color: '#748179', fontSize: 11, textAlign: 'center', marginTop: 6 },
  recording: { gap: 7 }, recordingVisual: { alignItems: 'center', padding: 6 }, finish: { backgroundColor: '#dd6844', borderRadius: 14, padding: 12, minHeight: 48, alignItems: 'center' }, finishText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
