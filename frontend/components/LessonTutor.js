"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { TUTOR_SUGGESTIONS, tutorContextKey } from '../../mobile/src/lessonTutor';
import { speakTutor, transcribeTutor } from '../lib/tutorApi';
import styles from './LessonTutor.module.css';
import { TutorIcon } from './TutorButton';

export default function LessonTutor({ tutor, context, title, answer }) {
  const dialog = useRef(null);
  const body = useRef(null);
  const [draft, setDraft] = useState('');
  const [voiceReplies, setVoiceReplies] = useState(false);
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
  const key = tutorContextKey(context);
  const stopVoice = useCallback(() => {
    epoch.current++; abort.current?.abort(); abort.current = null;
    if (recording.current?.state === 'recording') recording.current.stop();
    recording.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    player.current?.pause(); player.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); audioUrl.current = null;
    setPhase('idle');
  }, []);
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
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [tutor.messages, tutor.busy]);
  const play = useCallback(async text => {
    stopVoice(); setPhase('speaking'); setVoiceError('');
    const run = epoch.current;
    const controller = new AbortController(); abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const blob = await speakTutor(context, text, controller.signal);
      if (run !== epoch.current || !visible.current || document.hidden) return;
      audioUrl.current = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl.current); player.current = audio;
      audio.onended = () => { if (run === epoch.current) setPhase('idle'); };
      await audio.play();
    } catch {
      if (run === epoch.current && visible.current) { setVoiceError('No pudimos reproducir la voz. Toca la bocina para reintentar.'); setPhase('idle'); }
    } finally { clearTimeout(timeout); if (run === epoch.current) abort.current = null; }
  }, [context, stopVoice]);
  useEffect(() => {
    const last = tutor.messages.at(-1);
    if (!tutor.visible || !voiceReplies || tutor.busy || last?.role !== 'assistant' || lastSpoken.current === last.content || document.hidden) return;
    lastSpoken.current = last.content; void play(last.content);
  }, [play, tutor.busy, tutor.messages, tutor.visible, voiceReplies]);
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
          const text = await transcribeTutor(context, base64, blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm', controller.signal);
          if (run === epoch.current && visible.current) setDraft(text);
        } catch { if (run === epoch.current && visible.current) setVoiceError('No pudimos transcribir tu pregunta. Graba otra vez o escríbela.'); }
        finally { clearTimeout(timeout); if (run === epoch.current) { abort.current = null; setPhase('idle'); } }
      };
      recorder.start(); lastSpoken.current = tutor.messages.at(-1)?.content || ''; setVoiceReplies(true); setPhase('recording');
    } catch {
      if (run === epoch.current) { stopVoice(); setVoiceError('No pudimos abrir el micrófono. Revisa el permiso del navegador o escribe tu pregunta.'); }
    }
  };
  const send = async text => { stopVoice(); setVoiceError(''); if (await tutor.send(text)) setDraft(''); };
  const voiceBusy = ['preparing', 'recording', 'transcribing'].includes(phase);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="tutor-title" onCancel={event => { event.preventDefault(); tutor.close(); }}>
    <header className={styles.header}><TutorIcon /><div><h2 id="tutor-title">Tutor IA</h2><p>{title} · Lección en pausa</p></div>
      <button type="button" className={styles.iconButton} aria-label="Cerrar tutor y volver a la lección" onClick={tutor.close}>×</button></header>
    <div ref={body} className={styles.messages} aria-live="polite">
      <p className={styles.context}>{answer ? `Tu respuesta: ${answer}` : 'Una pista para esta tarjeta. Tú eliges la respuesta.'}</p>
      {tutor.messages.map((message, index) => <div key={index} className={`${styles.bubble} ${message.role === 'user' ? styles.user : ''}`}>
        <p>{message.content}</p>{message.role === 'assistant' ? <button type="button" className={styles.speaker} disabled={voiceBusy} aria-label="Escuchar explicación" onClick={() => void play(message.content)}>♪ Escuchar</button> : null}
      </div>)}
      {tutor.busy ? <p role="status">Preparando tu explicación…</p> : null}
      {tutor.error ? <div role="status" className={styles.error}>{tutor.error}<button type="button" onClick={tutor.retry}>Reintentar</button></div> : null}
      {!tutor.busy && tutor.messages.length ? <div className={styles.suggestions}>{TUTOR_SUGGESTIONS.map(text => <button type="button" key={text} disabled={voiceBusy} onClick={() => void send(text)}>{text}</button>)}</div> : null}
    </div>
    <footer className={styles.footer}>
      <label className={styles.voicePreference}>Responder con voz <input type="checkbox" checked={voiceReplies} onChange={event => { setVoiceReplies(event.target.checked); if (!event.target.checked) stopVoice(); }} /></label>
      {voiceError ? <p role="status" className={styles.error}>{voiceError}</p> : null}
      {voiceBusy ? <div className={styles.recording}><p role="status">{phase === 'recording' ? `Grabando… ${seconds} s` : phase === 'transcribing' ? 'Transcribiendo…' : 'Abriendo micrófono…'}</p>
        {phase === 'recording' ? <button type="button" onClick={finishRecording}>Terminar grabación</button> : null}<button type="button" onClick={stopVoice}>Cancelar</button></div>
        : <form className={styles.composer} onSubmit={event => { event.preventDefault(); void send(draft); }}>
          <textarea aria-label="Tu pregunta para el tutor" placeholder="Escribe tu pregunta…" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1200} rows={2} />
          <button type="button" aria-label="Grabar pregunta" disabled={tutor.busy} onClick={() => void startRecording()}>🎙</button>
          <button type="submit" aria-label="Enviar pregunta" disabled={tutor.busy || !draft.trim()}>➤</button></form>}
      {phase === 'speaking' ? <button type="button" onClick={stopVoice}>Detener voz</button> : null}
      <small>Tutor con IA · Puede equivocarse. Se necesita internet.</small>
    </footer>
  </dialog>;
}
