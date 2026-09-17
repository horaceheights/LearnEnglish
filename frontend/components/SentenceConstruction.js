"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { availableSentenceWords, placeSentenceWord, returnSentenceWord, sentenceHint, sentenceParts, sentenceSlots } from "../../mobile/src/sentenceConstruction";
import { COMPLETION_RETRY_HELP, lessonHelpText } from "../../mobile/src/lessonHelp";
import styles from "./SentenceConstruction.module.css";

export default function SentenceConstruction({ card, selected, result, onChange, onReplay, onRetry, imageSrc, location, showHelp, surfaceRef }) {
  const slots = sentenceSlots(card, selected);
  const words = availableSentenceWords(card, slots);
  const parts = sentenceParts(card);
  const locked = result !== null;
  const root = useRef(null);
  const bank = useRef(null);
  const setRoot = useCallback(node => { root.current = node; if (surfaceRef) surfaceRef.current = node; }, [surfaceRef]);
  const slotRefs = useRef([]);
  const wordRefs = useRef(new Map());
  const drag = useRef(null);
  const history = useRef([]);
  const [moving, setMoving] = useState(null);
  const [hover, setHover] = useState(null);
  const [translated, setTranslated] = useState(false);
  const [wideSlots, setWideSlots] = useState(false);
  const cancel = useCallback(() => { drag.current = null; setMoving(null); setHover(null); }, []);
  useEffect(() => {
    window.addEventListener("resize", cancel);
    window.addEventListener("scroll", cancel, true);
    return () => { window.removeEventListener("resize", cancel); window.removeEventListener("scroll", cancel, true); };
  }, [cancel]);
  useEffect(cancel, [cancel, card.slide_id, result, showHelp, wideSlots]);
  useEffect(() => {
    const measure = () => {
      if (!root.current) return;
      // Keep measuring both bank and placed words after a tile changes ownership.
      // Parent page turns change visual bounds, not the space a word needs.
      const needed = Math.max(0, ...[...wordRefs.current.values(), ...slotRefs.current].filter(Boolean).map(word =>
        word.offsetWidth + parseFloat(getComputedStyle(word).fontSize)));
      setWideSlots(needed > root.current.offsetWidth - 64);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root.current);
    [...wordRefs.current.values(), ...slotRefs.current].filter(Boolean).forEach(word => observer.observe(word));
    measure();
    return () => observer.disconnect();
  }, [card, selected]);
  const focusSlot = index => requestAnimationFrame(() => slotRefs.current[index]?.focus({ preventScroll: true }));
  const commit = next => {
    if (locked || next.every((value, index) => value === slots[index])) return false;
    history.current.push([...slots]); onChange(next); return true;
  };
  const place = (id, index) => {
    const next = placeSentenceWord(card, slots, id, index);
    if (commit(next)) focusSlot(next.indexOf(id));
  };
  const remove = id => {
    if (commit(returnSentenceWord(card, slots, id))) requestAnimationFrame(() => wordRefs.current.get(id)?.focus({ preventScroll: true }));
  };
  const start = (event, id, label) => {
    if (locked || !id || event.button !== 0 || event.isPrimary === false) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { id, label, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, moved: false };
  };
  const contains = (element, x, y) => {
    if (!element) return false;
    const b = element.getBoundingClientRect();
    if (x < b.left || x > b.right || y < b.top || y > b.bottom) return false;
    // Reject positions clipped by a scroll pane, even if the child's full rect matches.
    for (let parent = element.parentElement; parent && parent !== root.current; parent = parent.parentElement) {
      if (/(auto|scroll|hidden)/.test(getComputedStyle(parent).overflowY)) {
        const clip = parent.getBoundingClientRect();
        if (x < clip.left || x > clip.right || y < clip.top || y > clip.bottom) return false;
      }
    }
    return true;
  };
  const targetAt = (x, y) => {
    if (!contains(root.current, x, y)) return null;
    const index = slotRefs.current.findIndex(element => contains(element, x, y));
    return index >= 0 ? index : contains(bank.current, x, y) ? "bank" : null;
  };
  const move = event => {
    const d = drag.current;
    if (!d || (Math.hypot(event.clientX - d.x, event.clientY - d.y) < 6 && !d.moved)) return;
    d.moved = true;
    const bounds = root.current.getBoundingClientRect();
    setHover(targetAt(event.clientX, event.clientY));
    setMoving({ id: d.id, label: d.label, width: d.width, height: d.height,
      x: Math.max(bounds.left, Math.min(event.clientX - d.width / 2, bounds.right - d.width)),
      y: Math.max(Math.max(bounds.top, 0), Math.min(event.clientY - d.height / 2, Math.min(bounds.bottom, window.innerHeight) - d.height)) });
  };
  const drop = event => {
    const d = drag.current;
    if (!d) return;
    if (d.moved) {
      const target = targetAt(event.clientX, event.clientY);
      if (target === "bank") remove(d.id);
      else if (typeof target === "number") place(d.id, target);
    } else if (slots.includes(d.id)) remove(d.id);
    else place(d.id);
    cancel();
  };
  const keyboard = (event, id, index) => {
    if (locked) return;
    if (event.key === "Escape") { cancel(); return; }
    if (index !== undefined && ["ArrowLeft", "ArrowRight", "Home", "End", "Delete", "Backspace"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Delete" || event.key === "Backspace") remove(id);
      else place(id, event.key === "Home" ? 0 : event.key === "End" ? slots.length - 1 : index + (event.key === "ArrowLeft" ? -1 : 1));
    }
  };
  const handlers = (id, label, index) => ({
    onPointerDown: event => start(event, id, label), onPointerMove: move,
    onPointerUp: drop, onPointerCancel: cancel,
    onKeyDown: event => keyboard(event, id, index),
    onClick: event => { if (event.detail === 0) { if (index === undefined) place(id); else remove(id); } },
  });
  return <section ref={setRoot} data-lesson-page className={styles.activity} aria-label="Construye la frase">
    <div className={`${styles.importance} ${wideSlots ? styles.wideSlots : ""}`}>
      <div className={styles.location}>{location} · COMPLETA</div>
      <button type="button" className={styles.translation} aria-label="Mostrar traducción" onClick={() => setTranslated(!translated)}>{translated ? card.spanish_translation : "Escucha y forma la frase."}</button>
      <div className={styles.slots} aria-label="Frase en construcción">
        {parts.map((part, index) => {
          if ("text" in part) return <span key={`text-${index}`} className={styles.scaffold}>{part.text}</span>;
          const id = slots[part.slot];
          const label = card.options.find(option => option.id === id)?.label || "";
          return <button key={`slot-${part.slot}`} type="button" ref={element => { slotRefs.current[part.slot] = element; }}
            className={`${styles.slot} ${result === "correct" ? styles.correct : ""} ${hover === part.slot ? styles.target : ""}`}
            aria-label={`Espacio ${part.slot + 1}: ${label || "vacío"}`}
            aria-describedby="word-correction-help" disabled={locked || !id}
            {...handlers(id, label, part.slot)}><span style={{ visibility: moving?.id === id ? "hidden" : "visible" }}>{label || "___"}{part.suffix}</span></button>;
        })}
      </div>
      <button className={styles.replay} type="button" aria-label="Repetir frase en inglés" onClick={onReplay}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" /></svg>
      </button>
    </div>
    <div className={styles.card}>
      <div className={styles.imageFrame}><img src={imageSrc} alt="Imagen de la frase" /></div>
      <p className={styles.instruction}>{result === "wrong" ? COMPLETION_RETRY_HELP : showHelp ? lessonHelpText(card, "translation-on-tap") : "Toca o arrastra. Devuelve aquí las palabras para corregir."}</p>
      <span id="word-correction-help" className={styles.srOnly}>{result === "wrong" ? COMPLETION_RETRY_HELP : locked ? "Frase completa." : "Toca para devolver. Con el teclado, usa las flechas para mover y Suprimir para devolver."}</span>
      <div ref={bank} className={`${styles.bank} ${hover === "bank" ? styles.target : ""}`} aria-label="Palabras disponibles">
        {words.map(option => <button key={option.id} type="button"
          ref={element => { if (element) wordRefs.current.set(option.id, element); else wordRefs.current.delete(option.id); }}
          className={`${styles.tile} ${styles[`tone${card.options.findIndex(word => word.id === option.id) % 3}`]}`} disabled={locked} aria-label={`Ficha ${option.label}`}
          {...handlers(option.id, option.label)}><span style={{ visibility: moving?.id === option.id ? "hidden" : "visible" }}>{option.label}</span></button>)}
        {!words.length ? <p className={styles.instruction}>{result === "correct" ? "Frase completa." : result === "wrong" ? "Lee la explicación de abajo." : "Devuelve aquí una palabra para corregir."}</p> : null}
      </div>
      {result !== "wrong" ? <div className={styles.controls}>
        <button type="button" disabled={locked || !history.current.length} aria-label="Deshacer último movimiento"
          onClick={() => { const previous = history.current.pop(); if (previous && !locked) onChange(previous); }}>Deshacer</button>
      </div> : null}
      <div className={styles.feedback} role="status">{result === "correct" ? "¡Muy bien!" : result === "wrong" ? <><div>¡Ánimo! Inténtalo de nuevo.</div><div>{sentenceHint(card, slots)}</div></> : ""}</div>
      {result === "wrong" ? <div className={styles.controls}><button className={styles.retry} type="button"
        onClick={() => { history.current = []; cancel(); onRetry(); }}>Reintentar</button></div> : null}
    </div>
    {moving ? <div aria-hidden="true" className={styles.drag} style={{ left: moving.x, top: moving.y, width: moving.width, minHeight: moving.height }}>{moving.label}</div> : null}
  </section>;
}
