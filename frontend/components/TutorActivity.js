import styles from './LessonTutor.module.css';

export function TutorActivity({ state = 'available', active = true }) {
  const voice = state === 'speaking' || state === 'listening';
  return <span aria-hidden="true" data-state={state} data-active={active} className={styles.aiVisual}>
    <span className={styles.aiHalo} /><span className={styles.aiOrbit}><i /><i /></span>
    <span className={styles.aiCore}>{voice ? <span className={styles.aiWave}>{[0, 1, 2, 3, 4].map(index => <i key={index} />)}</span>
      : <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="m10 2 2.5 6.5L19 11l-6.5 2.5L10 20l-2.5-6.5L1 11l6.5-2.5L10 2Zm10-1 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /></svg>}
      <span className={styles.aiLabel}>IA</span>
    </span>
  </span>;
}
