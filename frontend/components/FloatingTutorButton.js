"use client";
import { useEffect, useRef, useState } from 'react';
import { clampTutorPosition, initialTutorPosition, tutorDragMoved } from '../../mobile/src/tutorPresentation';
import { TutorActivity } from './TutorActivity';
import styles from './LessonTutor.module.css';

export function FloatingTutorButton({ anchorRef, onClick, visible }) {
  const [bounds, setBounds] = useState(null);
  const [point, setPoint] = useState(null);
  const drag = useRef(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!visible) { drag.current = null; return; }
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const left = viewport?.offsetLeft || 0;
      const next = { left: Math.max(left, rect.left) + 6, top: Math.max(top + 6, rect.top + 6),
        right: Math.min(left + (viewport?.width || innerWidth), rect.right) - 6,
        bottom: Math.min(top + (viewport?.height || innerHeight), rect.bottom) - 6 };
      // Keep the complete target in the visible viewport, even with a keyboard.
      next.top = Math.min(next.top, next.bottom - 48);
      if (drag.current) moved.current = true;
      drag.current = null;
      setBounds(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    if (anchorRef.current) observer.observe(anchorRef.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [anchorRef, visible]);
  if (!bounds) return null;
  const position = clampTutorPosition(point || initialTutorPosition(bounds), bounds);
  return <button type="button" className={styles.floatingTutor} style={{ left: position.x, top: position.y, display: visible ? undefined : 'none' }} aria-label="Abrir tutor IA"
    title="Tutor IA · Arrastra para mover. Con el teclado, usa las flechas; Inicio restablece la posición."
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.stopPropagation(); moved.current = false;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, point: position };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (!moved.current && !tutorDragMoved(dx, dy)) return;
      moved.current = true; event.preventDefault(); event.stopPropagation();
      setPoint(clampTutorPosition({ x: start.point.x + dx, y: start.point.y + dy }, bounds));
    }}
    onPointerUp={event => {
      event.stopPropagation(); drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { moved.current = true; drag.current = null; }}
    onClick={event => { event.stopPropagation(); if (!moved.current || event.detail === 0) onClick(); }}
    onKeyDown={event => {
      const keys = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
      if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); setPoint(null); }
      if (keys[event.key]) { event.preventDefault(); event.stopPropagation(); const [x, y] = keys[event.key];
        setPoint(clampTutorPosition({ x: position.x + x, y: position.y + y }, bounds)); }
    }}><TutorActivity active={visible} /></button>;
}
