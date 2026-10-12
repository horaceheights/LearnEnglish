"use client";
import styles from "./LessonTutor.module.css";

export function TutorIcon() {
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 16-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m12 5 1.5 4.5L18 11l-4.5 1.5L12 17l-1.5-4.5L6 11l4.5-1.5Z" fill="currentColor" /></svg>;
}
export function TutorButton({ onClick, more = false }) {
  return <button type="button" className={`${styles.tutorButton} ${more ? styles.more : styles.glow}`}
    aria-label={more ? 'Saber más con el tutor IA' : 'Abrir tutor IA'} onClick={onClick}><TutorIcon />{more ? 'Saber más' : 'IA'}</button>;
}
