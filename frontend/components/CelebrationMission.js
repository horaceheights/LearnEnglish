"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { missionChapterProgress, missionProgressPercent } from "../lib/missionExperience.mjs";
import { fitMissionHeadScene } from "../lib/missionTargetInteraction.cjs";

const ACT_ICONS = ["◉", "∿", "➤", "✦", "●"];
const ACT_COLORS = ["#ed7a4f", "#e3ae32", "#268b78", "#7566ad", "#d65c65"];
const KIND_LABELS = {
  "action-hunt": "Encuentra la acción",
  "contrast-hunt": "Mira bien",
  "crowd-search": "Encuentra a la persona",
  "family-link": "Reúne a la familia",
  "guided-search": "Primer reto",
  "voice-gate": "Reto de voz",
};

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
    minHeight: 46,
    padding: "9px 14px",
  };
}

function MissionIntro({ introReady, isMobile, lesson, onBegin, onExit, onReplayIntro, resolveImage }) {
  const objectives = lesson.mission.objectives || [];
  return (
    <main className="mission-shell mission-intro" aria-label={`${lesson.mission.label}: ${lesson.mission.title}`}>
      <div className="mission-topline">
        <button aria-label="Salir de la misión" onClick={onExit} style={buttonStyle()} type="button">← Salir</button>
        <div className="mission-label">{lesson.mission.label}</div>
      </div>
      <div className="intro-copy">
        <h1>{lesson.mission.title}</h1>
        <p>{lesson.mission.briefing}</p>
      </div>
      <div className="intro-image">
        <Image alt="Una celebración familiar lista para comenzar" fill priority sizes="(max-width: 760px) 96vw, 820px" src={resolveImage(lesson.mission.kickoff_image_url)} style={{ objectFit: "cover" }} unoptimized />
        <span className="challenge-badge">✦ 22 RETOS · 1 AVENTURA</span>
      </div>
      <div className="intro-objectives" aria-label="Lo que harás en la misión">
        {objectives.map((objective, index) => (
          <div key={objective}><b style={{ background: ACT_COLORS[index % ACT_COLORS.length] }}>{ACT_ICONS[index % ACT_ICONS.length]}</b><span>{objective}</span></div>
        ))}
      </div>
      <div className="intro-ready" aria-live="polite">
        {introReady ? "✓ Listo. Escucha en inglés y toca la respuesta." : "🔊 Escucha primero cómo funciona la misión…"}
      </div>
      <div className="intro-actions">
        <button onClick={onReplayIntro} style={buttonStyle()} type="button">🔊 Escuchar otra vez</button>
        <button disabled={!introReady} onClick={onBegin} style={{ ...buttonStyle(!introReady), background: introReady ? "#e66f45" : "#b9aea6", color: "#fff" }} type="button">
          {introReady ? "Comenzar misión →" : "Escuchando…"}
        </button>
      </div>
      <style jsx>{missionStyles}</style>
    </main>
  );
}

function VoiceGateHeader({ cardIndex, game, onReplayEnglish, speech }) {
  const step = Math.max(1, cardIndex - 17);
  const total = 4;
  return (
    <section className="voice-game-header">
      <div className="voice-game-heading">
        <div><small>ABRE LA CELEBRACIÓN</small><strong>Activa la entrada con tu voz</strong></div>
        <b>VOZ {step}/{total}</b>
      </div>
      <div className="voice-locks" aria-label={`Voz ${step} de ${total}`}>
        {Array.from({ length: total }, (_item, index) => (
          <i className={index < step - 1 ? "done" : index === step - 1 ? "active" : ""} key={index}>
            {index < step - 1 ? "✓" : index === step - 1 ? "●" : "◆"}
          </i>
        ))}
      </div>
      <div className="voice-question">
        <span>💬</span>
        <div><small>TE PREGUNTAN</small><strong>{game.cue_audio_text || game.cues?.[0]?.text}</strong></div>
        <button aria-label="Repetir la pregunta en inglés" disabled={speech.recording || speech.scoring} onClick={() => onReplayEnglish(0)} type="button">🔊</button>
      </div>
      <style jsx>{missionStyles}</style>
    </section>
  );
}

function VoiceGateConsole({ card, isMobile, onPrepareSpeech, onRetrySpeech, speech }) {
  const busy = speech.recording || speech.scoring;
  const accepted = Boolean(speech.outcome?.accepted);
  const stateLabel = accepted ? "ENTRADA ACTIVADA" : speech.scoring ? "REVISANDO TU RESPUESTA" : speech.recording ? "TE ESCUCHAMOS" : speech.asking ? "ESCUCHA LA PREGUNTA" : "RESPONDE EN VOZ ALTA";
  return (
    <section className={`voice-console ${accepted ? "accepted" : ""}`} aria-live="polite">
      <div className={`voice-orb ${busy ? "busy" : ""} ${accepted ? "accepted" : ""}`}>{accepted ? "✓" : "🎤"}<i /></div>
      <div className="voice-command">
        <div className="speech-label">{stateLabel}</div>
        {!speech.asking && !speech.error ? <strong>{card.prompt}</strong> : null}
        <div>{speech.error || (speech.result ? speech.result.feedback?.messages?.es || (accepted ? "¡Muy bien!" : "Inténtalo otra vez.")
          : speech.scoring ? "Revisando tu respuesta…" : speech.asking ? "Escucha la pregunta." : "Lee la frase en voz alta.")}</div>
      </div>
      {!speech.ready && !busy && !speech.error ? <button onClick={onPrepareSpeech} style={buttonStyle(false)} type="button">Escuchar y responder</button> : null}
      {speech.error && !busy ? <button onClick={onRetrySpeech} style={buttonStyle(false)} type="button">Intentar otra vez</button> : null}
      <style jsx>{missionStyles}</style>
      <style jsx>{`
        .voice-console { align-items:center; background:#f7e5b8; border:2px solid #d69e35; border-radius:18px; display:grid; gap:9px; grid-template-columns:auto minmax(0,1fr) auto; margin:0 auto; max-width:820px; padding:${isMobile ? "7px 9px" : "10px 14px"}; width:100%; }
        .voice-console.accepted { background:#dff5e8; border-color:#3b9367; }
        .voice-orb { align-items:center; background:#d96845; border:4px solid #ffe1a0; border-radius:999px; color:#fff; display:flex; font-size:22px; height:54px; justify-content:center; position:relative; width:54px; }
        .voice-orb i { border:2px solid #d96845; border-radius:999px; inset:-8px; opacity:.2; position:absolute; }
        .voice-orb.busy i { animation:voice-pulse .75s ease-out infinite alternate; }
        .voice-orb.accepted { background:#30936c; border-color:#a8e1c8; }
        .voice-command { display:grid; min-width:0; text-align:left; }
        .speech-label { color:#7b591c; font-size:11px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
        .voice-command strong { color:#214c45; font-size:${isMobile ? "19px" : "24px"}; line-height:1.15; overflow-wrap:break-word; }
        .voice-console>button { justify-self:center; }
        @keyframes voice-pulse { from{transform:scale(.9);opacity:.6} to{transform:scale(1.25);opacity:.05} }
        @media(max-width:520px){.voice-console{grid-template-columns:auto minmax(0,1fr)}.voice-console>button{grid-column:1/3;width:100%}}
      `}</style>
    </section>
  );
}

export default function CelebrationMission({
  card,
  cueOrder,
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
  onReplayEnglish,
  onReplayIntro,
  onRetrySpeech,
  onScenePlacement,
  resolveImage,
  speech,
}) {
  const game = card.mission_game;
  const [cueIndex, setCueIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [solvedTargets, setSolvedTargets] = useState([]);
  const [wrongTarget, setWrongTarget] = useState("");
  const timerRef = useRef(null);
  const selectionLockRef = useRef(false);
  const sceneSlotRef = useRef(null);
  const [slotSize, setSlotSize] = useState({ width: 0, height: 0 });
  const chapters = missionChapterProgress(lesson, cardIndex);
  const chapterIndex = Math.max(0, chapters.findIndex((chapter) => chapter.isActive));
  const cue = game.cues?.[cueOrder[cueIndex] ?? cueIndex] || game.cues?.[0];
  const isVoiceGate = game.kind === "voice-gate";
  const heroImage = isVoiceGate && speech.asking
    ? resolveImage(card.audio_turns?.[0]?.image_url || "")
    : imageSrc || resolveImage(card.options?.find((option) => option.image_url)?.image_url || "");
  const locked = !interactionReady || Boolean(feedback) || lastResult === "correct";
  const missionProgress = missionProgressPercent(lesson, cardIndex, lastResult === "correct");
  const cueProgress = useMemo(() => `${Math.min(cueIndex + 1, game.cues.length)} de ${game.cues.length}`, [cueIndex, game.cues.length]);
  const headScene = useMemo(() => fitMissionHeadScene(slotSize.width, slotSize.height, game.targets),
    [slotSize, game.targets]);
  useEffect(() => {
    const element = sceneSlotRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSlotSize(current => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [introComplete, isVoiceGate]);

  useEffect(() => {
    setCueIndex(0);
    setFeedback("");
    setSolvedTargets([]);
    setWrongTarget("");
    selectionLockRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, [card.slide_id]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  if (!introComplete) {
    return <MissionIntro introReady={introReady} isMobile={isMobile} lesson={lesson} onBegin={onBegin} onExit={onExit} onReplayIntro={onReplayIntro} resolveImage={resolveImage} />;
  }

  const chooseTarget = (target) => {
    if (locked || !cue || isVoiceGate || solvedTargets.includes(target.id) || selectionLockRef.current) return;
    selectionLockRef.current = true;
    if (target.id !== cue.target_id) {
      setWrongTarget(target.id);
      setFeedback("Escucha otra vez. Tus aciertos siguen guardados.");
      onMisstep([target.id]);
      timerRef.current = window.setTimeout(() => {
        setWrongTarget("");
        setFeedback("");
        selectionLockRef.current = false;
        onReplayEnglish(cueIndex);
      }, 850);
      return;
    }

    setSolvedTargets((current) => [...new Set([...current, target.id])]);
    setFeedback(cue.answer_text);
    onScenePlacement?.();
    timerRef.current = window.setTimeout(() => {
      const nextCue = cueIndex + 1;
      if (nextCue < game.cues.length) {
        setCueIndex(nextCue);
        setFeedback("");
        selectionLockRef.current = false;
        onReplayEnglish(nextCue);
      } else {
        onComplete(game.cues.map((item) => item.option_id));
      }
    }, 2200);
  };

  return (
    <main className={`mission-shell mission-game ${isVoiceGate ? "mission-voice-game" : ""}`} aria-label={`${lesson.mission.label}. Reto ${cardIndex + 1} de ${lesson.cards.length}.`}>
      <header className="game-header">
        <div className="mission-topline">
          <button aria-label="Salir de la misión" onClick={onExit} style={{ ...buttonStyle(false), minHeight: isVoiceGate ? 48 : 40, minWidth: isVoiceGate ? 48 : undefined, padding: "6px 10px" }} type="button">{isVoiceGate ? "←" : "← Salir"}</button>
          <div><span>{lesson.mission.label}</span><strong>{lesson.mission.title}</strong></div>
          <b>{cardIndex + 1}/{lesson.cards.length}</b>
        </div>
        <ol aria-label="Actos de la misión">
          {chapters.map((chapter, index) => <li className={chapter.isActive ? "active" : chapter.isComplete ? "complete" : ""} key={chapter.id}><i style={{ background: chapter.isActive || chapter.isComplete ? ACT_COLORS[index] : undefined }}>{chapter.isComplete ? "✓" : ACT_ICONS[index]}</i><small>{chapter.title}</small></li>)}
        </ol>
        <div className="mission-meter"><span style={{ background: ACT_COLORS[chapterIndex], width: `${missionProgress}%` }} /></div>
      </header>

      {isVoiceGate ? (
        <VoiceGateHeader cardIndex={cardIndex} game={game} onReplayEnglish={onReplayEnglish} speech={speech} />
      ) : <section className="cue-panel">
        <div><small>{KIND_LABELS[game.kind]}</small><b>{game.instruction_es}</b></div>
        <span>PISTA {cueProgress}</span>
        <button aria-label="Repetir la frase en inglés" disabled={Boolean(feedback)} onClick={() => onReplayEnglish(cueIndex)} type="button">🔊</button>
      </section>}

      <div className="scene-slot" ref={sceneSlotRef}>
        <section className={`scene ${isVoiceGate ? "voice-scene" : "head-scene"} ${isVoiceGate && speech.outcome?.accepted ? "voice-scene-open" : ""}`}
          style={!isVoiceGate ? { width: headScene?.width || 0, height: headScene?.height || 0 }
            : { width: Math.max(0, Math.min(slotSize.width - 8, (slotSize.height - 8) * 1.5)) + 8,
                height: Math.max(0, Math.min(slotSize.width - 8, (slotSize.height - 8) * 1.5)) / 1.5 + 8 }}>
          <div className={isVoiceGate ? "voice-art" : "scene-art"} style={!isVoiceGate && headScene ? {
            left: headScene.imageX - 4, top: headScene.imageY - 4,
            width: headScene.imageWidth + 8, height: headScene.imageHeight + 8,
          } : undefined}>
            <Image alt={`Escena del reto ${cardIndex + 1}`} fill priority sizes="(max-width: 760px) 96vw, 900px" src={heroImage} style={{ objectFit: "cover" }} unoptimized />
          </div>
          {!isVoiceGate && headScene ? <svg aria-hidden="true" className="head-pointers" width={headScene.width} height={headScene.height}>
            {headScene.markers.flatMap(marker => marker.chest ? [] : marker.heads.map((head, index) => (
              <line key={`${marker.id}-${index}`} x1={marker.x + marker.width / 2} y1={marker.y + marker.height - 7}
                x2={head.x} y2={head.y - 3} stroke="#fff" strokeWidth="3" />
            )))}
          </svg> : null}
          {!isVoiceGate && headScene ? game.targets.map((target, index) => {
          const marker = headScene.markers[index];
          const solved = solvedTargets.includes(target.id);
          const wrong = wrongTarget === target.id;
          const collective = ["Grupo", "Pareja", "Familia"].includes(target.label_es);
          return (
            <button
              aria-label={target.label_es || "Persona"}
              className={`target-dot ${collective ? "collective" : ""} ${solved ? "solved" : ""} ${wrong ? "wrong" : ""}`}
              disabled={locked || solved}
              key={target.id}
              onClick={() => chooseTarget(target)}
              style={{ left: marker.x, top: marker.y, width: marker.width, height: marker.height, transform: "none" }}
              type="button"
            >
              <i />
              <span>{solved ? "✓" : collective ? "● ●" : "●"}</span>
            </button>
          );
          }) : null}
          {!interactionReady && !feedback && !isVoiceGate ? <div className="listening">👂 Escucha…</div> : null}
          {feedback ? <div className={`feedback ${wrongTarget ? "wrong" : "correct"}`}>{wrongTarget ? "👂" : "✓"} {feedback}</div> : null}
        </section>
      </div>

      {isVoiceGate ? <VoiceGateConsole card={card} isMobile={isMobile} onPrepareSpeech={onPrepareSpeech} onRetrySpeech={onRetrySpeech} speech={speech} /> : (
        <div className="cue-dots" aria-label={`Pista ${cueProgress}`}>{game.cues.map((item, index) => <i className={index < cueIndex ? "done" : index === cueIndex ? "current" : ""} key={item.id} />)}</div>
      )}
      <style jsx>{missionStyles}</style>
    </main>
  );
}

const missionStyles = `
  .mission-shell { background:linear-gradient(180deg,#fffaf0,#f5eee1); border:1px solid rgba(68,87,75,.24); border-radius:24px; box-shadow:0 18px 50px rgba(41,59,49,.14); box-sizing:border-box; display:flex; flex-direction:column; gap:9px; height:calc(100svh - 40px); margin:0 auto; max-height:980px; max-width:1120px; min-height:520px; overflow:hidden; padding:12px; width:100%; }
  .mission-intro { align-items:center; background:linear-gradient(150deg,#fff8e8,#ffe0b3 46%,#d6eee4); justify-content:center; }
  .mission-topline { align-items:center; display:flex; gap:10px; justify-content:space-between; width:100%; }
  .mission-label,.game-header .mission-topline div span { color:#8b5828; font-size:11px; font-weight:950; letter-spacing:.11em; text-transform:uppercase; }
  .intro-copy { max-width:780px; text-align:center; }
  .intro-copy h1 { color:#243d3a; font-size:clamp(2rem,5vw,4rem); line-height:1; margin:0; }
  .intro-copy p { color:#4d5f5b; font-size:clamp(13px,1.6vw,17px); line-height:1.4; margin:5px 0 0; }
  .intro-image { border:5px solid rgba(255,255,255,.9); border-radius:24px; flex:1; max-width:820px; min-height:180px; overflow:hidden; position:relative; width:100%; }
  .challenge-badge { background:rgba(31,80,70,.92); border-radius:999px; bottom:10px; color:#fff; font-size:10px; font-weight:950; left:10px; padding:8px 12px; position:absolute; }
  .intro-objectives { display:flex; gap:7px; max-width:820px; width:100%; }
  .intro-objectives>div { align-items:center; background:rgba(255,255,255,.8); border:1px solid #e5d8be; border-radius:14px; color:#294945; display:flex; flex:1; font-size:12px; font-weight:900; gap:7px; min-width:0; padding:6px 9px; }
  .intro-objectives b { align-items:center; border-radius:999px; color:#fff; display:flex; flex:0 0 28px; height:28px; justify-content:center; }
  .intro-ready { color:#704a35; font-size:13px; font-weight:900; min-height:20px; text-align:center; }
  .intro-actions { display:flex; gap:8px; max-width:650px; width:100%; }
  .intro-actions button { flex:1; }
  .game-header { background:linear-gradient(135deg,#214f48,#347f6d); border-radius:17px; color:#fff; display:grid; gap:5px; padding:8px 10px; }
  .game-header .mission-topline div { display:grid; min-width:0; text-align:center; }
  .game-header .mission-topline div span { color:#ffe19a; font-size:9px; }
  .game-header .mission-topline div strong { font-size:19px; line-height:1; }
  .game-header .mission-topline>b { color:#fff2cb; font-size:12px; min-width:42px; text-align:right; }
  .game-header ol { display:grid; gap:4px; grid-template-columns:repeat(5,minmax(0,1fr)); list-style:none; margin:0; padding:0; }
  .game-header li { align-items:center; display:grid; gap:2px; justify-items:center; min-width:0; opacity:.48; }
  .game-header li.active,.game-header li.complete { opacity:1; }
  .game-header li i { align-items:center; background:rgba(255,255,255,.16); border:2px solid transparent; border-radius:999px; display:flex; font-style:normal; height:23px; justify-content:center; width:23px; }
  .game-header li.active i { border-color:#fff; }
  .game-header small { font-size:9px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; text-align:center; }
  .mission-meter { background:rgba(255,255,255,.18); border-radius:999px; height:5px; overflow:hidden; }
  .mission-meter span { border-radius:999px; display:block; height:100%; transition:width .2s ease; }
  .cue-panel { align-items:center; background:#fffdf8; border:2px solid #9bcdbf; border-radius:16px; display:grid; gap:8px; grid-template-columns:minmax(0,1fr) auto auto; padding:8px 10px; }
  .cue-panel>div { display:grid; min-width:0; }
  .cue-panel small { color:#d86643; font-size:10px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
  .cue-panel b { color:#203c37; font-size:15px; line-height:1.25; }
  .cue-panel>span { color:#477069; font-size:10px; font-weight:950; }
  .cue-panel button { background:#278c73; border:0; border-radius:14px; color:#fff; cursor:pointer; font-size:21px; height:45px; width:45px; }
  .voice-game-header { background:#173f39; border:2px solid #e3b653; border-radius:17px; color:#fff; display:grid; gap:6px; padding:7px 10px; }
  .voice-game-heading { align-items:center; display:flex; gap:8px; justify-content:space-between; }
  .voice-game-heading>div { display:grid; min-width:0; }
  .voice-game-heading small,.voice-question small { color:#ffd986; font-size:9px; font-weight:950; letter-spacing:.09em; }
  .voice-game-heading strong { font-size:16px; line-height:1.05; }
  .voice-game-heading>b { color:#ffe5a9; font-size:10px; white-space:nowrap; }
  .voice-locks { align-items:center; display:flex; gap:8px; justify-content:center; }
  .voice-locks i { align-items:center; background:#f4efe2; border:2px solid #758a82; border-radius:999px; color:#7d8984; display:flex; font-size:12px; font-style:normal; height:30px; justify-content:center; width:30px; }
  .voice-locks i.done { background:#38a77c;border-color:#8fe0bd;color:#fff; }
  .voice-locks i.active { background:#ffd986;border-color:#fff6d7;color:#704816;transform:scale(1.08); }
  .voice-question { align-items:center; background:#fff8e8; border-radius:12px; color:#244640; display:grid; gap:7px; grid-template-columns:auto minmax(0,1fr) auto; padding:6px 8px; }
  .voice-question>span { align-items:center; background:#d86b48; border-radius:999px; display:flex; height:31px; justify-content:center; width:31px; }
  .voice-question>div { display:grid; }
  .voice-question small { color:#a45b3f; font-size:8px; }
  .voice-question strong { font-size:17px; line-height:1.05; }
  .voice-question button { background:#278c73;border:0;border-radius:11px;color:#fff;font-size:18px;height:48px;width:48px; }
  .scene-slot { align-items:center; container-type:size; display:flex; flex:1; justify-content:center; min-height:0; width:100%; }
  .scene { aspect-ratio:3/2; background:#d9e6df; border:4px solid #fff; border-radius:21px; box-sizing:border-box; flex:none; overflow:hidden; position:relative; width:100%; }
  .scene.head-scene { aspect-ratio:auto; background:transparent; border:0; overflow:visible; }
  .scene-art { border:4px solid #fff; border-radius:21px; box-sizing:border-box; overflow:hidden; position:absolute; }
  .voice-art { position:absolute; inset:0; }
  .head-pointers { inset:0; pointer-events:none; position:absolute; }
  .voice-scene { border-color:#e3b653; box-shadow:0 0 0 3px rgba(227,182,83,.18); }
  .voice-scene-open { border-color:#38a77c; box-shadow:0 0 24px rgba(56,167,124,.52); }
  .target-dot { align-items:center; background:transparent; border:0; cursor:pointer; display:flex; height:clamp(44px,17cqw,58px); justify-content:center; padding:0; position:absolute; transform:translate(-50%,-50%); width:clamp(44px,17cqw,58px); }
  .target-dot i { animation:pulse 1.15s ease-out infinite; background:rgba(255,255,255,.68); border:3px solid #f4c75f; border-radius:999px; height:36px; position:absolute; width:36px; }
  .target-dot span { align-items:center; background:#245f53; border:3px solid #fff; border-radius:999px; box-shadow:0 3px 8px rgba(18,50,44,.38); color:#fff; display:flex; font-size:14px; font-weight:950; height:36px; justify-content:center; position:relative; width:36px; }
  .target-dot.collective { width:clamp(66px,24cqw,132px); }
  .target-dot.collective i { animation-name:collective-pulse; height:40px; width:calc(100% - 8px); }
  .target-dot.collective span { font-size:11px; height:36px; letter-spacing:2px; width:calc(100% - 14px); }
  .target-dot.solved span { background:#32a77e; }
  .target-dot.wrong span { background:#c95048; }
  .listening,.feedback { align-items:center; border-radius:999px; bottom:11px; color:#fff; display:flex; font-size:14px; font-weight:950; justify-content:center; left:50%; max-width:92%; padding:8px 14px; position:absolute; text-align:center; transform:translateX(-50%); }
  .listening { background:rgba(24,58,53,.92); }
  .feedback.correct { background:rgba(29,126,96,.96); }
  .feedback.wrong { background:rgba(151,71,55,.96); }
  .cue-dots { align-items:center; display:flex; gap:6px; justify-content:center; min-height:9px; }
  .cue-dots i { background:#d5ddd8; border-radius:999px; height:7px; width:7px; }
  .cue-dots i.done { background:#56ae91; }
  .cue-dots i.current { background:#d77b4c; width:22px; }
  @keyframes pulse { 0%{opacity:.75;transform:scale(.9)} 100%{opacity:.05;transform:scale(1.12)} }
  @keyframes collective-pulse { 0%{opacity:.75;transform:scale(.9)} 100%{opacity:.05;transform:scale(1.12)} }
  @container (min-aspect-ratio:3/2) { .scene { height:100%; width:auto; } }
  .mission-voice-game .scene-slot { min-height:0; flex:1; }
  .mission-voice-game .voice-console { flex-shrink:0; box-sizing:border-box; }
  @media (max-width:760px) { .mission-shell { border-radius:18px; gap:6px; height:calc(100svh - 16px); min-height:430px; padding:7px; } .intro-copy h1{font-size:1.9rem}.intro-copy p{line-height:1.25}.intro-objectives>div{font-size:10px;padding:4px 6px}.intro-objectives b{flex-basis:24px;height:24px}.game-header{padding:6px 8px}.game-header .mission-topline div strong{font-size:16px}.game-header small{font-size:7px}.cue-panel{padding:6px 8px}.cue-panel b{font-size:13px}.speech-console{flex:0 0 auto} }
  @media (max-height:600px) and (orientation:landscape) {
    .mission-shell { gap:6px; height:calc(100svh - 16px); min-height:0; padding:8px; }
    .mission-game { display:grid; grid-template-columns:minmax(230px,.8fr) minmax(0,1.45fr); grid-template-rows:auto 1fr auto; }
    .mission-game .game-header { grid-column:1; grid-row:1; }
    .mission-game .cue-panel { align-self:start; grid-column:1; grid-row:2; }
    .mission-game .voice-game-header { align-self:start; grid-column:1; grid-row:2; }
    .mission-game .scene-slot { grid-column:2; grid-row:1 / 4; height:100%; }
    .mission-game .cue-dots { grid-column:1; grid-row:3; }
    .mission-game .voice-console { align-self:end; grid-column:1; grid-row:3; }
    .mission-game .game-header .mission-topline div strong { font-size:15px; }
    .mission-game .game-header small { font-size:7px; }
    .mission-game .cue-panel { grid-template-columns:minmax(0,1fr) auto; }
    .mission-game .cue-panel>span { grid-column:1; }
    .mission-game .cue-panel>button { grid-column:2; grid-row:1 / 3; }
    .mission-voice-game { grid-template-columns:minmax(210px,.8fr) minmax(0,1.45fr); grid-template-rows:auto minmax(0,1fr) auto; }
    .mission-voice-game .game-header ol { display:none; }
    .mission-voice-game .game-header .mission-topline>b { flex-shrink:0; min-width:0; }
    .mission-voice-game .game-header .mission-topline div strong { font-size:13px; }
    .mission-voice-game .voice-game-header { align-self:stretch; align-content:space-between; grid-row:2 / 4; min-height:0; }
    .mission-voice-game .scene-slot { grid-row:1 / 3; min-height:0; }
    .mission-voice-game .voice-console { grid-column:2; grid-row:3; grid-template-columns:auto minmax(0,1fr); padding:7px; }
    .mission-voice-game .voice-console>button { grid-column:1 / 3; width:100%; }
    .mission-voice-game .voice-orb { height:32px; width:32px; }
    .mission-voice-game .voice-command { font-size:13px; line-height:1.2; }
  }
  @media (prefers-reduced-motion:reduce) { .target-dot i{animation:none;opacity:.35;transform:scale(1.1)} }
`;
