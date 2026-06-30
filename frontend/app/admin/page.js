import { getAdminSummary } from "../../lib/api";

function pct(value, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function avgPct(cardsAnswered, attempts) {
  if (!cardsAnswered || !attempts) {
    return "0%";
  }

  return `${Math.round((cardsAnswered / attempts) * 100)}%`;
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

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 20 }}>
        <section style={{ background: "linear-gradient(135deg, #2f8f62, #2b6e75)", color: "#fff", borderRadius: 28, padding: 28 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>Testing dashboard</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 42 }}>Learner results</h1>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          {[
            ["Users", totals.users],
            ["Sessions", totals.sessions],
            ["Completed", totals.completed_sessions],
            ["Attempts", totals.attempts],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "#fffdf9", border: "1px solid #dbcdb3", borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 12, color: "#5e6d73", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
              <strong style={{ display: "block", marginTop: 8, fontSize: 30 }}>{value}</strong>
            </div>
          ))}
        </section>

        <section style={{ background: "#fffdf9", border: "1px solid #dbcdb3", borderRadius: 24, padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Learners</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#5e6d73" }}>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>Name</th>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>Sessions</th>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>Attempts</th>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>1st</th>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>2nd</th>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>3rd</th>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>Avg</th>
                  <th style={{ padding: "10px 8px", borderBottom: "1px solid #dbcdb3" }}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {summary.learners.map((learner) => (
                  <tr key={learner.id}>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8", fontWeight: 700 }}>{learner.display_name}</td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8" }}>{learner.sessions}</td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8" }}>{learner.attempts}</td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8" }}>
                      {pct(learner.first_try_correct, learner.correct_cards)}
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8" }}>
                      {pct(learner.second_try_correct, learner.correct_cards)}
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8" }}>
                      {pct(learner.third_try_correct, learner.correct_cards)}
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8" }}>
                      {avgPct(learner.cards_answered, learner.attempts)}
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #eee6d8" }}>{learner.last_seen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ background: "#fffdf9", border: "1px solid #dbcdb3", borderRadius: 24, padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Cards with misses</h2>
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
