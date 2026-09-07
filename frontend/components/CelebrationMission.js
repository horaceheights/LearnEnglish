"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { missionChapterProgress } from "../lib/missionExperience.mjs";
import {
  expectedMissionPlacements,
  isChoiceMissionKind,
  isDirectSceneMissionKind,
  isSpeechMissionKind,
  validateMissionPlacements,
} from "./celebrationMissionLogic.mjs";

const ACT_ICONS = ["◉", "∿", "➤", "✕", "✦"];
const ACT_COLORS = ["#ed7a4f", "#e3ae32", "#268b78", "#7566ad", "#d65c65"];

function buttonStyle(disabled = false) {
  return {
    alignItems: "center",
    background: disabled ? "#e7e2d7" : "#fffdf7",
    border: "2px solid rgba(38, 70, 67, 0.24)",
    borderRadius: 14,
    color: disabled ? "#8f8a81" : "#234541",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    font: "inherit",
    fontWeight: 900,
    justifyContent: "center",
    minHeight: 48,
    padding: "10px 15px",
  };
}

function MissionIntro({ introReady, isMobile, lesson, onBegin, onExit, onReplayIntro, resolveImage }) {
  const objectives = lesson.mission.objectives || [];
  return (
    <main
      aria-label={`${lesson.mission.label}: ${lesson.mission.title}`}
      style={{
        background: "linear-gradient(150deg, #fff8e8 0%, #ffe0b3 46%, #d6eee4 100%)",
        border: "1px solid rgba(176, 126, 50, 0.32)",
        borderRadius: isMobile ? 20 : 32,
        boxShadow: "0 22px 60px rgba(77, 55, 24, 0.17)",
        display: "grid",
        gap: isMobile ? 12 : 20,
        margin: "0 auto",
        maxWidth: 1040,
        overflow: "hidden",
        padding: isMobile ? 12 : 24,
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
        <button aria-label="Salir de la misión" onClick={onExit} style={buttonStyle()} type="button">
          ← Salir
        </button>
        <div style={{ color: "#7b4c20", fontSize: 12, fontWeight: 950, letterSpacing: "0.12em", textAlign: "right" }}>
          {lesson.mission.label}
        </div>
      </div>

      <div style={{ display: "grid", gap: 7, textAlign: "center" }}>
        <h1 style={{ color: "#243d3a", fontSize: isMobile ? "2rem" : "clamp(2.5rem, 6vw, 4.4rem)", lineHeight: 0.98, margin: 0 }}>
          {lesson.mission.title}
        </h1>
        <p style={{ color: "#4d5f5b", fontSize: isMobile ? 14 : 17, lineHeight: 1.5, margin: "0 auto", maxWidth: 760 }}>
          {lesson.mission.briefing}
        </p>
      </div>

      <div
        style={{
          aspectRatio: "3 / 2",
          border: "5px solid rgba(255,255,255,0.9)",
          borderRadius: isMobile ? 18 : 26,
          boxShadow: "0 16px 35px rgba(45, 58, 49, 0.18)",
          justifySelf: "center",
          maxWidth: 820,
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <Image
          alt="La familia se prepara para comenzar la celebración"
          fill
          priority
          sizes="(max-width: 760px) 96vw, 820px"
          src={resolveImage(lesson.mission.kickoff_image_url)}
          style={{ objectFit: "cover" }}
          unoptimized
        />
      </div>

      <ul
        aria-label="Objetivos de la misión"
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.max(1, objectives.length)}, minmax(0, 1fr))`,
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {objectives.map((objective, index) => (
          <li
            key={objective}
            style={{
              alignItems: "center",
              background: "rgba(255,255,255,0.7)",
              border: `2px solid ${ACT_COLORS[index % ACT_COLORS.length]}55`,
              borderRadius: 16,
              color: "#294945",
              display: "flex",
              fontSize: isMobile ? 14 : 16,
              fontWeight: 900,
              gap: 8,
              justifyContent: "center",
              minHeight: 48,
              padding: "9px 12px",
              textAlign: "center",
            }}
          >
            <span aria-hidden="true" style={{ color: ACT_COLORS[index % ACT_COLORS.length], fontSize: 20 }}>
              {ACT_ICONS[index % ACT_ICONS.length]}
            </span>
            {objective}
          </li>
        ))}
      </ul>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: isMobile ? "1fr" : "auto minmax(240px, 1fr)", justifySelf: "center", maxWidth: 650, width: "100%" }}>
        <button onClick={onReplayIntro} style={buttonStyle(false)} type="button">
          🔊 Escuchar otra vez
        </button>
        <button disabled={!introReady} onClick={onBegin} style={{ ...buttonStyle(!introReady), background: introReady ? "linear-gradient(135deg, #ed7a4f, #f2a447)" : "#e7e2d7", color: introReady ? "#fff" : "#8f8a81" }} type="button">
          {introReady ? "Comenzar misión" : "Escucha la misión…"}
        </button>
      </div>
    </main>
  );
}

function SpeechConsole({ card, game, isMobile, onPrepareSpeech, onRetrySpeech, speech }) {
  const ready = speech.ready;
  const busy = speech.recording || speech.scoring;
  const accepted = Boolean(speech.outcome?.accepted);
  const finaleNeedsMeetingTap = game.kind === "finale";

  return (
    <div
      aria-live="polite"
      style={{
        background: accepted ? "#e5f7ed" : "#fff7df",
        border: `2px solid ${accepted ? "#3b9367" : "#e0b95b"}`,
        borderRadius: 18,
        display: "grid",
        gap: 8,
        margin: "10px auto 0",
        maxWidth: 760,
        padding: isMobile ? 11 : 15,
        textAlign: "center",
      }}
    >
      <div style={{ color: "#7b591c", fontSize: 12, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {accepted ? "Voz confirmada" : busy ? "Tu turno de hablar" : "Reto de voz"}
      </div>
      <strong style={{ color: "#214c45", fontSize: isMobile ? 20 : 25, lineHeight: 1.2 }}>
        {card.prompt}
      </strong>
      <div style={{ color: accepted ? "#27744f" : "#5c635e", fontWeight: 800 }}>
        {speech.error || speech.status || (ready ? "Escucha el modelo y responde." : "Activa este reto cuando estés listo.")}
      </div>
      {!ready && !finaleNeedsMeetingTap ? (
        <button disabled={busy} onClick={onPrepareSpeech} style={{ ...buttonStyle(busy), justifySelf: "center" }} type="button">
          🎤 Escuchar y hablar
        </button>
      ) : null}
      {speech.error && !busy ? (
        <button onClick={onRetrySpeech} style={{ ...buttonStyle(false), justifySelf: "center" }} type="button">
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export default function CelebrationMission({
  card,
  cardIndex,
  imageSrc,
  interactionReady,
  introComplete,
  introReady,
  isMobile,
  lastResult,
  lesson,
  onBegin,
  onComplete,
  onExit,
  onMisstep,
  onPrepareSpeech,
  onReplayDirections,
  onReplayEnglish,
  onReplayIntro,
  onRetrySpeech,
  onScenePlacement,
  resolveImage,
  speech,
}) {
  const game = card.mission_game;
  const [placements, setPlacements] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [message, setMessage] = useState("");
  const [finaleActivated, setFinaleActivated] = useState(false);
  const expected = useMemo(() => expectedMissionPlacements(game), [game]);
  const chapters = missionChapterProgress(lesson, cardIndex);
  const activeChapter = chapters.find((chapter) => chapter.isActive) || chapters[0];
  const directScene = isDirectSceneMissionKind(game.kind);
  const choiceGame = isChoiceMissionKind(game.kind);
  const speechGame = isSpeechMissionKind(game.kind);
  const placedOptionIds = new Set(placements.map((placement) => placement.optionId));
  const optionsById = new Map((card.options || []).map((option) => [option.id, option]));
  const completedTargetIds = new Set(placements.map((placement) => placement.targetId));

  useEffect(() => {
    setPlacements([]);
    setSelectedOptionId(null);
    setMessage("");
    setFinaleActivated(false);
  }, [card.slide_id]);

  if (!introComplete) {
    return (
      <MissionIntro
        introReady={introReady}
        isMobile={isMobile}
        lesson={lesson}
        onBegin={onBegin}
        onExit={onExit}
        onReplayIntro={onReplayIntro}
        resolveImage={resolveImage}
      />
    );
  }

  const targetPlacements = (targetId) => placements.filter((placement) => placement.targetId === targetId);

  const placeOption = (optionId, targetId) => {
    if (!interactionReady || lastResult === "correct") return;
    const target = game.targets.find((candidate) => candidate.id === targetId);
    if (!target || !optionsById.has(optionId)) return;

    setPlacements((current) => {
      const withoutOption = current.filter((placement) => placement.optionId !== optionId);
      const existingAtTarget = withoutOption.filter((placement) => placement.targetId === targetId);
      const capacity = Math.max(1, target.accepted_option_ids.length);
      const roomAtTarget = existingAtTarget.length >= capacity
        ? withoutOption.filter((placement) => placement !== existingAtTarget.at(-1))
        : withoutOption;
      return [...roomAtTarget, { optionId, targetId }];
    });
    setSelectedOptionId(null);
    setMessage("");
    onScenePlacement?.();
  };

  const completeDirectScene = (nextPlacements) => {
    if (nextPlacements.length !== expected.length) return;
    const result = validateMissionPlacements(game, nextPlacements);
    if (result.complete) onComplete(result.expectedOptionIds);
  };

  const activateSceneTarget = (target) => {
    if (!interactionReady || lastResult === "correct") return;

    if (game.kind === "speak") {
      if (!speech.ready) {
        setMessage("Persona confirmada. Escucha el modelo y responde en voz alta.");
        onScenePlacement?.();
        onPrepareSpeech();
      }
      return;
    }

    if (game.kind === "finale") {
      if (!finaleActivated) {
        setFinaleActivated(true);
        setMessage("Punto de reunión listo. Ahora escucha y di la frase final.");
        onScenePlacement?.();
        onPrepareSpeech();
      }
      return;
    }

    if (!directScene) {
      if (selectedOptionId) placeOption(selectedOptionId, target.id);
      else setMessage("Primero toca una señal. Después toca su destino.");
      return;
    }

    const nextExpected = expected[placements.length];
    if (game.validation === "ordered" && nextExpected?.targetId !== target.id) {
      setMessage("Ese no es el siguiente paso. Conservamos tus aciertos; sigue la señal de orden.");
      onMisstep([target.id]);
      return;
    }
    if (completedTargetIds.has(target.id)) return;

    const optionId = target.accepted_option_ids[0];
    const next = [...placements, { optionId, targetId: target.id }];
    setPlacements(next);
    setMessage(next.length < expected.length ? `Bien. Continúa con el paso ${next.length + 1}.` : "");
    onScenePlacement?.();
    if (game.tutorial_mode === "guided-no-fail" || next.length === expected.length) {
      completeDirectScene(next);
    }
  };

  const chooseDirectAnswer = (optionId) => {
    if (!interactionReady || lastResult === "correct") return;
    const target = game.targets[0];
    if (!target) return;
    setPlacements([{ optionId, targetId: target.id }]);
    setSelectedOptionId(optionId);
    setMessage("Toca Comprobar para confirmar tu respuesta.");
  };

  const removePlacement = (optionId) => {
    if (lastResult === "correct") return;
    setPlacements((current) => current.filter((placement) => placement.optionId !== optionId));
    setSelectedOptionId(null);
    setMessage("Señal retirada. Puedes colocar otra.");
  };

  const undo = () => {
    if (!placements.length || lastResult === "correct") return;
    setPlacements((current) => current.slice(0, -1));
    setSelectedOptionId(null);
    setMessage("Deshicimos solamente el último movimiento.");
  };

  const reset = () => {
    if (!placements.length || lastResult === "correct") return;
    setPlacements([]);
    setSelectedOptionId(null);
    setMessage("El reto está limpio. La misión anterior sigue guardada.");
  };

  const check = () => {
    const result = validateMissionPlacements(game, placements);
    if (result.complete) {
      setMessage("");
      onComplete(result.expectedOptionIds);
      return;
    }
    if (result.incorrectCount > 0) {
      setPlacements(result.retainedPlacements);
      setSelectedOptionId(null);
      setMessage("Retiramos solo lo que no correspondía. Tus aciertos siguen en su lugar.");
      onMisstep(placements.map((placement) => placement.optionId));
      return;
    }
    setMessage(`Todavía ${result.missingCount === 1 ? "falta una respuesta" : `faltan ${result.missingCount} respuestas`}.`);
  };

  const missionProgress = Math.round((cardIndex / lesson.cards.length) * 100);
  const chapterIndex = Math.max(0, chapters.findIndex((chapter) => chapter.isActive));

  return (
    <main
      aria-label={`${lesson.mission.label}: ${lesson.mission.title}. Reto ${cardIndex + 1} de ${lesson.cards.length}.`}
      style={{
        background: "linear-gradient(180deg, #fffaf0 0%, #f5eee1 100%)",
        border: "1px solid rgba(68, 87, 75, 0.24)",
        borderRadius: isMobile ? 18 : 28,
        boxShadow: "0 18px 50px rgba(41, 59, 49, 0.14)",
        display: "grid",
        gap: isMobile ? 8 : 13,
        margin: "0 auto",
        maxWidth: 1120,
        minWidth: 0,
        overflow: "hidden",
        padding: isMobile ? 8 : 16,
        width: "100%",
      }}
    >
      <header style={{ background: "linear-gradient(135deg, #214f48, #347f6d)", borderRadius: isMobile ? 14 : 20, color: "#fff", display: "grid", gap: 8, padding: isMobile ? 9 : 13 }}>
        <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button aria-label="Salir de la misión" onClick={onExit} style={{ ...buttonStyle(false), background: "rgba(255,255,255,0.96)", minHeight: 44, padding: "7px 11px" }} type="button">
            ← Salir
          </button>
          <div style={{ minWidth: 0, textAlign: "center" }}>
            <div style={{ color: "#ffe19a", fontSize: 10, fontWeight: 950, letterSpacing: "0.11em", textTransform: "uppercase" }}>{lesson.mission.label}</div>
            <div style={{ fontSize: isMobile ? 17 : 23, fontWeight: 950, lineHeight: 1.05 }}>{lesson.mission.title}</div>
          </div>
          <div style={{ color: "#fff2cb", fontSize: isMobile ? 11 : 13, fontWeight: 950, minWidth: 58, textAlign: "right" }}>
            {cardIndex + 1}/{lesson.cards.length}
          </div>
        </div>

        <ol aria-label="Actos de la misión" style={{ display: "grid", gap: 5, gridTemplateColumns: `repeat(${chapters.length}, minmax(0, 1fr))`, listStyle: "none", margin: 0, padding: 0 }}>
          {chapters.map((chapter, index) => {
            const active = chapter.isActive;
            const complete = chapter.isComplete;
            return (
              <li key={chapter.id} style={{ alignItems: "center", display: "grid", gap: 3, justifyItems: "center", minWidth: 0 }}>
                <span aria-hidden="true" style={{ alignItems: "center", background: complete || active ? ACT_COLORS[index % ACT_COLORS.length] : "rgba(255,255,255,0.17)", border: active ? "2px solid #fff" : "2px solid transparent", borderRadius: 999, display: "flex", fontSize: 13, height: 27, justifyContent: "center", width: 27 }}>
                  {complete ? "✓" : ACT_ICONS[index % ACT_ICONS.length]}
                </span>
                <span style={{ fontSize: isMobile ? 8 : 10, fontWeight: 850, lineHeight: 1.05, opacity: complete || active ? 1 : 0.56, overflow: "hidden", textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {chapter.title}
                </span>
              </li>
            );
          })}
        </ol>
        <div aria-label={`${missionProgress}% de la misión completada`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={missionProgress} role="progressbar" style={{ background: "rgba(255,255,255,0.17)", borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{ background: ACT_COLORS[chapterIndex % ACT_COLORS.length], borderRadius: 999, height: "100%", transition: "width 220ms ease", width: `${missionProgress}%` }} />
        </div>
      </header>

      <section style={{ alignItems: "center", background: "#fff", border: `2px solid ${ACT_COLORS[chapterIndex % ACT_COLORS.length]}55`, borderRadius: isMobile ? 14 : 18, display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) auto", padding: isMobile ? "9px 10px" : "11px 14px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: ACT_COLORS[chapterIndex % ACT_COLORS.length], fontSize: 10, fontWeight: 950, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            {interactionReady ? "Tu acción ahora" : "Escucha primero"}
          </div>
          <div style={{ color: "#253f3c", fontSize: isMobile ? 14 : 17, fontWeight: 850, lineHeight: 1.3 }}>
            {game.instruction_es}
          </div>
          {activeChapter?.objective ? <div style={{ color: "#697572", fontSize: isMobile ? 11 : 13, marginTop: 3 }}>{activeChapter.objective}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button aria-label="Escuchar la instrucción otra vez" onClick={onReplayDirections} style={{ ...buttonStyle(false), minHeight: 44, padding: 8, width: 44 }} title="Escuchar la instrucción" type="button">💡</button>
          <button aria-label="Escuchar la pista en inglés" disabled={!card.prompt && !card.audio_text && !game.cue_audio_text} onClick={onReplayEnglish} style={{ ...buttonStyle(!card.prompt && !card.audio_text && !game.cue_audio_text), minHeight: 44, padding: 8, width: 44 }} title="Escuchar la pista" type="button">🔊</button>
        </div>
      </section>

      <section
        style={{
          aspectRatio: "3 / 2",
          background: "#d9e6df",
          border: "4px solid #fff",
          borderRadius: isMobile ? 16 : 23,
          boxShadow: "0 12px 30px rgba(37, 63, 59, 0.16)",
          justifySelf: "center",
          maxWidth: isMobile ? "min(100%, calc(43svh * 1.5))" : 900,
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <Image alt={`Escena del reto ${cardIndex + 1}: ${game.instruction_es}`} fill priority sizes="(max-width: 760px) 96vw, 900px" src={imageSrc} style={{ objectFit: "cover" }} unoptimized />
        <div aria-hidden={!interactionReady} style={{ inset: 0, opacity: interactionReady ? 1 : 0.42, pointerEvents: interactionReady ? "auto" : "none", position: "absolute" }}>
          {game.targets.map((target) => {
            const entries = targetPlacements(target.id);
            const complete = entries.length === target.accepted_option_ids.length
              && entries.every((entry) => target.accepted_option_ids.includes(entry.optionId));
            const isNext = expected[placements.length]?.targetId === target.id;
            const guided = game.tutorial_mode === "guided-no-fail" && !placements.length;
            return (
              <div
                key={target.id}
                onDragOver={(event) => {
                  if (!directScene && !speechGame) event.preventDefault();
                }}
                onDrop={(event) => {
                  if (directScene || speechGame) return;
                  event.preventDefault();
                  const optionId = event.dataTransfer.getData("text/plain");
                  if (optionId) placeOption(optionId, target.id);
                }}
                style={{
                  border: `3px ${complete ? "solid" : "dashed"} ${complete ? "#43a578" : isNext || guided ? "#ffd35a" : "rgba(255,255,255,0.9)"}`,
                  borderRadius: 16,
                  boxShadow: isNext || guided ? "0 0 0 5px rgba(255, 211, 90, 0.28), 0 5px 18px rgba(22, 42, 38, 0.32)" : "0 5px 14px rgba(22, 42, 38, 0.24)",
                  height: `${target.rect.height * 100}%`,
                  left: `${target.rect.x * 100}%`,
                  position: "absolute",
                  top: `${target.rect.y * 100}%`,
                  width: `${target.rect.width * 100}%`,
                }}
              >
                <button
                  aria-label={`${target.label_es}${complete ? ", completado" : ""}`}
                  disabled={lastResult === "correct" || (complete && directScene)}
                  onClick={() => activateSceneTarget(target)}
                  style={{ background: complete ? "rgba(46, 139, 96, 0.16)" : "rgba(25, 54, 49, 0.05)", border: 0, borderRadius: 12, cursor: lastResult === "correct" ? "default" : "pointer", height: "100%", inset: 0, minHeight: 44, minWidth: 44, position: "absolute", width: "100%" }}
                  type="button"
                >
                  <span aria-hidden="true" style={{ alignItems: "center", background: complete ? "#328a61" : "rgba(31, 65, 58, 0.82)", borderRadius: 999, color: "#fff", display: "inline-flex", fontSize: isMobile ? 10 : 12, fontWeight: 950, height: isMobile ? 25 : 30, justifyContent: "center", left: 5, position: "absolute", top: 5, width: isMobile ? 25 : 30 }}>
                    {complete ? "✓" : guided ? "1" : "•"}
                  </span>
                </button>
                {entries.length ? (
                  <div style={{ bottom: 4, display: "flex", flexWrap: "wrap", gap: 3, left: 4, maxWidth: "calc(100% - 8px)", position: "absolute", zIndex: 2 }}>
                    {entries.map((placement) => (
                      <button key={placement.optionId} aria-label={`Retirar ${optionsById.get(placement.optionId)?.label || placement.optionId}`} onClick={() => removePlacement(placement.optionId)} style={{ background: "rgba(255,255,255,0.94)", border: "1px solid #347f6d", borderRadius: 8, color: "#24534a", cursor: "pointer", font: "inherit", fontSize: isMobile ? 9 : 11, fontWeight: 900, lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", padding: "4px 6px", textOverflow: "ellipsis", whiteSpace: "nowrap" }} type="button">
                        {optionsById.get(placement.optionId)?.label || placement.optionId} ×
                      </button>
                    ))}
                  </div>
                ) : null}
                {guided && !complete ? <span aria-hidden="true" className="mission-guide-hand">☝</span> : null}
              </div>
            );
          })}
        </div>
        {!interactionReady ? (
          <div style={{ alignItems: "center", background: "rgba(25, 54, 49, 0.62)", color: "#fff", display: "flex", fontSize: isMobile ? 14 : 18, fontWeight: 900, inset: 0, justifyContent: "center", padding: 20, position: "absolute", textAlign: "center" }}>
            🔊 Escucha la instrucción. Tu siguiente acción aparecerá enseguida.
          </div>
        ) : null}
      </section>

      {!directScene && !speechGame ? (
        <section aria-label="Señales disponibles" style={{ display: "grid", gap: 6 }}>
          <div style={{ color: "#5d625e", fontSize: 12, fontWeight: 850, textAlign: "center" }}>
            {choiceGame ? "Elige una respuesta y compruébala." : "Arrastra una señal, o tócala y después toca su destino."}
          </div>
          <div style={{ display: "flex", gap: 7, overflowX: isMobile ? "auto" : "visible", padding: "3px 2px 6px", scrollSnapType: isMobile ? "x mandatory" : undefined, flexWrap: isMobile ? "nowrap" : "wrap", justifyContent: isMobile ? "flex-start" : "center" }}>
            {(card.options || []).map((option) => {
              const placed = placedOptionIds.has(option.id);
              const selected = selectedOptionId === option.id;
              return (
                <button
                  aria-pressed={selected || placed}
                  disabled={!interactionReady || lastResult === "correct"}
                  draggable={!choiceGame && interactionReady && lastResult !== "correct"}
                  key={option.id}
                  onClick={() => choiceGame ? chooseDirectAnswer(option.id) : setSelectedOptionId((current) => current === option.id ? null : option.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", option.id);
                  }}
                  style={{
                    ...buttonStyle(!interactionReady || lastResult === "correct"),
                    background: placed ? "#e8f6ef" : selected ? "#fff0bc" : choiceGame && game.kind === "not-correction" ? "#fff2ef" : "#fff",
                    border: `2px solid ${placed ? "#43a578" : selected ? "#d89e2c" : game.kind === "not-correction" ? "#df7666" : "rgba(38, 70, 67, 0.24)"}`,
                    flex: isMobile ? "0 0 min(78vw, 310px)" : "1 1 210px",
                    fontSize: isMobile ? 13 : 15,
                    maxWidth: isMobile ? undefined : 340,
                    opacity: placed ? 0.64 : 1,
                    scrollSnapAlign: "center",
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {speechGame ? (
        <SpeechConsole card={card} game={game} isMobile={isMobile} onPrepareSpeech={onPrepareSpeech} onRetrySpeech={onRetrySpeech} speech={speech} />
      ) : null}

      {!speechGame ? (
        <section style={{ alignItems: "center", display: "grid", gap: 7, gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "auto auto minmax(180px, 260px)", justifyContent: "center" }}>
          <button disabled={!placements.length || lastResult === "correct"} onClick={undo} style={buttonStyle(!placements.length || lastResult === "correct")} type="button">Deshacer</button>
          <button disabled={!placements.length || lastResult === "correct"} onClick={reset} style={buttonStyle(!placements.length || lastResult === "correct")} type="button">Reiniciar</button>
          <button disabled={!placements.length || directScene || lastResult === "correct"} onClick={check} style={{ ...buttonStyle(!placements.length || directScene || lastResult === "correct"), background: !placements.length || directScene || lastResult === "correct" ? "#e7e2d7" : "linear-gradient(135deg, #ed7a4f, #f2a447)", color: !placements.length || directScene || lastResult === "correct" ? "#8f8a81" : "#fff" }} type="button">Comprobar</button>
        </section>
      ) : null}

      <div aria-live="polite" style={{ color: lastResult === "correct" ? "#2c7b55" : message ? "#8a5127" : "#68726f", fontSize: isMobile ? 12 : 14, fontWeight: 850, minHeight: 20, textAlign: "center" }}>
        {lastResult === "correct" ? "¡Reto completado! La celebración está un paso más cerca." : message || (interactionReady ? "Tus avances quedan guardados mientras corriges." : "")}
      </div>

      <style jsx>{`
        .mission-guide-hand {
          animation: guideTap 1.25s ease-in-out infinite;
          color: #fff;
          filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45));
          font-size: ${isMobile ? "28px" : "38px"};
          left: 50%;
          pointer-events: none;
          position: absolute;
          top: 50%;
          transform: translate(-15%, -10%);
          z-index: 3;
        }
        @keyframes guideTap {
          0%, 100% { transform: translate(-15%, -10%) scale(1); }
          50% { transform: translate(-15%, -22%) scale(0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mission-guide-hand { animation: none; }
        }
      `}</style>
    </main>
  );
}
