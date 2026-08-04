import { getAdminSummary } from "../../lib/api";

const border = "1px solid #dbcdb3";
const cellBorder = "1px solid #eee6d8";

function friendlyDate(value) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatter.format(date);
}

function scoreStyle(score) {
  if (score >= 90) return { background: "#dff4e7", color: "#17623f" };
  if (score >= 75) return { background: "#fff0c9", color: "#805b00" };
  return { background: "#fde3dd", color: "#923b2e" };
}

function LessonScore({ result }) {
  if (!result) {
    return <span style={{ color: "#9aa3a5" }}>—</span>;
  }

  if (!result.completed_runs) {
    return (
      <span title={`${result.visits} visit${result.visits === 1 ? "" : "s"}, not completed`} style={{ color: "#966b12", fontSize: 12, fontWeight: 700 }}>
        In progress
      </span>
    );
  }

  const rounded = Math.round(result.average_score);
  return (
    <div title={`Average of ${result.completed_runs} completed run${result.completed_runs === 1 ? "" : "s"}. Best: ${Math.round(result.best_score)}%`}>
      <span style={{ ...scoreStyle(rounded), display: "inline-block", minWidth: 54, borderRadius: 999, padding: "6px 9px", textAlign: "center", fontWeight: 800 }}>
        {rounded}%
      </span>
      {result.completed_runs > 1 && <div style={{ marginTop: 4, color: "#718084", fontSize: 11 }}>{result.completed_runs} runs</div>}
    </div>
  );
}

export default async function AdminPage() {
  let summary;

  try {
    summary = await getAdminSummary();
  } catch (error) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <section style={{ maxWidth: 900, margin: "0 auto", background: "#fffdf9", border: "1px solid #dbcdb3", borderRadius: 24, padding: 28 }}>
          <h1 style={{ marginTop: 0 }}>Admin dashboard</h1>
          <p style={{ color: "#5e6d73" }}>Could not load tracking data: {error.message}</p>
        </section>
      </main>
    );
  }

  const totals = summary.totals;
  const lessons = summary.lessons ?? [];

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gap: 20 }}>
        <section style={{ background: "linear-gradient(135deg, #2f8f62, #2b6e75)", color: "#fff", borderRadius: 28, padding: 28 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>Testing dashboard</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 42 }}>Learner results</h1>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          {[
            ["Learners", totals.users, "Profiles created"],
            ["Lesson visits", totals.lesson_visits, "Times a lesson was opened"],
            ["Completed lessons", totals.completed_lessons, "Finished lesson runs"],
            ["Cards practiced", totals.cards_practiced, "Unique cards seen per visit"],
          ].map(([label, value, note]) => (
            <div key={label} style={{ background: "#fffdf9", border, borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 12, color: "#5e6d73", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
              <strong style={{ display: "block", marginTop: 8, fontSize: 30 }}>{value}</strong>
              <div style={{ marginTop: 5, color: "#718084", fontSize: 12 }}>{note}</div>
            </div>
          ))}
        </section>

        <section style={{ background: "#fffdf9", border, borderRadius: 24, padding: 24 }}>
          <h2 style={{ margin: 0 }}>Learner progress</h2>
          <p style={{ margin: "6px 0 18px", color: "#5e6d73" }}>
            Lesson columns show the average score from completed runs. “In progress” means the lesson was opened but not finished.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1050, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#5e6d73" }}>
                  <th style={{ position: "sticky", left: 0, zIndex: 2, minWidth: 210, padding: "10px 8px", borderBottom: border, background: "#fffdf9" }}>Learner</th>
                  <th style={{ padding: "10px 8px", borderBottom: border, textAlign: "center" }}>Visits</th>
                  <th style={{ padding: "10px 8px", borderBottom: border, textAlign: "center" }}>Finished</th>
                  <th style={{ padding: "10px 8px", borderBottom: border, textAlign: "center" }}>Cards</th>
                  {lessons.map((lesson) => (
                    <th key={lesson.id} title={lesson.title} style={{ minWidth: 92, padding: "10px 8px", borderBottom: border, textAlign: "center" }}>
                      <strong style={{ display: "block", color: "#153444", fontSize: 15 }}>{lesson.number}</strong>
                      <span style={{ display: "block", marginTop: 3, fontSize: 10, fontWeight: 500 }}>AVG SCORE</span>
                    </th>
                  ))}
                  <th style={{ minWidth: 175, padding: "10px 8px", borderBottom: border }}>Last active</th>
                </tr>
              </thead>
              <tbody>
                {summary.learners.map((learner) => (
                  <tr key={learner.id}>
                    <td style={{ position: "sticky", left: 0, zIndex: 1, padding: "13px 8px", borderBottom: cellBorder, background: "#fffdf9", fontWeight: 700 }}>{learner.display_name}</td>
                    <td style={{ padding: "13px 8px", borderBottom: cellBorder, textAlign: "center" }}>{learner.visits}</td>
                    <td style={{ padding: "13px 8px", borderBottom: cellBorder, textAlign: "center" }}>{learner.completed_sessions}</td>
                    <td title={`${learner.answer_taps} answer taps including retries`} style={{ padding: "13px 8px", borderBottom: cellBorder, textAlign: "center" }}>{learner.cards_practiced}</td>
                    {lessons.map((lesson) => (
                      <td key={lesson.id} style={{ padding: "10px 8px", borderBottom: cellBorder, textAlign: "center" }}>
                        <LessonScore result={learner.lesson_scores[lesson.id]} />
                      </td>
                    ))}
                    <td title={learner.last_seen} style={{ padding: "13px 8px", borderBottom: cellBorder, color: "#52666d", whiteSpace: "nowrap" }}>{friendlyDate(learner.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ background: "#fffdf9", border, borderRadius: 24, padding: 24 }}>
          <h2 style={{ margin: 0 }}>Cards needing attention</h2>
          <p style={{ margin: "6px 0 18px", color: "#5e6d73" }}>Prompts learners miss most often across all lessons.</p>
          {summary.difficult_cards.length === 0 ? (
            <p style={{ color: "#5e6d73" }}>No missed cards yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {summary.difficult_cards.map((card) => (
                <div key={card.prompt} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #eee6d8", paddingBottom: 10 }}>
                  <strong>{card.prompt}</strong>
                  <span style={{ color: "#5e6d73" }}>{card.misses} misses / {card.attempts} attempts</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
