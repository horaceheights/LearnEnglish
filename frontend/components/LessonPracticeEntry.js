"use client";
import { useMemo, useState } from 'react';
import { practiceContext, practiceProgress, practiceUnitLabel, PRACTICE_START } from '../../mobile/src/lessonPractice';
import { useLessonTutor } from '../../mobile/src/hooks/useLessonTutor';
import { askPractice, speakPractice, transcribePractice } from '../lib/tutorApi';
import { primeTutorAudio } from '../lib/tutorAudio';
import LessonTutor from './LessonTutor';
import styles from './LessonPracticeEntry.module.css';

function Session({ lesson, scope, mode, disabled, onOpen }) {
  const context = useMemo(() => practiceContext(lesson, mode), [lesson, mode]);
  const tutor = useLessonTutor(scope + ':' + mode, context, askPractice, PRACTICE_START);
  const progress = practiceProgress(tutor.messages, mode, tutor.busy, tutor.error);
  const open = () => { onOpen?.(); primeTutorAudio(); tutor.open(); };
  return <><button type="button" className={styles.start} disabled={disabled} onClick={open}>
    {progress.complete ? 'Ver mi feedback' : tutor.messages.length ? 'Continuar con Liam' : 'Empezar a practicar'}
  </button><LessonTutor tutor={tutor} context={context} title={practiceUnitLabel(lesson)}
    practice={{ ...progress, speak: speakPractice, transcribe: transcribePractice }} /></>;
}
export default function LessonPracticeEntry({ lesson, scope, disabled, onOpen }) {
  const [mode, setMode] = useState('extended');
  return <section className={styles.card} aria-label="Práctica opcional con Liam">
    <span className={styles.badge}>PRUEBA · OPCIONAL</span><h2>Repasa la {practiceUnitLabel(lesson)} con Liam</h2>
    <p>Conversa sobre lo aprendido en la unidad. Liam te guía y termina con feedback. Ideal al terminar las lecciones; no cambia tu progreso.</p>
    <div className={styles.modes} role="group" aria-label="Duración del repaso">
      <button type="button" aria-pressed={mode === 'short'} onClick={() => setMode('short')}>Corto · 3 respuestas</button>
      <button type="button" aria-pressed={mode === 'extended'} onClick={() => setMode('extended')}>Ampliado · 6 respuestas</button>
    </div>
    <Session key={mode} lesson={lesson} scope={scope} mode={mode} disabled={disabled} onOpen={onOpen} />
    <small>Necesitas iniciar sesión e internet. Ambas opciones son de prueba, sin compra.</small>
  </section>;
}
