"use client";

import { useEffect, useRef } from "react";
import mascot from "../../mobile/assets/mascots/serious/listening-frames-normalized/listening-06.png";
import styles from "./LessonHelpPopup.module.css";

export default function LessonHelpPopup({ mode, message, onDismiss, onSuppress }) {
  const dialog = useRef(null);
  const reminder = mode === "reminder";
  useEffect(() => {
    const element = dialog.current;
    if (mode && !element.open) element.showModal();
    if (!mode && element.open) element.close();
    if (mode) element.querySelector("button")?.focus();
  }, [mode]);
  return <dialog ref={dialog} aria-labelledby="lesson-help-title" className={styles.popup}
    onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <div className={styles.body} aria-live="polite">
      <img src={mascot.src} alt="" className={styles.mascot} />
      <div className={styles.copy}>
        <h2 id="lesson-help-title">{reminder ? "La ayuda sigue aquí" : "¿Necesitas ayuda?"}</h2>
        <p>{reminder ? "Si necesitas ayuda en el futuro, solo toca el botón" : message}</p>
        {reminder ? <span className={styles.helpIcon} role="img" aria-label="Botón de ayuda, signo de interrogación">?</span> : null}
      </div>
    </div>
    <div className={styles.actions}>
      <button type="button" onClick={onDismiss}>Entiendo</button>
      {!reminder ? <button type="button" className={styles.secondary} onClick={onSuppress}>No mostrar</button> : null}
    </div>
  </dialog>;
}
