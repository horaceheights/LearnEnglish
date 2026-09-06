"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampMissionDragPreview,
  missionCorrectionHint,
  missionCorrectOptionIds,
  missionTargetsForCard,
} from "../lib/missionExperience.mjs";

const DRAG_MIME = "application/x-spanglish-mission-tile";

function emptyBoard(length) {
  return Array.from({ length }, () => null);
}

function optionFor(card, optionId) {
  return card.options.find((option) => option.id === optionId);
}

function compactSequential(placements, length) {
  return [...placements.filter(Boolean), ...emptyBoard(length)].slice(0, length);
}

function payloadFromTransfer(dataTransfer) {
  try {
    return JSON.parse(dataTransfer.getData(DRAG_MIME));
  } catch {
    const optionId = dataTransfer.getData("text/plain");
    return optionId ? { optionId, source: "bank" } : null;
  }
}

function safelyReleasePointerCapture(target, pointerId) {
  try {
    if (target?.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
  } catch {
    // The browser may already have released capture after a resize or cancellation.
  }
}

export default function MissionTileBoard({
  canContinue,
  card,
  isMobile,
  lastResult,
  onCheck,
  onContinue,
  onEdit,
  onPlaySfx,
}) {
  const targets = useMemo(() => missionTargetsForCard(card), [card]);
  const correctIds = useMemo(() => missionCorrectOptionIds(card), [card]);
  const slotCount = targets.length || correctIds.length;
  const [placements, setPlacements] = useState(() => emptyBoard(slotCount));
  const [history, setHistory] = useState([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [pendingOptionId, setPendingOptionId] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [pointerPreview, setPointerPreview] = useState(null);
  const pointerDragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const isTargetBoard = targets.length > 0;
  const isGuidedUnlock = card.interaction_type === "mission-unlock"
    || card.mission_tutorial_mode === "guided-no-fail";
  const targetLayoutClass = isTargetBoard
    ? ` mission-board__slots--targets mission-board__slots--targets-${targets.length}`
    : "";
  const isCompleteBoard = slotCount > 0 && placements.every(Boolean);
  const placedIds = placements.filter(Boolean);
  const correctionHint = lastResult === "wrong" ? missionCorrectionHint(card, placements) : "";

  useEffect(() => {
    setPlacements(emptyBoard(slotCount));
    setHistory([]);
    setActiveSlotIndex(0);
    setPendingOptionId(null);
    setDragOverSlot(null);
    setPointerPreview(null);
    pointerDragRef.current = null;
  }, [card, slotCount]);

  useEffect(() => {
    const cancelActivePointerDrag = () => {
      const activeDrag = pointerDragRef.current;
      pointerDragRef.current = null;
      safelyReleasePointerCapture(activeDrag?.captureTarget, activeDrag?.pointerId);
      setDragOverSlot(null);
      setPointerPreview(null);
    };
    const visualViewport = typeof window === "undefined" ? null : window.visualViewport;

    window.addEventListener("blur", cancelActivePointerDrag);
    window.addEventListener("orientationchange", cancelActivePointerDrag);
    window.addEventListener("resize", cancelActivePointerDrag);
    visualViewport?.addEventListener("resize", cancelActivePointerDrag);
    return () => {
      window.removeEventListener("blur", cancelActivePointerDrag);
      window.removeEventListener("orientationchange", cancelActivePointerDrag);
      window.removeEventListener("resize", cancelActivePointerDrag);
      visualViewport?.removeEventListener("resize", cancelActivePointerDrag);
    };
  }, []);

  const rememberAndSet = (next, preferredActiveIndex = null) => {
    setHistory((current) => [...current.slice(-29), [...placements]]);
    setPlacements(next);
    setPendingOptionId(null);
    setDragOverSlot(null);
    if (lastResult === "wrong") onEdit?.();
    const nextEmpty = next.findIndex((value) => !value);
    setActiveSlotIndex(Number.isInteger(preferredActiveIndex)
      ? Math.min(Math.max(preferredActiveIndex, 0), Math.max(0, next.length - 1))
      : nextEmpty >= 0 ? nextEmpty : Math.max(0, next.length - 1));
  };

  const placeOption = (optionId, targetIndex = activeSlotIndex, sourceIndex = null) => {
    if (lastResult === "correct" || !optionId || targetIndex < 0 || targetIndex >= slotCount) return;
    const existingIndex = placements.indexOf(optionId);
    const fromIndex = Number.isInteger(sourceIndex) ? sourceIndex : existingIndex;

    if (isGuidedUnlock) {
      const nextRequiredIndex = placements.findIndex((value) => !value);
      if (fromIndex < 0 && (targetIndex !== nextRequiredIndex || optionId !== correctIds[nextRequiredIndex])) {
        setPendingOptionId(null);
        return;
      }
      if (fromIndex >= 0 && optionId !== correctIds[targetIndex]) return;
    }

    let next = [...placements];
    if (isTargetBoard) {
      if (fromIndex >= 0) next[fromIndex] = null;
      const displaced = next[targetIndex];
      next[targetIndex] = optionId;
      if (displaced && fromIndex >= 0 && fromIndex !== targetIndex) next[fromIndex] = displaced;
    } else {
      if (fromIndex >= 0) next.splice(fromIndex, 1);
      next = compactSequential(next, slotCount);
      const occupied = next.filter(Boolean);
      const insertionIndex = Math.min(targetIndex, occupied.length);
      occupied.splice(insertionIndex, 0, optionId);
      next = compactSequential(occupied, slotCount);
    }

    if (next.every((value, index) => value === placements[index])) return;
    rememberAndSet(next);
    onPlaySfx?.("tilePlace");
  };

  const removeOption = (slotIndex) => {
    if (lastResult === "correct" || !placements[slotIndex]) return;
    const next = [...placements];
    next[slotIndex] = null;
    rememberAndSet(isTargetBoard || isGuidedUnlock ? next : compactSequential(next, slotCount), slotIndex);
  };

  const handleBankTap = (optionId) => {
    if (lastResult === "correct" || placedIds.includes(optionId)) return;
    if (isTargetBoard) {
      setPendingOptionId((current) => current === optionId ? null : optionId);
      if (lastResult === "wrong") onEdit?.();
      return;
    }
    const firstEmpty = placements.findIndex((value) => !value);
    const insertionIndex = activeSlotIndex >= 0 && activeSlotIndex < slotCount
      ? activeSlotIndex
      : firstEmpty;
    placeOption(optionId, insertionIndex >= 0 ? insertionIndex : 0);
  };

  const handleSlotTap = (slotIndex) => {
    if (lastResult === "correct") return;
    if (pendingOptionId) {
      placeOption(pendingOptionId, slotIndex);
      return;
    }
    if (placements[slotIndex]) {
      removeOption(slotIndex);
      return;
    }
    setActiveSlotIndex(slotIndex);
    if (pendingOptionId) placeOption(pendingOptionId, slotIndex);
  };

  const applyDrop = (payload, target) => {
    if (!payload || lastResult === "correct") return;
    if (target === "bank") {
      if (payload.source === "board") removeOption(payload.slotIndex);
      return;
    }
    placeOption(payload.optionId, target, payload.source === "board" ? payload.slotIndex : null);
  };

  const beginPointerDrag = (event, payload) => {
    if (event.pointerType === "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerDragRef.current = {
      ...payload,
      captureTarget: event.currentTarget,
      grabOffsetX: event.clientX - rect.left,
      grabOffsetY: event.clientY - rect.top,
      height: rect.height,
      label: optionFor(card, payload.optionId)?.label || "",
      moved: false,
      pointerId: event.pointerId,
      width: rect.width,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const movePointerDrag = (event) => {
    const payload = pointerDragRef.current;
    if (!payload || payload.pointerId !== event.pointerId) return;
    const moved = payload.moved || Math.hypot(event.clientX - payload.x, event.clientY - payload.y) >= 8;
    if (!moved) return;
    payload.moved = true;
    event.preventDefault();

    const visualViewport = window.visualViewport;
    const previewPosition = clampMissionDragPreview({
      clientX: event.clientX,
      clientY: event.clientY,
      grabOffsetX: payload.grabOffsetX,
      grabOffsetY: payload.grabOffsetY,
      tileWidth: payload.width,
      tileHeight: payload.height,
      viewportLeft: visualViewport?.offsetLeft || 0,
      viewportTop: visualViewport?.offsetTop || 0,
      viewportWidth: visualViewport?.width || window.innerWidth,
      viewportHeight: visualViewport?.height || window.innerHeight,
    });
    setPointerPreview({ ...payload, ...previewPosition });

    const element = typeof document === "undefined" ? null : document.elementFromPoint(event.clientX, event.clientY);
    const slot = element?.closest?.("[data-mission-drop-index]");
    setDragOverSlot(slot ? Number(slot.dataset.missionDropIndex) : null);
  };

  const finishPointerDrag = (event, tapAction) => {
    const payload = pointerDragRef.current;
    pointerDragRef.current = null;
    if (!payload) return;
    safelyReleasePointerCapture(event.currentTarget, event.pointerId);
    const moved = payload.moved || Math.hypot(event.clientX - payload.x, event.clientY - payload.y) >= 8;
    const element = typeof document === "undefined" ? null : document.elementFromPoint(event.clientX, event.clientY);
    const slot = element?.closest?.("[data-mission-drop-index]");
    const bank = element?.closest?.("[data-mission-bank-drop]");
    if (slot) applyDrop(payload, Number(slot.dataset.missionDropIndex));
    else if (bank && payload.source === "board") applyDrop(payload, "bank");
    else if (!moved) tapAction();
    setPointerPreview(null);
    setDragOverSlot(null);
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };

  const cancelPointerDrag = (event) => {
    const payload = pointerDragRef.current;
    pointerDragRef.current = null;
    if (payload?.pointerId === event.pointerId) safelyReleasePointerCapture(event.currentTarget, event.pointerId);
    setPointerPreview(null);
    setDragOverSlot(null);
  };

  const instruction = card.instruction_es?.trim()
    || (isTargetBoard ? "Coloca cada ficha en el espacio que le corresponde." : "Ordena las fichas de izquierda a derecha.");

  return (
    <section className="mission-board" data-compact={isMobile || undefined} aria-labelledby="mission-board-instruction">
      {pointerPreview ? (
        <div
          aria-hidden="true"
          className="mission-board__drag-preview"
          style={{
            height: pointerPreview.height,
            left: pointerPreview.left,
            top: pointerPreview.top,
            width: pointerPreview.width,
          }}
        >
          {pointerPreview.label}
        </div>
      ) : null}
      <h2 className="mission-board__instruction" id="mission-board-instruction">{instruction}</h2>

      <div
        aria-label={`Construcción: ${placedIds.map((id) => optionFor(card, id)?.label).filter(Boolean).join(" ") || "vacía"}`}
        aria-live="polite"
        className={`mission-board__slots${targetLayoutClass}${lastResult ? ` mission-board__slots--${lastResult}` : ""}`}
      >
        {placements.map((optionId, index) => {
          const target = targets[index];
          const option = optionId ? optionFor(card, optionId) : null;
          const locallyWrong = lastResult === "wrong" && target && optionId !== target.correct_option_id;
          const locallyCorrect = lastResult && target && optionId === target.correct_option_id;
          return (
            <div className="mission-board__target-wrap" key={target?.id || `slot-${index}`}>
              {target ? <span className="mission-board__target-label">{target.label}</span> : null}
              <button
                aria-label={`${target?.label || `Espacio ${index + 1}`}: ${option?.label || "vacío"}`}
                className={`mission-board__slot${activeSlotIndex === index && !optionId ? " mission-board__slot--active" : ""}${locallyWrong ? " mission-board__slot--wrong" : ""}${locallyCorrect ? " mission-board__slot--correct" : ""}${pointerPreview?.source === "board" && pointerPreview.slotIndex === index ? " mission-board__slot--dragging" : ""}`}
                data-mission-drop-index={index}
                draggable={Boolean(optionId) && lastResult !== "correct"}
                onClick={() => {
                  if (suppressClickRef.current) return;
                  handleSlotTap(index);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverSlot(index);
                }}
                onDragLeave={() => setDragOverSlot((current) => current === index ? null : current)}
                onDragStart={optionId ? (event) => {
                  const payload = { optionId, slotIndex: index, source: "board" };
                  suppressClickRef.current = true;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
                  event.dataTransfer.setData("text/plain", optionId);
                } : undefined}
                onDragEnd={() => window.setTimeout(() => { suppressClickRef.current = false; }, 0)}
                onDrop={(event) => {
                  event.preventDefault();
                  applyDrop(payloadFromTransfer(event.dataTransfer), index);
                }}
                onPointerDown={optionId ? (event) => beginPointerDrag(event, { optionId, slotIndex: index, source: "board" }) : undefined}
                onPointerMove={optionId ? movePointerDrag : undefined}
                onPointerUp={optionId ? (event) => finishPointerDrag(event, () => handleSlotTap(index)) : undefined}
                onPointerCancel={cancelPointerDrag}
                style={dragOverSlot === index ? { outline: "4px solid rgba(244, 201, 93, 0.48)" } : undefined}
                type="button"
              >
                {option?.label || <span aria-hidden="true">{index + 1}</span>}
              </button>
            </div>
          );
        })}
      </div>

      {isGuidedUnlock && lastResult === "correct" ? (
        <div className="mission-board__unlock" aria-live="polite">
          <span aria-hidden="true">🔓</span>
          <strong>{placements.map((id) => optionFor(card, id)?.label).join("")}</strong>
        </div>
      ) : null}

      {lastResult === "correct" && card.success_outcome_es?.trim() ? (
        <div className="mission-board__outcome" aria-live="polite">✓ {card.success_outcome_es}</div>
      ) : null}

      <div
        className="mission-board__bank"
        data-mission-bank-drop
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          applyDrop(payloadFromTransfer(event.dataTransfer), "bank");
        }}
      >
        <span className="mission-board__bank-label">Fichas disponibles</span>
        <div className="mission-board__bank-grid">
          {card.options.map((option) => {
            const isPlaced = placedIds.includes(option.id);
            const isPending = pendingOptionId === option.id;
            return (
              <button
                aria-pressed={isPending}
                className={`mission-board__tile${isPending ? " mission-board__tile--pending" : ""}${pointerPreview?.source === "bank" && pointerPreview.optionId === option.id ? " mission-board__tile--dragging" : ""}`}
                disabled={lastResult === "correct" || isPlaced}
                draggable={lastResult !== "correct" && !isPlaced}
                key={option.id}
                onClick={() => {
                  if (suppressClickRef.current) return;
                  handleBankTap(option.id);
                }}
                onDragStart={(event) => {
                  const payload = { optionId: option.id, source: "bank" };
                  suppressClickRef.current = true;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
                  event.dataTransfer.setData("text/plain", option.id);
                }}
                onDragEnd={() => window.setTimeout(() => { suppressClickRef.current = false; }, 0)}
                onPointerDown={(event) => beginPointerDrag(event, { optionId: option.id, source: "bank" })}
                onPointerMove={movePointerDrag}
                onPointerUp={(event) => finishPointerDrag(event, () => handleBankTap(option.id))}
                onPointerCancel={cancelPointerDrag}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="mission-board__drag-back">Arrastra aquí una ficha para quitarla.</span>
      </div>

      <div className="mission-board__controls">
        <button
          disabled={lastResult === "correct" || history.length === 0}
          onClick={() => {
            const previous = history[history.length - 1];
            if (!previous) return;
            setPlacements(previous);
            setHistory((current) => current.slice(0, -1));
            setPendingOptionId(null);
            const nextEmpty = previous.findIndex((value) => !value);
            setActiveSlotIndex(nextEmpty >= 0 ? nextEmpty : Math.max(0, previous.length - 1));
            if (lastResult === "wrong") onEdit?.();
          }}
          type="button"
        >Deshacer</button>
        <button
          disabled={lastResult === "correct" || placedIds.length === 0}
          onClick={() => rememberAndSet(emptyBoard(slotCount))}
          type="button"
        >Reiniciar</button>
        {lastResult !== "correct" ? (
          <button
            className="mission-board__check"
            disabled={!isCompleteBoard}
            onClick={() => onCheck([...placements])}
            type="button"
          >Comprobar</button>
        ) : (
          <button className="mission-board__continue" disabled={!canContinue} onClick={onContinue} type="button">
            {canContinue
              ? card.interaction_type === "mission-finale" ? "Revelar escena final" : "Continuar"
              : "Escucha la respuesta…"}
          </button>
        )}
      </div>

      <div className="mission-board__hint" aria-live="polite">
        {lastResult === "wrong"
          ? correctionHint || "Casi. Las fichas siguen en su lugar: mueve solo lo que quieras cambiar."
          : isTargetBoard && pendingOptionId
            ? "Ahora toca el espacio donde quieres colocar esa ficha."
            : !isCompleteBoard
              ? "Completa todos los espacios para activar Comprobar."
            : "Puedes tocar o arrastrar. También puedes quitar y reordenar fichas."}
      </div>
    </section>
  );
}
