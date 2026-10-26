"use client";

import Image from "next/image";
import { CONVERSATION_DECISION_INSTRUCTION } from "../../mobile/src/missionConversationDecision";
import { useMissionConversationDecision } from "../../mobile/src/hooks/useMissionConversationDecision";
import { lessonMistakeHint } from "../../mobile/src/lessonMistakeHints";
import { TutorButton } from "./TutorButton";

export default function MissionConversationDecision(props) {
  const { card, paused, interactionReady, cueUnavailable, imageSrc, resolveImage, onReplay, onTutor, tutorAnchorRef } = props;
  const { state, controller } = useMissionConversationDecision(card, interactionReady, paused, props);
  const completion = state.phase === "completion" ? card.mission_game?.completion_scene : undefined;
  const images = state.options.every(option => Boolean(option.image_url));
  const disabled = paused || !interactionReady || state.phase !== "choosing";
  const hint = state.phase === "wrong" ? lessonMistakeHint(card, state.selectedId) : "";
  const hasResponse = Boolean(card.answer_audio_text || card.answer_audio_turns?.length);
  const replayDisabled = paused || !["choosing", "wrong"].includes(state.phase);
  return <section className="decision">
    <div className="decision-rail">
      <div className="instruction"><span>{completion?.context_es || CONVERSATION_DECISION_INSTRUCTION}</span>
        {!completion ? <button aria-label="Repetir la conversación en inglés" disabled={replayDisabled} onClick={onReplay} type="button">🔊</button> : null}
      </div>
      {card.context_es && !completion ? <p>{card.context_es}</p> : null}
      {cueUnavailable && !completion && state.phase !== "responding" ? <p role="alert">No se pudo reproducir el audio completo. Toca la bocina para volver a escuchar.</p> : null}
      {state.phase === "responding" ? <p aria-live="polite">{hasResponse ? '✓ Escucha la respuesta…' : '✓ ¡Bien!'}</p> : null}
    </div>
    <div className="decision-body" ref={tutorAnchorRef}>
      {hint ? <div className="feedback" aria-live="polite">
        <div className="explanation"><span>Cuando te equivocas, también aprendes.</span><p>× {hint}</p></div>
        <div className="actions"><button disabled={paused} onClick={() => controller.retry()} type="button">Reintentar</button>
          {onTutor ? <TutorButton more onClick={onTutor} /> : null}</div>
      </div> : state.phase === "response-error" ? <div className="feedback" role="alert">
        <p>{hasResponse ? 'La respuesta no se pudo escuchar completa.' : 'La continuación se interrumpió.'}</p>
        <button disabled={paused} onClick={() => controller.retryResponse()} type="button">{hasResponse ? 'Repetir respuesta' : 'Continuar'}</button>
      </div> : completion ? <>
        <div className="hero"><Image alt={completion.context_es} fill priority sizes="(max-width: 760px) 90vw, 900px" src={resolveImage(completion.image_url)} style={{ objectFit: "contain" }} unoptimized /></div>
        <button aria-label="Continuar la historia" disabled={paused} onClick={() => controller.continue()} type="button">Continuar →</button>
      </> : <>
        {!images && imageSrc ? <div className="hero"><Image alt="Escena de la conversación" fill priority sizes="(max-width: 760px) 90vw, 900px" src={imageSrc} style={{ objectFit: "contain" }} unoptimized /></div> : null}
        {!interactionReady && !cueUnavailable && state.phase === "choosing" ? <p aria-live="polite">Escucha…</p> : null}
        <div className={`options ${images ? "image-options" : "text-options"}`}>
          {state.options.map((option, index) => <button key={option.id} type="button"
            aria-label={option.image_url ? `Imagen ${index + 1}` : option.label || ""}
            aria-pressed={state.selectedId === option.id} disabled={disabled} onClick={() => controller.choose(option.id)}
            className={state.selectedId === option.id ? (state.phase === "wrong" ? "wrong" : "correct") : ""}>
            {option.image_url ? <Image alt={`Imagen ${index + 1}`} fill sizes="(max-width: 760px) 90vw, 600px" src={resolveImage(option.image_url)} style={{ objectFit: "contain" }} unoptimized /> : option.label}
          </button>)}
        </div>
      </>}
    </div>
    <style jsx>{`
      .decision { display:flex; flex:1; flex-direction:column; gap:8px; min-height:0; color:#234541; }
      .decision-rail { min-width:0; }
      .instruction { align-items:center; display:flex; font-size:14px; font-weight:600; gap:8px; line-height:1.3; }
      .instruction span { flex:1; }
      .instruction button { background:transparent; color:#247b78; font-size:25px; padding:0; width:48px; }
      .decision-body { display:flex; flex:1; flex-direction:column; gap:8px; min-height:0; }
      .hero { flex:1; min-height:60px; position:relative; overflow:hidden; border-radius:16px; }
      .options { display:flex; flex-direction:column; gap:8px; }
      .image-options { align-items:center; container-type:size; flex:1; min-height:0; }
      .image-options button { aspect-ratio:3/2; flex:1; max-height:calc((100cqh - 8px)/2); min-height:48px; position:relative; width:min(100%, calc((100cqh - 8px)*.75)); }
      .text-options button { background:#fffdf7; border:2px solid #d5dfd7; color:#234541; font-size:18px; font-weight:600; line-height:1.3; padding:10px 14px; width:100%; }
      button { background:#247b78; border:2px solid transparent; border-radius:12px; color:white; cursor:pointer; font:inherit; font-weight:700; min-height:48px; padding:8px 12px; }
      button:disabled { cursor:default; }
      .options button { background:#fffdf7; border:2px solid #d5dfd7; overflow:hidden; }
      .options button.correct { background:#e2f6ea; border-color:#31946c; }
      .options button.wrong { background:#fff1ed; border-color:#c75147; }
      p { font-size:14px; line-height:1.3; margin:4px 0; text-align:center; }
      .feedback { background:#fff8ef; border-radius:12px; display:flex; flex:1; flex-direction:column; gap:6px; min-height:0; padding:8px; }
      .explanation { flex:1; min-height:0; overflow-y:auto; }
      .actions { align-items:center; display:flex; gap:8px; }
      .actions>button { flex:1; }
      .feedback span { color:#795f43; font-size:14px; }
      .feedback p { color:#493e35; font-size:15px; text-align:left; }
      @media(orientation:landscape) and (max-height:600px) {
        .decision { display:contents; }
        .decision-rail { grid-column:1; grid-row:2; }
        .decision-body { grid-column:2; grid-row:1 / 3; min-width:0; }
        .text-options button { padding:8px; font-size:16px; }
      }
    `}</style>
  </section>;
}
