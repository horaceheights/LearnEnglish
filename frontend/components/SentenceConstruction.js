"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { placeSentenceWord, sentenceHint, sentenceSlots } from "../../mobile/src/sentenceConstruction";
import styles from "./SentenceConstruction.module.css";

export default function SentenceConstruction({ card, selected, result, onChange, onReplay, imageSrc, location, showHelp, surfaceRef }) {
  const slots = sentenceSlots(card, selected);
  const punctuation = card.prompt.split("___").slice(1);
  const locked = result === "correct";
  const root = useRef(null);
  const setRoot = useCallback(node => { root.current = node; if (surfaceRef) surfaceRef.current = node; }, [surfaceRef]);
  const slotRefs = useRef([]);
  const wordRefs = useRef([]);
  const drag = useRef(null);
  const history = useRef([]);
  const [moving, setMoving] = useState(null);
  const [translated, setTranslated] = useState(false);
  const [wideSlots, setWideSlots] = useState(false);
  const cancel = () => { drag.current = null; setMoving(null); };
  useEffect(() => {
    window.addEventListener("resize", cancel);
    return () => window.removeEventListener("resize", cancel);
  }, []);
  useEffect(cancel, [card.slide_id, result]);
  useEffect(() => {
    const measure = () => {
      const needed = Math.max(0, ...wordRefs.current.filter(Boolean).map((word) =>
        word.offsetWidth + parseFloat(getComputedStyle(word).fontSize)));
      // Parent page turns change visual bounds, not the space a word needs.
      setWideSlots(needed > root.current.offsetWidth - 64);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root.current);
    wordRefs.current.filter(Boolean).forEach((word) => observer.observe(word));
    measure();
    return () => observer.disconnect();
  }, [card]);
  useEffect(cancel, [wideSlots]);
  const place = (id, index) => {
    if (locked) return;
    const next = placeSentenceWord(card, slots, id, index);
    if (!next.some((value, i) => value !== slots[i])) return;
    history.current.push(id);
    onChange(next);
  };
  const remove = (index) => {
    history.current = history.current.filter((id) => id !== slots[index]);
    if (!locked) onChange(slots.map((id, i) => i === index ? "" : id));
  };
  const start = (event, option) => {
    if (locked || slots.includes(option.id) || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: option.id, label: option.label, x: event.clientX, y: event.clientY, moved: false };
  };
  const move = (event) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(event.clientX - d.x, event.clientY - d.y) < 6 && !d.moved) return;
    d.moved = true;
    const bounds = root.current.getBoundingClientRect();
    setMoving({ label: d.label,
      x: Math.max(bounds.left + 40, Math.min(event.clientX, bounds.right - 40)),
      y: Math.max(bounds.top + 24, Math.min(event.clientY, bounds.bottom - 24)) });
  };
  const drop = (event) => {
    const d = drag.current;
    if (!d) return;
    if (d.moved) {
      const index = slotRefs.current.findIndex((element) => {
        const b = element.getBoundingClientRect();
        return event.clientX >= b.left && event.clientX <= b.right && event.clientY >= b.top && event.clientY <= b.bottom;
      });
      if (index >= 0) place(d.id, index);
    } else place(d.id);
    cancel();
  };
  return <section ref={setRoot} data-lesson-page className={styles.activity} aria-label="Construye la frase completa">
    <div className={`${styles.importance} ${wideSlots ? styles.wideSlots : ""}`}>
      <div className={styles.location}>{location} · COMPLETA</div>
      <button type="button" className={styles.translation} aria-label="Mostrar traducción" onClick={() => setTranslated(!translated)}>{translated ? card.spanish_translation : "Escucha y forma la frase."}</button>
      <div className={styles.slots} aria-label="Frase en construcción">
        {slots.map((id, index) => <button key={index} type="button"
          ref={(element) => { slotRefs.current[index] = element; }}
          className={`${styles.slot} ${locked ? styles.correct : ""}`}
          aria-label={`Espacio ${index + 1}: ${card.options.find((option) => option.id === id)?.label || "vacío"}`}
          aria-disabled={locked || !id} onClick={() => id && remove(index)}>
          {card.options.find((option) => option.id === id)?.label || "___"}{punctuation[index]?.trim()}
        </button>)}
      </div>
      <button className={styles.replay} type="button" aria-label="Repetir frase en inglés" onClick={onReplay}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />
        </svg>
      </button>
    </div>
    <div className={styles.card}>
      <div className={styles.imageFrame}><img src={imageSrc} alt="Persona de la frase" /></div>
      <p className={styles.instruction}>{showHelp ? "Escucha con el altavoz. Toca las fichas en orden; toca una palabra colocada para devolverla. Toca la instrucción para traducir." : "Toca o arrastra cada palabra arriba."}</p>
      <div className={styles.bank} aria-label="Palabras disponibles">
        {card.options.map((option, index) => <button key={option.id} type="button"
          ref={(element) => { wordRefs.current[index] = element; }}
          className={styles.tile} disabled={locked || slots.includes(option.id)}
          aria-label={`Ficha ${option.label}`}
          onPointerDown={(event) => start(event, option)} onPointerMove={move}
          onPointerUp={drop} onPointerCancel={cancel}
          onClick={(event) => { if (event.detail === 0) place(option.id); }}>
          {option.label}
        </button>)}
      </div>
      <div className={styles.controls}>
        <button type="button" disabled={locked || !slots.some(Boolean)}
          onClick={() => remove(slots.indexOf(history.current.filter((id) => slots.includes(id)).at(-1)))}>Deshacer</button>
        <button type="button" disabled={locked || !slots.some(Boolean)}
          onClick={() => onChange(slots.map(() => ""))}>Reiniciar</button>
      </div>
      <div className={styles.feedback} role="status">
        {locked ? "¡Muy bien!" : result === "wrong" ? sentenceHint(card, slots) : ""}
      </div>
    </div>
    {moving ? <div aria-hidden="true" className={styles.drag}
      style={{ left: moving.x, top: moving.y }}>{moving.label}</div> : null}
  </section>;
}
