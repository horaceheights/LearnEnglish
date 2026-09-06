export default function MissionCompletion({ finalImageUrl, headingRef, isMobile, lesson, onExit }) {
  const finalCard = lesson.cards[lesson.cards.length - 1];
  const finalLine = finalCard?.answer_audio_text || "They are a family.";

  return (
    <section
      aria-label={lesson.mission.completion_title}
      className="mission-completion-studio"
      style={{
        background: "linear-gradient(145deg, #173f43 0%, #285e5b 52%, #5a3d71 100%)",
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
          CORTE · RETO COMPLETADO
        </div>
        <h1
          ref={headingRef}
          style={{ fontSize: isMobile ? "1.75rem" : "clamp(2rem, 4vw, 3.35rem)", lineHeight: 1.05, margin: 0 }}
          tabIndex={-1}
        >
          {lesson.mission.completion_title}
        </h1>
        <p style={{ color: "rgba(255,250,240,0.86)", lineHeight: 1.5, margin: "0 auto", maxWidth: 680 }}>
          {lesson.mission.completion_message}
        </p>
      </div>

      {finalImageUrl ? (
        <div
          style={{
            background: "#ead9b9",
            border: "clamp(6px, 1.4vw, 12px) solid #fff4d6",
            borderRadius: isMobile ? 16 : 22,
            boxShadow: "0 16px 36px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          <img
            alt={finalCard?.visual_description_es}
            src={finalImageUrl}
            style={{ aspectRatio: "3 / 2", display: "block", objectFit: "cover", width: "100%" }}
          />
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {lesson.mission.chapters.map((chapter) => (
          <span
            key={chapter.id}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 999,
              fontSize: isMobile ? 11 : 13,
              fontWeight: 850,
              padding: "7px 11px",
            }}
          >
            ✓ {chapter.title}
          </span>
        ))}
      </div>

      <div style={{ color: "#f4c95d", fontSize: isMobile ? "1.35rem" : "1.7rem", fontWeight: 950 }}>
        {finalLine}
      </div>

      <div style={{ color: "rgba(255,250,240,0.82)", fontSize: isMobile ? 13 : 15, fontWeight: 800 }}>
        Estreno listo. Superaste cada prueba y dirigiste la escena final.
      </div>

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
        Salir del estudio
      </button>
    </section>
  );
}
