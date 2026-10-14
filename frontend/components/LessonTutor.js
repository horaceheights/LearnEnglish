"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { TUTOR_SUGGESTIONS, tutorContextKey } from '../../mobile/src/lessonTutor';
import { speakTutor, transcribeTutor } from '../lib/tutorApi';
import styles from './LessonTutor.module.css';
import { TutorActivity } from './TutorActivity';
import LiamAvatar from './LiamAvatar';
import { getTutorAudio } from '../lib/tutorAudio';
import { useTutorVoicePreference } from '../../mobile/src/hooks/useTutorVoicePreference';
import { useTutorReplyReveal } from '../../mobile/src/hooks/useTutorReplyReveal';
import { tutorSpeechQueue } from '../../mobile/src/tutorSpeechStream';
import { playWebTutorSegment } from '../../mobile/src/tutorSpeechPlayback';

const voiceStorage = {
  getItem: async key => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
};

export default function LessonTutor({ tutor, context, title, answer, practice }) {
  const speechTransport = practice?.speak || speakTutor;
  const transcriptionTransport = practice?.transcribe || transcribeTutor;
  const dialog = useRef(null);
  const body = useRef(null);
  const [draft, setDraft] = useState('');
  const { enabled: voiceReplies, ready: voicePreferenceReady, setEnabled: setVoiceReplies } = useTutorVoicePreference(voiceStorage);
  const [phase, setPhase] = useState('idle');
  const [voiceError, setVoiceError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const recording = useRef(null);
  const stream = useRef(null);
  const player = useRef(null);
  const audioUrl = useRef(null);
  const abort = useRef(null);
  const epoch = useRef(0);
  const visible = useRef(tutor.visible); visible.current = tutor.visible;
  const lastSpoken = useRef('');
  const speechMessage = useRef('');
  const key = tutorContextKey(context);
  const { latestKey, reveal, waiting } = useTutorReplyReveal(tutor.messages, key, voiceReplies, voicePreferenceReady);
  const stopVoice = useCallback((revealPending = true) => {
    if (revealPending && speechMessage.current) reveal(speechMessage.current);
    speechMessage.current = '';
    epoch.current++; abort.current?.abort(); abort.current = null;
    if (recording.current?.state === 'recording') recording.current.stop();
    recording.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (player.current) { player.current.onplaying = null; player.current.onended = null; player.current.onerror = null; player.current.pause(); player.current = null; }
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); audioUrl.current = null;
    setPhase('idle');
  }, [reveal]);
  useEffect(() => {
    if (tutor.visible && !dialog.current.open) dialog.current.showModal();
    if (!tutor.visible) { dialog.current?.close(); stopVoice(); }
    return stopVoice;
  }, [tutor.visible, key, stopVoice]);
  useEffect(() => { setDraft(''); setVoiceError(''); lastSpoken.current = ''; }, [key]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stopVoice(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stopVoice]);
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [tutor.messages, tutor.busy, waiting]);
  const play = useCallback(async (text, messageKey = latestKey) => {
    stopVoice(false); setPhase('loading'); setVoiceError('');
    speechMessage.current = messageKey;
    const run = epoch.current;
    const controller = new AbortController(); abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    const queue = tutorSpeechQueue(async base64 => {
      if (controller.signal.aborted || run !== epoch.current || !visible.current || document.hidden) throw new Error('Audio cancelled');
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })); audioUrl.current = url;
      const audio = getTutorAudio(); player.current = audio; setPhase('loading');
      try {
        await playWebTutorSegment(audio, url, controller.signal, () => {
          if (run === epoch.current && visible.current && !document.hidden) { reveal(messageKey); setPhase('speaking'); }
        });
        if (run === epoch.current) setPhase('loading');
      } finally {
        URL.revokeObjectURL(url);
        if (audioUrl.current === url) audioUrl.current = null;
      }
    }, () => controller.abort());
    try {
      await speechTransport(context, text, controller.signal, queue.add);
      clearTimeout(timeout);
      await queue.finish();
      if (controller.signal.aborted) throw new Error('Audio cancelled');
      if (run === epoch.current) setPhase('idle');
    } catch {
      controller.abort();
      await queue.finish().catch(() => undefined);
      if (run === epoch.current && visible.current) { reveal(messageKey); setVoiceError('No pudimos reproducir la voz. Puedes leer la explicación.'); setPhase('idle'); }
    } finally { clearTimeout(timeout); if (run === epoch.current) abort.current = null; }
  }, [context, latestKey, reveal, speechTransport, stopVoice]);
  useEffect(() => {
    const last = tutor.messages.at(-1);
    const messageKey = latestKey;
    if (!tutor.visible || !voicePreferenceReady || !voiceReplies || tutor.busy || phase !== 'idle' || last?.role !== 'assistant' || lastSpoken.current === messageKey || document.hidden) return;
    lastSpoken.current = messageKey; void play(last.content);
  }, [latestKey, phase, play, tutor.busy, tutor.messages, tutor.visible, voicePreferenceReady, voiceReplies]);
  const finishRecording = useCallback(() => {
    if (recording.current?.state === 'recording') { setPhase('transcribing'); recording.current.stop(); }
  }, []);
  useEffect(() => {
    if (phase !== 'recording') return;
    const started = Date.now(); setSeconds(0);
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000); setSeconds(elapsed);
      if (elapsed >= 60) finishRecording();
    }, 250);
    return () => clearInterval(timer);
  }, [phase, finishRecording]);
  const startRecording = async () => {
    stopVoice(); setVoiceError(''); setPhase('preparing');
    const run = epoch.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('unsupported');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (run !== epoch.current || !visible.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const recorder = new MediaRecorder(media); recording.current = recorder;
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        media.getTracks().forEach(track => track.stop());
        if (run !== epoch.current || !visible.current) return;
        const controller = new AbortController(); abort.current = controller;
        const timeout = setTimeout(() => controller.abort(), 45000);
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          if (blob.size > 4 * 1024 * 1024) throw new Error('too large');
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob);
          });
          const text = await transcriptionTransport(context, base64, blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm', controller.signal);
          if (run === epoch.current && visible.current) setDraft(text);
        } catch { if (run === epoch.current && visible.current) setVoiceError('No pudimos transcribir tu pregunta. Graba otra vez o escríbela.'); }
        finally { clearTimeout(timeout); if (run === epoch.current) { abort.current = null; setPhase('idle'); } }
      };
      recorder.start(); lastSpoken.current = latestKey; setPhase('recording');
    } catch {
      if (run === epoch.current) { stopVoice(); setVoiceError('No pudimos abrir el micrófono. Revisa el permiso del navegador o escribe tu pregunta.'); }
    }
  };
  const send = async text => { if (practice?.complete) return; stopVoice(); setVoiceError(''); if (await tutor.send(text)) setDraft(''); };
  const voiceBusy = ['preparing', 'recording', 'transcribing'].includes(phase);
  const avatarState = phase === 'speaking' ? 'speaking' : phase === 'recording' ? 'listening' : tutor.busy || phase === 'loading' ? 'thinking' : practice?.complete ? 'complete' : 'idle';
  const avatarCaption = avatarState === 'speaking' ? 'Liam está hablando' : avatarState === 'listening' ? 'Te escucho' : avatarState === 'thinking' ? 'Preparando tu respuesta…' : avatarState === 'complete' ? '¡Buen trabajo!' : 'Tu turno · Toca el micrófono';
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="tutor-title" onCancel={event => { event.preventDefault(); tutor.close(); }}>
    <header className={styles.header}><div className={styles.headingRow}><h2 id="tutor-title">{practice ? 'Practica con Liam' : 'Tutor IA'}</h2>
      <button type="button" role="switch" aria-checked={voiceReplies} aria-label="Respuestas con voz" className={styles.voiceToggle}
        onClick={() => { setVoiceReplies(!voiceReplies); if (voiceReplies && ['loading', 'speaking'].includes(phase)) stopVoice(); }}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4 6 8H2v8h4l5 4V4Z" />
          {voiceReplies ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /> : <path d="m16 9 6 6m0-6-6 6" />}</svg><span>{voiceReplies ? 'Voz' : 'Sin voz'}</span></button>
      <button type="button" className={styles.iconButton} aria-label="Cerrar tutor y volver a la lección" onClick={tutor.close}>×</button></div>
      <p>{title} · {practice ? 'Repaso opcional' : 'Lección en pausa'}</p></header>
    <div className={`${styles.conversation} ${practice ? styles.practiceConversation : ''}`}>
    {practice ? <div className={styles.avatarStage}><LiamAvatar speaking={phase === 'speaking'} state={avatarState} player={player.current} active={tutor.visible} /><p>{avatarCaption}</p></div> : null}
    <div ref={body} className={styles.messages} aria-live="polite">
      <p className={styles.context}>{practice ? `Liam guía el intercambio. ${practice.answers} de ${practice.limit} respuestas. Tu resultado no cambia.` : answer ? `Tu respuesta: ${answer}` : 'Una pista para esta tarjeta. Tú eliges la respuesta.'}</p>
      {tutor.messages.map((message, index) => waiting && index === tutor.messages.length - 1 ? null : <div key={index} className={`${styles.bubble} ${message.role === 'user' ? styles.user : ''}`}>
        <p>{message.content}</p>{message.role === 'assistant' ? <button type="button" className={styles.speaker} disabled={voiceBusy} aria-label="Escuchar explicación" onClick={() => void play(message.content)}>♪ Escuchar</button> : null}
      </div>)}
      {tutor.busy || waiting || ['loading', 'speaking'].includes(phase) ? <div className={`${styles.aiStatus} ${tutor.busy || waiting ? styles.pending : ''}`} role="status">
        {!practice ? <TutorActivity state={phase === 'speaking' ? 'speaking' : 'thinking'} active={tutor.visible} /> : null}
        <span>{tutor.busy ? 'Pensando…' : waiting || phase === 'loading' ? 'Preparando voz…' : 'Hablando…'}</span></div> : null}
      {tutor.error ? <div role="status" className={styles.error}>{tutor.error}<button type="button" onClick={tutor.retry}>Reintentar</button></div> : null}
      {!practice?.complete && !tutor.busy && !waiting && tutor.messages.length ? <div className={styles.suggestions}>{(practice ? ['Dame una pista.', 'Más fácil, por favor.'] : TUTOR_SUGGESTIONS).map(text => <button type="button" key={text} disabled={voiceBusy} onClick={() => void send(text)}>{text}</button>)}</div> : null}
    </div>
    </div>
    <footer className={styles.footer}>
      {voiceError ? <div className={styles.error} role="status">{voiceError}{tutor.messages.at(-1)?.role === 'assistant' ? <button type="button" aria-label="Reintentar voz" onClick={() => void play(tutor.messages.at(-1).content)}>Reintentar voz</button> : null}</div> : null}
      {practice?.complete ? <div className={styles.recording}><p role="status">{waiting ? 'Preparando tu feedback…' : 'Repaso terminado · Tu feedback está arriba.'}</p><button type="button" onClick={tutor.close}>Volver a mi resultado</button></div> : voiceBusy ? <div className={styles.recording}><p role="status">{phase === 'recording' ? `Grabando… ${seconds} s` : phase === 'transcribing' ? 'Transcribiendo…' : 'Abriendo micrófono…'}</p>
        {phase === 'recording' ? <><div className={styles.recordingVisual}><TutorActivity state="listening" active={tutor.visible} /></div><button type="button" onClick={finishRecording}>Terminar grabación</button></> : null}<button type="button" onClick={stopVoice}>Cancelar</button></div>
        : <form className={styles.composer} onSubmit={event => { event.preventDefault(); void send(draft); }}>
          <textarea aria-label={practice ? "Tu respuesta para Liam" : "Tu pregunta para el tutor"} placeholder={practice ? "Escribe o graba tu respuesta…" : "Escribe tu pregunta…"} value={draft} onChange={event => setDraft(event.target.value)} maxLength={1200} rows={2} />
          <button type="button" aria-label={practice ? "Grabar respuesta" : "Grabar pregunta"} disabled={tutor.busy} onClick={() => void startRecording()}>🎙</button>
          <button type="submit" aria-label={practice ? "Enviar respuesta" : "Enviar pregunta"} disabled={tutor.busy || !draft.trim()}>➤</button></form>}
      {['loading', 'speaking'].includes(phase) ? <button type="button" onClick={stopVoice}>Detener voz</button> : null}
      <small>{practice ? 'Práctica con IA · La transcripción no es una nota de pronunciación.' : 'Tutor con IA · Puede equivocarse. Se necesita internet.'}</small>
    </footer>
  </dialog>;
}
