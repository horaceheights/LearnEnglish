import styles from './ConstructionCelebration.module.css';

export default function ConstructionCelebration() {
  return <div className={styles.celebration} data-testid="construction-celebration">
    <div className={styles.scene} aria-hidden="true">
      <span className={styles.leftStar}>✦</span>
      <img src="/mascots/squirrel-professor-celebrating-v1.png" alt="" width="112" height="112" className={styles.mascot} />
      <span className={styles.rightStar}>✦</span>
    </div>
    <div role="status" className={styles.copy}>
      <div className={styles.title}>¡Perfecto!</div>
      <div className={styles.message}>¡Buen trabajo!</div>
    </div>
  </div>;
}
