import { missionChapterProgress } from "../lib/missionExperience.mjs";

const CHAPTER_COLORS = ["#f4c95d", "#e98a63", "#7ed0bc", "#9b82ce"];

export default function MissionJourney({ cardIndex, isMobile, lesson }) {
  const chapters = missionChapterProgress(lesson, cardIndex);
  const currentChapter = chapters.find((chapter) => chapter.isActive) || chapters[0];
  const currentStep = Math.min(cardIndex + 1, lesson.cards.length);
  const progressPercent = Math.round((cardIndex / lesson.cards.length) * 100);

  return (
    <div
      aria-label={`${lesson.mission.label}: ${lesson.mission.title}. Página ${currentStep} de ${lesson.cards.length}.`}
      role="region"
      style={{
        display: "grid",
        gap: isMobile ? 10 : 14,
        maxWidth: "100%",
        minWidth: 0,
        paddingTop: isMobile ? 10 : 14,
        width: "100%",
      }}
    >
      <div style={{ display: "grid", gap: 4, textAlign: "left" }}>
        <div
          style={{
            color: "#f4c95d",
            fontSize: isMobile ? 11 : 12,
            fontWeight: 950,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {lesson.mission.label}
        </div>
        <div
          style={{
            color: "#fffaf0",
            fontSize: isMobile ? "1.45rem" : "clamp(1.8rem, 3vw, 2.7rem)",
            fontWeight: 950,
            lineHeight: 1.02,
          }}
        >
          {lesson.mission.title}
        </div>
        {cardIndex === 0 ? (
          <div style={{ color: "rgba(255, 250, 240, 0.78)", fontSize: isMobile ? 12 : 14, lineHeight: 1.4 }}>
            {lesson.mission.briefing}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: "#fffaf0", fontSize: isMobile ? 12 : 13, fontWeight: 900 }}>
            Página {currentStep} de {lesson.cards.length}
          </span>
          <span style={{ color: "#f4c95d", fontSize: isMobile ? 11 : 12, fontWeight: 900 }}>
            {progressPercent}% restaurado
          </span>
        </div>
        <div
          aria-label={`${progressPercent}% de la misión restaurada`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercent}
          role="progressbar"
          style={{ background: "rgba(255,255,255,0.16)", borderRadius: 999, height: 8, overflow: "hidden" }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #f4c95d, #ff9d6c)",
              borderRadius: 999,
              height: "100%",
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      <ol
        aria-label="Capítulos de la misión"
        style={{
          display: "grid",
          gap: isMobile ? 6 : 8,
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
          listStyle: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {chapters.map((chapter, index) => {
          const stateLabel = chapter.isComplete ? "Completado" : chapter.isActive ? "Actual" : chapter.isUnlocked ? "Disponible" : "Bloqueado";
          return (
            <li
              aria-current={chapter.isActive ? "step" : undefined}
              key={chapter.id}
              style={{
                background: chapter.isActive ? "rgba(255,255,255,0.15)" : "rgba(14,45,49,0.42)",
                border: `1px solid ${chapter.isActive || chapter.isComplete ? CHAPTER_COLORS[index % CHAPTER_COLORS.length] : "rgba(255,255,255,0.16)"}`,
                borderRadius: isMobile ? 12 : 14,
                display: "grid",
                gap: 3,
                minHeight: isMobile ? 58 : 72,
                minWidth: 0,
                opacity: chapter.isUnlocked ? 1 : 0.58,
                padding: isMobile ? "7px 8px" : "9px 11px",
                textAlign: "left",
              }}
            >
              <span style={{ color: CHAPTER_COLORS[index % CHAPTER_COLORS.length], fontSize: 10, fontWeight: 950 }}>
                {chapter.isComplete ? "✓" : index + 1} · {stateLabel}
              </span>
              <span style={{ color: "#fffaf0", fontSize: isMobile ? 11 : 13, fontWeight: 900, lineHeight: 1.15, overflowWrap: "anywhere" }}>
                {chapter.title}
              </span>
            </li>
          );
        })}
      </ol>

      <div
        style={{
          background: "rgba(244, 201, 93, 0.14)",
          borderLeft: "4px solid #f4c95d",
          borderRadius: 10,
          color: "#fffaf0",
          fontSize: isMobile ? 12 : 14,
          lineHeight: 1.35,
          minWidth: 0,
          overflowWrap: "anywhere",
          padding: isMobile ? "8px 10px" : "10px 12px",
          textAlign: "left",
        }}
      >
        <strong>{currentChapter.title}:</strong> {currentChapter.objective}
      </div>
    </div>
  );
}
