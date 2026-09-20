"use client";

import { useEffect, useRef } from "react";
import { remainingReviewCards, resultSummary } from "../../mobile/src/lessonResult";
import useStaticSfx from "../lib/useStaticSfx";
import styles from "./LessonResultScreen.module.css";

const HAPPY = "/mascots/squirrel-professor-celebrating-v1.png";
const FRIENDLY = "/mascots/squirrel-professor-goodbye-v1.png";

function Mascot({ happy, animate }) {
  return <div className={styles.mascotScene} aria-hidden="true">
    <div className={styles.halo} />
    {/* Approved transparent mascot sprite; keep the complete silhouette. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={animate ? styles.movingMascot : styles.mascot} src={happy ? HAPPY : FRIENDLY} alt="" />
  </div>;
}

export function LessonGoodbye({ onDone }) {
  // Browsers cannot close a tab opened by the learner. Keep an accessible,
  // explicit action instead of rushing a screen reader with a forced timeout.
  return <main className={styles.page}><div className={styles.goodbye}>
    <Mascot animate />
    <h1>¡Nos vemos pronto!</h1>
    <p className={styles.message} role="status">Te espero pronto para seguir practicando.</p>
    <p className={styles.caption}>Tu progreso está guardado.</p>
    <button className={styles.primary} onClick={onDone}>Salir</button>
  </div></main>;
}

export default function LessonResultScreen({ result, lessonLabel, hasNext, onNext, onLessons, onRestart,
  onReview, onExit, celebrate, saving, error, onRetrySave }) {
  const summary = resultSummary(result);
  const { play, stop } = useStaticSfx();
  const played = useRef(false);
  const title = summary.pending ? "Sigamos aprendiendo" : summary.passed ? hasNext ? "¡Lo lograste!" : "¡Curso completado!" : "¡Tú puedes!";
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    if (!summary.passed || !celebrate || played.current) return;
    // Defer the cue until after React's StrictMode effect rehearsal.
    const timer = window.setTimeout(() => {
      if (document.hidden) return;
      played.current = true;
      void play("lessonPassed", { volume: .58, timeoutMs: 6000 });
    }, 0);
    return () => { window.clearTimeout(timer); stop(); };
  }, [celebrate, play, stop, summary.passed]);
  const disabled = saving || Boolean(error);
  return <main className={styles.page}>
    <header className={styles.brandRow}>
      <button disabled={disabled} className={styles.brand} aria-label="SpanGlish. Volver a las lecciones" onClick={onLessons}>SpanGlish</button>
      <span>{lessonLabel}</span>
    </header>
    <div className={styles.body}>
      <div className={styles.hero}>
        <Mascot happy={summary.passed} animate={celebrate} />
        {summary.passed && celebrate ? <div className={styles.confetti} aria-hidden="true">
          {Array.from({length: 12}, (_, index) => <i key={index} style={{left:`${8+(index*19)%84}%`,background:["#e3b640","#bd4226","#369967"][index%3],animationDelay:`${index%4*70}ms`,rotate:`${index*37}deg`}} />)}
        </div> : null}
        <p className={styles.eyebrow}>{summary.pending ? "RESULTADO PENDIENTE" : summary.passed ? "LECCIÓN APROBADA" : "SIGAMOS PRACTICANDO"}</p>
        <h1 ref={heading} tabIndex={-1}>{title}</h1>
      </div>
      <div className={styles.controls}>
        {!summary.pending ? <div className={`${styles.score} ${summary.passed ? styles.passed : ""}`}>{summary.percentage}%</div> : null}
        <p className={styles.caption}>{summary.pending ? "Falta evaluar algunas actividades." : summary.afterReview ? "Resultado después del repaso" : "Aciertos al primer intento"}</p>
        <p className={styles.message}>{summary.pending ? "Puedes completarlas cuando tengas conexión." : summary.passed ? "Cada día hablas mejor." : "Un repaso te ayudará a mejorar."}</p>
        {!summary.passed ? <h2>¿Qué quieres hacer?</h2> : null}
        <div className={styles.actions}>
          {summary.passed ? <>
            {hasNext ? <button disabled={disabled} className={styles.primary} onClick={onNext}>Continuar</button> : null}
            <button disabled={disabled} className={hasNext ? styles.secondary : styles.primary} onClick={onLessons}>Volver a las lecciones</button>
            {summary.afterReview && remainingReviewCards(result).length ? <button disabled={disabled} className={styles.secondary} onClick={onReview}>Seguir repasando hasta el 100%</button> : null}
          </> : <>
            <button disabled={disabled} className={styles.secondary} onClick={onRestart}>Reintentar toda la lección</button>
            {remainingReviewCards(result).length ? <button disabled={disabled} className={styles.primary} onClick={onReview}>
              {summary.pending ? "Completar actividades pendientes" : "Repasar solo los errores"}
              {!summary.pending ? <small>RECOMENDADO</small> : null}
            </button> : null}
          </>}
          <button disabled={disabled} className={styles.exit} onClick={onExit}>Salir</button>
        </div>
        {saving ? <p role="status">Guardando progreso…</p> : null}
        {result.reviewAvailable === false && !summary.passed ? <p>Este intento anterior no tiene el detalle de errores. Reintenta la lección para activar el repaso.</p> : null}
        {error ? <><p role="alert" className={styles.error}>{error}</p><button disabled={saving} className={styles.secondary} onClick={onRetrySave}>Guardar de nuevo</button></> : null}
      </div>
    </div>
  </main>;
}
