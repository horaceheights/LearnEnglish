import styles from './LiamAvatar.module.css';
export default function LiamAvatar({ speaking = false, active = true }) {
  return <div className={styles.avatar} data-speaking={speaking && active} aria-hidden="true">
    <div className={styles.shirt} /><div className={styles.face}><div className={styles.hair} />
      <div className={styles.eyes}><i /><i /></div><div className={styles.mouth} /></div>
  </div>;
}
