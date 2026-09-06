"use client";

import { useEffect, useRef, useState } from "react";

const TUTORIAL_MIME = "application/x-spanglish-studio-demo";

export default function MissionKickoff({
  isMobile,
  lesson,
  onBegin,
  onExit,
  onReplayBriefing,
  onTutorialComplete,
}) {
  const [demoPlaced, setDemoPlaced] = useState(false);
  const kickoffHeadingRef = useRef(null);
  const pointerStartRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      kickoffHeadingRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  const finishDemo = () => {
    if (demoPlaced) return;
    setDemoPlaced(true);
    onTutorialComplete?.();
  };

  const handlePointerDown = (event) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const target = typeof document === "undefined" ? null : document.elementFromPoint(event.clientX, event.clientY);
    if (target?.closest?.("[data-mission-demo-target]") || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) {
      finishDemo();
    }
  };

  const objectives = (lesson.mission?.chapters || []).map((chapter) => chapter.objective);

  return (
    <div className="mission-kickoff-page" lang="es">
      <main className="mission-kickoff" data-compact={isMobile || undefined} role="region" aria-labelledby="mission-kickoff-title">
        <header className="mission-kickoff__topbar">
          <button className="mission-kickoff__exit" type="button" onClick={onExit} aria-label="Salir del reto">
            ←
          </button>
          <div className="mission-kickoff__slate" aria-hidden="true">
            <span>ESCENA 1</span><span>TOMA 1</span>
          </div>
          <div className="mission-kickoff__camera" aria-hidden="true">● REC</div>
        </header>

        <section className="mission-kickoff__briefing">
          <div className="mission-kickoff__eyebrow">{lesson.mission?.label || "RETO FINAL"}</div>
          <h1 id="mission-kickoff-title" ref={kickoffHeadingRef} tabIndex={-1}>
            {lesson.mission?.title || "Personas en acción"}
          </h1>
          <p className="mission-kickoff__lead">{lesson.mission?.briefing}</p>
          {onReplayBriefing ? (
            <button className="mission-kickoff__listen" type="button" onClick={onReplayBriefing}>
              <span aria-hidden="true">🔊</span> Escuchar instrucciones
            </button>
          ) : null}
        </section>

        <section className="mission-kickoff__objectives" aria-labelledby="mission-objectives-title">
          <div className="mission-kickoff__section-title" id="mission-objectives-title">Tu trabajo en el set</div>
          <ol>
            {objectives.map((objective, index) => (
              <li key={`${index}-${objective}`}>
                <span aria-hidden="true">{index + 1}</span>
                <p>{objective}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mission-kickoff__tutorial" aria-labelledby="mission-demo-title">
          <div>
            <div className="mission-kickoff__section-title" id="mission-demo-title">Prueba rápida</div>
            <p>Toca la ficha o arrástrala hasta el espacio. Esta práctica no cuenta puntos.</p>
          </div>
          <div className="mission-kickoff__demo">
            <button
              aria-label="Ficha de práctica: ACCIÓN"
              className={`mission-kickoff__demo-tile${demoPlaced ? " mission-kickoff__demo-tile--placed" : ""}`}
              disabled={demoPlaced}
              draggable={!demoPlaced}
              onClick={finishDemo}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(TUTORIAL_MIME, "action");
                event.dataTransfer.setData("text/plain", "action");
              }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              type="button"
            >
              {demoPlaced ? "Ficha movida" : "ACCIÓN"}
            </button>
            <div aria-hidden="true" className="mission-kickoff__demo-arrow">→</div>
            <button
              aria-label={demoPlaced ? "Ficha colocada correctamente" : "Espacio de práctica. Toca para colocar la ficha."}
              className={`mission-kickoff__demo-target${demoPlaced ? " mission-kickoff__demo-target--complete" : ""}`}
              data-mission-demo-target
              disabled={demoPlaced}
              onClick={finishDemo}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.getData(TUTORIAL_MIME) || event.dataTransfer.getData("text/plain")) finishDemo();
              }}
              type="button"
            >
              {demoPlaced ? "✓ ACCIÓN" : "Suelta aquí"}
            </button>
          </div>
          <div className="mission-kickoff__demo-status" aria-live="polite">
            {demoPlaced ? "Ya sabes cómo mover las fichas. El reto está listo." : "Haz la prueba para activar el reto."}
          </div>
        </section>

        <button
          className="mission-kickoff__begin"
          disabled={!demoPlaced}
          onClick={onBegin}
          type="button"
        >
          {demoPlaced ? "Comenzar reto" : "Primero haz la prueba"}
        </button>
      </main>
    </div>
  );
}
