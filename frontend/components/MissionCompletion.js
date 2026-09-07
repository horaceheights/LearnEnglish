import Image from "next/image";

export default function MissionCompletion({ finalImageUrl, isMobile, lesson, onExit, showFinalImage = true }) {
  const finalPhrase = lesson.cards?.at(-1)?.prompt || "";
  const achievements = lesson.mission.objectives?.length
    ? lesson.mission.objectives
    : ["Objetivo completado", "Pistas resueltas", "Misión terminada"];

  return (
    <section
      aria-label={lesson.mission.completion_title}
      style={{
        background: "linear-gradient(145deg, #214f48 0%, #347f6d 55%, #d88a42 100%)",
        border: "1px solid rgba(244, 201, 93, 0.7)",
        borderRadius: isMobile ? 20 : 30,
        boxShadow: "0 24px 60px rgba(25, 50, 55, 0.24)",
        color: "#fffaf0",
        display: "grid",
        gap: isMobile ? 14 : 20,
        margin: "0 auto",
        maxWidth: 920,
        overflow: "hidden",
        padding: isMobile ? 14 : 24,
        textAlign: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "grid", gap: 5 }}>
        <div style={{ color: "#f4c95d", fontSize: 12, fontWeight: 950, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {lesson.mission.label}
        </div>
        <h1 style={{ fontSize: isMobile ? "1.75rem" : "clamp(2rem, 4vw, 3.35rem)", lineHeight: 1.05, margin: 0 }}>
          {lesson.mission.completion_title}
        </h1>
        <p style={{ color: "rgba(255,250,240,0.86)", lineHeight: 1.5, margin: "0 auto", maxWidth: 680 }}>
          {lesson.mission.completion_message}
        </p>
      </div>

      {showFinalImage && finalImageUrl ? (
        <div
          style={{
            aspectRatio: "3 / 2",
            background: "#ead9b9",
            border: "clamp(6px, 1.4vw, 12px) solid #fff4d6",
            borderRadius: isMobile ? 16 : 22,
            boxShadow: "0 16px 36px rgba(0,0,0,0.25)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Image
            alt={`Final de ${lesson.mission.title}`}
            fill
            sizes="(max-width: 760px) 94vw, 860px"
            src={finalImageUrl}
            style={{ objectFit: "cover" }}
            unoptimized
          />
        </div>
      ) : (
        <div
          aria-label="Los cinco actos de la misión están completos"
          style={{
            alignItems: "center",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: isMobile ? 16 : 22,
            display: "flex",
            flexWrap: "wrap",
            gap: isMobile ? 10 : 16,
            justifyContent: "center",
            minHeight: isMobile ? 116 : 150,
            padding: 18,
          }}
        >
          {["◉", "∿", "➤", "✕", "✦"].map((symbol, index) => (
            <span
              aria-hidden="true"
              key={`${symbol}-${index}`}
              style={{
                alignItems: "center",
                background: ["#ed7a4f", "#e3ae32", "#268b78", "#7566ad", "#d65c65"][index],
                border: "3px solid rgba(255,255,255,0.86)",
                borderRadius: 999,
                boxShadow: "0 8px 18px rgba(0,0,0,0.2)",
                display: "inline-flex",
                fontSize: isMobile ? 22 : 30,
                height: isMobile ? 50 : 66,
                justifyContent: "center",
                width: isMobile ? 50 : 66,
              }}
            >
              {symbol}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {achievements.map((label) => (
          <span
            key={label}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 999,
              fontSize: isMobile ? 11 : 13,
              fontWeight: 850,
              padding: "7px 11px",
            }}
          >
            ✓ {label}
          </span>
        ))}
      </div>

      {finalPhrase ? (
        <div style={{ color: "#f4c95d", fontSize: isMobile ? "1.35rem" : "1.7rem", fontWeight: 950 }}>
          {finalPhrase}
        </div>
      ) : null}

      <button
        onClick={onExit}
        style={{
          background: "linear-gradient(135deg, #f4c95d, #ee8b58)",
          border: 0,
          borderRadius: 16,
          color: "#24333a",
          cursor: "pointer",
          font: "inherit",
          fontWeight: 950,
          minHeight: 52,
          padding: "14px 18px",
          width: "100%",
        }}
        type="button"
      >
        Continuar a las lecciones
      </button>
    </section>
  );
}
